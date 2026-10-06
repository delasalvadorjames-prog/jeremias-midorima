import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { CategorySalesPoint } from './types';
import { ChartCard } from './RevenueChart';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

interface Props {
  data:    CategorySalesPoint[];
  loading: boolean;
  isDark:  boolean;
}

export default function CategoryDonut({ data, loading, isDark }: Props) {
  const total = data.reduce((s, d) => s + d.revenue, 0);

  const opts = useMemo<ApexOptions>(() => ({
    chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    colors: PALETTE.slice(0, data.length),
    labels: data.map(d => d.category),
    stroke: { width: 4, colors: [isDark ? '#0f172a' : '#ffffff'] },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Revenue',
              fontSize: '11px',
              fontWeight: '700',
              color: isDark ? '#94a3b8' : '#64748b',
              formatter: () => fmt(total),
            },
            value: {
              fontSize: '18px',
              fontWeight: '800',
              color: isDark ? '#f8fafc' : '#0f172a',
              formatter: (v: string) => fmt(Number(v)),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      labels: { colors: isDark ? '#94a3b8' : '#475569' },
      fontSize: '12px',
      fontWeight: '700',
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => fmt(v) },
    },
  }), [data, isDark, total]);

  return (
    <ChartCard title="Revenue by Category" subtitle="Sales distribution across product categories" isDark={isDark} loading={loading} empty={data.length === 0}>
      <ReactApexChart options={opts} series={data.map(d => d.revenue)} type="donut" height={280} />
    </ChartCard>
  );
}
