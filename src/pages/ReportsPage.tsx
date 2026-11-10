import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import api, { errorMessage } from '../services/api';
import type { Account, ReportData, ReportFormat, ReportType } from '../types';

const TYPES: { value: ReportType; label: string }[] = [
  { value: 'monthly', label: 'Monthly income and expenses' },
  { value: 'yearly', label: 'Yearly financial summary' },
  { value: 'category', label: 'Category-wise spending' },
  { value: 'account-statement', label: 'Account statement' },
  { value: 'budget', label: 'Budget utilization' },
  { value: 'savings', label: 'Savings progress' },
];

const nowMonth = () => new Date().toISOString().slice(0, 7);
const monthStart = () => `${nowMonth()}-01`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const num = (v: string | number | null) => (typeof v === 'number' ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : v ?? '');

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('monthly');
  const [month, setMonth] = useState(nowMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Account[]>('/accounts').then((r) => setAccounts(r.data)).catch(() => setAccounts([]));
  }, []);

  const params = () => {
    switch (type) {
      case 'monthly': case 'budget': return { month };
      case 'yearly': return { year };
      case 'category': return { from, to };
      case 'account-statement': return { accountId, from, to };
      default: return {};
    }
  };
  const missing = type === 'account-statement' && !accountId;

  const generate = async () => {
    setLoading(true); setError(null);
    try { setReport((await api.get<ReportData>(`/reports/${type}`, { params: params() })).data); }
    catch (e) { setReport(null); setError(errorMessage(e)); }
    finally { setLoading(false); }
  };

  const download = async (format: ReportFormat) => {
    setError(null);
    try {
      const res = await api.get<Blob>(`/reports/${type}`, { params: { ...params(), format }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintrack-${type}-${todayIso()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // Error bodies arrive as Blob when responseType is blob, so read the message out of it.
      const data = (e as { response?: { data?: Blob } }).response?.data;
      if (data instanceof Blob) {
        try { setError((JSON.parse(await data.text()) as { message?: string }).message ?? 'Download failed'); } catch { setError('Download failed'); }
      } else setError(errorMessage(e));
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Report" value={type} onChange={(e) => { setType(e.target.value as ReportType); setReport(null); }} sx={{ minWidth: 260 }}>
            {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          {(type === 'monthly' || type === 'budget') && <TextField size="small" type="month" label="Month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />}
          {type === 'yearly' && <TextField size="small" type="number" label="Year" value={year} onChange={(e) => setYear(e.target.value)} inputProps={{ min: 2001, max: 2100 }} sx={{ width: 120 }} />}
          {type === 'account-statement' && (
            <TextField select size="small" label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)} sx={{ minWidth: 200 }}>
              {accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}{a.active ? '' : ' (inactive)'}</MenuItem>)}
            </TextField>
          )}
          {(type === 'category' || type === 'account-statement') && (
            <>
              <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            </>
          )}
          <Button variant="contained" onClick={generate} disabled={loading || missing}>Generate report</Button>
        </Stack>
        {missing && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Choose an account first.</Typography>}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}

      {report && !loading && (
        <Paper sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">{report.title}</Typography>
              {report.subtitle && <Typography variant="body2" color="text.secondary">{report.subtitle}</Typography>}
            </Box>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Button size="small" variant="outlined" onClick={() => download('csv')}>CSV</Button>
              <Button size="small" variant="outlined" onClick={() => download('xlsx')}>Excel</Button>
              <Button size="small" variant="outlined" onClick={() => download('pdf')}>PDF</Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {report.summary.map((s) => (
              <Box key={s.label}><Typography variant="body2" color="text.secondary">{s.label}</Typography><Typography fontWeight={700}>{num(s.value)}</Typography></Box>
            ))}
          </Stack>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow>{report.columns.map((c, i) => <TableCell key={c} align={i > 0 && typeof report.rows[0]?.[i] === 'number' ? 'right' : 'left'}>{c}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {report.rows.map((row, r) => (
                  <TableRow key={r} hover>{row.map((cell, c) => <TableCell key={c} align={typeof cell === 'number' ? 'right' : 'left'}>{num(cell)}</TableCell>)}</TableRow>
                ))}
                {report.rows.length === 0 && <TableRow><TableCell colSpan={report.columns.length}><Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No data for these filters.</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
