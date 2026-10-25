import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import StatCard from '../components/common/StatCard';
import InwardOutwardChart from '../components/dashboard/InwardOutwardChart';
import { ProgramBadge, StockStatusBadge, TransactionTypeBadge } from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import CreatePartModal from '../components/inward/CreatePartModal';
import ReceiveStockModal from '../components/inward/ReceiveStockModal';
import OutwardModal from '../components/outward/OutwardModal';
import PartDetailsModal from '../components/inward/PartDetailsModal';
import {
  Layers,
  Cpu,
  Package,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Barcode,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [outwardModalOpen, setOutwardModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsPartId, setDetailsPartId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardService.getDashboardSummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Connecting to database and computing live KPIs..." />;
  }

  const kpis = data?.kpis || {
    inventoryRecords: 0,
    uniquePartNumbers: 0,
    totalQuantity: 0,
    storageBoxes: 0,
    lowStockCount: 0,
    zeroStockCount: 0,
  };

  const recentInward = data?.recentInward || [];
  const recentOutward = data?.recentOutward || [];
  const stockByProgram = data?.stockByProgram || [];
  const lowStockItems = data?.lowStockItems || [];
  const movementChartData = data?.movementChartData || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#20252B] tracking-tight">
              Operational Inventory Dashboard
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Live Mongo Feed
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time component tracking, inward receiving, and dispatch telemetry across programs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create Part
          </button>

          <button
            onClick={() => navigate('/outward')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#20252B] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <ArrowUpFromLine className="w-4 h-4 text-[#F58220]" />
            Scan Outward
          </button>
        </div>
      </div>

      {/* 4 Prominent KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI A: Inventory Records */}
        <StatCard
          title="Inventory Records"
          value={kpis.inventoryRecords}
          subtitle="Active registered component items"
          icon={Layers}
          badgeText="Cataloged"
          badgeType="primary"
          accentColor="#F58220"
        />

        {/* KPI B: Unique Part Numbers */}
        <StatCard
          title="Unique Part Numbers"
          value={kpis.uniquePartNumbers}
          subtitle="Distinct parts with active stock"
          icon={Cpu}
          badgeText="Active SKUs"
          badgeType="success"
          accentColor="#10B981"
        />

        {/* KPI C: Total Quantity */}
        <StatCard
          title="Total Quantity"
          value={kpis.totalQuantity}
          subtitle="Total available component units"
          icon={Package}
          badgeText="In Stock"
          badgeType="primary"
          accentColor="#F58220"
        />

        {/* KPI D: Storage Location in Boxes */}
        <StatCard
          title="Storage Location in Boxes"
          value={kpis.storageBoxes}
          subtitle="Occupied distinct bin locations"
          icon={Boxes}
          badgeText="Occupied"
          badgeType="neutral"
          accentColor="#6366F1"
        />
      </div>

      {/* Threshold Health & Low Stock Indicator Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Warning Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            kpis.lowStockCount > 0
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-white border-gray-200'
          } shadow-xs flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                kpis.lowStockCount > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#20252B]">Low-Stock Alerts</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    kpis.lowStockCount > 0 ? 'bg-amber-200/80 text-amber-900' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {kpis.lowStockCount} Parts
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Available stock &le; configured individual part threshold
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/inward?stockStatus=LOW_STOCK')}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200/70 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            Review <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Critical Zero Stock Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            kpis.zeroStockCount > 0
              ? 'bg-red-50/70 border-red-200'
              : 'bg-white border-gray-200'
          } shadow-xs flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                kpis.zeroStockCount > 0 ? 'bg-red-500 text-white shadow-xs' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#20252B]">Critical Stock Depleted</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    kpis.zeroStockCount > 0 ? 'bg-red-200/80 text-red-900' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {kpis.zeroStockCount === 0 ? '0 Empty' : `${kpis.zeroStockCount} Critical`}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Zero available units remaining in storage locations
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/inward?stockStatus=OUT_OF_STOCK')}
            className="text-xs font-bold text-red-800 hover:text-red-900 bg-red-100 hover:bg-red-200/70 px-3 py-1.5 rounded-lg border border-red-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            Inspect <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Section: Inward vs Outward Chart & Stock by Program */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#20252B] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F58220]" />
                Inward vs Outward Movement Trend (Last 7 Days)
              </h3>
              <p className="text-[11px] text-gray-400">
                Daily volume comparison of components received vs components dispatched
              </p>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
              Telemetry
            </span>
          </div>

          <InwardOutwardChart data={movementChartData} />
        </div>

        {/* Stock Breakdown by Automotive Program */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#20252B]">Stock by Program</h3>
            <span className="text-[11px] text-gray-400 font-semibold">{stockByProgram.length} Programs</span>
          </div>
          <p className="text-[11px] text-gray-500 mb-4">Available units distribution per customer program</p>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-64 pr-1">
            {stockByProgram.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-8">No program stock registered yet.</div>
            ) : (
              stockByProgram.map((item) => {
                const totalStock = kpis.totalQuantity || 1;
                const percentage = Math.round((item.totalQuantity / totalStock) * 100) || 0;
                return (
                  <div key={item._id} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800">{item._id}</span>
                      <span className="font-mono font-bold text-gray-900">
                        {item.totalQuantity} <span className="text-gray-400 font-normal">units</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#F58220] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts (if any) */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">Low Stock Attention Required</h3>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Evaluated Against Individual Part Thresholds
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((part) => (
              <div
                key={part._id}
                className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#20252B]">{part.partNumber}</span>
                    {part.barcode && (
                      <span className="text-[9px] font-mono text-gray-400 bg-gray-50 border border-gray-200 px-1 rounded">
                        {part.barcode}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                    {part.program} • {part.rack || part.bin ? `${part.rack || '—'} / ${part.bin || '—'}` : part.storageBox}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    Min Threshold: <span className="font-bold text-gray-600">{part.minStockThreshold ?? 10}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${
                    part.availableQuantity === 0
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {part.availableQuantity} left
                  </span>
                  <button
                    onClick={() => {
                      setSelectedPart(part);
                      setReceiveModalOpen(true);
                    }}
                    className="p-1.5 text-xs text-[#F58220] hover:bg-[#FFF3E8] rounded-lg border border-[#F58220]/20 transition-colors cursor-pointer"
                    title="Receive Stock"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Section: Recent Inward Activity & Recent Outward Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inward Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#20252B] flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
              Recent Inward Activity
            </h3>
            <button
              onClick={() => navigate('/inward')}
              className="text-xs font-semibold text-[#F58220] hover:underline flex items-center gap-1"
            >
              View Inward <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentInward.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No recent inward movements recorded.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {recentInward.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between hover:bg-gray-50/60 px-1 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.partNumber}</span>
                      <ProgramBadge program={item.program} />
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                      TRK: {item.trackingId} • Ref: {item.referenceNumber || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-emerald-600">+{item.quantity}</span>
                    <p className="text-[10px] text-gray-400">
                      {new Date(item.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Outward Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#20252B] flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-[#F58220]" />
              Recent Outward Activity
            </h3>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-[#F58220] hover:underline flex items-center gap-1"
            >
              All Reports <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOutward.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No recent outward dispatches recorded.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {recentOutward.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between hover:bg-gray-50/60 px-1 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.partNumber}</span>
                      <ProgramBadge program={item.program} />
                    </div>
                    <div className="text-[11px] text-gray-500 truncate max-w-[220px] mt-0.5">
                      To: {item.recipient || 'General Assembly'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-[#F58220]">-{item.quantity}</span>
                    <p className="text-[10px] text-gray-400">
                      {new Date(item.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreatePartModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />

      <ReceiveStockModal
        isOpen={receiveModalOpen}
        onClose={() => {
          setReceiveModalOpen(false);
          setSelectedPart(null);
        }}
        part={selectedPart}
        onSuccess={() => fetchDashboardData()}
      />

      <PartDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsPartId(null);
        }}
        partId={detailsPartId}
        onReceiveStock={(p) => {
          setSelectedPart(p);
          setReceiveModalOpen(true);
        }}
      />
    </div>
  );
}
