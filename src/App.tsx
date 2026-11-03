import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { QueueProvider } from './contexts/QueueContext';
import { CartProvider } from './contexts/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { HomePage } from './pages/customer/HomePage';
import { DiscoveryPage } from './pages/customer/DiscoveryPage';
import { BusinessDetailsPage } from './pages/customer/BusinessDetailsPage';
import { MyQueuePage } from './pages/customer/MyQueuePage';
import { OrdersPage } from './pages/customer/OrdersPage';
import { HowItWorksPage } from './pages/customer/HowItWorksPage';

import { BusinessRegisterPage } from './pages/business/BusinessRegisterPage';
import { BusinessLoginPage } from './pages/business/BusinessLoginPage';
import { BusinessDashboardPage } from './pages/business/BusinessDashboardPage';

import { getBusinesses } from './services/api';
import { Business } from './types';

const OWNER_DASHBOARD_ROUTES = [
  '/business/dashboard',
  '/business/queue',
  '/business/orders',
  '/business/menu',
  '/business/counters',
  '/business/analytics',
  '/business/settings',
];

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Navigation helper
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch businesses initially for discovery
  useEffect(() => {
    const load = async () => {
      const data = await getBusinesses();
      setBusinesses(data);
    };
    load();

    const handleRealtime = () => {
      load();
    };
    window.addEventListener('vq_realtime_event', handleRealtime);
    return () => window.removeEventListener('vq_realtime_event', handleRealtime);
  }, []);

  // Route Resolver
  const renderContent = () => {
    // 1. Business details route /business/:slug or /qr/:slug
    if (currentRoute.startsWith('/business/') && 
        currentRoute !== '/business/register' && 
        currentRoute !== '/business/login' &&
        !OWNER_DASHBOARD_ROUTES.includes(currentRoute)
    ) {
      const slug = currentRoute.replace('/business/', '');
      return <BusinessDetailsPage slug={slug} navigate={navigate} />;
    }

    if (currentRoute.startsWith('/qr/')) {
      const slug = currentRoute.replace('/qr/', '');
      return <BusinessDetailsPage slug={slug} navigate={navigate} />;
    }

    // 2. Business Dashboard & subtabs
    if (OWNER_DASHBOARD_ROUTES.includes(currentRoute)) {
      const tab = currentRoute.replace('/business/', '') || 'dashboard';
      return <BusinessDashboardPage navigate={navigate} initialTab={tab} />;
    }

    // 3. Auth routes
    if (currentRoute === '/business/register') {
      return <BusinessRegisterPage navigate={navigate} />;
    }
    if (currentRoute === '/business/login') {
      return <BusinessLoginPage navigate={navigate} />;
    }

    // 4. Customer routes
    if (currentRoute === '/discover') {
      return <DiscoveryPage businesses={businesses} navigate={navigate} />;
    }
    if (currentRoute === '/my-queue') {
      return <MyQueuePage navigate={navigate} />;
    }
    if (currentRoute === '/orders') {
      return <OrdersPage navigate={navigate} />;
    }
    if (currentRoute === '/how-it-works') {
      return <HowItWorksPage navigate={navigate} />;
    }

    // Default route: Home
    return <HomePage navigate={navigate} businesses={businesses} />;
  };

  const isOwnerDashboard = OWNER_DASHBOARD_ROUTES.includes(currentRoute);

  return (
    <AuthProvider>
      <QueueProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col font-sans text-[#171412] bg-[#FAF8F5]">
            <Navbar currentRoute={currentRoute} navigate={navigate} />
            <div className="flex-1">
              {renderContent()}
            </div>
            {!isOwnerDashboard && <Footer navigate={navigate} />}
          </div>
        </CartProvider>
      </QueueProvider>
    </AuthProvider>
  );
}
