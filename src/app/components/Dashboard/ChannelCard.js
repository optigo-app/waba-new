'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { FileText, Wallet, Building2, Star } from 'lucide-react';
import { Whatsapp } from '../../assests/svg';

const ChannelCard = ({ channel, onWalletOpen, onTemplatesClick, onBusinessProfileClick }) => {
    const progressPercent = channel.progressPercent || 0;
    const [activeAction, setActiveAction] = useState('templates');
    const [hoveredAction, setHoveredAction] = useState(null);
    const [imgError, setImgError] = useState(false);
    const hasProfilePic = Boolean(channel.profilePictureUrl) && !imgError;

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
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                ...(channel.isDefault ? {
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-80px',
                        right: '-80px',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(29,170,97,0.15) 0%, rgba(29,170,97,0.06) 40%, transparent 70%)',
                        pointerEvents: 'none',
                        zIndex: 0,
                        transition: 'background 0.2s ease',
                    },
                    'html[data-theme="dark"] &::before': {
                        background: 'radial-gradient(circle, rgba(29,170,97,0.20) 0%, rgba(29,170,97,0.09) 40%, transparent 70%)',
                    },
                    '&:hover': {
                        boxShadow: 'var(--box-shadow)',
                        borderColor: 'var(--primary-light)',
                        '&::before': {
                            background: 'radial-gradient(circle, rgba(29,170,97,0.22) 0%, rgba(29,170,97,0.10) 40%, transparent 70%)',
                        },
                    },
                    'html[data-theme="dark"] &:hover::before': {
                        background: 'radial-gradient(circle, rgba(29,170,97,0.28) 0%, rgba(29,170,97,0.13) 40%, transparent 70%)',
                    },
                    '& > *': {
                        position: 'relative',
                        zIndex: 1,
                    },
                } : {
                    '&:hover': {
                        boxShadow: 'var(--box-shadow)',
                        borderColor: 'var(--primary-light)',
                    },
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
                                src={channel.profilePictureUrl}
                                alt={channel.whatsappName || channel.companyCode}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={() => setImgError(true)}
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
                                {channel.whatsappName || channel.companyCode}
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
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: 'var(--text-tertiary)',
                                fontWeight: 500,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                        >
                            Mobile: {channel.mobileNumber}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: 'var(--text-tertiary)',
                                fontWeight: 500,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                        >
                            WABA ID: {channel.wabaId}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: '3px' }}>
                    <Typography
                        sx={{
                            fontSize: '0.68rem',
                            color: 'var(--text-tertiary)',
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
                        Refund: ₹{channel.refundBalance.toLocaleString('en-IN')}
                    </Typography>
                </Box>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '2px' }}>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: 'var(--text-tertiary)',
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Usage
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: 'var(--text-tertiary)',
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
                        backgroundColor: 'var(--bg-light)',
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
                            color: 'var(--text-tertiary)',
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Used: ₹{channel.used.toLocaleString('en-IN')}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: 'var(--text-tertiary)',
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
                onMouseLeave={() => setHoveredAction(null)}
            >
                {[
                    { 
                        key: 'templates', 
                        label: 'Templates', 
                        icon: <FileText size={16} />, 
                        isPrimary: true,
                        onClick: () => { setActiveAction('templates'); onTemplatesClick(); },
                    },
                    { 
                        key: 'businessProfile', 
                        label: 'Business Profile', 
                        icon: <Building2 size={16} />, 
                        isPrimary: false,
                        onClick: () => { setActiveAction('businessProfile'); onBusinessProfileClick(); },
                    },
                    { 
                        key: 'wallet', 
                        label: 'Wallet Log', 
                        icon: <Wallet size={16} />, 
                        isPrimary: false,
                        onClick: () => { setActiveAction('wallet'); onWalletOpen(); },
                    },
                ].map((action) => {
                    const isExpanded = hoveredAction === action.key || activeAction === action.key;
                    const isActive = activeAction === action.key;
                    return (
                        <Button
                            key={action.key}
                            variant="outlined"
                            disableElevation
                            onClick={action.onClick}
                            onMouseEnter={() => setHoveredAction(action.key)}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '12px',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                height: '36px',
                                py: 0,
                                px: '10px',
                                minWidth: '40px',
                                flex: isExpanded ? '1 1 0%' : '0 0 40px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                background: isActive ? 'var(--primary-main)' : 'transparent',
                                color: isActive ? 'var(--button-color)' : 'var(--text-primary)',
                                borderColor: isActive ? 'var(--primary-main)' : 'var(--border-color)',
                                boxShadow: 'none',
                                transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                                '&:hover': {
                                    background: isActive ? 'var(--primary-main)' : 'var(--primary-light-bg)',
                                    borderColor: 'var(--primary-main)',
                                    color: isActive ? 'var(--button-color)' : 'var(--primary-main)',
                                    boxShadow: 'none',
                                },
                                '& .MuiButton-startIcon': {
                                    margin: 0,
                                    marginRight: 0,
                                    transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                },
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {action.icon}
                                <Box
                                    component="span"
                                    sx={{
                                        maxWidth: isExpanded ? '200px' : 0,
                                        opacity: isExpanded ? 1 : 0,
                                        marginLeft: isExpanded ? '8px' : 0,
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        transition: 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.05s, margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    {action.label}
                                </Box>
                            </Box>
                        </Button>
                    );
                })}
            </Box>
        </Paper>
    );
};

export default ChannelCard;
