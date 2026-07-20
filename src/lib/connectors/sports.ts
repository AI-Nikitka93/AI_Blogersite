import { MIRO_RSS_FEED_PRESETS } from "./presets";
import { fetchRssFacts } from "./rss";
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

interface NhlLocalizedText {
  default?: string | null;
}

interface NhlTeamSummary {
  abbrev?: string | null;
  name?: NhlLocalizedText | null;
  score?: number | null;
  sog?: number | null;
}

interface NhlSeriesStatus {
  seriesTitle?: string | null;
  gameNumberOfSeries?: number | null;
}

interface NhlGameSummary {
  id?: number | null;
  gameDate?: string | null;
  startTimeUTC?: string | null;
  gameState?: string | null;
  homeTeam?: NhlTeamSummary | null;
  awayTeam?: NhlTeamSummary | null;
  venue?: NhlLocalizedText | null;
  seriesStatus?: NhlSeriesStatus | null;
}

interface NhlScoreResponse {
  currentDate?: string | null;
  games?: NhlGameSummary[] | null;
}

const SOCCER365_BASE = "https://soccer365.ru";
const THE_SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const NHL_SCORE_API_URL = "https://api-web.nhle.com/v1/score/now";
const NHL_SCORE_PAGE_BASE = "https://www.nhl.com/scores";

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

function readNhlTeamName(team: NhlTeamSummary | null | undefined): string {
  return team?.name?.default?.trim() || team?.abbrev?.trim() || "";
}

function readNhlScore(team: NhlTeamSummary | null | undefined): number | null {
  return typeof team?.score === "number" && Number.isFinite(team.score)
    ? team.score
    : null;
}

function chooseNhlGame(games: readonly NhlGameSummary[]): NhlGameSummary | null {
  return (
    games.find((game) => game.gameState === "LIVE") ??
    games.find(
      (game) => game.gameState === "FINAL" || game.gameState === "OFF",
    ) ??
    games.find((game) => Boolean(game.homeTeam && game.awayTeam)) ??
    null
  );
}

function describeNhlGameState(gameState: string | null | undefined): string {
  if (gameState === "LIVE") {
    return "идет";
  }

  if (gameState === "FINAL" || gameState === "OFF") {
    return "завершен";
  }

  return "запланирован";
}

export async function fetchNhlScoreFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const response = await fetchJson<NhlScoreResponse>(
    NHL_SCORE_API_URL,
    {
      headers: {
        Accept: "application/json",
      },
    },
    {
      timeoutMs: requestTimeoutMs,
      budgetMs: Math.max(requestTimeoutMs, 2_200),
      label: "NHL Scoreboard",
      circuitKey: "connector:nhl:score",
      retry: {
        maxRetries: 1,
        retryOn: ["timeout", "network", "status:503", "status:504"],
        baseDelayMs: 120,
        maxDelayMs: 220,
        jitterMs: 80,
      },
    },
  );
  const game = chooseNhlGame(response.games ?? []);
  if (!game?.homeTeam || !game.awayTeam) {
    throw new Error("NHL Scoreboard returned no usable games.");
  }

  const homeTeam = readNhlTeamName(game.homeTeam);
  const awayTeam = readNhlTeamName(game.awayTeam);
  if (!homeTeam || !awayTeam) {
    throw new Error("NHL Scoreboard returned a game without team names.");
  }

  const homeScore = readNhlScore(game.homeTeam);
  const awayScore = readNhlScore(game.awayTeam);
  const hasScore = homeScore !== null && awayScore !== null;
  const gameDate =
    game.gameDate ??
    response.currentDate ??
    new Date().toISOString().slice(0, 10);
  const sourceUrl = `${NHL_SCORE_PAGE_BASE}/${gameDate}`;
  const state = describeNhlGameState(game.gameState);
  const matchup = `${awayTeam} — ${homeTeam}`;
  const scoreLabel = hasScore ? `, счет ${awayScore}-${homeScore}` : "";
  const series = game.seriesStatus?.seriesTitle
    ? `${game.seriesStatus.seriesTitle}${
        game.seriesStatus.gameNumberOfSeries
          ? `, матч ${game.seriesStatus.gameNumberOfSeries}`
          : ""
      }`
    : "NHL";
  const venue = game.venue?.default?.trim();
  const facts = uniqueFacts(
    [
      `${series}: матч ${matchup} ${state}${scoreLabel}.`,
      venue ? `Игра проходит на арене ${venue}.` : "",
      game.startTimeUTC
        ? `Время начала матча по данным NHL: ${game.startTimeUTC}.`
        : "",
      hasScore
        ? `Табло NHL показывает ${awayTeam} ${awayScore} и ${homeTeam} ${homeScore}.`
        : "",
    ],
    4,
  );

  if (facts.length < 2) {
    throw new Error("NHL Scoreboard returned too few usable facts.");
  }

  return {
    category_hint: "Sports",
    source: "NHL Scoreboard",
    source_url: sourceUrl,
    source_published_at: gameDate,
    event_date: gameDate,
    corroborating_sources: [
      {
        source: "NHL Scoreboard",
        url: sourceUrl,
        title: `${series}: ${matchup}`,
        published_at: gameDate,
      },
    ],
    facts,
  };
}

export function fetchMlbNewsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const preset = MIRO_RSS_FEED_PRESETS.mlbNews;
  return fetchRssFacts(preset.url, {
    sourceName: preset.source,
    categoryHint: preset.category_hint,
    excludedKeywords: preset.excludedKeywords
      ? [...preset.excludedKeywords]
      : undefined,
    maxItems: 5,
    requestTimeoutMs: options.requestTimeoutMs,
  });
}

export async function fetchSportsFacts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
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
        Math.min(12_000, targetBudget - 180),
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
        Math.min(12_000, eventBudget - 120),
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
        const normalizedFacts = uniqueFacts(facts, 4);
        return {
          category_hint: "Sports",
          source: "TheSportsDB",
          source_url: eventsUrl,
          source_published_at: event.dateEvent ?? undefined,
          event_date: event.dateEvent ?? undefined,
          corroborating_sources: [
            {
              source: "TheSportsDB",
              url: eventsUrl,
              published_at: event.dateEvent ?? undefined,
            },
          ],
          facts: normalizedFacts,
        };
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
    source_url: `${THE_SPORTS_DB_BASE}/eventspastleague.php`,
    facts: normalizedFacts,
  };
}

export async function fetchSoccer365Facts(
  options: ConnectorRuntimeOptions = {},
): Promise<MiroFactsPayload> {
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const startedAt = Date.now();
  const facts: string[] = [];

  const onlinePage = await fetchText(
    `${SOCCER365_BASE}/online/`,
    {},
    {
      timeoutMs: Math.min(requestTimeoutMs, 12_000),
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
      timeoutMs: Math.min(remainingBudget, 12_000),
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
    source_url: `${SOCCER365_BASE}/online/`,
    source_published_at: new Date().toISOString(),
    event_date: new Date().toISOString().slice(0, 10),
    corroborating_sources: [
      {
        source: "Soccer365",
        url: `${SOCCER365_BASE}/online/`,
        published_at: new Date().toISOString(),
      },
    ],
    facts: normalizedFacts,
  };
}
