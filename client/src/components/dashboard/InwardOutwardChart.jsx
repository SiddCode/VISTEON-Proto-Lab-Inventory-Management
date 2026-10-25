import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function InwardOutwardChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        No stock movement history recorded in this period.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
          <p className="font-bold text-[#20252B] mb-1.5">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Inward Received: {payload[0]?.value || 0} units</span>
            </div>
            <div className="flex items-center gap-2 text-[#F58220] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#F58220]"></span>
              <span>Outward Dispatched: {payload[1]?.value || 0} units</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F58220" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F58220" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
          />
          <Area
            type="monotone"
            name="Inward"
            dataKey="inward"
            stroke="#10B981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorInward)"
          />
          <Area
            type="monotone"
            name="Outward"
            dataKey="outward"
            stroke="#F58220"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorOutward)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
