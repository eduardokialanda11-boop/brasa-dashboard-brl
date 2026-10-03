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
  totalBrl: number;
  totalUsdc: number;
  txCount: number;
};

// Tipo da sua RPC nova
type BrasaRPC = {
  dia: string;
  total_brl: number;
  total_usdc?: number;
  tx_count: number;
  saved_fees_brl?: number;
  usd_brl_rate?: number;
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
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [acumulado, setAcumulado] = useState<AccumulatedVolume>({ totalBrl: 0, totalUsdc: 0, txCount: 0 });
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
      // NOVA LÓGICA LEVE - só 2 linhas da RPC
      const [rpcResult, transactionResult] = await Promise.all([
        supabase.rpc('get_brasa_last_7_days').returns<BrasaRPC[]>(),
        supabase
          .from("pix_onchain_events")
          .select("signature, gateway_wallet, amount_usdc, amount_brl, block_time")
          .order("block_time", { ascending: false })
          .limit(50),
      ]);

      if (!active) return;
      
      if (rpcResult.error) {
        console.warn("Erro na RPC get_brasa_last_7_days:", rpcResult.error);
      }

      const rpcData = rpcResult.data ?? [];
      // Converte RPC -> formato antigo que seu gráfico já usa
      const mapped: DailyVolume[] = rpcData.map(d => ({
        date: d.dia,
        total_brl: d.total_brl,
        total_usdc: d.total_usdc ?? 0,
        tx_count: d.tx_count,
        usd_brl_rate: d.usd_brl_rate ?? null,
      })).sort((a,b)=> a.date.localeCompare(b.date)); // crescente pro gráfico

      const latestRow = mapped.at(-1) ?? null;
      if (!dataSelecionada && latestRow?.date) setDataSelecionada(latestRow.date);
      
      const resumoFinal = dataSelecionada 
        ? mapped.find(m => m.date === dataSelecionada) ?? null
        : latestRow;

      setResumo(resumoFinal);
      setHistorico(mapped);
      setAcumulado(mapped.reduce<AccumulatedVolume>((sum, row) => ({
        totalBrl: sum.totalBrl + asNumber(row.total_brl),
        totalUsdc: sum.totalUsdc +