import React, { useState, useMemo } from 'react';
import { 
  Search, 
  LayoutGrid, 
  Utensils, 
  Scissors, 
  PlusCircle, 
  Wrench, 
  MoreHorizontal,
  MapPin,
  Clock,
  Users,
  Coffee
} from 'lucide-react';
import { Business, BusinessCategory } from '../../types';
import { BusinessCard } from '../../components/BusinessCard';

interface DiscoveryPageProps {
  businesses: Business[];
  navigate: (route: string) => void;
}

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({ businesses, navigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { label: BusinessCategory; icon: React.ReactNode }[] = [
    { label: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: 'Restaurants', icon: <Utensils className="w-4 h-4" /> },
    { label: 'Salons', icon: <Scissors className="w-4 h-4" /> },
    { label: 'Clinics', icon: <PlusCircle className="w-4 h-4" /> },
    { label: 'Services', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
  ];

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        b.name.toLowerCase().includes(q) || 
        b.location.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [businesses, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Top Banner matching Reference 2 */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#FAF8F5] via-[#F6EFE6] to-[#EFE7DC] border-b border-[#EAE3D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171412] tracking-tight">
              Discover Businesses
            </h1>
            <p className="text-sm sm:text-base text-[#766B63] mt-2">
              Browse verified restaurants, salons, clinics, and government services with live digital queues.
            </p>

            {/* Search Input matching Reference 2 */}
            <div className="mt-6 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9E948C]">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search businesses or services..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-[#E0D8CE] text-sm text-[#171412] placeholder-[#A3968A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-[#766B63] hover:text-[#171412]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Decorative subtle ambient circle */}
        <div className="absolute right-0 top-0 w-96 h-full opacity-30 pointer-events-none hidden lg:block">
          <div className="w-96 h-96 rounded-full bg-[#E5D7C5] blur-3xl" />
        </div>
      </section>

      {/* Category Pills matching Reference 2 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-4">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(({ label, icon }) => {
            const isActive = selectedCategory === label;
            return (
              <button
                key={label}
                onClick={() => setSelectedCategory(label)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#3D2010] text-[#FAF8F5] shadow-sm'
                    : 'bg-white border border-[#E2DBD1] text-[#63554A] hover:bg-[#F3ECE2]'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Business Cards Grid matching Reference 2 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {filteredBusinesses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#EFECE6] max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-[#FAF5EE] text-[#6D4222] flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#171412]">No businesses found</h3>
            <p className="text-xs text-[#766B63] mt-1">
              Try adjusting your category filter or search keywords.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-[#3D2010] text-white rounded-xl text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map(biz => (
              <BusinessCard
                key={biz.id}
                business={biz}
                waitingCount={0}
                estWaitMinutes={0}
                onSelect={(b) => navigate(`/business/${b.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
