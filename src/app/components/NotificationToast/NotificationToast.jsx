'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import { X, Bell, MessageCircle, Smile, UserPlus, LogOut } from 'lucide-react';
import { getStaticUrl } from '../../utils/globalFunc';

const MAX_TOASTS = 4;
const DISMISS_DELAY = 6000;

const ICON_MAP = {
  MESSAGE: MessageCircle,
  REACTION: Smile,
  ASSIGNMENT: UserPlus,
  AUTH: LogOut,
  OTHER: Bell,
};

const THEME = {
  MESSAGE: { color: '#25d366' },
  REACTION: { color: '#f59e0b' },
  ASSIGNMENT: { color: '#3b82f6' },
  AUTH: { color: '#ef4444' },
  OTHER: { color: '#6366f1' },
};

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    const tick = () => {
      if (isPaused) { rafRef.current = requestAnimationFrame(tick); return; }
      const total = elapsedRef.current + (Date.now() - startRef.current);
      const pct = Math.max(0, 100 - (total / DISMISS_DELAY) * 100);
      setProgress(pct);
      if (pct <= 0) { setIsExiting(true); setTimeout(() => onRemove(toast.id), 400); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, onRemove, toast.id]);

  const handlePause = () => { if (!isPaused) { elapsedRef.current += Date.now() - startRef.current; setIsPaused(true); } };
  const handleResume = () => { if (isPaused) { startRef.current = Date.now(); setIsPaused(false); } };
  const handleClose = () => { setIsExiting(true); setTimeout(() => onRemove(toast.id), 400); };

  return (
    <Box
      onMouseEnter={() => { setIsHovered(true); handlePause(); }}
      onMouseLeave={() => { setIsHovered(false); handleResume(); }}
      sx={{
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        p: '14px 18px',
        width: 360,
        borderRadius: '14px',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08)',
        animation: isExiting
          ? 'toastOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          : 'toastIn 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
        transformOrigin: 'bottom center',
        overflow: 'hidden',
        '@keyframes toastIn': {
          '0%':  { opacity: 0, transform: 'translateY(20px) scale(0.96)' },
          '100%':{ opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        '@keyframes toastOut': {
          '0%':  { opacity: 1, transform: 'translateY(0) scale(1)' },
          '100%':{ opacity: 0, transform: 'translateY(10px) scale(0.97)' },
        },
      }}
    >
      {/* Logo thumb */}
      <Box sx={{
        width: 42, height: 42, borderRadius: '10px',
        background: '#ffdfd0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Box
          component="img"
          src={getStaticUrl('/waba_logo.png')}
          alt="WABA"
          sx={{ width: 26, height: 26, objectFit: 'contain' }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, pr: 2.5 }}>
        <Box sx={{
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 600, fontSize: '15px', color: '#222',
          lineHeight: 1.2, mb: '4px',
        }}>
          {toast.title}
        </Box>
        <Box sx={{
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 400, fontSize: '12px', color: '#6b7280',
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {toast.body}
        </Box>
      </Box>

      {/* Close */}
      <IconButton
        onClick={handleClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 12, right: 14,
          p: 0.45, color: '#9ca3af',
          lineHeight: 1,
          transition: 'color 0.15s ease',
          zIndex: 1,
          '&:hover': { color: '#4b5563' },
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </IconButton>

      {/* Progress line */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(0,0,0,0.04)', borderRadius: '0 0 14px 14px', overflow: 'hidden', zIndex: 1 }} >
        <Box sx={{
          height: '100%', width: `${progress}%`,
          background: toast.accentColor || '#25d366',
          transition: isPaused ? 'none' : 'width 0.1s linear',
        }} />
      </Box>
    </Box>
  );
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleEvent = (e) => {
      const detail = e.detail || {};
      const id = `${detail.tag || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const typeGroup = detail.group || 'OTHER';
      const Icon = ICON_MAP[typeGroup] || Bell;
      const theme = THEME[typeGroup] || THEME.OTHER;
      setToasts((prev) => {
        const next = [{
          id, title: detail.title || 'Notification', body: detail.body || '',
          icon: Icon, accentColor: theme.color, typeGroup, timeLabel: 'Now',
        }, ...prev];
        return next.slice(0, MAX_TOASTS);
      });
    };
    window.addEventListener('waba:inPageNotification', handleEvent);
    return () => window.removeEventListener('waba:inPageNotification', handleEvent);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 1.2,
      maxWidth: 400, width: '100%', pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </Box>
  );
}
