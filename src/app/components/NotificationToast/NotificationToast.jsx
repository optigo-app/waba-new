'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import {
  X, Bell, MessageCircle, Smile, UserPlus, LogOut,
  Download, Clock, FileText, MousePointerClick,
} from 'lucide-react';

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
  MESSAGE:   { color: '#25d366', bg: 'rgba(37,211,102,0.12)' },
  REACTION:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ASSIGNMENT:{ color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  AUTH:      { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  OTHER:     { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

const formatRelativeTime = (ts) => {
  if (!ts) return 'Now';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

/* ── Circular progress ring (SVG) ── */
function ProgressRing({ percentage, color = '#ef4444', size = 34, stroke = 3.5 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percentage / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeOpacity="0.15" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize="9" fontWeight="700" fill={color}
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

/* ── Type-specific interactive widget ── */
function NotificationWidget({ toast, progress, isPaused }) {
  switch (toast.typeGroup) {
    case 'MESSAGE':
      return (
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(37,211,102,0.12)',
            color: '#1daa61',
            fontSize: '11px', fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            padding: '5px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            '&:hover': { background: 'rgba(37,211,102,0.20)' },
            mt: 1,
          }}
        >
          <Download size={12} strokeWidth={2.5} />
          View Chat
        </Box>
      );

    case 'ASSIGNMENT':
      return (
        <Box sx={{ mt: 1, position: 'relative' }}>
          <Box sx={{
            height: 6, borderRadius: '10px',
            background: 'rgba(59,130,246,0.15)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              height: '100%',
              width: `${Math.max(progress, 15)}%`,
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              borderRadius: '10px',
              transition: isPaused ? 'none' : 'width 0.1s linear',
            }} />
          </Box>
          <Box
            sx={{
              position: 'absolute',
              top: -3, left: `calc(${Math.max(progress, 15)}% - 7px)`,
              transition: isPaused ? 'none' : 'left 0.1s linear',
              pointerEvents: 'none',
            }}
          >
            <MousePointerClick size={12} color="#3b82f6" fill="rgba(255,255,255,0.9)" />
          </Box>
        </Box>
      );

    case 'REACTION':
      return (
        <Box sx={{
          mt: 1, display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px', color: '#9ca3af',
          fontFamily: 'Inter, sans-serif', fontWeight: 500,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <FileText size={11} color="#9ca3af" />
            Details
          </Box>
          <Box sx={{ width: 3, height: 3, borderRadius: '50%', background: '#d1d5db' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={11} color="#9ca3af" />
            {formatRelativeTime(toast.timestamp)}
          </Box>
        </Box>
      );

    case 'AUTH':
      return (
        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          <ProgressRing percentage={Math.round(progress)} color="#ef4444" />
        </Box>
      );

    default:
      return null;
  }
}

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
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

  const Icon = toast.icon || Bell;
  const theme = THEME[toast.typeGroup] || THEME.OTHER;
  const timeLabel = formatRelativeTime(toast.timestamp);

  return (
    <Box
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      sx={{
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        p: '16px 18px',
        width: 380,
        borderRadius: '18px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid rgba(255,255,255,0.6)',
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
      {/* Squircle icon container */}
      <Box sx={{
        width: 44, height: 44,
        borderRadius: '14px',
        background: theme.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 4px 10px ${theme.bg}`,
      }}>
        <Icon size={20} color="#fff" strokeWidth={2.2} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
        {/* Header: title + timestamp */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 1, mb: '3px',
        }}>
          <Box sx={{
            fontFamily: 'Inter, Arial, sans-serif',
            fontWeight: 700, fontSize: '14px', color: '#1a1a2e',
            lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {toast.title}
          </Box>
          <Box sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px', fontWeight: 500, color: '#9ca3af',
            flexShrink: 0, lineHeight: 1.25,
          }}>
            {timeLabel}
          </Box>
        </Box>

        {/* Body text */}
        <Box sx={{
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 400, fontSize: '12.5px', color: '#6b7280',
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {toast.body}
        </Box>

        {/* Interactive widget */}
        <NotificationWidget toast={toast} progress={progress} isPaused={isPaused} />
      </Box>

      {/* Close */}
      <IconButton
        onClick={handleClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 10, right: 10,
          p: 0.4, color: '#c6c6c8',
          lineHeight: 1,
          transition: 'color 0.15s ease',
          zIndex: 2,
          '&:hover': { color: '#6b7280' },
        }}
      >
        <X size={13} strokeWidth={2.5} />
      </IconButton>

      {/* Bottom progress line */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '2.5px',
        background: 'rgba(0,0,0,0.03)',
        overflow: 'hidden', zIndex: 1,
      }}>
        <Box sx={{
          height: '100%', width: `${progress}%`,
          background: theme.color,
          opacity: 0.5,
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
          icon: Icon, accentColor: theme.color, typeGroup,
          timestamp: Date.now(),
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
      display: 'flex', flexDirection: 'column', gap: '10px',
      maxWidth: 400, width: '100%', pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </Box>
  );
}
