import React from 'react';
import { 
  ArrowRight, 
  Zap, 
  Clock, 
  ShoppingBag, 
  BarChart3, 
  CheckCircle2, 
  Circle, 
  Store,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Business } from '../../types';

interface HomePageProps {
  navigate: (route: string) => void;
  businesses: Business[];
}

export const HomePage: React.FC<HomePageProps> = ({ navigate, businesses }) => {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero Section matching Reference 1 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Pill Kicker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4EDE4] text-[#6D4222] text-xs sm:text-sm font-semibold tracking-wide uppercase mb-6">
              The Digital Queue
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-[#171412] tracking-tight leading-[1.08] text-balance">
              Skip the wait.
            </h1>
            <p className="text-2xl sm:text-4xl lg:text-[40px] font-bold text-[#634832] mt-2 sm:mt-3 tracking-tight leading-tight">
              Join the queue before you arrive.
            </p>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-[#766B63] mt-5 max-w-xl leading-relaxed">
              Virtual-Q lets you take digital tokens remotely, track your real-time position from anywhere, and arrive just when it's your turn. No paper tickets. No wasted hours.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mt-8 sm:mt-10">
              <button
                onClick={() => navigate('/discover')}
                className="px-7 py-3.5 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-semibold text-base shadow-sm hover:bg-[#2A150A] hover:shadow-md transition-all flex items-center gap-2.5 cursor-pointer group"
              >
                <span>Explore Businesses</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/how-it-works')}
                className="px-7 py-3.5 rounded-2xl bg-white border border-[#E0D8CE] text-[#171412] font-semibold text-base hover:bg-[#F5F2EC] transition-all cursor-pointer"
              >
                How it Works
              </button>
            </div>
          </div>

          {/* Right Mobile Ticket Mockup matching Reference 1 */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[40px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(61,32,16,0.08)] border border-[#EFECE6] transform hover:-translate-y-1 transition-all duration-300">
              {/* Phone Status Header */}
              <div className="flex items-center justify-between text-xs font-semibold text-[#8C8278] mb-5 px-1">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>5G</span>
                </div>
              </div>

              {/* Business Profile in Mockup */}
              <div className="flex items-center gap-3.5 pb-5 border-b border-[#F5F2EC]">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 overflow-hidden border border-[#EAE4DC] flex items-center justify-center text-xl shadow-inner">
                  🍔
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#171412]">Burger House</h4>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Open Now</span>
                  </div>
                </div>
              </div>

              {/* Your Token Big Box */}
              <div className="my-6 p-6 rounded-3xl bg-[#FAF6F0] border border-[#ECE5DC] text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8A796E]">
                  Your Token
                </span>
                <div className="text-5xl font-black text-[#171412] tracking-tight mt-1 font-mono">
                  Q127
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] text-center">
                  <span className="text-[11px] font-medium text-[#8A796E] block">Position</span>
                  <span className="text-xl font-bold text-[#171412] tabular-nums mt-0.5 block">04</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] text-center">
                  <span className="text-[11px] font-medium text-[#8A796E] block">Est. Wait</span>
                  <div className="flex items-center justify-center gap-1 text-xl font-bold text-[#171412] tabular-nums mt-0.5">
                    <Clock className="w-4 h-4 text-[#A89A8E]" />
                    <span>12 min</span>
                  </div>
                </div>
              </div>

              {/* Step Tracker Q124 -> Q125 -> Q126 -> Q127 */}
              <div className="pt-2 pb-1">
                <div className="relative flex items-center justify-between">
                  {/* Connecting Line */}
                  <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#E8E1D8]" />

                  {/* Step 1: Q124 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#8A796E] mt-1.5">Q124</span>
                  </div>

                  {/* Step 2: Q125 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#8A796E] mt-1.5">Q125</span>
                  </div>

                  {/* Step 3: Q126 (Serving) */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm ring-4 ring-amber-100">
                      <Circle className="w-2.5 h-2.5 fill-white" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-800 mt-1.5">Q126</span>
                  </div>

                  {/* Step 4: Q127 (Your token) */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-[#D9D1C7] text-[#8A796E] flex items-center justify-center shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#A89A8E]" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#171412] mt-1.5">Q127</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Strip matching Reference 1 */}
        <div className="mt-14 sm:mt-20 pt-8 border-t border-[#EFECE6] grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#6D4222] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#6D4222]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171412]">Join Remotely</h4>
              <p className="text-xs text-[#766B63] mt-0.5">Get a token from anywhere</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#6D4222] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#6D4222]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171412]">Live Tracking</h4>
              <p className="text-xs text-[#766B63] mt-0.5">Real-time position updates</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#6D4222] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-[#6D4222]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171412]">Order Ahead</h4>
              <p className="text-xs text-[#766B63] mt-0.5">Pay at counter upon arrival</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#EFECE6] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#6D4222] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-[#6D4222]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171412]">For All Businesses</h4>
              <p className="text-xs text-[#766B63] mt-0.5">Clinics, cafes, salons & more</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Businesses Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#171412]">Active Businesses Near You</h2>
            <p className="text-xs text-[#766B63] mt-1">Live digital queues accepting remote tokens right now.</p>
          </div>
          <button
            onClick={() => navigate('/discover')}
            className="flex items-center gap-1 text-sm font-bold text-[#3D2010] hover:underline cursor-pointer"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.slice(0, 3).map((biz) => (
            <div
              key={biz.id}
              onClick={() => navigate(`/business/${biz.slug}`)}
              className="bg-white rounded-3xl p-4 border border-[#EFECE6] hover:border-[#D9D1C7] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3.5">
                  <img
                    src={biz.banner_url || '/assets/aistudio/Warm_Virtual-Q_Business_Discovery_6cffc5a7.png'}
                    alt={biz.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-[#8A796E] font-medium">{biz.category}</span>
                <h3 className="text-base font-bold text-[#171412] mt-0.5 line-clamp-1">{biz.name}</h3>
                <p className="text-xs text-[#766B63] mt-1 line-clamp-1">{biz.location}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F5F2EC] flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Open Now</span>
                </span>
                <span className="text-[#3D2010] font-bold flex items-center gap-1">
                  <span>Join Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
