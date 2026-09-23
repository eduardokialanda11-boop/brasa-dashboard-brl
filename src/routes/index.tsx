import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Activity, ArrowUpRight, Check, Database, Eye, EyeOff, Flame, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type HistoryPoint = {
  pontos: number;
  posicao: number;
  criado_em: string;
};

const DEFAULT_URL = "https://npxytlxjnoqpyoukpppi.supabase.co";
const STORAGE_KEY = "brasa-points-connection";

// Preview data keeps the dashboard useful before the public ANON key is supplied.
const demoData: HistoryPoint[] = [1.2, 1.65, 2.4, 3.15, 4.3, 5.1, 6.45, 7.05, 8.15, 8.7, 9.2].map(
  (millions, index) => ({
    pontos: millions * 1_000_000,
    posicao: Math.max(12, 46 - index * 4),
    criado_em: new Date(2026, 8, 23, 9 + index).toISOString(),
  }),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Brasa Points" },
      { name: "description", content: "Painel de evolução de pontos e posição Brasa Points." },
      { property: "og:title", content: "Dashboard | Brasa Points" },
      { property: "og:description", content: "Painel de evolução de pontos e posição Brasa Points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrasaDashboard,
});

function BrasaDashboard() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [anonKey, setAnonKey] = useState("");
  const [history, setHistory] = useState<HistoryPoint[]>(demoData);
  const [status, setStatus] = useState<"demo" | "loading" | "connected" | "error">("demo");
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Restore only the public connection details after hydration.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { url?: string; anonKey?: string };
      if (parsed.url) setUrl(parsed.url);
      if (parsed.anonKey) setAnonKey(parsed.anonKey);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  async function fetchHistory(client: SupabaseClient) {
    // The ascending order guarantees the chart follows the timeline.
    const { data, error: queryError } = await client
      .from("historico_ponto")
      .select("pontos,posicao,criado_em")
      .order("criado_em", { ascending: true });

    if (queryError) throw queryError;
    if (!data?.length) throw new Error("A tabela historico_ponto ainda não possui registros.");
    return data as HistoryPoint[];
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;
    setStatus("loading");
    setError("");

    try {
      const client = createClient(url.trim(), anonKey.trim(), {
        auth: { persistSession: false },
      });
      const rows = await fetchHistory(client);
      setHistory(rows);
      setStatus("connected");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
    } catch (connectionError) {
      setStatus("error");
      setError(connectionError instanceof Error ? connectionError.message : "Não foi possível conectar.");
    }
  }

  const latest = history.at(-1) ?? demoData.at(-1);
  const pointsInMillions = latest ? latest.pontos / 1_000_000 : 0;

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: history.map((item) =>
      new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.criado_em)),
    ),
    datasets: [{
      data: history.map((item) => item.pontos / 1_000_000),
      borderColor: "#22c55e",
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      pointBackgroundColor: "#22c55e",
      pointBorderColor: "#0a0a0a",
      pointBorderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 3,
      fill: true,
      tension: 0.42,
    }],
  }), [history]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1a1a",
        borderColor: "#333333",
        borderWidth: 1,
        displayColors: false,
        callbacks: { label: (context) => `${Number(context.parsed.y).toFixed(2)}M pontos` },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "#777777", maxTicksLimit: 6, font: { family: "Space Grotesk", size: 11 } },
      },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,.06)" },
        ticks: {
          color: "#777777",
          callback: (value) => `${value}M`,
          font: { family: "Space Grotesk", size: 11 },
        },
      },
    },
  }), []);

  return (
    <main className="grid-texture min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10 lg:px-10">
        <header className="mb-8 flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_var(--accent)]">
              <Flame className="size-5 fill-current" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">BRASA</p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.24em] text-primary">POINTS</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className={`size-2 rounded-full ${status === "connected" ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-muted-foreground"}`} />
            {status === "connected" ? "Ao vivo" : "Demonstração"}
          </div>
        </header>

        <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <Activity className="size-4 text-primary" aria-hidden="true" />
                Pontuação total
              </div>
              <p className="text-[clamp(3rem,11vw,7rem)] font-bold leading-[0.84] tracking-normal tabular-nums">
                {pointsInMillions.toFixed(1)}<span className="text-primary">M</span>
              </p>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Pontos</p>
            </div>
            <div className="flex items-center gap-4 border-t border-border pt-5 md:border-l md:border-t-0 md:pb-1 md:pl-8 md:pt-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Posição atual</p>
                <p className="mt-1 text-3xl font-bold">#{latest?.posicao ?? "—"}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <ArrowUpRight className="size-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Evolução dos pontos</h1>
              <p className="mt-1 text-sm text-muted-foreground">Desempenho ao longo do dia</p>
            </div>
            <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">+{(pointsInMillions - history[0].pontos / 1_000_000).toFixed(1)}M</span>
          </div>
          <div className="h-64 w-full sm:h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        </section>

        <footer className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Database className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold">Conectar dados</h2>
              <p className="text-xs text-muted-foreground">Informe sua chave pública para exibir os dados reais.</p>
            </div>
          </div>
          <form onSubmit={connect} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              URL
              <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://seu-projeto.supabase.co" className="h-12 rounded-xl bg-background px-4 text-sm normal-case tracking-normal text-foreground" required />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Anon key
              <span className="relative">
                <Input type={showKey ? "text" : "password"} value={anonKey} onChange={(event) => setAnonKey(event.target.value)} placeholder="Sua chave pública anon" className="h-12 rounded-xl bg-background px-4 pr-12 text-sm normal-case tracking-normal text-foreground" required />
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowKey((current) => !current)} aria-label={showKey ? "Ocultar chave" : "Mostrar chave"} className="absolute right-1.5 top-1.5 text-muted-foreground">
                  {showKey ? <EyeOff /> : <Eye />}
                </Button>
              </span>
            </label>
            <Button type="submit" variant="premium" size="wide" disabled={status === "loading"}>
              {status === "loading" ? <Loader2 className="animate-spin" /> : status === "connected" ? <Check /> : <Database />}
              {status === "loading" ? "Conectando" : status === "connected" ? "Conectado" : "Conectar"}
            </Button>
          </form>
          {status === "error" && <p role="alert" className="mt-4 text-sm font-medium text-destructive">{error}</p>}
        </footer>
      </div>
    </main>
  );
}