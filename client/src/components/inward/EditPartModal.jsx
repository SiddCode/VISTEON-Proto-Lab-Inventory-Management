import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { inventoryService } from '../../services/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import { Edit3, AlertCircle } from 'lucide-react';

const PREDEFINED_PROGRAMS = [
  'Renault Nissan',
  'Mahindra',
  'Skoda',
  'Tata',
  'TVS',
  'Royal Enfield',
  'Honda',
  'Maruti Suzuki',
  'PSA',
];

export default function EditPartModal({ isOpen, onClose, part, onSuccess }) {
  const { notifySuccess, notifyError } = useNotification();

  const [rack, setRack] = useState('');
  const [bin, setBin] = useState('');
  const [minStockThreshold, setMinStockThreshold] = useState('10');
  const [remarks, setRemarks] = useState('');
  const [program, setProgram] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (part) {
      setRack(part.rack || 'RACK-01');
      setBin(part.bin || 'BIN-01');
      setMinStockThreshold(String(part.minStockThreshold ?? 10));
      setRemarks(part.remarks || '');
      setProgram(part.program || PREDEFINED_PROGRAMS[0]);
    }
  }, [part]);

  if (!part) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rack.trim() || !bin.trim()) {
      notifyError('Both Rack and Bin numbers are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await inventoryService.updatePart(part._id, {
        rack: rack.trim().toUpperCase(),
        bin: bin.trim().toUpperCase(),
        storageBox: `${rack.trim().toUpperCase()} / ${bin.trim().toUpperCase()}`,
        minStockThreshold: Number(minStockThreshold),
        remarks: remarks.trim(),
        program,
      });

      if (res.success) {
        notifySuccess('Part metadata updated successfully');
        onSuccess?.(res.item);
        onClose();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update component');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Component Metadata" maxWidth="max-w-md">
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          Only descriptive metadata can be modified. To adjust inventory quantities, use the{' '}
          <span className="font-bold">Receive Stock</span> or <span className="font-bold">Outward</span>{' '}
          workflows to preserve audit compliance.
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-xs space-y-1">
        <div className="font-bold text-[#20252B]">{part.partNumber}</div>
        <div className="text-gray-500 font-mono">Tracking ID: {part.trackingId}</div>
        <div className="text-gray-500 font-mono">Barcode: {part.barcode}</div>
        <div className="text-gray-500 font-mono">Available Stock: {part.availableQuantity} units</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Rack & Bin */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Rack ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Bin ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bin}
              onChange={(e) => setBin(e.target.value)}
              className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              required
            />
          </div>
        </div>

        {/* Minimum Threshold */}
        <div>
          <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Minimum Stock Threshold <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={minStockThreshold}
            onChange={(e) => setMinStockThreshold(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            required
          />
          <p className="text-[10px] text-gray-400 mt-1">Triggers low-stock warning when available stock &le; this value</p>
        </div>

        {/* Program */}
        <div>
          <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Automotive Program
          </label>
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
          >
            {PREDEFINED_PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Remarks */}
        <div>
          <label className="block font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Remarks
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all resize-none"
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
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm bg-[#F58220] hover:bg-[#DF7215] focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
          >
            <Edit3 className="w-4 h-4" />
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
