'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Tooltip } from '@mui/material';
import { FileText, Wallet, Building2, Star } from 'lucide-react';
import { Whatsapp } from '../../assests/svg';

// WCAG AA compliant metadata color — darker than --text-tertiary
const META_COLOR = 'var(--text-secondary)';
const META_LABEL_COLOR = '#475569';

// Returns the URL only when it's a usable http(s) image URL — '' for junk values
const getValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed === '-' || /^(null|undefined|n\/a)$/i.test(trimmed)) return '';
    try {
        const parsed = new URL(trimmed);
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? trimmed : '';
    } catch {
        return '';
    }
};

const ChannelCard = ({ channel, onWalletOpen, onTemplatesClick, onBusinessProfileClick }) => {
    const progressPercent = channel.progressPercent || 0;
    const [activeAction, setActiveAction] = useState('templates');
    const [failedUrl, setFailedUrl] = useState('');
    const profilePicUrl = getValidImageUrl(channel.profilePictureUrl);
    const hasProfilePic = Boolean(profilePicUrl) && failedUrl !== profilePicUrl;

    return (
        <Paper
            sx={{
                background: 'var(--bg-paper)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: { xs: '1rem', sm: '1.5rem' },
                boxShadow: 'var(--box-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                overflow: 'hidden',
                position: 'relative',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
                '&:hover': {
                    boxShadow: 'var(--box-shadow)',
                    borderColor: 'var(--primary-light)',
                },
                ...(channel.isDefault && {
                    background: 'color-mix(in srgb, var(--primary-light-bg) 40%, var(--bg-paper))',
                    borderColor: 'color-mix(in srgb, var(--primary-main) 20%, transparent)',
                }),
            }}
        >
            {/* Top Row: Icon + Info | Balance */}
            <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: '1rem', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Box
                        sx={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '14px',
                            background: hasProfilePic
                                ? 'transparent'
                                : 'linear-gradient(135deg, var(--primary-light-bg), var(--primary-light))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid var(--primary-light-bg)',
                            overflow: 'hidden',
                        }}
                    >
                        {hasProfilePic ? (
                            <img
                                src={profilePicUrl}
                                alt={channel.channelTitle || channel.whatsappName || channel.companyCode}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={() => setFailedUrl(profilePicUrl)}
                            />
                        ) : (
                            <Whatsapp width={28} height={28} fill="var(--primary-main)" />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Typography
                                sx={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.2,
                                    fontFamily: 'Poppins, sans-serif',
                                }}
                            >
                                {channel.channelTitle || channel.whatsappName || channel.companyCode}
                            </Typography>
                            {channel.isDefault && (
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        px: '7px',
                                        py: '2px',
                                        borderRadius: '99px',
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        fontFamily: 'Poppins, sans-serif',
                                        color: 'var(--primary-main)',
                                        background: 'var(--primary-light-bg)',
                                        border: '1px solid color-mix(in srgb, var(--primary-main) 30%, transparent)',
                                        whiteSpace: 'nowrap',
                                        lineHeight: 1,
                                    }}
                                >
                                    <Star size={10} fill="currentColor" strokeWidth={0} />
                                    Default
                                </Box>
                            )}
                        </Box>
                        {channel.channelTitle && channel.whatsappName && (
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    color: META_COLOR,
                                    fontWeight: 500,
                                    fontFamily: 'Poppins, sans-serif',
                                    lineHeight: 1.2,
                                }}
                            >
                                {channel.whatsappName}
                            </Typography>
                        )}
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: META_COLOR,
                                fontWeight: 500,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                        >
                            Mobile: {channel.mobileNumber}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: '3px' }}>
                    <Typography
                        sx={{
                            fontSize: '0.68rem',
                            color: META_COLOR,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Available
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '1.4rem',
                            fontWeight: 600,
                            color: 'var(--primary-main)',
                            letterSpacing: '-0.02em',
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        ₹{channel.balance.toLocaleString('en-IN')}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: 'var(--info-main)',
                            fontWeight: 600,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Credits: ₹{channel.refundBalance.toLocaleString('en-IN')}
                    </Typography>
                </Box>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '2px' }}>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: META_COLOR,
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Usage
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: META_COLOR,
                            fontWeight: 600,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        {Math.round(progressPercent)}%
                    </Typography>
                </Box>
                <Box
                    sx={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '99px',
                        backgroundColor: 'color-mix(in srgb, var(--text-secondary) 18%, transparent)',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: `${Math.min(progressPercent, 100)}%`,
                            height: '100%',
                            borderRadius: '99px',
                            background: 'linear-gradient(90deg, var(--primary-main), var(--success-main))',
                            transition: 'width 0.5s ease',
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: META_COLOR,
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Used: ₹{channel.used.toLocaleString('en-IN')}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: META_COLOR,
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Total: ₹{channel.totalCredits.toLocaleString('en-IN')}
                    </Typography>
                </Box>
            </Box>

            {/* Actions */}
            <Box
                sx={{
                    display: 'flex',
                    gap: '0.5rem',
                    width: '100%',
                    pt: '0.25rem',
                    alignItems: 'center',
                }}
            >
                {/* Primary action — Templates (full width, prominent) */}
                <Button
                    variant="contained"
                    disableElevation
                    onClick={() => { setActiveAction('templates'); onTemplatesClick(); }}
                    startIcon={<FileText size={16} />}
                    sx={{
                        textTransform: 'none',
                        borderRadius: '12px',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        height: '40px',
                        py: 0,
                        px: '14px',
                        minWidth: '40px',
                        flex: '1 1 auto',
                        whiteSpace: 'nowrap',
                        background: 'var(--primary-main)',
                        color: 'var(--button-color)',
                        boxShadow: 'none',
                        '&:hover': {
                            background: 'var(--primary-main)',
                            boxShadow: '0 2px 8px rgba(29, 170, 97, 0.25)',
                        },
                        '& .MuiButton-startIcon': {
                            margin: 0,
                            marginRight: '6px',
                        },
                    }}
                >
                    Templates
                </Button>

                {/* Secondary icon actions — 40x40 touch targets with tooltips */}
                <Tooltip title="Business Profile" arrow>
                    <Button
                        variant="outlined"
                        disableElevation
                        onClick={() => { setActiveAction('businessProfile'); onBusinessProfileClick(); }}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            minWidth: '40px',
                            width: '40px',
                            height: '40px',
                            p: 0,
                            flex: '0 0 40px',
                            background: activeAction === 'businessProfile' ? 'var(--primary-light-bg)' : 'transparent',
                            color: activeAction === 'businessProfile' ? 'var(--primary-main)' : 'var(--text-secondary)',
                            borderColor: 'var(--border-color)',
                            boxShadow: 'none',
                            '&:hover': {
                                background: 'var(--primary-light-bg)',
                                borderColor: 'var(--primary-main)',
                                color: 'var(--primary-main)',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        <Building2 size={18} />
                    </Button>
                </Tooltip>

                <Tooltip title="Wallet Log" arrow>
                    <Button
                        variant="outlined"
                        disableElevation
                        onClick={() => { setActiveAction('wallet'); onWalletOpen(); }}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            minWidth: '40px',
                            width: '40px',
                            height: '40px',
                            p: 0,
                            flex: '0 0 40px',
                            background: activeAction === 'wallet' ? 'var(--primary-light-bg)' : 'transparent',
                            color: activeAction === 'wallet' ? 'var(--primary-main)' : 'var(--text-secondary)',
                            borderColor: 'var(--border-color)',
                            boxShadow: 'none',
                            '&:hover': {
                                background: 'var(--primary-light-bg)',
                                borderColor: 'var(--primary-main)',
                                color: 'var(--primary-main)',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        <Wallet size={18} />
                    </Button>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default ChannelCard;
