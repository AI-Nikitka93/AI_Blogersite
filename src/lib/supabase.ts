import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { MiroPost } from "./miro-agent";

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
  observed: string[];
  inferred: string;
  cross_signal: string;
  hypothesis: string;
  category: MiroPost["category"];
  created_at: string;
}

export interface PostInsert {
  title: string;
  observed: string[];
  inferred: string;
  cross_signal: string;
  hypothesis: string;
  category: MiroPost["category"];
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

export function mapPostToInsert(post: MiroPost): PostInsert {
  return {
    title: post.title,
    observed: post.observed,
    inferred: post.inferred,
    cross_signal: post.cross_signal,
    hypothesis: post.hypothesis,
    category: post.category,
  };
}
