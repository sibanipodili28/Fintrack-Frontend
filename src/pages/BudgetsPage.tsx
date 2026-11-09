import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, LinearProgress,
  MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../services/api';
import type { BudgetHistoryPoint, BudgetItem, BudgetOverview, BudgetStatus, Category } from '../types';
import { formatMoney } from '../utils/format';

const STATUS: Record<BudgetStatus, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
  ON_TRACK: { label: 'On track', color: 'success' },
  NEAR_LIMIT: { label: 'Near limit', color: 'warning' },
  LIMIT_REACHED: { label: 'Limit reached', color: 'warning' },
  EXCEEDED: { label: 'Exceeded', color: 'error' },
};

const schema = z.object({
  categoryId: z.number({ invalid_type_error: 'Choose a category' }),
  amount: z.number({ invalid_type_error: 'Enter an amount' }).min(0.01, 'Must be at least 0.01'),
});
type Form = z.infer<typeof schema>;

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [history, setHistory] = useState<BudgetHistoryPoint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const load = useCallback(() => {
    api.get<BudgetOverview>('/budgets', { params: { month } }).then((r) => setOverview(r.data)).catch((e) => setError(errorMessage(e)));
    api.get<BudgetHistoryPoint[]>('/budgets/history', { params: { months: 6 } }).then((r) => setHistory(r.data)).catch(() => setHistory([]));
  }, [month]);
  useEffect(load, [load]);
  useEffect(() => {
    api.get<Category[]>('/categories', { params: { type: 'EXPENSE' } }).then((r) => setCategories(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  const budgeted = new Set(overview?.items.map((i) => i.categoryId));
  const available = categories.filter((c) => !budgeted.has(c.id));

  const openNew = () => { setEditing(null); reset({ categoryId: undefined, amount: undefined }); setOpen(true); };
  const openEdit = (b: BudgetItem) => { setEditing(b); reset({ categoryId: b.categoryId, amount: b.amount }); setOpen(true); };
  const save = async (v: Form) => {
    try {
      if (editing) await api.put(`/budgets/${editing.id}`, { amount: v.amount });
      else await api.post('/budgets', { categoryId: v.categoryId, month, amount: v.amount });
      setOpen(false); setError(null); load();
    } catch (e) { setError(errorMessage(e)); setOpen(false); }
  };
  const remove = async (b: BudgetItem) => {
    if (!window.confirm(`Delete the ${b.categoryName} budget for ${month}?`)) return;
    try { await api.delete(`/budgets/${b.id}`); load(); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField type="month" size="small" label="Month" value={month} InputLabelProps={{ shrink: true }}
          onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={openNew} disabled={available.length === 0}>Add budget</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {overview?.alerts.map((a) => <Alert key={a} severity="warning" sx={{ mb: 1 }}>{a}</Alert>)}

      {overview && (
        <Grid container spacing={2} sx={{ mb: 2, mt: 0 }}>
          {[['Allocated', overview.totalAllocated], ['Spent', overview.totalSpent], ['Remaining', overview.totalRemaining]].map(([label, value]) => (
            <Grid item xs={12} sm={4} key={label as string}>
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="body2" color="text.secondary">{label as string}</Typography>
                <Typography variant="h5" fontWeight={700}>{formatMoney(value as number)}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack spacing={1.5}>
        {overview?.items.map((b) => {
          const s = STATUS[b.status];
          return (
            <Paper key={b.id} sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography fontWeight={600} sx={{ flexGrow: 1 }}>{b.categoryName}</Typography>
                <Chip size="small" label={s.label} color={s.color} />
                <IconButton size="small" aria-label={`Edit ${b.categoryName} budget`} onClick={() => openEdit(b)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" aria-label={`Delete ${b.categoryName} budget`} onClick={() => remove(b)}><DeleteIcon fontSize="small" /></IconButton>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(b.utilizationPercent, 100)} color={s.color}
                aria-label={`${b.categoryName} budget used`} sx={{ height: 8, borderRadius: 4 }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">{formatMoney(b.spent)} of {formatMoney(b.amount)} ({b.utilizationPercent}%)</Typography>
                <Typography variant="body2" color={b.remaining < 0 ? 'error.main' : 'text.secondary'}>
                  {b.remaining < 0 ? `${formatMoney(-b.remaining)} over` : `${formatMoney(b.remaining)} left`}
                </Typography>
              </Stack>
            </Paper>
          );
        })}
        {overview?.items.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No budgets for this month. Add one to set a spending limit for a category.</Typography></Paper>
        )}
      </Stack>

      {history.some((h) => h.allocated > 0) && (
        <Paper sx={{ p: 2.5, mt: 2 }}>
          <Typography variant="h6" gutterBottom>Budget history</Typography>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={70} />
                <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
                <Bar dataKey="allocated" name="Allocated" fill="#0f6b5c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Spent" fill="#b4572a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit(save)} noValidate>
          <DialogTitle>{editing ? `Edit ${editing.categoryName} budget` : `Add budget for ${month}`}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!editing && (
                <TextField select label="Category" value={watch('categoryId') ?? ''} {...register('categoryId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                  error={!!errors.categoryId} helperText={errors.categoryId?.message}>
                  {available.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              )}
              <TextField label="Monthly limit" type="number" inputProps={{ step: '0.01', min: 0 }} {...register('amount', { valueAsNumber: true })}
                error={!!errors.amount} helperText={errors.amount?.message} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={isSubmitting}>Save budget</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
