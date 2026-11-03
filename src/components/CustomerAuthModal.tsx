import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
  title?: string;
  subtitle?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  title,
  subtitle,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { customerLogin, customerRegister } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your mobile phone number.');
        return;
      }
      // Simple phone format sanity check
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      const res = await customerRegister({
        fullName: fullName.trim(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        phone: cleanPhone,
        password,
      });
      setLoading(false);

      if (!res.success) {
        setError(res.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccessMsg('Account created successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } else {
      // Login mode: allow email OR mobile number
      const loginIdentifier = phone.trim() || email.trim();
      if (!loginIdentifier || !password) {
        setError('Please enter your mobile number or email and password.');
        return;
      }

      setLoading(true);
      const res = await customerLogin(loginIdentifier, password);
      setLoading(false);

      if (!res.success) {
        setError(res.message || 'Invalid mobile number, email, or password.');
        return;
      }

      setSuccessMsg('Signed in successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-[#EFECE6] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#EBE6DF] flex items-center justify-center text-[#766B63] hover:text-[#171412] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#3D2010] text-[#FAF8F5] flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#171412] tracking-tight">
            {title || (mode === 'login' ? 'Customer Sign In' : 'Create Customer Account')}
          </h3>
          <p className="text-xs sm:text-sm text-[#766B63] mt-1.5">
            {subtitle || (mode === 'login' 
              ? 'Sign in to place your order and track live queue progress.' 
              : 'Sign up in seconds. Your cart is preserved!')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#63554A] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D5CDC3] text-sm text-[#171412] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#63554A] mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D5CDC3] text-sm text-[#171412] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#63554A] mb-1">
                  Email Address <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com (optional)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D5CDC3] text-sm text-[#171412] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#63554A] mb-1">
                Mobile Number or Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={phone || email}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('@')) {
                      setEmail(val);
                      setPhone('');
                    } else {
                      setPhone(val);
                      setEmail('');
                    }
                  }}
                  placeholder="Enter your mobile number or email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D5CDC3] text-sm text-[#171412] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#63554A] mb-1">
              Password <span className="text-red-500">*</span>
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
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#D5CDC3] text-sm text-[#171412] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9E948C] hover:text-[#171412] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#63554A] mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D5CDC3] text-sm text-[#171412] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-semibold text-sm hover:bg-[#2C160B] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In & Continue' : 'Create Account & Continue'}</span>
            )}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-5 pt-4 border-t border-[#F0EAE1] text-center text-xs text-[#766B63]">
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className="font-bold text-[#3D2010] hover:underline cursor-pointer"
              >
                Register now
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="font-bold text-[#3D2010] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

