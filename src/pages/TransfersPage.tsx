import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api, { errorMessage } from '../services/api';
import type { Account, Transfer } from '../types';
import { formatMoney } from '../utils/format';

const schema = z.object({
  fromAccountId: z.number({ invalid_type_error: 'Choose a source account' }),
  toAccountId: z.number({ invalid_type_error: 'Choose a destination account' }),
  amount: z.number({ invalid_type_error: 'Enter an amount' }).min(0.01, 'Must be at least 0.01'),
  description: z.string().max(255).optional(),
}).refine((v) => v.fromAccountId !== v.toAccountId, { path: ['toAccountId'], message: 'Choose a different account' });
type Form = z.infer<typeof schema>;

export default function TransfersPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // One key per form attempt: a double click or retry cannot move the money twice.
  const idemKey = useRef(crypto.randomUUID());
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const load = useCallback(() => {
    api.get<Account[]>('/accounts').then((r) => setAccounts(r.data.filter((a) => a.active))).catch((e) => setError(errorMessage(e)));
    api.get<Transfer[]>('/transfers').then((r) => setTransfers(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const submit = async (v: Form) => {
    setError(null); setDone(null);
    try {
      await api.post('/transfers', v, { headers: { 'Idempotency-Key': idemKey.current } });
      idemKey.current = crypto.randomUUID();
      setDone('Transfer completed.');
      reset({ description: '' });
      load();
    } catch (e) { setError(errorMessage(e)); }
  };
  const num = { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>New transfer</Typography>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {done && <Alert severity="success">{done}</Alert>}
              <TextField select label="From" value={watch('fromAccountId') ?? ''} {...register('fromAccountId', num)} error={!!errors.fromAccountId} helperText={errors.fromAccountId?.message}>
                {accounts.filter((a) => a.type !== 'CREDIT_CARD').map((a) => <MenuItem key={a.id} value={a.id}>{a.name} ({formatMoney(a.currentBalance, a.currency)})</MenuItem>)}
              </TextField>
              <TextField select label="To" value={watch('toAccountId') ?? ''} {...register('toAccountId', num)} error={!!errors.toAccountId} helperText={errors.toAccountId?.message}>
                {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}{a.type === 'CREDIT_CARD' ? ' (pays down balance)' : ''}</MenuItem>)}
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ step: '0.01', min: 0 }} {...register('amount', { valueAsNumber: true })} error={!!errors.amount} helperText={errors.amount?.message} />
              <TextField label="Description" {...register('description')} />
              <Button type="submit" variant="contained" disabled={isSubmitting || accounts.length < 2}>Transfer money</Button>
              {accounts.length < 2 && <Typography variant="body2" color="text.secondary">You need at least two active accounts to transfer.</Typography>}
            </Stack>
          </form>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper sx={{ overflowX: 'auto' }}>
          <Box sx={{ p: 2.5, pb: 1 }}><Typography variant="h6">Transfer history</Typography></Box>
          <Table size="small">
            <TableHead><TableRow><TableCell>Date</TableCell><TableCell>From</TableCell><TableCell>To</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
            <TableBody>
              {transfers?.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.createdAt.slice(0, 10)}</TableCell><TableCell>{t.fromAccountName}</TableCell><TableCell>{t.toAccountName}</TableCell>
                  <TableCell align="right">{formatMoney(t.amount)}</TableCell>
                </TableRow>
              ))}
              {transfers?.length === 0 && <TableRow><TableCell colSpan={4}><Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No transfers yet.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
}
