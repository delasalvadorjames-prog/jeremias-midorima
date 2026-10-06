import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  MenuItem,
  Modal,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FifoInventoryService, FifoBatch, FifoProduct } from '../services/FifoInventoryService';

// ─── Design tokens (mirrors ReportsPanel / DashboardPanelView palette) ────────

const C = {
  bg: '#f0f4f9',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subtext: '#334155',
  muted: '#64748b',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  green: '#059669',
  greenLight: '#ecfdf5',
  amber: '#d97706',
  amberLight: '#fffbeb',
  red: '#dc2626',
  redLight: '#fef2f2',
  indigo: '#4f46e5',
  indigoLight: '#eef2ff',
  teal: '#0d9488',
  tealLight: '#f0fdfa',
} as const;

// ─── Formatters ───────────────────────────────────────────────────────────────

const peso = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v);

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });

function daysUntilExpiry(expiry: string): number {
  return Math.ceil((new Date(expiry).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

const getProductStatusIndicator = (nearestExpiryDate?: string | null) => {
  if (!nearestExpiryDate) return { label: 'Normal Stock', color: 'green' as const };
  const daysLeft = daysUntilExpiry(nearestExpiryDate);
  if (daysLeft <= 0) return { label: 'Expired', color: 'red' as const, daysLeft };
  if (daysLeft <= 30) return { label: 'Not For Sale', color: 'red' as const, daysLeft };
  if (daysLeft <= 60) return { label: 'Near Expiry', color: 'amber' as const, daysLeft };
  return { label: 'Normal Stock', color: 'green' as const, daysLeft };
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconBox = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconCart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const IconLayers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconPlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconTrash = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

const IconRefresh = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconClose = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 0.5 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{subtitle}</Typography>}
    </Box>
  );
}

function StatusBadge({ label, color }: { label: string; color: 'green' | 'amber' | 'red' | 'indigo' | 'muted' }) {
  const map = {
    green: { bg: C.greenLight, text: C.green, border: '#bbf7d0' },
    amber: { bg: C.amberLight, text: C.amber, border: '#fde68a' },
    red: { bg: C.redLight, text: C.red, border: '#fecaca' },
    indigo: { bg: C.indigoLight, text: C.indigo, border: '#c7d2fe' },
    muted: { bg: '#f8fafc', text: C.muted, border: C.border },
  };
  const s = map[color];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 1.25, py: 0.25,
      borderRadius: '6px',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </Box>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <Fade in>
      <Box sx={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2.5, py: 1.75,
        background: type === 'success' ? C.green : C.red,
        color: '#fff', borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        fontSize: 13, fontWeight: 700,
        maxWidth: 420,
      }}>
        {type === 'success' ? <IconCheck /> : <IconAlert />}
        <span>{message}</span>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)', ml: 1, p: 0.25 }}>
          <IconClose />
        </IconButton>
      </Box>
    </Fade>
  );
}

// ─── Batch Drawer Modal ───────────────────────────────────────────────────────

function BatchDrawer({
  product,
  open,
  onClose,
}: {
  product: FifoProduct | null;
  open: boolean;
  onClose: () => void;
}) {
  const [batches, setBatches] = useState<FifoBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setLoading(true);
    FifoInventoryService.getInventory(product.id)
      .then(setBatches)
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, [open, product]);

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: { xs: '100%', sm: 520 },
          background: C.surface,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <Box sx={{
            p: '20px 24px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2,
          }}>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', mb: 0.5 }}>
                Batch Detail
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                {product?.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', mt: 0.25 }}>
                SKU: {product?.sku} · {product?.category || 'Uncategorized'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)', mt: -0.5 }}>
              <IconClose />
            </IconButton>
          </Box>

          {/* Stats bar */}
          {product && (
            <Box sx={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: 'Available', value: product.available_stock, color: C.green },
                { label: 'Near Expiry', value: product.near_expiry_count, color: C.amber },
                { label: 'Unit Price', value: peso(product.unit_price), color: C.indigo },
              ].map((stat) => (
                <Box key={stat.label} sx={{ flex: 1, p: '12px 16px', textAlign: 'center', borderRight: `1px solid ${C.border}`, '&:last-child': { borderRight: 'none' } }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{stat.value}</Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mt: 0.25 }}>{stat.label}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Batch list */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} sx={{ color: C.blue }} />
              </Box>
            ) : batches.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: C.muted }}>
                <IconLayers style={{ opacity: 0.3, width: 48, height: 48 }} />
                <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 600 }}>No batches found</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[...batches]
                  .sort((a, b) => {
                    const expiryOrder = new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
                    if (expiryOrder !== 0) return expiryOrder;
                    const receivedA = a.received_date ? new Date(a.received_date).getTime() : Number.MAX_SAFE_INTEGER;
                    const receivedB = b.received_date ? new Date(b.received_date).getTime() : Number.MAX_SAFE_INTEGER;
                    return receivedA - receivedB || a.id - b.id;
                  })
                  .map((batch, idx, orderedBatches) => {
                  const days = daysUntilExpiry(batch.expiry_date);
                  const isExpired = days <= 0;
                  const isNotForSale = !isExpired && days <= 30;
                  const isNearExpiry = !isExpired && !isNotForSale && days <= 60;
                  const isEmpty = batch.remaining_quantity === 0;

                  // A batch is only valid for sale if it's not removed, not empty, and has more than 30 days remaining
                  const isValidForSale = !batch.is_removed && !isEmpty && days > 30;
                  const fifoNext = isValidForSale && idx === orderedBatches.findIndex(b => {
                    const bDays = daysUntilExpiry(b.expiry_date);
                    return !b.is_removed && b.remaining_quantity > 0 && bDays > 30;
                  });

                  return (
                    <Paper key={batch.id} elevation={0} sx={{
                      p: 2,
                      border: `1.5px solid ${fifoNext ? `${C.green}60` : (isExpired || isNotForSale || isEmpty) ? C.border : C.border}`,
                      borderRadius: '12px',
                      background: fifoNext ? `${C.green}06` : (isExpired || isNotForSale) ? '#fafafa' : C.surface,
                      position: 'relative',
                      opacity: (isExpired || isNotForSale || isEmpty) ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}>
                      {/* FIFO indicator */}
                      {fifoNext && (
                        <Box sx={{
                          position: 'absolute', top: -10, left: 12,
                          background: C.green, color: '#fff',
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                          px: 1, py: 0.25, borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}>
                          FEFO Next
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.text }}>
                            Batch #{batch.id}
                            {batch.batch_reference ? ` · ${batch.batch_reference}` : ''}
                          </Typography>
                          {batch.supplier && (
                            <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                              Supplier: {batch.supplier}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {batch.is_removed && <StatusBadge label="Removed" color="muted" />}
                          {!batch.is_removed && isExpired && <StatusBadge label="Expired" color="red" />}
                          {!batch.is_removed && isNotForSale && <StatusBadge label="Not For Sale" color="red" />}
                          {!batch.is_removed && isNearExpiry && <StatusBadge label={`${days}d left`} color="amber" />}
                          {!batch.is_removed && !isExpired && !isNotForSale && !isNearExpiry && isEmpty && <StatusBadge label="Depleted" color="muted" />}
                          {!batch.is_removed && !isExpired && !isNotForSale && !isNearExpiry && !isEmpty && <StatusBadge label="Active" color="green" />}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        {[
                          { label: 'Original Qty', value: batch.quantity },
                          { label: 'Remaining', value: batch.remaining_quantity, highlight: true },
                          { label: 'Received', value: fmtDate(batch.received_date) },
                          { label: 'Expires', value: fmtDate(batch.expiry_date), warn: !batch.is_removed && isNearExpiry, danger: !batch.is_removed && (isExpired || isNotForSale) },
                        ].map((item) => (
                          <Box key={item.label} sx={{ p: '8px 10px', borderRadius: '8px', background: '#f8fafc' }}>
                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {item.label}
                            </Typography>
                            <Typography sx={{
                              fontSize: 13, fontWeight: 800, mt: 0.25,
                              color: item.highlight ? C.blue : item.danger ? C.red : item.warn ? C.amber : C.text,
                            }}>
                              {item.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}

// ─── Add Batch Modal ──────────────────────────────────────────────────────────

function AddBatchModal({
  open,
  products,
  onClose,
  onSuccess,
}: {
  open: boolean;
  products: FifoProduct[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [receivedDate, setReceivedDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [batchRef, setBatchRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setProductId(''); setQuantity(''); setReceivedDate(today);
    setExpiryDate(''); setSupplier(''); setBatchRef(''); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!productId) { setError('Please select a product.'); return; }
    if (!quantity || Number(quantity) <= 0) { setError('Quantity must be greater than 0.'); return; }
    if (!expiryDate) { setError('Expiry date is required.'); return; }
    if (expiryDate <= today) { setError('Expiry date must be in the future.'); return; }

    setLoading(true);
    setError('');
    try {
      const selectedProduct = products.find((product) => product.id === Number(productId));
      await FifoInventoryService.addBatch({
        product_id: Number(productId),
        quantity: Math.floor(Number(quantity)),
        received_date: receivedDate,
        expiry_date: expiryDate,
        supplier: supplier || undefined,
        batch_reference: batchRef || undefined,
        product_source: selectedProduct?.source,
      });
      onSuccess(`Batch of ${quantity} units added successfully.`);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add batch.');
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px', fontSize: 13, fontWeight: 600,
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: C.blue },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: C.blue, borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: C.blue },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth slotProps={{
      paper: { sx: { borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' } },
    }}>
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
        color: '#fff', py: 2.5, px: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
            Inventory Management
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#fff', mt: 0.25 }}>
            Add Stock Batch
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <IconClose />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: '24px !important' }}>
        {error && (
          <Box sx={{ mb: 2.5, p: '10px 14px', borderRadius: '10px', background: C.redLight, border: `1px solid #fecaca`, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconAlert style={{ color: C.red, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.red }}>{error}</Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Product selector */}
          <TextField
            select label="Product" value={productId} onChange={(e) => setProductId(e.target.value)}
            fullWidth size="small" sx={fieldSx}
            slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { borderRadius: '12px', mt: 0.5 } } } } } }}
          >
            <MenuItem value=""><em style={{ color: C.muted }}>Select a product…</em></MenuItem>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: C.muted }}>{p.sku} · Available: {p.available_stock}</Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Quantity" type="number" value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              slotProps={{ htmlInput: { min: 1, step: 1 } }} fullWidth size="small" sx={fieldSx}
            />
            <TextField
              label="Received Date" type="date" value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} fullWidth size="small" sx={fieldSx}
            />
          </Box>

          <TextField
            label="Expiry Date" type="date" value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
            }}
            fullWidth size="small" sx={fieldSx}
            helperText="Must be a future date — expired batches cannot be added"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Supplier (optional)" value={supplier} onChange={(e) => setSupplier(e.target.value)} fullWidth size="small" sx={fieldSx} />
            <TextField label="Batch Reference (optional)" value={batchRef} onChange={(e) => setBatchRef(e.target.value)} fullWidth size="small" sx={fieldSx} />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
        <Button onClick={handleClose} variant="outlined" sx={{
          borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 3,
          color: C.muted, borderColor: C.border,
          '&:hover': { background: '#f8fafc', borderColor: C.muted },
        }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconPlus />}
          sx={{
            borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 3,
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)', boxShadow: '0 6px 20px rgba(37,99,235,0.45)' },
          }}
        >
          {loading ? 'Adding…' : 'Add Batch'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── INVENTORY TAB ─────────────────────────────────────────────────────────────

type CartItem = { product: FifoProduct; quantity: number; validating: boolean; error: string };

function InventoryTab({ userRole }: { userRole: 'admin' | 'staff' }) {
  const [products, setProducts] = useState<FifoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'out' | 'near_expiry'>('all');
  const [selectedProduct, setSelectedProduct] = useState<FifoProduct | null>(null);
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await FifoInventoryService.listProducts());
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to load inventory', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
      const matchFilter =
        filter === 'all' ? true :
          filter === 'available' ? p.available_stock > 0 :
            filter === 'out' ? p.available_stock <= 0 :
              p.near_expiry_count > 0;
      return matchSearch && matchFilter;
    });
  }, [products, search, filter]);

  const summary = useMemo(() => ({
    total: products.length,
    available: products.filter((p) => p.available_stock > 0).length,
    out: products.filter((p) => p.available_stock <= 0).length,
    nearExpiry: products.filter((p) => p.near_expiry_count > 0).length,
  }), [products]);

  const handleRemoveExpired = async () => {
    setRemoving(true);
    try {
      const res = await FifoInventoryService.removeExpired();
      setToast({ msg: `Removed ${res.removed_batches} expired batches (${res.removed_units} units).`, type: 'success' });
      await load();
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to remove expired batches', type: 'error' });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
        {[
          { label: 'Total Products', value: summary.total, color: C.indigo, bg: C.indigoLight },
          { label: 'In Stock', value: summary.available, color: C.green, bg: C.greenLight },
          { label: 'Out of Stock', value: summary.out, color: C.red, bg: C.redLight },
          { label: 'Near Expiry', value: summary.nearExpiry, color: C.amber, bg: C.amberLight },
        ].map((kpi) => (
          <Paper key={kpi.label} elevation={0} sx={{
            p: '16px 20px',
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            background: C.surface,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            position: 'relative', overflow: 'hidden',
            '&::before': {
              content: '""', position: 'absolute', top: 0, left: 0, right: 0,
              height: '3px', background: kpi.color, borderRadius: '16px 16px 0 0',
            },
          }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{kpi.label}</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1.2, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU, or category…"
          size="small" sx={{
            flex: 1, minWidth: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px', fontSize: 13,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: C.blue },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, p: '3px', background: '#f1f5f9', borderRadius: '10px' }}>
          {([
            { id: 'all', label: 'All' },
            { id: 'available', label: 'In Stock' },
            { id: 'out', label: 'Out' },
            { id: 'near_expiry', label: 'Near Expiry' },
          ] as const).map((f) => (
            <Button key={f.id} onClick={() => setFilter(f.id)} size="small" sx={{
              px: 1.5, py: 0.5, borderRadius: '7px', fontSize: 12, fontWeight: 700,
              textTransform: 'none', minWidth: 0,
              color: filter === f.id ? '#fff' : C.muted,
              background: filter === f.id ? C.blue : 'transparent',
              boxShadow: filter === f.id ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
              transition: 'all 0.2s ease',
              '&:hover': { background: filter === f.id ? C.blue : 'rgba(37,99,235,0.06)', color: filter === f.id ? '#fff' : C.blue },
            }}>
              {f.label}
            </Button>
          ))}
        </Box>

        <Button
          onClick={() => setAddBatchOpen(true)}
          variant="contained"
          startIcon={<IconPlus />}
          sx={{
            borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: 13, px: 2.5,
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' },
          }}
        >
          Add Batch
        </Button>

        {userRole === 'admin' && (
          <Tooltip title="Mark all expired batches as removed and zero out their remaining quantity">
            <Button
              onClick={handleRemoveExpired} disabled={removing} variant="outlined"
              startIcon={removing ? <CircularProgress size={12} /> : <IconTrash />}
              sx={{
                borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: 13,
                color: C.red, borderColor: `${C.red}50`,
                '&:hover': { background: C.redLight, borderColor: C.red },
              }}
            >
              {removing ? 'Removing…' : 'Remove Expired'}
            </Button>
          </Tooltip>
        )}

        <Tooltip title="Refresh product list">
          <IconButton onClick={load} disabled={loading} sx={{ color: C.muted, border: `1px solid ${C.border}`, borderRadius: '10px', p: 1 }}>
            <IconRefresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              {['SKU', 'Product', 'Category', 'Available', 'Near Expiry', 'Status', ''].map((h) => (
                <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', py: 1.5, px: 2 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 8, textAlign: 'center' }}>
                  <CircularProgress size={28} sx={{ color: C.blue }} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 8, textAlign: 'center', color: C.muted, fontSize: 13, fontWeight: 600 }}>
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const outOfStock = p.available_stock <= 0;
                const nearExpiry = p.near_expiry_count > 0;
                return (
                  <TableRow key={p.id} hover sx={{ cursor: 'pointer', '&:hover': { background: '#f8faff' }, '& td': { borderBottom: `1px solid ${C.border}` } }}
                    onClick={() => setSelectedProduct(p)}>
                    <TableCell sx={{ px: 2, py: 1.5, fontSize: 12, fontWeight: 700, color: C.muted }}>{p.sku}</TableCell>
                    <TableCell sx={{ px: 2, py: 1.5 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.text }}>{p.name}</Typography>
                      {p.nearest_expiry_date && (
                        <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
                          Next expiry: {fmtDate(p.nearest_expiry_date)} ({daysUntilExpiry(p.nearest_expiry_date)} days remaining)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, color: C.muted }}>{p.category || '—'}</TableCell>
                    <TableCell sx={{ px: 2, py: 1.5, fontSize: 14, fontWeight: 800, color: outOfStock ? C.red : C.text, fontVariantNumeric: 'tabular-nums' }}>
                      {p.available_stock}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.5 }}>
                      {nearExpiry ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <IconAlert style={{ color: C.amber, width: 12, height: 12 }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.amber }}>{p.near_expiry_count} units</Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: C.muted }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.5 }}>
                      {(() => {
                        const statusInfo = getProductStatusIndicator(p.nearest_expiry_date);
                        return (
                          <StatusBadge
                            label={outOfStock && statusInfo.label === 'Normal Stock' ? 'Out of Stock' : statusInfo.label}
                            color={statusInfo.color}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.5, textAlign: 'right' }}>
                      <Button size="small" startIcon={<IconLayers />}
                        onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); }}
                        sx={{
                          fontSize: 11, fontWeight: 700, textTransform: 'none', borderRadius: '8px',
                          color: C.blue, '&:hover': { background: C.blueLight },
                        }}>
                        Batches
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <BatchDrawer product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
      <AddBatchModal
        open={addBatchOpen} products={products}
        onClose={() => setAddBatchOpen(false)}
        onSuccess={(msg) => { setToast({ msg, type: 'success' }); load(); }}
      />
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Box>
  );
}

// ─── POS CHECKOUT TAB ─────────────────────────────────────────────────────────

function POSTab({ userRole, userEmail }: { userRole: 'admin' | 'staff'; userEmail: string }) {
  const [products, setProducts] = useState<FifoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{ saleNumber: string; total: number; items: CartItem[] } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await FifoInventoryService.listProducts();
      setProducts(rows);
      if (!selectedId) {
        const first = rows.find((r) => r.available_stock > 0);
        setSelectedId(String(first?.id || rows[0]?.id || ''));
      }
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to load products', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { load(); }, []);  // eslint-disable-line

  const selected = useMemo(() => products.find((p) => p.id === Number(selectedId)) || null, [products, selectedId]);
  const cartTotal = useMemo(() => cart.reduce((s, r) => s + r.product.unit_price * r.quantity, 0), [cart]);

  const validateQty = async (product: FifoProduct, quantity: number): Promise<{ ok: boolean; msg: string }> => {
    const av = await FifoInventoryService.getAvailableStock(product.id);
    // Expired-only batches → OUT OF STOCK
    if (av.available_stock <= 0) return { ok: false, msg: 'OUT OF STOCK — no valid (non-expired) batches exist.' };
    // Requesting more than available
    if (quantity > av.available_stock) return { ok: false, msg: `Only ${av.available_stock} non-expired units available.` };
    return { ok: true, msg: `${av.available_stock} non-expired units in stock.` };
  };

  const handleAdd = async () => {
    if (!selected || selected.available_stock <= 0) return;
    const safeQty = Math.max(1, Math.floor(qty));
    const result = await validateQty(selected, safeQty);
    if (!result.ok) { setToast({ msg: `${selected.name}: ${result.msg}`, type: 'error' }); return; }

    setCart((prev) => {
      const existing = prev.find((r) => r.product.id === selected.id);
      if (existing) {
        return prev.map((r) => r.product.id === selected.id
          ? { ...r, quantity: r.quantity + safeQty, validating: false, error: '' }
          : r);
      }
      return [...prev, { product: selected, quantity: safeQty, validating: false, error: '' }];
    });
    setQty(1);
  };

  const handleCartQtyChange = async (productId: number, nextQty: number) => {
    const safeQty = Math.max(1, Math.floor(nextQty || 1));
    setCart((prev) => prev.map((r) => r.product.id === productId ? { ...r, quantity: safeQty, validating: true, error: '' } : r));
    const row = cart.find((r) => r.product.id === productId);
    if (!row) return;
    const result = await validateQty(row.product, safeQty);
    setCart((prev) => prev.map((r) => r.product.id === productId ? { ...r, validating: false, error: result.ok ? '' : result.msg } : r));
  };

  const handleCheckout = async () => {
    if (!cart.length || processing) return;
    setProcessing(true);
    try {
      // Re-validate all cart items before committing
      for (const row of cart) {
        const result = await validateQty(row.product, row.quantity);
        if (!result.ok) throw new Error(`${row.product.name}: ${result.msg}`);
      }
      const sale = await FifoInventoryService.processSale({
        items: cart.map((r) => ({
          product_id: r.product.id,
          quantity: r.quantity,
          unit_price: r.product.unit_price,
          product_source: r.product.source,
        })),
        cashier_name: userEmail || undefined,
      });
      setReceipt({ saleNumber: sale.sale_number, total: sale.total_amount, items: [...cart] });
      setCart([]);
      await load();
    } catch (e: any) {
      setToast({ msg: e?.message || 'Sale failed.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const hasInvalid = cart.some((r) => !!r.error);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Product selector */}
      <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '16px', p: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <SectionHeader title="Select Product" subtitle="Only non-expired stock appears here. FEFO deduction is automatic." />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 140px auto' }, gap: 2, mt: 2, alignItems: 'flex-end' }}>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.75 }}>Product</Typography>
            <TextField
              select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
              fullWidth size="small" disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13, fontWeight: 600 },
                '& .MuiSelect-select': { py: 1.25 },
              }}
              slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { borderRadius: '12px', mt: 0.5, maxHeight: 280 } } } } } }}
            >
              {products.map((p) => {
                const isOutOfStock = p.available_stock <= 0;
                return (
                  <MenuItem key={p.id} value={p.id} disabled={isOutOfStock}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{p.name}</Typography>
                        <Typography sx={{ fontSize: 10, color: C.muted }}>{p.sku}</Typography>
                      </Box>
                      <StatusBadge label={isOutOfStock ? 'OUT OF STOCK' : `${p.available_stock}`} color={isOutOfStock ? 'red' : 'green'} />
                    </Box>
                  </MenuItem>
                );
              })}
            </TextField>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.75 }}>Qty</Typography>
            <TextField
              type="number" value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              slotProps={{ htmlInput: { min: 1, max: selected?.available_stock || 1 } }}
              disabled={!selected || selected.available_stock <= 0}
              size="small" fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13, fontWeight: 700 } }}
            />
          </Box>

          <Button
            onClick={handleAdd}
            disabled={!selected || selected.available_stock <= 0}
            variant="contained"
            startIcon={<IconPlus />}
            sx={{
              borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: 13,
              background: 'linear-gradient(135deg, #059669, #10b981)',
              boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
              py: 1.25,
              '&:hover': { background: 'linear-gradient(135deg, #047857, #059669)' },
              '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            Add to Cart
          </Button>
        </Box>

        {/* Selected product info */}
        {selected && (
          <Box sx={{ mt: 2, p: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: `1px solid ${C.border}`, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box><Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit Price</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.text }}>{peso(selected.unit_price)}</Typography></Box>
            <Box><Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Available</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: selected.available_stock <= 0 ? C.red : C.green }}>{selected.available_stock} units</Typography></Box>
            {selected.nearest_expiry_date && (() => {
              const statusInfo = getProductStatusIndicator(selected.nearest_expiry_date);
              if (statusInfo.daysLeft !== undefined && statusInfo.daysLeft <= 60) {
                const warn = statusInfo.daysLeft > 30;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 12px', borderRadius: '8px', background: warn ? C.amberLight : C.redLight, border: `1px solid ${warn ? '#fde68a' : '#fecaca'}` }}>
                    <IconAlert style={{ color: warn ? C.amber : C.red }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: warn ? C.amber : C.red }}>
                      {warn
                        ? `Near Expiry: ${statusInfo.daysLeft} days remaining (${selected.near_expiry_count} units)`
                        : `Not For Sale: Expiry in ${statusInfo.daysLeft} days`}
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}
          </Box>
        )}
      </Paper>

      {/* Cart */}
      <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconCart style={{ color: C.blue }} />
            <SectionHeader title="Cart" subtitle={cart.length ? `${cart.length} item${cart.length > 1 ? 's' : ''}` : 'Empty'} />
          </Box>
          {cart.length > 0 && (
            <Button onClick={() => setCart([])} size="small" sx={{ color: C.red, fontWeight: 700, textTransform: 'none', fontSize: 12, borderRadius: '8px', '&:hover': { background: C.redLight } }}>
              Clear cart
            </Button>
          )}
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              {['Product', 'Available', 'Qty', 'Validation', 'Line Total', ''].map((h) => (
                <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', py: 1.5, px: 2 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: C.muted, fontSize: 13, fontWeight: 600 }}>
                  Cart is empty — add products above.
                </TableCell>
              </TableRow>
            ) : (
              cart.map((row) => (
                <TableRow key={row.product.id} sx={{ '& td': { borderBottom: `1px solid ${C.border}` } }}>
                  <TableCell sx={{ px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.text }}>{row.product.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: C.muted }}>{peso(row.product.unit_price)} / unit</Typography>
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 700, color: C.muted }}>{row.product.available_stock}</TableCell>
                  <TableCell sx={{ px: 2, py: 1.5 }}>
                    <TextField
                      type="number" size="small" value={row.quantity}
                      onChange={(e) => handleCartQtyChange(row.product.id, Number(e.target.value))}
                      slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center', fontWeight: 700, width: 60 } } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 13 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1.5 }}>
                    {row.validating ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={12} sx={{ color: C.blue }} />
                        <Typography sx={{ fontSize: 11, color: C.muted }}>Checking…</Typography>
                      </Box>
                    ) : row.error ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <IconAlert style={{ color: C.red, width: 12, height: 12 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.red }}>{row.error}</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <IconCheck style={{ color: C.green, width: 12, height: 12 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.green }}>Valid</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1.5, fontSize: 14, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                    {peso(row.product.unit_price * row.quantity)}
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1.5, textAlign: 'right' }}>
                    <IconButton size="small" onClick={() => setCart((prev) => prev.filter((r) => r.product.id !== row.product.id))}
                      sx={{ color: C.red, '&:hover': { background: C.redLight } }}>
                      <IconClose />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Checkout footer */}
        <Box sx={{ p: '16px 20px', background: '#f8fafc', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Amount</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {peso(cartTotal)}
            </Typography>
          </Box>
          <Button
            onClick={handleCheckout}
            disabled={!cart.length || processing || hasInvalid}
            variant="contained"
            startIcon={processing ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconCheck />}
            sx={{
              borderRadius: '12px', textTransform: 'none', fontWeight: 800, fontSize: 15,
              px: 4, py: 1.5,
              background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)', boxShadow: '0 8px 28px rgba(37,99,235,0.45)' },
              '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            {processing ? 'Processing…' : 'Process Sale'}
          </Button>
        </Box>
      </Paper>

      {/* Receipt Modal */}
      <Dialog open={!!receipt} onClose={() => setReceipt(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' } } }}>
        <Box sx={{ background: C.green, p: '24px 28px 20px', textAlign: 'center' }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
            <IconCheck style={{ color: '#fff', width: 24, height: 24 }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Sale Complete</Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>{receipt?.saleNumber}</Typography>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {receipt?.items.map((row) => (
              <Box key={row.product.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: `1px solid ${C.border}` }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>{row.product.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: C.muted }}>× {row.quantity} @ {peso(row.product.unit_price)}</Typography>
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.text }}>{peso(row.product.unit_price * row.quantity)}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: C.text }}>Total</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 900, color: C.green }}>{peso(receipt?.total || 0)}</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2, p: '10px 14px', borderRadius: '10px', background: C.blueLight, border: `1px solid ${C.blue}30` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.blue, textAlign: 'center' }}>
              Stock deducted via FEFO — earliest-expiring non-expired batches consumed first.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button fullWidth onClick={() => setReceipt(null)} variant="contained" sx={{
            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            '&:hover': { background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' },
          }}>
            New Transaction
          </Button>
        </DialogActions>
      </Dialog>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Box>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export type FifoPanelProps = {
  userRole: 'admin' | 'staff';
  userEmail: string;
  viewMode?: 'pos' | 'inventory' | 'both';
};

export default function FifoPanel({ userRole, userEmail, viewMode = 'both' }: FifoPanelProps) {
  const [tab, setTab] = useState(viewMode === 'pos' ? 1 : 0);

  if (viewMode === 'pos') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, background: C.bg, p: { xs: 2.5, md: 4 }, minHeight: '100vh' }}>
        {/* POS Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: '20px',
          p: { xs: 3, md: 4 },
          boxShadow: '0 8px 32px rgba(5, 150, 105, 0.3)',
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', mb: 1 }}>
              POS Terminal
            </Typography>
            <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Point of Sales
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', mt: 1 }}>
              Real-time FEFO deduction · Automatic expiry block
            </Typography>
          </Box>
        </Box>
        <POSTab userRole={userRole} userEmail={userEmail} />
      </Box>
    );
  }

  if (viewMode === 'inventory') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, background: C.bg, p: { xs: 2.5, md: 4 }, minHeight: '100vh' }}>
        {/* Inventory Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          borderRadius: '20px',
          p: { xs: 3, md: 4 },
          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', mb: 1 }}>
              Inventory Management
            </Typography>
            <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              FEFO Batches & Expiry
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', mt: 1 }}>
              Track received dates, suppliers, and shelf-life of your stock batches.
            </Typography>
          </Box>
        </Box>
        <InventoryTab userRole={userRole} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, background: C.bg, p: { xs: 2.5, md: 4 }, minHeight: '100vh' }}>
      {/* Page header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: '20px',
        p: { xs: 3, md: 4 },
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 3,
        boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 120, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', mb: 1 }}>
            Inventory System
          </Typography>
          <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            FEFO Inventory
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', mt: 1, fontWeight: 400 }}>
            First-In First-Out stock management · Expiry-aware · Concurrency-safe
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2.5 }}>
          {[
            { icon: <IconBox style={{ color: 'rgba(255,255,255,0.9)' }} />, label: 'FEFO Order' },
            { icon: <IconLayers style={{ color: 'rgba(255,255,255,0.9)' }} />, label: 'Batch Tracking' },
            { icon: <IconCart style={{ color: 'rgba(255,255,255,0.9)' }} />, label: 'POS Ready' },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            px: 2, pt: 1,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13, color: C.muted, minHeight: 44, borderRadius: '10px 10px 0 0', mr: 0.5 },
            '& .Mui-selected': { color: C.blue },
            '& .MuiTabs-indicator': { background: C.blue, borderRadius: '2px 2px 0 0', height: 3 },
          }}
        >
          <Tab icon={<IconBox style={{ width: 15, height: 15 }} />} iconPosition="start" label="Inventory & Batches" id="fifo-tab-0" aria-controls="fifo-panel-0" />
          <Tab icon={<IconCart style={{ width: 15, height: 15 }} />} iconPosition="start" label="POS Checkout" id="fifo-tab-1" aria-controls="fifo-panel-1" />
        </Tabs>
        <Divider />
        <Box role="tabpanel" id="fifo-panel-0" aria-labelledby="fifo-tab-0" hidden={tab !== 0} sx={{ p: 3 }}>
          {tab === 0 && <InventoryTab userRole={userRole} />}
        </Box>
        <Box role="tabpanel" id="fifo-panel-1" aria-labelledby="fifo-tab-1" hidden={tab !== 1} sx={{ p: 3 }}>
          {tab === 1 && <POSTab userRole={userRole} userEmail={userEmail} />}
        </Box>
      </Paper>
    </Box>
  );
}
