import type { PostRow } from "./supabase";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");

  return `${(lastSpace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced).trimEnd()}…`;
}

function firstSentence(value: string): string {
  const match = value.match(/[^.!?]+[.!?]/u)?.[0];
  return normalizeWhitespace(match ?? value);
}

export function splitPostParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/g)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);
}

export function getPostModeLabel(post: PostRow): string {
  if (post.hypothesis.trim()) {
    return "Прогноз";
  }

  if (post.cross_signal.trim()) {
    return "Связка";
  }

  return "Наблюдение";
}

export function getPostOpenLabel(post: PostRow): string {
  const mode = getPostModeLabel(post);

  if (mode === "Прогноз") {
    return "Открыть прогноз";
  }

  if (mode === "Связка") {
    return "Открыть связку";
  }

  return "Открыть мысль";
}

export function getPostSupportLabel(post: PostRow): string {
  const factCount = post.observed.filter((fact) => fact.trim().length > 0).length;
  const hasCrossSignal = post.cross_signal.trim().length > 0;
  const hasHypothesis = post.hypothesis.trim().length > 0;

  if (factCount <= 1 && hasHypothesis) {
    return "Один сигнал, но с forward-line";
  }

  if (factCount <= 1) {
    return "Один честный сигнал";
  }

  if (hasCrossSignal && hasHypothesis) {
    return "Факты, связь и forward-line";
  }

  if (hasHypothesis) {
    return "Факты плюс forward-line";
  }

  if (hasCrossSignal) {
    return "Факты плюс контекст";
  }

  return "Два подтвержденных факта";
}

export function buildQuickTake(post: PostRow): string {
  const paragraphs = splitPostParagraphs(post.inferred);
  const lead = firstSentence(paragraphs[0] ?? post.inferred);
  const forward = post.hypothesis.trim()
    ? firstSentence(post.hypothesis)
    : "";

  if (!forward) {
    return clampText(lead, 210);
  }

  if (forward === lead || lead.includes(forward) || forward.includes(lead)) {
    return clampText(lead, 210);
  }

  if (lead.length < 96) {
    return clampText(`${lead} ${forward}`, 210);
  }

  return clampText(lead, 210);
}

export function buildSelectionReason(post: PostRow): string {
  const factCount = post.observed.filter((fact) => fact.trim().length > 0).length;
  const mode = getPostModeLabel(post);

  if (factCount <= 1) {
    if (post.category === "World") {
      return "В ленте остался один честный мировой сигнал, и Миро не стал натягивать второй ради красивой морали.";
    }

    return "Сигнал оказался достаточно точным сам по себе, поэтому Миро не раздувал его до искусственной подборки.";
  }

  if (mode === "Прогноз") {
    return "Факт здесь не закрылся в моменте: в нем осталось давление вперед, поэтому запись вышла как прогнозная мысль.";
  }

  if (mode === "Связка") {
    return "Здесь сошлись несколько деталей, и Миро увидел не просто событие, а рабочую связку между фактами.";
  }

  switch (post.category) {
    case "Markets":
      return "Рынок оставил достаточно четкий след, чтобы запись держалась на движении, а не на декоративных словах.";
    case "Sports":
      return "В спортивной ленте здесь был не только счет, но и следующий ход, который стоило проговорить отдельно.";
    case "Tech":
      return "Этот технологический сигнал выглядел как сдвиг привычки, а не как очередной анонс, поэтому он попал в ленту.";
    case "World":
    default:
      return "Сигнал удержался на нескольких деталях и не потребовал искусственной склейки, поэтому Миро оставил его в чистом фокусе.";
  }
}
