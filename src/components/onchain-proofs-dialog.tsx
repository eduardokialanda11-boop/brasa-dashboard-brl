import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
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
import { proofConversion } from "@/utils/proof-conversion";
import { proofsForDate } from "@/utils/proof-date";

export type TransactionRow = Record<string, unknown>;

type OnchainProofsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows?: TransactionRow[];
  referenceDate: string;
  loading: boolean;
  error: boolean;
};

const USDC_MINT =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const numberFrom = (row: TransactionRow, keys: string[]) => {
  const value = keys
    .map((key) => row[key])
    .find((candidate) => candidate != null);

  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const textFrom = (row: TransactionRow, keys: string[]) => {
  const value = keys
    .map((key) => row[key])
    .find((candidate) => typeof candidate === "string");

  return typeof value === "string" ? value : "";
};

const isVerifiedUSDC = (row: TransactionRow) =>
  row["token_symbol"] === "USDC" && row["token_mint"] === USDC_MINT && numberFrom(row, ["amount_usdc"]) > 0;

const shorten = (value: string) =>
  value.length > 12
    ? `${value.slice(0, 8)}…${value.slice(-4)}`
    : value || "Sem assinatura";

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

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function OnchainProofsDialog({
  open,
  onOpenChange,
  rows = [],
  referenceDate,
  loading,
  error,
}: OnchainProofsDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  // A janela de provas utiliza o mesmo filtro de USDC oficial do resumo.
  const verifiedRows = proofsForDate(rows.filter(isVerifiedUSDC), referenceDate);

  const conversion = selectedTx
    ? proofConversion(selectedTx, verifiedRows)
    : null;

  const selectedSignature = selectedTx
    ? textFrom(selectedTx, ["signature"])
    : "";

  const signatures = verifiedRows
    .map((row) => textFrom(row, ["signature"]))
    .filter(Boolean);

  const signedRows = verifiedRows.filter((row) =>
    Boolean(textFrom(row, ["signature"])),
  );

  const safeTransactionCount = verifiedRows.length;

  const copySignatures = async () => {
    const sample = signatures.slice(0, 5);

    if (!sample.length) {
      setFeedback("Nenhuma assinatura disponível para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(sample.join("\n"));
      setFeedback(`${sample.length} assinaturas copiadas.`);
    } catch {
      setFeedback(
        "Não foi possível copiar automaticamente. Abra uma transação no Solscan para consultar a assinatura.",
      );
    }
  };

  const downloadCsv = async () => {
    if (!verifiedRows.length) return;

    setExporting(true);
    setFeedback("");

    try {
      const csv = [
        [
          "signature",
          "amount_brl",
          "amount_usdc",
          "token_symbol",
          "token_mint",
          "origem",
          "block_time",
          "solscan_tx_url",
        ]
          .map(csvCell)
          .join(","),

        ...verifiedRows.map((row) => {
          const signature = textFrom(row, ["signature"]);

          return [
            signature,
            numberFrom(row, ["amount_brl"]),
            numberFrom(row, ["amount_usdc"]),
            textFrom(row, ["token_symbol"]),
            textFrom(row, ["token_mint"]),
            textFrom(row, ["origem"]),
            textFrom(row, ["block_time"]),
            signature
              ? `https://solscan.io/tx/${signature}`
              : "",
          ]
            .map(csvCell)
            .join(",");
        }),
      ].join("\r\n");

      const url = URL.createObjectURL(
        new Blob([`\uFEFF${csv}`], {
          type: "text/csv;charset=utf-8",
        }),
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `brasa-provas-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setFeedback(
        `${verifiedRows.length.toLocaleString("pt-BR")} transferências USDC exportadas.`,
      );
    } catch {
      setFeedback("Não foi possível gerar o CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedTx(null);
          setFeedback("");
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-4xl overflow-hidden border-border bg-card p-0 text-card-foreground sm:rounded-xl">
        <DialogHeader className="border-b border-border p-5 pr-12 md:p-6 md:pr-14">
          <DialogTitle className="flex items-start gap-2 text-left text-xl">
            <ShieldCheck
              className="size-5 text-primary"
              aria-hidden="true"
            />
            <span>Provas On-Chain</span>
          </DialogTitle>

          <DialogDescription className="text-left leading-relaxed">
            <strong className="text-foreground">
              {safeTransactionCount.toLocaleString("pt-BR")} transferências
              USDC verificadas pelo mint
            </strong>
            {" | "}{referenceDate ? referenceDate.split("-").reverse().join("/") : "Data indisponível"}
          </DialogDescription>

          <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-left text-xs font-semibold text-primary">
            Abra uma transação para consultar sua assinatura no Solscan.
          </p>

          <p className="text-left text-xs text-muted-foreground">
            O mint identifica o token USDC oficial. A assinatura comprova
            a existência da transação na Solana, mas não comprova sozinha
            que o dinheiro veio de um pagamento Pix. A origem registrada
            representa a classificação feita pelo coletor.
          </p>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => void downloadCsv()}
              disabled={exporting || verifiedRows.length === 0}
            >
              <Download aria-hidden="true" />
              {exporting ? "Gerando CSV..." : "Baixar CSV"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void copySignatures()}
              disabled={signatures.length === 0}
            >
              <Copy aria-hidden="true" />
              Copiar até 5 assinaturas
            </Button>
          </div>

          {feedback ? (
            <p role="status" className="text-left text-xs text-primary">
              {feedback}
            </p>
          ) : null}
        </DialogHeader>

        <div className="max-h-[62vh] overflow-auto p-5 md:p-6">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Buscando registros de prova...
            </p>
          ) : error ? (
            <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
              A tabela de provas não pôde ser consultada agora. O resumo
              diário continua disponível.
            </div>
          ) : (
            <div className="space-y-4">
              {signedRows.length < verifiedRows.length ? (
                <div className="rounded-lg border border-highlight/30 bg-accent p-4 text-sm text-highlight">
                  Alguns registros não possuem assinatura disponível
                  para consulta no Solscan.
                </div>
              ) : null}

              {verifiedRows.length > 0 ? (
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="pb-3 font-medium">Hora</th>
                      <th className="pb-3 font-medium">Valor BRL</th>
                      <th className="pb-3 font-medium">Valor USDC</th>
                      <th className="pb-3 font-medium">Classificação</th>
                      <th className="pb-3 text-right font-medium">Prova</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {verifiedRows.map((row, index) => {
                      const signature = textFrom(row, ["signature"]);
                      const time = textFrom(row, ["block_time"]);
                      const origin = textFrom(row, ["origem"]);

                      const originLabel =
                        origin === "debridge_brla"
                          ? "Classificado como deBridge / BRLA"
                          : origin === "gateway_direto"
                            ? "Classificado como gateway direto"
                            : origin || "Origem não informada";

                      return (
                        <tr
                          key={`${signature}-${index}`}
                          className="cursor-pointer transition-colors hover:bg-foreground/10"
                          onClick={() => setSelectedTx(row)}
                        >
                          <td className="py-3 text-muted-foreground">
                            {formatTime(time)}
                          </td>

                          <td className="py-3 font-semibold">
                            <Button
                              variant="ghost"
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTx(row);
                              }}
                              aria-label={`Abrir detalhes da transferência ${index + 1}`}
                            >
                              {formatBRL(
                                numberFrom(row, ["amount_brl"]),
                              )}
                            </Button>
                          </td>

                          <td className="py-3 font-semibold">
                            {formatUSDC(
                              numberFrom(row, ["amount_usdc"]),
                            )}{" "}
                            USDC
                          </td>

                          <td className="py-3 text-xs text-muted-foreground">
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                              {originLabel}
                            </span>
                            <p className="mt-1">
                              Classificação do coletor; origem Pix não
                              comprovada.
                            </p>
                          </td>

                          <td className="py-3 text-right">
                            {signature ? (
                              <a
                                className="inline-flex items-center gap-1 rounded-md bg-proof px-3 py-2 text-xs font-semibold text-proof-foreground transition-opacity hover:opacity-90"
                                href={`https://solscan.io/tx/${signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={signature}
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                Ver no Solscan
                                <ExternalLink
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">
                                Sem hash
                              </span>
                            )}

                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              {shorten(signature)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma transferência com o mint oficial do USDC foi
                  encontrada nos registros carregados.
                </p>
              )}
            </div>
          )}
        </div>

        <Dialog
          open={selectedTx !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSelectedTx(null);
          }}
        >
          <DialogContent
            className="z-[60] max-h-[88vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border-border bg-card text-card-foreground"
            onPointerDownOutside={() => setSelectedTx(null)}
          >
            <DialogHeader className="pr-6">
              <DialogTitle>
                Detalhes da transferência USDC
              </DialogTitle>
              <DialogDescription>
                Dados registrados e consulta da transação na Solana
              </DialogDescription>
            </DialogHeader>

            {selectedTx && conversion ? (
              <>
                <div className="border-b border-border pb-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Hora · Valor BRL calculado
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {formatTime(
                      textFrom(selectedTx, ["block_time"]),
                    )}{" "}
                    —{" "}
                    {conversion.calculatedBRL === null
                      ? "—"
                      : formatBRL(conversion.calculatedBRL)}
                  </p>
                </div>

                <div className="space-y-3 text-lg font-semibold">
                  <p>
                    {conversion.calculatedBRL === null
                      ? "—"
                      : formatBRL(conversion.calculatedBRL)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (BRL calculado)
                    </span>
                  </p>

                  <p>
                    /{" "}
                    {conversion.rate === null
                      ? "Referência indisponível"
                      : `Referência do dia ${formatBRL(conversion.rate)}`}
                  </p>

                  <p className="text-primary">
                    = {formatUSDC(conversion.usdc)} USDC{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (valor registrado)
                    </span>
                  </p>

                  <p className="text-sm font-normal">
                    Conta:{" "}
                    {conversion.calculatedBRL === null
                      ? "—"
                      : formatBRL(conversion.calculatedBRL)}{" "}
                    /{" "}
                    {conversion.rate === null
                      ? "—"
                      : formatBRL(conversion.rate)}{" "}
                    = {formatUSDC(conversion.usdc)} USDC
                  </p>

                  <p className="text-xs font-normal leading-relaxed text-muted-foreground">
                    A referência cambial é calculada a partir dos valores
                    agregados dos eventos do dia UTC, conforme a função
                    de conversão. Não representa necessariamente uma
                    cotação oficial. BRL registrado no banco:{" "}
                    {formatBRL(
                      numberFrom(selectedTx, ["amount_brl"]),
                    )}
                    .
                  </p>
                </div>

                <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                  A assinatura permite consultar a transação na Solana.
                  Ela não comprova, por si só, um pagamento Pix, o
                  recebimento de reais ou o lastro de uma conversão. O
                  valor em BRL pode ser calculado ou estimado conforme
                  os dados fornecidos pelo coletor.
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Assinatura completa
                  </p>

                  <p className="break-all font-mono text-xs">
                    {selectedSignature ||
                      "Sem assinatura disponível"}
                  </p>

                  {selectedSignature ? (
                    <a
                      href={`https://solscan.io/tx/${selectedSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                    >
                      Ver no Solscan
                      <ExternalLink
                        className="size-4"
                        aria-hidden="true"
                      />
                    </a>
                  ) : null}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedTx(null)}
                >
                  <ArrowLeft
                    className="size-4"
                    aria-hidden="true"
                  />
                  Fechar · Voltar para lista
                </Button>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}