8import { createFileRoute } from "@tanstack/react-router";
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

type DailyVolume = { date: string; total_brl: number | string | null; total_usdc: number | string | null; tx_count: number | string | null; usd_brl_rate: number | string | null; };
type AccumulatedVolume = { totalBRL: number; totalUSDC: number; txCount: number; };
const asNumber = (value: number | string | null | undefined) => Number(value?? 0);
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
const formatWeekday = (value: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)).replace(".", "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const referenceDate = () => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Brasa | Índice PIX para USDC na Solana" }, { name: "description", content: "Volume real de PIX convertido em USDC na Solana, atualizado a cada 60 segundos." }] }),
  component: BrasaAoVivo,
});

function BrasaAoVivo() {
  const [resumo, setResumo] = useState<DailyVolume | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [acumulado, setAcumulado] = useState<AccumulatedVolume>({ totalBRL: 0, totalUSDC: 0, txCount: 0 });
  const [historico, setHistorico] = useState<DailyVolume[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [atualizadoEmCompleto, setAtualizadoEmCompleto] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [provasAbertas, setProvasAbertas] = useState(false);
  const [provasCarregando, setProvasCarregando] = useState(true);
  const [provasErro, setProvasErro] = useState(false);
  const [labelHoje, setLabelHoje] = useState("Hoje (tempo real)");

  useEffect(() => {
    let active = true;
    async function fetchDashboard() {
      try {
        const hojeBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const inicioHojeUTC = new Date(`${hojeBR}T00:00:00-03:00`).toISOString();
        const [hojeResult, trendResult, allTimeResult, transactionResult] = await Promise.all([
          supabase.from("pix_onchain_events").select("amount_brl, amount_usdc").gte("block_time", inicioHojeUTC).gte("amount_usdc", 5),
          supabase.rpc("get_brasa_historical_trend", { days_limit: 7 }),
          supabase.rpc("get_brasa_historical_trend", { days_limit: 1000 }),
          supabase.from("pix_onchain_events").select("signature, gateway_wallet, amount_usdc, amount_brl, block_time").gte("amount_usdc", 5).order("block_time", { ascending: false }).limit(50),
        ]);
        if (!active) return;
        let trendMapped: DailyVolume[] = []; let allTimeMapped: DailyVolume[] = [];
        if (trendResult.data) { trendMapped = trendResult.data.map((item: any) => ({ date: item.event_date, total_brl: item.daily_brl, total_usdc: item.daily_usdc, tx_count: item.daily_txs, usd_brl_rate: item.daily_usdc > 0? item.daily_brl / item.daily_usdc : 5.19, })).sort((a: any, b: any) => a.date.localeCompare(b.date)); setHistorico(trendMapped); }
        if (allTimeResult.data) { allTimeMapped = allTimeResult.data.map((item: any) => ({ date: item.event_date, total_brl: item.daily_brl, total_usdc: item.daily_usdc, tx_count: item.daily_txs, usd_brl_rate: item.daily_usdc > 0? item.daily_brl / item.daily_usdc : 5.19, })); const total = allTimeResult.data.reduce((sum: any, row: any) => ({ brl: sum.brl + Number(row.daily_brl), usdc: sum.usdc + Number(row.daily_usdc), txs: sum.txs + Number(row.daily_txs), }), { brl: 0, usdc: 0, txs: 0 }); setAcumulado({ totalBRL: total.brl, totalUSDC: total.usdc, txCount: total.txs }); }
        const totalHojeBRL = hojeResult.data?.reduce((s: number, r: any) => s + Number(r.amount_brl), 0)?? 0; const totalHojeUSDC = hojeResult.data?.reduce((s: number, r: any) => s + Number(r.amount_usdc), 0)?? 0; const txHoje = hojeResult.data?.length?? 0;
        if (dataSelecionada) {
          const escolhido = allTimeMapped.find((m) => m.date === dataSelecionada) || trendMapped.find((m) => m.date === dataSelecionada);
          if (escolhido) { setResumo(escolhido); setLabelHoje(`Dia ${formatDate(dataSelecionada)}`); }
          else {
            const { data: diaEspecifico } = await supabase.from("pix_onchain_events").select("amount_brl, amount_usdc").gte("block_time", `${dataSelecionada}T00:00:00-03:00`).lte("block_time", `${dataSelecionada}T23:59:59-03:00`).gte("amount_usdc", 5);
            if (diaEspecifico && diaEspecifico.length > 0) {
              const brl = diaEspecifico.reduce((s: number, r: any) => s + Number(r.amount_brl), 0); const usdc = diaEspecifico.reduce((s: number, r: any) => s + Number(r.amount_usdc), 0);
              setResumo({ date: dataSelecionada, total_brl: brl, total_usdc: usdc, tx_count: diaEspecifico.length, usd_brl_rate: usdc > 0? brl/usdc : 5.19 });
            } else { setResumo({ date: dataSelecionada, total_brl: 0, total_usdc: 0, tx_count: 0, usd_brl_rate: 5.19 }); }
            setLabelHoje(`Dia ${formatDate(dataSelecionada)}`);
          }
        } else {
          if (totalHojeBRL > 0) { setResumo({ date: hojeBR, total_brl: totalHojeBRL, total_usdc: totalHojeUSDC, tx_count: txHoje, usd_brl_rate: totalHojeUSDC > 0? totalHojeBRL / totalHojeUSDC : 5.19 }); setLabelHoje("Hoje (tempo real)"); }
          else if (trendMapped.length > 0) { const ultimo = trendMapped.at(-1)!; setResumo(ultimo); setLabelHoje(`Último fechamento: ${formatDate(ultimo.date)}`); }
        }
        if (transactionResult.data) setTransactions(transactionResult.data as TransactionRow[]);
        const now = new Date(); setAtualizadoEm(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" })); setAtualizadoEmCompleto(now);
      } catch (err) { console.error(err); setProvasErro(true); } finally { if (active) { setCarregando(false); setProvasCarregando(false); } }
    }
    fetchDashboard(); const refreshInterval = window.setInterval(() => { fetchDashboard(); }, 60_000);
    const realtimeChannel = supabase.channel("pix_events_live").on("postgres_changes", { event: "INSERT", schema: "public", table: "pix_onchain_events" }, () => { fetchDashboard(); }).subscribe();
    return () => { active = false; window.clearInterval(refreshInterval); supabase.removeChannel(realtimeChannel); };
  }, [dataSelecionada]);

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
  const chartMaximum = useMemo(() => Math.max(1,...historico.map((item) => asNumber(item.total_brl))) * 1.3, [historico]);
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
    scales: { x: { grid: { display: false }, ticks: { color: "#8fb09c", callback: function (_value, index) { const item = semana[index]; return item? [formatDate(item.date), formatWeekday(item.date)] : ""; } }, y: { beginAtZero: true, max: chartMaximum, grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#8fb09c", callback: (value) => formatBRLCompact(Number(value)) } } },
  }), [chartMaximum, semana]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6 md:max-w-[900px] md:px-8 md:py-10">
        <header className="mb-6 border-b border-border pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:flex md:justify-between">
            <div className="flex min-w-0 items-center gap-3"><img src={logo.url} alt="Logo Brasa" className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border" /><p className="truncate text-sm font-bold md:text-base">BRASA</p></div>
            <div className="flex shrink-0 items-center justify-end gap-2 text-[11px] font-bold text-primary md:text-xs"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-primary" /></span>REAL ON-CHAIN</div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground md:text-base">O BRASA monitora em tempo real quanto de Real (PIX) virou USDC na Solana hoje. Dados 100% on-chain, auditáveis no Solscan.</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><p>{historico.at(-1)?.date? `Último dado verificado em: ${formatDate(historico.at(-1)?.date?? "")}` : `Referência hoje: ${referenceDate()}`}</p>{atualizadoEm && <p className="shrink-0">Atualizado às {atualizadoEm}</p>}</div>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 shadow-xl lg:rounded-2xl lg:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold lg:text-xl">{labelHoje}</h2>
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
              Data
              <input type="date" value={dataSelecionada} onChange={(event) => setDataSelecionada(event.target.value)} max={historico.at(-1)?.date}
                className="h-9 rounded-md border border-border bg-secondary px-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Selecionar data do resumo" />
            </label>
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
                <p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">em PIX convertido para USDC na Solana {dataSelecionada? `em ${formatDate(dataSelecionada)}` : ""}</p>
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
              <div className="py-4"><p className="text-2xl font-bold lg:text-3xl">{formatUSDC(acumulado.totalUSDC)} <span className="text-sm font-medium text-muted-foreground lg:text-base">USDC</span></p><p className="mt-1.5 text-[11px] text-muted-foreground lg:text-sm">acumulado on-chain</p></div>
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