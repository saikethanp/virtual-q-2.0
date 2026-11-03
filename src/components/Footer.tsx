import React from 'react';
import { Coffee, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="border-t border-[#EFECE6] bg-[#FAF8F5] py-12 px-6 sm:px-8 mt-16 text-[#766B63]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center">
              <Coffee className="w-4 h-4 text-[#FAF8F5]" />
            </div>
            <span className="text-lg font-bold text-[#171412]">Virtual-Q</span>
          </div>
          <p className="text-sm max-w-sm text-[#766B63]">
            Skip the wait. Live more. Digital queue management and remote tokens for modern businesses and customers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <button 
            onClick={() => navigate('/discover')}
            className="hover:text-[#171412] transition-colors cursor-pointer"
          >
            Discover Businesses
          </button>
          <button 
            onClick={() => navigate('/how-it-works')}
            className="hover:text-[#171412] transition-colors cursor-pointer"
          >
            How it Works
          </button>
          <button 
            onClick={() => navigate('/my-queue')}
            className="hover:text-[#171412] transition-colors cursor-pointer"
          >
            My Queue
          </button>
          <button 
            onClick={() => navigate('/business/register')}
            className="hover:text-[#171412] transition-colors font-medium text-[#3D2010] cursor-pointer"
          >
            Register Your Business
          </button>
          <button 
            onClick={() => navigate('/business/login')}
            className="hover:text-[#171412] transition-colors cursor-pointer"
          >
            Owner Login
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#EFECE6] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9E948C] gap-4">
        <p>© 2026 Virtual-Q Technologies. All rights reserved.</p>
        <div className="flex items-center gap-1.5 text-xs text-[#766B63]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Production Ready with Supabase RLS & PostgreSQL Engine</span>
        </div>
      </div>
    </footer>
  );
};
