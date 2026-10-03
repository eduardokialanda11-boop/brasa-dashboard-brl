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

type AccumulatedVolume = {
  totalBRL: number;
  totalUSDC: number;
  txCount: number;
};

const asNumber = (value: number | string | null | undefined) => Number(value ?? 0);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));

const formatDateWeekday = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`))
    .replace(".", "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

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
      {
        name: "description",
        content: "Volume real de PIX convertido em USDC na Solana, atualizado a cada 60 segundos.",
      },
      { property: "og:title", content: "Brasa | Índice PIX para USDC na Solana" },
      {
        property: "og:description",
        content: "Resumo on-chain de volume, economia e pontos Brasa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      try {
        const hojeBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const dataAlvo = dataSelecionada || hojeBR;

        const [statsResult, trendResult, transactionResult] = await Promise.all([
          supabase.rpc("get_brasa_daily_stats", { target_date: dataAlvo }),
          supabase.rpc("get_brasa_historical_trend", { days_limit: 7 }),
          supabase.from("pix_onchain_events")
            .select("signature, gateway_wallet, amount_usdc, amount_brl, block_time")
            .order("block_time", { ascending: false })
            .limit(50)
        ]);

        if (!active) return;

        if (statsResult.error || trendResult.error || transactionResult.error) {
          console.warn("Erro ao buscar dados do Brasa:", statsResult.error ?? trendResult.error ?? transactionResult.error);
          setProvasErro(true);
          return;
        }

        if (statsResult.data && statsResult.data.length > 0) {
          const stats = statsResult.data[0];
          setResumo({
            date: dataAlvo,
            total_brl: stats.total_brl,
            total_usdc: stats.total_usdc,
            tx_count: stats.tx_count,
            usd_brl_rate: stats.total_usdc > 0 ? (stats.total_brl / stats.total_usdc) : 5.19
          });
        }

        if (trendResult.data) {
          const trendMapped = trendResult.data.map((item: any) => ({
            date: item.event_date,
            total_brl: item.daily_brl,
            total_usdc: item.daily_usdc,
            tx_count: item.daily_txs,
            usd_brl_rate: item.daily_usdc > 0 ? (item.daily_brl / item.daily_usdc) : 5.19
          }));
          setHistorico([...trendMapped].reverse());

          const totalAcumulado = trendMapped.reduce((sum: any, row: any) => ({
            totalBrl: sum.totalBrl + Number(row.total_brl),
            totalUsdc: sum.totalUsdc + Number(row.total_usdc),
            txCount: sum.txCount + Number(row.tx_count)
          }), { totalBrl: 0, totalUsdc: 0, txCount: 0 });
          
          setAcumulado({
            totalBRL: totalAcumulado.totalBrl,
            totalUSDC: totalAcumulado.totalUsdc,
            txCount: totalAcumulado.txCount
          });
        }

        if (transactionResult.data) {
          setTransactions(transactionResult.data as TransactionRow[]);
        }

        const now = new Date();
        setAtualizadoEm(now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "America/Sao_Paulo"
        }));
        setAtualizadoEmCompleto(now);

      } catch (err) {
        console.error("Erro inesperado no fluxo do dashboard:", err);
        setProvasErro(true);
      } finally {
        if (active) {
          setCarregando(false);
          setProvasCarregando(false);
        }
      }
    }

    fetchDashboard();

    const refreshInterval = window.setInterval(() => {
      fetchDashboard();
    }, 60_000);

    const realtimeChannel = supabase
      .channel("pix_events_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pix_onchain_events" },
        () => { fetchDashboard(); }
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [dataSelecionada]);

  const totalBrl = asNumber(resumo?.total_brl);
  const totalUsdc = asNumber(resumo?.total_usdc);
  const transacoes = asNumber(resumo?.tx_count);
  const dolarInformado = asNumber(resumo?.usd_brl_rate);
  const dolar = dolarInformado > 0 ? dolarInformado : totalUsdc > 0 ? totalBrl / totalUsdc : null;

  // CORREÇÃO 1: Separação de escopo de economia (Diária vs Histórica Total)
  const economiaDiaria = totalBrl * 0.037;
  const economiaTotalHistorica = acumulado.totalBRL * 0.037;
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
    : "-";

  const nextSync = atualizadoEmCompleto
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Sao_Paulo",
      }).format(new Date(atualizadoEmCompleto.getTime() + 60_000))
    : "-";

  const variacao = useMemo(() => {
    if (historico.length < 2) return null;
    const previousTotal = asNumber(historico[historico.length - 2]?.total_brl);
    const currentTotal = asNumber(historico[historico.length - 1]?.total_brl);
    if (previousTotal <= 0) return null;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [historico]);

  const inicioDaColeta = historico.length < 3;
  const variacaoForaDaFaixa = variacao !== null && (variacao < -50 || variacao > 200);

  const semana = useMemo(() => historico.map((registro) => ({ date: registro.date, registro })), [historico]);

  const insight = useMemo(() => {
    if (!historico.length) return null;
    const volumes = historico.map((item) => asNumber(item.total_brl));
    const total = volumes.reduce((sum, value) => sum + value, 0);
    const media = total / historico.length;
    const pico = Math.max(...volumes);
    const picoIndex = volumes.indexOf(pico);
    const picoData = historico[picoIndex]?.date;
    const ultimosTres = volumes.slice(-3);
    const tresAnteriores = volumes.slice(-6, -3);
    const mediaUltimosTres = ultimosTres.reduce((sum, value) => sum + value, 0) / Math.max(1, ultimosTres.length);
    const mediaTresAnteriores = tresAnteriores.reduce((sum, value) => sum + value, 0) / Math.max(1, tresAnteriores.length);
    const tendenciaAlta = ultimosTres.length === 3 && tresAnteriores.length === 3 && mediaUltimosTres > mediaTresAnteriores;
    return { media, pico, picoData, tendenciaAlta };
  }, [historico]);

  const chartMaximum = useMemo(() => {
    const max = Math.max(1, ...historico.map((item) => asNumber(item.total_brl)));
    return max * 1.3;
  }, [historico]);

  const chartProgress = useMemo(() => {
    return Math.min(100, Math.round((historico.length / 7) * 100));
  }, [historico]);

  const chartData = useMemo<ChartData<"line">>(() => {
    const labels = semana.map((item) => {
      const formattedWeekday = formatDateWeekday(item.date);
      const formattedDate = formatDate(item.date);
      return `${formattedWeekday} (${formattedDate})`;
