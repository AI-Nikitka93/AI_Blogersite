export type MiroCategoryHint = "Sports" | "Markets" | "Tech" | "World";

export interface MiroFactsPayload {
  category_hint: MiroCategoryHint;
  source: string;
  facts: string[];
}

export interface ConnectorRuntimeOptions {
  requestTimeoutMs?: number;
}

export interface RssFactsOptions extends ConnectorRuntimeOptions {
  sourceName?: string;
  categoryHint?: MiroCategoryHint;
  maxItems?: number;
  excludedKeywords?: string[];
}

export interface GdeltFactsOptions {
  keywords?: string[];
  categoryHint?: Extract<MiroCategoryHint, "Tech" | "World">;
  maxRecords?: number;
  timespan?: string;
  requestTimeoutMs?: number;
  retryOn429?: boolean;
}

export interface RssFeedPreset {
  url: string;
  source: string;
  category_hint: MiroCategoryHint;
  excludedKeywords?: readonly string[];
}
