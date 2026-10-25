import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getApiConfigInfo, setRuntimeBackendUrl } from '../services/api';
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle, AlertTriangle, Server, Check, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Diagnostic Configuration State
  const [configInfo, setConfigInfo] = useState(getApiConfigInfo());
  const [showConfigModal, setShowConfigModal] = useState(!configInfo.isConfigured);
  const [customBackendUrl, setCustomBackendUrl] = useState(configInfo.runtimeUrl || configInfo.envUrl || '');

  useEffect(() => {
    setConfigInfo(getApiConfigInfo());
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      notifyError('Please enter both email and password');
      return;
    }

    if (!configInfo.isConfigured) {
      notifyError('Backend URL is not configured. Please set your Render backend URL before logging in.');
      setShowConfigModal(true);
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      notifySuccess(`Welcome back, ${user.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Invalid login credentials';
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBackendUrl = (e) => {
    e?.preventDefault();
    if (!customBackendUrl.trim()) {
      notifyError('Please enter a valid backend URL (e.g. https://your-backend.onrender.com)');
      return;
    }
    setRuntimeBackendUrl(customBackendUrl);
    notifySuccess('Backend URL saved. Reloading configuration...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleResetBackendUrl = () => {
    setRuntimeBackendUrl('');
    notifyInfo('Runtime backend URL cleared. Reloading defaults...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
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

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Missing Backend URL Warning Banner */}
        {!configInfo.isConfigured && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-amber-950">Backend Web Service URL Required</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  This production frontend requires <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">VITE_API_URL</code> to reach the Express API.
                </p>
                <button
                  type="button"
                  onClick={() => setShowConfigModal((prev) => !prev)}
                  className="mt-2 text-xs font-bold text-[#F58220] hover:text-[#DF7215] underline flex items-center gap-1"
                >
                  <Server className="w-3.5 h-3.5" />
                  {showConfigModal ? 'Hide Configuration Panel' : 'Configure Backend URL Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Runtime URL Configuration Box */}
        {showConfigModal && (
          <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#F58220]" />
                Render Backend Service URL
              </span>
              {configInfo.runtimeUrl && (
                <button
                  type="button"
                  onClick={handleResetBackendUrl}
                  className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px]"
                  title="Reset to default build URL"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
            <form onSubmit={handleSaveBackendUrl} className="space-y-2.5">
              <input
                type="url"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                placeholder="https://your-backend.onrender.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#F58220] focus:outline-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">
                  Auto-appends <code className="font-mono">/api</code>
                </span>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#F58220] hover:bg-[#DF7215] text-white font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save & Apply
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Login Card */}
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

        {/* Security badge and diagnostic telemetry footer */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-[11px] text-gray-400">
            Protected by VISTEON Industrial SSO & Audit Encryption
          </p>
          <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1.5">
            <span>API Target:</span>
            <code className="text-gray-600 bg-gray-100 px-1 py-0.5 rounded font-mono truncate max-w-[240px]">
              {configInfo.activeBaseUrl === '__MISSING_PRODUCTION_BACKEND_URL__'
                ? 'Unconfigured (Missing VITE_API_URL)'
                : configInfo.activeBaseUrl}
            </code>
            <button
              type="button"
              onClick={() => setShowConfigModal((prev) => !prev)}
              className="text-[#F58220] hover:underline font-semibold text-[10px]"
            >
              (Edit)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
