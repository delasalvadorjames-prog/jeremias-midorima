import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { PaymentMethodItem } from './types';
import { ChartCard } from './RevenueChart';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

interface Props {
  data:    PaymentMethodItem[];
  loading: boolean;
  isDark:  boolean;
}

export default function PaymentDonut({ data, loading, isDark }: Props) {
  const total = data.reduce((s, d) => s + d.revenue, 0);

  const opts = useMemo<ApexOptions>(() => ({
    chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    colors: PALETTE.slice(0, data.length),
    labels: data.map(d => d.method.toUpperCase().replace('_', ' ')),
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
    <ChartCard title="Payment Method Distribution" subtitle="Revenue split by payment options" isDark={isDark} loading={loading} empty={data.length === 0}>
      <ReactApexChart options={opts} series={data.map(d => d.revenue)} type="donut" height={220} />
    </ChartCard>
  );
}
