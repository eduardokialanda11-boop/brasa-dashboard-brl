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
import { Activity, Info, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logo from "@/assets/brasa-logo.jpg.asset.json";
import { OnchainProofsDialog, type TransactionRow } from "@/components/onchain-proofs-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { formatBRL, formatBRLCompact, formatBRLWhole, formatUSDC } from "@/utils/format";

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
const formatWeekday = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`))
    .replace(".", "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

const referenceDate = () =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brasa | Índice PIX para USDC na Solana" },
      { name: "description", content: "Volume real de PIX convertido em USDC na Solana, atualizado a cada 60 segundos." },
      { property: "og:title", content: "Brasa | Índice PIX para USDC na Solana" },
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
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [atualizadoEmCompleto, setAtualizadoEmCompleto] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [provasAbertas, setProvasAbertas] = useState(false);
  const [provasCarregando, setProvasCarregando] = useState(true);
  const [provasErro, setProvasErro] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      const [todayResult, historyResult, transactionResult] = await Promise.all([
        supabase
          .from("daily_volumes")
          .select("date, total_brl, total_usdc, tx_count, usd_brl_rate")
          .eq("date", todayInSaoPaulo())
          .maybeSingle<DailyVolume>(),
        supabase
          .from("daily_volumes")
          .select("date, total_brl, total_usdc, tx_count, usd_brl_rate")
          .order("date", { ascending: true })
          .limit(7)
          .returns<DailyVolume[]>(),
        supabase.from("transactions").select("*").order("timestamp", { ascending: false }).limit(3),
      ]);

      if (!active) return;
      if (todayResult.error || historyResult.error) {
        console.warn("Não foi possível carregar daily_volumes:", todayResult.error ?? historyResult.error);
      }
      setResumo(todayResult.data ?? null);
      setHistorico(historyResult.data ?? []);
      if (!todayResult.error && !historyResult.error) {
        const now = new Date();
        setAtualizadoEm(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" }));
        setAtualizadoEmCompleto(now);
      }
      const transactionRows = (transactionResult.data ?? []) as TransactionRow[];
      setTransactions(transactionRows);
      setProvasErro(Boolean(transactionResult.error));
      setProvasCarregando(false);
      setCarregando(false);
    }

    void fetchDashboard();
    const refreshInterval = window.setInterval(() => void fetchDashboard(), 60_000);
    const realtimeChannel = supabase
      .channel("daily-volumes-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_volumes" },
        () => void fetchDashboard(),
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const totalBrl = asNumber(resumo?.total_brl);
  const totalUsdc = asNumber(resumo?.total_usdc);
  const transacoes = asNumber(resumo?.tx_count);
  const dolar = asNumber(resumo?.usd_brl_rate);
  const economia = totalBrl * 0.037;
  const pontos = totalBrl / 100;
  const syncDateTime = atualizadoEmCompleto
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Sao_Paulo",
      }).format(atualizadoEmCompleto)
    : "—";
  const nextSync = atualizadoEmCompleto
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Sao_Paulo",
      }).format(new Date(atualizadoEmCompleto.getTime() + 60_000))
    : "—";

  const variacao = useMemo(() => {
    if (historico.length < 2) return null;
    const previousTotal = asNumber(historico[historico.length - 2]?.total_brl);
    const currentTotal = asNumber(historico[historico.length - 1]?.total_brl);
    if (previousTotal <= 0) return null;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [historico]);
  const inicioDaColeta = historico.length < 3;
  const variacaoForaDaFaixa = variacao != null && (variacao < -50 || variacao > 200);

  const semana = useMemo(() => historico.map((registro) => ({ date: registro.date, registro })), [historico]);

  const insight = useMemo(() => {
    if (!historico.length) return null;
    const volumes = historico.map((item) => asNumber(item.total_brl));
    const total = volumes.reduce((sum, value) => sum + value, 0);
    const media = total / historico.length;
    const pico = Math.max(...volumes);
    const picoIndex = volumes.indexOf(pico);
    const picoData = historico[picoIndex]?.date;
    const primeiro = volumes[0] ?? 0;
    const ultimo = volumes[volumes.length - 1] ?? 0;
    const crescimento = historico.length === 7 && primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : null;
    return { media, pico, picoData, crescimento };
  }, [historico]);
  const chartMaximum = Math.max(1, ...historico.map((item) => asNumber(item.total_brl))) * 1.3;
  const progress = Math.min(100, Math.round((historico.length / 7) * 100));

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: semana.map((item) => `${formatWeekday(item.date)} ${formatDate(item.date)}`),
    datasets: [
      {
        label: "Volume",
        data: semana.map((item) => asNumber(item.registro.total_brl)),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,.10)",
        borderWidth: 3,
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#22c55e",
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: false,
        fill: true,
        tension: 0.32,
      },
    ],
  }), [semana]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#142e23",
        callbacks: {
          title: (items) => {
            const item = items[0];
            if (!item) return "";
            const dia = semana[item.dataIndex];
            return dia ? `${formatDate(dia.date)} (${formatWeekday(dia.date)})` : "";
          },
          label: (context) => {
            const registro = semana[context.dataIndex]?.registro;
            if (!registro) return "";
            return `${formatBRL(asNumber(registro.total_brl))} (${formatUSDC(asNumber(registro.total_usdc))} USDC)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#8fb09c",
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          callback: function (_value, index) {
            const item = semana[index];
            return item ? [formatDate(item.date), formatWeekday(item.date)] : "";
          },
        },
      },
      y: {
        beginAtZero: true,
        max: chartMaximum,
        grid: { color: "rgba(255,255,255,.06)" },
        ticks: { color: "#8fb09c", callback: (value) => formatBRLCompact(Number(value)) },
      },
    },
  }), [chartMaximum, semana]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6 md:max-w-[900px] md:px-8 md:py-10">
        <header className="mb-6 border-b border-border pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:flex md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logo.url} alt="Logo Brasa" className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border" />
              <p className="truncate text-sm font-bold md:text-base">BRASA</p>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 text-[11px] font-bold text-primary md:text-xs">
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
              REAL ON-CHAIN
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>{resumo?.date ? `Último dado verificado em: ${formatDate(resumo.date)}` : `Referência hoje: ${referenceDate()}`}</p>
            {atualizadoEm && <p className="shrink-0">Atualizado às {atualizadoEm}</p>}
          </div>
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
                  {inicioDaColeta ? (
                    <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[11px] font-semibold text-highlight">Novo</span>
                  ) : variacaoForaDaFaixa ? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Novo período real</span>
                  ) : variacao != null ? (
                    <span className={`text-xs font-bold ${variacao >= 0 ? "text-primary" : "text-destructive"}`}>
                      {variacao >= 0 ? "↑ +" : "↓ -"}{Math.abs(variacao).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% hoje
                    </span>
                  ) : null}
                </div>
                <p className={`mt-1.5 text-[11px] lg:text-sm ${variacao == null ? "text-highlight" : "text-muted-foreground"}`}>
                  {inicioDaColeta ? "• Início da coleta real" : variacao == null ? "• Primeiro dia real" : "Volume hoje"}
                </p>
              </div>
              <div className="py-3">
                <strong className="text-2xl font-bold lg:text-3xl">{formatUSDC(totalUsdc)} <span className="text-sm text-muted-foreground lg:text-base">USDC</span></strong>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Volume na Solana</p>
              </div>
              <div className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                  <Activity aria-hidden="true" className="size-4 shrink-0 text-primary" />
                    <Button variant="ghost" className="h-auto p-0 text-2xl font-bold text-foreground hover:bg-transparent hover:text-primary lg:text-3xl" onClick={() => setProvasAbertas(true)}>
                      {transacoes.toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground lg:text-base">txs</span>
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setProvasAbertas(true)}><Search aria-hidden="true" /> Ver provas</Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">PIX convertidos na leitura mais recente</p>
              </div>
              <div className="py-3">
                <div className="flex flex-wrap items-baseline gap-3"><strong className="text-2xl font-bold text-primary lg:text-3xl">{formatBRL(economia)}</strong><span className="text-sm font-bold text-primary">3,7%</span></div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground lg:text-sm">
                  <span>Economia vs bancos</span>
                  <TooltipProvider>
                    <InfoTooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-5 text-muted-foreground" aria-label="Como a economia é calculada"><Info aria-hidden="true" /></Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 bg-popover text-popover-foreground">Estimativa: volume × 3,7%, referência de spread bancário. IOF pode variar por operação.</TooltipContent>
                    </InfoTooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="py-3">
                <strong className="text-2xl font-bold text-highlight lg:text-3xl">{(pontos / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil pontos</strong>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Pontos Brasa</p>
              </div>
              <div className="pt-3">
                <strong className="text-2xl font-bold lg:text-3xl">{formatBRL(dolar)}</strong>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Dólar de referência: {formatBRL(dolar)}</p>
              </div>
              <div className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
                Última sync: {syncDateTime} UTC-3 <span aria-hidden="true">|</span> Próxima: {nextSync} <span aria-hidden="true">|</span> Status: <span className="text-primary">● Coletando</span> <span aria-hidden="true">|</span> Carteiras: 12 monitoradas
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-xl md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold md:text-xl">Volume nos últimos 7 dias</h2>
            {inicioDaColeta ? (
              <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-xs font-semibold text-highlight">Início da coleta real</span>
            ) : insight?.crescimento != null ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${insight.crescimento >= 0 ? "bg-primary/10 text-primary" : "bg-accent text-highlight"}`}>
                {insight.crescimento >= 0 ? `📈 Solana crescendo +${insight.crescimento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% no Brasil` : `📉 Em correção ${insight.crescimento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              </span>
            ) : <span className="text-xs text-muted-foreground">{historico.length}/7 dias reais</span>}
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground"><span>Coleta: {historico.length}/7 dias</span><span>{progress}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="mt-5 h-[200px] lg:h-[320px]">
            {historico.length ? <Line data={chartData} options={chartOptions} /> : <p className="pt-24 text-center text-sm text-muted-foreground">Base pronta — aguardando primeiro ETL.</p>}
          </div>
          {insight && (
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs leading-relaxed md:text-sm">
              {inicioDaColeta ? (
                <p className="text-foreground">{transacoes.toLocaleString("pt-BR")} transações PIX-USDC detectadas na Solana no Brasil. Volte em 7 dias para ver tendência de crescimento.</p>
              ) : insight.crescimento == null ? (
                <p className="text-foreground">
                  <span aria-hidden="true">🌱</span> Início da coleta real — {transacoes.toLocaleString("pt-BR")} transações PIX→USDC detectadas na Solana no Brasil. Volte em 7 dias para ver tendência de crescimento.
                </p>
              ) : insight.crescimento >= 0 ? (
                <p className="font-semibold text-primary"><span aria-hidden="true">📈</span> Solana no Brasil: +{insight.crescimento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em 7 dias</p>
              ) : (
                <p className="font-semibold text-highlight"><span aria-hidden="true">📉</span> {insight.crescimento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% — volume em correção</p>
              )}
              <p className="mt-2 text-muted-foreground">
                Média diária: {formatBRLWhole(insight.media)} <span aria-hidden="true">|</span> Pico: {formatBRLWhole(insight.pico)} em {insight.picoData ? formatDate(insight.picoData) : "—"}
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-xl md:p-6">
          <h2 className="text-lg font-bold md:text-xl">Como funciona</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3 md:divide-x md:divide-border">
            <article className="md:pr-5">
              <h3 className="font-semibold">👛 Carteiras monitoradas</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">12 gateways PIX→USDC monitorados continuamente, 24 horas por dia.</p>
            </article>
            <article className="md:px-5">
              <h3 className="font-semibold">🔎 Detecção</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Transferências USDC acima de US$ 10 associadas a PIX contam como uma conversão. O hash único evita duplicidade. Fonte: Solana RPC.</p>
            </article>
            <article className="md:pl-5">
              <h3 className="font-semibold">💰 Economia estimada</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Cálculo: volume × 3,7%, usando spread bancário como referência. IOF varia por operação. Estimativa auditável.</p>
            </article>
          </div>
        </section>
      </div>
      <OnchainProofsDialog open={provasAbertas} onOpenChange={setProvasAbertas} rows={transactions} loading={provasCarregando} error={provasErro} />
    </main>
  );
}