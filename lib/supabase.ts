import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPABASE_REF = supabaseUrl.split('.')[0]?.replace('https://', '') ?? '';
const AUTH_COOKIE = `sb-${SUPABASE_REF}-auth-token`;

function extractJwt(req: NextRequest): string | null {
  const token = req.nextUrl.searchParams.get('token');
  if (token) return token;

  const cookieToken = req.cookies.get(AUTH_COOKIE)?.value;
  if (!cookieToken) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieToken));
    return parsed.access_token || cookieToken;
  } catch {
    return cookieToken;
  }
}

export async function getUserFromRequest(req: NextRequest): Promise<{ id: string } | null> {
  const jwt = extractJwt(req);
  if (!jwt) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user } } = await client.auth.getUser();
  return user;
}
