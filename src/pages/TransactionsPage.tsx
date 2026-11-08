import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api, { errorMessage } from '../services/api';
import type { Account, Category, PageResponse, Transaction, TransactionType } from '../types';
import { formatMoney, today } from '../utils/format';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  accountId: z.number({ invalid_type_error: 'Choose an account' }),
  categoryId: z.number({ invalid_type_error: 'Choose a category' }),
  amount: z.number({ invalid_type_error: 'Enter an amount' }).min(0.01, 'Must be at least 0.01'),
  date: z.string().min(1, 'Choose a date'),
  description: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});
type Form = z.infer<typeof schema>;

export default function TransactionsPage() {
  const [rows, setRows] = useState<PageResponse<Transaction> | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [type, setType] = useState<'' | TransactionType>('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { type: 'EXPENSE', date: today() } });
  const formType = form.watch('type');

  useEffect(() => {
    api.get<Account[]>('/accounts').then((r) => setAccounts(r.data)).catch((e) => setError(errorMessage(e)));
    api.get<Category[]>('/categories').then((r) => setCategories(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(() => {
    api.get<PageResponse<Transaction>>('/transactions', {
      params: { page, size, type: type || undefined, accountId: accountId || undefined, search: debounced || undefined },
    }).then((r) => setRows(r.data)).catch((e) => setError(errorMessage(e)));
  }, [page, size, type, accountId, debounced]);
  useEffect(load, [load]);

  const openNew = () => {
    setEditing(null);
    form.reset({ type: 'EXPENSE', date: today(), accountId: accounts.find((a) => a.active)?.id, categoryId: undefined, amount: undefined, description: '', notes: '' });
    setOpen(true);
  };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    form.reset({ type: t.type, accountId: t.accountId, categoryId: t.categoryId, amount: t.amount, date: t.date, description: t.description ?? '', notes: t.notes ?? '' });
    setOpen(true);
  };
  const save = async (v: Form) => {
    try {
      if (editing) await api.put(`/transactions/${editing.id}`, v); else await api.post('/transactions', v);
      setOpen(false); setError(null); load();
    } catch (e) { setError(errorMessage(e)); setOpen(false); }
  };
  const remove = async (t: Transaction) => {
    if (!window.confirm('Delete this transaction? The account balance will be adjusted.')) return;
    try { await api.delete(`/transactions/${t.id}`); load(); } catch (e) { setError(errorMessage(e)); }
  };

  const { errors } = form.formState;
  const usable = accounts.filter((a) => a.active || a.id === editing?.accountId);

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
        <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
        <TextField select size="small" label="Type" value={type} onChange={(e) => { setType(e.target.value as '' | TransactionType); setPage(0); }} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem><MenuItem value="INCOME">Income</MenuItem><MenuItem value="EXPENSE">Expense</MenuItem>
        </TextField>
        <TextField select size="small" label="Account" value={accountId} onChange={(e) => { setAccountId(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }} sx={{ minWidth: 180 }}>
          <MenuItem value="">All</MenuItem>
          {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={openNew} disabled={usable.length === 0}>Add transaction</Button>
      </Stack>
      {accounts.length > 0 && usable.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>All your accounts are inactive. Reactivate one to add transactions.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Description</TableCell><TableCell>Category</TableCell><TableCell>Account</TableCell><TableCell align="right">Amount</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rows?.content.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.description || '—'}</TableCell>
                <TableCell><Chip size="small" label={t.categoryName} /></TableCell>
                <TableCell>{t.accountName}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: t.type === 'INCOME' ? 'success.main' : 'error.main' }}>{t.type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label="Edit transaction" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" aria-label="Delete transaction" onClick={() => remove(t)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows?.content.length === 0 && <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No transactions match. Add one or clear the filters.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination component="div" count={rows?.totalElements ?? 0} page={page} rowsPerPage={size} rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={form.handleSubmit(save)} noValidate>
          <DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Type" value={formType} {...form.register('type', { onChange: () => form.setValue('categoryId', undefined as unknown as number) })}>
                <MenuItem value="EXPENSE">Expense</MenuItem><MenuItem value="INCOME">Income</MenuItem>
              </TextField>
              <TextField select label="Account" value={form.watch('accountId') ?? ''} {...form.register('accountId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} error={!!errors.accountId} helperText={errors.accountId?.message}>
                {usable.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <TextField select label="Category" value={form.watch('categoryId') ?? ''} {...form.register('categoryId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} error={!!errors.categoryId} helperText={errors.categoryId?.message}>
                {categories.filter((c) => c.type === formType).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ step: '0.01', min: 0 }} {...form.register('amount', { valueAsNumber: true })} error={!!errors.amount} helperText={errors.amount?.message} />
              <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} {...form.register('date')} error={!!errors.date} helperText={errors.date?.message} />
              <TextField label="Description" {...form.register('description')} />
              <TextField label="Notes" multiline minRows={2} {...form.register('notes')} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={form.formState.isSubmitting}>Save transaction</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
