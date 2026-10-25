import React, { useRef } from 'react';
import Modal from '../common/Modal';
import BarcodeRenderer from '../common/BarcodeRenderer';
import VisteonLogo from '../common/VisteonLogo';
import { ProgramBadge } from '../common/Badge';
import { Printer, Download, QrCode, MapPin, Tag } from 'lucide-react';

export default function BarcodeModal({ isOpen, onClose, part }) {
  const printRef = useRef(null);

  if (!part) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=600,height=500');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${part.partNumber}</title>
          <style>
            @page {
              size: 4in 2.5in;
              margin: 0;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 10px;
              color: #20252B;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .label-card {
              width: 3.8in;
              border: 2px solid #20252B;
              border-radius: 6px;
              padding: 10px 12px;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5px solid #E5E7EB;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .brand-name {
              font-size: 16px;
              font-weight: 900;
              color: #F58220;
              letter-spacing: -0.5px;
            }
            .brand-sub {
              font-size: 8px;
              text-transform: uppercase;
              font-weight: 700;
              color: #6B7280;
            }
            .part-no {
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 2px;
              color: #20252B;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              font-size: 10px;
              margin-bottom: 6px;
            }
            .field-label {
              color: #6B7280;
              font-weight: 600;
              font-size: 8.5px;
              text-transform: uppercase;
            }
            .field-val {
              font-weight: 700;
              font-family: monospace;
              font-size: 10px;
            }
            .barcode-box {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-top: 4px;
              padding-top: 4px;
              border-top: 1px dashed #D1D5DB;
            }
            .barcode-box svg {
              max-width: 100%;
              height: 48px;
            }
            .footer-tag {
              font-size: 8px;
              color: #9CA3AF;
              display: flex;
              justify-content: space-between;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const barcodeValue = part.barcode || part.trackingId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Component Barcode & Bin Label" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Printable Label Preview Container */}
        <div className="p-3 bg-gray-100 rounded-xl flex justify-center">
          <div
            ref={printRef}
            className="w-full bg-white border-2 border-[#20252B] rounded-lg p-4 shadow-sm text-[#20252B] select-none"
          >
            <div className="label-card">
              {/* Label Header */}
              <div className="header flex items-center justify-between border-b pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <VisteonLogo showText={false} className="h-6" />
                  <div>
                    <div className="brand-name font-black text-sm text-[#F58220] tracking-tight">
                      VISTEON
                    </div>
                    <div className="brand-sub text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                      Plant Traceability
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                    {part.program}
                  </span>
                </div>
              </div>

              {/* Part Number Banner */}
              <div className="mb-2">
                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 block">
                  Part Number
                </span>
                <div className="part-no text-base font-black tracking-tight text-[#20252B]">
                  {part.partNumber}
                </div>
              </div>

              {/* Metadata 2-Column Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2 bg-gray-50/80 p-2 rounded border border-gray-100">
                <div>
                  <span className="field-label text-[8px] text-gray-400 font-bold uppercase block">MPN:</span>
                  <span className="field-val font-mono font-bold text-gray-800 text-[11px] truncate block">
                    {part.mpn}
                  </span>
                </div>
                <div>
                  <span className="field-label text-[8px] text-gray-400 font-bold uppercase block">Tracking ID:</span>
                  <span className="field-val font-mono font-bold text-gray-800 text-[11px] truncate block">
                    {part.trackingId}
                  </span>
                </div>
                <div>
                  <span className="field-label text-[8px] text-gray-400 font-bold uppercase block">Rack / Bin:</span>
                  <span className="field-val font-bold text-gray-900 text-[11px] block">
                    {part.rack || 'RACK-01'} / {part.bin || 'BIN-01'}
                  </span>
                </div>
                <div>
                  <span className="field-label text-[8px] text-gray-400 font-bold uppercase block">Min Threshold:</span>
                  <span className="field-val font-bold text-gray-800 text-[11px] block">
                    {part.minStockThreshold || 10} units
                  </span>
                </div>
              </div>

              {/* Code 128 Barcode */}
              <div className="barcode-box flex justify-center py-1 border-t border-dashed border-gray-200">
                <BarcodeRenderer value={barcodeValue} width={1.5} height={42} />
              </div>

              {/* Footer Stamp */}
              <div className="footer-tag flex justify-between text-[8px] text-gray-400 mt-1.5 font-mono pt-1 border-t border-gray-100">
                <span>Code 128 Alphanumeric</span>
                <span>{new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Barcode Label
          </button>
        </div>
      </div>
    </Modal>
  );
}
