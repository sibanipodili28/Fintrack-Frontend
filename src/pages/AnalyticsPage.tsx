import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Box, CircularProgress, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { errorMessage } from '../services/api';
import type { AnalyticsOverview, BudgetOverview, YearComparison } from '../types';
import { formatMoney } from '../utils/format';

const COLORS = ['#0f6b5c', '#b4572a', '#3d7ea6', '#8a6d3b', '#6b5b95', '#c0392b', '#2e7d4f', '#7f8c8d'];
const PRESETS = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: 'year', label: 'This year' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function rangeFor(preset: string): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const from = preset === 'year' ? new Date(now.getFullYear(), 0, 1) : new Date(now.getFullYear(), now.getMonth() - (Number(preset) - 1), 1);
  return { from: iso(from), to: iso(to) };
}

function ChartCard({ title, empty, children }: { title: string; empty?: boolean; children: ReactNode }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      {empty ? <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No data for this period.</Typography>
        : <Box sx={{ height: 280 }}><ResponsiveContainer>{children as React.ReactElement}</ResponsiveContainer></Box>}
    </Paper>
  );
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState('6');
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [budgets, setBudgets] = useState<BudgetOverview | null>(null);
  const [yearly, setYearly] = useState<YearComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.get<AnalyticsOverview>('/analytics/overview', { params: rangeFor(preset) })
      .then((r) => { if (!cancelled) setData(r.data); }).catch((e) => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [preset]);

  useEffect(() => {
    api.get<BudgetOverview>('/budgets').then((r) => setBudgets(r.data)).catch(() => setBudgets(null));
    api.get<YearComparison>('/analytics/yearly-comparison').then((r) => setYearly(r.data)).catch(() => setYearly(null));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;

  const assets = data.accountBalances.filter((a) => !a.creditCard && a.balance > 0);
  const cards = data.accountBalances.filter((a) => a.creditCard);
  const hasMonthly = data.monthly.some((m) => m.income > 0 || m.expense > 0);
  const hasYearly = !!yearly && yearly.months.some((m) => m.current > 0 || m.previous > 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">{data.from} to {data.to}</Typography>
        <TextField select size="small" label="Period" value={preset} onChange={(e) => setPreset(e.target.value)} sx={{ minWidth: 180 }}>
          {PRESETS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
        </TextField>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Income vs expenses" empty={!hasMonthly}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={70} />
              <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
              <Bar dataKey="income" name="Income" fill="#2e7d4f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#b4572a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Monthly expense trend" empty={!hasMonthly}>
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={70} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Line type="monotone" dataKey="expense" name="Expenses" stroke="#b4572a" strokeWidth={2} dot />
            </LineChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Monthly savings trend" empty={!hasMonthly}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={70} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="savings" name="Savings" radius={[4, 4, 0, 0]}>
                {data.monthly.map((m, i) => <Cell key={i} fill={m.savings >= 0 ? '#0f6b5c' : '#c0392b'} />)}
              </Bar>
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Category-wise expenses" empty={data.expenseByCategory.length === 0}>
            <PieChart>
              <Pie data={data.expenseByCategory} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={95}>
                {data.expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
            </PieChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Account balance distribution" empty={assets.length === 0}>
            <PieChart>
              <Pie data={assets} dataKey="balance" nameKey="name" innerRadius={55} outerRadius={95}>
                {assets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
            </PieChart>
          </ChartCard>
          {cards.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Not in the chart (money owed): {cards.map((c) => `${c.name} ${formatMoney(c.balance)}`).join(', ')}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Budget utilization (this month)" empty={!budgets || budgets.items.length === 0}>
            <BarChart data={budgets?.items ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, (max: number) => Math.max(100, Math.ceil(max))]} unit="%" />
              <YAxis type="category" dataKey="categoryName" width={90} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="utilizationPercent" name="Used" radius={[0, 4, 4, 0]}>
                {(budgets?.items ?? []).map((b, i) => <Cell key={i} fill={b.status === 'EXCEEDED' ? '#c0392b' : b.status === 'ON_TRACK' ? '#2e7d4f' : '#d98e04'} />)}
              </Bar>
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid item xs={12}>
          <ChartCard title={`Yearly expense comparison (${yearly?.year ?? ''} vs ${yearly?.previousYear ?? ''})`} empty={!hasYearly}>
            <LineChart data={yearly?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis width={70} />
              <Tooltip formatter={(v: number) => formatMoney(v)} /><Legend />
              <Line type="monotone" dataKey="current" name={String(yearly?.year ?? 'This year')} stroke="#0f6b5c" strokeWidth={2} />
              <Line type="monotone" dataKey="previous" name={String(yearly?.previousYear ?? 'Last year')} stroke="#8a6d3b" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
