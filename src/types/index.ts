export type BusinessCategory = 
  | 'All' 
  | 'Restaurants' 
  | 'Cafes' 
  | 'Salons' 
  | 'Clinics' 
  | 'Services' 
  | 'Other';

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  category: 'Restaurants' | 'Cafes' | 'Salons' | 'Clinics' | 'Services' | 'Other';
  description?: string;
  location: string;
  banner_url?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  is_open: boolean;
  rating: number;
  review_count: number;
  avg_service_time: number; // in minutes
  token_prefix: string;
  created_at: string;
  updated_at?: string;
}

export interface Counter {
  id: string;
  business_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
}

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled' | 'missed';

export interface QueueEntry {
  id: string;
  business_id: string;
  counter_id?: string | null;
  user_id?: string | null;
  session_id: string;
  token_number: string;
  queue_sequence?: number;
  customer_name: string;
  customer_phone?: string | null;
  status: QueueStatus;
  notes?: string | null;
  travel_time_minutes?: number;
  estimated_wait_minutes: number;
  joined_at: string;
  called_at?: string | null;
  served_at?: string | null;
  completed_at?: string | null;
  // Augmented client-side fields
  people_ahead?: number;
  business?: Business;
  counter?: Counter;
}

export interface MenuItem {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category: string;
  is_available: boolean;
  created_at?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'rejected' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  business_id: string;
  queue_entry_id?: string | null;
  user_id?: string | null;
  session_id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_status: 'pay_at_business' | 'paid';
  notes?: string;
  created_at: string;
  items?: OrderItem[];
  business?: Business;
}

export interface CustomerProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'customer';
  created_at?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  order_id?: string | null;
  order_number?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface QueueSettings {
  id?: string;
  business_id: string;
  max_capacity: number;
  avg_service_duration_min: number;
  grace_period_min: number;
  auto_advance: boolean;
  opening_time: string;
  closing_time: string;
  is_queue_open: boolean;
  congestion_threshold: number;
}

export interface BusinessOwnerProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'business_owner' | 'staff' | 'admin';
  business_id?: string;
}
