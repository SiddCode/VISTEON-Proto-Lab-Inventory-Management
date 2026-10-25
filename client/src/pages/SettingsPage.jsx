import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import VisteonLogo from '../components/common/VisteonLogo';
import {
  Settings,
  Shield,
  Database,
  Building,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [settings, setSettings] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [companyName, setCompanyName] = useState('VISTEON');
  const [defaultBoxPrefix, setDefaultBoxPrefix] = useState('BOX-');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);

  // Profile form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Seed sample data dialog
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await settingsService.getSettings();
      if (res.success) {
        setSettings(res.settings);
        setSystemStats(res.systemStats);
        setCompanyName(res.settings.companyName || 'VISTEON');
        setDefaultBoxPrefix(res.settings.defaultBoxPrefix || 'BOX-');
        setLowStockThreshold(res.settings.lowStockThreshold || 10);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await settingsService.updateSettings({
        companyName,
        defaultBoxPrefix,
        lowStockThreshold: Number(lowStockThreshold),
      });
      if (res.success) {
        notifySuccess('System settings updated successfully.');
        setSettings(res.settings);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update settings. Admin permissions required.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = { name: profileName };
      if (newPassword) {
        if (!currentPassword) {
          notifyError('Current password is required to set a new password');
          setSavingProfile(false);
          return;
        }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      await updateProfile(payload);
      notifySuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTriggerSeed = async () => {
    setSeeding(true);
    try {
      const res = await settingsService.triggerSeed();
      if (res.success) {
        notifySuccess('Database seeded successfully with sample automotive components and transactions.');
        setSeedConfirmOpen(false);
        fetchSettings();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to trigger database seeding.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading system configuration..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#20252B] tracking-tight">
            System Settings & Administration
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Enterprise company configuration, security credentials, and database diagnostics
          </p>
        </div>

        <button
          onClick={() => setSeedConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#20252B] hover:bg-gray-800 rounded-xl transition-colors shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-[#F58220]" />
          Load Sample Seed Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company & Operational Preferences */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#20252B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#F58220]" />
              Enterprise Branding & Warehouse Defaults
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Default Storage Box Prefix
                  </label>
                  <input
                    type="text"
                    value={defaultBoxPrefix}
                    onChange={(e) => setDefaultBoxPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Highlight parts with available stock equal or less than this quantity
                  </p>
                </div>
              </div>

              {/* Allowed Automotive Programs list */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Predefined Automotive Programs
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {settings?.allowedPrograms?.map((prog) => (
                    <span
                      key={prog}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-800"
                    >
                      {prog}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg shadow-xs transition-colors"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* User Profile & Security */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#20252B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#F58220]" />
              User Profile & Password Security
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="font-semibold text-gray-700 uppercase tracking-wider text-[11px] mb-3">
                  Change Password (Leave blank to keep unchanged)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      New Password (Min 6 chars)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#20252B] hover:bg-gray-800 rounded-lg shadow-xs transition-colors"
                >
                  {savingProfile ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Diagnostics & Environment Info */}
        <div className="space-y-6">
          {/* Brand Identity Card */}
          <div className="bg-[#20252B] text-white rounded-2xl p-6 shadow-md border border-gray-800 flex flex-col items-center text-center">
            <VisteonLogo variant="sidebar" className="h-10 mb-3" />
            <h4 className="text-base font-extrabold tracking-tight">VISTEON Corporation</h4>
            <p className="text-xs text-gray-400 mt-1">
              Connected Cockpit & Industrial Inventory SaaS Platform
            </p>
            <div className="mt-4 pt-4 border-t border-gray-800 w-full flex items-center justify-around text-xs text-gray-300">
              <div>
                <span className="block text-gray-500 text-[10px] uppercase">Theme</span>
                <span className="font-bold text-[#F58220]">#F58220</span>
              </div>
              <div>
                <span className="block text-gray-500 text-[10px] uppercase">Engine</span>
                <span className="font-bold text-emerald-400">Node / MERN</span>
              </div>
            </div>
          </div>

          {/* Database & Runtime Diagnostics */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-[#20252B] uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#F58220]" />
              Database & Runtime Telemetry
            </h3>

            <div className="divide-y divide-gray-100">
              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Database Driver:</span>
                <span className="font-bold text-gray-800">MongoDB with Mongoose</span>
              </div>

              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Active Parts:</span>
                <span className="font-mono font-bold text-gray-800">
                  {systemStats?.totalInventoryRecords ?? '0'} records
                </span>
              </div>

              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Audit Transactions:</span>
                <span className="font-mono font-bold text-[#F58220]">
                  {systemStats?.totalTransactions ?? '0'} ledger rows
                </span>
              </div>

              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Active Accounts:</span>
                <span className="font-bold text-gray-800">{systemStats?.activeUsers ?? '0'} users</span>
              </div>

              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Node Engine:</span>
                <span className="font-mono font-bold text-gray-800">{systemStats?.nodeVersion || 'v24'}</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Database connection verified & active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Seed Data */}
      <ConfirmDialog
        isOpen={seedConfirmOpen}
        onClose={() => setSeedConfirmOpen(false)}
        onConfirm={handleTriggerSeed}
        title="Load Sample Automotive Inventory?"
        message="This will reset and populate the database with realistic VISTEON inventory records across Renault Nissan, Mahindra, Skoda, Tata, TVS, Royal Enfield, Honda, Maruti Suzuki, and PSA programs, along with historical inward and outward transactions."
        confirmText="Populate Seed Data"
        cancelText="Cancel"
        loading={seeding}
      />
    </div>
  );
}
