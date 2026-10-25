import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { ProgramBadge } from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner, { SkeletonRow } from '../components/common/LoadingSpinner';
import TransactionDetailsModal from '../components/reports/TransactionDetailsModal';
import { useNotification } from '../context/NotificationContext';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Calendar,
  Building,
  Eye,
  ArrowUpDown,
  RefreshCw,
  Hash,
  Boxes,
} from 'lucide-react';

export default function ReportsPage() {
  const { notifySuccess, notifyError } = useNotification();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalTransactions: 0, totalQuantityIssued: 0, distinctPartsCount: 0 });
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, limit: 15 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [recipientFilter, setRecipientFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [availableRecipients, setAvailableRecipients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('transactionDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [exporting, setExporting] = useState(false);

  // Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 15,
        sortBy,
        sortOrder,
      };

      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (programFilter !== 'ALL') params.program = programFilter;
      if (recipientFilter !== 'ALL') params.recipient = recipientFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await reportService.getOutwardReport(params);
      if (res.success) {
        setTransactions(res.transactions || []);
        setSummary(res.summary || { totalTransactions: 0, totalQuantityIssued: 0, distinctPartsCount: 0 });
        setPagination(res.pagination || { totalItems: 0, totalPages: 1, currentPage: 1, limit: 15 });
        if (res.filters?.availablePrograms) setAvailablePrograms(res.filters.availablePrograms);
        if (res.filters?.availableRecipients) setAvailableRecipients(res.filters.availableRecipients);
      }
    } catch (err) {
      console.error('Failed to load outward reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentPage, programFilter, recipientFilter, startDate, endDate, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchReports();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (programFilter !== 'ALL') params.program = programFilter;
      if (recipientFilter !== 'ALL') params.recipient = recipientFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      await reportService.exportOutwardCsv(params);
      notifySuccess('Outward report CSV generated and downloaded successfully.');
    } catch (err) {
      notifyError('Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setProgramFilter('ALL');
    setRecipientFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#20252B] tracking-tight">
              Outward Transactions Audit & Reports
            </h2>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              Audit Ledger
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Historical component dispatch ledger, recipient tracking, and CSV audit export
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchReports}
            className="p-2 text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting || summary.totalTransactions === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating CSV...' : 'Export Filtered CSV'}
          </button>
        </div>
      </div>

      {/* Summary KPI Badges for Active Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Matching Outward Dispatches
            </span>
            <span className="text-2xl font-black text-[#20252B]">
              {summary.totalTransactions.toLocaleString()}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
            <Hash className="w-5 h-5 text-[#F58220]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Total Quantity Issued
            </span>
            <span className="text-2xl font-black text-[#F58220]">
              {summary.totalQuantityIssued.toLocaleString()}{' '}
              <span className="text-xs font-normal text-gray-500">units</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFF3E8] flex items-center justify-center text-[#F58220] font-bold">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Distinct Parts Dispatched
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {summary.distinctPartsCount.toLocaleString()}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Date Range Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Txn ID, Part No, MPN, Tracking ID, Ref..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Program Filter */}
          <div>
            <select
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            >
              <option value="ALL">All Programs</option>
              {availablePrograms.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Start Date"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>

          {/* Date Range: To */}
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              title="End Date"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || programFilter !== 'ALL' || recipientFilter !== 'ALL' || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>Filtered report view active ({summary.totalTransactions} matching transactions)</span>
            <button
              onClick={handleClearFilters}
              className="text-[#F58220] hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Outward Transactions Audit Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Transaction ID</th>
                <th
                  onClick={() => handleSort('transactionDate')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Date & Time
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Part Number</th>
                <th className="py-3.5 px-4">MPN</th>
                <th className="py-3.5 px-4">Tracking ID</th>
                <th className="py-3.5 px-4">Program</th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Outward Qty
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Box at Issue</th>
                <th className="py-3.5 px-4">Recipient / Destination</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Processed By</th>
                <th className="py-3.5 px-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <>
                  <SkeletonRow cols={12} />
                  <SkeletonRow cols={12} />
                  <SkeletonRow cols={12} />
                  <SkeletonRow cols={12} />
                </>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8">
                    <EmptyState
                      title="No outward transactions found"
                      description="No outward movements match your current search and filter selections."
                    />
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Transaction ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-xs">
                      {tx.transactionId}
                    </td>

                    {/* Date and Time */}
                    <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(tx.transactionDate).toLocaleDateString()}{' '}
                      <span className="text-[10px] text-gray-400">
                        {new Date(tx.transactionDate).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Part Number */}
                    <td className="py-3.5 px-4 font-bold text-[#20252B] whitespace-nowrap">
                      {tx.partNumber}
                    </td>

                    {/* MPN */}
                    <td className="py-3.5 px-4 font-mono text-gray-600 text-xs">
                      {tx.mpn}
                    </td>

                    {/* Tracking ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-800 text-xs">
                      {tx.trackingId}
                    </td>

                    {/* Program */}
                    <td className="py-3.5 px-4">
                      <ProgramBadge program={tx.program} />
                    </td>

                    {/* Outward Quantity */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#F58220] text-sm">
                      -{tx.quantity}
                    </td>

                    {/* Storage Box at time of issue */}
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700">
                      {tx.storageBox}
                    </td>

                    {/* Recipient / Destination */}
                    <td className="py-3.5 px-4 text-gray-700 font-medium text-xs max-w-[160px] truncate">
                      {tx.recipient || 'General Dispatch'}
                    </td>

                    {/* Reference Number */}
                    <td className="py-3.5 px-4 font-mono text-gray-600 text-xs whitespace-nowrap">
                      {tx.referenceNumber || 'N/A'}
                    </td>

                    {/* Processed By */}
                    <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                      {tx.processedByName || tx.processedBy?.name || 'System'}
                    </td>

                    {/* Audit Details Modal Trigger */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTxn(tx);
                          setDetailsModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Full Transaction Audit"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage || currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          limit={pagination.limit}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Transaction Details Modal */}
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
