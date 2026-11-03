import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QueueEntry } from '../types';
import { 
  getCustomerActiveQueue, 
  getCustomerQueueHistory, 
  joinQueue as apiJoinQueue, 
  cancelQueueEntry as apiCancelQueue,
  updateQueueEntryStatus
} from '../services/api';
import { getCustomerSessionId, ensureCustomerSession, isSupabaseConfigured, supabase, customerSupabase } from '../lib/supabase';

interface QueueContextType {
  activeQueue: QueueEntry | null;
  queueHistory: QueueEntry[];
  loading: boolean;
  join: (businessId: string, customerName: string, customerPhone?: string, travelMinutes?: number, notes?: string) => Promise<{ success: boolean; message?: string }>;
  leave: () => Promise<boolean>;
  refreshQueue: () => Promise<void>;
  updateTravelDuration: (minutes: number) => Promise<void>;
  arrivalInfo: {
    recommendedDepartureText: string;
    isApproaching: boolean;
    minutesUntilDeparture: number;
    arrivalStatusText: string;
  };
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [travelMinutes, setTravelMinutes] = useState<number>(0);

  const sessionId = getCustomerSessionId();

  const refreshQueue = useCallback(async () => {
    try {
      const active = await getCustomerActiveQueue(sessionId);
      const history = await getCustomerQueueHistory(sessionId);
      setActiveQueue(active);
      setQueueHistory(history);
      if (active?.travel_time_minutes) {
        setTravelMinutes(active.travel_time_minutes);
      }
    } catch (err) {
      console.error('Error refreshing queue:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    ensureCustomerSession().finally(() => {
      refreshQueue();
    });

    // Listen for custom real-time events across windows/components
    const handleRealtime = () => {
      refreshQueue();
    };
    window.addEventListener('vq_realtime_event', handleRealtime);

    // Supabase Realtime subscription if configured
    let channel: any = null;
    const client = customerSupabase || supabase;
    if (isSupabaseConfigured() && client) {
      channel = client
        .channel('public:queue_entries')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'queue_entries' },
          () => {
            refreshQueue();
          }
        )
        .subscribe();
    }

    // Fast refresh interval (3 seconds) for live queue transitions
    const interval = setInterval(refreshQueue, 3000);

    return () => {
      window.removeEventListener('vq_realtime_event', handleRealtime);
      if (channel && supabase) {
        (supabase as any).removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [refreshQueue]);

  const join = async (
    businessId: string, 
    customerName: string, 
    customerPhone?: string, 
    travelMins = 0, 
    notes?: string
  ) => {
    setLoading(true);
    const res = await apiJoinQueue({
      businessId,
      customerName,
      customerPhone,
      travelTimeMinutes: travelMins,
      notes,
    });
    setLoading(false);
    if (res.success && res.entry) {
      setActiveQueue(res.entry);
      setTravelMinutes(travelMins);
      refreshQueue();
    }
    return res;
  };

  const leave = async (): Promise<boolean> => {
    if (!activeQueue) return false;
    const ok = await apiCancelQueue(activeQueue.id);
    if (ok) {
      setActiveQueue(null);
      refreshQueue();
    }
    return ok;
  };

  const updateTravelDuration = async (minutes: number) => {
    setTravelMinutes(minutes);
    if (activeQueue) {
      setActiveQueue(prev => prev ? { ...prev, travel_time_minutes: minutes } : null);
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('queue_entries').update({ travel_time_minutes: minutes }).eq('id', activeQueue.id);
      }
    }
  };

  // Smart Arrival Assistant calculation
  const calculateArrival = () => {
    if (!activeQueue) {
      return {
        recommendedDepartureText: 'No active queue',
        isApproaching: false,
        minutesUntilDeparture: 0,
        arrivalStatusText: 'Ready',
      };
    }

    const estWaitMinutes = activeQueue.estimated_wait_minutes || 0;
    const peopleAhead = activeQueue.people_ahead ?? 0;
    const bufferMinutes = 3; // small safety buffer
    const travelTime = travelMinutes || activeQueue.travel_time_minutes || 0;

    // Time until service minus travel minus buffer
    const minutesUntilDeparture = Math.max(0, estWaitMinutes - travelTime - bufferMinutes);

    const now = new Date();
    const departureDate = new Date(now.getTime() + minutesUntilDeparture * 60000);
    const timeStr = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let isApproaching = false;
    let arrivalStatusText = 'On track';

    if (activeQueue.status === 'serving') {
      arrivalStatusText = 'Currently Serving Your Turn!';
      isApproaching = true;
    } else if (activeQueue.status === 'called') {
      arrivalStatusText = 'Your Token Has Been Called!';
      isApproaching = true;
    } else if (peopleAhead <= 2 || minutesUntilDeparture <= 2) {
      arrivalStatusText = 'Get Ready / Depart Now';
      isApproaching = true;
    } else {
      arrivalStatusText = `Depart by ${timeStr}`;
    }

    return {
      recommendedDepartureText: minutesUntilDeparture <= 2 ? 'Depart Now' : `Depart at ${timeStr}`,
      isApproaching,
      minutesUntilDeparture,
      arrivalStatusText,
    };
  };

  return (
    <QueueContext.Provider value={{
      activeQueue,
      queueHistory,
      loading,
      join,
      leave,
      refreshQueue,
      updateTravelDuration,
      arrivalInfo: calculateArrival(),
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within a QueueProvider');
  return context;
};
