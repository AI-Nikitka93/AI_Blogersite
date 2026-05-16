export type MiroCategoryHint = "Sports" | "Markets" | "Tech" | "World";

export interface MiroFactsPayload {
  category_hint: MiroCategoryHint;
  source: string;
  facts: string[];
  source_url?: string;
  source_published_at?: string;
  event_date?: string;
  corroborating_sources?: Array<{
    source: string;
    url?: string;
    title?: string;
    published_at?: string;
  }>;
}

export interface ConnectorRuntimeOptions {
  requestTimeoutMs?: number;
}

export interface RssFactsOptions extends ConnectorRuntimeOptions {
  sourceName?: string;
  categoryHint?: MiroCategoryHint;
  maxItems?: number;
  excludedKeywords?: string[];
  includeKeywords?: string[];
  singleItem?: boolean;
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
  includeKeywords?: readonly string[];
  singleItem?: boolean;
}
