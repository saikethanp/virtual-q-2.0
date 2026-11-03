import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  Users,
  Check,
  AlertCircle,
  Share2,
  QrCode
} from 'lucide-react';
import { Business, MenuItem } from '../../types';
import { getBusinessBySlug, getMenuItems, createOrder } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useQueue } from '../../contexts/QueueContext';
import { useAuth } from '../../contexts/AuthContext';
import { QRCodeModal } from '../../components/QRCodeModal';
import { CustomerAuthModal } from '../../components/CustomerAuthModal';

interface BusinessDetailsPageProps {
  slug: string;
  navigate: (route: string) => void;
}

export const BusinessDetailsPage: React.FC<BusinessDetailsPageProps> = ({ slug, navigate }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Queue join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [travelMinutes, setTravelMinutes] = useState(10);
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');

  const { items, addToCart, removeFromCart, updateQuantity, clearCart, subtotal } = useCart();
  const { activeQueue, join } = useQueue();
  const { customer } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const biz = await getBusinessBySlug(slug);
      setBusiness(biz);
      if (biz) {
        const items = await getMenuItems(biz.id);
        setMenuItems(items);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D2010]" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-8 max-w-lg mx-auto text-center">
        <h2 className="text-xl font-bold text-[#171412]">Business not found</h2>
        <p className="text-sm text-[#766B63] mt-2">The business you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/discover')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[#3D2010] text-white font-semibold text-sm cursor-pointer"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
  });

  const handleJoinQueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setJoinError('Please enter your name.');
      return;
    }
    setJoining(true);
    setJoinError('');

    const res = await join(business.id, customerName.trim(), customerPhone.trim() || undefined, travelMinutes);
    setJoining(false);

    if (res.success) {
      setShowJoinModal(false);
      navigate('/my-queue');
    } else {
      setJoinError(res.message || 'Could not join queue.');
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    // Check if customer is authenticated
    if (!customer) {
      setShowAuthModal(true);
      return;
    }

    setOrderPlacing(true);
    setOrderError('');
    try {
      await createOrder({
        businessId: business.id,
        customerName: customer.full_name || activeQueue?.customer_name || 'Customer',
        queueEntryId: activeQueue?.id,
        items,
        notes: 'Pay at counter',
      });
      clearCart();
      setOrderSuccess(true);
      setTimeout(() => {
        setOrderSuccess(false);
        navigate('/orders');
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      if (msg.includes('Authentication required')) {
        setShowAuthModal(true);
      } else {
        setOrderError(msg);
      }
    } finally {
      setOrderPlacing(false);
    }
  };

  const isCurrentBusinessInCart = items.length === 0 || items[0]?.menuItem.business_id === business.id;

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Top back navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
        <button
          onClick={() => navigate('/discover')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#63554A] hover:text-[#171412] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Business Header Card matching Reference 3 */}
        <div className="bg-white rounded-3xl border border-[#EFECE6] overflow-hidden shadow-sm mb-8">
          {/* Banner image */}
          <div className="relative h-48 sm:h-64 w-full bg-[#FAF8F5] overflow-hidden">
            <img
              src={business.banner_url || '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png'}
              alt={business.name}
              className="w-full h-full object-cover"
            />
            {/* Quick Share / QR triggers */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setShowQR(true)}
                className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-semibold text-[#171412] hover:bg-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="View QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-[#3D2010]" />
                <span className="hidden sm:inline">QR Standee</span>
              </button>
            </div>
          </div>

          {/* Business Info Header */}
          <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Square Logo Thumbnail */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden shrink-0 -mt-12 sm:-mt-14 relative z-10">
                <img
                  src={business.logo_url || business.banner_url || '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png'}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#171412] leading-tight">
                  {business.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#766B63] mt-0.5 font-medium">
                  {business.category === 'Restaurants' ? 'Restaurant' : business.category}
                </p>

                {/* Metadata Row matching Reference 3 */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#766B63] mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-700 font-semibold">Open now</span>
                  </div>
                  <span className="text-[#D6CEC4] hidden sm:inline">|</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-[#171412]">{business.rating.toFixed(1)}</span>
                    <span className="text-[#8F8175]">({business.review_count})</span>
                  </div>
                  <span className="text-[#D6CEC4] hidden sm:inline">|</span>
                  <div className="flex items-center gap-1.5 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-[#9E948C] shrink-0" />
                    <span>{business.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Queue Button or Active Status */}
            <div className="shrink-0 flex items-center gap-3">
              {activeQueue?.business_id === business.id ? (
                <button
                  onClick={() => navigate('/my-queue')}
                  className="px-6 py-3 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-sm shadow-sm hover:bg-[#2A150A] transition-all flex items-center gap-2 cursor-pointer ring-2 ring-[#3D2010]/20"
                >
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>Your Token: {activeQueue.token_number}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-7 py-3 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-sm shadow-sm hover:bg-[#2A150A] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Queue</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success notification for placed order */}
        {orderSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong>Order placed successfully!</strong> Pay at the counter when you arrive. You can track it under Orders.
            </div>
          </div>
        )}

        {/* Main 2-Column Content matching Reference 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Menu Items */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Search Input matching Reference 3 */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9E948C]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-[#EFECE6] text-sm text-[#171412] placeholder-[#A3968A] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3D2010] focus:border-[#3D2010]"
              />
            </div>

            {/* Menu Item Cards matching Reference 3 */}
            <div className="flex flex-col gap-3">
              {filteredMenuItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-[#EFECE6] text-xs text-[#766B63]">
                  No menu items found.
                </div>
              ) : (
                filteredMenuItems.map(item => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 bg-white rounded-2xl border border-[#EFECE6] shadow-sm flex items-center justify-between gap-4 hover:border-[#E0D8CE] transition-all"
                  >
                    {/* Item info */}
                    <div className="flex items-center gap-4">
                      {/* Image thumbnail placeholder/photo */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#FAF8F5] border border-[#ECE5DC] overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                        🍛
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#171412]">
                          {item.name}
                        </h3>
                        <p className="text-xs text-[#766B63] mt-0.5 line-clamp-1 max-w-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Price and Add button */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      <span className="text-base sm:text-lg font-bold text-[#171412] font-mono">
                        ₹{item.price}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="px-4 sm:px-5 py-2 rounded-xl bg-[#3D2010] text-[#FAF8F5] text-xs font-bold hover:bg-[#2A150A] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Your Order Cart Panel matching Reference 3 */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-[#171412] pb-4 border-b border-[#F5F2EC]">
                Your order
              </h2>

              {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FAF6F0] flex items-center justify-center text-[#9E8E81] mb-3">
                    <ShoppingBag className="w-8 h-8 text-[#A89889]" />
                  </div>
                  <p className="text-sm font-medium text-[#766B63]">
                    Your cart is empty.
                  </p>
                  <p className="text-xs text-[#9E948C] mt-1 max-w-[200px]">
                    Add items from the menu to prepare your order in advance.
                  </p>
                </div>
              ) : (
                <div className="pt-4 flex flex-col gap-4">
                  {/* Cart Item rows */}
                  <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                    {items.map(({ menuItem, quantity }) => (
                      <div key={menuItem.id} className="flex items-center justify-between text-xs py-2 border-b border-[#FAF6F0]">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-[#171412] line-clamp-1">{menuItem.name}</p>
                          <p className="text-[#766B63] font-mono">₹{menuItem.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-[#E2DBD1] rounded-lg bg-[#FAF8F5]">
                            <button
                              onClick={() => updateQuantity(menuItem.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-[#766B63] hover:text-[#171412] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-[#171412] tabular-nums">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(menuItem.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-[#766B63] hover:text-[#171412] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="w-14 text-right font-bold text-[#171412] font-mono">
                            ₹{menuItem.price * quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="pt-3 border-t border-[#F5F2EC] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#766B63]">Subtotal</span>
                    <span className="text-lg font-bold text-[#171412] font-mono">₹{subtotal}</span>
                  </div>

                  <p className="text-[11px] text-[#8C8075]">
                    Payment Mode: <strong>Pay at the counter</strong> when you receive your order.
                  </p>

                  {orderError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  <button
                    onClick={handlePlaceOrder}
                    disabled={orderPlacing}
                    className="w-full py-3.5 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-sm shadow-sm hover:bg-[#2A150A] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {orderPlacing ? (
                      <span>Placing Order...</span>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Place Order (₹{subtotal})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Remote Queue Joining Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EFECE6] relative">
            <h3 className="text-xl font-bold text-[#171412]">
              Join {business.name} Queue
            </h3>
            <p className="text-xs text-[#766B63] mt-1">
              Receive a live digital token without registration. Track your position in real-time.
            </p>

            {joinError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinQueueSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Siddhartha or Sai"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm text-[#171412] focus:outline-none focus:ring-1 focus:ring-[#3D2010]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">
                  Phone Number (Optional, for SMS/Token notifications)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm text-[#171412] focus:outline-none focus:ring-1 focus:ring-[#3D2010]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#171412]">
                    Travel Time to Business: {travelMinutes} mins
                  </label>
                  <span className="text-[11px] text-[#8C8075]">For smart departure alerts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={travelMinutes}
                  onChange={(e) => setTravelMinutes(Number(e.target.value))}
                  className="w-full accent-[#3D2010]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="flex-1 py-3 rounded-xl bg-[#3D2010] text-[#FAF8F5] text-xs font-bold hover:bg-[#2A150A] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {joining ? 'Generating Token...' : 'Get Digital Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Auth Modal (Prompted before placing order) */}
      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          handlePlaceOrder();
        }}
        title="Sign in to Place Order"
        subtitle="Sign in or create your customer account to place your order."
      />

      {/* QR Code Standee Modal */}
      {showQR && (
        <QRCodeModal
          business={business}
          isOpen={showQR}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};
