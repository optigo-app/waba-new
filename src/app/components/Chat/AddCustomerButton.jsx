'use client';

import { useState, useCallback } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { hasCustomerName } from './utils/chatUtils';
import AddCustomerDialog from './AddCustomerDialog';

/**
 * Lightweight, self-contained "Add to Customer" trigger + dialog.
 * Manages its own open state so the parent never re-renders when the
 * dialog opens/closes — avoids 700ms+ click-handler violations on
 * heavy parents like ChatConversation / CustomerDetails.
 *
 * Props:
 *  - variant: 'icon' (default, compact icon button) | 'label' (icon + text, WhatsApp-style)
 */
export default function AddCustomerButton({ customer, size = 18, variant = 'icon', sx, labelSx }) {
  const can = useAuthStore((s) => s.can);
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback((e) => {
    e?.stopPropagation?.();
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  if (!can(16) || hasCustomerName(customer)) return null;

  if (variant === 'label') {
    return (
      <>
        <button
          type="button"
          className="cd-add-customer-btn"
          onClick={handleOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            border: 'none',
            borderRadius: 24,
            cursor: 'pointer',
            fontFamily: 'var(--chat-font)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.30)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
            ...sx,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)';
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <UserPlus size={size} />
          <span style={labelSx}>Add to Customer</span>
        </button>
        <AddCustomerDialog
          open={open}
          onClose={handleClose}
          selectedMember={customer}
          onSuccess={handleClose}
        />
      </>
    );
  }

  return (
    <>
      <Tooltip title="Add to Customer" arrow>
        <IconButton
          size="small"
          className="action-btn add-customer-btn"
          onClick={handleOpen}
          sx={{
            color: 'var(--chat-text-white, #fff)',
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)',
              transform: 'scale(1.06)',
            },
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.30)',
            ...sx,
          }}
        >
          <UserPlus size={size} />
        </IconButton>
      </Tooltip>
      <AddCustomerDialog
        open={open}
        onClose={handleClose}
        selectedMember={customer}
        onSuccess={handleClose}
      />
    </>
  );
}
