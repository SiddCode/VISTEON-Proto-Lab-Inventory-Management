import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

export default function BarcodeScannerInput({ onPartFound, onError }) {
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [statusMessage, setStatusMessage] = useState('Barcode Scanner Ready. Scan Code 128 barcode or Tracking ID.');
  const inputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Subtle audio tone for warehouse scanner feedback
  const playBeep = (isSuccess) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (isSuccess) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch for success
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low buzz for not found
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // AudioContext ignored if blocked
    }
  };

  const handleScanSubmit = async (e) => {
    e?.preventDefault();
    const cleanCode = barcode.trim().toUpperCase();
    if (!cleanCode) return;

    setStatus('scanning');
    setStatusMessage(`Searching inventory for identifier: ${cleanCode}...`);

    try {
      const res = await inventoryService.getInventory({ q: cleanCode, limit: 5 });
      
      if (res.success && res.items.length > 0) {
        // Priority 1: Exact Barcode match
        // Priority 2: Exact Tracking ID match
        // Priority 3: First search match
        const exactMatch =
          res.items.find((item) => (item.barcode || '').toUpperCase() === cleanCode) ||
          res.items.find((item) => item.trackingId.toUpperCase() === cleanCode) ||
          res.items[0];

        setStatus('success');
        setStatusMessage(
          `Identified: ${exactMatch.partNumber} (${exactMatch.rack || 'RACK-01'} / ${exactMatch.bin || 'BIN-01'}) — Stock: ${exactMatch.availableQuantity} units`
        );
        playBeep(true);
        onPartFound(exactMatch);
        setBarcode('');
      } else {
        setStatus('error');
        setStatusMessage(`No active inventory record found for '${cleanCode}'`);
        playBeep(false);
        onError?.(`Item not found for barcode '${cleanCode}'`);
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage('Scanner search error. Please check server connection.');
      playBeep(false);
    } finally {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <ScanBarcode className="w-4 h-4 text-[#F58220]" />
          Barcode & Hardware Scanner Interface
        </label>
        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          USB / Bluetooth Keyboard Emulation
        </span>
      </div>

      <form onSubmit={handleScanSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan Code 128 barcode (e.g. VIS-BC-109021) or Tracking ID and hit Enter..."
            className="w-full pl-4 pr-24 py-3 text-sm font-mono uppercase bg-gray-50 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#F58220] focus:bg-white transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!barcode.trim() || status === 'scanning'}
            className="absolute right-2 px-4 py-1.5 text-xs font-bold text-white bg-[#F58220] hover:bg-[#DF7215] rounded-lg transition-colors shadow-xs disabled:opacity-40"
          >
            {status === 'scanning' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Scan / Enter'
            )}
          </button>
        </div>
      </form>

      {/* Visual Feedback Bar */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        {status === 'idle' && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{statusMessage}</span>
          </div>
        )}
        {status === 'scanning' && (
          <div className="flex items-center gap-1.5 text-[#F58220] font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
