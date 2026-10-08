import { Copy, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBRL, formatUSDC } from "@/utils/format";

export type TransactionRow = Record<string, unknown>;

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
  const reportedTransactionCount = Number.isFinite(Number(transactionCount)) ? Number(transactionCount) : 0;
  const safeTransactionCount = reportedTransactionCount > 0 ? reportedTransactionCount : rows.length;
  const signatures = rows.map((row) => textFrom(row, ["signature"])).filter(Boolean);
  const signedRows = rows.filter((row) => Boolean(textFrom(row, ["signature"])));

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
      ["signature", "amount_brl", "amount_usdc", "origem", "block_time", "solscan_tx_url"].map(csvCell).join(","),
      ...rows.map((row) => {
        const signature = textFrom(row, ["signature"]);
        return [
          signature,
          numberFrom(row, ["amount_brl"]),
          numberFrom(row, ["amount_usdc"]),
          textFrom(row, ["origem"]),
          textFrom(row, ["block_time"]),
          signature ? `https://solscan.io/tx/${signature}` : "",
        ].map(csvCell).join(",");
      }),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `brasa-provas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback(`${rows.length.toLocaleString("pt-BR")} transações exportadas.`);
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
            {" | todos os eventos registrados"}
          </DialogDescription>
          <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-left text-xs font-semibold text-primary">Clique em qualquer transação e veja no Solscan quem assinou.</p>
          <p className="text-left text-xs text-muted-foreground">A origem abaixo é a registrada na coleta. Esses campos não identificam o signatário como Transak nem comprovam o recebimento ou lastro em PIX. PIX → USDC é um resumo dos valores, não um memo decodificado.</p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="button" onClick={() => void downloadCsv()} disabled={exporting || rows.length === 0}>
              <Download aria-hidden="true" />
              {exporting ? "Gerando CSV..." : "Baixar CSV"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void copySignatures()} disabled={signatures.length === 0}>
              <Copy aria-hidden="true" /> Copiar 5 assinaturas para teste
            </Button>
          </div>
          {feedback ? <p role="status" className="text-left text-xs text-primary">{feedback}</p> : null}
        </DialogHeader>

        <div className="max-h-[62vh] overflow-auto p-5 md:p-6">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Buscando provas na Solana...</p>
          ) : error ? (
            <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
              A tabela de provas não pôde ser consultada agora. O resumo diário continua disponível.
            </div>
          ) : (
            <div className="space-y-4">
              {signedRows.length < rows.length ? (
                <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
                   Registros sem signature não possuem prova de transação disponível no Solscan.
                </div>
              ) : null}
              {rows.length > 0 ? <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-3 font-medium">Hora</th>
                  <th className="pb-3 font-medium">Valor BRL</th>
                  <th className="pb-3 font-medium">Valor USDC</th>
                  <th className="pb-3 font-medium">Origem</th>
                  <th className="pb-3 text-right font-medium">Prova</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => {
                  const signature = textFrom(row, ["signature"]);
                  const time = textFrom(row, ["block_time"]);
                  const origin = textFrom(row, ["origem"]);
                  const originLabel = origin === "debridge_brla" ? "BRLA (Real Digital) -> USDC via deBridge" : origin === "gateway_direto" ? "PIX Direto -> USDC" : origin || "Origem não informada";
                  return (
                    <tr key={`${signature}-${index}`}>
                      <td className="py-3 text-muted-foreground">{formatTime(time)}</td>
                       <td className="py-3 font-semibold">{formatBRL(numberFrom(row, ["amount_brl"]))}</td>
                      <td className="py-3 font-semibold">{formatUSDC(numberFrom(row, ["amount_usdc"]))} USDC</td>
                      <td className="py-3 text-xs text-muted-foreground">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{origin === "debridge_brla" ? "Gateway: BRLA (Real Digital)" : origin === "gateway_direto" ? "Gateway direto — não identificado" : originLabel}</span>
                        <p className="mt-1 text-xs text-muted-foreground">{originLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Prova: assinatura da transação no Solscan</p>
                      </td>
                      <td className="py-3 text-right">
                        {signature ? (
                          <a className="inline-flex items-center gap-1 rounded-md bg-proof px-3 py-2 text-xs font-semibold text-proof-foreground transition-opacity hover:opacity-90" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer" title={signature}>
                            Ver no Solscan <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        ) : <span className="text-muted-foreground">Sem hash</span>}
                        <p className="mt-1 text-xs text-muted-foreground">PIX {formatBRL(numberFrom(row, ["amount_brl"]))} -&gt; USDC</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{shorten(signature)}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
             </table> : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação disponível na fonte de provas.</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}