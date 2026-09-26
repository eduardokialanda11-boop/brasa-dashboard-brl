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
import { formatBRL, formatBRLCompact, formatUSD } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// Endereço do USDC na Solana e fontes públicas (não pedem chave nem carteira).
const DEX_URL =
  "https://api.dexscreener.com/latest/dex/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USD_BRL_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL";
const STORAGE_KEY = "brasa_chart";
const DAY_MS = 24 * 60 * 60 * 1000;
const GAP_MS = 10 * 60 * 1000;
const MAX_POINTS = 24 * 60;

// Um ponto salvo no navegador para montar o gráfico.
type Ponto = { t: number; volumeBRL: number };

const num = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const hora = (t: number) =>
  new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const horaMinuto = (t: number) =>
  new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function lerHistorico(): Ponto[] {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(salvo)) return [];

    const agora = Date.now();
    return salvo
      .filter(
        (p): p is Ponto =>
          typeof p === "object" &&
          p !== null &&
          typeof p.t === "number" &&
          Number.isFinite(p.t) &&
          typeof p.volumeBRL === "number" &&
          Number.isFinite(p.volumeBRL) &&
          agora - p.t < DAY_MS,
      )
      .sort((a, b) => a.t - b.t)
      .slice(-MAX_POINTS);
  } catch {
    return [];
  }
}

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
  const [volumeUSDC, setVolumeUSDC] = useState(0);
  const [precoDolarBRL, setPrecoDolarBRL] = useState(0);
  const [volumeBRL, setVolumeBRL] = useState(0);
  const [economia, setEconomia] = useState(0);
  const [pontosBrasa, setPontosBrasa] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<number | null>(null);
  const [historico, setHistorico] = useState<Ponto[]>([]);
  const [erro, setErro] = useState(false);

  async function fetchRealData() {
    try {
      // 1 e 2: busca volume USDC e dólar em paralelo.
      const [dexRes, usdRes] = await Promise.all([fetch(DEX_URL), fetch(USD_BRL_URL)]);
      const dex = await dexRes.json();
      const usd = await usdRes.json();

      const vUSDC = Number(dex?.pairs?.[0]?.volume?.h24 ?? 0);
      const dolar = Number(usd?.USDBRL?.bid ?? 0);

      // 3, 4 e 5: cálculos.
      const vBRL = vUSDC * dolar;
      const eco = vBRL * 0.037; // banco 4,5% - Solana 0,8%
      const pts = Math.floor(vBRL / 100);

      setVolumeUSDC(vUSDC);
      setPrecoDolarBRL(dolar);
      setVolumeBRL(vBRL);
      setEconomia(eco);
      setPontosBrasa(pts);
      const agora = Date.now();
      setUltimaAtualizacao(agora);
      setErro(false);

      // 6: preserva no navegador, minuto a minuto, no máximo as últimas 24h.
      const salvo = lerHistorico();
      const ultimo = salvo.at(-1);
      const novo = ultimo && agora - ultimo.t < 60_000
        ? salvo
        : [...salvo, { t: agora, volumeBRL: vBRL }]
            .filter((p) => agora - p.t < DAY_MS)
            .slice(-MAX_POINTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      setHistorico(novo);
    } catch {
      setErro(true);
    }
  }

  // Busca ao abrir e depois a cada 60 segundos.
  useEffect(() => {
    setHistorico(lerHistorico());
    void fetchRealData();
    const id = setInterval(fetchRealData, 60_000);
    return () => clearInterval(id);
  }, []);

  const chartPoints = useMemo(() => {
    const labels: string[] = [];
    const values: Array<number | null> = [];
    const timestamps: number[] = [];
    const axisLabels: string[] = [];
    let ultimoRotulo: number | null = null;

    historico.forEach((p, index) => {
      const anterior = historico[index - 1];
      if (anterior && p.t - anterior.t > GAP_MS) {
        labels.push(horaMinuto(p.t - 1));
        values.push(null);
        timestamps.push(p.t - 1);
        axisLabels.push("");
      }
      labels.push(horaMinuto(p.t));
      values.push(p.volumeBRL);
      timestamps.push(p.t);
      const deveExibir = ultimoRotulo === null || p.t - ultimoRotulo >= 4 * 60 * 60 * 1000;
      axisLabels.push(deveExibir ? horaMinuto(p.t) : "");
      if (deveExibir) ultimoRotulo = p.t;
    });

    return { labels, values, timestamps, axisLabels };
  }, [historico]);

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: chartPoints.labels,
    datasets: [{
      data: chartPoints.values,
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
      pointRadius: historico.length === 1 ? 4 : 0,
      pointBackgroundColor: "#facc15",
      spanGaps: false,
      fill: true,
      tension: 0.4,
    }],
  }), [chartPoints, historico.length]);

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
          callback: (_value, index) => chartPoints.axisLabels[index] ?? "",
        },
      },
      y: {
        grid: { color: "rgba(143,176,156,.08)" },
        ticks: { color: "#8fb09c", callback: (v) => formatBRLCompact(Number(v)) },
      },
    },
  }), [chartPoints]);

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
            <span className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
              {erro ? "RECONECTANDO" : "AO VIVO"}
            </span>
            <span className="text-xs text-muted-foreground">
              Última atualização: {ultimaAtualizacao ? hora(ultimaAtualizacao) : "--:--:--"}
            </span>
          </div>
        </header>

        <section className={`${card} mb-4`}>
          <p className={label}>Volume total hoje</p>
          <p className="mt-3 text-[clamp(2.2rem,8vw,5rem)] font-bold leading-none tabular-nums">{formatBRL(volumeBRL)}</p>
        </section>

        <section className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className={card}>
            <p className={label}>Economia vs bancos</p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-primary">{formatBRL(economia)}</p>
            <p className="mt-1 text-xs text-muted-foreground">3,7% (banco 4,5% − Solana 0,8%)</p>
          </div>
          <div className={card}>
            <p className={label}>Pontos Brasa gerados hoje</p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-highlight">{num(pontosBrasa)}</p>
            <p className="mt-1 text-xs text-muted-foreground">R$ 100 = 1 ponto</p>
          </div>
          <div className={card}>
            <p className={label}>Dólar agora</p>
            <p className="mt-3 text-2xl font-bold tabular-nums">{formatBRL(precoDolarBRL)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Volume USDC 24h: {formatUSD(volumeUSDC)}</p>
          </div>
        </section>

        <section className={`${card} relative overflow-hidden`}>
          <h1 className="text-xl font-bold">Volume nas últimas 24h</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Um ponto por minuto enquanto a página estiver aberta</p>
          <div className="h-64 sm:h-80">
            {historico.length ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">Coletando primeiros dados…</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
