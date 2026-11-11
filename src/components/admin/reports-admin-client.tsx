'use client';

import React from 'react';
import { Download, BarChart3, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

export function ReportsAdminClient({
  summary,
  topProducts,
  categoryPerformance,
}: {
  summary: {
    grossRevenue: number;
    totalCost: number;
    netProfit: number;
    totalOrders: number;
    totalRefunded: number;
    inventoryValuation: number;
  };
  topProducts: Array<{
    id: string;
    title: string;
    sku: string;
    categoryName: string;
    soldCount: number;
    stockQuantity: number;
    revenue: number;
  }>;
  categoryPerformance: Array<{
    name: string;
    sold: number;
    stock: number;
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Business Intelligence
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Executive Reports &amp; Financial Analytics
          </h1>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <a
            href="/api/export/orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
          >
            <Download className="h-4 w-4" />
            <span>Export Sales Report (CSV)</span>
          </a>
          <a
            href="/api/export/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-2.5 text-xs font-semibold text-[#2F4156]"
          >
            <Download className="h-4 w-4 text-[#567C8D]" />
            <span>Export Inventory Report</span>
          </a>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
          <span className="text-xs font-semibold uppercase text-[#52606D]">
            Gross Sales Revenue
          </span>
          <p className="text-2xl font-bold text-[#2F4156] mt-2">
            {formatCurrency(summary.grossRevenue)}
          </p>
          <p className="text-xs text-[#567C8D] mt-1">
            Across {summary.totalOrders} total orders
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
          <span className="text-xs font-semibold uppercase text-[#52606D]">
            Estimated Gross Profit
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {formatCurrency(summary.netProfit)}
          </p>
          <p className="text-xs text-[#52606D] mt-1">
            COGS: {formatCurrency(summary.totalCost)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
          <span className="text-xs font-semibold uppercase text-[#52606D]">
            Inventory Asset Valuation (Cost)
          </span>
          <p className="text-2xl font-bold text-[#2F4156] mt-2">
            {formatCurrency(summary.inventoryValuation)}
          </p>
          <p className="text-xs text-[#52606D] mt-1">Current warehouse stock value</p>
        </div>

        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
          <span className="text-xs font-semibold uppercase text-[#52606D]">
            Total Refunds Processed
          </span>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            {formatCurrency(summary.totalRefunded)}
          </p>
          <p className="text-xs text-[#52606D] mt-1">Verified refund ledger</p>
        </div>
      </div>

      {/* Category Performance Chart & Product Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156] mb-4">
            Units Sold vs Stock by Category
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52606D' }} />
                <YAxis tick={{ fontSize: 11, fill: '#52606D' }} />
                <Tooltip />
                <Bar dataKey="sold" fill="#567C8D" name="Units Sold" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stock" fill="#C8D9E6" name="In Stock" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
            Product Performance &amp; Revenue Contribution
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                  <th className="py-3 px-3 font-semibold">Product / SKU</th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Units Sold</th>
                  <th className="py-3 px-3 font-semibold">Current Stock</th>
                  <th className="py-3 px-3 font-semibold text-right">Est. Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D9]">
                {topProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F5F1EE]/50">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-[#2F4156]">{p.title}</p>
                      <p className="font-mono text-[10px] text-[#567C8D]">{p.sku}</p>
                    </td>
                    <td className="py-3 px-3 text-[#52606D]">{p.categoryName}</td>
                    <td className="py-3 px-3 font-bold text-[#2F4156]">{p.soldCount}</td>
                    <td className="py-3 px-3 text-[#52606D]">{p.stockQuantity}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#567C8D]">
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
