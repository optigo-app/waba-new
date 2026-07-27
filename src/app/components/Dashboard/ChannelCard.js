'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { FileText, Wallet, Building2 } from 'lucide-react';
import { Whatsapp } from '../../assests/svg';

const ChannelCard = ({ channel, onWalletOpen, onTemplatesClick, onBusinessProfileClick }) => {
    const progressPercent = channel.progressPercent || 0;
    const [activeAction, setActiveAction] = useState('templates');
    const [hoveredAction, setHoveredAction] = useState(null);

    return (
        <Paper
            sx={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e4e8ee',
                padding: { xs: '1rem', sm: '1.5rem' },
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                    borderColor: 'rgba(29, 170, 97, 0.25)',
                },
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
                            background: 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid rgba(29,170,97,0.15)',
                        }}
                    >
                        <Whatsapp width={28} height={28} fill="#1daa61" />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <Typography
                            sx={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: '#444050',
                                lineHeight: 1.2,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                        >
                            {channel.companyCode}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: '#6D6B77',
                                fontWeight: 500,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                        >
                            Mobile: {channel.mobileNumber}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: '#6D6B77',
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
                            color: '#6D6B77',
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
                            color: '#1daa61',
                            letterSpacing: '-0.02em',
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        ₹{channel.balance.toLocaleString('en-IN')}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: '#0ea5a4',
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
                            color: '#6D6B77',
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Usage
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: '#6D6B77',
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
                        backgroundColor: '#edf2f7',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: `${Math.min(progressPercent, 100)}%`,
                            height: '100%',
                            borderRadius: '99px',
                            background: 'linear-gradient(90deg, #1daa61, #25d366)',
                            transition: 'width 0.5s ease',
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: '#6D6B77',
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                        }}
                    >
                        Used: ₹{channel.used.toLocaleString('en-IN')}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.72rem',
                            color: '#6D6B77',
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
                                background: isActive ? '#1daa61' : 'transparent',
                                color: isActive ? '#fff' : '#444050',
                                borderColor: isActive ? '#1daa61' : '#e4e8ee',
                                boxShadow: 'none',
                                transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                                '&:hover': {
                                    background: isActive ? '#1a9a57' : 'rgba(29, 170, 97, 0.04)',
                                    borderColor: '#1daa61',
                                    color: isActive ? '#fff' : '#1daa61',
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
