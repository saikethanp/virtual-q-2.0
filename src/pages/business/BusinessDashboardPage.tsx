import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  UtensilsCrossed,
  User,
  Settings,
  BarChart3,
  Layers,
  LogOut,
  Clock,
  Bell,
  Package,
  Plus,
  QrCode,
  Play,
  Check,
  X,
  SkipForward,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Sliders,
  Store,
  Trash2,
  Edit2,
  ShieldAlert,
  Building2,
  Power,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Business,
  QueueEntry,
  Order,
  MenuItem,
  Counter,
  QueueSettings,
  QueueStatus,
  OrderStatus
} from '../../types';
import {
  getBusinessQueue,
  getOrdersByBusiness,
  getMenuItems,
  getCounters,
  getQueueSettings,
  advanceQueue,
  updateQueueEntryStatus,
  updateOrderStatus,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCounter,
  toggleCounterStatus,
  updateQueueSettings,
  joinQueue,
  getBusinessAnalytics,
  getAllBusinessesAdmin,
  deleteBusinessAdmin,
  toggleBusinessOpenStatusAdmin,
  updateBusiness,
  AdminBusinessOverview
} from '../../services/api';
import { QRCodeModal } from '../../components/QRCodeModal';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface BusinessDashboardPageProps {
  navigate: (route: string) => void;
  initialTab?: string;
}

export const BusinessDashboardPage: React.FC<BusinessDashboardPageProps> = ({
  navigate,
  initialTab = 'dashboard'
}) => {
  const { owner, business, logout, refreshOwnerBusiness, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Protect owner route: redirect unauthenticated visitors to login
  useEffect(() => {
    if (!authLoading && !owner) {
      navigate('/business/login');
    }
  }, [authLoading, owner, navigate]);

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Action States
  const [showQR, setShowQR] = useState(false);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showAddCounterModal, setShowAddCounterModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Menu Item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(60);
  const [newItemCategory, setNewItemCategory] = useState('Main Dishes');

  // New Counter form
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterCode, setNewCounterCode] = useState('C3');

  // Walk-in Customer form
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Business Profile / Image State
  const [imageUploading, setImageUploading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [editingBusinessName, setEditingBusinessName] = useState(business?.name || '');
  const [editingLocation, setEditingLocation] = useState(business?.location || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Staged order status state (allows owner to select and click Save)
  const [pendingOrderStatuses, setPendingOrderStatuses] = useState<Record<string, OrderStatus>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [savedOrderSuccess, setSavedOrderSuccess] = useState<string | null>(null);

  // Admin Management State
  const [adminBusinesses, setAdminBusinesses] = useState<AdminBusinessOverview[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<AdminBusinessOverview | null>(null);
  const [businessToEditAdmin, setBusinessToEditAdmin] = useState<AdminBusinessOverview | null>(null);
  const [adminEditName, setAdminEditName] = useState('');
  const [adminEditLocation, setAdminEditLocation] = useState('');
  const [adminEditBanner, setAdminEditBanner] = useState('');
  const [adminStatusMessage, setAdminStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const businessId = business?.id || owner?.business_id || '';

  const loadAdminBusinesses = useCallback(async () => {
    if (owner?.role !== 'admin') return;
    try {
      setAdminLoading(true);
      const data = await getAllBusinessesAdmin();
      setAdminBusinesses(data);
    } catch (e) {
      console.error('Error loading admin businesses:', e);
    } finally {
      setAdminLoading(false);
    }
  }, [owner?.role]);

  const handleDeleteBusiness = async (b: AdminBusinessOverview) => {
    try {
      setActionLoading(true);
      const res = await deleteBusinessAdmin(b.id);
      if (res.success) {
        setAdminStatusMessage({ type: 'success', text: res.message || `Business "${b.name}" has been deleted.` });
        setBusinessToDelete(null);
        await loadAdminBusinesses();
        await refreshOwnerBusiness();
      } else {
        setAdminStatusMessage({ type: 'error', text: res.message || 'Failed to delete business.' });
      }
    } catch (err: unknown) {
      setAdminStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Deletion error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBusinessStatus = async (b: AdminBusinessOverview) => {
    try {
      const newStatus = !b.is_open;
      const res = await toggleBusinessOpenStatusAdmin(b.id, newStatus);
      if (res.success) {
        setAdminBusinesses(prev => prev.map(item => item.id === b.id ? { ...item, is_open: newStatus } : item));
      }
    } catch (e) {
      console.error('Failed to toggle business status:', e);
    }
  };

  const loadDashboardData = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [qData, ordData, mData, cData, sData, aData] = await Promise.all([
        getBusinessQueue(businessId),
        getOrdersByBusiness(businessId),
        getMenuItems(businessId),
        getCounters(businessId),
        getQueueSettings(businessId),
        getBusinessAnalytics(businessId),
      ]);
      setQueue(qData);
      setOrders(ordData);
      setMenuItems(mData);
      setCounters(cData);
      setSettings(sData);
      setAnalytics(aData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (owner?.role === 'admin') {
      loadAdminBusinesses();
    }
  }, [owner?.role, loadAdminBusinesses]);

  useEffect(() => {
    loadDashboardData();

    const handleRealtime = () => {
      loadDashboardData();
    };
    window.addEventListener('vq_realtime_event', handleRealtime);

    let channel: any = null;
    if (isSupabaseConfigured() && supabase && businessId) {
      channel = supabase
        .channel(`biz_dashboard_${businessId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'queue_entries', filter: `business_id=eq.${businessId}` },
          () => loadDashboardData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
          () => loadDashboardData()
        )
        .subscribe();
    }

    const interval = setInterval(loadDashboardData, 10000);

    return () => {
      window.removeEventListener('vq_realtime_event', handleRealtime);
      if (channel && supabase) {
        (supabase as any).removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [loadDashboardData, businessId]);

  // Derived statistics matching Reference 5
  const waitingCustomers = queue.filter(q => q.status === 'waiting');
  const servingCustomer = queue.find(q => q.status === 'serving') || queue.find(q => q.status === 'called');
  const nowServingToken = servingCustomer ? servingCustomer.token_number : '—';
  const estWait = waitingCustomers.length * (settings?.avg_service_duration_min || 4);

  // Congestion alert check
  const isCongested = settings && waitingCustomers.length >= settings.congestion_threshold;

  // Handlers
  const handleCallNext = async (counterId?: string) => {
    setActionLoading(true);
    await advanceQueue(businessId, counterId);
    setActionLoading(false);
    loadDashboardData();
  };

  const handleUpdateQueueStatus = async (id: string, status: QueueStatus) => {
    setActionLoading(true);
    await updateQueueEntryStatus(id, status);
    setActionLoading(false);
    loadDashboardData();
  };

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;
    await joinQueue({
      businessId,
      customerName: walkInName.trim(),
      customerPhone: walkInPhone.trim() || undefined,
      notes: 'Walk-in customer',
    });
    setWalkInName('');
    setWalkInPhone('');
    setShowWalkInModal(false);
    loadDashboardData();
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await createMenuItem({
      business_id: businessId,
      name: newItemName.trim(),
      description: newItemDesc.trim(),
      price: Number(newItemPrice),
      category: newItemCategory,
      is_available: true,
    });
    setNewItemName('');
    setNewItemDesc('');
    setShowAddMenuModal(false);
    loadDashboardData();
  };

  const handleToggleMenuItem = async (item: MenuItem) => {
    await updateMenuItem(item.id, { is_available: !item.is_available });
    loadDashboardData();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (window.confirm('Delete this menu item?')) {
      await deleteMenuItem(id);
      loadDashboardData();
    }
  };

  const handleAddCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounterName.trim()) return;
    await createCounter(businessId, newCounterName.trim(), newCounterCode.trim());
    setNewCounterName('');
    setShowAddCounterModal(false);
    loadDashboardData();
  };

  const handleToggleCounter = async (id: string) => {
    await toggleCounterStatus(id);
    loadDashboardData();
  };

  const handleUpdateOrderStatus = async (orderId: string, status?: OrderStatus) => {
    const finalStatus = status || pendingOrderStatuses[orderId];
    if (!finalStatus) return;

    setSavingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, finalStatus);
      setSavedOrderSuccess(orderId);
      setTimeout(() => setSavedOrderSuccess(null), 3000);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await updateQueueSettings(businessId, settings);
    alert('Queue settings saved successfully!');
    loadDashboardData();
  };

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !editingBusinessName.trim()) return;
    setSavingProfile(true);
    const updated = await updateBusiness(businessId, {
      name: editingBusinessName.trim(),
      location: editingLocation.trim() || 'Main Branch',
    });
    setSavingProfile(false);
    if (updated) {
      setProfileSuccessMsg('Business details updated successfully!');
      await refreshOwnerBusiness();
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } else {
      alert('Failed to update business details.');
    }
  };

  const handleAdminSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessToEditAdmin || !adminEditName.trim()) return;
    setActionLoading(true);
    const updated = await updateBusiness(businessToEditAdmin.id, {
      name: adminEditName.trim(),
      location: adminEditLocation.trim() || businessToEditAdmin.location,
      banner_url: adminEditBanner || businessToEditAdmin.banner_url,
      logo_url: adminEditBanner || businessToEditAdmin.logo_url,
    });
    setActionLoading(false);
    if (updated) {
      setAdminStatusMessage({ type: 'success', text: `Business "${adminEditName}" updated successfully!` });
      setBusinessToEditAdmin(null);
      await loadAdminBusinesses();
      await refreshOwnerBusiness();
    } else {
      setAdminStatusMessage({ type: 'error', text: 'Failed to update business.' });
    }
  };

  const handleAdminImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAdminEditBanner(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit. Please choose a smaller image.');
      return;
    }

    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const updated = await updateBusiness(businessId, {
        banner_url: base64Data,
        logo_url: base64Data,
      });
      setImageUploading(false);
      if (updated) {
        setProfileSuccessMsg('Business image updated successfully! It is now visible on discovery & storefront.');
        await refreshOwnerBusiness();
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        alert('Failed to save business image.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Nav items for sidebar matching Reference 5
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'queue', label: 'Queue', icon: <Users className="w-5 h-5" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { id: 'counters', label: 'Counters', icon: <Layers className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings & Profile', icon: <Settings className="w-5 h-5" /> },
    ...(owner?.role === 'admin'
      ? [{ id: 'admin', label: 'Platform Admin', icon: <ShieldAlert className="w-5 h-5 text-amber-600" /> }]
      : []),
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center animate-pulse">
            <Store className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-[#766B63]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!owner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col md:flex-row">
      {/* Sidebar matching Reference 5 */}
      <aside className="w-full md:w-64 bg-white border-r border-[#EFECE6] p-5 shrink-0 flex flex-col justify-between">
        <div>
          {/* Brand Wordmark & Cup */}
          <div className="flex items-center gap-2.5 pb-6 mb-6 border-b border-[#F5F2EC]">
            <div className="w-8 h-8 rounded-xl bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center">
              <Store className="w-4 h-4 text-[#FAF8F5]" />
            </div>
            <div>
              <span className="text-xl font-bold text-[#171412] tracking-tight">Virtual-Q</span>
              <span className="block text-[10px] uppercase font-bold text-[#8C8075] tracking-wider">Business Portal</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${isActive
                    ? 'bg-[#F7EFE6] text-[#3D2010] shadow-sm'
                    : 'text-[#63554A] hover:bg-[#FAF8F5] hover:text-[#171412]'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'queue' && waitingCustomers.length > 0 && (
                    <span className="ml-auto bg-[#3D2010] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {waitingCustomers.length}
                    </span>
                  )}
                  {item.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {orders.filter(o => o.status === 'pending').length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-[#F5F2EC] flex flex-col gap-3">
          <button
            onClick={() => setShowQR(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#171412] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#3D2010]" />
            <span>Customer QR Standee</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-xs text-[#766B63] hover:text-[#171412] py-1 cursor-pointer"
          >
            ← View Customer Site
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header matching Reference 5 */}
        <header className="bg-white border-b border-[#EFECE6] px-6 sm:px-10 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#171412] truncate">
              {business?.name || "Siddhartha Venkata Sai's Business"}
            </h2>
            <p className="text-xs text-[#8C8075]">
              {business?.location || 'Angallu in MITS Deemed To BE University'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadDashboardData}
              className="p-2 rounded-full hover:bg-[#FAF8F5] text-[#766B63] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Avatar matching Reference 5 */}
            <div className="w-8 h-8 rounded-full bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center text-xs font-bold">
              {owner?.full_name ? owner.full_name[0].toUpperCase() : 'S'}
            </div>

            {/* Sign Out Link matching Reference 5 */}
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#766B63] hover:text-red-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="p-6 sm:p-10 flex-1">
          {/* TAB 1: DASHBOARD HOME matching Reference 5 */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8">
              {/* Greeting matching Reference 5 */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171412] tracking-tight">
                  Good morning, {owner?.full_name?.split(' ')[0] || 'Siddhartha'}
                </h1>
                <p className="text-xs sm:text-sm text-[#766B63] mt-1">
                  Here's what's happening with your business today.
                </p>
              </div>

              {/* Congestion Alert (Section 7.2) */}
              {isCongested && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <strong>Queue Congestion Alert:</strong> Your waiting queue has reached {waitingCustomers.length} customers. Consider opening another counter to reduce customer wait time.
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('counters')}
                    className="px-3.5 py-1.5 bg-amber-800 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Manage Counters
                  </button>
                </div>
              )}

              {/* 4 Metric Cards matching Reference 5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. CURRENT QUEUE */}
                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF6F0] text-[#43210C] flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#43210C]" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A796E]">
                      Current Queue
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl sm:text-3xl font-bold text-[#171412] tabular-nums">
                      {waitingCustomers.length} people
                    </div>
                    <span className="text-xs text-[#766B63]">waiting</span>
                  </div>
                </div>

                {/* 2. NOW SERVING */}
                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF6F0] text-[#43210C] flex items-center justify-center">
                      <Bell className="w-5 h-5 text-[#43210C]" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A796E]">
                      Now Serving
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl sm:text-3xl font-bold text-[#171412] font-mono">
                      {nowServingToken}
                    </div>
                    <span className="text-xs text-[#766B63]">active counter token</span>
                  </div>
                </div>

                {/* 3. ESTIMATED WAIT */}
                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF6F0] text-[#43210C] flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[#43210C]" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A796E]">
                      Estimated Wait
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl sm:text-3xl font-bold text-[#171412] tabular-nums">
                      ~{estWait} min
                    </div>
                    <span className="text-xs text-[#766B63]">based on velocity</span>
                  </div>
                </div>

                {/* 4. TODAY'S ORDERS */}
                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF6F0] text-[#43210C] flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#43210C]" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A796E]">
                      Today's Orders
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl sm:text-3xl font-bold text-[#171412] tabular-nums">
                      {orders.length}
                    </div>
                    <span className="text-xs text-[#766B63]">total pre-orders</span>
                  </div>
                </div>
              </div>

              {/* Action Bar for Counter Staff */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-[#EFECE6] shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCallNext()}
                    disabled={actionLoading || waitingCustomers.length === 0}
                    className="px-6 py-3 rounded-2xl bg-[#3D2010] text-white font-bold text-xs sm:text-sm hover:bg-[#2A150A] shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Call Next Customer</span>
                  </button>

                  <button
                    onClick={() => setShowWalkInModal(true)}
                    className="px-4 py-3 rounded-2xl bg-[#FAF8F5] border border-[#E0D8CE] text-[#171412] font-semibold text-xs sm:text-sm hover:bg-[#F3ECE2] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Walk-in Token</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowQR(true)}
                    className="px-4 py-3 rounded-2xl bg-white border border-[#E0D8CE] text-[#3D2010] font-semibold text-xs sm:text-sm hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Storefront QR Standee</span>
                  </button>
                </div>
              </div>

              {/* QUEUE OVERVIEW Table matching Reference 5 */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A796E]">
                    Queue Overview
                  </h3>
                  <button
                    onClick={() => setActiveTab('queue')}
                    className="text-xs font-bold text-[#3D2010] hover:underline cursor-pointer"
                  >
                    Manage detailed queue →
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-[#EFECE6] overflow-hidden shadow-sm">
                  {queue.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF6F0] flex items-center justify-center text-[#9E8E81] mx-auto mb-3">
                        <Package className="w-6 h-6 text-[#A89889]" />
                      </div>
                      <p className="text-sm font-semibold text-[#766B63]">No active queue.</p>
                      <p className="text-xs text-[#9E948C] mt-0.5">Customers who join remotely or in-person will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8F5] text-[#8C8075] uppercase tracking-wider font-bold border-b border-[#EFECE6]">
                          <tr>
                            <th className="py-3.5 px-6">Queue</th>
                            <th className="py-3.5 px-6">Customer</th>
                            <th className="py-3.5 px-6">Order</th>
                            <th className="py-3.5 px-6">People Ahead</th>
                            <th className="py-3.5 px-6">Wait</th>
                            <th className="py-3.5 px-6">Status</th>
                            <th className="py-3.5 px-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5F2EC]">
                          {queue.map((entry, idx) => {
                            const relatedOrder = orders.find(o => o.queue_entry_id === entry.id || o.session_id === entry.session_id);
                            return (
                              <tr key={entry.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                                <td className="py-4 px-6 font-mono font-bold text-sm text-[#171412]">
                                  {entry.token_number}
                                </td>
                                <td className="py-4 px-6 font-semibold text-[#171412]">
                                  {entry.customer_name}
                                  {entry.customer_phone && (
                                    <span className="block text-[11px] font-normal text-[#8C8075]">{entry.customer_phone}</span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-[#766B63]">
                                  {relatedOrder ? (
                                    <span className="font-medium text-[#171412]">
                                      {relatedOrder.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', ') || 'Pre-order'} (₹{relatedOrder.total_amount})
                                    </span>
                                  ) : (
                                    <span className="text-[#9E948C]">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-6 font-mono font-bold text-[#171412]">
                                  {entry.status === 'serving' ? 'Currently serving' : idx}
                                </td>
                                <td className="py-4 px-6 font-mono text-[#766B63]">
                                  ~{entry.estimated_wait_minutes} min
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] capitalize ${entry.status === 'serving'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : entry.status === 'called'
                                      ? 'bg-amber-100 text-amber-900 animate-pulse'
                                      : 'bg-stone-100 text-stone-700'
                                    }`}>
                                    {entry.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {entry.status === 'waiting' && (
                                      <button
                                        onClick={() => handleUpdateQueueStatus(entry.id, 'serving')}
                                        className="px-2.5 py-1 rounded-lg bg-[#3D2010] text-white font-bold text-[11px] hover:bg-[#2A150A] cursor-pointer"
                                      >
                                        Serve
                                      </button>
                                    )}
                                    {entry.status === 'serving' && (
                                      <button
                                        onClick={() => handleUpdateQueueStatus(entry.id, 'completed')}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 cursor-pointer flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        Complete
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleUpdateQueueStatus(entry.id, 'missed')}
                                      className="p-1 rounded-lg text-[#8C8075] hover:text-amber-800 hover:bg-amber-50 cursor-pointer"
                                      title="Mark as Missed"
                                    >
                                      <SkipForward className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateQueueStatus(entry.id, 'cancelled')}
                                      className="p-1 rounded-lg text-[#8C8075] hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RECENT ORDERS Section matching Reference 5 */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A796E]">
                    Recent Orders
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#3D2010] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all orders</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-[#EFECE6] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] text-[#8C8075] uppercase tracking-wider font-bold border-b border-[#EFECE6]">
                        <tr>
                          <th className="py-3.5 px-6">Order</th>
                          <th className="py-3.5 px-6">Customer</th>
                          <th className="py-3.5 px-6">Items</th>
                          <th className="py-3.5 px-6">Total</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5F2EC]">
                        {orders.slice(0, 5).map(order => (
                          <tr key={order.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-sm text-[#171412]">
                              {order.order_number}
                            </td>
                            <td className="py-4 px-6 font-semibold text-[#171412]">
                              {order.customer_name}
                            </td>
                            <td className="py-4 px-6 text-[#766B63] max-w-xs truncate">
                              {order.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ') || 'Items'}
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-[#171412]">
                              ₹{order.total_amount}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] capitalize ${order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : order.status === 'ready'
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : order.status === 'preparing'
                                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                      : order.status === 'accepted'
                                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                        : order.status === 'cancelled'
                                          ? 'bg-red-100 text-red-900 border border-red-200'
                                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}>
                                {order.status === 'ready' ? 'Ready for Pickup' : order.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right text-[#8C8075]">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED QUEUE MANAGER */}
          {activeTab === 'queue' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#171412]">Live Queue Controller</h1>
                  <p className="text-xs text-[#766B63] mt-0.5">Control serving counters, call next tokens and manage waiting lines.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCallNext()}
                    disabled={waitingCustomers.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-[#3D2010] text-white font-bold text-xs hover:bg-[#2A150A] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Call Next</span>
                  </button>
                  <button
                    onClick={() => setShowWalkInModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-[#DCD5CB] bg-white text-xs font-semibold hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    + Walk-in Token
                  </button>
                </div>
              </div>

              {/* Counters Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {counters.map(c => {
                  const servingAtCounter = queue.find(q => q.counter_id === c.id && q.status === 'serving');
                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#171412]">{c.name}</span>
                        <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-[#8C8075]">Serving Token:</span>
                          <p className="text-xl font-bold font-mono text-[#171412]">
                            {servingAtCounter ? servingAtCounter.token_number : 'Vacant'}
                          </p>
                        </div>
                        {c.is_active && (
                          <button
                            onClick={() => handleCallNext(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D8CE] text-xs font-bold hover:bg-[#3D2010] hover:text-white transition-colors cursor-pointer"
                          >
                            Call to {c.code}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active & Waiting Line */}
              <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[#171412] mb-4">Active Customers in Line</h3>
                {queue.length === 0 ? (
                  <p className="text-xs text-[#766B63] py-8 text-center">No customers currently waiting.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {queue.map(entry => (
                      <div
                        key={entry.id}
                        className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-black font-mono text-[#171412] w-16">
                            {entry.token_number}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-[#171412]">{entry.customer_name}</h4>
                            <div className="flex items-center gap-2 text-xs text-[#766B63] mt-0.5">
                              <span>Wait: ~{entry.estimated_wait_minutes}m</span>
                              <span>·</span>
                              <span>Joined: {new Date(entry.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {entry.notes && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-800 italic">{entry.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${entry.status === 'serving' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-800'
                            }`}>
                            {entry.status}
                          </span>
                          {entry.status === 'waiting' && (
                            <button
                              onClick={() => handleUpdateQueueStatus(entry.id, 'serving')}
                              className="px-3 py-1.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold cursor-pointer"
                            >
                              Serve Now
                            </button>
                          )}
                          {entry.status === 'serving' && (
                            <button
                              onClick={() => handleUpdateQueueStatus(entry.id, 'completed')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateQueueStatus(entry.id, 'missed')}
                            className="px-2.5 py-1.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63] hover:text-amber-800 cursor-pointer"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => handleUpdateQueueStatus(entry.id, 'cancelled')}
                            className="p-1.5 rounded-xl text-stone-400 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#171412]">Order Management</h1>
                  <p className="text-xs text-[#766B63] mt-0.5">Pre-orders placed by queue customers for counter pickup.</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm">
                {orders.length === 0 ? (
                  <p className="text-xs text-[#766B63] py-12 text-center">No orders placed yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orders.map(order => (
                      <div
                        key={order.id}
                        className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#ECE5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#171412]">{order.order_number}</span>
                            <span className="text-xs font-bold text-[#171412]">— {order.customer_name}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {order.items?.map((it, idx) => (
                              <span key={idx} className="bg-white px-2 py-1 rounded-md border border-[#E2DBD1] font-medium">
                                {it.quantity}x {it.item_name} (₹{it.subtotal})
                              </span>
                            ))}
                          </div>
                          <p className="text-xs font-bold text-[#171412] mt-2 font-mono">
                            Total: ₹{order.total_amount} · Pay at counter
                          </p>
                        </div>

                        {/* Order status actions with Save button */}
                        <div className="flex items-center gap-2">
                          <select
                            value={pendingOrderStatuses[order.id] || order.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as OrderStatus;
                              setPendingOrderStatuses(prev => ({
                                ...prev,
                                [order.id]: newStatus
                              }));
                            }}
                            className="px-3 py-2 rounded-xl border border-[#DCD5CB] bg-white text-xs font-bold text-[#171412] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20"
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready for Pickup</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id)}
                            disabled={savingOrderId === order.id}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${savedOrderSuccess === order.id
                                ? 'bg-emerald-600 text-white'
                                : (pendingOrderStatuses[order.id] && pendingOrderStatuses[order.id] !== order.status)
                                  ? 'bg-[#3D2010] text-[#FAF8F5] hover:bg-[#2A150A] ring-2 ring-[#3D2010]/30'
                                  : 'bg-[#FAF8F5] border border-[#DCD5CB] text-[#171412] hover:bg-[#F3ECE2]'
                              }`}
                          >
                            {savingOrderId === order.id ? (
                              <span>Saving...</span>
                            ) : savedOrderSuccess === order.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Saved!</span>
                              </>
                            ) : (
                              <span>Save</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MENU & SERVICES */}
          {activeTab === 'menu' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#171412]">Menu & Service Offerings</h1>
                  <p className="text-xs text-[#766B63] mt-0.5">Manage items displayed to customers with real-time pricing in INR.</p>
                </div>
                <button
                  onClick={() => setShowAddMenuModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold hover:bg-[#2A150A] shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Menu Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map(item => (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-3xl border border-[#EFECE6] shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8C8075] uppercase">{item.category}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.is_available ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                          }`}>
                          {item.is_available ? 'Available' : 'Sold Out'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#171412] mt-1">{item.name}</h4>
                      <p className="text-xs text-[#766B63] mt-1 line-clamp-2">{item.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F5F2EC] flex items-center justify-between">
                      <span className="text-base font-bold font-mono text-[#171412]">₹{item.price}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleMenuItem(item)}
                          className="px-2.5 py-1 rounded-lg border border-[#DCD5CB] text-[11px] font-bold text-[#171412] hover:bg-[#FAF8F5] cursor-pointer"
                        >
                          {item.is_available ? 'Mark Out of Stock' : 'Mark Available'}
                        </button>
                        <button
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COUNTERS MANAGEMENT */}
          {activeTab === 'counters' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#171412]">Multiple Counter Management</h1>
                  <p className="text-xs text-[#766B63] mt-0.5">Activate or deactivate service counters to distribute customer load.</p>
                </div>
                <button
                  onClick={() => setShowAddCounterModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold hover:bg-[#2A150A] cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Counter</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {counters.map(counter => (
                  <div key={counter.id} className="p-6 bg-white rounded-3xl border border-[#EFECE6] shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded font-mono font-bold text-xs text-[#7A4923]">
                          {counter.code}
                        </span>
                        <h4 className="text-base font-bold text-[#171412]">{counter.name}</h4>
                      </div>
                      <p className="text-xs text-[#766B63] mt-1">
                        Status: <strong className={counter.is_active ? 'text-emerald-700' : 'text-stone-400'}>
                          {counter.is_active ? 'Online & Serving' : 'Deactivated'}
                        </strong>
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleCounter(counter.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${counter.is_active
                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                      {counter.is_active ? 'Deactivate' : 'Activate Counter'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: BUSINESS ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#171412]">Business Analytics</h1>
                <p className="text-xs text-[#766B63] mt-0.5">Calculated from actual completed queues and counter records.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm">
                  <span className="text-xs font-bold text-[#8C8075] uppercase">Total Customers Served</span>
                  <div className="text-3xl font-extrabold text-[#171412] mt-2 font-mono">
                    {analytics?.totalServed ?? 0}
                  </div>
                  <span className="text-xs text-emerald-700 mt-1 block font-semibold">100% verified attendance</span>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm">
                  <span className="text-xs font-bold text-[#8C8075] uppercase">Average Waiting Time</span>
                  <div className="text-3xl font-extrabold text-[#171412] mt-2 font-mono">
                    {analytics?.avgWaitMinutes ?? 0}m
                  </div>
                  <span className="text-xs text-[#766B63] mt-1 block">Calculated via historical token completion</span>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm">
                  <span className="text-xs font-bold text-[#8C8075] uppercase">Completed Orders Revenue</span>
                  <div className="text-3xl font-extrabold text-[#171412] mt-2 font-mono">
                    ₹{analytics?.totalRevenue ?? 0}
                  </div>
                  <span className="text-xs text-[#766B63] mt-1 block">Pay at counter transactions</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: QUEUE SETTINGS & BUSINESS PROFILE */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold text-[#171412]">Settings & Business Profile</h1>
                <p className="text-xs text-[#766B63] mt-0.5">Upload your storefront image, manage business branding, and configure queue rules.</p>
              </div>

              {profileSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {/* Business Storefront Image & Identity Card */}
              <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 sm:p-8 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F5F2EC]">
                  <div>
                    <h3 className="text-sm font-bold text-[#171412]">Business Profile & Storefront Photo</h3>
                    <p className="text-xs text-[#766B63] mt-0.5">Customize your business name, location, and photo visible to all customers.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pt-2">
                  <div className="w-36 h-28 rounded-2xl overflow-hidden border border-[#DCD5CB] bg-stone-100 shrink-0 flex items-center justify-center shadow-inner relative group">
                    <img
                      src={business?.banner_url || '/assets/aistudio/Warm_Virtual-Q_Business_Discovery_6cffc5a7.png'}
                      alt={business?.name || 'Storefront'}
                      className="w-full h-full object-cover"
                    />
                    {imageUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                        Uploading...
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-2.5 text-center sm:text-left">
                    <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3D2010] text-[#FAF8F5] text-xs font-bold hover:bg-[#2A150A] transition-colors cursor-pointer shadow-sm w-fit self-center sm:self-start">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{imageUploading ? 'Saving Photo...' : 'Upload Storefront Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={imageUploading}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-[#8C8075]">
                      Supports PNG, JPG, WebP up to 2MB. Your photo instantly updates across the customer portal.
                    </p>
                  </div>
                </div>

                {/* Edit Business Name and Location Form */}
                <form onSubmit={handleSaveBusinessInfo} className="pt-4 border-t border-[#F5F2EC] flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#171412] mb-1">
                        Business / Store Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingBusinessName || business?.name || ''}
                        onChange={(e) => setEditingBusinessName(e.target.value)}
                        placeholder="Enter business name"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm text-[#171412]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#171412] mb-1">
                        Location (City / Area)
                      </label>
                      <input
                        type="text"
                        value={editingLocation || business?.location || ''}
                        onChange={(e) => setEditingLocation(e.target.value)}
                        placeholder="Enter location"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm text-[#171412]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="self-end px-5 py-2.5 rounded-xl bg-[#3D2010] text-white font-bold text-xs hover:bg-[#2A150A] shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Business Details'}
                  </button>
                </form>
              </div>

              {settings && (
                <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-[#EFECE6] p-6 sm:p-8 shadow-sm flex flex-col gap-5">
                  <h3 className="text-sm font-bold text-[#171412] pb-3 border-b border-[#F5F2EC]">Queue Automation & Limits</h3>
                  <div>
                    <label className="block text-xs font-bold text-[#171412] mb-1">
                      Average Service Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.avg_service_duration_min}
                      onChange={(e) => setSettings({ ...settings, avg_service_duration_min: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm"
                    />
                    <p className="text-[11px] text-[#8C8075] mt-1">Used for calculating estimated customer waiting times.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#171412] mb-1">
                      Max Queue Capacity
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={settings.max_capacity}
                      onChange={(e) => setSettings({ ...settings, max_capacity: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#171412] mb-1">
                      Congestion Alert Threshold (Customers)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="50"
                      value={settings.congestion_threshold}
                      onChange={(e) => setSettings({ ...settings, congestion_threshold: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-sm"
                    />
                    <p className="text-[11px] text-[#8C8075] mt-1">Sends alert when waiting list reaches this threshold.</p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="auto_advance"
                      checked={settings.auto_advance}
                      onChange={(e) => setSettings({ ...settings, auto_advance: e.target.checked })}
                      className="w-4 h-4 accent-[#3D2010]"
                    />
                    <label htmlFor="auto_advance" className="text-xs font-bold text-[#171412]">
                      Automatic token advancement upon completion
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 py-3 rounded-xl bg-[#3D2010] text-white font-bold text-xs hover:bg-[#2A150A] shadow-sm cursor-pointer"
                  >
                    Save Queue Settings
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 8: Platform Admin (Secure Admin Business Management) */}
          {activeTab === 'admin' && owner?.role === 'admin' && (
            <div className="flex flex-col gap-6 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFECE6] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F5F2EC]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>Administrator Console</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#171412]">
                      Platform Businesses & Operations
                    </h2>
                    <p className="text-xs text-[#766B63] mt-1">
                      Manage registered businesses, control service availability, inspect owner metadata, or delete businesses.
                    </p>
                  </div>
                  <button
                    onClick={loadAdminBusinesses}
                    disabled={adminLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#171412] hover:bg-[#FAF8F5] transition-colors cursor-pointer self-start sm:self-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh List</span>
                  </button>
                </div>

                {adminStatusMessage && (
                  <div className={`mt-4 p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 ${adminStatusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <span>{adminStatusMessage.text}</span>
                    <button onClick={() => setAdminStatusMessage(null)} className="text-xs font-bold underline cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="mt-6">
                  {adminLoading ? (
                    <div className="py-12 text-center text-xs text-[#766B63]">Loading all registered businesses...</div>
                  ) : adminBusinesses.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#FAF5EE] text-[#6D4222] flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-[#171412]">No registered businesses in database</p>
                      <p className="text-xs text-[#766B63] mt-1">New businesses will appear here when owners register via the portal.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#171412]">
                        <thead>
                          <tr className="border-b border-[#EFECE6] text-[#766B63] font-bold">
                            <th className="pb-3 pr-4">Business</th>
                            <th className="pb-3 px-4">Category</th>
                            <th className="pb-3 px-4">Owner Profile</th>
                            <th className="pb-3 px-4">Location</th>
                            <th className="pb-3 px-4">Status</th>
                            <th className="pb-3 pl-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5F2EC]">
                          {adminBusinesses.map((b) => (
                            <tr key={b.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                              <td className="py-4 pr-4">
                                <div className="font-bold text-sm text-[#171412]">{b.name}</div>
                                <div className="text-[11px] text-[#766B63] font-mono mt-0.5">/{b.slug}</div>
                              </td>
                              <td className="py-4 px-4 font-semibold text-[#63554A]">{b.category}</td>
                              <td className="py-4 px-4">
                                <div className="font-semibold text-[#171412]">{b.owner_name}</div>
                                <div className="text-[11px] text-[#766B63]">{b.owner_email}</div>
                              </td>
                              <td className="py-4 px-4 text-[#63554A] max-w-[180px] truncate" title={b.location}>
                                {b.location}
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => handleToggleBusinessStatus(b)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${b.is_open ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                                    }`}
                                  title="Click to toggle availability"
                                >
                                  <Power className="w-3 h-3" />
                                  <span>{b.is_open ? 'Active (Open)' : 'Closed'}</span>
                                </button>
                              </td>
                              <td className="py-4 pl-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setBusinessToEditAdmin(b);
                                      setAdminEditName(b.name);
                                      setAdminEditLocation(b.location);
                                      setAdminEditBanner(b.banner_url || '');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-[#171412] hover:bg-stone-200 font-bold text-xs transition-colors cursor-pointer"
                                    title="Edit business name or image"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => setBusinessToDelete(b)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer"
                                    title="Delete this business and its data"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Walk-in Token Generator */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFECE6]">
            <h3 className="text-lg font-bold text-[#171412]">Create Walk-in Token</h3>
            <p className="text-xs text-[#766B63] mt-0.5">Assign digital queue token for physical customers arriving at counter.</p>
            <form onSubmit={handleAddWalkIn} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+91..."
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold"
                >
                  Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Menu Item */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFECE6]">
            <h3 className="text-lg font-bold text-[#171412]">Add Menu Item / Service</h3>
            <form onSubmit={handleAddMenuItem} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken Biryani"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Fragrant spiced rice with chicken"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1">Category</label>
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Counter */}
      {showAddCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFECE6]">
            <h3 className="text-lg font-bold text-[#171412]">Create New Counter</h3>
            <form onSubmit={handleAddCounter} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Counter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Counter 3 - Express Pickup"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Counter Code *</label>
                <input
                  type="text"
                  required
                  placeholder="C3"
                  value={newCounterCode}
                  onChange={(e) => setNewCounterCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCounterModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Standee Modal */}
      {showQR && business && (
        <QRCodeModal
          business={business}
          isOpen={showQR}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* MODAL: Admin Edit Business Modal */}
      {businessToEditAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#EFECE6]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F5F2EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171412]">Edit Business (Admin)</h3>
                  <p className="text-xs text-[#766B63]">Modify storefront name, location or photo</p>
                </div>
              </div>
              <button
                onClick={() => setBusinessToEditAdmin(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminSaveBusiness} className="mt-4 flex flex-col gap-4">
              {/* Photo preview & upload */}
              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1.5">Storefront Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-18 rounded-xl overflow-hidden border border-[#DCD5CB] bg-stone-100 shrink-0">
                    <img
                      src={adminEditBanner || businessToEditAdmin.banner_url || '/assets/aistudio/Warm_Virtual-Q_Business_Discovery_6cffc5a7.png'}
                      alt="Storefront"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#171412] text-xs font-bold transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Change Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAdminImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={adminEditName}
                  onChange={(e) => setAdminEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-xs text-[#171412]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171412] mb-1">Location</label>
                <input
                  type="text"
                  value={adminEditLocation}
                  onChange={(e) => setAdminEditLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] text-xs text-[#171412]"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setBusinessToEditAdmin(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#3D2010] text-white text-xs font-bold hover:bg-[#2A150A] cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Admin Delete Business Confirmation */}
      {businessToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-[#171412]">Delete Business?</h3>
            <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#171412]">"{businessToDelete.name}"</strong>?
              This will remove all associated counters, queue history, menu items, and customer orders permanently. This operation cannot be undone.
            </p>
            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-800">
              <strong>Owner:</strong> {businessToDelete.owner_name} ({businessToDelete.owner_email || 'No email'})<br />
              <strong>ID:</strong> <code className="font-mono">{businessToDelete.id}</code>
            </div>
            <div className="flex gap-2 pt-5">
              <button
                type="button"
                onClick={() => setBusinessToDelete(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-[#DCD5CB] text-xs font-bold text-[#766B63] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBusiness(businessToDelete)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
