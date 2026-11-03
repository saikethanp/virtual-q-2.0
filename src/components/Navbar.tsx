import React, { useState } from 'react';
import { Coffee, User, LogOut, ChevronDown, Clock, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQueue } from '../contexts/QueueContext';
import { useCart } from '../contexts/CartContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate }) => {
  const { owner, business, customer, logout, customerLogout } = useAuth();
  const { activeQueue } = useQueue();
  const { itemCount } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const OWNER_DASHBOARD_ROUTES = [
    '/business/dashboard',
    '/business/queue',
    '/business/orders',
    '/business/menu',
    '/business/counters',
    '/business/analytics',
    '/business/settings',
  ];
  const isOwnerRoute = OWNER_DASHBOARD_ROUTES.includes(currentRoute);

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EFECE6] px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Coffee className="w-5 h-5 text-[#FAF8F5]" />
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#171412]">
            Virtual-Q
          </span>
        </button>

        {/* Center Navigation Links (Hidden on owner dashboard) */}
        {!isOwnerRoute && (
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#766B63]">
            <button
              onClick={() => navigate('/discover')}
              className={`hover:text-[#171412] transition-colors cursor-pointer ${currentRoute === '/discover' ? 'text-[#171412] font-semibold' : ''}`}
            >
              Discover
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className={`hover:text-[#171412] transition-colors cursor-pointer ${currentRoute === '/how-it-works' ? 'text-[#171412] font-semibold' : ''}`}
            >
              How it Works
            </button>
            <button
              onClick={() => navigate(owner ? '/business/dashboard' : '/business/register')}
              className="hover:text-[#171412] transition-colors cursor-pointer"
            >
              For Businesses
            </button>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Customer Queue & Cart pills */}
          {!isOwnerRoute && (
            <>
              {itemCount > 0 && (
                <button
                  onClick={() => navigate('/orders')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#FAF8F5] border border-[#E5DFD7] text-[#171412] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
                  title="View placed orders"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#3D2010]" />
                  <span>Cart ({itemCount})</span>
                </button>
              )}

              <button
                onClick={() => navigate('/my-queue')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${activeQueue
                    ? 'bg-[#3D2010] text-white shadow-sm ring-2 ring-[#3D2010]/20'
                    : 'bg-white border border-[#E5DFD7] text-[#171412] hover:bg-[#F5F2EC]'
                  }`}
              >
                <Clock className={`w-4 h-4 ${activeQueue ? 'text-[#EFECE6] animate-pulse' : 'text-[#766B63]'}`} />
                <span>My Queue</span>
                {activeQueue && (
                  <span className="bg-amber-400 text-stone-900 text-xs px-2 py-0.5 rounded-full font-bold ml-0.5">
                    {activeQueue.token_number}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Customer Account Pill when signed in as customer */}
          {!isOwnerRoute && customer && (
            <div className="relative">
              <button
                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white border border-[#E5DFD7] hover:bg-[#FAF8F5] transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#171412] text-white flex items-center justify-center text-xs font-bold">
                  {customer.full_name ? customer.full_name[0].toUpperCase() : 'C'}
                </div>
                <span className="text-xs font-semibold text-[#171412] max-w-[120px] truncate hidden sm:inline">
                  {customer.full_name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#766B63]" />
              </button>

              {customerDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#EFECE6] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setCustomerDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#F5F2EC]">
                    <p className="text-xs text-[#766B63]">Customer Account</p>
                    <p className="text-sm font-semibold text-[#171412] truncate">{customer.full_name}</p>
                    <p className="text-[11px] text-[#8F7D70] truncate">{customer.email}</p>
                  </div>
                  <button
                    onClick={() => navigate('/orders')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    My Orders
                  </button>
                  <button
                    onClick={() => navigate('/my-queue')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    Live Queue
                  </button>
                  <div className="border-t border-[#F5F2EC] mt-1 pt-1">
                    <button
                      onClick={() => {
                        customerLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Business Owner Actions */}
          {owner ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white border border-[#E5DFD7] hover:bg-[#FAF8F5] transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center text-xs font-bold">
                  {owner.full_name ? owner.full_name[0].toUpperCase() : 'B'}
                </div>
                <span className="text-xs font-semibold text-[#171412] max-w-[130px] truncate hidden sm:inline">
                  {business?.name || owner.full_name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#766B63]" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#EFECE6] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#F5F2EC]">
                    <p className="text-xs text-[#766B63]">Signed in as</p>
                    <p className="text-sm font-semibold text-[#171412] truncate">{owner.email}</p>
                  </div>
                  <button
                    onClick={() => navigate('/business/dashboard')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    Owner Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/business/queue')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    Live Queue Manager
                  </button>
                  <button
                    onClick={() => navigate('/business/orders')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    Order Management
                  </button>
                  <button
                    onClick={() => navigate('/business/menu')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    Menu & Services
                  </button>
                  <button
                    onClick={() => navigate('/business/settings')}
                    className="w-full text-left px-4 py-2 text-sm text-[#171412] hover:bg-[#FAF8F5] font-medium flex items-center gap-2 cursor-pointer"
                  >
                    Queue Settings
                  </button>
                  {owner.role === 'admin' && (
                    <button
                      onClick={() => navigate('/business/dashboard')}
                      className="w-full text-left px-4 py-2 text-sm text-amber-800 bg-amber-50/50 hover:bg-amber-100/70 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      Platform Admin
                    </button>
                  )}
                  <div className="border-t border-[#F5F2EC] mt-1 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/business/login')}
              className="px-4 sm:px-5 py-2 text-sm font-semibold rounded-full bg-[#3D2010] text-[#FAF8F5] hover:bg-[#2C170A] transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Business Owner
            </button>
          )}
        </div>
      </div>

      {/* Supabase connection indicator pill (discreet, informative) */}
      {!isSupabaseConfigured() && (
        <div className="max-w-7xl mx-auto mt-2 px-2">
          <div className="bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] px-3 py-1 rounded-lg flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <strong>Preview Mode Active:</strong> Full queue operations, real-time sync & sample stores enabled. To link your live Supabase cloud database, configure <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> in <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">.env.local</code>.
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
