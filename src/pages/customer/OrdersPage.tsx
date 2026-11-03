import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Order } from '../../types';
import { getCustomerOrders } from '../../services/api';
import { isSupabaseConfigured, supabase, customerSupabase } from '../../lib/supabase';

interface OrdersPageProps {
  navigate: (route: string) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ navigate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await getCustomerOrders();
      setOrders(res);
      setLoading(false);
    };
    load();

    const handleRealtime = () => {
      load();
    };
    window.addEventListener('vq_realtime_event', handleRealtime);

    // Supabase Realtime subscription for instant live customer order updates
    let channel: any = null;
    const client = customerSupabase || supabase;
    if (isSupabaseConfigured() && client) {
      channel = client
        .channel('public:orders_customer')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            load();
          }
        )
        .subscribe();
    }

    const interval = setInterval(load, 4000);

    return () => {
      window.removeEventListener('vq_realtime_event', handleRealtime);
      if (channel && client) {
        (client as any).removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171412] tracking-tight mb-2">
          Your Placed Orders
        </h1>
        <p className="text-xs sm:text-sm text-[#766B63] mb-8">
          Pre-ordered items to collect upon arrival at the business counter.
        </p>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-[#EFECE6] text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF6F0] flex items-center justify-center text-[#9E8E81] mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-[#A89889]" />
            </div>
            <h3 className="text-lg font-bold text-[#171412]">No Orders Yet</h3>
            <p className="text-xs text-[#766B63] max-w-sm mx-auto mt-1 leading-relaxed">
              When you add items from a business menu, they will appear here with live preparation status.
            </p>
            <button
              onClick={() => navigate('/discover')}
              className="mt-6 px-6 py-3 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-xs shadow-sm hover:bg-[#2A150A] transition-all cursor-pointer"
            >
              Browse Menus
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F5F2EC]">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#8C8075]">
                      {order.order_number}
                    </span>
                    <h3 className="text-base font-bold text-[#171412] mt-0.5">
                      {order.business?.name || 'Local Business'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      order.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : order.status === 'ready'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200 animate-pulse'
                        : order.status === 'preparing'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : order.status === 'accepted'
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        : order.status === 'cancelled' || order.status === 'rejected'
                        ? 'bg-red-100 text-red-900 border border-red-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {order.status === 'ready' ? 'Ready for Pickup' : order.status}
                    </span>
                    <span className="text-xs text-[#8C8075]">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Items list */}
                <div className="flex flex-col gap-2 text-xs">
                  {order.items?.map(it => (
                    <div key={it.id} className="flex items-center justify-between py-1">
                      <span className="text-[#171412] font-medium">
                        {it.quantity}x {it.item_name}
                      </span>
                      <span className="font-mono text-[#766B63]">₹{it.subtotal}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#F5F2EC] flex items-center justify-between text-xs">
                  <span className="text-[#766B63]">
                    Payment: <strong className="text-[#171412]">Pay at Counter</strong>
                  </span>
                  <div className="flex items-center gap-1.5 text-base font-bold text-[#171412] font-mono">
                    <span>Total:</span>
                    <span>₹{order.total_amount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
