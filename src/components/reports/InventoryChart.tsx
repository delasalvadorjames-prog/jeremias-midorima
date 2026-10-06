import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { InventoryItem } from './types';
import { ChartCard } from './RevenueChart';

interface Props {
  data:    InventoryItem[];
  loading: boolean;
  isDark:  boolean;
}

export default function InventoryChart({ data, loading, isDark }: Props) {
  // Show top 12 lowest stock / critical items
  const items = useMemo(() => data.slice(0, 12), [data]);

  const opts = useMemo<ApexOptions>(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    colors: ['#3b82f6', '#f59e0b'],
    plotOptions: {
      bar: {
        borderRadius: 5,
        columnWidth: '55%',
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: items.map(d => d.medicine_name),
      labels: {
        rotate: -35,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: '700' },
      },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '700' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => `${v} units` },
    },
    legend: {
      labels: { colors: isDark ? '#94a3b8' : '#475569' },
      fontSize: '12px',
      fontWeight: '700',
    },
  }), [items, isDark]);

  const series = [
    { name: 'Current Stock',  data: items.map(d => d.stock) },
    { name: 'Reorder Level',  data: items.map(d => d.reorder_level) },
  ];

  return (
    <ChartCard title="Inventory Status" subtitle="Stock levels vs reorder points (Lowest stock medicines)" isDark={isDark} loading={loading} empty={items.length === 0}>
      <ReactApexChart options={opts} series={series} type="bar" height={220} />
    </ChartCard>
  );
}
