import type { MiroFactsPayload } from "../connectors";
import {
  getPublicPostCopyBlockReason,
  isLikelyTruncatedTitlePrefix,
} from "../public-post-quality";
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
  /^техдень\s+сдвинулся/i,
  /^мир\s+сдвинулся/i,
  /^спорт\s+сдвинулся/i,
  /^крипта\s+двинулась\s+выборочно/i,
  /^валюты\s+пошли\s+вразнобой/i,
] as const;

const PUBLIC_TEMPLATE_LEAK_PATTERNS = [
  /\bfallback\b/iu,
  /\bworld-(?:сигнал|сдвиг)/iu,
  /\bPR-шум\b/iu,
] as const;

const FALLBACK_BOILERPLATE_PATTERNS = [
  /материал\s+не\s+делает\s+прогноз\s+сильнее\s+исходных\s+данных/iu,
  /поэтому\s+текст\s+держится\s+на\s+двух\s+вещах/iu,
  /источник\s+материала\s+—/iu,
  /следующая\s+проверка\s+находится\s+в\s+повторяемости/iu,
  /спортивная\s+новость\s+сама\s+по\s+себе\s+редко\s+держит\s+статью/iu,
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

const WORLD_LOCAL_NOISE_PATTERNS = [
  /\bдевочк/i,
  /\bмальчик/i,
  /\bреб[её]н/i,
  /\bсемь[яеи]\b/i,
  /\bгулял/i,
  /\bгуляла/i,
  /\bнашли\b/i,
  /\bизъял/i,
  /\bполиц/i,
  /\bдтп\b/i,
  /\bавар/i,
  /\bкримин/i,
  /\bубийств/i,
  /\bпожар/i,
  /\bпогод/i,
  /\bдожд/i,
  /\bснег/i,
  /\bдвор/i,
  /\bулиц/i,
  /\bгород(е|у|ом)?\b/i,
  /\blocal\b/i,
  /\bmissing\b/i,
  /\bchild\b/i,
  /\bfamily\b/i,
  /\bpolice\b/i,
  /\baccident\b/i,
  /\bweather\b/i,
  /\bcity\b/i,
] as const;

const WORLD_TENSION_MARKER_PATTERNS = [
  /\bсдвиг/i,
  /\bразворот/i,
  /\bперекос/i,
  /\bаномал/i,
  /\bрекорд/i,
  /\bмассов/i,
  /\bсистемн/i,
  /\bинфраструктур/i,
  /\bсбой\b/i,
  /\bраскол/i,
  /\bконтинент/i,
  /\bгеолог/i,
  /\bкосмическ/i,
  /\bмедицин/i,
  /\bпрорыв/i,
  /\bвпервые\b/i,
  /\bстолет/i,
  /\bдвухсот/i,
  /\bдефицит/i,
  /\bдавлен/i,
  /\bускорен/i,
  /\bобруш/i,
  /\bbreakthrough\b/i,
  /\brecord\b/i,
  /\banomal/i,
  /\bsystemic\b/i,
  /\binfrastructure\b/i,
  /\bshift\b/i,
  /\breversal\b/i,
  /\boutage\b/i,
  /\bshortage\b/i,
  /\bsurge\b/i,
] as const;

const WORLD_WEAK_SIGNAL_PATTERNS = [
  /не\s+большая\s+мировая\s+драма/i,
  /тих(ая|ие|ий)\s+миров/i,
  /без\s+сильной\s+эскалац/i,
  /слишком\s+бытов/i,
  /меня[ею]т?\s+фон\s+без\s+истерик/i,
  /обычн(?:ый|ая)\s+дневн/i,
  /\bбытов/i,
] as const;

const FINANCIAL_ADVICE_PATTERNS = [
  /купить|покупать|покупку|продать|шортить|лонговать|усредняться|фиксировать\s+прибыль|стоп-лосс|тейк-профит|точк[аи]\s+входа|сигнал\s+на\s+(?:покупку|продажу)/iu,
  /\b(short|long|buy|sell|entry point|stop loss|take profit|price target|financial advice)\b/iu,
  /(?:держать|открывать|закрывать|увеличение|сокращение|сократить|увеличить)\s+(?:позици[юи]|дол[юи]|сделк[уи]|ставк[уи])/iu,
  /коротк(?:ая|ую|ие|их|ой)\s+(?:позици|ставк|продаж)/iu,
  /(?:инвестиц|инвестор|трейдер|торгов[а-я]*\s+возможност|стоит\s+рассмотреть)/iu,
  /инвестир\w*/iu,
  /возможност[ьи]\s+для\s+вход/iu,
  /переоценк\w*\s+(?:портфел|позиц|капитал)/iu,
  /переориентировк\w*\s+(?:портфел|позиц|капитал)/iu,
  /сигнал\s+к\s+(?:переоценк|переориентировк)/iu,
  /стоит\s+обратить\s+внимани/iu,
  /наблюдайте\s+за/iu,
] as const;

const SPORTS_BETTING_ADVICE_PATTERNS = [
  /я\s+ставлю/iu,
  /ставк[аиуы]/iu,
  /коэффициент[а-я]*/iu,
  /букмекер[а-я]*/iu,
  /(?:прогноз|пик)\s+на\s+(?:победу|тотал|исход)/iu,
  /(?:победа|победу)\s+(?:хозяев|гостей|команды|клуба)/iu,
  /\bbet(?:ting)?\b/iu,
  /\bwager\b/iu,
] as const;

const SPORTS_SANITY_BLOCK_PATTERNS = [
  /потерпел[аи]?\s+[^.!?]{0,80}\s+побед/iu,
  /поражен\w*\s+[^.!?]{0,80}\s+побед/iu,
  /проиграл[аи]?\s+[^.!?]{0,80}\s+побед/iu,
  /требует\s+немедленн\w*\s+вмешательств/iu,
  /необходимо\s+изменить\s+тактик/iu,
] as const;

const REPETITIVE_MIRO_VOICE_PATTERNS = [
  /главн\w*\s+фильтр\w*\s+Миро/iu,
  /в\s+рынках\s+мне\s+мало\s+самой\s+цены/iu,
  /источник\s+здесь\s+важен\s+не\s+как\s+вывеска/iu,
  /если\s+эта\s+проверка\s+не\s+сработает/iu,
  /смысл\s+такой\s+статьи/iu,
] as const;

const SELF_REFERENTIAL_ARTICLE_PATTERNS = [
  /\bменя\s+здесь\b/iu,
  /\bмне\s+здесь\b/iu,
  /\bдля\s+меня\b/iu,
  /\bя\s+(?:оставляю|не\s+достраиваю|смотрю|не\s+верю|не\s+покупаю|не\s+считаю|считаю|вижу|слышу|проверяю|бы)\b/iu,
  /мировая\s+запись\s+нужна/iu,
  /практическая\s+ценность\s+записи/iu,
  /редакционный\s+каркас/iu,
  /прогноз\s+остается\s+ограниченным\s+исходными\s+данными/iu,
  /опорный\s+источник/iu,
  /в\s+тексте\s+остаются\s+только\s+детали/iu,
  /опора\s+здесь\s+простая/iu,
  /ограничение\s+остается\s+жестким/iu,
  /в\s+технологической\s+ленте\s+такие\s+новости/iu,
  /я\s+оставляю\s+это\s+в\s+статье/iu,
  /не\s+достраиваю\s+вокруг\s+факта/iu,
  /эта\s+заметка\s+нужна/iu,
  /миро\s+проверяет\s+себя/iu,
  /мнение\s+миро/iu,
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
  /что\s+случилось/i,
  /личное\s+мнение\s+миро/i,
  /что\s+дальше/i,
  /источник/i,
  /в\s+фактах\s+появил[ао]?с[ья]\s+проверяем\w*\s+детал/iu,
  /сильнее\s+всего\s+здесь\s+работает\s+детал/iu,
  /такой\s+факт\s+важен/iu,
  /в\s+ленте\s+это\s+держится/iu,
  /в\s+канале\s+это\s+держится/iu,
] as const;

const TELEGRAM_BAD_COPY_PATTERNS = [
  /полная\s+(?:мысль|запись|версия|статья)/iu,
  /(?:читайте?|подробности)\s+на\s+сайте/iu,
  /на\s+сайте\s*[—-]\s*почему/iu,
  /вышла\s+новая\s+(?:заметка|статья)/iu,
  /сегодня\s+в\s+канале/iu,
  /мы\s+опубликовали/iu,
] as const;

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
  return value.match(/[A-Za-z][A-Za-z'-]{2,}/g)?.length ?? 0;
}

function countCyrillicWordLikeTokens(value: string): number {
  return value.match(/[А-Яа-яЁёІіЎў][А-Яа-яЁёІіЎў'-]{2,}/gu)?.length ?? 0;
}

function stripRussianFactPrefix(value: string): string {
  return value
    .replace(/^(?:Источник фиксирует|Еще одна деталь источника):\s*/iu, "")
    .trim();
}

const ENGLISH_SENTENCE_MARKER_PATTERN =
  /\b(?:the|a|an|and|or|to|of|for|with|without|from|after|before|over|under|against|amid|as|by|said|says|reported|announced|described|launched|released|making|faster|sacrificing|accuracy|throughput|model|models)\b/iu;

export function looksLikeRawEnglishSentence(value: string): boolean {
  const normalized = stripRussianFactPrefix(value);

  const latinWords = countLatinWordLikeTokens(normalized);
  const cyrillicWords = countCyrillicWordLikeTokens(normalized);

  if (latinWords < 4) {
    return false;
  }

  if (cyrillicWords === 0) {
    return true;
  }

  return (
    latinWords >= cyrillicWords * 2 &&
    ENGLISH_SENTENCE_MARKER_PATTERN.test(normalized)
  );
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

function getInferredParagraphs(post: MiroPost): string[] {
  return post.inferred
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function hasDuplicateLeadAtEnd(post: MiroPost): boolean {
  const paragraphs = getInferredParagraphs(post);
  if (paragraphs.length < 4) {
    return false;
  }

  const first = paragraphs[0];
  const last = paragraphs[paragraphs.length - 1];
  return (
    normalizeAnchorText(first) === normalizeAnchorText(last) ||
    countSharedTokens(first, last) >= 6
  );
}

function hasUnrelatedObservedFacts(post: MiroPost, topic: MiroTopic): boolean {
  if (
    post.observed.length < 2 ||
    (topic !== "sports" && topic !== "tech_world" && topic !== "world")
  ) {
    return false;
  }

  const anchor = post.observed[0];
  return post.observed
    .slice(1)
    .some((fact) => countSharedTokens(anchor, fact) === 0);
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

function hasConcreteMarketOpener(
  firstParagraph: string,
  observedText: string,
): boolean {
  if (countSharedTokens(firstParagraph, observedText) >= 2) {
    return true;
  }

  const normalizedOpener = normalizeAnchorText(firstParagraph);
  const normalizedObserved = normalizeAnchorText(observedText);
  const sharesAnchoredAsset = [
    /(bitcoin|битко[йи]н)/u,
    /(ethereum|эфир(?:иум)?)/u,
    /(solana|солан)/u,
    /(usd\s*\/?\s*rub)/u,
    /(usd\s*\/?\s*byn)/u,
    /(usd\s*\/?\s*jpy)/u,
  ].some(
    (pattern) =>
      pattern.test(normalizedOpener) && pattern.test(normalizedObserved),
  );

  if (sharesAnchoredAsset && /\d/.test(firstParagraph) && /\d/.test(observedText)) {
    return true;
  }

  return /\d/.test(firstParagraph) && countSharedTokens(firstParagraph, observedText) >= 1;
}

function assessWorldSignalStrength(
  payload: MiroFactsPayload,
  post: MiroPost,
): {
  hasTensionMarker: boolean;
  looksPurelyLocal: boolean;
  looksWeakWorld: boolean;
} {
  const combined = normalizeAnchorText(
    [
      post.title,
      ...payload.facts,
      post.inferred,
      post.opinion,
      post.cross_signal,
      post.hypothesis,
      post.reasoning,
    ].join(" "),
  );

  return {
    hasTensionMarker: WORLD_TENSION_MARKER_PATTERNS.some((pattern) =>
      pattern.test(combined),
    ),
    looksPurelyLocal: WORLD_LOCAL_NOISE_PATTERNS.some((pattern) =>
      pattern.test(combined),
    ),
    looksWeakWorld: WORLD_WEAK_SIGNAL_PATTERNS.some((pattern) =>
      pattern.test(combined),
    ),
  };
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

function isAppraisableFact(fact: string, topic: MiroTopic): boolean {
  const combined = fact.toLowerCase();

  if (topic === "world") {
    if (/(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(снег|ветер|фронт|холод|возврат холода)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(combined)) return true;
    if (/(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(магнолия|премьер|культур|двор)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(combined)) return true;
    if (
      /(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(музе[йя]|museum|festival|фестивал|выставк|exhibit|bridge|мост|railway|rail|станци|station|library|библиотек|airport|аэропорт|park|парк|garden|сад|observatory|обсерватор|science center|научн|space|orbit|rocket|satellite|космос|орбит|ракет|спутник|archeolog|ancient|discovery|археолог|раскопк|древн|открыт|nature|ocean|ecology|forest|природ|океан|эколог|лес|solar|infrastructure|architecture|солнечн|инфраструктур|архитектур)/iu.test(
        combined,
      )
    ) {
      return true;
    }
  }

  if (topic === "tech_world") {
    if (/(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(безлимит|friction|без компромисс|remove friction)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(combined)) return true;
    if (
      /(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(post-quantum|quantum readiness|largest ever observed|age of electricity|replace batteries|fuel cell|crack the .* problem|grown dolomite)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(
        combined,
      )
    ) {
      return true;
    }
    if (/(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(launch|released|presented|представил|релиз|запускает)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(combined)) return true;
    if (
      /(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(ai model|model update|reasoning|benchmark|open source|open-source|agent|api|sdk|chip|gpu|inference|robot|vision|llm|qwen|glm|deepseek|llama|gemini|claude|gpt|нейросет|модел|бенчмарк|чип|ускорител|агент|api|sdk|инференс|робот)/iu.test(
        combined,
      )
    ) {
      return true;
    }
  }

  if (topic === "sports") {
    if (
      /(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(84-й|84th|поздний гол|дожал|серия|четвертая победа|финал|shutout|sweep|rbi drought|dry spell|showdown series|rivalry|division race)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(
        combined,
      )
    ) {
      return true;
    }
    if (
      /(?:^|[^a-zA-Z0-9_а-яА-ЯёЁ])(счет был|match ended|обыграл|победил|won|win over|beat|penalt|overtime|extra time|камбэк|comeback|3-hit|no-hit|scoreless)(?:$|[^a-zA-Z0-9_а-яА-ЯёЁ])/iu.test(
        combined,
      ) ||
      /\b\d+\s*[-:]\s*\d+\b/.test(combined)
    ) {
      return true;
    }
  }

  return false;
}

export function focusPayloadForGeneration(
  payload: MiroFactsPayload,
  topic: MiroTopic,
  mode: "default" | "retry" = "default",
): MiroFactsPayload {
  const dedupedFacts = dedupeFactsForGeneration(payload.facts, topic, payload.source);

  let sortedDedupedFacts = dedupedFacts;
  if (topic === "world" || topic === "tech_world" || topic === "sports") {
    const appraisable = dedupedFacts.filter(fact => isAppraisableFact(fact, topic));
    const nonAppraisable = dedupedFacts.filter(fact => !isAppraisableFact(fact, topic));
    sortedDedupedFacts = [...appraisable, ...nonAppraisable];
  }

  const maxFacts =
    topic === "sports"
      ? 1
      : topic === "tech_world" || topic === "world"
        ? 1
        : 3;

  const baseFacts =
    topic === "world"
      ? pickDominantWorldFacts(sortedDedupedFacts)
      : topic === "markets_fx" || topic === "markets_crypto"
        ? pickDominantMarketFacts(sortedDedupedFacts)
        : sortedDedupedFacts;

  const retryFacts =
    mode === "retry"
      ? baseFacts.slice(0, Math.min(maxFacts, topic === "world" ? 1 : 2))
      : baseFacts.slice(0, maxFacts);

  const finalFacts =
    topic === "sports"
      ? retryFacts.length >= 1
        ? retryFacts
        : dedupedFacts.slice(0, 1)
      : topic === "tech_world" || topic === "world"
      ? retryFacts.length >= 1
        ? retryFacts
        : baseFacts.slice(0, 1)
      : retryFacts.length >= 2
        ? retryFacts
        : dedupedFacts.slice(0, 2);

  const alignedSources = finalFacts.map((fact) => {
    const originalIndex = payload.facts.indexOf(fact);
    if (originalIndex !== -1 && payload.corroborating_sources?.[originalIndex]) {
      return payload.corroborating_sources[originalIndex];
    }
    return {
      source: payload.source,
      url: payload.source_url,
      published_at: payload.source_published_at,
    };
  });

  const firstSource = alignedSources[0];

  return {
    ...payload,
    source_url: firstSource?.url ?? payload.source_url,
    source_published_at: firstSource?.published_at ?? payload.source_published_at,
    event_date: firstSource?.published_at
      ? (() => {
          const parsed = new Date(firstSource.published_at);
          return Number.isFinite(parsed.getTime())
            ? parsed.toISOString().slice(0, 10)
            : firstSource.published_at.slice(0, 10);
        })()
      : payload.event_date,
    corroborating_sources: alignedSources,
    facts: finalFacts,
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
  const marketSafetyText = [
    post.title,
    post.inferred,
    post.opinion,
    post.cross_signal,
    post.hypothesis,
    post.reasoning ?? "",
    post.telegram_text ?? "",
  ].join("\n");
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

  const publicCopyBlockReason = getPublicPostCopyBlockReason(post);
  if (publicCopyBlockReason) {
    return publicCopyBlockReason;
  }

  if (PUBLIC_TEMPLATE_LEAK_PATTERNS.some((pattern) => pattern.test(marketSafetyText))) {
    return "quality gate blocked fallback template language";
  }

  if (REPETITIVE_MIRO_VOICE_PATTERNS.some((pattern) => pattern.test(marketSafetyText))) {
    return "quality gate blocked repetitive Miro voice fingerprint";
  }

  if (SELF_REFERENTIAL_ARTICLE_PATTERNS.some((pattern) => pattern.test(marketSafetyText))) {
    return "quality gate blocked self-referential article voice";
  }

  const inferredClean = post.inferred.replace(/\\n/g, "\n");
  const paragraphs = inferredClean.includes("\n\n")
    ? inferredClean.split(/\n\s*\n/g)
    : inferredClean.split(/\n/g);

  const inferredParagraphCount = paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;

  const inferredWordCount = inferredClean
    .trim()
    .split(/[\s,.;:!?()[\]{}"«»]+/u)
    .filter(Boolean).length;

  const minParagraphs = payload.facts.length <= 1 ? 1 : 4;
  const minWordCount = payload.facts.length <= 1 ? 70 : 170;

  if (inferredParagraphCount < minParagraphs || inferredWordCount < minWordCount) {
    return "quality gate blocked thin article body";
  }

  if (/(?:…|\.{3})\s*$/u.test(post.title.trim())) {
    return "quality gate blocked truncated title";
  }

  if (
    isLikelyTruncatedTitlePrefix(post.title, [
      ...post.observed,
      ...payload.facts,
    ])
  ) {
    return "quality gate blocked truncated title";
  }

  if (
    FALLBACK_BOILERPLATE_PATTERNS.some((pattern) =>
      pattern.test(marketSafetyText),
    )
  ) {
    return "quality gate blocked fallback boilerplate";
  }

  if (hasDuplicateLeadAtEnd(post)) {
    return "quality gate blocked duplicate lead at article end";
  }

  if (hasUnrelatedObservedFacts(post, topic)) {
    return "quality gate blocked mixed unrelated observed facts";
  }

  if (FINANCIAL_ADVICE_PATTERNS.some((pattern) => pattern.test(marketSafetyText))) {
    return "quality gate blocked financial advice language";
  }

  if (
    topic === "sports" &&
    SPORTS_BETTING_ADVICE_PATTERNS.some((pattern) => pattern.test(marketSafetyText))
  ) {
    return "quality gate blocked sports betting advice language";
  }

  if (
    topic === "sports" &&
    SPORTS_SANITY_BLOCK_PATTERNS.some((pattern) => pattern.test(marketSafetyText))
  ) {
    return "quality gate blocked contradictory or coachy sports framing";
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

  if (topic === "world") {
    const worldSignal = assessWorldSignalStrength(payload, post);

    if (
      (!worldSignal.hasTensionMarker &&
        (worldSignal.looksPurelyLocal || worldSignal.looksWeakWorld)) ||
      (post.confidence === "low" && !worldSignal.hasTensionMarker)
    ) {
      return "World signal lacks global tension or is purely local news";
    }
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
    return "quality gate blocked draft without an editorial takeaway";
  }

  if (
    GENERIC_OPINION_PATTERNS.some((pattern) => pattern.test(post.opinion))
  ) {
    return "quality gate blocked generic editorial takeaway";
  }

  if (
    SOFT_OPINION_PHRASES.some((phrase) =>
      normalizedOpinion.includes(normalizeQualityText(phrase)),
    )
  ) {
    return "quality gate blocked soft corporate opinion";
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
    normalizedTelegram &&
    TELEGRAM_BAD_COPY_PATTERNS.some((pattern) =>
      pattern.test(post.telegram_text ?? ""),
    )
  ) {
    return "quality gate blocked Telegram admin copy";
  }

  if (
    (topic === "sports" || topic === "world" || topic === "tech_world") &&
    countSharedTokens(post.title, observedText) === 0 &&
    countSharedTokens(post.inferred, observedText) <= 1
  ) {
    return "quality gate blocked note that is too detached from concrete facts";
  }

  const openerReference = post.observed[0] ?? observedText;
  const hasConcreteOpener =
    topic === "markets_fx" || topic === "markets_crypto"
      ? hasConcreteMarketOpener(firstParagraph, openerReference)
      : countSharedTokens(firstParagraph, openerReference) >= 2;

  if (!hasConcreteOpener) {
    return "quality gate blocked opener that does not explain the event concretely";
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

  // Блокировка цифр в мнении Miro (разрешен только год 2026)
  if (/\d/.test(post.opinion.replace(/\b2026\b/g, ""))) {
    return "quality gate blocked opinion containing specific numbers or raw facts";
  }

  // Блокировка высокого текстового перекрытия мнения со статьей или телеграм-постом
  if (countSharedTokens(post.opinion, post.inferred) >= 8) {
    return "quality gate blocked opinion with too much text overlap with inferred article";
  }
  if (post.telegram_text && countSharedTokens(post.opinion, post.telegram_text) >= 6) {
    return "quality gate blocked opinion with too much text overlap with telegram post";
  }

  return null;
}
