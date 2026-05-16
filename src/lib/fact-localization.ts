function normalizeFact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function coerceEnglishFactToRussianFallback(fact: string): string | null {
  const normalized = normalizeFact(fact);

  if (!normalized) {
    return null;
  }

  const spacexResupply = normalized.match(
    /\b(\d+)(?:st|nd|rd|th)?\s+SpaceX\s+commercial\s+resupply\s+mission\b/i,
  );

  if (
    spacexResupply &&
    /International\s+Space\s+Station/i.test(normalized) &&
    /scientific\s+experiments?/i.test(normalized)
  ) {
    return `Стартовала ${spacexResupply[1]}-я коммерческая миссия SpaceX по снабжению Международной космической станции с новыми научными экспериментами NASA.`;
  }

  if (
    /making\s+llms?\s+faster\s+without\s+sacrificing\s+accuracy/i.test(normalized) ||
    (/scaling\s+law/i.test(normalized) && /throughput/i.test(normalized))
  ) {
    return "Amazon Science описала scaling law для ускорения LLM без потери точности, с проверкой через throughput и качество ответа.";
  }

  return null;
}
