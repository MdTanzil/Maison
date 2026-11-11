'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

export function DashboardCharts({
  salesByDate,
  statusBreakdown,
  canViewFinancials,
}: {
  salesByDate: Array<{ date: string; revenue: number; orders: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  canViewFinancials: boolean;
}) {
  const barColors = ['#567C8D', '#2F4156', '#7A9BAE', '#9BB5C4', '#C8D9E6', '#D5C8BD'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {canViewFinancials && (
        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
          <div className="mb-4">
            <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
              Revenue &amp; Sales Velocity
            </h3>
            <p className="text-xs text-[#52606D]">
              Database-driven daily order value (৳) across selected period
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDate}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#567C8D" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#567C8D" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#52606D' }} />
                <YAxis tick={{ fontSize: 11, fill: '#52606D' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E0D9',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#567C8D"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tealGrad)"
                  name="Revenue (৳)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div
        className={`${
          canViewFinancials ? 'lg:col-span-5' : 'lg:col-span-12'
        } rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury`}
      >
        <div className="mb-4">
          <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
            Order Pipeline by Status
          </h3>
          <p className="text-xs text-[#52606D]">
            Live distribution of orders across fulfillment stages
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D9" />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#52606D' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#52606D' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E0D9',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Orders">
                {statusBreakdown.map((_, idx) => (
                  <Cell key={idx} fill={barColors[idx % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
