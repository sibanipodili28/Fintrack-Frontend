import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { z } from 'zod';
import AuthShell from '../components/AuthShell';
import { register as registerUser } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector((s) => s.auth);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/" replace />;

  return (
    <AuthShell title="Create your account" subtitle="Track accounts, spending and transfers in one place.">
      <form onSubmit={handleSubmit((v) => dispatch(registerUser(v)))} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Full name" autoComplete="name" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} />
          <TextField label="Email" type="email" autoComplete="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <TextField label="Password" type="password" autoComplete="new-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
          <Button type="submit" variant="contained" size="large" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
          <Typography variant="body2" color="text.secondary">
            Already registered? <Link component={RouterLink} to="/login">Log in</Link>
          </Typography>
        </Stack>
      </form>
    </AuthShell>
  );
}
