import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import VisteonLogo from '../components/common/VisteonLogo';
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      notifyError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      notifySuccess(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Visteon Logo Header */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-3 rounded-2xl shadow-sm border border-gray-200/80 flex items-center justify-center mb-3">
            <img
              src="/visteon-logo.png"
              alt="Visteon Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-[#20252B] tracking-tight">Visteon</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F58220]"></span>
          </div>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            Proto Lab - Inventory Management System
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-200/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Visteon Enterprise Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@visteon.com"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F58220] focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F58220] focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#F58220] hover:bg-[#DF7215] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F58220] transition-all ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick Demo Access Credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 text-center">
              Quick One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin@visteon.com', 'admin123')}
                className="flex flex-col items-start p-2.5 rounded-lg border border-gray-200 hover:border-[#F58220] hover:bg-[#FFF3E8]/40 transition-colors text-left"
              >
                <span className="font-bold text-[#20252B] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F58220]" />
                  Admin
                </span>
                <span className="text-[10px] text-gray-500 truncate w-full">admin@visteon.com</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('operator@visteon.com', 'operator123')}
                className="flex flex-col items-start p-2.5 rounded-lg border border-gray-200 hover:border-[#F58220] hover:bg-[#FFF3E8]/40 transition-colors text-left"
              >
                <span className="font-bold text-[#20252B] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Operator
                </span>
                <span className="text-[10px] text-gray-500 truncate w-full">operator@visteon.com</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <p className="mt-4 text-center text-[11px] text-gray-400">
          Protected by VISTEON Industrial SSO & Audit Encryption
        </p>
      </div>
    </div>
  );
}
