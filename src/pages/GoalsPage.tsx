import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, List, ListItem,
  ListItemText, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api, { errorMessage } from '../services/api';
import type { Contribution, Goal } from '../types';
import { formatMoney } from '../utils/format';

const goalSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(100),
  targetAmount: z.number({ invalid_type_error: 'Enter an amount' }).min(0.01, 'Must be at least 0.01'),
  targetDate: z.string().optional(),
});
type GoalForm = z.infer<typeof goalSchema>;
const contribSchema = z.object({
  amount: z.number({ invalid_type_error: 'Enter an amount' }).min(0.01, 'Must be at least 0.01'),
  note: z.string().max(255).optional(),
});
type ContribForm = z.infer<typeof contribSchema>;

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);
  const [history, setHistory] = useState<Contribution[]>([]);
  const goalForm = useForm<GoalForm>({ resolver: zodResolver(goalSchema) });
  const contribForm = useForm<ContribForm>({ resolver: zodResolver(contribSchema) });

  const load = useCallback(() => {
    api.get<Goal[]>('/goals').then((r) => setGoals(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const createGoal = async (v: GoalForm) => {
    try {
      await api.post('/goals', { name: v.name, targetAmount: v.targetAmount, targetDate: v.targetDate || null });
      setCreateOpen(false); goalForm.reset(); setError(null); load();
    } catch (e) { setError(errorMessage(e)); setCreateOpen(false); }
  };
  const contribute = async (v: ContribForm) => {
    if (!contribGoal) return;
    try {
      await api.post(`/goals/${contribGoal.id}/contributions`, { amount: v.amount, note: v.note || null });
      setContribGoal(null); contribForm.reset(); setError(null); load();
    } catch (e) { setError(errorMessage(e)); setContribGoal(null); }
  };
  const complete = async (g: Goal) => {
    if (!window.confirm(`Mark "${g.name}" as completed? You can't add more to it afterwards.`)) return;
    try { await api.post(`/goals/${g.id}/complete`); load(); } catch (e) { setError(errorMessage(e)); }
  };
  const openHistory = async (g: Goal) => {
    setHistoryGoal(g);
    try { setHistory((await api.get<Contribution[]>(`/goals/${g.id}/contributions`)).data); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} spacing={2}>
        <Typography color="text.secondary">Contributions set aside money you already have. They don't change your account balances.</Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>New goal</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={2}>
        {goals?.map((g) => (
          <Grid item xs={12} md={6} key={g.id}>
            <Paper sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{g.name}</Typography>
                {g.status === 'COMPLETED' && <Chip size="small" color="success" label="Completed" />}
                {g.overdue && <Chip size="small" color="error" label="Overdue" />}
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(g.progressPercent, 100)} color={g.status === 'COMPLETED' ? 'success' : 'primary'}
                aria-label={`${g.name} progress`} sx={{ height: 8, borderRadius: 4 }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="body2">{formatMoney(g.savedAmount)} of {formatMoney(g.targetAmount)} ({g.progressPercent}%)</Typography>
                <Typography variant="body2" color="text.secondary">{formatMoney(g.remainingAmount)} to go</Typography>
              </Stack>
              {g.targetDate && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Target date: {g.targetDate}</Typography>}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {g.status === 'ACTIVE' && <Button size="small" variant="contained" onClick={() => { contribForm.reset(); setContribGoal(g); }}>Add money</Button>}
                {g.status === 'ACTIVE' && <Button size="small" onClick={() => complete(g)}>Mark complete</Button>}
                <Button size="small" onClick={() => openHistory(g)}>History</Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
        {goals?.length === 0 && (
          <Grid item xs={12}><Paper sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No goals yet. Create one, such as an emergency fund or a laptop.</Typography></Paper></Grid>
        )}
      </Grid>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={goalForm.handleSubmit(createGoal)} noValidate>
          <DialogTitle>New savings goal</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Goal name" {...goalForm.register('name')} error={!!goalForm.formState.errors.name} helperText={goalForm.formState.errors.name?.message} />
              <TextField label="Target amount" type="number" inputProps={{ step: '0.01', min: 0 }} {...goalForm.register('targetAmount', { valueAsNumber: true })}
                error={!!goalForm.formState.errors.targetAmount} helperText={goalForm.formState.errors.targetAmount?.message} />
              <TextField label="Target date (optional)" type="date" InputLabelProps={{ shrink: true }} {...goalForm.register('targetDate')} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create goal</Button></DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!contribGoal} onClose={() => setContribGoal(null)} fullWidth maxWidth="xs">
        <form onSubmit={contribForm.handleSubmit(contribute)} noValidate>
          <DialogTitle>Add money to {contribGoal?.name}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Up to {contribGoal && formatMoney(contribGoal.remainingAmount)} is still needed.</Typography>
              <TextField label="Amount" type="number" inputProps={{ step: '0.01', min: 0 }} {...contribForm.register('amount', { valueAsNumber: true })}
                error={!!contribForm.formState.errors.amount} helperText={contribForm.formState.errors.amount?.message} />
              <TextField label="Note (optional)" {...contribForm.register('note')} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setContribGoal(null)}>Cancel</Button><Button type="submit" variant="contained">Add money</Button></DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!historyGoal} onClose={() => setHistoryGoal(null)} fullWidth maxWidth="xs">
        <DialogTitle>{historyGoal?.name}: contributions</DialogTitle>
        <DialogContent>
          {history.length === 0 ? <Typography color="text.secondary">No contributions yet.</Typography> : (
            <List dense>
              {history.map((c) => (
                <ListItem key={c.id} disableGutters secondaryAction={<Typography fontWeight={600}>{formatMoney(c.amount)}</Typography>}>
                  <ListItemText primary={c.date} secondary={c.note} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoryGoal(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
