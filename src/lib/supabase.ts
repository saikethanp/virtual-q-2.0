import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    supabaseUrl.startsWith('http')
  );
};

// Default client (for General operations and Business Owners)
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'vq_owner_auth_token',
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  : null;

// Dedicated Customer Auth client with isolated storage key so customer & business owner logins NEVER overwrite each other in different tabs
export const customerSupabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'vq_customer_auth_token',
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  : null;

/**
 * Gets or initializes a persistent anonymous session ID for customer tracking.
 * This ensures session continuity without requiring customers to register.
 */
export const getCustomerSessionId = (): string => {
  const STORAGE_KEY = 'vq_customer_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Ensures a secure customer session exists.
 * When Supabase is configured:
 *  - Checks customerSupabase session first
 *  - Returns customer user ID and persistent customer session ID.
 */
export const ensureCustomerSession = async (): Promise<{ userId: string | null; sessionId: string }> => {
  const sessionId = getCustomerSessionId();

  if (isSupabaseConfigured() && customerSupabase) {
    try {
      const { data: { session } } = await customerSupabase.auth.getSession();
      if (session?.user) {
        return { userId: session.user.id, sessionId };
      }
    } catch (err) {
      console.warn('Customer session read note:', err);
    }
  }

  // Fallback to primary client if customerSupabase has no separate session
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return { userId: session.user.id, sessionId };
      }
    } catch (err) {
      console.warn('Supabase session read note:', err);
    }
  }

  return { userId: null, sessionId };
};
