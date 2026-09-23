import { createFileRoute } from "@tanstack/react-router";
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
import { Activity, ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logo from "@/assets/brasa-logo.jpg.asset.json";
import { supabase } from "@/lib/supabase";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type HistoryPoint = {
  pontos: number;
  posicao: number;
  criado_em: string;
};

// This fallback keeps the dashboard complete if the public data is temporarily unavailable.
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
  const [history, setHistory] = useState<HistoryPoint[]>(demoData);
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");

  // Load the public history automatically whenever the dashboard opens.
  useEffect(() => {
    let active = true;

    async function fetchHistory() {
      const { data, error } = await supabase
        .from("historico_ponto")
        .select("pontos,posicao,criado_em")
        .order("criado_em", { ascending: true });

      if (!active) return;
      if (error || !data?.length) {
        setStatus("error");
        return;
      }

      setHistory(data as HistoryPoint[]);
      setStatus("connected");
    }

    void fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  const latest = history.at(-1) ?? demoData.at(-1);
  const first = history.at(0) ?? demoData.at(0);
  const pointsInMillions = latest ? latest.pontos / 1_000_000 : 0;
  const gainedInMillions = first ? pointsInMillions - first.pontos / 1_000_000 : 0;

  // The public history can contain equal clock times on different dates. Use a
  // stable 09h–19h day view and sample the full ordered series into 11 points.
  const hourLabels = useMemo(
    () => Array.from({ length: 11 }, (_, index) => `${String(9 + index).padStart(2, "0")}h`),
    [],
  );

  const chartValues = useMemo(() => {
    const firstPoint = history[0];
    if (!firstPoint) return [];
    if (history.length === 1) return Array.from({ length: 11 }, () => firstPoint.pontos / 1_000_000);
    return hourLabels.map((_, index) => {
      const historyIndex = Math.round((index * (history.length - 1)) / (hourLabels.length - 1));
      return (history[historyIndex]?.pontos ?? firstPoint.pontos) / 1_000_000;
    });
  }, [history, hourLabels]);

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: hourLabels,
    datasets: [{
      data: chartValues,
      // Scriptable colors: a horizontal gradient green -> yellow, like the logo's flame.
      borderColor: (ctx) => {
        const { chart } = ctx;
        const area = chart.chartArea;
        if (!area) return "#16a34a";
        const g = chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
        g.addColorStop(0, "#16a34a");
        g.addColorStop(1, "#facc15");
        return g;
      },
      backgroundColor: (ctx) => {
        const { chart } = ctx;
        const area = chart.chartArea;
        if (!area) return "rgba(22,163,74,0.15)";
        const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        g.addColorStop(0, "rgba(250,204,21,0.22)");
        g.addColorStop(0.5, "rgba(22,163,74,0.14)");
        g.addColorStop(1, "rgba(22,163,74,0)");
        return g;
      },
      pointBackgroundColor: "#facc15",
      pointBorderColor: "#0a1a12",
      pointBorderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 3,
      fill: true,
      tension: 0.42,
    }],
  }), [hourLabels, chartValues]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#132a1f",
        borderColor: "#1e3a2a",
        borderWidth: 1,
        displayColors: false,
        callbacks: { label: (context) => `${Number(context.parsed.y).toFixed(1)}M pontos` },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "#8fb09c", maxTicksLimit: 6, font: { family: "Space Grotesk", size: 11 } },
      },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: "rgba(143,176,156,.08)" },
        ticks: {
          color: "#8fb09c",
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
            <img src={logo.url} alt="Logo Brasa" className="size-11 rounded-full object-cover ring-1 ring-border" />
            <div>
              <p className="text-lg font-bold leading-none">Brasa</p>
              <p className="mt-1 text-[11px] font-bold tracking-[0.12em] text-highlight">Pix to Solana</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className={`size-2 rounded-full ${status === "connected" ? "bg-highlight shadow-[0_0_10px_var(--highlight)]" : "bg-muted-foreground"}`} />
            {status === "connected" ? "Ao vivo" : status === "loading" ? "Atualizando" : "Última atualização"}
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

        <section className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-xl sm:p-8">
          {/* Subtle blurred glow behind the chart */}
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-2/3 rounded-full bg-[image:var(--gradient-brand)] opacity-20 blur-3xl" />
          <div className="relative mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Evolução dos pontos</h1>
              <p className="mt-1 text-sm text-muted-foreground">Desempenho ao longo do dia</p>
            </div>
            <span className="relative rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">+{gainedInMillions.toFixed(1)}M</span>
          </div>
          <div className="relative h-64 w-full sm:h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        </section>
      </div>
    </main>
  );
}