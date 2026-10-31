'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Paper,
    Grid,
} from '@mui/material';
import { Plus, MessageCircle, LayoutGrid, Table2 } from 'lucide-react';
import WalletDrawer from './WalletDrawer';
import ChannelCardSkeleton from './ChannelCardSkeleton';
import ChannelCard from './ChannelCard';
import EmailChannelCard, { EMAIL_CHANNEL } from './EmailChannelCard';
import ChannelTable from './ChannelTable';
import FilterBar from '../Common/FilterBar/FilterBar';
import BusinessProfile from '../BusinessProfile/BusinessProfile';
import Pagination from '../Common/Pagination/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../contexts/WalletContext';
import { buildQueryString } from '../../utils/urlUtils';
import styles from './ChannelsDashboard.module.scss';

// ── Static data (replace with API later) ──────────────────────────────────────
const CHANNELS = [
    {
        id: 'whatsapp',
        balance: 1250,
        totalCredits: 5000,
        used: 3750,
    },
];

const ChannelsDashboard = () => {
    const router = useRouter();
    const { auth } = useAuth();
    const { walletInfo, channels: walletChannels, isLoading, loadWalletData } = useWallet();
    const [walletOpen, setWalletOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [activeChannel, setActiveChannel] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [channelType, setChannelType] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('grid');
    const [cardPage, setCardPage] = useState(0);
    const [cardRowsPerPage, setCardRowsPerPage] = useState(15);

    const appUserId = useMemo(
        () => auth?.userid || auth?.userId || auth?.appuserid || '',
        [auth]
    );

    useEffect(() => {
        loadWalletData(appUserId);
    }, [appUserId, loadWalletData]);

    const channels = useMemo(() => {
        if (!walletChannels || walletChannels.length === 0) return [];

        return walletChannels.map((ch) => ({
            id: ch.Id || ch.id,
            ...ch,
            balance: ch.availableBalance,
            totalCredits: ch.totalBalance,
            used: Math.max(0, Number(ch.totalBalance || 0) - Number(ch.availableBalance || 0)),
            progressPercent: ch.totalBalance > 0 ? Math.min(100, ((ch.totalBalance - ch.availableBalance) / ch.totalBalance) * 100) : 0,
        }));
    }, [walletChannels]);

    const filteredChannels = useMemo(() => {
        let list = channels;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = channels.filter((ch) =>
                (ch.companyCode || '').toLowerCase().includes(q) ||
                (ch.mobileNumber || '').toLowerCase().includes(q) ||
                (ch.wabaId || '').toLowerCase().includes(q) ||
                (ch.whatsappName || '').toLowerCase().includes(q) ||
                (ch.channelTitle || '').toLowerCase().includes(q)
            );
        }
        const sorted = [...list];
        if (sortBy === 'name') {
            sorted.sort((a, b) =>
                (a.channelTitle || a.whatsappName || a.companyCode || '').localeCompare(b.channelTitle || b.whatsappName || b.companyCode || '')
            );
        } else if (sortBy === 'balance-high') {
            sorted.sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
        } else if (sortBy === 'balance-low') {
            sorted.sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
        }
        return sorted;
    }, [channels, searchQuery, sortBy]);

    const handleSearchChange = useCallback((val) => {
        setSearchQuery(val);
        setCardPage(0);
    }, []);

    const handleChannelTypeChange = useCallback((val) => {
        setChannelType(val);
        setCardPage(0);
    }, []);

    const showWhatsApp = channelType !== 'email';
    const showEmail = useMemo(() => {
        if (channelType === 'whatsapp') return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return ['email', EMAIL_CHANNEL.title, EMAIL_CHANNEL.sender, EMAIL_CHANNEL.provider]
            .filter(Boolean)
            .some((f) => f.toLowerCase().includes(q));
    }, [channelType, searchQuery]);
    const hasVisibleContent = (showWhatsApp && filteredChannels.length > 0) || showEmail;

    const typeChips = useMemo(() => [
        { value: 'all', label: `All (${filteredChannels.length + 1})` },
        { value: 'whatsapp', label: `WhatsApp (${filteredChannels.length})` },
        { value: 'email', label: 'Email (1)' },
    ], [filteredChannels.length]);

    const handleWalletOpen = (channel) => {
        setActiveChannel(channel);
        setWalletOpen(true);
    };

    const handleBusinessProfileOpen = (channel) => {
        setActiveChannel(channel);
        setProfileOpen(false);
        requestAnimationFrame(() => {
            setProfileOpen(true);
        });
    };

    const handleAddChannel = () => {
        router.push('/onboarding');
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <div className={styles.headerIconWrap}>
                        <MessageCircle size={18} />
                    </div>
                    <div>
                        <h2 className={styles.pageTitle}>Channels</h2>
                        <p className={styles.pageSubtitle}>Manage your WhatsApp Business channels and wallets</p>
                    </div>
                </div>

                <div className={styles.topActions}>
                    {/* View Switcher */}
                    <Box
                        sx={{
                            display: 'flex',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            background: 'var(--bg-paper)',
                            flexShrink: 0,
                        }}
                    >
                        <Box
                            onClick={() => setViewMode('grid')}
                            sx={{
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: viewMode === 'grid' ? 'var(--primary-main)' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--button-color)' : 'var(--text-tertiary)',
                                '&:hover': {
                                    background: viewMode === 'grid' ? 'var(--primary-main)' : 'var(--bg-light)',
                                    color: viewMode === 'grid' ? 'var(--button-color)' : 'var(--text-primary)',
                                },
                            }}
                        >
                            <LayoutGrid size={17} />
                        </Box>
                        <Box
                            onClick={() => setViewMode('table')}
                            sx={{
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: viewMode === 'table' ? 'var(--primary-main)' : 'transparent',
                                color: viewMode === 'table' ? 'var(--button-color)' : 'var(--text-tertiary)',
                                '&:hover': {
                                    background: viewMode === 'table' ? 'var(--primary-main)' : 'var(--bg-light)',
                                    color: viewMode === 'table' ? 'var(--button-color)' : 'var(--text-primary)',
                                },
                            }}
                        >
                            <Table2 size={17} />
                        </Box>
                    </Box>
                    {false && (
                        <Button
                            variant="contained"
                            disableElevation
                            onClick={handleAddChannel}
                            startIcon={<Plus size={18} />}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '12px',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                background: 'var(--primary-main)',
                                color: 'var(--button-color)',
                                px: '1.25rem',
                                py: '8px',
                                boxShadow: '0 4px 12px rgba(29, 170, 97, 0.25)',
                                '&:hover': {
                                    background: 'var(--primary-main)',
                                    boxShadow: '0 6px 16px rgba(29, 170, 97, 0.35)',
                                },
                            }}
                        >
                            Add New Channel
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters — same row as the templates page */}
            <FilterBar
                search={searchQuery}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Search channels..."
                sortBy={sortBy}
                onSortChange={setSortBy}
                sortOptions={[
                    { value: 'name', label: 'Name (A-Z)' },
                    { value: 'balance-high', label: 'Balance (High → Low)' },
                    { value: 'balance-low', label: 'Balance (Low → High)' },
                ]}
                filterChips={typeChips}
                activeFilter={channelType}
                onFilterChange={handleChannelTypeChange}
            />

            {/* Content */}
            <div className={styles.contentArea}>
                {isLoading ? (
                    <ChannelCardSkeleton count={Math.min(6, Math.max(3, filteredChannels.length || 6))} />
                ) : !hasVisibleContent ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: { xs: '4rem', sm: '6rem' },
                            px: { xs: '1rem', sm: '2rem' },
                            gap: '2rem',
                        }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                width: { xs: 100, sm: 120 },
                                height: { xs: 100, sm: 120 },
                                borderRadius: '32px',
                                background: 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.06))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1.5px solid rgba(29,170,97,0.18)',
                                boxShadow: '0 8px 32px rgba(29,170,97,0.12)',
                            }}
                        >
                            <MessageCircle size={48} color="var(--primary-main)" strokeWidth={1.5} />
                        </Paper>

                        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
                            <Typography
                                sx={{
                                    fontFamily: 'Poppins, sans-serif',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                    color: 'var(--text-primary)',
                                    mb: 1,
                                    lineHeight: 1.3,
                                }}
                            >
                                {searchQuery ? 'No channels found' : 'No channels yet'}
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'Poppins, sans-serif',
                                    fontSize: '0.92rem',
                                    color: 'var(--text-tertiary)',
                                    lineHeight: 1.7,
                                    maxWidth: 340,
                                    mx: 'auto',
                                }}
                            >
                                {searchQuery
                                    ? 'Try adjusting your search query'
                                    : 'Get started by adding your first WhatsApp Business channel to create templates and send messages.'}
                            </Typography>
                        </Box>

                        {/* Add New Channel — hidden while multi-channel is pending */}
                        {false && !searchQuery && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                                <Button
                                    variant="contained"
                                    disableElevation
                                    onClick={handleAddChannel}
                                    startIcon={<Plus size={18} />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '14px',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 600,
                                        fontSize: '0.95rem',
                                        background: 'var(--primary-main)',
                                        color: 'var(--button-color)',
                                        px: '2rem',
                                        py: '10px',
                                        boxShadow: '0 4px 16px rgba(29, 170, 97, 0.3)',
                                        '&:hover': {
                                            background: 'var(--primary-main)',
                                            boxShadow: '0 6px 20px rgba(29, 170, 97, 0.4)',
                                        },
                                    }}
                                >
                                    Add New Channel
                                </Button>
                                <Typography
                                    sx={{
                                        fontFamily: 'Poppins, sans-serif',
                                        fontSize: '0.78rem',
                                        color: 'var(--text-placeholder)',
                                    }}
                                >
                                    Connect securely via Facebook Embedded Signup
                                </Typography>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}>
                                <Box sx={{ pb: 16 }}>
                                    <Grid container spacing={2}>
                                        {showWhatsApp && filteredChannels.slice(cardPage * cardRowsPerPage, (cardPage + 1) * cardRowsPerPage).map((channel) => (
                                            <Grid size={{ xs: 12, sm: 6, md: 6, xl: 4 }} key={channel.id}>
                                                <ChannelCard
                                                    channel={channel}
                                                    onWalletOpen={() => handleWalletOpen(channel)}
                                                    onTemplatesClick={() => {
                                                        const qs = buildQueryString({ tempid: channel.Id, wabaid: channel.wabaId, whatsappNo: channel.mobileNumber });
                                                        router.push(qs ? `/templates?${qs}` : '/templates');
                                                    }}
                                                    onBusinessProfileClick={() => handleBusinessProfileOpen(channel)}
                                                />
                                            </Grid>
                                        ))}
                                        {showEmail && (
                                            <Grid size={{ xs: 12, sm: 6, md: 6, xl: 4 }}>
                                                <EmailChannelCard
                                                    onTemplatesClick={() => router.push('/email/templates')}
                                                />
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>
                                {showWhatsApp && filteredChannels.length > cardRowsPerPage && (
                                    <Pagination
                                        count={filteredChannels.length}
                                        page={cardPage}
                                        rowsPerPage={cardRowsPerPage}
                                        onPageChange={(_, p) => setCardPage(p)}
                                        onRowsPerPageChange={(val) => { setCardRowsPerPage(val); setCardPage(0); }}
                                    />
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                                {showWhatsApp && (
                                    <ChannelTable
                                        items={filteredChannels}
                                        onWalletOpen={(ch) => handleWalletOpen(ch)}
                                        onTemplatesClick={(ch) => {
                                            const qs = buildQueryString({ tempid: ch.Id, wabaid: ch.wabaId, whatsappNo: ch.mobileNumber });
                                            router.push(qs ? `/templates?${qs}` : '/templates');
                                        }}
                                        onBusinessProfileClick={(ch) => handleBusinessProfileOpen(ch)}
                                    />
                                )}
                                {showEmail && (
                                    <Box sx={{ mt: showWhatsApp ? 2 : 0, maxWidth: 480 }}>
                                        <EmailChannelCard
                                            onTemplatesClick={() => router.push('/email/templates')}
                                        />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </>
                )}
            </div>

            {/* Wallet Drawer */}
            <WalletDrawer
                open={walletOpen}
                onClose={() => setWalletOpen(false)}
                channel={activeChannel}
            />

            {/* Business Profile Dialog — opens on the Meta/Optigo picker view */}
            <BusinessProfile
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                channel={activeChannel}
            />
        </div>
    );
};

export default ChannelsDashboard;
