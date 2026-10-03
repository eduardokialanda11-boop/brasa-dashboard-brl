import { Copy, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { formatUSDC } from "@/utils/format";

export type TransactionRow = Record<string, unknown>;

type WalletProof = {
  gatewayWallet: string;
  totalUsdc: number;
  txCount: number;
};

type OnchainProofsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows?: TransactionRow[];
  transactionCount?: number;
  loading: boolean;
  error: boolean;
};

const numberFrom = (row: TransactionRow, keys: string[]) => {
  const value = keys.map((key) => row[key]).find((candidate) => candidate != null);
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const textFrom = (row: TransactionRow, keys: string[]) => {
  const value = keys.map((key) => row[key]).find((candidate) => typeof candidate === "string");
  return typeof value === "string" ? value : "";
};

const shorten = (value: string) => value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value || "Sem signature";

const formatTime = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(date);
};

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function OnchainProofsDialog({ open, onOpenChange, rows = [], transactionCount = 0, loading, error }: OnchainProofsDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [walletEvents, setWalletEvents] = useState<TransactionRow[]>([]);
  const [walletCount, setWalletCount] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(false);
  const safeTransactionCount = walletCount ?? (Number.isFinite(Number(transactionCount)) ? Number(transactionCount) : 0);
  const signatures = rows.map((row) => textFrom(row, ["signature"])).filter(Boolean);
  const signedRows = rows.filter((row) => Boolean(textFrom(row, ["signature"])));
  const hasMissingSignature = walletEvents.some((row) => !textFrom(row, ["signature"]));

  useEffect(() => {
    if (!open || walletEvents.length > 0) return;
    let active = true;

    async function loadWalletProofs() {
      setWalletLoading(true);
      setWalletError(false);
      const allEvents: TransactionRow[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error: fetchError, count } = await supabase
          .from("pix_onchain_events")
          .select("signature, gateway_wallet, amount_usdc", { count: "exact" })
          .order("block_time", { ascending: false })
          .range(from, from + pageSize - 1);
        if (!active) return;
        if (fetchError) {
          setWalletError(true);
          setWalletLoading(false);
          return;
        }
        const page = (data ?? []) as TransactionRow[];
        allEvents.push(...page);
        if (count != null) setWalletCount(count);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      if (!active) return;
      setWalletEvents(allEvents);
      setWalletLoading(false);
    }

    void loadWalletProofs();
    return () => {
      active = false;
    };
  }, [open, walletEvents.length]);

  const walletProofs = useMemo(() => {
    const grouped = new Map<string, WalletProof>();
    walletEvents.forEach((row) => {
      const gatewayWallet = textFrom(row, ["gateway_wallet"]);
      if (!gatewayWallet) return;
      const current = grouped.get(gatewayWallet) ?? { gatewayWallet, totalUsdc: 0, txCount: 0 };
      current.totalUsdc += numberFrom(row, ["amount_usdc"]);
      current.txCount += 1;
      grouped.set(gatewayWallet, current);
    });
    return [...grouped.values()].sort((a, b) => b.totalUsdc - a.totalUsdc).slice(0, 12);
  }, [walletEvents]);

  const copySignatures = async () => {
    const sample = signatures.slice(0, 5);
    if (!sample.length) return;
    await navigator.clipboard.writeText(sample.join("\n"));
    setFeedback(`${sample.length} assinaturas copiadas.`);
  };

  const downloadCsv = async () => {
    setExporting(true);
    setFeedback("");
    const csv = [
      ["gateway_wallet", "total_usdc", "tx_count", "solscan_account_url"].map(csvCell).join(","),
      ...walletProofs.map((wallet) => [
        wallet.gatewayWallet,
        wallet.totalUsdc,
        wallet.txCount,
        `https://solscan.io/account/${wallet.gatewayWallet}`,
      ].map(csvCell).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `brasa-carteiras-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback(`${walletProofs.length.toLocaleString("pt-BR")} carteiras exportadas.`);
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-4xl overflow-hidden border-border bg-card p-0 text-card-foreground sm:rounded-xl">
        <DialogHeader className="border-b border-border p-5 pr-12 md:p-6 md:pr-14">
          <DialogTitle className="flex items-start gap-2 text-left text-xl">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <span>Provas On-Chain</span>
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            <strong className="text-foreground">{safeTransactionCount.toLocaleString("pt-BR")} transações auditáveis</strong>
            {" | 12 carteiras monitoradas | Fonte: Solana RPC + Helius"}
          </DialogDescription>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="button" onClick={() => void downloadCsv()} disabled={exporting || walletProofs.length === 0}>
              <Download aria-hidden="true" />
              {exporting ? "Gerando CSV..." : "Baixar CSV das carteiras"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void copySignatures()} disabled={signatures.length === 0}>
              <Copy aria-hidden="true" /> Copiar 5 assinaturas para teste
            </Button>
          </div>
          {feedback ? <p role="status" className="text-left text-xs text-primary">{feedback}</p> : null}
        </DialogHeader>

        <div className="max-h-[62vh] overflow-auto p-5 md:p-6">
          {loading || walletLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Buscando provas na Solana...</p>
          ) : error || walletError ? (
            <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
              A tabela de provas não pôde ser consultada agora. O resumo diário continua disponível.
            </div>
          ) : (
            <div className="space-y-4">
              {hasMissingSignature || signedRows.length === 0 ? (
                <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
                  Transações antigas: auditáveis por carteira no Solscan. Novas transações já terão link direto da assinatura.
                </div>
              ) : null}
              {walletProofs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="pb-3 font-medium">Carteira gateway</th>
                        <th className="pb-3 font-medium">Total recebido</th>
                        <th className="pb-3 font-medium">Transações</th>
                        <th className="pb-3 text-right font-medium">Auditoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {walletProofs.map((wallet) => (
                        <tr key={wallet.gatewayWallet}>
                          <td className="py-3 font-mono text-xs text-muted-foreground">{shorten(wallet.gatewayWallet)}</td>
                          <td className="py-3 font-semibold">{formatUSDC(wallet.totalUsdc)}</td>
                          <td className="py-3 text-muted-foreground">{wallet.txCount.toLocaleString("pt-BR")}</td>
                          <td className="py-3 text-right">
                            <Button asChild size="sm" className="bg-proof text-proof-foreground hover:bg-proof/90">
                              <a href={`https://solscan.io/account/${wallet.gatewayWallet}`} target="_blank" rel="noreferrer">
                                Ver carteira no Solscan <ExternalLink className="size-3.5" aria-hidden="true" />
                              </a>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma carteira verificável foi retornada pela fonte on-chain.</p>
              )}
              {signedRows.length > 0 ? <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-3 font-medium">Signature</th>
                  <th className="pb-3 font-medium">USDC</th>
                  <th className="pb-3 font-medium">Horário</th>
                  <th className="pb-3 text-right font-medium">Auditoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {signedRows.map((row, index) => {
                  const signature = textFrom(row, ["signature"]);
                  const time = textFrom(row, ["block_time"]);
                  return (
                    <tr key={signature || `transaction-${index}`}>
                      <td className="py-3 font-mono text-xs text-muted-foreground">{shorten(signature)}</td>
                      <td className="py-3 font-semibold">{formatUSDC(numberFrom(row, ["amount_usdc"]))}</td>
                      <td className="py-3 text-muted-foreground">{formatTime(time)}</td>
                      <td className="py-3 text-right">
                        {signature ? (
                          <a className="inline-flex items-center gap-1 rounded-md bg-proof px-3 py-2 text-xs font-semibold text-proof-foreground transition-opacity hover:opacity-90" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">
                            Ver no Solscan <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        ) : <span className="text-muted-foreground">Sem hash</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table> : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}