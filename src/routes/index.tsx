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
import { useEffect, useMemo, useState } from "react";

import logo from "@/assets/brasa-logo.jpg.asset.json";
import { supabase } from "@/lib/supabase";
import { formatBRL, formatBRLCompact } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type DailyVolume = {
  date: string;
  total_brl: number | string | null;
  economy_brl: number | string | null;
  points_generated: number | string | null;
  usd_brl_rate: number | string | null;
  total_usdc: number | string | null;
};

type HistoricoPonto = {
  pontos: number | string | null;
  posicao: number | string | null;
  valor_brl: number | string | null;
  created_at: string;
};

const num = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const numCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
const asNumber = (value: number | string | null | undefined) => Number(value ?? 0);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${value}T12:00:00`),
  );

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brasa ao vivo | PIX virou dólar na Solana" },
      { name: "description", content: "Quanto PIX virou dólar na Solana hoje: volume USDC, dólar e economia em tempo real." },
      { property: "og:title", content: "Brasa ao vivo | PIX virou dólar na Solana" },
      { property: "og:description", content: "Volume USDC na Solana convertido em reais, ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrasaAoVivo,
});

function BrasaAoVivo() {
  const [resumo, setResumo] = useState<HistoricoPonto | null>(null);
  const [historico, setHistorico] = useState<DailyVolume[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function fetchDashboardData() {
    try {
      const [resumoResult, volumesResult] = await Promise.all([
        supabase
          .from("historico_ponto")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .returns<HistoricoPonto[]>(),
        supabase
          .from("daily_volumes")
          .select("*")
          .order("date", { ascending: false })
          .limit(7)
          .returns<DailyVolume[]>(),
      ]);

      console.log("Dados buscados:", volumesResult.data);

      if (resumoResult.error) throw resumoResult.error;
      if (volumesResult.error) throw volumesResult.error;

      setResumo(resumoResult.data?.[0] ?? null);
      setHistorico([...(volumesResult.data ?? [])].reverse());
    } catch {
      setResumo(null);
      setHistorico([]);
    } finally {
      setCarregando(false);
    }
  }

  // O navegador apenas lê os registros mantidos pelo banco.
  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: historico.map((item) => formatDate(item.date)),
    datasets: [{
      data: historico.map((item) => asNumber(item.total_brl)),
      borderColor: (ctx) => {
        const area = ctx.chart.chartArea;
        if (!area) return "#16a34a";
        const g = ctx.chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
        g.addColorStop(0, "#16a34a");
        g.addColorStop(1, "#facc15");
        return g;
      },
      backgroundColor: "rgba(22,163,74,0.15)",
      borderWidth: 3,
      pointRadius: historico.length === 1 ? 4 : 2,
      pointBackgroundColor: "#facc15",
      spanGaps: false,
      fill: true,
      tension: 0.4,
    }],
  }), [historico]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#132a1f",
        displayColors: false,
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (c) => formatBRLCompact(Number(c.parsed.y)),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          color: "#8fb09c",
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: { color: "rgba(143,176,156,.08)" },
        ticks: { color: "#8fb09c", callback: (v) => formatBRLCompact(Number(v)) },
      },
    },
  }), []);

  const card = "rounded-2xl border border-border bg-card p-5 sm:p-6";
  const label = "text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground";

  return (
    <main className="grid-texture min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="Logo Brasa" className="size-11 rounded-full object-cover ring-1 ring-border" />
            <div>
              <p className="text-lg font-bold leading-none">BRASA</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Quanto PIX virou dólar na Solana hoje</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">DADOS REAIS</span>
            <span className="text-xs text-muted-foreground">
              Referência: hoje, {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date())}
            </span>
          </div>
        </header>

        <section className={`${card} mb-4`}>
          <p className={label}>Resumo de hoje</p>
          {carregando ? (
            <p className="mt-5 text-sm text-muted-foreground">Carregando...</p>
          ) : resumo ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-3 lg:divide-x lg:divide-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Volume hoje</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{formatBRL(asNumber(resumo.valor_brl))}</p>
            </div>
            <div className="lg:pl-5">
              <p className="text-xs font-semibold text-muted-foreground">Pontos Brasa</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-highlight">{numCompact(asNumber(resumo.pontos))} <span className="text-sm text-muted-foreground">pontos</span></p>
            </div>
            <div className="lg:pl-5">
              <p className="text-xs font-semibold text-muted-foreground">Posição</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-primary">#{num(asNumber(resumo.posicao))}</p>
            </div>
          </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Base pronta — aguardando dados em historico_ponto.</p>
          )}
        </section>

        <section className={`${card} relative overflow-hidden`}>
          <h1 className="text-xl font-bold">Volume nos últimos 7 dias</h1>
          <div className="mt-5 h-64 sm:h-80">
            {carregando ? (
              <p className="pt-20 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : historico.length ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">Base pronta — aguardando dados em daily_volumes.</p>
            )}
          </div>
        </section>

        <footer className="pt-5 text-center text-xs text-muted-foreground">
          Fonte: historico_ponto e daily_volumes. O volume diário é processado automaticamente pelo banco de dados.
        </footer>
      </div>
    </main>
  );
}
