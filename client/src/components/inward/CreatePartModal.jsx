import React, { useState } from 'react';
import Modal from '../common/Modal';
import { inventoryService } from '../../services/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import { PlusCircle, Info, Barcode } from 'lucide-react';

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

export default function CreatePartModal({ isOpen, onClose, onSuccess }) {
  const { notifySuccess, notifyError } = useNotification();
  
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const initialForm = {
    partNumber: '',
    mpn: '',
    trackingId: '',
    barcode: '',
    program: 'Renault Nissan',
    trackingMode: 'QUANTITY',
    quantity: '',
    minStockThreshold: '10',
    rack: 'RACK-01',
    bin: 'BIN-01',
    remarks: '',
    inwardDate: getTodayDate(),
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const errs = {};
    if (!formData.partNumber.trim()) errs.partNumber = 'Part Number is required';
    if (!formData.mpn.trim()) errs.mpn = 'MPN (Material Part Number) is required';
    if (!formData.trackingId.trim()) errs.trackingId = 'Tracking ID is required';
    if (!formData.program) errs.program = 'Program selection is required';
    if (formData.quantity === '' || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      errs.quantity = 'Quantity must be 0 or a positive number';
    }
    if (
      formData.minStockThreshold === '' ||
      isNaN(Number(formData.minStockThreshold)) ||
      Number(formData.minStockThreshold) < 0
    ) {
      errs.minStockThreshold = 'Minimum Stock Threshold must be 0 or a positive number';
    }
    if (!formData.rack.trim()) errs.rack = 'Rack Number / ID is required';
    if (!formData.bin.trim()) errs.bin = 'Bin Number / ID is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        partNumber: formData.partNumber.trim().toUpperCase(),
        mpn: formData.mpn.trim().toUpperCase(),
        trackingId: formData.trackingId.trim().toUpperCase(),
        barcode: formData.barcode.trim().toUpperCase() || undefined,
        rack: formData.rack.trim().toUpperCase(),
        bin: formData.bin.trim().toUpperCase(),
        storageBox: `${formData.rack.trim().toUpperCase()} / ${formData.bin.trim().toUpperCase()}`,
        quantity: Number(formData.quantity),
        minStockThreshold: Number(formData.minStockThreshold),
        remarks: formData.remarks.trim(),
      };

      const res = await inventoryService.createPart(payload);
      if (res.success) {
        notifySuccess(res.message || 'Part registered successfully!');
        setFormData(initialForm);
        setErrors({});
        onSuccess?.(res.item);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to register component. Please verify details.';
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Component (Inward)" maxWidth="max-w-2xl">
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 mb-5 flex items-start gap-2.5 text-xs text-blue-900">
        <Info className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
        <div>
          <span className="font-semibold">VISTEON Standard:</span> Every component receives an automatic, unique
          Code 128 barcode. Location is organized into Rack and Bin. Threshold triggers individual low-stock alerts.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Part Number & MPN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Part Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="partNumber"
              placeholder="e.g. VP-IC-8200-RN"
              value={formData.partNumber}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm uppercase rounded-lg border ${
                errors.partNumber ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.partNumber && <p className="text-xs text-red-600 mt-1">{errors.partNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              MPN (Material Part Number) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="mpn"
              placeholder="e.g. 24810-7294R"
              value={formData.mpn}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm uppercase rounded-lg border ${
                errors.mpn ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.mpn && <p className="text-xs text-red-600 mt-1">{errors.mpn}</p>}
          </div>
        </div>

        {/* Tracking ID & Barcode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Tracking ID (Lot / Serial Unit) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="trackingId"
              placeholder="e.g. TRK-RN-9021"
              value={formData.trackingId}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm uppercase font-mono rounded-lg border ${
                errors.trackingId ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.trackingId && <p className="text-xs text-red-600 mt-1">{errors.trackingId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 flex items-center justify-between">
              <span>Barcode ID (Optional)</span>
              <span className="text-[10px] text-gray-400 font-normal">Auto-generated if blank</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="barcode"
                placeholder="Leave blank for auto-generated Code 128"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full pl-8 pr-3 py-2 text-sm uppercase font-mono rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
              />
              <Barcode className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Program & Quantities */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Program <span className="text-red-500">*</span>
            </label>
            <select
              name="program"
              value={formData.program}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            >
              {PREDEFINED_PROGRAMS.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Initial Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              min="0"
              step="1"
              placeholder="e.g. 50"
              value={formData.quantity}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                errors.quantity ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Min Threshold <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="minStockThreshold"
              min="0"
              step="1"
              placeholder="e.g. 15"
              value={formData.minStockThreshold}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                errors.minStockThreshold ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.minStockThreshold && (
              <p className="text-xs text-red-600 mt-1">{errors.minStockThreshold}</p>
            )}
          </div>
        </div>

        {/* Rack, Bin, Inward Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Rack Number / ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="rack"
              placeholder="e.g. RACK-03"
              value={formData.rack}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm uppercase rounded-lg border ${
                errors.rack ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.rack && <p className="text-xs text-red-600 mt-1">{errors.rack}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Bin Number / ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="bin"
              placeholder="e.g. BIN-12"
              value={formData.bin}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm uppercase rounded-lg border ${
                errors.bin ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all`}
            />
            {errors.bin && <p className="text-xs text-red-600 mt-1">{errors.bin}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Inward Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="inwardDate"
              value={formData.inwardDate}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Remarks / Batch Notes (Optional)
          </label>
          <textarea
            name="remarks"
            rows={2}
            placeholder="Add supplier notes, incoming inspection references, or special instructions..."
            value={formData.remarks}
            onChange={handleChange}
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
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm bg-[#F58220] hover:bg-[#DF7215] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F58220] transition-all ${
              submitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            {submitting ? 'Registering Part...' : 'Create Part'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
