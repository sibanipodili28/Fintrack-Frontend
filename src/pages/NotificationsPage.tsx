import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, IconButton, List, ListItem, ListItemText, Paper, Stack, Switch, TablePagination, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api, { errorMessage } from '../services/api';
import { notifyNotificationsChanged } from '../utils/events';
import type { AppNotification, PageResponse } from '../types';

export default function NotificationsPage() {
  const [data, setData] = useState<PageResponse<AppNotification> | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<PageResponse<AppNotification>>('/notifications', { params: { unreadOnly, page, size } })
      .then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [unreadOnly, page, size]);
  useEffect(load, [load]);

  const changed = () => { load(); notifyNotificationsChanged(); };
  const markRead = async (n: AppNotification) => { if (n.read) return; try { await api.post(`/notifications/${n.id}/read`); changed(); } catch (e) { setError(errorMessage(e)); } };
  const markAll = async () => { try { await api.post('/notifications/read-all'); changed(); } catch (e) { setError(errorMessage(e)); } };
  const remove = async (n: AppNotification) => { try { await api.delete(`/notifications/${n.id}`); changed(); } catch (e) { setError(errorMessage(e)); } };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <FormControlLabel control={<Switch checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(0); }} />} label="Unread only" />
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={markAll}>Mark all as read</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Paper>
        {data?.content.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>{unreadOnly ? 'You are all caught up.' : 'No notifications yet. Budget alerts, goal progress and recurring payments will show up here.'}</Typography>
        ) : (
          <List disablePadding>
            {data?.content.map((n) => (
              <ListItem key={n.id} divider onClick={() => markRead(n)} sx={{ cursor: n.read ? 'default' : 'pointer', bgcolor: n.read ? 'transparent' : 'action.hover' }}
                secondaryAction={<IconButton edge="end" aria-label="Delete notification" onClick={(e) => { e.stopPropagation(); remove(n); }}><DeleteIcon /></IconButton>}>
                <ListItemText
                  primary={<Typography fontWeight={n.read ? 400 : 700}>{n.title}{!n.read && <Typography component="span" color="primary" sx={{ ml: 1, fontSize: 12 }}>New</Typography>}</Typography>}
                  secondary={`${n.message}  ·  ${n.createdAt.slice(0, 16).replace('T', ' ')} UTC`} />
              </ListItem>
            ))}
          </List>
        )}
        <TablePagination component="div" count={data?.totalElements ?? 0} page={page} rowsPerPage={size} rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} />
      </Paper>
    </Box>
  );
}
