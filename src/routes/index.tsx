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
import { formatBRL, formatBRLCompact, formatUSDC } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type DailyVolume = {
  date: string;
  total_brl: number | string | null;
  total_usdc: number | string | null;
};

type LiveIndexResponse = {
  total_brl?: number | string | null;
  total_usdc?: number | string | null;
  volume_hoje_brl?: number | string | null;
  volume_hoje_usdc?: number | string | null;
  economia_brl?: number | string | null;
};

type LiveIndex = {
  totalBRL: number;
  totalUSDC: number;
  economyBRL: number;
};

const LIVE_INDEX_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1/hyper-action`;
const LIVE_INDEX_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHl0bHhqbm9xcHlvdWtwcHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzU3NzQsImV4cCI6MjEwNTcxMTc3NH0.jqJ7FQHhNxAbQYRRMnE7zuHpq-dkUhr0nsMcKGPCTDI";
const LIVE_REFRESH_MS = 60_000;

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
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [historico, setHistorico] = useState<DailyVolume[]>([]);
  const [sincronizando, setSincronizando] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchLiveIndex() {
      try {
        const response = await fetch(LIVE_INDEX_URL, {
          headers: {
            apikey: LIVE_INDEX_KEY,
            Authorization: `Bearer ${LIVE_INDEX_KEY}`,
          },
        });
        if (!response.ok) throw new Error(`Falha na sincronização (${response.status})`);

        const data = (await response.json()) as LiveIndexResponse;
        const totalBRL = asNumber(data.total_brl ?? data.volume_hoje_brl);
        const totalUSDC = asNumber(data.total_usdc ?? data.volume_hoje_usdc);

        if (active) {
          setLiveIndex({
            totalBRL,
            totalUSDC,
            economyBRL: totalBRL * 0.032,
          });
        }
      } catch (error) {
        console.error("Não foi possível sincronizar as 12 carteiras:", error);
      } finally {
        if (active) setSincronizando(false);
      }
    }

    async function fetchHistory() {
      const result = await supabase
        .from("daily_volumes")
        .select("date,total_brl,total_usdc")
        .order("date", { ascending: false })
        .limit(7)
        .returns<DailyVolume[]>();

      if (!active) return;
      console.log("Dados buscados:", result.data);
      setHistorico(result.error ? [] : [...(result.data ?? [])].reverse());
    }

    void fetchLiveIndex();
    void fetchHistory();
    const interval = window.setInterval(() => void fetchLiveIndex(), LIVE_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const crescimento = useMemo(() => {
    if (historico.length < 2) return null;
    const inicial = asNumber(historico[0]?.total_usdc);
    const atual = asNumber(historico[historico.length - 1]?.total_usdc);
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
        ticks: { color: "#8fb09c", callback: (value) => formatBRLCompact(Number(value)) },
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
          {sincronizando || !liveIndex ? (
            <div className="flex min-h-32 items-center text-sm font-medium text-muted-foreground">
              Sincronizando 12 carteiras on-chain...
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">PIX que virou USDC hoje</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{formatBRL(liveIndex.totalBRL)}</p>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">USDC na Solana</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-highlight">
                  {formatUSDC(liveIndex.totalUSDC)} <span className="text-sm text-muted-foreground">USDC</span>
                </p>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">Economia vs Bancos</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-primary">{formatBRL(liveIndex.economyBRL)}</p>
                <p className="mt-1 text-xs text-muted-foreground">3,2% do volume monitorado</p>
              </div>
              <div className={metric}>
                <p className="text-xs font-semibold text-muted-foreground">Crescimento Solana BR</p>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${crescimento != null && crescimento < 0 ? "text-destructive" : "text-primary"}`}>
                  {crescimento == null
                    ? "—"
                    : `${crescimento >= 0 ? "+" : ""}${crescimento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Variação dos últimos 7 dias</p>
              </div>
            </div>
          )}
        </section>

        <section className="relative overflow-hidden border-y border-border bg-card/80 py-6 sm:px-6">
          <h1 className="text-xl font-bold">Volume nos últimos 7 dias</h1>
          <div className="mt-5 h-64 sm:h-80">
            {historico.length ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">Base pronta — aguardando primeiro ETL.</p>
            )}
          </div>
        </section>

        <footer className="mx-auto max-w-4xl pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Metodologia V2 LIVE: Soma de transações USDC de 12 carteiras de rampas BR indexadas via Helius API na Solana. Conversão BRL via Binance API. 12 carteiras monitoradas.
        </footer>
      </div>
    </main>
  );
}