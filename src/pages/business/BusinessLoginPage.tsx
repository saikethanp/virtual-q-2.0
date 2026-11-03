import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle, Coffee } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface BusinessLoginPageProps {
  navigate: (route: string) => void;
}

export const BusinessLoginPage: React.FC<BusinessLoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (res.success) {
      navigate('/business/dashboard');
    } else {
      setError(res.message || 'Invalid credentials or business account not found.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-8">
      <div className="max-w-md mx-auto mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#63554A] hover:text-[#171412] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#EFECE6] p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center mx-auto mb-3">
            <Coffee className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A796E]">
            Business Owner Portal
          </span>
          <h1 className="text-2xl font-extrabold text-[#171412] mt-1">
            Sign In to Virtual-Q
          </h1>
          <p className="text-xs text-[#766B63] mt-1">
            Manage your live queues, counters, orders and settings.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#171412] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@business.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#171412] mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9E948C] hover:text-[#171412] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-sm shadow-sm hover:bg-[#2A150A] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-[#766B63]">
          Don't have a business account?{' '}
          <button
            type="button"
            onClick={() => navigate('/business/register')}
            className="font-bold text-[#3D2010] hover:underline cursor-pointer"
          >
            Register your business
          </button>
        </div>
      </div>
    </div>
  );
};
