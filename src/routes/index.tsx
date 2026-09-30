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
import {
  formatBRL,
  formatBRLCompact,
  formatBRLInternationalCompact,
  formatUSD,
  formatUSDC,
} from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type DailyVolume = {
  date: string;
  total_brl: number | string | null;
  total_usdc: number | string | null;
  economia_vs_banco: number | string | null;
  usd_brl_rate: number | string | null;
  tx_count: number | string | null;
};

const asNumber = (value: number | string | null | undefined) => Number(value ?? 0);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${value}T12:00:00`),
  );

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brasa ao vivo | Índice PIX para USDC na Solana" },
      {
        name: "description",
        content: "Índice ao vivo do volume de PIX convertido em USDC na Solana por 12 carteiras monitoradas.",
      },
      { property: "og:title", content: "Brasa ao vivo | Índice PIX para USDC na Solana" },
      {
        property: "og:description",
        content: "Volume on-chain de PIX para USDC, economia e crescimento do uso da Solana no Brasil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrasaAoVivo,
});

function BrasaAoVivo() {
  const [resumo, setResumo] = useState<DailyVolume | null>(null);
  const [historico, setHistorico] = useState<DailyVolume[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      const [latestResult, historyResult] = await Promise.all([
        supabase
          .from("daily_volumes")
          .select("date,total_brl,total_usdc,economia_vs_banco,usd_brl_rate,tx_count")
          .order("date", { ascending: false })
          .limit(1)
          .returns<DailyVolume[]>(),
        supabase
          .from("daily_volumes")
          .select("date,total_brl")
          .order("date", { ascending: true })
          .limit(7)
          .returns<DailyVolume[]>(),
      ]);

      if (!active) return;

      if (latestResult.error || historyResult.error) {
        console.warn("Não foi possível carregar daily_volumes:", latestResult.error ?? historyResult.error);
        setResumo(null);
        setHistorico([]);
      } else {
        setResumo(latestResult.data?.[0] ?? null);
        setHistorico(historyResult.data ?? []);
      }
      setCarregando(false);
    }

    void fetchDashboard();

    return () => {
      active = false;
    };
  }, []);

  const variacaoSeteDias = useMemo(() => {
    if (historico.length < 2) return null;
    const inicial = asNumber(historico[0]?.total_brl);
    const atual = asNumber(historico[historico.length - 1]?.total_brl);
    if (inicial <= 0) return null;
    return ((atual - inicial) / inicial) * 100;
  }, [historico]);

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: historico.map((item) => formatDate(item.date)),
    datasets: [{
      data: historico.map((item) => asNumber(item.total_brl)),
      borderColor: (context) => {
        const area = context.chart.chartArea;
        if (!area) return "#16a34a";
        const gradient = context.chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
        gradient.addColorStop(0, "#16a34a");
        gradient.addColorStop(1, "#facc15");
        return gradient;
      },
      backgroundColor: "rgba(22,163,74,0.15)",
      borderWidth: 3,
      pointRadius: historico.length === 1 ? 4 : 2,
      pointBackgroundColor: "#facc15",
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
          label: (context) => formatBRLCompact(Number(context.parsed.y)),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: false, color: "#8fb09c", maxTicksLimit: 7 },
      },
      y: {
        grid: { color: "rgba(143,176,156,.08)" },
        ticks: { color: "#8fb09c", callback: (value) => formatBRLInternationalCompact(Number(value)) },
      },
    },
  }), []);

  const metric = "border-t border-border pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0";

  return (
    <main className="grid-texture min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="Logo Brasa" className="size-11 rounded-full object-cover ring-1 ring-border" />
            <div>
              <p className="text-lg font-bold leading-none">BRASA</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Índice real PIX → USDC na Solana</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <span className="relative flex size-2.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            12 CARTEIRAS AO VIVO
          </div>
        </header>

        <section className="mb-4 border-y border-border bg-card/80 py-6 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Resumo de hoje</p>
          {carregando ? (
            <div className="flex min-h-32 items-center text-sm font-medium text-muted-foreground">
              Carregando dados on-chain...
            </div>
          ) : !resumo ? (
            <div className="flex min-h-32 items-center text-sm font-medium text-muted-foreground">
              Base pronta — aguardando primeiro ETL.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Volume hoje</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{formatBRL(asNumber(resumo.total_brl))}</p>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">Volume Solana</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-highlight">
                  {formatUSDC(asNumber(resumo.total_usdc))} <span className="text-sm text-muted-foreground">USDC</span>
                </p>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">Economia vs Bancos</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-primary">{formatBRL(asNumber(resumo.economia_vs_banco))}</p>
                <span className="mt-2 inline-flex border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                  Economia média de 3,7% por transação
                </span>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">Dólar</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{formatUSD(asNumber(resumo.usd_brl_rate))}</p>
                <p className="mt-1 text-xs text-muted-foreground">Cotação BRL por USD</p>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">PIX convertidos hoje</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-highlight">
                  {asNumber(resumo.tx_count).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">transações on-chain</p>
              </div>
            </div>
          )}
        </section>

        <section className="relative overflow-hidden border-y border-border bg-card/80 py-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold">Volume nos últimos 7 dias</h1>
            {variacaoSeteDias != null && (
              <div className={`w-fit border px-3 py-2 text-xs font-bold ${variacaoSeteDias >= 0 ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                {variacaoSeteDias >= 0 ? "↗" : "↘"} Solana {variacaoSeteDias >= 0 ? "crescendo" : "caindo"}{" "}
                {variacaoSeteDias >= 0 ? "+" : ""}{variacaoSeteDias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% no Brasil nos últimos 7 dias
              </div>
            )}
          </div>
          <div className="mt-5 h-64 sm:h-80">
            {historico.length ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">Base pronta — aguardando primeiro ETL.</p>
            )}
          </div>
        </section>

        <footer className="mx-auto max-w-4xl pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Dados V2 on-chain via Helius - Volume de rampas BRL&gt;USDC na Solana
        </footer>
      </div>
    </main>
  );
}