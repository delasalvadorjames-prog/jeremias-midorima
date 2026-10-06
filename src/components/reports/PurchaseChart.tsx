import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { PurchasePeriod } from './types';
import { ChartCard } from './RevenueChart';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

interface Props {
  data:    PurchasePeriod[];
  loading: boolean;
  isDark:  boolean;
}

export default function PurchaseChart({ data, loading, isDark }: Props) {
  const opts = useMemo<ApexOptions>(() => ({
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    colors: ['#6366f1'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: data.map(d => d.period),
      labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '700' } },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => `₱${(v / 1000).toFixed(0)}k`,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '700' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => fmt(v) },
    },
  }), [data, isDark]);

  return (
    <ChartCard title="Monthly Purchase Trend" subtitle="Total stock procurement cost over time" isDark={isDark} loading={loading} empty={data.length === 0}>
      <ReactApexChart options={opts} series={[{ name: 'Purchase Cost', data: data.map(d => d.total_cost) }]} type="area" height={280} />
    </ChartCard>
  );
}
