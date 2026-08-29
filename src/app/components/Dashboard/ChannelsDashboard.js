'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Paper,
    InputBase,
} from '@mui/material';
import { Search, Plus, MessageCircle } from 'lucide-react';
import WalletDrawer from './WalletDrawer';
import ChannelCardSkeleton from './ChannelCardSkeleton';
import ChannelCard from './ChannelCard';
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
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [pageChangeLoading, setPageChangeLoading] = useState(false);
    const pageChangeTimeoutRef = useRef(null);

    useEffect(() => () => {
        if (pageChangeTimeoutRef.current) {
            clearTimeout(pageChangeTimeoutRef.current);
            pageChangeTimeoutRef.current = null;
        }
    }, []);

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
        if (!searchQuery.trim()) return channels;
        const q = searchQuery.toLowerCase();
        return channels.filter((ch) =>
            (ch.companyCode || '').toLowerCase().includes(q) ||
            (ch.mobileNumber || '').toLowerCase().includes(q) ||
            (ch.wabaId || '').toLowerCase().includes(q) ||
            (ch.whatsappName || '').toLowerCase().includes(q)
        );
    }, [channels, searchQuery]);

    const handleSearchChange = useCallback((val) => {
        setSearchQuery(val);
        setCurrentPage(0);
    }, []);

    const paginatedChannels = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredChannels.slice(start, start + itemsPerPage);
    }, [filteredChannels, currentPage, itemsPerPage]);

    const handlePageChange = useCallback((_, newPage) => {
        setPageChangeLoading(true);
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (pageChangeTimeoutRef.current) clearTimeout(pageChangeTimeoutRef.current);
        pageChangeTimeoutRef.current = setTimeout(() => setPageChangeLoading(false), 400);
    }, []);

    const handleRowsPerPageChange = useCallback((val) => {
        setPageChangeLoading(true);
        setItemsPerPage(val);
        setCurrentPage(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (pageChangeTimeoutRef.current) clearTimeout(pageChangeTimeoutRef.current);
        pageChangeTimeoutRef.current = setTimeout(() => setPageChangeLoading(false), 400);
    }, []);

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
                    <Paper
                        elevation={0}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: 'var(--border-color)',
                            px: '1rem',
                            py: '6px',
                            width: { xs: '100%', sm: '280px' },
                            background: 'var(--bg-paper)',
                            transition: 'border-color 0.2s',
                            '&:focus-within': {
                                borderColor: 'var(--primary-main)',
                                boxShadow: '0 0 0 3px var(--primary-light-bg)',
                            },
                        }}
                    >
                        <Search size={18} color="var(--text-tertiary)" />
                        <InputBase
                            placeholder="Search channels..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            sx={{
                                ml: '0.75rem',
                                flex: 1,
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.85rem',
                                color: 'var(--text-primary)',
                                '& input::placeholder': {
                                    color: 'var(--text-placeholder)',
                                    opacity: 1,
                                },
                            }}
                        />
                    </Paper>

                    {/* Add Channel Button — hidden while multi-channel is pending */}
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

            {/* Content */}
            <div className={styles.contentArea}>
                {isLoading || pageChangeLoading ? (
                    <ChannelCardSkeleton count={Math.min(itemsPerPage, Math.max(3, filteredChannels.length || itemsPerPage))} />
                ) : filteredChannels.length === 0 ? (
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
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '1.5rem',
                                '@media (max-width: 1200px)': {
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                },
                                '@media (max-width: 768px)': {
                                    gridTemplateColumns: '1fr',
                                },
                            }}
                        >
                            {paginatedChannels.map((channel) => (
                                <ChannelCard
                                    key={channel.id}
                                    channel={channel}
                                    onWalletOpen={() => handleWalletOpen(channel)}
                                    onTemplatesClick={() => {
                                        const qs = buildQueryString({ tempid: channel.Id, wabaid: channel.wabaId, whatsappNo: channel.mobileNumber });
                                        router.push(qs ? `/templates?${qs}` : '/templates');
                                    }}
                                    onBusinessProfileClick={() => handleBusinessProfileOpen(channel)}
                                />
                            ))}
                        </Box>
                        {filteredChannels.length > itemsPerPage && (
                            <Pagination
                                count={filteredChannels.length}
                                page={currentPage}
                                rowsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                                onRowsPerPageChange={handleRowsPerPageChange}
                            />
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

            {/* Business Profile Dialog */}
            <BusinessProfile
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                channel={activeChannel}
            />
        </div>
    );
};

export default ChannelsDashboard;
