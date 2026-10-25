import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { inventoryService } from '../../services/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function ImportPartsModal({ isOpen, onClose, onSuccess }) {
  const { notifySuccess, notifyError } = useNotification();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('UPLOAD'); // UPLOAD | PREVIEW | RESULTS
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('SKIP_DUPLICATES'); // SKIP_DUPLICATES | UPDATE_METADATA | IMPORT_AS_INWARD_RECEIPT
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const resetState = () => {
    setStep('UPLOAD');
    setFile(null);
    setPreviewData(null);
    setDuplicateMode('SKIP_DUPLICATES');
    setImportResults(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      notifyError('Unsupported file format. Please upload an .xlsx, .xls, or .csv file.');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await inventoryService.previewImport(formData);
      if (res.success) {
        setPreviewData(res);
        setStep('PREVIEW');
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to parse uploaded Excel/CSV file.');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.allRows) return;
    setImporting(true);

    try {
      const res = await inventoryService.confirmImport(previewData.allRows, duplicateMode);
      if (res.success) {
        setImportResults(res);
        setStep('RESULTS');
        notifySuccess(`Import finished: ${res.summary.imported} imported, ${res.summary.updated} updated.`);
        onSuccess?.();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to complete import process.');
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = () => {
    const errorRows = previewData?.errors || importResults?.failureDetails || [];
    if (errorRows.length === 0) return;

    const headers = ['Row Number', 'Tracking ID', 'Part Number', 'Error Reasons'];
    const rows = errorRows.map((e) => [
      e.rowNumber,
      `"${e.trackingId || ''}"`,
      `"${e.partNumber || ''}"`,
      `"${(e.reasons || [e.reason]).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Visteon_Import_Errors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Components from Excel / CSV" maxWidth="max-w-4xl">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 text-xs font-semibold text-gray-500">
        <div className={`flex items-center gap-1.5 ${step === 'UPLOAD' ? 'text-[#F58220] font-bold' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">1</span>
          Upload Workbook
        </div>
        <div className={`flex items-center gap-1.5 ${step === 'PREVIEW' ? 'text-[#F58220] font-bold' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">2</span>
          Validate & Configure
        </div>
        <div className={`flex items-center gap-1.5 ${step === 'RESULTS' ? 'text-emerald-600 font-bold' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">3</span>
          Execution Report
        </div>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#F58220] bg-[#FFF3E8]/60 scale-[1.01]'
                : 'border-gray-300 hover:border-[#F58220] hover:bg-gray-50/80 bg-gray-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-full bg-[#FFF3E8] text-[#F58220] flex items-center justify-center mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-[#20252B] mb-1">
              Select or Drop VISTEON Inventory Workbook
            </h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-3">
              Supports <strong className="text-gray-700">.xlsx</strong>, <strong className="text-gray-700">.xls</strong>, or <strong className="text-gray-700">.csv</strong>. Matching column layout from <span className="font-mono text-gray-700">Proto available_E-comp_Updated.xlsx</span>
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#F58220] bg-white border border-[#F58220]/30 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
              Browse Spreadsheet Files
            </span>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Supported Template Columns:</strong> <span className="font-mono text-[11px]">S.no, Part Number, MPN, Tracking, Program, Qty, Location, Remark</span>. Enhanced fields <span className="font-mono text-[11px]">Rack, Bin, Minimum Stock Threshold, Barcode</span> are also recognized automatically.
            </div>
          </div>

          {parsing && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#F58220] py-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Parsing spreadsheet rows and validating database uniqueness...
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PREVIEW & CONFIGURE */}
      {step === 'PREVIEW' && previewData && (
        <div className="space-y-4">
          {/* Summary Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Total Rows</span>
              <span className="text-lg font-black text-[#20252B]">{previewData.summary.totalRows}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-emerald-700 block text-[10px] uppercase font-bold">Valid & New</span>
              <span className="text-lg font-black text-emerald-700">{previewData.summary.newRecords}</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-700 block text-[10px] uppercase font-bold">Existing in DB</span>
              <span className="text-lg font-black text-amber-700">{previewData.summary.existingRecords}</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-rose-700 block text-[10px] uppercase font-bold">Invalid / Errors</span>
              <span className="text-lg font-black text-rose-700">{previewData.summary.invalidRows}</span>
            </div>
          </div>

          {/* Duplicate Handling Selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
            <label className="font-bold text-gray-800 uppercase tracking-wider text-[11px] block">
              Duplicate Record Policy (When Tracking ID Already Exists in MongoDB):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                  duplicateMode === 'SKIP_DUPLICATES'
                    ? 'border-[#F58220] bg-[#FFF3E8]/40 ring-1 ring-[#F58220]'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="dupMode"
                    value="SKIP_DUPLICATES"
                    checked={duplicateMode === 'SKIP_DUPLICATES'}
                    onChange={() => setDuplicateMode('SKIP_DUPLICATES')}
                  />
                  <strong className="text-[#20252B]">Skip Duplicates</strong>
                </div>
                <p className="text-[10px] text-gray-500">
                  Import only new parts. Existing parts in DB remain untouched.
                </p>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                  duplicateMode === 'UPDATE_METADATA'
                    ? 'border-[#F58220] bg-[#FFF3E8]/40 ring-1 ring-[#F58220]'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="dupMode"
                    value="UPDATE_METADATA"
                    checked={duplicateMode === 'UPDATE_METADATA'}
                    onChange={() => setDuplicateMode('UPDATE_METADATA')}
                  />
                  <strong className="text-[#20252B]">Update Metadata</strong>
                </div>
                <p className="text-[10px] text-gray-500">
                  Sync rack, bin, threshold & remarks. Never alters stock quantity.
                </p>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                  duplicateMode === 'IMPORT_AS_INWARD_RECEIPT'
                    ? 'border-[#F58220] bg-[#FFF3E8]/40 ring-1 ring-[#F58220]'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="dupMode"
                    value="IMPORT_AS_INWARD_RECEIPT"
                    checked={duplicateMode === 'IMPORT_AS_INWARD_RECEIPT'}
                    onChange={() => setDuplicateMode('IMPORT_AS_INWARD_RECEIPT')}
                  />
                  <strong className="text-[#20252B]">Import as Inward Receipt</strong>
                </div>
                <p className="text-[10px] text-gray-500">
                  Adds row quantity to existing stock & logs immutable inward audit transaction.
                </p>
              </label>
            </div>
          </div>

          {/* Validation Errors Notice (if any) */}
          {previewData.errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{previewData.errors.length} validation errors detected in spreadsheet.</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Invalid rows will be skipped during import. You can download the full error log below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadErrorReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-700 font-bold rounded-lg text-[11px] hover:bg-rose-50 transition-colors flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Download Errors CSV
              </button>
            </div>
          )}

          {/* Interactive Preview Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-600 flex justify-between">
              <span>Spreadsheet Preview (First {previewData.previewRows.length} Rows)</span>
              <span className="text-[11px] text-gray-400">Sheet: {previewData.worksheetTitle || 'Sheet1'}</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-[10px] sticky top-0 border-b">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Part Number</th>
                    <th className="py-2 px-3">MPN</th>
                    <th className="py-2 px-3">Tracking ID</th>
                    <th className="py-2 px-3">Program</th>
                    <th className="py-2 px-3">Location (Rack/Bin)</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isValid ? 'hover:bg-gray-50' : 'bg-rose-50/40 text-rose-800'}
                    >
                      <td className="py-2 px-3 font-mono text-gray-400">{row.rowNumber}</td>
                      <td className="py-2 px-3 font-bold">{row.partNumber}</td>
                      <td className="py-2 px-3 font-mono text-gray-600">{row.mpn}</td>
                      <td className="py-2 px-3 font-mono font-bold">{row.trackingId}</td>
                      <td className="py-2 px-3">{row.program}</td>
                      <td className="py-2 px-3 font-mono">{row.rack} / {row.bin}</td>
                      <td className="py-2 px-3 text-right font-bold">{row.quantity}</td>
                      <td className="py-2 px-3 text-center">
                        {row.isValid ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'EXISTING_DB'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {row.status === 'EXISTING_DB' ? 'Existing' : 'New'}
                          </span>
                        ) : (
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800"
                            title={row.errors.join(', ')}
                          >
                            Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep('UPLOAD')}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
            >
              Back to Upload
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || previewData.summary.validRows === 0}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing Rows...
                  </>
                ) : (
                  <>
                    Confirm & Import {previewData.summary.validRows} Records
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 'RESULTS' && importResults && (
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-black text-[#20252B]">Spreadsheet Import Completed</h3>
            <p className="text-xs text-gray-500 mt-1">
              Data has been synchronized into MongoDB and barcodes generated for newly registered items.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs max-w-xl mx-auto">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block text-[10px] font-bold uppercase">New Parts</span>
              <span className="text-xl font-black text-emerald-800">{importResults.summary.imported}</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-blue-700 block text-[10px] font-bold uppercase">Updated</span>
              <span className="text-xl font-black text-blue-800">{importResults.summary.updated}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-500 block text-[10px] font-bold uppercase">Skipped</span>
              <span className="text-xl font-black text-gray-700">{importResults.summary.skipped}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-rose-700 block text-[10px] font-bold uppercase">Failed</span>
              <span className="text-xl font-black text-rose-800">{importResults.summary.failed}</span>
            </div>
          </div>

          {importResults.failureDetails && importResults.failureDetails.length > 0 && (
            <div className="text-left bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-900 max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  {importResults.failureDetails.length} Failed Rows Details
                </span>
                <button
                  onClick={downloadErrorReport}
                  className="text-[11px] font-bold text-rose-700 underline"
                >
                  Download Error CSV
                </button>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                {importResults.failureDetails.slice(0, 5).map((f, i) => (
                  <li key={i}>
                    Row {f.rowNumber} ({f.trackingId || 'N/A'}): {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex justify-center gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-xl shadow-xs transition-colors"
            >
              Done & View Updated Inward Catalog
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
