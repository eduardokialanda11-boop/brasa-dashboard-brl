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
import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logo from "@/assets/brasa-logo.jpg.asset.json";
import { supabase } from "@/lib/supabase";
import { formatBRL, formatBRLCompact, formatUSDC } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type DailyVolume = {
  date: string;
  total_brl: number | string | null;
  total_usdc: number | string | null;
  tx_count: number | string | null;
  usd_brl_rate: number | string | null;
};

const asNumber = (value: number | string | null | undefined) => Number(value ?? 0);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));

const referenceDate = () =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brasa ao vivo | Quanto custa trazer dólar na Solana" },
      { name: "description", content: "Volume real de PIX convertido em USDC na Solana, atualizado a cada 60 segundos." },
      { property: "og:title", content: "Brasa ao vivo | Quanto custa trazer dólar na Solana" },
      { property: "og:description", content: "Resumo on-chain de volume, economia e pontos Brasa." },
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
        supabase.from("daily_volumes").select("*").order("date", { ascending: false }).limit(1).maybeSingle<DailyVolume>(),
        supabase.from("daily_volumes").select("*").order("date", { ascending: false }).limit(7).returns<DailyVolume[]>(),
      ]);

      if (!active) return;
      if (latestResult.error || historyResult.error) {
        console.warn("Não foi possível carregar daily_volumes:", latestResult.error ?? historyResult.error);
      }
      setResumo(latestResult.data ?? null);
      setHistorico([...(historyResult.data ?? [])].reverse());
      setCarregando(false);
    }

    void fetchDashboard();
    const refreshInterval = window.setInterval(() => void fetchDashboard(), 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const totalBrl = asNumber(resumo?.total_brl);
  const totalUsdc = asNumber(resumo?.total_usdc);
  const transacoes = asNumber(resumo?.tx_count);
  const dolar = asNumber(resumo?.usd_brl_rate);
  const economia = totalBrl * 0.037;
  const pontos = totalBrl / 100;

  const variacao = useMemo(() => {
    if (historico.length < 2) return null;
    const anterior = asNumber(historico[historico.length - 2]?.total_brl);
    if (anterior <= 0) return null;
    return ((totalBrl - anterior) / anterior) * 100;
  }, [historico, totalBrl]);

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: historico.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: "Volume BRL",
        data: historico.map((item) => asNumber(item.total_brl)),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,.12)",
        borderWidth: 3,
        pointBackgroundColor: "#22c55e",
        pointRadius: 4,
        fill: true,
        tension: 0.4,
      },
      {
        label: "USDC em BRL",
        data: historico.map((item) => asNumber(item.total_usdc) * asNumber(item.usd_brl_rate)),
        borderColor: "#facc15",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointBackgroundColor: "#facc15",
        pointRadius: 3,
        tension: 0.4,
      },
    ],
  }), [historico]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { labels: { color: "#8fb09c", usePointStyle: true, boxWidth: 7 } },
      tooltip: {
        backgroundColor: "#142e23",
        callbacks: { label: (context) => `${context.dataset.label}: ${formatBRLCompact(Number(context.parsed.y))}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#8fb09c" } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,.06)" },
        ticks: { color: "#8fb09c", callback: (value) => formatBRLCompact(Number(value)) },
      },
    },
  }), []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6 md:max-w-[900px] md:px-8 md:py-10">
        <header className="mb-6 border-b border-border pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logo.url} alt="Logo Brasa" className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border" />
              <div className="min-w-0">
                <p className="text-sm font-bold md:text-base">BRASA</p>
                <h1 className="mt-1 text-sm font-medium leading-snug text-muted-foreground md:text-base">Quanto custa trazer dólar na Solana hoje</h1>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center justify-end gap-2 text-xs font-bold text-primary">
                <span className="relative flex size-2.5" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                </span>
                {totalUsdc > 0 ? "REAL ON-CHAIN" : "AO VIVO"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">atualiza a cada 60s</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Referência hoje: {referenceDate()}</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground lg:text-xs">Resumo de hoje</p>
          {carregando ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Carregando dados reais da blockchain Solana...</p>
          ) : (
            <div className="divide-y divide-border">
              <div className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-2xl font-bold lg:text-3xl">{formatBRL(totalBrl)}</strong>
                  {variacao != null && (
                    <span className={`text-xs font-bold ${variacao >= 0 ? "text-primary" : "text-destructive"}`}>
                      {variacao >= 0 ? "↑ +" : "↓ -"}{Math.abs(variacao).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% hoje
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 text-[11px] lg:text-sm ${variacao == null ? "text-highlight" : "text-muted-foreground"}`}>
                  {variacao == null ? "• Primeiro dia real" : "Volume hoje"}
                </p>
              </div>
              <div className="py-3">
                <strong className="text-2xl font-bold lg:text-3xl">{formatUSDC(totalUsdc)} <span className="text-sm text-muted-foreground lg:text-base">USDC</span></strong>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Volume na Solana</p>
              </div>
              <div className="py-3">
                <div className="flex items-center gap-2">
                  <Activity aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  <strong className="text-2xl font-bold lg:text-3xl">{transacoes.toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground lg:text-base">txs</span></strong>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">PIX convertidos na leitura mais recente</p>
              </div>
              <div className="py-3">
                <div className="flex flex-wrap items-baseline gap-3"><strong className="text-2xl font-bold text-primary lg:text-3xl">{formatBRL(economia)}</strong><span className="text-sm font-bold text-primary">3,7%</span></div>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Economia vs bancos</p>
              </div>
              <div className="py-3">
                <strong className="text-2xl font-bold text-highlight lg:text-3xl">{(pontos / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil pontos</strong>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Pontos Brasa</p>
              </div>
              <div className="pt-3">
                <strong className="text-2xl font-bold lg:text-3xl">{formatBRL(dolar)}</strong>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Dólar de referência: {formatBRL(dolar)}</p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-xl md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold md:text-xl">Volume nos últimos 7 dias</h2>
            <span className="text-xs text-muted-foreground">{historico.length} {historico.length === 1 ? "dia real" : "dias reais"}</span>
          </div>
          <div className="mt-5 h-[200px] lg:h-[320px]">
            {historico.length ? <Line data={chartData} options={chartOptions} /> : <p className="pt-24 text-center text-sm text-muted-foreground">Base pronta — aguardando primeiro ETL.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}