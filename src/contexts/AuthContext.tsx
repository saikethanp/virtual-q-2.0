import React, { createContext, useContext, useState, useEffect } from 'react';
import { BusinessOwnerProfile, Business, CustomerProfile } from '../types';
import { 
  getCurrentOwner, 
  signInOwner, 
  signOutOwner, 
  registerBusiness, 
  getBusinessById,
  fetchOwnerAndBusiness,
  getCurrentCustomer,
  signInCustomer,
  registerCustomer,
  signOutCustomer
} from '../services/api';
import { supabase, customerSupabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  owner: BusinessOwnerProfile | null;
  business: Business | null;
  customer: CustomerProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    ownerName: string;
    email: string;
    phone: string;
    password?: string;
    businessName: string;
    category: 'Restaurants' | 'Cafes' | 'Salons' | 'Clinics' | 'Services' | 'Other';
    location: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshOwnerBusiness: () => Promise<void>;
  // Customer Authentication Methods
  customerLogin: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  customerRegister: (data: {
    fullName: string;
    email?: string;
    phone: string;
    password: string;
  }) => Promise<{ success: boolean; message?: string }>;
  customerLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [owner, setOwner] = useState<BusinessOwnerProfile | null>(() => getCurrentOwner());
  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => getCurrentCustomer());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshOwnerBusiness = async () => {
    // 1. Check Customer Session (Isolated Client)
    if (isSupabaseConfigured() && customerSupabase) {
      try {
        const { data: { session } } = await customerSupabase.auth.getSession();
        if (session?.user && !session.user.is_anonymous) {
          const { data: profile } = await customerSupabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const cust: CustomerProfile = {
            id: session.user.id,
            email: profile?.email || session.user.email || '',
            full_name: profile?.full_name || 'Customer',
            phone: profile?.phone,
            role: 'customer',
          };
          setCustomer(cust);
        } else {
          setCustomer(getCurrentCustomer());
        }
      } catch (err) {
        setCustomer(getCurrentCustomer());
      }
    } else {
      setCustomer(getCurrentCustomer());
    }

    // 2. Check Owner Session (Isolated Client)
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !session.user.is_anonymous) {
          const { owner: currentOwner, business: currentBiz } = await fetchOwnerAndBusiness(session.user.id, session.user.email);
          setOwner(currentOwner);
          setBusiness(currentBiz);
          setLoading(false);
          return;
        } else {
          setOwner(null);
          setBusiness(null);
        }
      } catch (err) {
        console.warn('Error refreshing owner session:', err);
      }
    }

    const current = getCurrentOwner();
    setOwner(current);
    if (current?.business_id) {
      const biz = await getBusinessById(current.business_id);
      setBusiness(biz);
    } else {
      setBusiness(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshOwnerBusiness();

    // Listen to Supabase auth events for realtime session transitions
    let ownerSub: { unsubscribe: () => void } | null = null;
    let custSub: { unsubscribe: () => void } | null = null;

    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user && !session.user.is_anonymous) {
            const { owner: currentOwner, business: currentBiz } = await fetchOwnerAndBusiness(session.user.id, session.user.email);
            setOwner(currentOwner);
            setBusiness(currentBiz);
          }
        } else if (event === 'SIGNED_OUT') {
          setOwner(null);
          setBusiness(null);
        }
      });
      ownerSub = data.subscription;
    }

    if (isSupabaseConfigured() && customerSupabase) {
      const custClient = customerSupabase;
      const { data } = custClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user && !session.user.is_anonymous) {
            const { data: profile } = await custClient
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            setCustomer({
              id: session.user.id,
              email: profile?.email || session.user.email || '',
              full_name: profile?.full_name || 'Customer',
              phone: profile?.phone,
              role: 'customer',
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setCustomer(null);
        }
      });
      custSub = data.subscription;
    }

    const handleAuthChange = () => {
      refreshOwnerBusiness();
    };
    window.addEventListener('vq_realtime_event', handleAuthChange);

    return () => {
      window.removeEventListener('vq_realtime_event', handleAuthChange);
      ownerSub?.unsubscribe();
      custSub?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    const result = await signInOwner(email, password);
    if (result.success && result.owner) {
      setOwner(result.owner);
      setCustomer(null);
      if (result.owner.business_id) {
        const biz = await getBusinessById(result.owner.business_id);
        setBusiness(biz);
      }
      setLoading(false);
      return { success: true };
    }
    setLoading(false);
    return { success: false, message: result.message || 'Invalid email or password.' };
  };

  const register = async (data: Parameters<typeof registerBusiness>[0]) => {
    setLoading(true);
    try {
      const result = await registerBusiness(data);
      setOwner(result.owner);
      setBusiness(result.business);
      setCustomer(null);
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setLoading(false);
      return { success: false, message: err instanceof Error ? err.message : 'Registration failed' };
    }
  };

  const logout = async () => {
    await signOutOwner();
    setOwner(null);
    setBusiness(null);
  };

  // Customer Auth Methods
  const customerLogin = async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    const result = await signInCustomer(identifier, password);
    if (result.success && result.customer) {
      setCustomer(result.customer);
      setOwner(null);
      setBusiness(null);
      setLoading(false);
      return { success: true };
    }
    setLoading(false);
    return { success: false, message: result.message || 'Invalid mobile number, email, or password.' };
  };

  const customerRegister = async (data: {
    fullName: string;
    email?: string;
    phone: string;
    password: string;
  }): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    const result = await registerCustomer(data);
    if (result.success && result.customer) {
      setCustomer(result.customer);
      setOwner(null);
      setBusiness(null);
      setLoading(false);
      return { success: true };
    }
    setLoading(false);
    return { success: false, message: result.message || 'Registration failed.' };
  };

  const customerLogout = async () => {
    await signOutCustomer();
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{
      owner,
      business,
      customer,
      loading,
      login,
      register,
      logout,
      refreshOwnerBusiness,
      customerLogin,
      customerRegister,
      customerLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
