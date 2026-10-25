import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeType = 'neutral',
  accentColor = '#F58220',
}) {
  const badgeColors = {
    neutral: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    primary: 'bg-[#FFF3E8] text-[#C96311] border-[#F58220]/20',
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
        style={{
          backgroundImage: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
        }}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#20252B] tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value ?? '0'}
            </h3>
            {badgeText && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  badgeColors[badgeType] || badgeColors.neutral
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>}
        </div>

        {Icon && (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: '#FFF3E8',
              color: '#F58220',
            }}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
