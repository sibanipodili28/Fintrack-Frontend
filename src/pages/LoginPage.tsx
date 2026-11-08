import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import AuthShell from '../components/AuthShell';
import { login } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector((s) => s.auth);
  const location = useLocation();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={(location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'} replace />;

  return (
    <AuthShell title="Log in" subtitle="Welcome back. Pick up where you left off.">
      <form onSubmit={handleSubmit((v) => dispatch(login(v)))} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <TextField label="Password" type="password" autoComplete="current-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
          <Button type="submit" variant="contained" size="large" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</Button>
          <Typography variant="body2" color="text.secondary">
            New to FinTrack? <Link component={RouterLink} to="/register">Create an account</Link>
          </Typography>
        </Stack>
      </form>
    </AuthShell>
  );
}
