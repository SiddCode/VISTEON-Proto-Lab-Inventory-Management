import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import VisteonLogo from './VisteonLogo';

export default function TopHeader({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { notifyInfo } = useNotification();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard Overview';
    if (path.includes('/inward')) return 'Component Inward & Registration';
    if (path.includes('/outward')) return 'Stock Outward & Dispatch';
    if (path.includes('/reports')) return 'Outward Transaction Reports';
    if (path.includes('/settings')) return 'System Settings';
    return 'Inventory Management';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Route global search to Inward or Reports depending on preference
    navigate(`/inward?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200 shadow-2xs">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-gray-600 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Visteon mark */}
        <div className="md:hidden">
          <VisteonLogo showText={false} className="h-7" />
        </div>

        {/* Active Page Title & Breadcrumb */}
        <div className="hidden sm:block">
          <h1 className="text-base font-bold text-[#20252B] tracking-tight">{getPageTitle()}</h1>
          <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
            <span className="inline-block w-3 h-2.5 flex-shrink-0">
              <svg viewBox="0 0 294 239" className="w-full h-full fill-[#F58220]">
                <path d="M0 0 L112 0 L204 147 L147 239 Z" />
                <path d="M206 0 L294 0 L206 147 Z" />
              </svg>
            </span>
            VISTEON Proto Lab - Inventory Control
          </p>
        </div>
      </div>

      {/* Center Global Search */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-2 sm:mx-6">
        <form onSubmit={handleGlobalSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search Part No, MPN, Tracking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] focus:bg-white transition-all placeholder:text-gray-400"
          />
        </form>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <button
          onClick={() => notifyInfo('All warehouse systems functioning normally. Real-time sync active.')}
          className="relative p-2 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 focus:outline-none transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F58220]"></span>
        </button>

        {/* User Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#20252B] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {user?.name ? user.name.charAt(0) : 'V'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-[#20252B] leading-tight">
                {user?.name || 'Visteon User'}
              </div>
              <div className="text-[10px] text-gray-500 font-semibold tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {user?.role || 'OPERATOR'}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">Signed in as</p>
                <p className="text-sm font-bold text-[#20252B] truncate">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  {user?.role} Access
                </span>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 text-gray-500" />
                Profile & Settings
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
