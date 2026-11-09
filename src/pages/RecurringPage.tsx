import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api, { errorMessage } from '../services/api';
import { notifyNotificationsChanged } from '../utils/events';
import type { Account, Category, Recurring, RecurringExecution, RecurringStatus } from '../types';
import { formatMoney, today } from '../utils/format';

const STATUS_COLOR: Record<RecurringStatus, 'success' | 'warning' | 'default'> = { ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'default', ENDED: 'default' };

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  accountId: z.number({ invalid_type_error: 'Choose an account' }),
  categoryId: z.number({ invalid_type_error: 'Choose a category' }),
  amount: z.number({ invalid_type_error: 'Enter an amount' }).min(0.01, 'Must be at least 0.01'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  startDate: z.string().min(1, 'Choose a start date'),
  endDate: z.string().optional(),
  description: z.string().max(255).optional(),
});
type Form = z.infer<typeof schema>;

export default function RecurringPage() {
  const [rules, setRules] = useState<Recurring[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [historyRule, setHistoryRule] = useState<Recurring | null>(null);
  const [history, setHistory] = useState<RecurringExecution[]>([]);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { type: 'EXPENSE', frequency: 'MONTHLY', startDate: today() } });
  const type = form.watch('type');
  const { errors } = form.formState;

  const load = useCallback(() => {
    api.get<Recurring[]>('/recurring').then((r) => setRules(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api.get<Account[]>('/accounts').then((r) => setAccounts(r.data.filter((a) => a.active))).catch((e) => setError(errorMessage(e)));
    api.get<Category[]>('/categories').then((r) => setCategories(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  const create = async (v: Form) => {
    try {
      await api.post('/recurring', { ...v, endDate: v.endDate || null });
      setOpen(false); setError(null); load();
    } catch (e) { setError(errorMessage(e)); setOpen(false); }
  };
  const act = async (r: Recurring, action: 'pause' | 'resume' | 'cancel') => {
    if (action === 'cancel' && !window.confirm('Cancel this rule? It will never run again.')) return;
    try { await api.post(`/recurring/${r.id}/${action}`); setError(null); load(); } catch (e) { setError(errorMessage(e)); }
  };
  const runNow = async () => {
    try {
      const { data } = await api.post<{ executed: number; failed: number }>('/recurring/run-due');
      setInfo(`${data.executed} posted, ${data.failed} failed.`); setError(null); load(); notifyNotificationsChanged();
    } catch (e) { setError(errorMessage(e)); }
  };
  const showHistory = async (r: Recurring) => {
    setHistoryRule(r); setHistory([]);
    try { setHistory((await api.get<RecurringExecution[]>(`/recurring/${r.id}/history`)).data); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <Typography color="text.secondary" sx={{ flexGrow: 1 }}>Rules post automatically every night at 00:05 server time. Use "Run due now" to post today's items right away.</Typography>
        <Button variant="outlined" onClick={runNow}>Run due now</Button>
        <Button variant="contained" onClick={() => { form.reset({ type: 'EXPENSE', frequency: 'MONTHLY', startDate: today(), accountId: accounts[0]?.id, categoryId: undefined, amount: undefined, endDate: '', description: '' }); setOpen(true); }} disabled={accounts.length === 0}>Add rule</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Account</TableCell><TableCell>Repeats</TableCell><TableCell>Next run</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {rules?.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.description || r.categoryName}</TableCell>
                <TableCell>{r.accountName}</TableCell>
                <TableCell>{r.frequency.charAt(0) + r.frequency.slice(1).toLowerCase()}</TableCell>
                <TableCell>{r.status === 'ACTIVE' || r.status === 'PAUSED' ? r.nextExecutionDate : '—'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: r.type === 'INCOME' ? 'success.main' : 'error.main' }}>{r.type === 'INCOME' ? '+' : '-'}{formatMoney(r.amount)}</TableCell>
                <TableCell><Chip size="small" label={r.status.charAt(0) + r.status.slice(1).toLowerCase()} color={STATUS_COLOR[r.status]} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {r.status === 'ACTIVE' && <Button size="small" onClick={() => act(r, 'pause')}>Pause</Button>}
                  {r.status === 'PAUSED' && <Button size="small" onClick={() => act(r, 'resume')}>Resume</Button>}
                  {(r.status === 'ACTIVE' || r.status === 'PAUSED') && <Button size="small" color="error" onClick={() => act(r, 'cancel')}>Cancel</Button>}
                  <Button size="small" onClick={() => showHistory(r)}>History</Button>
                </TableCell>
              </TableRow>
            ))}
            {rules?.length === 0 && <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No recurring rules. Add one for rent, salary or subscriptions.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={form.handleSubmit(create)} noValidate>
          <DialogTitle>Add recurring rule</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Type" value={type} {...form.register('type', { onChange: () => form.setValue('categoryId', undefined as unknown as number) })}>
                <MenuItem value="EXPENSE">Expense</MenuItem><MenuItem value="INCOME">Income</MenuItem>
              </TextField>
              <TextField select label="Account" value={form.watch('accountId') ?? ''} {...form.register('accountId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} error={!!errors.accountId} helperText={errors.accountId?.message}>
                {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <TextField select label="Category" value={form.watch('categoryId') ?? ''} {...form.register('categoryId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} error={!!errors.categoryId} helperText={errors.categoryId?.message}>
                {categories.filter((c) => c.type === type).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ step: '0.01', min: 0 }} {...form.register('amount', { valueAsNumber: true })} error={!!errors.amount} helperText={errors.amount?.message} />
              <TextField select label="Repeats" value={form.watch('frequency')} {...form.register('frequency')}>
                <MenuItem value="DAILY">Daily</MenuItem><MenuItem value="WEEKLY">Weekly</MenuItem><MenuItem value="MONTHLY">Monthly</MenuItem>
              </TextField>
              <TextField label="Start date" type="date" InputLabelProps={{ shrink: true }} inputProps={{ min: today() }} {...form.register('startDate')} error={!!errors.startDate} helperText={errors.startDate?.message} />
              <TextField label="End date (optional)" type="date" InputLabelProps={{ shrink: true }} {...form.register('endDate')} />
              <TextField label="Name, for example Rent" {...form.register('description')} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={form.formState.isSubmitting}>Save rule</Button></DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!historyRule} onClose={() => setHistoryRule(null)} fullWidth maxWidth="xs">
        <DialogTitle>{historyRule?.description || historyRule?.categoryName}: runs</DialogTitle>
        <DialogContent>
          {history.length === 0 ? <Typography color="text.secondary">Nothing has run yet.</Typography> : (
            <List dense>
              {history.map((h) => (
                <ListItem key={h.id} disableGutters secondaryAction={<Chip size="small" label={h.status === 'SUCCESS' ? 'Posted' : 'Failed'} color={h.status === 'SUCCESS' ? 'success' : 'error'} />}>
                  <ListItemText primary={h.scheduledDate} secondary={h.message} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoryRule(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
