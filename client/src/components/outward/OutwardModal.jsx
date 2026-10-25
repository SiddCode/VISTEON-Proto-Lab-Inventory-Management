import React, { useState } from 'react';
import Modal from '../common/Modal';
import { stockService } from '../../services/stockService';
import { useNotification } from '../../context/NotificationContext';
import { ProgramBadge } from '../common/Badge';
import { ArrowUpFromLine, Package, MapPin, AlertTriangle, CheckCircle2, Barcode, ShieldAlert } from 'lucide-react';

export default function OutwardModal({ isOpen, onClose, part, onSuccess }) {
  const { notifySuccess, notifyError } = useNotification();
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [quantity, setQuantity] = useState('');
  const [recipient, setRecipient] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [outwardDate, setOutwardDate] = useState(getTodayDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  React.useEffect(() => {
    if (part) {
      setQuantity('');
      setRecipient('');
      setReferenceNumber('');
      setRemarks('');
      setError('');
      setShowConfirmStep(false);
    }
  }, [part]);

  if (!part) return null;

  const availableStock = part.availableQuantity || 0;
  const parsedQty = Number(quantity);

  const handleValidateAndProceed = (e) => {
    e.preventDefault();
    setError('');

    if (!quantity || isNaN(parsedQty) || parsedQty <= 0) {
      setError('Outward quantity must be a positive number greater than 0');
      return;
    }

    if (parsedQty > availableStock) {
      setError(`Insufficient stock! Cannot issue ${parsedQty} units. Maximum available is ${availableStock} units.`);
      return;
    }

    setShowConfirmStep(true);
  };

  const handleConfirmDispatch = async () => {
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        inventoryRecordId: part._id,
        trackingId: part.trackingId,
        quantity: parsedQty,
        recipient: recipient.trim() || 'Assembly Line / General Dispatch',
        referenceNumber: referenceNumber.trim(),
        remarks: remarks.trim(),
        outwardDate,
      };

      const res = await stockService.issueStock(payload);
      if (res.success) {
        notifySuccess(
          `Dispatched ${parsedQty} units of ${part.partNumber}. Remaining stock: ${res.item?.availableQuantity} units.`
        );
        onSuccess?.(res.item);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch component. Insufficient stock or server error.';
      setError(msg);
      notifyError(msg);
      setShowConfirmStep(false);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingAfterDispatch = availableStock - (parsedQty > 0 ? parsedQty : 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue / Dispatch Component (Outward)" maxWidth="max-w-xl">
      {/* Component Specification Snapshot */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="text-base font-bold text-[#20252B]">{part.partNumber}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
              <span>MPN: {part.mpn}</span>
              <span>•</span>
              <span>TRK: {part.trackingId}</span>
              {part.barcode && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#F58220] bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200/60">
                    <Barcode className="w-3 h-3" /> {part.barcode}
                  </span>
                </>
              )}
            </div>
          </div>
          <ProgramBadge program={part.program} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200/60 text-xs">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#F58220]" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Available Stock</span>
              <span className="font-extrabold text-base text-[#20252B]">{availableStock} units</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F58220]" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Location</span>
              <span className="font-bold text-gray-800">
                {part.rack || part.bin ? `${part.rack || '—'} / ${part.bin || '—'}` : part.storageBox || '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Min Threshold</span>
              <span className="font-bold text-gray-800">{part.minStockThreshold ?? 10} units</span>
            </div>
          </div>
        </div>
      </div>

      {!showConfirmStep ? (
        <form onSubmit={handleValidateAndProceed} className="space-y-4">
          {/* Outward Quantity */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Outward Quantity to Issue <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={availableStock}
                step="1"
                placeholder={`1 to ${availableStock}`}
                autoFocus
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError('');
                }}
                className={`w-full px-3 py-2 text-base font-semibold rounded-lg border ${
                  error ? 'border-red-500 bg-red-50/20' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                UNITS
              </span>
            </div>

            {error && (
              <p className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </p>
            )}

            {parsedQty > 0 && parsedQty <= availableStock && (
              <p className="text-xs text-gray-600 mt-1 font-medium">
                Remaining inventory after issue: <span className="font-bold text-gray-900">{remainingAfterDispatch} units</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Destination / Recipient */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Destination / Recipient Line
              </label>
              <input
                type="text"
                placeholder="e.g. Assembly Line 3, QA Bench, Client Dispatch"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Reference / Work Order No
              </label>
              <input
                type="text"
                placeholder="e.g. WO-RN-2026-092 or DISP-8801"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Outward Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Outward Date
              </label>
              <input
                type="date"
                value={outwardDate}
                onChange={(e) => setOutwardDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Remarks / Dispatch Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Urgent morning shift line replenishment"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableStock <= 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm bg-[#F58220] hover:bg-[#DF7215] focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Review & Issue Outward
            </button>
          </div>
        </form>
      ) : (
        /* Confirmation step */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Confirm Stock Dispatch Transaction
            </div>
            <p>
              Please review the transaction summary below. Upon confirmation, stock will be deducted atomically from
              the database and logged in the immutable audit ledger.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Component:</span>
              <span className="font-bold text-gray-900">{part.partNumber} ({part.trackingId})</span>
            </div>
            {part.barcode && (
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Barcode:</span>
                <span className="font-mono font-bold text-gray-800">{part.barcode}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Storage Location:</span>
              <span className="font-medium text-gray-800">
                {part.rack || part.bin ? `${part.rack || '—'} / ${part.bin || '—'}` : part.storageBox || '—'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Program:</span>
              <span className="font-semibold text-gray-800">{part.program}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Dispatch Quantity:</span>
              <span className="font-extrabold text-sm text-[#F58220]">{parsedQty} units</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Remaining Balance:</span>
              <span className="font-bold text-gray-800">{remainingAfterDispatch} units</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Destination:</span>
              <span className="font-medium text-gray-800">{recipient || 'Assembly Line / General'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Reference:</span>
              <span className="font-mono text-gray-800">{referenceNumber || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowConfirmStep(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmDispatch}
              disabled={submitting}
              className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md bg-[#F58220] hover:bg-[#DF7215] focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Processing Dispatch...' : 'Confirm Outward'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
