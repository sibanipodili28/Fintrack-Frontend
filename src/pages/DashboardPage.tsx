import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Grid, List, ListItem, ListItemText, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../services/api';
import type { DashboardRange, DashboardSummary } from '../types';
import { formatMoney } from '../utils/format';

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: 'CURRENT_MONTH', label: 'This month' },
  { value: 'PREVIOUS_MONTH', label: 'Last month' },
  { value: 'LAST_3_MONTHS', label: 'Last 3 months' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 months' },
  { value: 'CURRENT_YEAR', label: 'This year' },
];
const COLORS = ['#0f6b5c', '#b4572a', '#3d7ea6', '#8a6d3b', '#6b5b95', '#c0392b', '#2e7d4f', '#7f8c8d'];

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: tone === 'good' ? 'success.main' : tone === 'bad' ? 'error.main' : 'text.primary' }}>{value}</Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('CURRENT_MONTH');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.get<DashboardSummary>('/dashboard/summary', { params: { range } })
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch((e) => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [range]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;

  const empty = data.accounts.length === 0;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">{data.from} to {data.to}</Typography>
        <TextField select size="small" label="Period" value={range} onChange={(e) => setRange(e.target.value as DashboardRange)} sx={{ minWidth: 180 }}>
          {RANGES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
      </Box>

      {empty && <Alert severity="info" sx={{ mb: 2 }}>Add your first account to start tracking. Go to Accounts and create one.</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}><Stat label="Total balance" value={formatMoney(data.totalBalance)} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Stat label="Income" value={formatMoney(data.income)} tone="good" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Stat label="Expenses" value={formatMoney(data.expense)} tone="bad" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Stat label={`Net savings (${data.savingsRate}% of income)`} value={formatMoney(data.netSavings)} tone={data.netSavings >= 0 ? 'good' : 'bad'} /></Grid>

        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>Income and expenses</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" /><YAxis width={70} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
                  <Bar dataKey="income" name="Income" fill="#2e7d4f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#b4572a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Spending by category</Typography>
            {data.expenseByCategory.length === 0 ? (
              <Typography color="text.secondary">No expenses in this period.</Typography>
            ) : (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.expenseByCategory} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={95}>
                      {data.expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6">Accounts</Typography>
            {data.accounts.length === 0 ? <Typography color="text.secondary">No accounts yet.</Typography> : (
              <List dense>
                {data.accounts.map((a) => (
                  <ListItem key={a.id} disableGutters secondaryAction={<Typography fontWeight={600}>{formatMoney(a.currentBalance, a.currency)}</Typography>}>
                    <ListItemText primary={a.name} secondary={a.active ? (a.type === 'CREDIT_CARD' ? 'Credit card (amount owed)' : undefined) : 'Inactive'} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6">Recent transactions</Typography>
            {data.recentTransactions.length === 0 ? <Typography color="text.secondary">Nothing recorded yet.</Typography> : (
              <List dense>
                {data.recentTransactions.map((t) => (
                  <ListItem key={t.id} disableGutters secondaryAction={
                    <Typography fontWeight={600} color={t.type === 'INCOME' ? 'success.main' : 'error.main'}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount)}
                    </Typography>}>
                    <ListItemText primary={t.description || t.categoryName} secondary={`${t.date} · ${t.accountName}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
