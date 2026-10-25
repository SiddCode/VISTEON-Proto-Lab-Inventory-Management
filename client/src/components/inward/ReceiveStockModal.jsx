import React, { useState } from 'react';
import Modal from '../common/Modal';
import { stockService } from '../../services/stockService';
import { useNotification } from '../../context/NotificationContext';
import { ProgramBadge } from '../common/Badge';
import { ArrowDownToLine, Package, MapPin } from 'lucide-react';

export default function ReceiveStockModal({ isOpen, onClose, part, onSuccess }) {
  const { notifySuccess, notifyError } = useNotification();
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [quantity, setQuantity] = useState('');
  const [rack, setRack] = useState('');
  const [bin, setBin] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [inwardDate, setInwardDate] = useState(getTodayDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (part) {
      setRack(part.rack || 'RACK-01');
      setBin(part.bin || 'BIN-01');
      setQuantity('');
      setReferenceNumber('');
      setRemarks('');
      setError('');
    }
  }, [part]);

  if (!part) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedQty = Number(quantity);
    if (!quantity || isNaN(parsedQty) || parsedQty <= 0) {
      setError('Please enter a valid received quantity greater than 0');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        inventoryRecordId: part._id,
        quantity: parsedQty,
        rack: rack.trim().toUpperCase(),
        bin: bin.trim().toUpperCase(),
        storageBox: `${rack.trim().toUpperCase()} / ${bin.trim().toUpperCase()}`,
        referenceNumber: referenceNumber.trim(),
        remarks: remarks.trim(),
        inwardDate,
      };

      const res = await stockService.receiveStock(payload);
      if (res.success) {
        notifySuccess(
          `Stock updated: Added ${parsedQty} units. New available stock: ${res.item?.availableQuantity}`
        );
        onSuccess?.(res.item);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record inward movement.';
      setError(msg);
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStock = part.availableQuantity || 0;
  const newProjectedStock = currentStock + (Number(quantity) > 0 ? Number(quantity) : 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Additional Stock (Inward)" maxWidth="max-w-xl">
      {/* Component Context Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="text-base font-bold text-[#20252B]">{part.partNumber}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
              <span>MPN: {part.mpn}</span>
              <span>•</span>
              <span>TRK: {part.trackingId}</span>
            </div>
          </div>
          <ProgramBadge program={part.program} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200/60 text-xs">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#F58220]" />
            <span className="text-gray-500">Current Stock:</span>
            <span className="font-bold text-gray-800 text-sm">{currentStock} units</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F58220]" />
            <span className="text-gray-500">Rack / Bin:</span>
            <span className="font-bold text-gray-800">{part.rack || 'RACK-01'} / {part.bin || 'BIN-01'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quantity Received */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Quantity Received <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 25"
              autoFocus
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 text-base font-semibold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>
          {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
          {Number(quantity) > 0 && (
            <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
              ✓ Stock will update from {currentStock} → {newProjectedStock} units
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Rack & Bin */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Rack ID
            </label>
            <input
              type="text"
              placeholder="e.g. RACK-01"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Bin ID
            </label>
            <input
              type="text"
              placeholder="e.g. BIN-04"
              value={bin}
              onChange={(e) => setBin(e.target.value)}
              className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              PO / Challan No
            </label>
            <input
              type="text"
              placeholder="e.g. PO-VISTEON-89212"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>

          {/* Inward Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Receipt Date
            </label>
            <input
              type="date"
              value={inwardDate}
              onChange={(e) => setInwardDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. Supplier batch re-stock, incoming QC passed"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm bg-[#F58220] hover:bg-[#DF7215] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F58220] transition-all ${
              submitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            {submitting ? 'Recording Inward...' : 'Confirm Stock Inward'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
