import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import WalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import SwapIcon from '@mui/icons-material/SwapHorizOutlined';
import { logout } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const DRAWER = 232;
const NAV = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/transactions', label: 'Transactions', icon: <ReceiptIcon /> },
  { to: '/accounts', label: 'Accounts', icon: <WalletIcon /> },
  { to: '/transfers', label: 'Transfers', icon: <SwapIcon /> },
];

export default function MainLayout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'FinTrack';

  const nav = (
    <Box role="navigation" aria-label="Main">
      <Toolbar><Typography variant="h6" color="primary">FinTrack</Typography></Toolbar>
      <Divider />
      <List sx={{ px: 1, pt: 1 }}>
        {NAV.map((n) => (
          <ListItemButton key={n.to} component={NavLink} to={n.to} end={n.end} onClick={() => setOpen(false)}
            sx={{ borderRadius: 2, mb: 0.5, '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } } }}>
            <ListItemIcon sx={{ minWidth: 38 }}>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  const signOut = async () => { setAnchor(null); await dispatch(logout()); navigate('/login'); };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" color="inherit" elevation={0}
        sx={{ width: { md: `calc(100% - ${DRAWER}px)` }, ml: { md: `${DRAWER}px` }, borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          {!desktop && <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open menu" sx={{ mr: 1 }}><MenuIcon /></IconButton>}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{user?.fullName.charAt(0).toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem disabled>{user?.email}</MenuItem>
            <MenuItem onClick={signOut}>Log out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || open} onClose={() => setOpen(false)}
        sx={{ width: DRAWER, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER, boxSizing: 'border-box' } }}>
        {nav}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
