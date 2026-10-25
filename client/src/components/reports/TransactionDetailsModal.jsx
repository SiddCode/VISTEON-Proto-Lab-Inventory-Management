import React from 'react';
import Modal from '../common/Modal';
import { ProgramBadge, TransactionTypeBadge } from '../common/Badge';
import { FileText, Calendar, Hash, MapPin, Package, User, Building, QrCode } from 'lucide-react';

export default function TransactionDetailsModal({ isOpen, onClose, transaction }) {
  if (!isOpen || !transaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Outward Transaction Audit Record" maxWidth="max-w-xl">
      <div className="space-y-4 text-xs">
        {/* Top Status Header */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold text-sm text-[#20252B] flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-[#F58220]" />
              {transaction.transactionId}
            </span>
            <div className="flex items-center gap-2">
              <TransactionTypeBadge type={transaction.type} />
              <ProgramBadge program={transaction.program} />
            </div>
          </div>
          <p className="text-gray-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {new Date(transaction.transactionDate).toLocaleString('en-US', {
              dateStyle: 'full',
              timeStyle: 'medium',
            })}
          </p>
        </div>

        {/* Component Snapshot Card */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#F58220]" />
            Component Snapshot at Time of Transaction
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-gray-500 block">Part Number:</span>
              <span className="font-bold text-gray-900 text-sm">{transaction.partNumber}</span>
            </div>
            <div>
              <span className="text-gray-500 block">MPN:</span>
              <span className="font-mono font-bold text-gray-900">{transaction.mpn}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Tracking ID:</span>
              <span className="font-mono font-bold text-gray-900">{transaction.trackingId}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Box Location:</span>
              <span className="font-semibold text-gray-900">{transaction.storageBox}</span>
            </div>
          </div>
        </div>

        {/* Dispatch Specifics */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-2.5">
          <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#F58220]" />
            Dispatch & Recipient Details
          </h4>

          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Outward Quantity:</span>
            <span className="font-extrabold text-base text-[#F58220]">
              {transaction.quantity} units
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Destination / Recipient:</span>
            <span className="font-semibold text-gray-900">{transaction.recipient || 'N/A'}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Reference / Work Order:</span>
            <span className="font-mono font-bold text-gray-800">
              {transaction.referenceNumber || 'N/A'}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Processed By:</span>
            <span className="font-medium text-gray-900 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {transaction.processedByName || transaction.processedBy?.name || 'System'}
            </span>
          </div>

          {transaction.remarks && (
            <div className="pt-1">
              <span className="text-gray-500 block mb-0.5">Remarks:</span>
              <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                {transaction.remarks}
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-gray-400">
            Audit Ledger Status: <strong className="text-emerald-600 font-semibold">Immutable Record</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
