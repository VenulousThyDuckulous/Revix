import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isOnlineConfigured(): boolean {
  return Boolean(URL && KEY);
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!isOnlineConfigured()) return null;
  if (!client) client = createClient(URL as string, KEY as string);
  return client;
}

export const ONLINE_HELP =
  'Online accounts and leaderboards need Supabase. See docs/supabase-setup.md — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then run the SQL migration.';
