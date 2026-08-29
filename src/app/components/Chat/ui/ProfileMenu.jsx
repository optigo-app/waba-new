'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, MenuItem, Avatar, Divider, Box, Typography, IconButton, Tooltip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { User, RefreshCw, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useThemeMode } from '../../../providers/ThemeRegistry';
import { useAuth } from '../../../hooks/useAuth';
import { disconnectSocket, broadcastLogout } from '../../../socket';
import { logoutApi } from '../../../api/LogoutConfig';
import { getWhatsAppAvatarConfig } from '../../../utils/globalFunc';

/**
 * Reusable profile menu — same menu used in the main Sidebar.
 * Renders a trigger (IconButton with User icon, or Avatar) that opens
 * a Menu with Profile / Data Sync / Theme toggle / Logout.
 */
export default function ProfileMenu({ variant = 'icon', size = 18, collapsed = false }) {
  const router = useRouter();
  const { auth, logout, setIsSyncing } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleClose();
    router.push('/');
  };

  const handleSync = () => {
    handleClose();
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 3000);
  };

  const handleSetTheme = (_, next) => {
    if (next) setMode(next);
    handleClose();
  };

  const handleLogout = async () => {
    handleClose();
    try {
      await logoutApi({ UserId: auth?.id }, auth?.whatsappNumber);
    } catch {
      // ignore API errors — still proceed with local logout
    }
    disconnectSocket(true);
    broadcastLogout();
    logout();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('waba_preload_done');
    }
    const isLocalhost = typeof window !== 'undefined' && window.location.origin.includes('localhost');
    const basePath = isLocalhost ? '' : (auth?.redirect_version || '');
    window.location.replace(`${window.location.origin}${basePath}/`);
  };

  const displayName = auth?.username || [auth?.firstname, auth?.lastname].filter(Boolean).join(' ') || 'User';

  const trigger = variant === 'sidebar' ? (
    <Tooltip title={displayName} placement="right" arrow disableHoverListener={!collapsed}>
      <div
        className={collapsed ? 'sidebar-user-trigger sidebar-user-trigger-collapsed' : 'sidebar-user-trigger'}
        onClick={handleOpen}
        style={{ cursor: 'pointer' }}
      >
        <Avatar
          alt={displayName}
          {...getWhatsAppAvatarConfig(displayName, 40)}
        />
        {!collapsed && (
          <span className="sidebar-user-name">{displayName}</span>
        )}
      </div>
    </Tooltip>
  ) : variant === 'avatar' ? (
    <div
      onClick={handleOpen}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <Avatar
        alt={displayName}
        {...getWhatsAppAvatarConfig(displayName, 36)}
        sx={{ ...getWhatsAppAvatarConfig(displayName, 36).sx, width: 36, height: 36 }}
      />
    </div>
  ) : (
    <Tooltip title="Profile" placement="bottom" arrow>
      <IconButton
        onClick={handleOpen}
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid',
          borderColor: 'var(--border-color, rgba(0,0,0,0.08))',
          bgcolor: 'var(--bg-light, rgba(0,0,0,0.04))',
          color: 'var(--text-secondary)',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'var(--chat-primary-light, rgba(37, 211, 102, 0.16))',
            color: 'var(--chat-primary, #25d366)',
            borderColor: 'var(--chat-primary, #25d366)',
          },
        }}
      >
        <User size={size} />
      </IconButton>
    </Tooltip>
  );

  return (
    <>
      {trigger}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={variant === 'sidebar' ? { vertical: 'top', horizontal: 'right' } : { vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={variant === 'sidebar' ? { vertical: 'bottom', horizontal: 'right' } : { vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              borderRadius: '14px',
              mt: 0.5,
              p: 0.5,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            alt={displayName}
            {...getWhatsAppAvatarConfig(displayName, 40)}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ color: 'text.primary', lineHeight: 1.4 }}
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}
            >
              {auth?.whatsappNumber || 'WhatsApp User'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={handleProfile} sx={{ borderRadius: 1, gap: 1.5, py: 1 }}>
          <User size={16} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleSync} sx={{ borderRadius: 1, gap: 1.5, py: 1 }}>
          <RefreshCw size={16} />
          Data Sync
        </MenuItem>

        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Sun size={16} />
            <Typography variant="body2">Theme</Typography>
          </Box>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={handleSetTheme}
            sx={{
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              p: 0.25,
              gap: 0.25,
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none !important',
                borderRadius: '8px !important',
                px: 0.9,
                py: 0.5,
                color: 'text.secondary',
                '&:not(:first-of-type)': { borderLeft: 'none !important' },
              },
              '& .MuiToggleButton-root': {
                '&.Mui-selected': {
                  bgcolor: 'var(--chat-primary-light, rgba(37, 211, 102, 0.16))',
                  color: 'var(--chat-primary, #25d366)',
                  '&:hover': { bgcolor: 'var(--chat-primary-light, rgba(37, 211, 102, 0.24))' },
                },
                '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
              },
            }}
          >
            <Tooltip title="Light" arrow>
              <ToggleButton value="light" aria-label="Light mode">
                <Sun size={16} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Dark" arrow>
              <ToggleButton value="dark" aria-label="Dark mode">
                <Moon size={16} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="System" arrow>
              <ToggleButton value="system" aria-label="System mode">
                <Monitor size={16} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            gap: 1.5,
            py: 1,
            color: 'error.main',
          }}
        >
          <LogOut size={16} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}
