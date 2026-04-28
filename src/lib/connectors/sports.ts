import { decodeHtmlEntities, fetchJson, fetchText, stripHtml, uniqueFacts } from "./shared";
import type { ConnectorRuntimeOptions, MiroFactsPayload } from "./types";

interface TheSportsDbLeague {
  idLeague?: string;
  strLeague?: string;
}

interface TheSportsDbLeaguesResponse {
  countrys?: TheSportsDbLeague[] | null;
}

interface TheSportsDbEvent {
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  dateEvent?: string | null;
  strLeague?: string | null;
}

interface TheSportsDbEventsResponse {
  events?: TheSportsDbEvent[] | null;
}

const SOCCER365_BASE = "https://soccer365.ru";
const THE_SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

const SPORTS_TARGETS = [
  { country: "Russia", sport: "Soccer" },
  { country: "Belarus", sport: "Soccer" },
  { country: "Russia", sport: "Ice Hockey" },
  { country: "Belarus", sport: "Ice Hockey" },
] as const;

const SPORTS_FETCH_MIN_BUDGET_MS = 450;

function remainingSportsBudget(
  startedAt: number,
  totalBudgetMs: number,
): number {
  return totalBudgetMs - (Date.now() - startedAt);
}

function normalizeSoccer365Text(value: string): string {
  return stripHtml(decodeHtmlEntities(value)).replace(/\s+/g, " ").trim();
}

function parseSoccer365OnlineFacts(html: string): string[] {
  const facts: string[] = [];
  const blocks = html
    .split(/<div id="gm\d+" class="game_block"[^>]*>/g)
    .slice(1, 12);

  for (const block of blocks) {
    const status = normalizeSoccer365Text(
      block.match(/<div class="status"><span class="size10">([\s\S]*?)<\/span><\/div>/i)?.[1] ??
        "",
    );
    const homeTeam = normalizeSoccer365Text(
      block.match(/<div class="ht">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "",
    );
    const awayTeam = normalizeSoccer365Text(
      block.match(/<div class="at">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "",
    );
    const competition = normalizeSoccer365Text(
      block.match(/<div class="cmp">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "",
    );
    const stage = normalizeSoccer365Text(
      block.match(/<div class="stage">([\s\S]*?)<\/div>/i)?.[1] ?? "",
    );
    const scoreMatches = [...block.matchAll(/<div class="gls">([^<]*)<\/div>/gi)]
      .map((match) => normalizeSoccer365Text(match[1] ?? ""))
      .filter(Boolean);
    const [homeScore, awayScore] = scoreMatches;
    const competitionLabel = competition || stage || "Soccer365";

    if (!status || !homeTeam || !awayTeam || !homeScore || !awayScore) {
      continue;
    }

    if (status === "Завершен") {
      facts.push(
        `${competitionLabel}: ${homeTeam} сыграл с ${awayTeam}, матч завершился со счетом ${homeScore}:${awayScore}.`,
      );
    } else {
      facts.push(
        `${competitionLabel}: в матче ${homeTeam} — ${awayTeam} счет ${homeScore}:${awayScore}, статус — ${status}.`,
      );
    }

    if (facts.length >= 3) {
      break;
    }
  }

  return facts;
}

function parseSoccer365PreviewFacts(html: string): string[] {
  const facts: string[] = [];
  const previewRegex = /<a[^>]+href="\/news\/\d+\/"[^>]*>([\s\S]*?превью[\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(previewRegex)) {
    const title = normalizeSoccer365Text(match[1] ?? "");
    if (!title || !/превью/i.test(title)) {
      continue;
    }

    facts.push(`Soccer365 вынес в превью матч: ${title}.`);
    if (facts.length >= 2) {
      break;
    }
  }

  return facts;
}

function parseNumericScore(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function determineWinner(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): string {
  if (homeScore > awayScore) {
    return `${homeTeam} won`;
  }

  if (awayScore > homeScore) {
    return `${awayTeam} won`;
  }

  return "The match ended in a draw";
}

export async function fetchSportsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 2_400;
  const startedAt = Date.now();
  const facts: string[] = [];
  const errors: string[] = [];

  for (const target of SPORTS_TARGETS) {
    const targetBudget = remainingSportsBudget(startedAt, requestTimeoutMs);
    if (targetBudget < SPORTS_FETCH_MIN_BUDGET_MS) {
      errors.push(`budget exhausted before ${target.country} ${target.sport}`);
      break;
    }

    try {
      const leaguesTimeoutMs = Math.max(
        SPORTS_FETCH_MIN_BUDGET_MS,
        Math.min(900, targetBudget - 180),
      );
      const leaguesUrl =
        `${THE_SPORTS_DB_BASE}/search_all_leagues.php?` +
        new URLSearchParams({
          c: target.country,
          s: target.sport,
        }).toString();

      const leaguesResponse = await fetchJson<TheSportsDbLeaguesResponse>(
        leaguesUrl,
        {},
        {
          timeoutMs: leaguesTimeoutMs,
          budgetMs: leaguesTimeoutMs,
          label: `TheSportsDB leagues ${target.country} ${target.sport}`,
          circuitKey: "connector:thesportsdb:search_all_leagues",
          retry: false,
        },
      );

      const league = leaguesResponse.countrys?.find((item) => item.idLeague);
      if (!league?.idLeague) {
        continue;
      }

      const eventBudget = remainingSportsBudget(startedAt, requestTimeoutMs);
      if (eventBudget < SPORTS_FETCH_MIN_BUDGET_MS) {
        errors.push(
          `budget exhausted before loading league events for ${target.country} ${target.sport}`,
        );
        break;
      }

      const eventsTimeoutMs = Math.max(
        SPORTS_FETCH_MIN_BUDGET_MS,
        Math.min(900, eventBudget - 120),
      );

      const eventsUrl =
        `${THE_SPORTS_DB_BASE}/eventspastleague.php?` +
        new URLSearchParams({ id: league.idLeague }).toString();

      const eventsResponse = await fetchJson<TheSportsDbEventsResponse>(
        eventsUrl,
        {},
        {
          timeoutMs: eventsTimeoutMs,
          budgetMs: eventsTimeoutMs,
          label: `TheSportsDB events ${target.country} ${target.sport}`,
          circuitKey: "connector:thesportsdb:eventspastleague",
          retry: false,
        },
      );
      const event = eventsResponse.events?.find((item) => {
        const homeScore = parseNumericScore(item.intHomeScore);
        const awayScore = parseNumericScore(item.intAwayScore);
        return (
          Boolean(item.strHomeTeam) &&
          Boolean(item.strAwayTeam) &&
          homeScore !== null &&
          awayScore !== null
        );
      });

      if (!event?.strHomeTeam || !event.strAwayTeam) {
        continue;
      }

      const homeScore = parseNumericScore(event.intHomeScore);
      const awayScore = parseNumericScore(event.intAwayScore);
      if (homeScore === null || awayScore === null) {
        continue;
      }

      const winner = determineWinner(
        event.strHomeTeam,
        event.strAwayTeam,
        homeScore,
        awayScore,
      );

      facts.push(
        `${target.country} ${target.sport}: ${event.strHomeTeam} played ${event.strAwayTeam} and the score was ${homeScore}-${awayScore}.`,
      );
      facts.push(
        `${event.strLeague ?? league.strLeague ?? `${target.country} ${target.sport}`} on ${event.dateEvent ?? "unknown date"}: ${winner}.`,
      );

      if (facts.length >= 4) {
        break;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      errors.push(`${target.country} ${target.sport}: ${reason}`);
    }
  }

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    const details = errors.length
      ? ` TheSportsDB errors: ${errors.join(" | ")}`
      : "";
    throw new Error(`Unable to collect enough sports facts from TheSportsDB.${details}`);
  }

  return {
    category_hint: "Sports",
    source: "TheSportsDB",
    facts: normalizedFacts,
  };
}

export async function fetchSoccer365Facts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 2_800;
  const startedAt = Date.now();
  const facts: string[] = [];

  const onlinePage = await fetchText(
    `${SOCCER365_BASE}/online/`,
    {},
    {
      timeoutMs: Math.min(requestTimeoutMs, 1_600),
      budgetMs: requestTimeoutMs,
      label: "Soccer365 online",
      circuitKey: "connector:soccer365:online",
      retry: false,
    },
  );
  facts.push(...parseSoccer365OnlineFacts(onlinePage.body));

  if (facts.length < 2) {
    const remainingBudget = remainingSportsBudget(startedAt, requestTimeoutMs);
    if (remainingBudget < SPORTS_FETCH_MIN_BUDGET_MS) {
      throw new Error("Soccer365 budget exhausted before preview fallback.");
    }

    const homePage = await fetchText(`${SOCCER365_BASE}/`, {}, {
      timeoutMs: Math.min(remainingBudget, 1_200),
      budgetMs: remainingBudget,
      label: "Soccer365 home",
      circuitKey: "connector:soccer365:home",
      retry: false,
    });
    facts.push(...parseSoccer365PreviewFacts(homePage.body));
  }

  const normalizedFacts = uniqueFacts(facts, 4);
  if (normalizedFacts.length < 2) {
    throw new Error("Soccer365 returned too few usable sports facts.");
  }

  return {
    category_hint: "Sports",
    source: "Soccer365",
    facts: normalizedFacts,
  };
}
