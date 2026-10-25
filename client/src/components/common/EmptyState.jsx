import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'No data available for the current filter criteria.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 my-4">
      <div className="w-14 h-14 rounded-full bg-[#FFF3E8] flex items-center justify-center text-[#F58220] mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-[#20252B] mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#F58220] hover:bg-[#DF7215] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F58220]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
