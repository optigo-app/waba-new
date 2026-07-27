'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { initSession } from '../api/SessionApi';
import { getDecodedSession, cleanSessionFromUrl } from '../utils/session';
import { useAuthStore } from '../store/authStore';
import PreHydrationLoader from './PreHydrationLoader';

export default function SessionGate({ children }) {
  const [sessionState, setSessionState] = useState('idle');
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasSession = searchParams.get('session');
    if (!hasSession) return;

    const decodedSession = getDecodedSession();
    if (!decodedSession) {
      cleanSessionFromUrl();
      return;
    }

    setSessionState('loading');
    let mounted = true;

    (async () => {
      const result = await initSession(decodedSession);
      if (!mounted) return;

      if (result?.success && result?.data) {
        useAuthStore.getState().login(result.data, result?.permissions);
        cleanSessionFromUrl();
        setSessionState('success');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else if (result?.skipped) {
        cleanSessionFromUrl();
        setSessionState('success');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setSessionError(result?.error || 'Session initialization failed');
        setSessionState('error');
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (sessionState === 'loading' || sessionState === 'success') {
    return (
      <PreHydrationLoader
        show={true}
        text={sessionState === 'success' ? 'Session established — loading…' : 'Initializing session…'}
      />
    );
  }

  if (sessionState === 'error') {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#f9fafb',
          zIndex: 9999,
        }}
      >
        <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 600 }}>
          Session Error
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          {sessionError}
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            cleanSessionFromUrl();
            window.location.href = window.location.origin;
          }}
          sx={{
            mt: 1,
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            bgcolor: '#1daa61',
            '&:hover': { bgcolor: '#128C7E' },
          }}
        >
          Redirect to Home
        </Button>
      </Box>
    );
  }

  return children;
}
