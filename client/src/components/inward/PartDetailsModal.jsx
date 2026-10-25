import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { inventoryService } from '../../services/inventoryService';
import { ProgramBadge, StockStatusBadge, TransactionTypeBadge } from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import BarcodeRenderer from '../common/BarcodeRenderer';
import { Package, MapPin, Hash, QrCode, Calendar, Clock, ArrowDownToLine, Barcode, Printer } from 'lucide-react';

export default function PartDetailsModal({ isOpen, onClose, partId, onReceiveStock, onOpenBarcodeModal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && partId) {
      setLoading(true);
      inventoryService
        .getInventoryById(partId)
        .then((res) => {
          if (res.success) {
            setData(res);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, partId]);

  if (!isOpen) return null;

  const part = data?.item;
  const transactions = data?.transactions || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Component Specifications & History" maxWidth="max-w-3xl">
      {loading ? (
        <LoadingSpinner text="Loading component details..." />
      ) : part ? (
        <div className="space-y-6">
          {/* Header Specs Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Automotive Component
                </span>
                <h3 className="text-xl font-extrabold text-[#20252B]">{part.partNumber}</h3>
                <p className="text-xs text-gray-600 font-mono mt-0.5">MPN: {part.mpn}</p>
              </div>
              <div className="flex items-center gap-2">
                <ProgramBadge program={part.program} />
                <StockStatusBadge quantity={part.availableQuantity} threshold={part.minStockThreshold} />
              </div>
            </div>

            {/* Barcode Highlight Banner */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FFF3E8] text-[#F58220] rounded-lg">
                  <Barcode className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    System Barcode (Code 128)
                  </span>
                  <span className="font-mono font-black text-sm text-[#20252B] tracking-wide">
                    {part.barcode || part.trackingId}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <BarcodeRenderer value={part.barcode || part.trackingId} width={1.2} height={32} displayValue={false} />
                <button
                  type="button"
                  onClick={() => onOpenBarcodeModal?.(part)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg shadow-2xs transition-colors ml-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Label
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200/70 text-xs">
              <div>
                <span className="text-gray-500 flex items-center gap-1 mb-1">
                  <QrCode className="w-3.5 h-3.5 text-[#F58220]" />
                  Tracking ID
                </span>
                <span className="font-mono font-bold text-gray-800">{part.trackingId}</span>
              </div>
              <div>
                <span className="text-gray-500 flex items-center gap-1 mb-1">
                  <Package className="w-3.5 h-3.5 text-[#F58220]" />
                  Available Stock
                </span>
                <span className="font-bold text-base text-[#20252B]">{part.availableQuantity} units</span>
              </div>
              <div>
                <span className="text-gray-500 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#F58220]" />
                  Rack / Bin Location
                </span>
                <span className="font-bold text-gray-800">{part.rack || 'RACK-01'} / {part.bin || 'BIN-01'}</span>
              </div>
              <div>
                <span className="text-gray-500 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#F58220]" />
                  Min Threshold
                </span>
                <span className="font-semibold text-gray-800">
                  {part.minStockThreshold ?? 10} units
                </span>
              </div>
            </div>

            {part.remarks && (
              <div className="mt-4 pt-3 border-t border-gray-200/60 text-xs">
                <span className="font-semibold text-gray-700">Remarks: </span>
                <span className="text-gray-600">{part.remarks}</span>
              </div>
            )}
          </div>

          {/* Movement History Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-[#20252B] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#F58220]" />
                Recent Movement Audit History
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onReceiveStock?.(part);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#F58220] bg-[#FFF3E8] hover:bg-[#F58220] hover:text-white rounded-lg transition-colors border border-[#F58220]/20"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Receive Additional Stock
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No recent transactions recorded for this item.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3">Reference / Destination</th>
                      <th className="py-2.5 px-3">Processed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <TransactionTypeBadge type={tx.type} />
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {new Date(tx.transactionDate).toLocaleDateString()}{' '}
                          <span className="text-[10px] text-gray-400">
                            {new Date(tx.transactionDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {tx.type === 'OUTWARD' ? `-${tx.quantity}` : `+${tx.quantity}`}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 truncate max-w-[150px]">
                          {tx.recipient || tx.referenceNumber || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {tx.processedByName || tx.processedBy?.name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
