import React, { useState, useEffect } from 'react';
import BarcodeScannerInput from '../components/outward/BarcodeScannerInput';
import ManualComponentSearch from '../components/outward/ManualComponentSearch';
import OutwardModal from '../components/outward/OutwardModal';
import TransactionDetailsModal from '../components/reports/TransactionDetailsModal';
import { stockService } from '../services/stockService';
import { ProgramBadge } from '../components/common/Badge';
import {
  ArrowUpFromLine,
  ScanBarcode,
  Search,
  CheckCircle2,
  Package,
  MapPin,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';

export default function OutwardPage() {
  const [selectedPart, setSelectedPart] = useState(null);
  const [outwardModalOpen, setOutwardModalOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manual'
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchRecentOutward = async () => {
    setLoadingRecent(true);
    try {
      const res = await stockService.getTransactions({
        type: 'OUTWARD',
        limit: 8,
      });
      if (res.success) {
        setRecentTransactions(res.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load recent outward transactions:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentOutward();
  }, []);

  const handlePartSelected = (part) => {
    setSelectedPart(part);
    setOutwardModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#20252B] tracking-tight">
              Component Outward & Dispatch Terminal
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF3E8] text-[#C96311] border border-[#F58220]/20">
              Stock-Out Workflow
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Barcode-driven component issue, atomic inventory decrement, and destination logging
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedPart && (
            <button
              onClick={() => setOutwardModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-xl shadow-xs transition-colors"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Issue Selected ({selectedPart.partNumber})
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'scanner'
              ? 'bg-[#20252B] text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ScanBarcode className="w-4 h-4 text-[#F58220]" />
          Barcode Scanning (USB / Bluetooth)
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'manual'
              ? 'bg-[#20252B] text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Search className="w-4 h-4 text-[#F58220]" />
          Manual Component Search
        </button>
      </div>

      {/* Main Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Input Mode */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'scanner' ? (
            <BarcodeScannerInput
              onPartFound={(part) => handlePartSelected(part)}
              onError={(msg) => console.warn(msg)}
            />
          ) : (
            <ManualComponentSearch
              onSelectPart={(part) => handlePartSelected(part)}
              selectedPartId={selectedPart?._id}
            />
          )}

          {/* Quick Active Selected Part Card (if any) */}
          {selectedPart && (
            <div className="bg-white rounded-xl border-2 border-[#F58220] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F58220]">
                  Target Component Ready For Outward
                </span>
                <h4 className="text-base font-extrabold text-[#20252B]">{selectedPart.partNumber}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                  <span>MPN: {selectedPart.mpn}</span>
                  <span>•</span>
                  <span>TRK: {selectedPart.trackingId}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Available:</span>
                  <span className="font-extrabold text-base text-emerald-600">
                    {selectedPart.availableQuantity} units
                  </span>
                </div>

                <button
                  onClick={() => setOutwardModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg shadow-xs transition-colors"
                >
                  Configure Dispatch
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Dispatch Instructions & Standard Operating Procedure */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-[#20252B] uppercase tracking-wider text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Standard Outward Procedure
          </h3>

          <ol className="list-decimal list-inside space-y-2 text-gray-600 leading-relaxed">
            <li>
              <strong className="text-gray-800">Scan Barcode:</strong> Point scanner at bin tag or component barcode label. The input automatically captures scanned input.
            </li>
            <li>
              <strong className="text-gray-800">Check Quantity:</strong> Verify that the available quantity on shelf matches the system balance.
            </li>
            <li>
              <strong className="text-gray-800">Specify Recipient:</strong> Enter the destination assembly line station, QA test bench, or dispatch memo.
            </li>
            <li>
              <strong className="text-gray-800">Atomic Confirmation:</strong> Stock deduction is confirmed in MongoDB instantly, preventing concurrent double-issues.
            </li>
          </ol>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-[11px] text-gray-500">
            <strong>Traceability Notice:</strong> Outward dispatches cannot be physically deleted once confirmed. An immutable audit record is logged with your operator ID.
          </div>
        </div>
      </div>

      {/* Recent Outward Dispatches Audit Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F58220]" />
            <h3 className="text-sm font-bold text-[#20252B]">Recent Outward Dispatches</h3>
          </div>
          <button
            onClick={fetchRecentOutward}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRecent ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No outward transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-3">Txn ID</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Program</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{tx.transactionId}</td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(tx.transactionDate).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#20252B]">{tx.partNumber}</td>
                    <td className="py-2.5 px-3">
                      <ProgramBadge program={tx.program} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-[#F58220]">
                      -{tx.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 truncate max-w-[160px]">
                      {tx.recipient || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{tx.processedByName || 'Operator'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedTxn(tx);
                          setDetailsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="View Full Audit Snapshot"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <OutwardModal
        isOpen={outwardModalOpen}
        onClose={() => setOutwardModalOpen(false)}
        part={selectedPart}
        onSuccess={() => {
          fetchRecentOutward();
        }}
      />

      <TransactionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedTxn(null);
        }}
        transaction={selectedTxn}
      />
    </div>
  );
}
