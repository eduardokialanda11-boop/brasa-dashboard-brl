import { createServerFn } from "@tanstack/react-start";

type LiveIndexResponse = {
  total_brl?: number | string | null;
  total_usdc?: number | string | null;
  volume_hoje_brl?: number | string | null;
  volume_hoje_usdc?: number | string | null;
};

const LIVE_INDEX_URL = "https://npxytlxjnoqpyoukpppi.supabase.co/functions/v1/hyper-action";
const LIVE_INDEX_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHl0bHhqbm9xcHlvdWtwcHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzU3NzQsImV4cCI6MjEwNTcxMTc3NH0.jqJ7FQHhNxAbQYRRMnE7zuHpq-dkUhr0nsMcKGPCTDI";

export const getLiveIndex = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch(LIVE_INDEX_URL, {
    headers: {
      apikey: LIVE_INDEX_KEY,
      Authorization: `Bearer ${LIVE_INDEX_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha na sincronização do índice (${response.status})`);
  }

  const data = (await response.json()) as LiveIndexResponse;
  const totalBRL = Number(data.total_brl ?? data.volume_hoje_brl ?? 0);
  const totalUSDC = Number(data.total_usdc ?? data.volume_hoje_usdc ?? 0);

  return { totalBRL, totalUSDC, economyBRL: totalBRL * 0.032 };
});