import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 420 }}>
        <Typography variant="h6" color="primary" sx={{ mb: 2 }}>FinTrack</Typography>
        <Typography variant="h4" component="h1" sx={{ fontSize: 26 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{subtitle}</Typography>
        {children}
      </Paper>
    </Box>
  );
}
