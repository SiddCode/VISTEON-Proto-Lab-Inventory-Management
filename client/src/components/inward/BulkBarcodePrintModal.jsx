import React, { useRef } from 'react';
import Modal from '../common/Modal';
import BarcodeRenderer from '../common/BarcodeRenderer';
import VisteonLogo from '../common/VisteonLogo';
import { Printer, CheckSquare } from 'lucide-react';

export default function BulkBarcodePrintModal({ isOpen, onClose, selectedParts = [] }) {
  const printAreaRef = useRef(null);

  if (!isOpen || selectedParts.length === 0) return null;

  const handleBulkPrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk Print Barcode Labels - VISTEON (${selectedParts.length} Labels)</title>
          <style>
            @page {
              size: 4in 2.5in;
              margin: 0;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              color: #20252B;
              background: #FFF;
            }
            .label-page {
              page-break-after: always;
              width: 3.8in;
              height: 2.3in;
              margin: 0.1in auto;
              border: 1.5px solid #20252B;
              border-radius: 4px;
              padding: 8px 10px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #E5E7EB;
              padding-bottom: 4px;
            }
            .brand-name {
              font-size: 13px;
              font-weight: 900;
              color: #F58220;
            }
            .prog-badge {
              font-size: 9px;
              font-weight: 700;
              border: 1px solid #D1D5DB;
              padding: 1px 4px;
              border-radius: 3px;
            }
            .part-no {
              font-size: 14px;
              font-weight: 900;
              margin: 2px 0;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px;
              font-size: 9px;
              background: #F9FAFB;
              padding: 4px;
              border-radius: 3px;
            }
            .barcode-box {
              display: flex;
              justify-content: center;
              padding: 2px 0;
            }
            .barcode-box svg {
              max-width: 100%;
              height: 40px;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Print Barcode Labels (${selectedParts.length} Selected)`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-600">
          Previewing {selectedParts.length} container labels formatted for industrial barcode sticker printers.
        </p>

        {/* Labels Scrollable Preview */}
        <div
          ref={printAreaRef}
          className="max-h-[55vh] overflow-y-auto space-y-3 p-3 bg-gray-100 rounded-xl border border-gray-200"
        >
          {selectedParts.map((part) => (
            <div
              key={part._id}
              className="label-page bg-white border border-gray-300 rounded-lg p-3 text-xs shadow-2xs"
            >
              <div className="header flex justify-between items-center border-b pb-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <VisteonLogo showText={false} className="h-4" />
                  <span className="brand-name font-black text-[#F58220]">VISTEON</span>
                </div>
                <span className="prog-badge font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                  {part.program}
                </span>
              </div>

              <div className="part-no font-black text-sm text-[#20252B]">{part.partNumber}</div>

              <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-50 p-1.5 rounded my-1 font-mono">
                <div>
                  <span className="text-gray-400 block text-[8px]">MPN:</span>
                  <strong>{part.mpn}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[8px]">TRACKING ID:</span>
                  <strong>{part.trackingId}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[8px]">LOCATION:</span>
                  <strong>{part.rack || 'RACK-01'} / {part.bin || 'BIN-01'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[8px]">THRESHOLD:</span>
                  <strong>{part.minStockThreshold || 10} units</strong>
                </div>
              </div>

              <div className="barcode-box flex justify-center py-1">
                <BarcodeRenderer value={part.barcode || part.trackingId} width={1.4} height={38} />
              </div>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-medium">
            Page layout: 4&quot; &times; 2.5&quot; auto-break
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkPrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print {selectedParts.length} Labels
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
