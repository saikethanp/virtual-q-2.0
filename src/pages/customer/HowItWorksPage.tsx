import React from 'react';
import { 
  Smartphone, 
  Clock, 
  MapPin, 
  Store, 
  QrCode, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface HowItWorksPageProps {
  navigate: (route: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-12 pb-16 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8A796E] bg-[#FAF5EE] px-3.5 py-1.5 rounded-full border border-[#ECE5DC]">
          The Intelligent Queue Standard
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171412] tracking-tight mt-4">
          How Virtual-Q Works
        </h1>
        <p className="text-base text-[#766B63] max-w-xl mx-auto mt-3 leading-relaxed">
          Skip the physical line and live more. Here is how our zero-friction digital queue workflow saves hours for customers and business owners.
        </p>
      </section>

      {/* For Customers */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 mb-20">
        <div className="border-b border-[#EAE4DC] pb-4 mb-8">
          <span className="text-xs font-bold uppercase text-[#8A796E]">For Customers</span>
          <h2 className="text-2xl font-bold text-[#171412] mt-1">Zero-Friction Token Experience</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] text-[#3D2010] flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[#171412]">Discover & Select</h3>
              <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
                Open Virtual-Q or scan the business QR code. Browse canteens, clinics, or salons without creating an account or entering passwords.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#F5F2EC] flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Instant Guest Access</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] text-[#3D2010] flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[#171412]">Get Digital Token</h3>
              <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
                Hit "Join Queue" to receive your atomic sequential token (e.g., Q101). Watch real-time position updates as preceding customers are served.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#F5F2EC] flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Live Queue Velocity</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] text-[#3D2010] flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[#171412]">Smart Arrival Departure</h3>
              <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
                Enter your travel time. Our arrival engine notifies you with the exact departure time so you step inside right as your token is called.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#F5F2EC] flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>No Physical Waiting</span>
            </div>
          </div>
        </div>
      </section>

      {/* For Businesses */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8">
        <div className="border-b border-[#EAE4DC] pb-4 mb-8">
          <span className="text-xs font-bold uppercase text-[#8A796E]">For Business Owners</span>
          <h2 className="text-2xl font-bold text-[#171412] mt-1">Multi-Counter Streamlining</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] text-[#3D2010] flex items-center justify-center font-bold text-lg mb-4">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#171412]">Register in 60s</h3>
            <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
              Create your business profile, set up your service stations or counters, and upload menu items with individual pricing in INR.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] text-[#3D2010] flex items-center justify-center font-bold text-lg mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#171412]">Deploy QR Standee</h3>
            <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
              Generate and print your high-res standee QR code to display at your storefront, entrance lobby, or counter.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF5EE] text-[#3D2010] flex items-center justify-center font-bold text-lg mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#171412]">One-Tap Token Call</h3>
            <p className="text-xs text-[#766B63] mt-2 leading-relaxed">
              Serve customers with atomic advancement. When you finish one customer, click "Call Next" to advance the queue across all devices instantly.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('/business/register')}
            className="px-8 py-3.5 rounded-2xl bg-[#3D2010] text-white font-bold text-sm shadow-md hover:bg-[#2A150A] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Register Your Business Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
