import { Business, Counter, MenuItem, QueueEntry, Order, QueueSettings } from '../types';

/**
 * Clean production mock dataset: Empty arrays.
 * Virtual-Q connects to Supabase PostgreSQL in production.
 * Real businesses, menus, and queues are generated through live registrations.
 */
export const INITIAL_BUSINESSES: Business[] = [];
export const INITIAL_MENU_ITEMS: MenuItem[] = [];
export const INITIAL_COUNTERS: Counter[] = [];
export const INITIAL_SETTINGS: Record<string, QueueSettings> = {};
export const INITIAL_QUEUE_ENTRIES: QueueEntry[] = [];
export const INITIAL_ORDERS: Order[] = [];
