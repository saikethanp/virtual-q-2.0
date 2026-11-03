import React from 'react';
import { 
  Clock, 
  Users, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  UtensilsCrossed,
  ChefHat,
  Check
} from 'lucide-react';
import { useQueue } from '../../contexts/QueueContext';
import { SmartArrivalWidget } from '../../components/SmartArrivalWidget';

interface MyQueuePageProps {
  navigate: (route: string) => void;
}

export const MyQueuePage: React.FC<MyQueuePageProps> = ({ navigate }) => {
  const { activeQueue, queueHistory, activeOrders, loading, leave, refreshQueue } = useQueue();

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel your queue token? This cannot be undone.')) {
      await leave();
    }
  };

  const hasActiveContent = Boolean(activeQueue || (activeOrders && activeOrders.length > 0));

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171412] tracking-tight">
              My Live Queue
            </h1>
            <p className="text-xs sm:text-sm text-[#766B63] mt-1">
              Real-time digital token tracking, placed food orders, and live kitchen updates.
            </p>
          </div>
          <button
            onClick={refreshQueue}
            className="p-2.5 rounded-full bg-white border border-[#E0D8CE] text-[#766B63] hover:text-[#171412] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Live Active Content Section */}
        {hasActiveContent ? (
          <div className="flex flex-col gap-6">
            {/* Live Token Card (If in queue) */}
            {activeQueue && (
              <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F5F2EC]">
                  <div>
                    <span className="text-xs font-semibold text-[#8C8075] tracking-wide uppercase">
                      Active Reservation
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#171412] mt-0.5">
                      {activeQueue.business?.name || 'Selected Business'}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-[#766B63] mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#9E948C]" />
                      <span>{activeQueue.business?.location || 'Angallu, MITS'}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold ${
                      activeQueue.status === 'serving'
                        ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400/40'
                        : activeQueue.status === 'called'
                        ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400/40 animate-pulse'
                        : 'bg-stone-100 text-stone-800'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        activeQueue.status === 'serving' ? 'bg-emerald-600' : activeQueue.status === 'called' ? 'bg-amber-600' : 'bg-stone-500'
                      }`} />
                      <span className="capitalize">{activeQueue.status}</span>
                    </span>
                  </div>
                </div>

                {/* Main Token Display Box */}
                <div className="my-8 p-8 rounded-3xl bg-gradient-to-b from-[#FAF6F0] to-[#F5ECE1] border border-[#EBE3D7] text-center shadow-inner">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8A796E]">
                    Your Digital Token
                  </span>
                  <div className="text-6xl sm:text-7xl font-black text-[#171412] tracking-tight mt-1 font-mono">
                    {activeQueue.token_number}
                  </div>
                  <p className="text-xs text-[#766B63] mt-2">
                    Reserved for: <strong>{activeQueue.customer_name}</strong>
                  </p>
                </div>

                {/* Position and Wait Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] text-center">
                    <span className="text-xs text-[#8A796E] font-medium block">People Ahead</span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Users className="w-4 h-4 text-[#A89A8E]" />
                      <span className="text-2xl font-bold text-[#171412] font-mono tabular-nums">
                        {activeQueue.people_ahead ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] text-center">
                    <span className="text-xs text-[#8A796E] font-medium block">Est. Wait Time</span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Clock className="w-4 h-4 text-[#A89A8E]" />
                      <span className="text-2xl font-bold text-[#171412] font-mono tabular-nums">
                        ~{activeQueue.estimated_wait_minutes}m
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] text-center">
                    <span className="text-xs text-[#8A796E] font-medium block">Assigned Counter</span>
                    <div className="mt-1">
                      <span className="text-base font-bold text-[#171412]">
                        {activeQueue.counter?.name || 'Main Counter'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Smart Arrival Assistant */}
                <SmartArrivalWidget />

                {/* Bottom Actions */}
                <div className="mt-6 pt-5 border-t border-[#F5F2EC] flex items-center justify-between">
                  <button
                    onClick={handleCancel}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Leave / Cancel Token
                  </button>

                  {activeQueue.business?.slug && (
                    <button
                      onClick={() => navigate(`/business/${activeQueue.business?.slug}`)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#3D2010] hover:underline cursor-pointer"
                    >
                      <span>View Business Menu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active Placed Orders Section (Live Updates from Business Dashboard) */}
            {activeOrders && activeOrders.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#171412] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#3D2010]" />
                    <span>Your Live Food Orders</span>
                  </h2>
                  <span className="text-xs text-[#766B63]">
                    Updates live when kitchen changes status
                  </span>
                </div>

                {activeOrders.map(order => (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F5F2EC]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-[#171412]">
                            {order.order_number}
                          </span>
                          {order.business?.name && (
                            <span className="text-xs font-medium text-[#766B63]">
                              · {order.business.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8C8075] mt-0.5">
                          Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Pay at counter
                        </p>
                      </div>

                      {/* Live Order Status Badge */}
                      <div className="shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                          order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : order.status === 'ready'
                            ? 'bg-green-100 text-green-900 border border-green-300 ring-2 ring-green-400/40 animate-pulse'
                            : order.status === 'preparing'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400/40 animate-pulse'
                            : order.status === 'accepted'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : order.status === 'cancelled'
                            ? 'bg-stone-100 text-stone-600'
                            : 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                        }`}>
                          {order.status === 'preparing' && <ChefHat className="w-3.5 h-3.5 text-amber-700" />}
                          {order.status === 'ready' && <Check className="w-3.5 h-3.5 text-green-700" />}
                          {order.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                          <span className="capitalize">
                            {order.status === 'preparing' ? 'Preparing in Kitchen' :
                             order.status === 'ready' ? 'Ready for Pickup!' :
                             order.status === 'completed' ? 'Order Completed' :
                             order.status === 'accepted' ? 'Order Accepted' :
                             order.status === 'cancelled' ? 'Order Cancelled' : 'Order Received (Pending)'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Order Items List */}
                    {order.items && order.items.length > 0 && (
                      <div className="py-4 border-b border-[#F5F2EC] flex flex-col gap-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-[#171412] font-medium">
                              <strong className="text-[#3D2010] font-mono mr-1">{item.quantity}x</strong>
                              {item.item_name || 'Menu item'}
                            </span>
                            <span className="font-mono text-[#766B63]">
                              ₹{item.subtotal || item.unit_price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Order Footer */}
                    <div className="pt-3 flex items-center justify-between text-xs">
                      <span className="text-[#766B63]">
                        {order.status === 'preparing' 
                          ? '🔥 The kitchen is preparing your fresh meal.' 
                          : order.status === 'accepted'
                          ? '👍 Your order has been accepted by the business.'
                          : order.status === 'ready' 
                          ? '🔔 Your order is ready! Please collect it at the counter.' 
                          : order.status === 'completed'
                          ? '✨ Enjoy your meal! Thank you for ordering.'
                          : order.status === 'cancelled'
                          ? '❌ This order was cancelled.'
                          : '⏳ Your order has been placed and is waiting for kitchen confirmation.'}
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-[#766B63] block">Total</span>
                        <span className="text-sm font-bold text-[#171412] font-mono">₹{order.total_amount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 border border-[#EFECE6] text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF6F0] flex items-center justify-center text-[#9E8E81] mx-auto mb-4">
              <Clock className="w-8 h-8 text-[#A89889]" />
            </div>
            <h3 className="text-lg font-bold text-[#171412]">No Active Queue or Orders</h3>
            <p className="text-xs sm:text-sm text-[#766B63] max-w-sm mx-auto mt-1 leading-relaxed">
              You do not have any active waiting tokens or placed orders right now. Explore businesses to join a virtual queue or place a food order.
            </p>
            <button
              onClick={() => navigate('/discover')}
              className="mt-6 px-6 py-3 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-xs shadow-sm hover:bg-[#2A150A] transition-all cursor-pointer"
            >
              Explore Businesses
            </button>
          </div>
        )}

        {/* Previous Queue History Section (Section 5.6) */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#171412] mb-4">
            Recent Queue History
          </h2>

          {queueHistory.length === 0 ? (
            <p className="text-xs text-[#766B63] bg-white p-6 rounded-2xl border border-[#EFECE6]">
              No previous queue visits recorded on this device yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {queueHistory.map(entry => (
                <div
                  key={entry.id}
                  className="bg-white rounded-2xl p-4 border border-[#EFECE6] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#171412] text-sm block">
                      {entry.business?.name || 'Local Business'}
                    </span>
                    <span className="text-[#8C8075]">
                      Token: <strong className="font-mono text-[#171412]">{entry.token_number}</strong> · {new Date(entry.joined_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                      entry.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : entry.status === 'cancelled'
                        ? 'bg-stone-100 text-stone-600'
                        : 'bg-amber-50 text-amber-800'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
