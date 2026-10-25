import React from 'react';

export default function VisteonLogo({
  variant = 'default',
  className = 'h-8',
  showText = true,
  subtitle = 'Proto Lab - Inventory Management System',
  useImage = false,
}) {
  // Brand colors: Primary Orange #F58220, Charcoal #20252B, White #FFFFFF
  const isDark = variant === 'dark' || variant === 'sidebar';
  const isWhite = variant === 'white';
  const emblemColor = isWhite ? '#FFFFFF' : '#F58220';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Visteon Official Geometric "V" Emblem */}
      {useImage ? (
        <img
          src="/visteon-logo.png"
          alt="Visteon Logo"
          className="h-full aspect-[294/239] object-contain flex-shrink-0"
        />
      ) : (
        <svg
          viewBox="0 0 294 239"
          className="h-full aspect-[294/239] flex-shrink-0 drop-shadow-2xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Chevron / V-Arm */}
          <path d="M0 0 L112 0 L204 147 L147 239 Z" fill={emblemColor} />
          {/* Right Triangle */}
          <path d="M206 0 L294 0 L206 147 Z" fill={emblemColor} />
        </svg>
      )}

      {/* Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-baseline">
            <span
              className={`font-black tracking-tight text-xl font-['Inter'] ${
                isDark ? 'text-white' : 'text-[#20252B]'
              }`}
            >
              Visteon
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220] ml-1"></span>
          </div>
          {subtitle && (
            <span
              className={`text-[9px] font-semibold tracking-wider uppercase mt-0.5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
