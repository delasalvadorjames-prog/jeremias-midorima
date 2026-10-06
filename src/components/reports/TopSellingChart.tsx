import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { TopProduct } from './types';
import { ChartCard } from './RevenueChart';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

interface Props {
  data:    TopProduct[];
  loading: boolean;
  isDark:  boolean;
}

export default function TopSellingChart({ data, loading, isDark }: Props) {
  const top10 = useMemo(() => data.slice(0, 10), [data]);

  const opts = useMemo<ApexOptions>(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    colors: ['#10b981'],
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: true,
        barHeight: '55%',
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (v) => fmt(Number(v)),
      style: { fontSize: '11px', colors: [isDark ? '#f8fafc' : '#1e293b'], fontWeight: 700 },
      offsetX: 10,
    },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: top10.map(d => d.medicine_name),
      labels: {
        formatter: (v) => `₱${(Number(v) / 1000).toFixed(0)}k`,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: '700' },
      },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: isDark ? '#cbd5e1' : '#334155', fontSize: '12px', fontWeight: '700' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => fmt(v) },
    },
  }), [top10, isDark]);

  return (
    <ChartCard title="Top 10 Selling Medicines" subtitle="Ranked by total revenue generated" isDark={isDark} loading={loading} empty={top10.length === 0}>
      <ReactApexChart options={opts} series={[{ name: 'Revenue', data: top10.map(d => d.total_revenue) }]} type="bar" height={Math.max(280, top10.length * 32)} />
    </ChartCard>
  );
}
