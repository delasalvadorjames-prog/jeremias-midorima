import React from 'react';
import { Medicine } from '../types';
import { Card, CardContent, Typography } from '@mui/material';

interface Props { medicines: Medicine[] }

export default function InventorySummaryCards({ medicines }: Props) {
  const total = medicines.length;
  const low = medicines.filter(m => (m.stock || 0) <= (m.reorderLevel || 0)).length;
  const newArrivals = medicines.filter(m => m.is_new_arrival).length;

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 30%' }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Total Items</Typography>
            <Typography variant="h4">{total}</Typography>
          </CardContent>
        </Card>
      </div>
      <div style={{ flex: '1 1 30%' }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Low Stock</Typography>
            <Typography variant="h4">{low}</Typography>
          </CardContent>
        </Card>
      </div>
      <div style={{ flex: '1 1 30%' }}>
        <Card>
          <CardContent>
            <Typography variant="h6">New Arrivals</Typography>
            <Typography variant="h4">{newArrivals}</Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
