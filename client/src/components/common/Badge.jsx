import React from 'react';

export function ProgramBadge({ program }) {
  const programColors = {
    'Renault Nissan': 'bg-amber-50 text-amber-800 border-amber-200',
    'Mahindra': 'bg-red-50 text-red-800 border-red-200',
    'Skoda': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Tata': 'bg-blue-50 text-blue-800 border-blue-200',
    'TVS': 'bg-indigo-50 text-indigo-800 border-indigo-200',
    'Royal Enfield': 'bg-orange-50 text-[#C96311] border-orange-200',
    'Honda': 'bg-sky-50 text-sky-800 border-sky-200',
    'Maruti Suzuki': 'bg-cyan-50 text-cyan-800 border-cyan-200',
    'PSA': 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const colorClass = programColors[program] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {program}
    </span>
  );
}

export function StockStatusBadge({ quantity, threshold = 10 }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
        Out of Stock
      </span>
    );
  }

  if (quantity <= threshold) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
        Low Stock ({quantity})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
      In Stock ({quantity})
    </span>
  );
}

export function TransactionTypeBadge({ type }) {
  if (type === 'INWARD') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
        INWARD
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[#FFF3E8] text-[#C96311] border border-[#F58220]/30">
      OUTWARD
    </span>
  );
}
