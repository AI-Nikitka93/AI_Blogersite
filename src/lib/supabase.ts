import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { MiroPost } from "./agent";

export type PostConfidence = "high" | "medium" | "low";

type PersistedMiroPost = MiroPost & {
  reasoning?: string;
  confidence?: PostConfidence;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface PostRow {
  id: string;
  title: string;
  source: string | null;
  source_url: string | null;
  source_published_at: string | null;
  event_date: string | null;
  corroborating_sources: Json | null;
  observed: string[];
  inferred: string;
  opinion: string;
  cross_signal: string;
  hypothesis: string;
  reasoning: string;
  confidence: PostConfidence;
  category: MiroPost["category"];
  created_at: string;
}

export interface PostInsert {
  title: string;
  source?: string | null;
  source_url?: string | null;
  source_published_at?: string | null;
  event_date?: string | null;
  corroborating_sources?: Json | null;
  observed: string[];
  inferred: string;
  opinion: string;
  cross_signal: string;
  hypothesis: string;
  reasoning: string;
  confidence: PostConfidence;
  category: MiroPost["category"];
}

export interface RunHistoryRow {
  id: string;
  created_at: string;
  trace_id: string;
  topic: string | null;
  status: string;
  reason: string | null;
  post_id: string | null;
  duration_ms: number | null;
}

export interface RunHistoryInsert {
  id?: string;
  created_at?: string;
  trace_id: string;
  topic?: string | null;
  status: string;
  reason?: string | null;
  post_id?: string | null;
  duration_ms?: number | null;
}

export interface QualityEventRow {
  id: string;
  created_at: string;
  trace_id: string;
  topic: string | null;
  status: string;
  reason: string | null;
  post_id: string | null;
  prompt_version: string | null;
  fallback_mode: string | null;
  risk_level: string;
  quality_flags: Json;
  category_balance: Json | null;
}

export interface QualityEventInsert {
  id?: string;
  created_at?: string;
  trace_id: string;
  topic?: string | null;
  status: string;
  reason?: string | null;
  post_id?: string | null;
  prompt_version?: string | null;
  fallback_mode?: string | null;
  risk_level: string;
  quality_flags: Json;
  category_balance?: Json | null;
}

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: PostInsert;
        Update: Partial<PostInsert>;
        Relationships: [];
      };
      run_history: {
        Row: RunHistoryRow;
        Insert: RunHistoryInsert;
        Update: Partial<RunHistoryInsert>;
        Relationships: [];
      };
      quality_events: {
        Row: QualityEventRow;
        Insert: QualityEventInsert;
        Update: Partial<QualityEventInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function createSupabaseInstance(key: string): SupabaseClient<Database> {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function getPublicSupabaseClient(): SupabaseClient<Database> {
  return createSupabaseInstance(requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function getAdminSupabaseClient(): SupabaseClient<Database> {
  return createSupabaseInstance(requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function mapPostToInsert(post: PersistedMiroPost): PostInsert {
  return {
    title: post.title,
    source: post.source?.trim() || null,
    source_url: post.source_url?.trim() || null,
    source_published_at: post.source_published_at?.trim() || null,
    event_date: post.event_date?.trim() || null,
    corroborating_sources:
      post.corroborating_sources && post.corroborating_sources.length > 0
        ? post.corroborating_sources
        : null,
    observed: post.observed,
    inferred: post.inferred,
    opinion: post.opinion?.trim() ?? "",
    cross_signal: post.cross_signal,
    hypothesis: post.hypothesis,
    reasoning: post.reasoning?.trim() ?? "",
    confidence: post.confidence ?? "medium",
    category: post.category,
  };
}
