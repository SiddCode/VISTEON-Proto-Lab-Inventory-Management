import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileSpreadsheet,
  Settings,
  X,
  Layers,
} from 'lucide-react';
import VisteonLogo from './VisteonLogo';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inward', path: '/inward', icon: ArrowDownToLine, badge: 'Stock In' },
    { name: 'Outward', path: '/outward', icon: ArrowUpFromLine, badge: 'Stock Out' },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#20252B] text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-gray-800 shadow-xl md:shadow-none`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-800 bg-[#171B20]/60">
          <VisteonLogo variant="sidebar" className="h-8" />
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Program context badge */}
        <div className="px-5 py-3 border-b border-gray-800/80 bg-[#171B20]/30">
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold tracking-wider uppercase">
            <span>Proto Lab - Menu</span>
            <span className="flex items-center text-emerald-400 font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
              Live Sync
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#F58220] text-white shadow-md font-semibold'
                      : 'text-gray-300 hover:bg-[#2A3038] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-gray-800 bg-[#171B20]/40 text-xs text-gray-400">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#F58220]" />
            <span className="font-semibold text-gray-300">VISTEON Proto lab</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-tight">
            Inventory & Traceability Platform v2.6
          </p>
        </div>
      </aside>
    </>
  );
}
