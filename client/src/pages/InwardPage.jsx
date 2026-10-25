import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryService } from '../services/inventoryService';
import { ProgramBadge, StockStatusBadge } from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner, { SkeletonRow } from '../components/common/LoadingSpinner';
import CreatePartModal from '../components/inward/CreatePartModal';
import ImportPartsModal from '../components/inward/ImportPartsModal';
import BarcodeModal from '../components/inward/BarcodeModal';
import BulkBarcodePrintModal from '../components/inward/BulkBarcodePrintModal';
import ReceiveStockModal from '../components/inward/ReceiveStockModal';
import PartDetailsModal from '../components/inward/PartDetailsModal';
import EditPartModal from '../components/inward/EditPartModal';
import { useNotification } from '../context/NotificationContext';
import {
  PlusCircle,
  UploadCloud,
  Download,
  Search,
  Filter,
  ArrowDownToLine,
  Eye,
  Edit,
  ArrowUpDown,
  RefreshCw,
  Barcode,
  Printer,
  ChevronDown,
  Layers,
  MapPin,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function InwardPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialStockStatus = searchParams.get('stockStatus') || 'ALL';
  const { notifySuccess, notifyError } = useNotification();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [programFilter, setProgramFilter] = useState('ALL');
  const [rackFilter, setRackFilter] = useState('ALL');
  const [binFilter, setBinFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState(initialStockStatus);
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [availableRacks, setAvailableRacks] = useState([]);
  const [availableBins, setAvailableBins] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0, limit: 10 });
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) setSearchQuery(qParam);
    const statusParam = searchParams.get('stockStatus');
    if (statusParam) setStockStatusFilter(statusParam);
  }, [searchParams]);

  // Selection for bulk barcode printing
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodePart, setBarcodePart] = useState(null);
  const [bulkBarcodeModalOpen, setBulkBarcodeModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsPartId, setDetailsPartId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPart, setEditPart] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        sortBy,
        sortOrder,
      };

      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (programFilter !== 'ALL') params.program = programFilter;
      if (rackFilter !== 'ALL') params.rack = rackFilter;
      if (binFilter !== 'ALL') params.bin = binFilter;
      if (stockStatusFilter !== 'ALL') params.stockStatus = stockStatusFilter;

      const res = await inventoryService.getInventory(params);
      if (res.success) {
        setItems(res.items || []);
        setPagination(res.pagination || { totalPages: 1, totalItems: 0, limit: 10 });
        if (res.filters?.availablePrograms) setAvailablePrograms(res.filters.availablePrograms);
        if (res.filters?.availableRacks) setAvailableRacks(res.filters.availableRacks);
        if (res.filters?.availableBins) setAvailableBins(res.filters.availableBins);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [currentPage, programFilter, rackFilter, binFilter, stockStatusFilter, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInventory();
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

  const handleClearFilters = () => {
    setSearchQuery('');
    setProgramFilter('ALL');
    setRackFilter('ALL');
    setBinFilter('ALL');
    setStockStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Toggle selection for bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i._id)));
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedPartsList = items.filter((item) => selectedIds.has(item._id));

  // Export handlers
  const handleExportPrimary = async () => {
    setExportDropdownOpen(false);
    setExporting(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (programFilter !== 'ALL') params.program = programFilter;
      if (rackFilter !== 'ALL') params.rack = rackFilter;
      if (binFilter !== 'ALL') params.bin = binFilter;
      if (stockStatusFilter !== 'ALL') params.stockStatus = stockStatusFilter;

      await inventoryService.exportPrimaryExcel(params);
      notifySuccess('Downloaded E-COMP MASTER workbook (.xlsx) matching VISTEON structure.');
    } catch (err) {
      notifyError('Failed to export primary workbook.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportEnhanced = async () => {
    setExportDropdownOpen(false);
    setExporting(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (programFilter !== 'ALL') params.program = programFilter;
      if (rackFilter !== 'ALL') params.rack = rackFilter;
      if (binFilter !== 'ALL') params.bin = binFilter;
      if (stockStatusFilter !== 'ALL') params.stockStatus = stockStatusFilter;

      await inventoryService.exportEnhancedExcel(params);
      notifySuccess('Downloaded Enhanced Inventory workbook (.xlsx) with Barcodes & Thresholds.');
    } catch (err) {
      notifyError('Failed to export enhanced workbook.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with 3 Core Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#20252B] tracking-tight">
              Inward Stock & Component Catalog
            </h2>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {pagination.totalItems} Items
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Automated Code 128 barcode generation, rack/bin management, individual thresholds, and Excel synchronization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh */}
          <button
            onClick={() => fetchInventory()}
            className="p-2 text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Bulk Print Labels if items selected */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBulkBarcodeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#20252B] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4 text-[#F58220]" />
              Print Barcodes ({selectedIds.size})
            </button>
          )}

          {/* 1. Create Part */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create Part
          </button>

          {/* 2. Import Parts */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#20252B] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-[#F58220]" />
            Import Parts
          </button>

          {/* 3. Export Inventory Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-[#F58220]" />
              {exporting ? 'Exporting...' : 'Export Inventory'}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleExportPrimary}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex flex-col"
                >
                  <span className="font-bold text-[#20252B]">E-COMP MASTER Workbook (.xlsx)</span>
                  <span className="text-[10px] text-gray-400">8-column layout matching reference template</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleExportEnhanced}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex flex-col"
                >
                  <span className="font-bold text-[#20252B]">Enhanced Workbook (.xlsx)</span>
                  <span className="text-[10px] text-gray-400">Includes Barcodes, Min Thresholds, Rack & Bin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Part No, MPN, Tracking, Barcode, Rack, Bin..."
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

          {/* Rack Filter */}
          <div>
            <select
              value={rackFilter}
              onChange={(e) => {
                setRackFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            >
              <option value="ALL">All Racks</option>
              {availableRacks.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Bin Filter */}
          <div>
            <select
              value={binFilter}
              onChange={(e) => {
                setBinFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            >
              <option value="ALL">All Bins</option>
              {availableBins.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter including Low-Stock */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => {
                setStockStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock (&gt; 0)</option>
              <option value="LOW_STOCK">⚠️ Low Stock (&le; Threshold)</option>
              <option value="OUT_OF_STOCK">🚨 Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || programFilter !== 'ALL' || rackFilter !== 'ALL' || binFilter !== 'ALL' || stockStatusFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>Filtered results active</span>
            <button
              onClick={handleClearFilters}
              className="text-[#F58220] hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Inward Inventory Table with All 11 Enhanced Columns */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {/* Select All Checkbox */}
                <th className="py-3 px-3 text-center w-8">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    {selectedIds.size === items.length && items.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#F58220]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('partNumber')}
                  className="py-3 px-3 cursor-pointer hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Part Number
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3">MPN</th>
                <th className="py-3 px-3">Tracking ID</th>
                <th className="py-3 px-3">Barcode (Code 128)</th>
                <th className="py-3 px-3">Program</th>
                <th
                  onClick={() => handleSort('availableQuantity')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Available Qty
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Min Threshold</th>
                <th className="py-3 px-3">Rack</th>
                <th className="py-3 px-3">Bin</th>
                <th className="py-3 px-3 text-center">Stock Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8">
                    <EmptyState
                      title="No components found"
                      description="No registered parts matched your active search and filter criteria."
                      actionLabel="Create New Part"
                      onAction={() => setCreateModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                items.map((part) => {
                  const isSelected = selectedIds.has(part._id);
                  const isLowStock = part.availableQuantity <= (part.minStockThreshold || 10) && part.availableQuantity > 0;
                  const isOutOfStock = part.availableQuantity === 0;

                  return (
                    <tr
                      key={part._id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? 'bg-[#FFF3E8]/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(part._id)}
                          className="rounded text-[#F58220] focus:ring-[#F58220] cursor-pointer"
                        />
                      </td>

                      {/* Part Number */}
                      <td className="py-3 px-3 font-bold text-[#20252B]">
                        <button
                          onClick={() => {
                            setDetailsPartId(part._id);
                            setDetailsModalOpen(true);
                          }}
                          className="hover:text-[#F58220] transition-colors text-left"
                        >
                          {part.partNumber}
                        </button>
                      </td>

                      {/* MPN */}
                      <td className="py-3 px-3 font-mono text-gray-600 text-xs">
                        {part.mpn}
                      </td>

                      {/* Tracking ID */}
                      <td className="py-3 px-3 font-mono font-bold text-gray-800 text-xs">
                        {part.trackingId}
                      </td>

                      {/* Barcode with Quick View */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodePart(part);
                            setBarcodeModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-gray-700 hover:text-[#F58220] bg-gray-50 hover:bg-[#FFF3E8] px-2 py-0.5 rounded border border-gray-200 transition-colors"
                          title="Click to view & print barcode label"
                        >
                          <Barcode className="w-3.5 h-3.5 text-[#F58220]" />
                          {part.barcode || part.trackingId}
                        </button>
                      </td>

                      {/* Program */}
                      <td className="py-3 px-3">
                        <ProgramBadge program={part.program} />
                      </td>

                      {/* Available Qty */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black text-sm ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {part.availableQuantity.toLocaleString()}
                        </span>
                      </td>

                      {/* Individual Threshold */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-gray-600">
                        {part.minStockThreshold ?? 10}
                      </td>

                      {/* Rack */}
                      <td className="py-3 px-3 font-semibold text-gray-700">
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-[11px]">
                          {part.rack || 'RACK-01'}
                        </span>
                      </td>

                      {/* Bin */}
                      <td className="py-3 px-3 font-semibold text-gray-700">
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-[11px]">
                          {part.bin || 'BIN-01'}
                        </span>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <StockStatusBadge
                          quantity={part.availableQuantity}
                          threshold={part.minStockThreshold}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {/* Receive Stock */}
                          <button
                            onClick={() => {
                              setSelectedPart(part);
                              setReceiveModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-md shadow-2xs transition-colors"
                            title="Receive additional stock"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            Receive
                          </button>

                          {/* Print Barcode Label */}
                          <button
                            onClick={() => {
                              setBarcodePart(part);
                              setBarcodeModalOpen(true);
                            }}
                            className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                            title="View / Print Barcode Label"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#F58220]" />
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => {
                              setDetailsPartId(part._id);
                              setDetailsModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Metadata */}
                          <button
                            onClick={() => {
                              setEditPart(part);
                              setEditModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Edit Metadata (Rack / Bin / Threshold)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Modals */}
      <CreatePartModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchInventory()}
      />

      <ImportPartsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => fetchInventory()}
      />

      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => {
          setBarcodeModalOpen(false);
          setBarcodePart(null);
        }}
        part={barcodePart}
      />

      <BulkBarcodePrintModal
        isOpen={bulkBarcodeModalOpen}
        onClose={() => setBulkBarcodeModalOpen(false)}
        selectedParts={selectedPartsList}
      />

      <ReceiveStockModal
        isOpen={receiveModalOpen}
        onClose={() => {
          setReceiveModalOpen(false);
          setSelectedPart(null);
        }}
        part={selectedPart}
        onSuccess={() => fetchInventory()}
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
        onOpenBarcodeModal={(p) => {
          setBarcodePart(p);
          setBarcodeModalOpen(true);
        }}
      />

      <EditPartModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditPart(null);
        }}
        part={editPart}
        onSuccess={() => fetchInventory()}
      />
    </div>
  );
}
