import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, Check, Barcode } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { ProgramBadge } from '../common/Badge';

export default function ManualComponentSearch({ onSelectPart, selectedPartId }) {
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('ALL');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = {
          limit: 8,
          stockStatus: 'IN_STOCK',
        };
        if (query.trim()) params.q = query.trim();
        if (program !== 'ALL') params.program = program;

        const res = await inventoryService.getInventory(params);
        if (res.success) {
          setResults(res.items || []);
        }
      } catch (err) {
        console.error('Failed to search parts for outward:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 250);
    return () => clearTimeout(timer);
  }, [query, program]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#F58220]" />
          Manual Component Search Fallback
        </label>
        <span className="text-[11px] text-gray-500">Filter active stock ready for dispatch</span>
      </div>

      {/* Search & Program Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Part Number, MPN, Tracking, Barcode, Rack, Bin..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] focus:bg-white transition-all"
          />
        </div>

        <div>
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F58220] transition-all"
          >
            <option value="ALL">All Programs</option>
            <option value="Renault Nissan">Renault Nissan</option>
            <option value="Mahindra">Mahindra</option>
            <option value="Skoda">Skoda</option>
            <option value="Tata">Tata</option>
            <option value="TVS">TVS</option>
            <option value="Royal Enfield">Royal Enfield</option>
            <option value="Honda">Honda</option>
            <option value="Maruti Suzuki">Maruti Suzuki</option>
            <option value="PSA">PSA</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-6 text-xs text-gray-400">Searching matching stock...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No active stock found matching your query.
          </div>
        ) : (
          results.map((part) => {
            const isSelected = selectedPartId === part._id;
            return (
              <div
                key={part._id}
                onClick={() => onSelectPart(part)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-[#F58220] bg-[#FFF3E8]/50 ring-1 ring-[#F58220]'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#20252B]">{part.partNumber}</span>
                    <ProgramBadge program={part.program} />
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F58220] bg-white px-2 py-0.5 rounded-full border border-[#F58220]/40">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-500 font-mono mt-1">
                    <span>MPN: {part.mpn}</span>
                    <span>•</span>
                    <span>TRK: {part.trackingId}</span>
                    {part.barcode && (
                      <>
                        <span>•</span>
                        <span className="text-gray-700 font-bold">BC: {part.barcode}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-gray-700">
                      {part.rack || 'RACK-01'} / {part.bin || 'BIN-01'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#F58220]" />
                    <span className="font-bold text-sm text-[#20252B]">{part.availableQuantity}</span>
                    <span className="text-gray-500">avail</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
