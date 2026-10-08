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
import { CalendarDays, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import brasaIcon from "@/assets/brasa-b-logo-v2.png.asset.json";
import { OnchainProofsDialog, type TransactionRow } from "@/components/onchain-proofs-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { eventRewards, summarizeEvents, type DailyVolume, type OnchainEvent } from "@/utils/onchain-summary";
import { formatBRL, formatBRLCompact, formatBRLWhole, formatUSDC } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type AccumulatedVolume = { totalBRL: number; totalUSDC: number; txCount: number; };
const asNumber = (value: number | string | null | undefined) => Number(value?? 0);
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
const formatWeekday = (value: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)).replace(".", "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const brazilDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Brasa | Índice PIX para USDC na Solana" },
    { name: "description", content: "Volume real de PIX convertido em USDC na Solana, atualizado a cada 60 segundos." },
    { property: "og:title", content: "Brasa | Índice PIX para USDC na Solana" },
    { property: "og:description", content: "Volume real de PIX convertido em USDC na Solana, atualizado a cada 60 segundos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BrasaAoVivo,
});

function BrasaAoVivo() {
  const [resumo, setResumo] = useState<DailyVolume | null>(null);
  const [acumulado, setAcumulado] = useState<AccumulatedVolume>({ totalBRL: 0, totalUSDC: 0, txCount: 0 });
  const [historico, setHistorico] = useState<DailyVolume[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [dataMaisRecente, setDataMaisRecente] = useState("");
  const [avisoData, setAvisoData] = useState<string | null>(null);
  const [crescimentoSeteDias, setCrescimentoSeteDias] = useState<number | null>(null);
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
      try {
        const countResult = await supabase.from("pix_onchain_events").select("signature", { count: "exact", head: true });
        if (!active) return;
        if (countResult.error) throw countResult.error;
        const events: OnchainEvent[] = [];
        for (let offset = 0; ; offset += 1000) {
          const result = await supabase.from("pix_onchain_events")
            .select("signature, amount_brl, amount_usdc, block_time, origem")
            .order("block_time", { ascending: true }).order("signature", { ascending: true })
            .range(offset, offset + 999);
          if (!active) return;
          if (result.error) throw result.error;
          const page = (result.data ?? []) as OnchainEvent[];
          events.push(...page);
          if (page.length < 1000) break;
        }
        setProvasErro(false);
        const currentDate = new Date().toISOString().slice(0, 10);
        const summary = summarizeEvents(events, currentDate);
        const allDays = summary.days;
        console.info("BRASA leitura pública", { count: countResult.count, loaded: events.length, origins: summary.origins });
        const latest = allDays.at(-1);
        const requestedDate = dataSelecionada || currentDate;
        const exactDay = allDays.find((row) => row.date === requestedDate);
        const closestDay = exactDay ?? (requestedDate ? allDays.reduce<DailyVolume | null>((closest, row) => {
          if (!closest || Math.abs(new Date(`${row.date}T12:00:00Z`).getTime() - new Date(`${requestedDate}T12:00:00Z`).getTime()) < Math.abs(new Date(`${closest.date}T12:00:00Z`).getTime() - new Date(`${requestedDate}T12:00:00Z`).getTime())) return row;
          return closest;
        }, null) : latest ?? null);
        setResumo(requestedDate === currentDate ? summary.today : closestDay);
        setDataMaisRecente(currentDate);
        setAvisoData(requestedDate !== currentDate && !exactDay && closestDay ? `Sem coleta nesse dia - coleta iniciou em ${formatDate(allDays[0]?.date ?? closestDay.date)}. Exibindo o dia mais próximo: ${formatDate(closestDay.date)}.` : null);
        const chronological = allDays.slice(-8);
        const sevenDaysBefore = latest
          ? new Date(`${latest.date}T12:00:00Z`)
          : null;
        sevenDaysBefore?.setUTCDate(sevenDaysBefore.getUTCDate() - 7);
        const comparisonDate = sevenDaysBefore?.toISOString().slice(0, 10);
        const comparison = chronological.find((row) => row.date === comparisonDate);
        const comparisonBRL = asNumber(comparison?.total_brl);
        setCrescimentoSeteDias(
          latest && comparisonBRL > 0
            ? ((asNumber(latest.total_brl) - comparisonBRL) / comparisonBRL) * 100
            : null,
        );
        setHistorico(chronological.slice(-7));
        setAcumulado(summary.accumulated);
        setTransactions([...events].reverse());
        const now = new Date(); setAtualizadoEm(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" })); setAtualizadoEmCompleto(now);
      } catch (err) { console.error(err); setProvasErro(true); } finally { if (active) { setCarregando(false); setProvasCarregando(false); } }
    }
    fetchDashboard(); const refreshInterval = window.setInterval(() => { fetchDashboard(); }, 60_000);
    const realtimeChannel = supabase.channel("pix_onchain_events_live").on("postgres_changes", { event: "*", schema: "public", table: "pix_onchain_events" }, () => { fetchDashboard(); }).subscribe();
    return () => { active = false; window.clearInterval(refreshInterval); supabase.removeChannel(realtimeChannel); };
  }, [dataSelecionada]);

  const totalBrl = asNumber(resumo?.total_brl); const totalUsdc = asNumber(resumo?.total_usdc); const transacoes = asNumber(resumo?.tx_count);
  const dolarInformado = asNumber(resumo?.usd_brl_rate); const dolar = dolarInformado > 0? dolarInformado : totalUsdc > 0? totalBrl / totalUsdc : null;
  const rewards = eventRewards(acumulado.totalBRL);
  const economiaDiaria = rewards.economy; const economiaTotalHistorica = rewards.economy; const pontos = rewards.points;
  const syncDateTime = atualizadoEmCompleto? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(atualizadoEmCompleto) : "-";
  const nextSync = atualizadoEmCompleto? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date(atualizadoEmCompleto.getTime() + 60_000)) : "-";
  const variacao = useMemo(() => { if (historico.length < 2) return null; const prev = asNumber(historico[historico.length - 2]?.total_brl); const curr = asNumber(historico[historico.length - 1]?.total_brl); return prev > 0? ((curr - prev) / prev) * 100 : null; }, [historico]);
  const inicioDaColeta = historico.length < 3; const variacaoForaDaFaixa = variacao!== null && (variacao < -50 || variacao > 200);
  const semana = useMemo(() => historico.map((registro) => ({ date: registro.date, registro })), [historico]);
  const insight = useMemo(() => {
    if (!historico.length) return null; const volumes = historico.map((item) => asNumber(item.total_brl)); const total = volumes.reduce((s, v) => s + v, 0);
    const media = total / historico.length; const pico = Math.max(...volumes); const picoIndex = volumes.indexOf(pico); const picoData = historico[picoIndex]?.date;
    const ultimosTres = volumes.slice(-3); const tresAnteriores = volumes.slice(-6, -3);
    const mediaUltimosTres = ultimosTres.reduce((s, v) => s + v, 0) / Math.max(1, ultimosTres.length); const mediaTresAnteriores = tresAnteriores.reduce((s, v) => s + v, 0) / Math.max(1, tresAnteriores.length);
    const primeiro = volumes[0] ?? 0; const ultimo = volumes.at(-1) ?? 0;
    const crescimento = historico.length === 7 && primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : null;
    return { media, pico, picoData, crescimento, tendenciaAlta: ultimosTres.length === 3 && tresAnteriores.length === 3 && mediaUltimosTres > mediaTresAnteriores };
  }, [historico]);
  const chartMaximum = useMemo(() => Math.max(1,...historico.map((item) => asNumber(item.total_brl) * 1.3)), [historico]);
  const chartProgress = useMemo(() => Math.min(100, Math.round((historico.length / 7) * 100)), [historico]);
  const tendencia = useMemo(() => {
    const values = historico.map((item) => asNumber(item.total_brl));
    if (values.length < 2) return values;
    const n = values.length; const sumX = (n * (n - 1)) / 2; const sumY = values.reduce((sum, value) => sum + value, 0);
    const sumXY = values.reduce((sum, value, index) => sum + index * value, 0); const sumX2 = values.reduce((sum, _value, index) => sum + index * index, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX); const intercept = (sumY - slope * sumX) / n;
    return values.map((_value, index) => Math.max(0, intercept + slope * index));
  }, [historico]);
  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: semana.map((item) => `${formatWeekday(item.date)} ${formatDate(item.date)}`),
    datasets: [
      { label: "Volume", data: semana.map((item) => asNumber(item.registro.total_brl)), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.10)", borderWidth: 3, pointBackgroundColor: "#22c55e", pointBorderColor: "#22c55e", pointRadius: 4, pointHoverRadius: 7, fill: true, tension: 0.32 },
      { label: "Tendência", data: tendencia, borderColor: "rgba(250,204,21,.8)", borderWidth: 2, borderDash: [7, 6], pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0 },
    ],
  }), [semana, tendencia]);
  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true, maintainAspectRatio: false, events: ["mousemove", "mouseout", "click", "touchstart"], interaction: { intersect: false, mode: "index" },
    plugins: { legend: { display: false }, tooltip: { filter: (item) => item.datasetIndex === 0, backgroundColor: "#142e23", callbacks: {
      title: () => "",
      label: (context) => { const registro = semana[context.dataIndex]?.registro; return registro? `${formatDate(registro.date)}: ${formatBRL(asNumber(registro.total_brl))} (${formatUSDC(asNumber(registro.total_usdc))} USDC) - ${asNumber(registro.tx_count).toLocaleString("pt-BR")} txs` : ""; },
    } } },
    scales: { x: { grid: { display: false }, ticks: { color: "#8fb09c", callback: function (_value, index) { const item = semana[index]; return item? [formatDate(item.date), formatWeekday(item.date)] : ""; } } }, y: { beginAtZero: true, max: chartMaximum, grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#8fb09c", callback: (value) => formatBRLCompact(Number(value)) } } },
  }), [chartMaximum, semana]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6 md:max-w-[900px] md:px-8 md:py-10">
        <header className="mb-6 border-b border-border pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:flex md:justify-between">
            <div className="flex items-center gap-2"><img src={brasaIcon.url} alt="" className="size-8 shrink-0 rounded-full object-cover" /><span className="font-bold">BRASA</span></div>
            <div className="flex shrink-0 items-center justify-end gap-2 text-[11px] font-bold text-primary md:text-xs"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-primary" /></span>REAL-ON-CHAIN</div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground md:text-base">BRASA monitora em tempo real quanto de Real (PIX) está virando dólar digital (USDC) na rede Solana - dados 100% on-chain auditáveis</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <p>{resumo?.date ? `Referência: ${formatDate(resumo.date)}${resumo.date < brazilDate() ? " (dado on-chain)" : ""}` : "Aguardando primeiro dado on-chain"}</p>
              <label className="relative flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-foreground shadow-sm transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                <span className="sr-only">Escolher data do resumo</span>
                <input type="date" value={dataSelecionada || dataMaisRecente} max={dataMaisRecente || undefined} onChange={(event) => setDataSelecionada(event.target.value)} className="date-picker-premium min-w-0 bg-transparent text-xs font-semibold outline-none" aria-label="Escolher data do resumo" />
              </label>
            </div>
            {atualizadoEm && <p className="shrink-0 text-xs text-muted-foreground">Atualizado às {atualizadoEm}</p>}
          </div>
          {avisoData && <p className="mt-2 text-xs font-medium text-highlight">{avisoData}</p>}
        </header>
        <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold lg:text-xl">Dia</h2>
          </div>
          {carregando? (
            <div className="py-16 text-center text-sm text-muted-foreground"><p>Carregando dados reais da blockchain Solana...</p></div>
          ) : (
            <div className="divide-y divide-border">
              <div className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold lg:text-3xl">{formatBRLWhole(totalBrl)}</span>
                  {inicioDaColeta? (
                    <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[11px] font-semibold text-highlight">Novo</span>
                  ) : variacaoForaDaFaixa? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Novo período</span>
                  ) : variacao!== null? (
                    <span className={`text-xs font-bold ${variacao >= 0? "text-primary" : "text-destructive"}`}>{variacao >= 0? "+" : ""}{variacao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% hoje</span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">em PIX convertido para USDC na Solana {resumo?.date ? `em ${formatDate(resumo.date)}` : ""}</p>
              </div>
              <div className="py-3">
                <p className="text-2xl font-bold lg:text-3xl">{formatUSDC(totalUsdc)} <span className="text-sm font-medium text-muted-foreground lg:text-base">USDC</span></p>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">recebidos on-chain nas carteiras dos gateways</p>
              </div>
              <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold lg:text-3xl">{transacoes.toLocaleString("pt-BR")} <span className="text-sm font-medium text-muted-foreground lg:text-base">txs</span></p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">PIX de brasileiros virando dólar digital na Solana</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setProvasAbertas(true)}><Search className="size-4 shrink-0" aria-hidden="true" /> Ver provas</Button>
              </div>
              <div className="py-3">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Economia Gerada</p>
                <p className="mt-1.5 text-2xl font-bold lg:text-3xl">{formatBRLWhole(economiaDiaria)}</p>
                <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">+3,7% vs bancos tradicionais</span>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground lg:text-xs">+3,7% vs bancos tradicionais (Spread + IOF) - quanto brasileiros economizaram usando Solana em vez de banco</p>
              </div>
              <div className="py-3">
                <p className="text-2xl font-bold text-highlight lg:text-3xl">{(pontos/1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil pontos</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Volume convertido em pontos</p>
              </div>
              <div className="py-3">
                <p className="text-2xl font-bold lg:text-3xl">{dolar? `R$ ${dolar.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">PTAX calculado on-chain</p>
              </div>
            </div>
          )}
          <footer className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">Última sync: {syncDateTime} UTC-3 | Próxima: {nextSync} | Status: <span className="text-primary">● Coletando</span> | Carteiras: 12 monitoradas | Filtro: &gt;=5 USDC</footer>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Crescimento histórico do BRASA</p>
          <h2 className="mt-1 text-lg font-bold lg:text-xl">Acumulado Total Real</h2>
          {carregando? (<p className="py-16 text-center text-sm text-muted-foreground">Calculando o histórico real...</p>) : (
            <div className="mt-5 divide-y divide-border">
              <div className="pb-4"><p className="text-2xl font-bold text-primary lg:text-3xl">{formatBRLWhole(acumulado.totalBRL)}</p><p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">em PIX convertido para USDC na Solana desde o início</p></div>
              <div className="py-4"><p className="text-2xl font-bold lg:text-3xl">{acumulado.txCount.toLocaleString("pt-BR")} <span className="text-sm font-medium text-muted-foreground lg:text-base">txs</span></p><p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">{formatBRL(acumulado.totalBRL)} no total | {acumulado.txCount.toLocaleString("pt-BR")} txs desde o início</p></div>
            </div>
          )}
        </section>
        </div>
        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6 md:col-span-2 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold lg:text-xl">Solana está crescendo no Brasil?</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {crescimentoSeteDias !== null && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${crescimentoSeteDias > 0 ? "bg-primary/10 text-primary" : crescimentoSeteDias < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {crescimentoSeteDias > 0 ? "▲ +" : crescimentoSeteDias < 0 ? "▼ " : "• "}{crescimentoSeteDias.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% vs 7 dias atrás
                </span>
              )}
              {insight?.tendenciaAlta? (<span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Tendência de alta</span>) : (<span className="rounded-full bg-highlight/10 px-2.5 py-1 text-xs font-semibold text-highlight">Histórico ({historico.length}/7 dias reais)</span>)}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 rounded-md border border-border bg-background/40 p-1" aria-label="Período do gráfico">
            <Button size="sm" className="h-7 bg-primary px-3 text-primary-foreground hover:bg-primary/90">7D</Button>
            <Button variant="ghost" size="sm" className="h-7 px-3" disabled title="Disponível após 30 dias de coleta">30D</Button>
            <Button variant="ghost" size="sm" className="h-7 px-3" disabled title="Disponível após mais dias de coleta">Tudo</Button>
            <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">30D disponível após 30 dias de coleta</span>
          </div>
          <div className="mt-4"><div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground"><span>Coleta: {historico.length}/7 dias</span><span>{chartProgress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${chartProgress}%` }} /></div></div>
          <div className="mt-4 flex h-[200px] items-center justify-center lg:h-[320px]">
            {historico.length > 0? (<Line data={chartData} options={chartOptions} />) : (<p className="text-sm text-muted-foreground">Base pronta - aguardando primeiro ETL...</p>)}
          </div>
          {insight && (
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs leading-relaxed md:text-sm">
              <p className="text-foreground">Média 7 dias: <strong className="text-foreground">{formatBRLCompact(insight.media)}</strong> | Melhor dia: {insight.picoData? formatDate(insight.picoData) : "-"} com <strong className="text-foreground">{formatBRLCompact(insight.pico)}</strong>{insight.crescimento !== null ? <> | Crescimento: <strong className={insight.crescimento >= 0 ? "text-primary" : "text-destructive"}>{insight.crescimento >= 0 ? "+" : ""}{insight.crescimento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong></> : null}</p>
              {historico.length < 6 && (<p className="mt-2 text-muted-foreground">A tendência será calculada após seis dias reais de coleta.</p>)}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6 md:col-span-2 mt-6">
          <h2 className="text-lg font-bold lg:text-xl">Como funciona</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3 md:divide-x md:divide-border">
            <article className="md:pr-5">
              <h3 className="font-semibold">👛 Carteiras monitoradas</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Monitoramos transferências de PIX que viraram USDC na rede Solana, 24h por dia. Cada transação é verificada on-chain no Solscan.</p>
            </article>
            <article className="md:px-5">
              <h3 className="font-semibold">🔍 Detecção</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Transferências USDC acima de $5 associadas a PIX contam como conversão. Hash único evita duplicidade. Fonte: Solana RPC + Supabase Realtime.</p>
            </article>
            <article className="md:pl-5">
              <h3 className="font-semibold">💰 Economia estimada</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Spread médio bancário de 3,7% + IOF vs taxa Solana de R$0,01. Cálculo: {formatBRL(economiaTotalHistorica)} economizados no total. Valor auditável e conservador.</p>
            </article>
          </div>
        </section>
      </div>
      <OnchainProofsDialog open={provasAbertas} onOpenChange={setProvasAbertas} rows={transactions} transactionCount={acumulado.txCount} loading={provasCarregando} error={provasErro} />
    </main>
  );
}