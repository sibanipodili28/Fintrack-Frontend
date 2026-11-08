import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api, { errorMessage } from '../services/api';
import type { Account, AccountType } from '../types';
import { accountTypeLabel, formatMoney } from '../utils/format';

const TYPES: AccountType[] = ['SAVINGS', 'CURRENT', 'CASH_WALLET', 'DIGITAL_WALLET', 'CREDIT_CARD'];
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(100),
  type: z.enum(['SAVINGS', 'CURRENT', 'CASH_WALLET', 'DIGITAL_WALLET', 'CREDIT_CARD']),
  initialBalance: z.number({ invalid_type_error: 'Enter an amount' }).min(0, 'Cannot be negative'),
});
type Form = z.infer<typeof schema>;

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema), defaultValues: { type: 'SAVINGS', initialBalance: 0 } });
  const type = watch('type');

  const load = useCallback(() => {
    api.get<Account[]>('/accounts').then((r) => setAccounts(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const create = async (v: Form) => {
    try { await api.post('/accounts', v); setOpen(false); reset(); setError(null); load(); } catch (e) { setError(errorMessage(e)); }
  };
  const deactivate = async (a: Account) => {
    try { await api.delete(`/accounts/${a.id}`); load(); } catch (e) { setError(errorMessage(e)); }
  };
  const reactivate = async (a: Account) => {
    try { await api.put(`/accounts/${a.id}`, { name: a.name, active: true }); load(); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography color="text.secondary">Inactive accounts keep their history but cannot take new transactions.</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Add account</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell align="right">Balance</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {accounts?.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.name}</TableCell>
                <TableCell>{accountTypeLabel(a.type)}</TableCell>
                <TableCell align="right">{formatMoney(a.currentBalance, a.currency)}{a.type === 'CREDIT_CARD' ? ' owed' : ''}</TableCell>
                <TableCell><Chip size="small" label={a.active ? 'Active' : 'Inactive'} color={a.active ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  {a.active ? <Button size="small" color="error" onClick={() => deactivate(a)}>Deactivate</Button>
                            : <Button size="small" onClick={() => reactivate(a)}>Reactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
            {accounts?.length === 0 && <TableRow><TableCell colSpan={5}><Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No accounts yet. Add one to start recording money.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit(create)} noValidate>
          <DialogTitle>Add account</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Account name" {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
              <TextField select label="Type" value={type} {...register('type')} inputProps={{ 'data-testid': 'type' }}>
                {TYPES.map((t) => <MenuItem key={t} value={t}>{accountTypeLabel(t)}</MenuItem>)}
              </TextField>
              <TextField label={type === 'CREDIT_CARD' ? 'Amount already owed' : 'Opening balance'} type="number" inputProps={{ step: '0.01', min: 0 }}
                {...register('initialBalance', { valueAsNumber: true })} error={!!errors.initialBalance} helperText={errors.initialBalance?.message} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={isSubmitting}>Create account</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
