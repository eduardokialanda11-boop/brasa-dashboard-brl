import { ExternalLink, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL, formatUSDC } from "@/utils/format";

export type TransactionRow = Record<string, unknown>;

type OnchainProofsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: TransactionRow[];
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

const shorten = (value: string) => value.length > 10 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value || "—";

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

export function OnchainProofsDialog({ open, onOpenChange, rows, loading, error }: OnchainProofsDialogProps) {
  const totalBrl = rows.reduce((sum, row) => sum + numberFrom(row, ["brl", "amount_brl", "valor_brl", "total_brl"]), 0);
  const signatures = new Set(rows.map((row) => textFrom(row, ["signature", "tx_signature", "tx_hash", "hash"])).filter(Boolean));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-4xl overflow-hidden border-border bg-card p-0 text-card-foreground sm:rounded-xl">
        <DialogHeader className="border-b border-border p-5 pr-12 md:p-6 md:pr-14">
          <DialogTitle className="flex items-start gap-2 text-left text-xl">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <span>
              Provas On-Chain{rows.length ? ` - Total verificado hoje: ${formatBRL(totalBrl)} em ${rows.length} txs únicas` : ""}
            </span>
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            {rows.length
              ? `${signatures.size} hashes únicos e verificáveis no Solscan.`
              : "As assinaturas verificáveis aparecerão aqui após a primeira coleta."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-auto p-5 md:p-6">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Buscando provas na Solana...</p>
          ) : error ? (
            <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
              A tabela de provas não pôde ser consultada agora. O resumo diário continua disponível.
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-highlight/30 bg-accent p-5 text-center">
              <p className="font-semibold text-highlight">Coleta de assinaturas aguardando primeiro registro</p>
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma transação será exibida como prova sem hash real verificável.</p>
            </div>
          ) : (
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-3 font-medium">USDC</th>
                  <th className="pb-3 font-medium">BRL</th>
                  <th className="pb-3 font-medium">Horário</th>
                  <th className="pb-3 font-medium">Carteira</th>
                  <th className="pb-3 text-right font-medium">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => {
                  const signature = textFrom(row, ["signature", "tx_signature", "tx_hash", "hash"]);
                  const wallet = textFrom(row, ["wallet", "wallet_address", "carteira", "address"]);
                  const time = textFrom(row, ["created_at", "timestamp", "block_time", "time"]);
                  return (
                    <tr key={signature || `transaction-${index}`}>
                      <td className="py-3 font-semibold">{formatUSDC(numberFrom(row, ["usdc", "amount_usdc", "valor_usdc", "total_usdc"]))}</td>
                      <td className="py-3">{formatBRL(numberFrom(row, ["brl", "amount_brl", "valor_brl", "total_brl"]))}</td>
                      <td className="py-3 text-muted-foreground">{formatTime(time)}</td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">{shorten(wallet)}</td>
                      <td className="py-3 text-right">
                        {signature ? (
                          <a className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">
                            {signature.slice(0, 8)}... Ver <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        ) : <span className="text-muted-foreground">Sem hash</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}