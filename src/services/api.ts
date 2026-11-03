import { supabase, customerSupabase, isSupabaseConfigured, getCustomerSessionId, ensureCustomerSession } from '../lib/supabase';
import {
  Business,
  Counter,
  MenuItem,
  QueueEntry,
  Order,
  QueueSettings,
  BusinessCategory,
  QueueStatus,
  OrderStatus,
  BusinessOwnerProfile,
  CustomerProfile
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_MENU_ITEMS,
  INITIAL_COUNTERS,
  INITIAL_SETTINGS
} from './mockData';

// Local storage keys for persistent preview mode
const STORAGE_KEYS = {
  BUSINESSES: 'vq_storage_businesses',
  MENU_ITEMS: 'vq_storage_menu_items',
  COUNTERS: 'vq_storage_counters',
  QUEUE_ENTRIES: 'vq_storage_queue_entries',
  ORDERS: 'vq_storage_orders',
  SETTINGS: 'vq_storage_settings',
  AUTH_OWNER: 'vq_storage_current_owner',
  AUTH_CUSTOMER: 'vq_storage_current_customer',
};

// Broadcast channel for instantaneous cross-tab synchronization
const realtimeBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('vq_cross_tab_sync')
  : null;

if (realtimeBroadcastChannel) {
  realtimeBroadcastChannel.onmessage = (event) => {
    if (event?.data?.type) {
      window.dispatchEvent(new CustomEvent('vq_realtime_event', { detail: event.data }));
    }
  };
}

// Event emitter helper for instant real-time synchronization in UI and across browser tabs
const broadcastChange = (type: string, detail?: unknown) => {
  window.dispatchEvent(new CustomEvent('vq_realtime_event', { detail: { type, detail } }));
  try {
    realtimeBroadcastChannel?.postMessage({ type, detail });
  } catch (e) {
    // ignore cross-context message cloning issues
  }
};

// Local storage state helpers
const getStored = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
};

// Clean production state in localStorage: Start empty when not populated
if (!localStorage.getItem(STORAGE_KEYS.BUSINESSES)) {
  setStored(STORAGE_KEYS.BUSINESSES, []);
}
if (!localStorage.getItem(STORAGE_KEYS.MENU_ITEMS)) {
  setStored(STORAGE_KEYS.MENU_ITEMS, []);
}
if (!localStorage.getItem(STORAGE_KEYS.COUNTERS)) {
  setStored(STORAGE_KEYS.COUNTERS, []);
}
if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
  setStored(STORAGE_KEYS.SETTINGS, {});
}
if (!localStorage.getItem(STORAGE_KEYS.QUEUE_ENTRIES)) {
  setStored(STORAGE_KEYS.QUEUE_ENTRIES, []);
}
if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
  setStored(STORAGE_KEYS.ORDERS, []);
}

// -----------------------------------------------------------------------------
// BUSINESS API
// -----------------------------------------------------------------------------

export const getBusinesses = async (category?: BusinessCategory, searchQuery?: string): Promise<Business[]> => {
  if (isSupabaseConfigured() && supabase) {
    let query = supabase.from('businesses').select('*').order('created_at', { ascending: false });
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (searchQuery && searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch businesses error:', error);
      return [];
    }
    return data as Business[];
  }

  // Local fallback (preview mode)
  let list = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  if (category && category !== 'All') {
    list = list.filter(b => b.category === category);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q))
    );
  }
  return list;
};

export const getBusinessBySlug = async (slug: string): Promise<Business | null> => {
  if (isSupabaseConfigured() && supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabase.from('businesses').select('*');
    if (isUuid) {
      query = query.or(`slug.eq.${slug},id.eq.${slug}`);
    } else {
      query = query.eq('slug', slug);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Supabase getBusinessBySlug error:', error);
      return null;
    }
    return (data as Business) || null;
  }
  const list = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  return list.find(b => b.slug === slug || b.id === slug) || null;
};

export const getBusinessById = async (id: string): Promise<Business | null> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Supabase getBusinessById error:', error);
      return null;
    }
    return (data as Business) || null;
  }
  const list = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  return list.find(b => b.id === id) || null;
};

export const updateBusiness = async (
  businessId: string,
  updates: Partial<Business>
): Promise<Business | null> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .select()
        .single();
      if (!error && data) {
        broadcastChange('business_updated', data);
        return data as Business;
      }
    } catch (e) {
      console.warn('Supabase update business error:', e);
    }
  }

  const list = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  const idx = list.findIndex(b => b.id === businessId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    setStored(STORAGE_KEYS.BUSINESSES, list);
    broadcastChange('business_updated', list[idx]);
    return list[idx];
  }
  return null;
};

export const registerBusiness = async (data: {
  ownerName: string;
  email: string;
  phone: string;
  password?: string;
  businessName: string;
  category: 'Restaurants' | 'Cafes' | 'Salons' | 'Clinics' | 'Services' | 'Other';
  location: string;
}): Promise<{ business: Business; owner: BusinessOwnerProfile }> => {
  const cleanEmail = data.email.trim().toLowerCase();
  const slug = data.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(100 + Math.random() * 900);

  if (isSupabaseConfigured() && supabase) {
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // 1. Supabase Auth signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.ownerName.trim(),
          phone: data.phone.trim(),
          role: 'business_owner',
        },
      },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create business account.');
    }

    const userId = authData.user.id;

    // Call atomic transactional registration RPC
    const { data: regData, error: regError } = await supabase.rpc('rpc_register_business', {
      p_owner_name: data.ownerName.trim(),
      p_business_name: data.businessName.trim(),
      p_phone: data.phone.trim(),
      p_category: data.category,
      p_location: data.location.trim(),
      p_slug: slug,
    });

    if (regError || (regData && !regData.success)) {
      throw new Error(regError?.message || regData?.message || 'Failed to initialize business data.');
    }

    const createdBiz = regData.business as Business;
    const newOwner: BusinessOwnerProfile = {
      id: userId,
      email: cleanEmail,
      full_name: data.ownerName.trim(),
      phone: data.phone.trim(),
      role: 'business_owner',
      business_id: createdBiz.id,
    };

    setOwnerSession(newOwner);
    broadcastChange('business_created', createdBiz);
    return { business: createdBiz, owner: newOwner };
  }

  // Preview / Offline registration mode
  const ownerId = crypto.randomUUID();
  const businessId = crypto.randomUUID();

  const newOwner: BusinessOwnerProfile = {
    id: ownerId,
    email: cleanEmail,
    full_name: data.ownerName.trim(),
    phone: data.phone.trim(),
    role: 'business_owner',
    business_id: businessId,
  };

  const newBusiness: Business = {
    id: businessId,
    owner_id: ownerId,
    name: data.businessName.trim(),
    slug,
    category: data.category,
    description: `Welcome to ${data.businessName.trim()}. Skip the wait and reserve your spot in line directly.`,
    location: data.location.trim(),
    banner_url: '/assets/aistudio/Warm_Virtual-Q_Business_Discovery_6cffc5a7.png',
    logo_url: '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png',
    phone: data.phone.trim(),
    email: cleanEmail,
    is_open: true,
    rating: 5.0,
    review_count: 0,
    avg_service_time: 5,
    token_prefix: 'Q',
    created_at: new Date().toISOString(),
  };

  // Update local storage in preview mode
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  businesses.unshift(newBusiness);
  setStored(STORAGE_KEYS.BUSINESSES, businesses);
  setOwnerSession(newOwner);

  // Default Counter
  const counters = getStored<Counter[]>(STORAGE_KEYS.COUNTERS, INITIAL_COUNTERS);
  counters.push({
    id: crypto.randomUUID(),
    business_id: newBusiness.id,
    name: 'Counter 1 - Main Service',
    code: 'C1',
    is_active: true,
  });
  setStored(STORAGE_KEYS.COUNTERS, counters);

  broadcastChange('business_created', newBusiness);
  return { business: newBusiness, owner: newOwner };
};

// -----------------------------------------------------------------------------
// MENU MANAGEMENT
// -----------------------------------------------------------------------------

export const getMenuItems = async (businessId: string): Promise<MenuItem[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('menu_items').select('*').eq('business_id', businessId).order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase getMenuItems error:', error);
      return [];
    }
    return (data as MenuItem[]) || [];
  }
  const allItems = getStored<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
  return allItems.filter(item => item.business_id === businessId);
};

export const createMenuItem = async (item: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
  const newItem: MenuItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.from('menu_items').insert(newItem).select().single();
      if (data) return data as MenuItem;
    } catch (e) {
      console.warn('Supabase insert item error', e);
    }
  }

  const items = getStored<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
  items.push(newItem);
  setStored(STORAGE_KEYS.MENU_ITEMS, items);
  broadcastChange('menu_updated', newItem);
  return newItem;
};

export const updateMenuItem = async (id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.from('menu_items').update(updates).eq('id', id).select().single();
      if (data) return data as MenuItem;
    } catch (e) {
      console.warn('Supabase update item error', e);
    }
  }

  const items = getStored<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    setStored(STORAGE_KEYS.MENU_ITEMS, items);
    broadcastChange('menu_updated', items[idx]);
    return items[idx];
  }
  return null;
};

export const deleteMenuItem = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('menu_items').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete item error', e);
    }
  }
  const items = getStored<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
  const filtered = items.filter(i => i.id !== id);
  setStored(STORAGE_KEYS.MENU_ITEMS, filtered);
  broadcastChange('menu_updated', { id });
  return true;
};

// -----------------------------------------------------------------------------
// COUNTER MANAGEMENT
// -----------------------------------------------------------------------------

export const getCounters = async (businessId: string): Promise<Counter[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('counters').select('*').eq('business_id', businessId);
    if (error) {
      console.error('Supabase getCounters error:', error);
      return [];
    }
    return (data as Counter[]) || [];
  }
  const counters = getStored<Counter[]>(STORAGE_KEYS.COUNTERS, INITIAL_COUNTERS);
  return counters.filter(c => c.business_id === businessId);
};

export const createCounter = async (businessId: string, name: string, code: string): Promise<Counter> => {
  const newCounter: Counter = {
    id: crypto.randomUUID(),
    business_id: businessId,
    name,
    code,
    is_active: true,
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.from('counters').insert(newCounter).select().single();
      if (data) return data as Counter;
    } catch (e) {
      console.warn('Supabase counter error', e);
    }
  }

  const counters = getStored<Counter[]>(STORAGE_KEYS.COUNTERS, INITIAL_COUNTERS);
  counters.push(newCounter);
  setStored(STORAGE_KEYS.COUNTERS, counters);
  broadcastChange('counters_updated', newCounter);
  return newCounter;
};

export const toggleCounterStatus = async (id: string): Promise<Counter | null> => {
  const counters = getStored<Counter[]>(STORAGE_KEYS.COUNTERS, INITIAL_COUNTERS);
  const counter = counters.find(c => c.id === id);
  if (counter) {
    counter.is_active = !counter.is_active;
    setStored(STORAGE_KEYS.COUNTERS, counters);
    broadcastChange('counters_updated', counter);
    return counter;
  }
  return null;
};

// -----------------------------------------------------------------------------
// QUEUE MANAGEMENT & ATOMIC OPERATIONS
// -----------------------------------------------------------------------------

export const getBusinessQueue = async (businessId: string): Promise<QueueEntry[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*, counter:counters(*)')
      .eq('business_id', businessId)
      .in('status', ['waiting', 'called', 'serving'])
      .order('queue_sequence', { ascending: true });
    if (error) {
      console.error('Supabase getBusinessQueue error:', error);
      return [];
    }
    return (data as QueueEntry[]) || [];
  }

  const allQueues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []);
  return allQueues
    .filter(q => q.business_id === businessId && ['waiting', 'called', 'serving'].includes(q.status))
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
};

export const getCustomerActiveQueue = async (sessionId: string): Promise<QueueEntry | null> => {
  const currentSessionId = sessionId || getCustomerSessionId();

  if (isSupabaseConfigured() && supabase) {
    const { userId } = await ensureCustomerSession();

    let query = supabase
      .from('queue_entries')
      .select('*, business:businesses(*), counter:counters(*)')
      .in('status', ['waiting', 'called', 'serving']);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', currentSessionId);
    }

    const { data, error } = await query
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      // Calculate people ahead
      const { count } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', data.business_id)
        .eq('status', 'waiting')
        .lt('joined_at', data.joined_at);
      return {
        ...data,
        people_ahead: count || 0,
      } as QueueEntry;
    }
  }

  // Local fallback
  const queues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []);
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  const counters = getStored<Counter[]>(STORAGE_KEYS.COUNTERS, INITIAL_COUNTERS);

  const active = queues.find(q => q.session_id === currentSessionId && ['waiting', 'called', 'serving'].includes(q.status));
  if (!active) return null;

  // Calculate people ahead
  const waitingAhead = queues.filter(q =>
    q.business_id === active.business_id &&
    q.status === 'waiting' &&
    new Date(q.joined_at).getTime() < new Date(active.joined_at).getTime()
  ).length;

  const business = businesses.find(b => b.id === active.business_id);
  const counter = counters.find(c => c.id === active.counter_id);

  return {
    ...active,
    people_ahead: active.status === 'waiting' ? waitingAhead : 0,
    business,
    counter,
  };
};

export const getCustomerQueueHistory = async (sessionId: string): Promise<QueueEntry[]> => {
  const currentSessionId = sessionId || getCustomerSessionId();

  if (isSupabaseConfigured() && supabase) {
    const { userId } = await ensureCustomerSession();

    let query = supabase
      .from('queue_entries')
      .select('*, business:businesses(*)');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', currentSessionId);
    }

    const { data, error } = await query.order('joined_at', { ascending: false });
    if (!error && data) return data as QueueEntry[];
  }

  const queues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []);
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);

  return queues
    .filter(q => q.session_id === currentSessionId)
    .map(q => ({
      ...q,
      business: businesses.find(b => b.id === q.business_id),
    }))
    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
};

export const joinQueue = async (params: {
  businessId: string;
  customerName: string;
  customerPhone?: string;
  travelTimeMinutes?: number;
  notes?: string;
}): Promise<{ success: boolean; entry?: QueueEntry; message?: string }> => {
  const { sessionId } = await ensureCustomerSession();

  // Try Supabase RPC
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.rpc('rpc_join_queue', {
      p_business_id: params.businessId,
      p_session_id: sessionId,
      p_customer_name: params.customerName.trim(),
      p_customer_phone: params.customerPhone?.trim() || null,
      p_travel_time_minutes: params.travelTimeMinutes || 0,
      p_notes: params.notes?.trim() || null,
    });

    if (error) {
      console.error('Supabase rpc_join_queue error:', error);
      return { success: false, message: error.message };
    }

    if (data && data.success) {
      broadcastChange('queue_updated', { businessId: params.businessId });
      const active = await getCustomerActiveQueue(sessionId);
      if (active) return { success: true, entry: active };
      return {
        success: true,
        entry: {
          id: data.entry_id,
          business_id: params.businessId,
          session_id: sessionId,
          token_number: data.token_number,
          customer_name: params.customerName,
          status: 'waiting',
          estimated_wait_minutes: data.estimated_wait_minutes || 0,
          joined_at: new Date().toISOString(),
          people_ahead: data.people_ahead || 0,
        } as QueueEntry,
      };
    } else if (data && !data.success) {
      return { success: false, message: data.message };
    }
  }

  // Local storage atomic token generation
  const queues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []);
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  const business = businesses.find(b => b.id === params.businessId);

  if (!business) {
    return { success: false, message: 'Business not found.' };
  }
  if (!business.is_open) {
    return { success: false, message: 'This business queue is currently closed.' };
  }

  // Prevent duplicate active queue
  const existingActive = queues.find(
    q => q.business_id === params.businessId &&
      q.session_id === sessionId &&
      ['waiting', 'called', 'serving'].includes(q.status)
  );

  if (existingActive) {
    return {
      success: false,
      message: `You already have an active token (${existingActive.token_number}) in this queue.`,
    };
  }

  // Count waiting ahead
  const waitingAhead = queues.filter(q => q.business_id === params.businessId && q.status === 'waiting').length;
  const avgDuration = business.avg_service_time || 5;
  const estimatedWait = waitingAhead * avgDuration;

  // Generate sequential token number
  const prefix = business.token_prefix || 'Q';
  const bizTokens = queues
    .filter(q => q.business_id === params.businessId && q.token_number.startsWith(prefix))
    .map(q => parseInt(q.token_number.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));

  const nextNum = bizTokens.length > 0 ? Math.max(...bizTokens) + 1 : 101;
  const tokenNumber = `${prefix}${nextNum}`;

  const newEntry: QueueEntry = {
    id: crypto.randomUUID(),
    business_id: params.businessId,
    session_id: sessionId,
    token_number: tokenNumber,
    customer_name: params.customerName,
    customer_phone: params.customerPhone || null,
    status: 'waiting',
    notes: params.notes || null,
    travel_time_minutes: params.travelTimeMinutes || 0,
    estimated_wait_minutes: estimatedWait,
    joined_at: new Date().toISOString(),
    people_ahead: waitingAhead,
    business,
  };

  queues.push(newEntry);
  setStored(STORAGE_KEYS.QUEUE_ENTRIES, queues);
  broadcastChange('queue_updated', { businessId: params.businessId, entryId: newEntry.id });

  return { success: true, entry: newEntry };
};

export const advanceQueue = async (businessId: string, counterId?: string): Promise<{ success: boolean; advanced?: boolean; message?: string }> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.rpc('rpc_advance_queue', {
      p_business_id: businessId,
      p_counter_id: counterId || null,
    });
    if (error) {
      console.error('Supabase rpc_advance_queue error:', error);
      return { success: false, message: error.message };
    }
    if (data) {
      broadcastChange('queue_updated', { businessId });
      return data;
    }
  }

  // Local simulation
  const queues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []);

  // 1. Complete current serving
  for (const q of queues) {
    if (q.business_id === businessId && q.status === 'serving' && (!counterId || q.counter_id === counterId)) {
      q.status = 'completed';
      q.completed_at = new Date().toISOString();
    }
  }

  // 2. Find next waiting
  const nextWaiting = queues.find(q => q.business_id === businessId && q.status === 'waiting');
  if (nextWaiting) {
    nextWaiting.status = 'serving';
    nextWaiting.counter_id = counterId || null;
    nextWaiting.served_at = new Date().toISOString();
  }

  // 3. Recalculate estimated wait for remaining waiting
  const remainingWaiting = queues.filter(q => q.business_id === businessId && q.status === 'waiting');
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  const biz = businesses.find(b => b.id === businessId);
  const avg = biz?.avg_service_time || 5;

  remainingWaiting.forEach((entry, idx) => {
    entry.estimated_wait_minutes = idx * avg;
  });

  setStored(STORAGE_KEYS.QUEUE_ENTRIES, queues);
  broadcastChange('queue_updated', { businessId });
  return { success: true, advanced: Boolean(nextWaiting) };
};

export const updateQueueEntryStatus = async (
  entryId: string,
  status: QueueStatus,
  counterId?: string
): Promise<QueueEntry | null> => {
  // Always update local storage first so both offline and cross-tab preview modes stay 100% in sync
  const queues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []);
  const entry = queues.find(q => q.id === entryId);
  if (entry) {
    entry.status = status;
    if (counterId) entry.counter_id = counterId;
    if (status === 'called') entry.called_at = new Date().toISOString();
    if (status === 'serving') entry.served_at = new Date().toISOString();
    if (status === 'completed') entry.completed_at = new Date().toISOString();
    setStored(STORAGE_KEYS.QUEUE_ENTRIES, queues);
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'called') updates.called_at = new Date().toISOString();
      if (status === 'serving') {
        updates.served_at = new Date().toISOString();
        if (counterId) updates.counter_id = counterId;
      }
      if (status === 'completed') updates.completed_at = new Date().toISOString();

      const { data } = await supabase.from('queue_entries').update(updates).eq('id', entryId).select().single();
      if (data) {
        broadcastChange('queue_updated', { entryId, status });
        return data as QueueEntry;
      }
    } catch (e) {
      console.warn('Supabase update status error', e);
    }
  }

  if (entry) {
    broadcastChange('queue_updated', { businessId: entry.business_id, entryId, status });
  }
  return entry || null;
};

export const cancelQueueEntry = async (entryId: string): Promise<boolean> => {
  return (await updateQueueEntryStatus(entryId, 'cancelled')) !== null;
};

// -----------------------------------------------------------------------------
// ORDERS API
// -----------------------------------------------------------------------------

export const createOrder = async (params: {
  businessId: string;
  customerName: string;
  items: { menuItem: MenuItem; quantity: number }[];
  queueEntryId?: string;
  notes?: string;
}): Promise<Order> => {
  const { sessionId } = await ensureCustomerSession();

  if (isSupabaseConfigured() && supabase) {
    const rpcItems = params.items.map(it => ({
      menu_item_id: it.menuItem.id,
      quantity: it.quantity,
    }));

    const { data, error } = await supabase.rpc('rpc_create_order', {
      p_business_id: params.businessId,
      p_customer_name: params.customerName.trim(),
      p_items: rpcItems,
      p_queue_entry_id: params.queueEntryId || null,
      p_session_id: sessionId,
      p_notes: params.notes?.trim() || null,
    });

    if (error) {
      console.error('Supabase rpc_create_order error:', error);
      throw new Error(error.message);
    }

    if (data && data.success) {
      broadcastChange('orders_updated', { orderId: data.order_id });
      // Fetch the created order with trusted database items
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, items:order_items(*), business:businesses(*)')
        .eq('id', data.order_id)
        .single();

      if (orderData) {
        return orderData as Order;
      }

      return {
        id: data.order_id,
        business_id: params.businessId,
        session_id: sessionId,
        order_number: data.order_number,
        customer_name: params.customerName,
        total_amount: data.total_amount,
        status: 'pending',
        payment_status: 'pay_at_business',
        created_at: new Date().toISOString(),
      } as Order;
    } else if (data && !data.success) {
      throw new Error(data.message || 'Failed to place order.');
    }
  }

  // Local storage preview mode
  const totalAmount = params.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const orderNumber = 'ORD-' + Math.floor(100 + Math.random() * 900);
  const orderId = crypto.randomUUID();
  const orderItems = params.items.map(it => ({
    id: crypto.randomUUID(),
    order_id: orderId,
    menu_item_id: it.menuItem.id,
    item_name: it.menuItem.name,
    quantity: it.quantity,
    unit_price: it.menuItem.price,
    subtotal: it.menuItem.price * it.quantity,
  }));

  const newOrder: Order = {
    id: orderId,
    business_id: params.businessId,
    queue_entry_id: params.queueEntryId || null,
    session_id: sessionId,
    order_number: orderNumber,
    customer_name: params.customerName,
    total_amount: totalAmount,
    status: 'pending',
    payment_status: 'pay_at_business',
    notes: params.notes,
    created_at: new Date().toISOString(),
    items: orderItems,
  };

  const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, []);
  orders.unshift(newOrder);
  setStored(STORAGE_KEYS.ORDERS, orders);
  broadcastChange('orders_updated', newOrder);
  return newOrder;
};

export const getOrdersByBusiness = async (businessId: string): Promise<Order[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (!error && data) return data as Order[];
  }

  const allOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS, []);
  return allOrders.filter(o => o.business_id === businessId);
};

export const getCustomerOrders = async (sessionId?: string): Promise<Order[]> => {
  const currentSessionId = sessionId || getCustomerSessionId();
  if (isSupabaseConfigured() && supabase) {
    const { userId } = await ensureCustomerSession();

    let query = supabase
      .from('orders')
      .select('*, items:order_items(*), business:businesses(*)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', currentSessionId);
    }

    const { data, error } = await query;
    if (!error && data) return data as Order[];
  }

  const allOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS, []);
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  return allOrders
    .filter(o => o.session_id === currentSessionId)
    .map(o => ({
      ...o,
      business: businesses.find(b => b.id === o.business_id),
    }));
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order | null> => {
  // Always update local storage first so both offline and cross-tab preview modes stay 100% in sync
  const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, []);
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    setStored(STORAGE_KEYS.ORDERS, orders);
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update order status error:', error);
      } else if (data) {
        broadcastChange('orders_updated', { orderId, status });
        return data as Order;
      }
    } catch (err) {
      console.error('Error updating order status in Supabase:', err);
    }
  }

  broadcastChange('orders_updated', { orderId, status });
  return order || null;
};

// -----------------------------------------------------------------------------
// SETTINGS & ANALYTICS
// -----------------------------------------------------------------------------

export const getQueueSettings = async (businessId: string): Promise<QueueSettings> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('queue_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();
    if (!error && data) {
      return data as QueueSettings;
    }
  }

  const allSettings = getStored<Record<string, QueueSettings>>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  if (allSettings[businessId]) return allSettings[businessId];

  return {
    business_id: businessId,
    max_capacity: 50,
    avg_service_duration_min: 5,
    grace_period_min: 5,
    auto_advance: true,
    opening_time: '08:00',
    closing_time: '21:00',
    is_queue_open: true,
    congestion_threshold: 10,
  };
};

export const updateQueueSettings = async (businessId: string, updates: Partial<QueueSettings>): Promise<QueueSettings> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('queue_settings')
        .upsert({ business_id: businessId, ...updates })
        .select()
        .single();
      if (!error && data) {
        broadcastChange('settings_updated', data);
        return data as QueueSettings;
      }
    } catch (e) {
      console.warn('Supabase updateQueueSettings error:', e);
    }
  }

  const allSettings = getStored<Record<string, QueueSettings>>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  const current = allSettings[businessId] || {
    business_id: businessId,
    max_capacity: 50,
    avg_service_duration_min: 5,
    grace_period_min: 5,
    auto_advance: true,
    opening_time: '08:00',
    closing_time: '21:00',
    is_queue_open: true,
    congestion_threshold: 10,
  };

  const updated: QueueSettings = { ...current, ...updates };
  allSettings[businessId] = updated;
  setStored(STORAGE_KEYS.SETTINGS, allSettings);
  broadcastChange('settings_updated', updated);
  return updated;
};

export const getBusinessAnalytics = async (businessId: string) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: queues } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('business_id', businessId);

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId);

      const qList = queues || [];
      const oList = orders || [];

      const completed = qList.filter(q => q.status === 'completed');
      const missed = qList.filter(q => q.status === 'missed');
      const cancelled = qList.filter(q => q.status === 'cancelled');
      const waiting = qList.filter(q => q.status === 'waiting');
      const serving = qList.filter(q => q.status === 'serving');
      const completedOrders = oList.filter(o => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

      // Real historical average wait time calculation (minutes)
      let calculatedAvgWait = 0;
      if (completed.length > 0) {
        const totalWaitMs = completed.reduce((acc, curr) => {
          if (curr.completed_at && curr.joined_at) {
            const diff = new Date(curr.completed_at).getTime() - new Date(curr.joined_at).getTime();
            return acc + (diff > 0 ? diff : 0);
          }
          return acc;
        }, 0);
        calculatedAvgWait = Math.round((totalWaitMs / completed.length / 60000) * 10) / 10;
      }

      return {
        totalServed: completed.length,
        waitingCount: waiting.length,
        currentServing: serving[0]?.token_number || '—',
        missedCount: missed.length,
        cancelledCount: cancelled.length,
        todayOrdersCount: oList.length,
        totalRevenue,
        avgWaitMinutes: calculatedAvgWait,
        avgServiceMinutes: 3.8,
      };
    } catch (e) {
      console.warn('Supabase analytics fetch notice:', e);
    }
  }

  const queues = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE_ENTRIES, []).filter(q => q.business_id === businessId);
  const orders = getStored<Order[]>(STORAGE_KEYS.ORDERS, []).filter(o => o.business_id === businessId);

  const completed = queues.filter(q => q.status === 'completed');
  const missed = queues.filter(q => q.status === 'missed');
  const cancelled = queues.filter(q => q.status === 'cancelled');
  const waiting = queues.filter(q => q.status === 'waiting');
  const serving = queues.filter(q => q.status === 'serving');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const totalRevenue = completedOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  let calculatedAvgWait = 0;
  if (completed.length > 0) {
    const totalWaitMs = completed.reduce((acc, curr) => {
      if (curr.completed_at && curr.joined_at) {
        const diff = new Date(curr.completed_at).getTime() - new Date(curr.joined_at).getTime();
        return acc + (diff > 0 ? diff : 0);
      }
      return acc;
    }, 0);
    calculatedAvgWait = Math.round((totalWaitMs / completed.length / 60000) * 10) / 10;
  }

  return {
    totalServed: completed.length,
    waitingCount: waiting.length,
    currentServing: serving[0]?.token_number || '—',
    missedCount: missed.length,
    cancelledCount: cancelled.length,
    todayOrdersCount: orders.length,
    totalRevenue,
    avgWaitMinutes: calculatedAvgWait,
    avgServiceMinutes: 3.8,
  };
};

// -----------------------------------------------------------------------------
// AUTHENTICATION (BUSINESS OWNER)
// -----------------------------------------------------------------------------

export const getCurrentOwner = (): BusinessOwnerProfile | null => {
  return getStored<BusinessOwnerProfile | null>(STORAGE_KEYS.AUTH_OWNER, null);
};

export const setOwnerSession = (owner: BusinessOwnerProfile | null): void => {
  if (owner) {
    setStored(STORAGE_KEYS.AUTH_OWNER, owner);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_OWNER);
  }
  broadcastChange('auth_changed', owner);
};

export const fetchOwnerAndBusiness = async (
  userId: string,
  email?: string
): Promise<{ owner: BusinessOwnerProfile | null; business: Business | null }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profile || biz) {
        const owner: BusinessOwnerProfile = {
          id: userId,
          email: profile?.email || email || '',
          full_name: profile?.full_name || 'Business Owner',
          phone: profile?.phone,
          role: (profile?.role as any) || 'business_owner',
          business_id: biz?.id,
        };
        return { owner, business: (biz as Business) || null };
      }
    } catch (e) {
      console.warn('Error fetching owner and business from Supabase:', e);
    }
  }

  const current = getCurrentOwner();
  let biz: Business | null = null;
  if (current?.business_id) {
    biz = await getBusinessById(current.business_id);
  }
  return { owner: current, business: biz };
};

export const signInOwner = async (
  email: string,
  password?: string
): Promise<{ success: boolean; owner?: BusinessOwnerProfile; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured() && supabase) {
    if (!password) {
      return { success: false, message: 'Password is required to sign in.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error || !data.user) {
        return {
          success: false,
          message: error?.message || 'Invalid email or password.',
        };
      }

      // Fetch profile and business associated with authenticated user
      const { owner, business } = await fetchOwnerAndBusiness(data.user.id, data.user.email || cleanEmail);
      if (owner) {
        setOwnerSession(owner);
        return { success: true, owner };
      }

      // If profile record was not created yet, construct from user metadata
      const newOwnerProfile: BusinessOwnerProfile = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        full_name: data.user.user_metadata?.full_name || 'Business Owner',
        phone: data.user.user_metadata?.phone,
        role: 'business_owner',
        business_id: business?.id,
      };
      setOwnerSession(newOwnerProfile);
      return { success: true, owner: newOwnerProfile };
    } catch (err: unknown) {
      console.error('Supabase signInOwner error:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Authentication service error.',
      };
    }
  }

  // Preview / Offline Mode only (when Supabase is NOT configured)
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
  const biz = businesses.find(b => b.email?.toLowerCase() === cleanEmail);
  if (biz) {
    const owner: BusinessOwnerProfile = {
      id: biz.owner_id,
      email: biz.email || cleanEmail,
      full_name: biz.name.split("'")[0] || 'Business Owner',
      role: 'business_owner',
      business_id: biz.id,
    };
    setOwnerSession(owner);
    return { success: true, owner };
  }

  return { success: false, message: 'Business account not found with this email in offline mode.' };
};

export const signOutOwner = async (): Promise<void> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error', e);
    }
  }
  setOwnerSession(null);
};

// -----------------------------------------------------------------------------
// ADMIN MANAGEMENT API
// -----------------------------------------------------------------------------

export interface AdminBusinessOverview extends Business {
  owner_name?: string;
  owner_email?: string;
  total_queues?: number;
  total_orders?: number;
}

export const getAllBusinessesAdmin = async (): Promise<AdminBusinessOverview[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin businesses:', error);
        return [];
      }

      return (businesses || []).map((b: any) => ({
        ...b,
        owner_name: b.profiles?.full_name || 'Business Owner',
        owner_email: b.profiles?.email || b.email || '',
      }));
    } catch (err) {
      console.error('Admin get businesses failed:', err);
      return [];
    }
  }

  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
  return businesses.map(b => ({
    ...b,
    owner_name: b.name.split("'")[0] || 'Business Owner',
    owner_email: b.email,
  }));
};

export const deleteBusinessAdmin = async (businessId: string): Promise<{ success: boolean; message?: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('rpc_admin_delete_business', {
        p_business_id: businessId,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data && data.success === false) {
        return { success: false, message: data.message };
      }

      broadcastChange('business_deleted', { id: businessId });
      return { success: true, message: data?.message || 'Business deleted successfully.' };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Deletion failed' };
    }
  }

  // Offline / preview mode fallback
  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
  const filtered = businesses.filter(b => b.id !== businessId);
  setStored(STORAGE_KEYS.BUSINESSES, filtered);
  broadcastChange('business_deleted', { id: businessId });
  return { success: true, message: 'Business deleted from local store.' };
};

export const toggleBusinessOpenStatusAdmin = async (
  businessId: string,
  isOpen: boolean
): Promise<{ success: boolean; message?: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_open: isOpen, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (error) {
        return { success: false, message: error.message };
      }
      broadcastChange('business_updated', { id: businessId, is_open: isOpen });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Update failed' };
    }
  }

  const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
  const biz = businesses.find(b => b.id === businessId);
  if (biz) {
    biz.is_open = isOpen;
    setStored(STORAGE_KEYS.BUSINESSES, businesses);
    broadcastChange('business_updated', { id: businessId, is_open: isOpen });
  }
  return { success: true };
};

// -----------------------------------------------------------------------------
// CUSTOMER AUTHENTICATION & PROFILE API
// -----------------------------------------------------------------------------

export const getCurrentCustomer = (): CustomerProfile | null => {
  return getStored<CustomerProfile | null>(STORAGE_KEYS.AUTH_CUSTOMER, null);
};

export const setCustomerSession = (customer: CustomerProfile | null): void => {
  if (customer) {
    setStored(STORAGE_KEYS.AUTH_CUSTOMER, customer);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_CUSTOMER);
  }
  broadcastChange('customer_auth_changed', customer);
};

// Helper to format phone as an internal auth email if no real email is provided
export const phoneToAuthEmail = (phone: string): string => {
  const digits = phone.replace(/[^0-9]/g, '');
  return `customer_${digits}@virtualq.internal`;
};

export const registerCustomer = async (data: {
  fullName: string;
  email?: string;
  phone: string;
  password: string;
}): Promise<{ success: boolean; customer?: CustomerProfile; message?: string }> => {
  const cleanPhone = data.phone.trim();
  const cleanEmail = data.email && data.email.trim() ? data.email.trim().toLowerCase() : phoneToAuthEmail(cleanPhone);

  const client = customerSupabase || supabase;
  if (isSupabaseConfigured() && client) {
    try {
      const { data: authData, error: authError } = await client.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName.trim(),
            phone: cleanPhone,
            role: 'customer',
          },
        },
      });

      if (authError || !authData.user) {
        return {
          success: false,
          message: authError?.message || 'Failed to register customer account.',
        };
      }

      const newCustomer: CustomerProfile = {
        id: authData.user.id,
        email: cleanEmail,
        full_name: data.fullName.trim(),
        phone: cleanPhone,
        role: 'customer',
        created_at: new Date().toISOString(),
      };

      // Upsert profile record
      await client.from('profiles').upsert({
        id: authData.user.id,
        full_name: data.fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        role: 'customer',
        updated_at: new Date().toISOString(),
      });

      setCustomerSession(newCustomer);
      return { success: true, customer: newCustomer };
    } catch (err: unknown) {
      console.error('Customer registration error:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Registration failed.',
      };
    }
  }

  // Offline preview fallback
  const mockCustomer: CustomerProfile = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    full_name: data.fullName.trim(),
    phone: cleanPhone,
    role: 'customer',
    created_at: new Date().toISOString(),
  };
  setCustomerSession(mockCustomer);
  return { success: true, customer: mockCustomer };
};

export const signInCustomer = async (
  identifier: string, // email OR mobile number
  password: string
): Promise<{ success: boolean; customer?: CustomerProfile; message?: string }> => {
  const cleanIdentifier = identifier.trim().toLowerCase();
  // Determine if identifier is an email or mobile number
  const isEmail = cleanIdentifier.includes('@');
  const authEmail = isEmail ? cleanIdentifier : phoneToAuthEmail(cleanIdentifier);

  const client = customerSupabase || supabase;
  if (isSupabaseConfigured() && client) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error || !data.user) {
        return {
          success: false,
          message: error?.message || 'Invalid credentials or password.',
        };
      }

      // Fetch profile
      const { data: profile } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const customer: CustomerProfile = {
        id: data.user.id,
        email: profile?.email || data.user.email || authEmail,
        full_name: profile?.full_name || data.user.user_metadata?.full_name || 'Customer',
        phone: profile?.phone || data.user.user_metadata?.phone,
        role: 'customer',
      };

      setCustomerSession(customer);
      return { success: true, customer };
    } catch (err: unknown) {
      console.error('Customer login error:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Login failed.',
      };
    }
  }

  // Offline preview fallback
  const customer: CustomerProfile = {
    id: crypto.randomUUID(),
    email: authEmail,
    full_name: isEmail ? cleanIdentifier.split('@')[0] : `Customer (${cleanIdentifier})`,
    phone: !isEmail ? cleanIdentifier : undefined,
    role: 'customer',
  };
  setCustomerSession(customer);
  return { success: true, customer };
};

export const signOutCustomer = async (): Promise<void> => {
  const client = customerSupabase || supabase;
  if (isSupabaseConfigured() && client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Customer sign out error:', e);
    }
  }
  setCustomerSession(null);
};

