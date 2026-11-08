import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f6b5c' },
    secondary: { main: '#b4572a' },
    success: { main: '#2e7d4f' },
    error: { main: '#c0392b' },
    background: { default: '#f4f6f5', paper: '#ffffff' },
    text: { primary: '#16231f', secondary: '#55655f' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderColor: '#dfe6e3' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
