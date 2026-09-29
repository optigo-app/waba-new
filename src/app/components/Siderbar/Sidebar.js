import { useEffect, useState } from 'react'
import './Sidebar.scss'
import { HomeIcon, MessageCircle, ChevronLeft, LogOut, RefreshCw, User, LayoutGrid, X, QrCode, Zap, Sun, Moon, Monitor } from 'lucide-react'
import { useThemeMode } from '../../providers/ThemeRegistry'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { disconnectSocket, broadcastLogout } from '../../socket'
import { logoutApi } from '../../api/LogoutConfig'
import { Menu, MenuItem, Tooltip, IconButton, Avatar, Divider, Box, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { getWhatsAppAvatarConfig } from '@/app/utils/globalFunc'
import { useAuth } from '../../hooks/useAuth'
import AddChannelPromo from '../Chat/AddChannelPromo'
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal'
import { useWallet } from '../../contexts/WalletContext'

const Sidebar = ({isCollapsed = false, onCollapsedChange = () => { }, mobileOpen = false, onMobileClose = () => { } }) => {
    const pathname = usePathname();
    const [activePath, setActivePath] = useState(pathname);
    const { auth, logout, setIsSyncing } = useAuth();
    const router = useRouter();
    const { walletInfo } = useWallet();
    const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const isUserMenuOpen = Boolean(userMenuAnchorEl);
    const { mode, setMode } = useThemeMode();

    const handleOpenUserMenu = (e) => setUserMenuAnchorEl(e.currentTarget);
    const handleCloseUserMenu = () => setUserMenuAnchorEl(null);

    const handleSetTheme = (_, next) => {
        if (next) setMode(next);
        handleCloseUserMenu();
    };

    const handleProfile = () => {
        handleCloseUserMenu();
        router.push('/');
    };

    const handleSync = () => {
        handleCloseUserMenu();
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 3000);
    };

    const handleLogoutClick = () => {
        handleCloseUserMenu();
        setLogoutConfirmOpen(true);
    };

    const handleLogout = async () => {
        setLoggingOut(true);
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
        window.location.replace(`${window.location.origin}${basePath}/`);
    };

    const displayName = auth?.username || [auth?.firstname, auth?.lastname].filter(Boolean).join(' ') || 'User';

    const ICON_PROPS = { size: 20, strokeWidth: 2 };

    const isLocalhost = typeof window !== 'undefined' && window.location.origin.includes('localhost');
    const basePath = isLocalhost ? '' : (auth?.redirect_version || '');
    const chatPath = `${basePath}/chat`;
    const poweredByImg = `${basePath}/poweredBy.png`;

    const hasWabaData = !!walletInfo && !!walletInfo.wabaId && walletInfo.wabaId !== '-';

    const menuItems = [
        { path: "/", icon: <HomeIcon {...ICON_PROPS} />, label: "Dashboard" },
        ...(hasWabaData ? [
            { path: "/campaign", icon: <LayoutGrid {...ICON_PROPS} />, label: "Campaign" },
            { path: "/qr-generator", icon: <QrCode {...ICON_PROPS} />, label: "QR Generator" },
            { path: "/auto-reply", icon: <Zap {...ICON_PROPS} />, label: "Auto Reply" },
            { path: chatPath, icon: <MessageCircle {...ICON_PROPS} />, label: "Chat", external: true },
        ] : []),
    ];

    useEffect(() => {
        setActivePath(pathname);
    }, [pathname]);

    const handleHeaderIconClick = () => {
        if (isCollapsed) {
            onCollapsedChange(false);
        } else {
            router.push("/");
        }
    };

    return (
        <div className={`sidebar_mainDiv ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-content">
                <div className="sidebar-sections">
                    <div className="agentic-chat-header">
                        <div className="agentic-chat-header__icon" onClick={handleHeaderIconClick}>
                            <div className="icon-bg">
                                <MessageCircle className="icon" {...ICON_PROPS} />
                            </div>
                            {!isCollapsed && <h1 className="title">Agentic chat</h1>}
                        </div>

                        {mobileOpen ? (
                            <IconButton
                                className="sidebar-mobile-close"
                                size="small"
                                onClick={onMobileClose}
                                sx={{ color: '#444050' }}
                            >
                                <X size={20} />
                            </IconButton>
                        ) : !isCollapsed && (
                            <Tooltip title="Collapse sidebar" placement="right" arrow>
                                <IconButton
                                    className="sidebar-toggle"
                                    size="small"
                                    onClick={() => onCollapsedChange(!isCollapsed)}
                                >
                                    <ChevronLeft size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </div>
                    <div className="sidebar_main">
                        <ul style={{ padding: '2px 0px' }} className='sidebar_main_ul'>
                            {menuItems.map((item) => {
                                const isActive = activePath === item.path ||
                                    (activePath === "/archieve" && item.path === "/");

                                let content = (
                                    <>
                                        {item.icon}
                                        {!isCollapsed && <span>{item.label}</span>}
                                    </>
                                );

                                return (
                                    <li key={item.label} className='sidebar_main_li'>
                                        <Tooltip
                                            title={item.label}
                                            placement="right"
                                            arrow
                                            disableHoverListener={!isCollapsed}
                                            disableFocusListener={!isCollapsed}
                                            disableTouchListener={!isCollapsed}
                                        >
                                            {item.external ? (
                                                <a
                                                    href={item.path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`sidebar_main_link ${isActive ? "active" : ""}`}
                                                    onClick={() => {
                                                        const perms = sessionStorage.getItem('userPermissions');
                                                        if (perms) localStorage.setItem('userPermissions', perms);
                                                        onMobileClose();
                                                    }}
                                                >
                                                    {content}
                                                </a>
                                            ) : (
                                                <Link
                                                    href={item.path}
                                                    onClick={() => {
                                                        setActivePath(item.path);
                                                        onMobileClose();
                                                    }}
                                                    className={`sidebar_main_link ${isActive ? "active" : ""}`}
                                                >
                                                    {content}
                                                </Link>
                                            )}
                                        </Tooltip>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                {/* Channel upsell card — reusable promo, shown above the user section */}
                <AddChannelPromo collapsed={isCollapsed} />

                {/* User avatar section */}
                <div className={isCollapsed ? "sidebar-user collapsed" : "sidebar-user"}>
                    <Tooltip title={displayName} placement="right" arrow disableHoverListener={!isCollapsed}>
                        <div
                            className={isCollapsed ? "sidebar-user-trigger_cl sidebar-user-trigger" : "sidebar-user-trigger"}
                            onClick={handleOpenUserMenu}
                            style={{ cursor: 'pointer' }}
                        >
                            <Avatar
                                alt={displayName}
                                {...getWhatsAppAvatarConfig(displayName, 40)}
                            />
                             {!isCollapsed && (
                                <span className="sidebar-user-name">{displayName}</span>
                            )}
                        </div>
                    </Tooltip>
                    <Menu
                        anchorEl={userMenuAnchorEl}
                        open={isUserMenuOpen}
                        onClose={handleCloseUserMenu}
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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
                            onClick={handleLogoutClick}
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

                    <ConfirmationModal
                        isOpen={logoutConfirmOpen}
                        onClose={() => !loggingOut && setLogoutConfirmOpen(false)}
                        onConfirm={handleLogout}
                        title="Log out?"
                        description="Are you sure you want to log out of your account?"
                        icon={LogOut}
                        isDanger
                        confirmLabel="Logout"
                        isLoading={loggingOut}
                    />
                </div>

                {/* Powered by section at the bottom */}
                <div className={isCollapsed ? "powered-by collapsed" : "powered-by"}>
                    <span>Powered by </span>
                    <div className="optigo-logo">
                        <img src={poweredByImg} alt="Optigo logo" />
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Sidebar
