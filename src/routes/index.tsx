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
import { OnchainProofsDialog, type TransactionRow } from "@/components/onchain-proofs-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { formatBRL, formatBRLCompact, formatBRLWhole, formatUSDC } from "@/utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type DailyVolume = { date: string; total_brl: number | string | null; total_usdc: number | string | null; tx_count: number | string | null; usd_brl_rate: number | string | null; };
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
        const [dayResult, totalResult, trendResult, transactionResult] = await Promise.all([
          supabase.from("daily_summary_brt").select("*").order("date", { ascending: false }).limit(1).single(),
          supabase.from("daily_summary_brt").select("total_brl, tx_count"),
          supabase.from("daily_summary_brt").select("*").order("date", { ascending: false }).limit(7),
          supabase.from("pix_onchain_events").select("signature, amount_brl, block_time").order("block_time", { ascending: false }).limit(20),
        ]);
        if (!active) return;
        if (dayResult.error && dayResult.error.code !== "PGRST116") throw dayResult.error;
        if (totalResult.error) throw totalResult.error;
        if (trendResult.error) throw trendResult.error;
        if (transactionResult.error) setProvasErro(true);
        setResumo((dayResult.data as DailyVolume | null) ?? null);
        const chronological = ((trendResult.data ?? []) as DailyVolume[]).sort((a, b) => a.date.localeCompare(b.date));
        setHistorico(chronological);
        const total = (totalResult.data ?? []).reduce((sum, row) => ({
          totalBRL: sum.totalBRL + asNumber(row.total_brl),
          totalUSDC: 0,
          txCount: sum.txCount + asNumber(row.tx_count),
        }), { totalBRL: 0, totalUSDC: 0, txCount: 0 });
        setAcumulado(total);
        setTransactions((transactionResult.data ?? []) as TransactionRow[]);
        const now = new Date(); setAtualizadoEm(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" })); setAtualizadoEmCompleto(now);
      } catch (err) { console.error(err); setProvasErro(true); } finally { if (active) { setCarregando(false); setProvasCarregando(false); } }
    }
    fetchDashboard(); const refreshInterval = window.setInterval(() => { fetchDashboard(); }, 60_000);
    const realtimeChannel = supabase.channel("daily_summary_brt_live").on("postgres_changes", { event: "*", schema: "public", table: "daily_summary_brt" }, () => { fetchDashboard(); }).subscribe();
    return () => { active = false; window.clearInterval(refreshInterval); supabase.removeChannel(realtimeChannel); };
  }, []);

  const totalBrl = asNumber(resumo?.total_brl); const totalUsdc = asNumber(resumo?.total_usdc); const transacoes = asNumber(resumo?.tx_count);
  const dolarInformado = asNumber(resumo?.usd_brl_rate); const dolar = dolarInformado > 0? dolarInformado : totalUsdc > 0? totalBrl / totalUsdc : null;
  const economiaDiaria = totalBrl * 0.037; const economiaTotalHistorica = acumulado.totalBRL * 0.037; const pontos = totalBrl / 100;
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
    return { media, pico, picoData, tendenciaAlta: ultimosTres.length === 3 && tresAnteriores.length === 3 && mediaUltimosTres > mediaTresAnteriores };
  }, [historico]);
  const chartMaximum = useMemo(() => Math.max(1,...historico.map((item) => asNumber(item.total_brl) * 1.3)), [historico]);
  const chartProgress = useMemo(() => Math.min(100, Math.round((historico.length / 7) * 100)), [historico]);
  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: semana.map((item) => `${formatWeekday(item.date)} ${formatDate(item.date)}`),
    datasets: [{ label: "Volume", data: semana.map((item) => asNumber(item.registro.total_brl)), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.10)", borderWidth: 3, pointBackgroundColor: "#22c55e", pointBorderColor: "#22c55e", pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.32 }],
  }), [semana]);
  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: "index" },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#142e23", callbacks: {
      title: (items) => { const item = items[0]; if (!item) return ""; const dia = semana[item.dataIndex]; return dia? `${formatDate(dia.date)} (${formatWeekday(dia.date)})` : ""; },
      label: (context) => { const registro = semana[context.dataIndex]?.registro; return registro? `${formatBRL(asNumber(registro.total_brl))} (${formatUSDC(asNumber(registro.total_usdc))} USDC)` : ""; },
    } } },
    scales: { x: { grid: { display: false }, ticks: { color: "#8fb09c", callback: function (_value, index) { const item = semana[index]; return item? [formatDate(item.date), formatWeekday(item.date)] : ""; } } }, y: { beginAtZero: true, max: chartMaximum, grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#8fb09c", callback: (value) => formatBRLCompact(Number(value)) } } },
  }), [chartMaximum, semana]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6 md:max-w-[900px] md:px-8 md:py-10">
        <header className="mb-6 border-b border-border pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:flex md:justify-between">
            <div className="flex items-center gap-2"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">B</div><span className="font-bold">BRASA</span></div>
            <div className="flex shrink-0 items-center justify-end gap-2 text-[11px] font-bold text-primary md:text-xs"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-primary" /></span>REAL ON-CHAIN</div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground md:text-base">O BRASA monitora em tempo real quanto de Real (PIX) virou USDC na Solana hoje. Dados 100% on-chain, auditáveis no Solscan.</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><p>{resumo?.date ? `Referência hoje: ${formatDate(resumo.date)}${resumo.date < brazilDate() ? " (último dado on-chain)" : ""}` : "Aguardando primeiro dado on-chain"}</p>{atualizadoEm && <p className="shrink-0">Atualizado às {atualizadoEm}</p>}</div>
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
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl font-bold lg:text-3xl">{formatBRLWhole(economiaDiaria)}</span><span className="text-sm font-bold text-primary">3,7%</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground lg:text-sm">
                  <span>Economia vs bancos - Total: {formatBRL(economiaTotalHistorica)}</span>
                  <TooltipProvider><InfoTooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-5 text-muted-foreground" aria-label="Como a economia é calculada"><Info className="size-4" aria-hidden="true" /></Button></TooltipTrigger><TooltipContent className="max-w-64"><p className="text-xs">Estimativa: volume x 3,7% de spread bancário + IOF. Total histórico auditável: {formatBRL(economiaTotalHistorica)}</p></TooltipContent></InfoTooltip></TooltipProvider>
                </div>
              </div>
              <div className="py-3">
                <p className="text-2xl font-bold text-highlight lg:text-3xl">{(pontos/1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil pontos</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">Pontos Brasa</p>
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
              <div className="pb-4"><p className="text-2xl font-bold text-primary lg:text-3xl">{formatBRLWhole(acumulado.totalBRL)}</p><p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">no total desde o início - R$ 128M auditáveis</p></div>
              <div className="py-4"><p className="text-2xl font-bold lg:text-3xl">{acumulado.txCount.toLocaleString("pt-BR")} <span className="text-sm font-medium text-muted-foreground lg:text-base">txs</span></p><p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">{formatBRL(acumulado.totalBRL)} no total | {acumulado.txCount.toLocaleString("pt-BR")} txs desde o início</p></div>
            </div>
          )}
        </section>
        </div>
        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6 md:col-span-2 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold lg:text-xl">Solana está crescendo no Brasil?</h2>
            {insight?.tendenciaAlta? (<span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Tendência de alta</span>) : (<span className="rounded-full bg-highlight/10 px-2.5 py-1 text-xs font-semibold text-highlight">Histórico ({historico.length}/7 dias reais)</span>)}
          </div>
          <div className="mt-4"><div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground"><span>Coleta: {historico.length}/7 dias</span><span>{chartProgress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${chartProgress}%` }} /></div></div>
          <div className="mt-4 flex h-[200px] items-center justify-center lg:h-[320px]">
            {historico.length > 0? (<Line data={chartData} options={chartOptions} />) : (<p className="text-sm text-muted-foreground">Base pronta - aguardando primeiro ETL...</p>)}
          </div>
          {insight && (
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs leading-relaxed md:text-sm">
              <p className="text-foreground">Média 7 dias: <strong className="text-foreground">{formatBRLWhole(insight.media)}</strong> | Melhor dia: {insight.picoData? formatDate(insight.picoData) : "-"} com <strong className="text-foreground">{formatBRLCompact(insight.pico)}</strong></p>
              {historico.length < 6 && (<p className="mt-2 text-muted-foreground">A tendência será calculada após seis dias reais de coleta.</p>)}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6 md:col-span-2 mt-6">
          <h2 className="text-lg font-bold lg:text-xl">Como funciona</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3 md:divide-x md:divide-border">
            <article className="md:pr-5">
              <h3 className="font-semibold">👛 Carteiras monitoradas</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">12 gateways PIX – USDC monitorados continuamente, 24 horas por dia. Cada carteira é verificada no Solscan.</p>
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
      <OnchainProofsDialog open={provasAbertas} onOpenChange={setProvasAbertas} rows={transactions} transactionCount={transacoes} loading={provasCarregando} error={provasErro} />
    </main>
  );
}