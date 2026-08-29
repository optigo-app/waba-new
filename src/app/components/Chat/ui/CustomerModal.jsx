'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from '@mui/material';

const defaultBackdropSx = {
  backgroundColor: 'rgba(10, 12, 16, 0.6)',
};

const defaultPaperSx = {
  bgcolor: 'var(--bg-paper)',
  boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 3,
  overflow: 'hidden',
};

export default function CustomerModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  backdropSx,
  paperSx,
  contentSx,
  dialogContentSx,
  actionsSx,
  titleSx,
  ...dialogProps
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      disableScrollLock
      slotProps={{
        transition: { timeout: { enter: 150, exit: 100 } },
        backdrop: {
          sx: { ...defaultBackdropSx, ...(backdropSx || {}) },
        },
        paper: {
          sx: { ...defaultPaperSx, ...(paperSx || {}) },
        },
      }}
      {...dialogProps}
    >
      {title ? (
        <DialogTitle sx={{ ...(titleSx || {}) }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ mt: 0.4, color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 400 }}>
              {subtitle}
            </Typography>
          ) : null}
        </DialogTitle>
      ) : null}

      <DialogContent sx={{ ...(dialogContentSx || {}) }}>
        <Box sx={{ pt: 2, ...(contentSx || {}) }}>{children}</Box>
      </DialogContent>

      {actions ? (
        <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'flex-end', gap: 1.5, ...(actionsSx || {}) }}>
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
