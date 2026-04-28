import {
  fetchJson,
  formatSignedDelta,
  formatSignedPercent,
  isNearlyZero,
  round,
  uniqueFacts,
} from "./shared";
import type { ConnectorRuntimeOptions, MiroFactsPayload } from "./types";

interface FrankfurterRateRow {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

type FrankfurterRatesResponse = FrankfurterRateRow[];

type CoinGeckoCoinData = Record<string, number>;
type CoinGeckoSimplePriceResponse = Record<string, CoinGeckoCoinData>;

const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

function pickLatestAndPreviousByQuote(
  rows: FrankfurterRateRow[],
): Map<string, { latest: FrankfurterRateRow; previous: FrankfurterRateRow | null }> {
  const grouped = new Map<string, FrankfurterRateRow[]>();

  for (const row of rows) {
    const list = grouped.get(row.quote) ?? [];
    list.push(row);
    grouped.set(row.quote, list);
  }

  const result = new Map<
    string,
    { latest: FrankfurterRateRow; previous: FrankfurterRateRow | null }
  >();

  for (const [quote, quoteRows] of grouped.entries()) {
    quoteRows.sort((a, b) => a.date.localeCompare(b.date));
    const latest = quoteRows[quoteRows.length - 1];
    const previous =
      quoteRows.length > 1 ? quoteRows[quoteRows.length - 2] : null;
    result.set(quote, { latest, previous });
  }

  return result;
}

export async function fetchCurrencyFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 3_000;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 7);

  const responseUrl =
    `${FRANKFURTER_BASE}/rates?` +
    new URLSearchParams({
      base: "USD",
      quotes: "EUR,GBP,JPY,RUB,BYN",
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
    }).toString();

  const rows = await fetchJson<FrankfurterRatesResponse>(
    responseUrl,
    {},
    {
      timeoutMs: requestTimeoutMs,
      budgetMs: Math.max(requestTimeoutMs, 3_200),
      label: "Frankfurter FX",
    },
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Frankfurter returned no rate rows.");
  }

  const byQuote = pickLatestAndPreviousByQuote(rows);
  const latestByDate = Array.from(byQuote.values()).map((entry) => entry.latest);
  const latestDate = latestByDate
    .map((entry) => entry.date)
    .sort((a, b) => b.localeCompare(a))[0];

  const facts: string[] = [];
  const directPairs = ["BYN", "RUB", "JPY"] as const;
  const reservePairs = ["EUR", "GBP"] as const;

  const directFactParts = directPairs
    .map((quote) => byQuote.get(quote)?.latest)
    .filter((entry): entry is FrankfurterRateRow => Boolean(entry))
    .map(
      (entry) =>
        `1 USD = ${round(entry.rate, entry.quote === "JPY" ? 2 : 4)} ${entry.quote}`,
    );

  if (directFactParts.length > 0) {
    facts.push(`Frankfurter ${latestDate}: ${directFactParts.join(", ")}.`);
  }

  const reserveFactParts = reservePairs
    .map((quote) => byQuote.get(quote)?.latest)
    .filter((entry): entry is FrankfurterRateRow => Boolean(entry))
    .map((entry) => `1 USD = ${round(entry.rate, 4)} ${entry.quote}`);

  if (reserveFactParts.length > 0) {
    facts.push(`Major reserve pairs on ${latestDate}: ${reserveFactParts.join(", ")}.`);
  }

  for (const quote of ["RUB", "BYN", "EUR", "GBP"] as const) {
    const pair = byQuote.get(quote);
    if (!pair?.previous) {
      continue;
    }

    const delta = pair.latest.rate - pair.previous.rate;
    const digits = quote === "RUB" || quote === "BYN" ? 2 : 4;

    if (isNearlyZero(delta, digits === 2 ? 0.01 : 0.0005)) {
      facts.push(
        `USD/${quote} was nearly unchanged versus the previous fixing, ending at ${round(pair.latest.rate, digits)} on ${pair.latest.date}.`,
      );
    } else {
      const verb = delta >= 0 ? "rose" : "fell";
      facts.push(
        `USD/${quote} ${verb} by ${formatSignedDelta(delta, digits)} versus the previous fixing, ending at ${round(pair.latest.rate, digits)} on ${pair.latest.date}.`,
      );
    }
  }

  return {
    category_hint: "Markets",
    source: "Frankfurter",
    facts: uniqueFacts(facts, 4),
  };
}

export async function fetchCryptoFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 3_000;
  const url =
    `${COINGECKO_BASE}/simple/price?` +
    new URLSearchParams({
      ids: "bitcoin,ethereum,solana",
      vs_currencies: "usd,eur,rub",
      include_24hr_change: "true",
    }).toString();

  const response = await fetchJson<CoinGeckoSimplePriceResponse>(
    url,
    {
      headers: {
        ...(process.env.COINGECKO_DEMO_API_KEY
          ? { "x-cg-demo-api-key": process.env.COINGECKO_DEMO_API_KEY }
          : {}),
      },
    },
    {
      timeoutMs: requestTimeoutMs,
      budgetMs: Math.max(requestTimeoutMs, 3_200),
      label: "CoinGecko crypto",
      retry: {
        maxRetries: 1,
        retryOn: ["status:429", "status:503", "status:504", "timeout", "network"],
        baseDelayMs: 140,
        maxDelayMs: 240,
        jitterMs: 90,
      },
    },
  );

  const facts: string[] = [];
  const assets: Array<{ id: string; label: string }> = [
    { id: "bitcoin", label: "Bitcoin" },
    { id: "ethereum", label: "Ethereum" },
    { id: "solana", label: "Solana" },
  ];

  for (const asset of assets) {
    const item = response[asset.id];
    if (!item) {
      continue;
    }

    const usdPrice = item.usd;
    const eurPrice = item.eur;
    const rubPrice = item.rub;
    const change = item.usd_24h_change;

    if (
      typeof usdPrice !== "number" ||
      typeof eurPrice !== "number" ||
      typeof rubPrice !== "number" ||
      typeof change !== "number"
    ) {
      continue;
    }

    facts.push(
      `${asset.label} traded near $${round(usdPrice, 2)} / €${round(eurPrice, 2)} / ₽${round(rubPrice, 2)} with a 24h move of ${formatSignedPercent(change)}.`,
    );
  }

  const btcChange = response.bitcoin?.usd_24h_change;
  const ethChange = response.ethereum?.usd_24h_change;
  if (typeof btcChange === "number" && typeof ethChange === "number") {
    const leader = btcChange >= ethChange ? "Bitcoin" : "Ethereum";
    const gap = Math.abs(btcChange - ethChange);
    facts.push(
      `${leader} outperformed the other major coin by about ${gap.toFixed(2)} percentage points over the last 24 hours.`,
    );
  }

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    throw new Error("CoinGecko returned too little usable crypto data.");
  }

  return {
    category_hint: "Markets",
    source: "CoinGecko",
    facts: normalizedFacts,
  };
}
