import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  BarChart3, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  MapPin, 
  Store, 
  AlertCircle,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessCategory } from '../../types';

interface BusinessRegisterPageProps {
  navigate: (route: string) => void;
}

export const BusinessRegisterPage: React.FC<BusinessRegisterPageProps> = ({ navigate }) => {
  const { register } = useAuth();

  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [category, setCategory] = useState<'Restaurants' | 'Cafes' | 'Salons' | 'Clinics' | 'Services' | 'Other'>('Restaurants');
  const [location, setLocation] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Business Email is required.');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (!businessName.trim()) {
      setErrorMessage('Business / Store Name is required.');
      return;
    }

    setSubmitting(true);
    const result = await register({
      ownerName: ownerName.trim() || businessName.trim(),
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      category: category || 'Restaurants',
      location: location.trim() || 'Main Branch',
    });
    setSubmitting(false);

    if (result.success) {
      navigate('/business/dashboard');
    } else {
      let msg = result.message || 'Registration failed. Please check your details.';
      if (msg.includes('is invalid') || msg.toLowerCase().includes('email')) {
        msg = `${msg}. If using a dummy email like test@gmail.com, Supabase Auth rejects it. In your Supabase Dashboard > Authentication > Providers > Email, turn off "Confirm email" to allow instant registration.`;
      } else if (msg.includes('rate limit')) {
        msg = `${msg}. Supabase free email rate limit exceeded. In your Supabase Dashboard > Authentication > Providers > Email, disable "Confirm email" so emails do not need to be sent.`;
      }
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 px-4 sm:px-8">
      {/* Top back navigation */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#63554A] hover:text-[#171412] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        {/* Left Side: Benefits & 3D Illustration matching Reference 4 */}
        <div className="lg:col-span-5 flex flex-col items-start">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#171412] tracking-tight leading-tight">
            Add your business to Virtual-Q
          </h1>

          {/* 3 Benefits matching Reference 4 */}
          <div className="flex flex-col gap-5 mt-8 sm:mt-10 w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5ECE0] text-[#43210C] flex items-center justify-center shrink-0 shadow-sm">
                <Users className="w-5 h-5 text-[#43210C]" />
              </div>
              <span className="text-base sm:text-lg font-bold text-[#171412]">
                Manage queues easily
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5ECE0] text-[#43210C] flex items-center justify-center shrink-0 shadow-sm">
                <BarChart3 className="w-5 h-5 text-[#43210C]" />
              </div>
              <span className="text-base sm:text-lg font-bold text-[#171412]">
                Get business insights
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5ECE0] text-[#43210C] flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5 text-[#43210C]" />
              </div>
              <span className="text-base sm:text-lg font-bold text-[#171412]">
                Reduce waiting time
              </span>
            </div>
          </div>

          {/* 3D Coffee Store Front Illustration matching Reference 4 */}
          <div className="mt-8 w-full max-w-sm rounded-3xl overflow-hidden border border-[#ECE5DC] bg-white shadow-sm hidden sm:block">
            <img
              src="/assets/aistudio/Virtual-Q_Business_Registration_Page_92d34123.png"
              alt="Virtual-Q 3D Store"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Right Side: Form Card matching Reference 4 */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[32px] border border-[#EFECE6] p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5EDE1] text-[#7A4923] text-xs font-bold tracking-wider uppercase mb-2">
                For Business Owners
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171412] tracking-tight">
                Register Your Business
              </h2>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Row 1: Owner Name & Business Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Business Owner Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Business / Store Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                      <Store className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. MITS Canteen"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Business Email <span className="text-red-500">*</span>
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
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
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
                      placeholder="Create password"
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

                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9E948C] hover:text-[#171412] cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Business Category & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Business Category
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010] appearance-none"
                    >
                      <option value="Restaurants">Restaurants</option>
                      <option value="Cafes">Cafes</option>
                      <option value="Salons">Salons</option>
                      <option value="Clinics">Clinics</option>
                      <option value="Services">Services</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171412] mb-1.5">
                    Business Location (City/Area)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E948C]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter your location (optional)"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#DCD5CB] text-sm text-[#171412] placeholder-[#A89A8E] focus:outline-none focus:ring-2 focus:ring-[#3D2010]/20 focus:border-[#3D2010]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button matching Reference 4 */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 py-4 rounded-2xl bg-[#3D2010] text-[#FAF8F5] font-bold text-sm sm:text-base shadow-sm hover:bg-[#2A150A] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating Business Account...' : 'Create Business Account'}
              </button>
            </form>

            <div className="text-center mt-6 text-xs sm:text-sm text-[#766B63]">
              Already have a business account?{' '}
              <button
                type="button"
                onClick={() => navigate('/business/login')}
                className="font-bold text-[#3D2010] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
