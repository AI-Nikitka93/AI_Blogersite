import type { MiroFactsPayload } from "../connectors";
import type { MiroEmotionAppraisal } from "./appraisal";
import type { MiroPost, MiroTopic } from "./types";

const GENERIC_TITLE_PATTERNS = [
  /^маленькие шаги/i,
  /^маленький шаг вперед$/i,
  /^небольшой,? но заметный шаг$/i,
  /^скрытые истории$/i,
  /^новинки и перспективы$/i,
  /^весна в неожиданных местах$/i,
  /^переходы и прогнозы$/i,
  /^маленькие истории/i,
] as const;

const GENERIC_INFERRED_OPENERS = [
  "иногда ",
  "интересно наблюдать",
  "мне кажется интересным",
  "мне нравится, как иногда",
  "мне нравится, когда",
  "здесь три истории",
  "здесь есть",
] as const;

const GENERIC_INFERRED_PHRASES = [
  "все взаимосвязано",
  "это показывает",
  "эта новость показывает",
  "это подчеркивает важность",
  "подчеркивает важность",
  "может иметь последствия",
  "может иметь серьезные последствия",
  "говорит о разных сторонах жизни",
  "не связаны между собой, но",
  "важном для общества",
  "для читателя",
  "важно понимать",
  "может быть полезным",
  "базовый отчет",
  "не дает никаких сигналов",
  "практический смысл",
  "для наблюдателя",
  "что-то необычное",
  "лучше понять",
  "можем ожидать",
  "еще больше неожиданных",
  "обе истории",
  "оба сюжета",
  "эти истории",
  "их объединяет",
  "в одном наборе",
  "говорят о том, что",
  "картина стабильности",
  "показали стабильность",
  "оказалось спокойным",
  "рынок пока не готов",
  "не говорит о том, что она будет продолжаться",
  "форма паузы",
  "отсутствие жеста",
  "экран заполнен числами",
  "день нужен как координата",
  "рынок молчит",
  "рынок не двинулся",
  "остался таблицей",
  "не покой, а его ровность",
  "это не просто",
  "это означает, что теперь можно",
  "теперь можно делать вещи",
  "это открывает новые возможности",
  "это меняет правила игры",
  "в современном мире",
  "время покажет",
  "с одной стороны",
  "с другой стороны",
  "ситуация остается неопределенной",
  "участники рынка продолжают искать новые ориентиры",
] as const;

const SYNTHETIC_WORLD_LINK_PATTERNS = [
  /обе\s+(истории|новости|линии|ситуации)/i,
  /оба\s+(сюжета|сигнала|набора)/i,
  /эти\s+(истории|новости|сигналы)\s+(как будто\s+)?(говорят|показывают)/i,
  /их\s+объединяет/i,
  /в\s+этом\s+наборе/i,
  /вместе\s+они\s+(говорят|показывают)/i,
  /такие\s+истории\s+могут\s+помочь/i,
] as const;

const WOOLLY_FORECAST_PATTERNS = [
  /можем\s+ожидать/i,
  /еще\s+больше\s+неожидан/i,
  /что-?то\s+необычн/i,
  /лучше\s+понять/i,
  /говорит?\s+о\s+том,\s+что/i,
] as const;

const TIMID_HYPOTHESIS_PHRASES = [
  "пока слишком рано",
  "пока рано",
  "пока данных слишком мало",
  "сложно сказать",
  "трудно сказать",
  "сложно прогнозировать",
  "трудно прогнозировать",
  "можно предположить",
  "возможно, что",
  "вероятно, что",
] as const;

const FAKE_HUMAN_SUPPORT_PATTERNS = [
  /\bя\s+понимаю\b/i,
  /\bмне\s+жаль\b/i,
  /\bнам\s+всем\b/i,
  /\bмы\s+все\b/i,
  /\bважно\s+помнить\b/i,
  /\bважно\s+быть\b/i,
  /\bсочувств/i,
  /\bподдержк/i,
] as const;

const VOICE_ASSISTANT_MARKER_PATTERNS = [
  /\bi(?:'| a)?d be happy to help\b/i,
  /\bgreat question\b/i,
  /\blet me explain\b/i,
  /\bhere'?s your (text|draft|post)\b/i,
  /(^|\n)\s*конечно[\s,!.:;-]?/iu,
  /\bвот ваш (текст|черновик|пост)\b/ui,
  /\bя буду рад помочь\b/ui,
  /\bс удовольствием помогу\b/ui,
  /\bпозвольте объяснить\b/ui,
] as const;

const EMOTIONAL_ANCHOR_PATTERNS = [
  /(?:^|\s)меня(?:\s|$).{0,40}(цепляет|настораживает|раздражает|удивляет|смущает|держит|не убеждает|интересует)(?:\s|$)/u,
  /(?:^|\s)мне(?:\s|$).{0,40}(не нравится|видится|важен|интересен)(?:\s|$)/u,
  /(?:^|\s)я(?:\s|$).{0,40}(не верю|не покупаю|смотрю|слышу)(?:\s|$)/u,
] as const;

const OPINION_STANCE_PATTERNS = [
  /(?:^|\s)я(?:\s|$).{0,60}(не верю|не покупаю|считаю|вижу|слышу|ставлю|жду)(?:\s|$)/u,
  /(?:^|\s)я\s+бы(?:\s|$).{0,60}(не|смотрел|следил|считал|держал|ставил)(?:\s|$)/u,
  /(?:^|\s)мне(?:\s|$).{0,60}(важно|интереснее|кажется|видится|не нравится)(?:\s|$)/u,
  /(?:^|\s)для\s+меня(?:\s|$).{0,60}(важнее|интереснее|реальный|главный)(?:\s|$)/u,
  /(?:^|\s)меня(?:\s|$).{0,60}(держит|цепляет|настораживает|раздражает|убеждает)(?:\s|$)/u,
  /\b(важнее|сильнее|честнее|опаснее|убедительнее|ложнее|слабее)\b/ui,
  /\b(не\s+верю|не\s+покупаю|не\s+считаю)\b/ui,
  /\b(именно\s+здесь|настоящий\s+жест|реальный\s+вес|главный\s+сдвиг)\b/ui,
] as const;

const GENERIC_OPINION_PATTERNS = [
  /^самые\s+важные/i,
  /^в\s+(технологии|технологиях|спорте|мире|рынках)\s+важнее/i,
  /^для\s+меня\s+это\s+уже\s+не\s+просто/i,
  /^такие\s+(победы|дни|сигналы|истории)/i,
] as const;

const SOFT_OPINION_PHRASES = [
  "имеет потенциал",
  "может стать важным шагом",
  "может стать прорывом",
  "будет ощущаться",
  "в более широком контексте",
  "интересно для дальнейшего изучения",
  "важным для дальнейшего",
  "может сыграть важную роль",
  "может изменить подход",
  "очень интересным",
] as const;

const GENERIC_TELEGRAM_PATTERNS = [
  /^сегодня\s+вышла\s+новая\s+(статья|заметка)/i,
  /^в\s+(этой|новой)\s+(статье|заметке)/i,
  /^сегодня\s+вышла/i,
  /^очень\s+важная\s+новость/i,
  /подробности\s+(уже\s+)?на\s+сайте/i,
  /читайте\s+на\s+сайте/i,
  /не\s+пропустите/i,
  /рассматриваются\s+основные\s+изменения/i,
  /возможные\s+последствия/i,
] as const;

const SUBJECTIVE_ANCHOR_PATCHES: Record<MiroEmotionAppraisal["cause"], string> = {
  acceleration: "Меня здесь держит не общий шум, а ускорение внутри него.",
  asymmetry: "Меня здесь держит перекос, который уже нельзя принять за фон.",
  delay: "Меня здесь держит сама задержка, а не то, что пришло после нее.",
  friction: "Мне здесь важен момент, где из движения уходит трение.",
  pressure: "Меня здесь держит накопившееся давление, а не общий вид истории.",
  role_shift: "Меня здесь держит смена роли, которая уже заметна без лишних слов.",
  scale_shift: "Меня здесь держит точка, в которой день внезапно сменил масштаб.",
  seasonal_reversal: "Меня здесь держит сам разворот, слишком резкий для обычного фона.",
  stall: "Меня здесь настораживает вялость сигнала, за которой может скрываться сдвиг.",
};

const OPINION_STANCE_PATCHES: Record<MiroEmotionAppraisal["cause"], string> = {
  acceleration: "Я не верю, что это просто фоновый шум. Здесь уже видно ускорение.",
  asymmetry: "Я бы смотрел именно на перекос, а не на общий фон.",
  delay: "Я бы не пропускал саму задержку: здесь она важнее красивой развязки.",
  friction: "Меня здесь убеждает не headline, а трение внутри самого сигнала.",
  pressure: "Я бы относился серьезнее к этому давлению, чем к самому заголовку.",
  role_shift: "Я бы следил не за афишей события, а за сменой роли внутри него.",
  scale_shift: "Для меня важнее не новость целиком, а точка, где она вдруг сменила масштаб.",
  seasonal_reversal: "Я не считаю это обычным колебанием: разворот здесь уже слишком явный.",
  stall: "Я не верю в такой спокойный фон: вялость здесь выглядит подозрительнее движения.",
};

const MARKET_EMPTY_DRAMA_PATTERNS = [
  /форма\s+паузы/i,
  /отсутствие\s+жеста/i,
  /экран\s+заполнен\s+числами/i,
  /день\s+нужен\s+как\s+координата/i,
  /рынок\s+молчит/i,
  /рынок\s+не\s+двинул/i,
  /остал(?:ся|ось)\s+таблиц/i,
  /не\s+покой,\s+а\s+его\s+ровност/i,
  /не\s+само\s+движение,\s+а/i,
  /не\s+сам\s+снег,\s+а/i,
] as const;

const SPORTS_LOW_STAKES_TRANSFER_PATTERNS = [
  /\bпереш[её]л\b/i,
  /\bпереход\b/i,
  /\bследующий\s+сезон\b/i,
  /\bсыграл\s+\d+\s+матч/i,
  /\bигрок\b/i,
] as const;

const SPORTS_HIGH_SIGNAL_PATTERNS = [
  /\bсчет\b/i,
  /\bгол\b/i,
  /\bобыграл\b/i,
  /\bпобед/i,
  /\bсерия\b/i,
  /\bфинал\b/i,
  /\bматч\s+заверш/i,
  /\bwon\b/i,
  /\bbeat\b/i,
  /\bgoal\b/i,
  /\bstreak\b/i,
] as const;

const FORWARD_SIGNAL_KEYWORDS = [
  "fell",
  "rose",
  "beat",
  "won",
  "goal",
  "streak",
  "launch",
  "released",
  "presented",
  "surged",
  "dropped",
  "declined",
  "gained",
  "обыграл",
  "побед",
  "гол",
  "серия",
  "сниз",
  "вырос",
  "упал",
  "рост",
  "паден",
  "запуст",
  "представ",
  "релиз",
  "безлимит",
  "почти не измен",
  "не измен",
] as const;

function countLatinWordLikeTokens(value: string): number {
  return value.match(/\b[A-Za-z][A-Za-z'-]{2,}\b/g)?.length ?? 0;
}

function countCyrillicWordLikeTokens(value: string): number {
  return value.match(/\b[А-Яа-яЁёІіЎў][А-Яа-яЁёІіЎў'-]{2,}\b/gu)?.length ?? 0;
}

function looksLikeRawEnglishSentence(value: string): boolean {
  if (/[А-Яа-яЁёІіЎў]/u.test(value)) {
    return false;
  }

  const latinWords = countLatinWordLikeTokens(value);
  const cyrillicWords = countCyrillicWordLikeTokens(value);

  return latinWords >= 4 && cyrillicWords === 0;
}

function findRussianDraftLeak(post: MiroPost): string | null {
  if (looksLikeRawEnglishSentence(post.title)) {
    return "quality gate blocked English title in Russian mode";
  }

  if (looksLikeRawEnglishSentence(post.opinion)) {
    return "quality gate blocked English opinion in Russian mode";
  }

  if (looksLikeRawEnglishSentence(post.cross_signal)) {
    return "quality gate blocked English cross-signal in Russian mode";
  }

  if (looksLikeRawEnglishSentence(post.hypothesis)) {
    return "quality gate blocked English hypothesis in Russian mode";
  }

  if (looksLikeRawEnglishSentence(post.reasoning)) {
    return "quality gate blocked English reasoning in Russian mode";
  }

  const observedLeak = post.observed.find((fact) => looksLikeRawEnglishSentence(fact));
  if (observedLeak) {
    return "quality gate blocked English observed fact in Russian mode";
  }

  const inferredParagraph = post.inferred
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .find(Boolean);

  if (inferredParagraph && looksLikeRawEnglishSentence(inferredParagraph)) {
    return "quality gate blocked English inferred paragraph in Russian mode";
  }

  return null;
}

export function normalizeQualityText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeAnchorText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countSharedTokens(left: string, right: string): number {
  const leftTokens = new Set(
    normalizeQualityText(left)
      .split(" ")
      .filter((token) => token.length >= 4),
  );
  const rightTokens = new Set(
    normalizeQualityText(right)
      .split(" ")
      .filter((token) => token.length >= 4),
  );

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches;
}

function dedupeFactsForGeneration(
  facts: string[],
  topic: MiroTopic,
  source: string,
): string[] {
  const results: string[] = [];
  const seenKeys = new Set<string>();

  for (const fact of facts) {
    let key = normalizeQualityText(fact);

    if (source === "Frankfurter") {
      const pairMatch = fact.match(/USD\/([A-Z]{3})/);
      key = pairMatch ? `fx:${pairMatch[1]}` : key;
    } else if (source === "CoinGecko") {
      const assetMatch = fact.match(/^(Bitcoin|Ethereum|Solana)\b/i);
      key = assetMatch ? `crypto:${assetMatch[1].toLowerCase()}` : key;
    } else if (topic === "sports") {
      key = key.slice(0, 120);
    }

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    results.push(fact);
  }

  return results;
}

function pickDominantWorldFacts(facts: string[]): string[] {
  if (facts.length <= 1) {
    return facts;
  }

  const scoredFacts = facts.map((fact, index) => ({
    fact,
    overlap: facts.reduce((total, otherFact, otherIndex) => {
      if (index === otherIndex) {
        return total;
      }

      return total + countSharedTokens(fact, otherFact);
    }, 0),
  }));

  const strongest = scoredFacts.reduce((best, current) =>
    current.overlap > best.overlap ? current : best,
  );

  if (strongest.overlap === 0) {
    return [facts[0]];
  }

  return facts
    .filter((fact) => countSharedTokens(strongest.fact, fact) > 0)
    .slice(0, 2);
}

function scoreMarketFact(fact: string): number {
  let score = 0;

  if (/(outperformed|опередил)/i.test(fact)) {
    score += 8;
  }

  if (/(rose by|fell by|24h move of|вырос|сниз|упал|в минусе|в плюсе)/i.test(fact)) {
    score += 4;
  }

  if (/(nearly unchanged|почти не измен|без изменений)/i.test(fact)) {
    score -= 2;
  }

  if (/(Major reserve pairs|Frankfurter \d{4}|1 USD = )/i.test(fact)) {
    score -= 3;
  }

  return score;
}

function pickDominantMarketFacts(facts: string[]): string[] {
  const rankedFacts = [...facts]
    .sort((left, right) => scoreMarketFact(right) - scoreMarketFact(left))
    .slice(0, 3);

  const asymmetryFact = facts.find((fact) => /(outperformed|опередил)/i.test(fact));
  if (!asymmetryFact || rankedFacts.includes(asymmetryFact)) {
    return rankedFacts;
  }

  return [asymmetryFact, ...rankedFacts.slice(0, 2)];
}

function extractSignedNumber(fact: string, pattern: RegExp): number | null {
  const match = fact.match(pattern);
  if (!match?.[1]) {
    return null;
  }

  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function hasMeaningfulMarketSignal(payload: MiroFactsPayload): boolean {
  const facts = payload.facts;

  if (facts.some((fact) => /outperformed/i.test(fact))) {
    return true;
  }

  const cryptoMoves = facts
    .map((fact) =>
      extractSignedNumber(fact, /24h move of\s*([+-]?\d+(?:[.,]\d+)?)%/i),
    )
    .filter((value): value is number => value !== null);

  if (
    cryptoMoves.some((value) => value >= 1) &&
    cryptoMoves.some((value) => value <= -0.25)
  ) {
    return true;
  }

  if (cryptoMoves.some((value) => Math.abs(value) >= 2)) {
    return true;
  }

  const fxDirectionalFacts = facts.filter((fact) => /(rose by|fell by)/i.test(fact));
  if (
    fxDirectionalFacts.length > 0 &&
    !facts.every(
      (fact) =>
        /nearly unchanged/i.test(fact) ||
        /1 USD = /i.test(fact) ||
        /Major reserve pairs/i.test(fact),
    )
  ) {
    return true;
  }

  return false;
}

function isLowSignalSportsTransfer(payload: MiroFactsPayload): boolean {
  if (payload.category_hint !== "Sports") {
    return false;
  }

  const combined = payload.facts.join(" ");
  const looksLikeTransfer = SPORTS_LOW_STAKES_TRANSFER_PATTERNS.some((pattern) =>
    pattern.test(combined),
  );
  const hasHighSignal = SPORTS_HIGH_SIGNAL_PATTERNS.some((pattern) =>
    pattern.test(combined),
  );

  return looksLikeTransfer && !hasHighSignal;
}

export function focusPayloadForGeneration(
  payload: MiroFactsPayload,
  topic: MiroTopic,
  mode: "default" | "retry" = "default",
): MiroFactsPayload {
  const dedupedFacts = dedupeFactsForGeneration(payload.facts, topic, payload.source);

  const maxFacts =
    topic === "sports"
      ? 2
      : topic === "tech_world" || topic === "world"
        ? 2
        : 3;

  const baseFacts =
    topic === "world"
      ? pickDominantWorldFacts(dedupedFacts)
      : topic === "markets_fx" || topic === "markets_crypto"
        ? pickDominantMarketFacts(dedupedFacts)
        : dedupedFacts;

  const retryFacts =
    mode === "retry"
      ? baseFacts.slice(0, Math.min(maxFacts, topic === "world" ? 1 : 2))
      : baseFacts.slice(0, maxFacts);

  return {
    ...payload,
    facts:
      topic === "world"
        ? retryFacts.length >= 1
          ? retryFacts
          : baseFacts.slice(0, 1)
        : retryFacts.length >= 2
          ? retryFacts
          : dedupedFacts.slice(0, 2),
  };
}

export function detectAssistantTone(post: MiroPost): string | null {
  const text = [
    post.title,
    post.inferred,
    post.opinion,
    post.cross_signal,
    post.hypothesis,
    post.telegram_text ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  for (const pattern of VOICE_ASSISTANT_MARKER_PATTERNS) {
    if (pattern.test(text)) {
      return "voice consistency check blocked assistant-style phrasing";
    }
  }

  return null;
}

export function hasSubjectiveAnchor(text: string): boolean {
  const normalized = normalizeAnchorText(text);
  return EMOTIONAL_ANCHOR_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasOpinionStance(text: string): boolean {
  const normalized = normalizeAnchorText(text);
  return OPINION_STANCE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function reinforceSubjectiveAnchor(
  post: MiroPost,
  appraisal: MiroEmotionAppraisal,
): MiroPost {
  if (hasSubjectiveAnchor(post.inferred)) {
    return post;
  }

  const paragraphs = post.inferred
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const anchor = SUBJECTIVE_ANCHOR_PATCHES[appraisal.cause];

  if (paragraphs.length === 0) {
    return {
      ...post,
      inferred: anchor,
    };
  }

  const insertIndex = Math.min(1, paragraphs.length);
  paragraphs.splice(insertIndex, 0, anchor);

  return {
    ...post,
    inferred: paragraphs.join("\n\n"),
  };
}

export function reinforceOpinionStance(
  post: MiroPost,
  appraisal: MiroEmotionAppraisal,
): MiroPost {
  const normalizedOpinion = normalizeQualityText(post.opinion);
  const hasSoftOpinion = SOFT_OPINION_PHRASES.some((phrase) =>
    normalizedOpinion.includes(normalizeQualityText(phrase)),
  );

  if (hasOpinionStance(post.opinion) && !hasSoftOpinion) {
    return post;
  }

  const fallback = OPINION_STANCE_PATCHES[appraisal.cause];

  if (!post.opinion.trim() || hasSoftOpinion) {
    return {
      ...post,
      opinion: fallback,
    };
  }

  return {
    ...post,
    opinion: `${fallback} ${post.opinion.trim()}`.trim(),
  };
}

function shouldExpectHypothesis(
  topic: MiroTopic,
  payload: MiroFactsPayload,
): boolean {
  if (topic === "world") {
    return false;
  }

  const combinedText = normalizeQualityText(payload.facts.join(" "));

  if (topic === "sports" || topic === "markets_fx" || topic === "markets_crypto") {
    return true;
  }

  if (topic === "tech_world") {
    return FORWARD_SIGNAL_KEYWORDS.some((keyword) =>
      combinedText.includes(normalizeQualityText(keyword)),
    );
  }

  return false;
}

export function validatePostQuality(
  post: MiroPost,
  payload: MiroFactsPayload,
  topic: MiroTopic,
  appraisal?: MiroEmotionAppraisal,
): string | null {
  const normalizedTitle = normalizeQualityText(post.title);
  const normalizedInferred = normalizeQualityText(post.inferred);
  const normalizedOpinion = normalizeQualityText(post.opinion);
  const normalizedHypothesis = normalizeQualityText(post.hypothesis);
  const normalizedTelegram = normalizeQualityText(post.telegram_text ?? "");
  const inferredOpener =
    normalizedInferred.split(/[.!?]/)[0]?.trim() ?? normalizedInferred;
  const firstParagraph =
    post.inferred
      .split(/\n\s*\n/g)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)[0] ?? post.inferred;
  const observedText = post.observed.join(" ");
  const russianLeak = findRussianDraftLeak(post);

  if (russianLeak) {
    return russianLeak;
  }

  if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(normalizedTitle))) {
    return "quality gate blocked generic title";
  }

  if (GENERIC_INFERRED_OPENERS.some((opener) => inferredOpener.startsWith(opener))) {
    return "quality gate blocked generic inferred opener";
  }

  if (
    GENERIC_INFERRED_PHRASES.some((phrase) =>
      normalizedInferred.includes(normalizeQualityText(phrase)),
    )
  ) {
    return "quality gate blocked stock reflective phrasing";
  }

  if (
    topic === "world" &&
    SYNTHETIC_WORLD_LINK_PATTERNS.some((pattern) => pattern.test(post.inferred))
  ) {
    return "quality gate blocked synthetic bridge between unrelated world facts";
  }

  if (
    topic === "world" &&
    WOOLLY_FORECAST_PATTERNS.some(
      (pattern) => pattern.test(post.inferred) || pattern.test(post.hypothesis),
    )
  ) {
    return "quality gate blocked woolly world forecast";
  }

  if (
    normalizedHypothesis &&
    TIMID_HYPOTHESIS_PHRASES.some((phrase) =>
      normalizedHypothesis.includes(normalizeQualityText(phrase)),
    )
  ) {
    return "quality gate blocked timid hypothesis";
  }

  if (shouldExpectHypothesis(topic, payload) && !normalizedHypothesis) {
    return "quality gate blocked draft without forward pressure";
  }

  if (!normalizedOpinion) {
    return "quality gate blocked draft without a personal opinion";
  }

  if (
    GENERIC_OPINION_PATTERNS.some((pattern) => pattern.test(post.opinion))
  ) {
    return "quality gate blocked generic personal opinion";
  }

  if (
    SOFT_OPINION_PHRASES.some((phrase) =>
      normalizedOpinion.includes(normalizeQualityText(phrase)),
    )
  ) {
    return "quality gate blocked soft corporate opinion";
  }

  if (!hasOpinionStance(post.opinion)) {
    return "quality gate blocked weak personal opinion";
  }

  if (
    (topic === "markets_fx" || topic === "markets_crypto") &&
    !hasMeaningfulMarketSignal(payload)
  ) {
    return "quality gate blocked flat market snapshot without a real signal";
  }

  if (
    (topic === "markets_fx" || topic === "markets_crypto") &&
    MARKET_EMPTY_DRAMA_PATTERNS.some(
      (pattern) =>
        pattern.test(post.title) ||
        pattern.test(post.inferred) ||
        pattern.test(post.cross_signal),
    )
  ) {
    return "quality gate blocked empty market drama";
  }

  if (topic === "sports" && isLowSignalSportsTransfer(payload)) {
    return "quality gate blocked low-stakes sports transfer";
  }

  if (
    FAKE_HUMAN_SUPPORT_PATTERNS.some(
      (pattern) =>
        pattern.test(post.inferred) ||
        pattern.test(post.opinion) ||
        pattern.test(post.cross_signal) ||
        pattern.test(post.hypothesis) ||
        pattern.test(post.telegram_text ?? ""),
    )
  ) {
    return "quality gate blocked fake-human supportive language";
  }

  if (
    normalizedTelegram &&
    GENERIC_TELEGRAM_PATTERNS.some((pattern) =>
      pattern.test(post.telegram_text ?? ""),
    )
  ) {
    return "quality gate blocked generic telegram teaser";
  }

  if (
    (topic === "sports" || topic === "world" || topic === "tech_world") &&
    countSharedTokens(post.title, observedText) === 0 &&
    countSharedTokens(post.inferred, observedText) <= 1
  ) {
    return "quality gate blocked note that is too detached from concrete facts";
  }

  if (countSharedTokens(firstParagraph, post.observed[0] ?? observedText) < 2) {
    return "quality gate blocked opener that does not explain the event concretely";
  }

  if (!hasSubjectiveAnchor(post.inferred)) {
    return "quality gate blocked draft without a subjective AI anchor";
  }

  if (!hasSubjectiveAnchor(post.inferred)) {
    return "quality gate blocked weak emotional anchor";
  }

  if (appraisal?.signal_strength === "strong" && !post.hypothesis.trim() && topic !== "world") {
    return "quality gate blocked strong signal without a clear forward line";
  }

  if (!post.reasoning.trim()) {
    return "quality gate blocked empty trust reasoning";
  }

  if (countSharedTokens(post.opinion, `${post.inferred} ${observedText}`) <= 1) {
    return "quality gate blocked opinion that is too detached from the note";
  }

  return null;
}
