'use client';

import React from 'react';
import { Box, Typography, Button, Paper, Tooltip } from '@mui/material';
import { Mail, FileText, Send, AtSign } from 'lucide-react';

// ── Static prototype data — swap with the real channel API later ─────────────
export const EMAIL_CHANNEL = {
    id: 'email-static',
    title: 'Email Broadcast',
    sender: 'noreply@yourbrand.com',
    provider: 'SMTP',
    status: 'Connected',
};

const META_COLOR = 'var(--text-secondary)';

const EmailChannelCard = ({ channel = EMAIL_CHANNEL, onTemplatesClick }) => (
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
            height: '100%',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
                boxShadow: 'var(--box-shadow)',
                borderColor: 'color-mix(in srgb, #7367f0 35%, transparent)',
            },
        }}
    >
        {/* Top Row: Icon + Info | Status */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                <Box
                    sx={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(115,103,240,0.14), rgba(115,103,240,0.30))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(115,103,240,0.20)',
                    }}
                >
                    <Mail size={28} color="#7367f0" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
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
                            {channel.title}
                        </Typography>
                        <Box
                            component="span"
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
                                color: '#7367f0',
                                background: 'rgba(115,103,240,0.10)',
                                border: '1px solid rgba(115,103,240,0.28)',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                            }}
                        >
                            Email
                        </Box>
                    </Box>
                    <Typography
                        sx={{
                            fontSize: '0.7rem',
                            color: META_COLOR,
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                            lineHeight: 1.2,
                        }}
                    >
                        {channel.provider} channel
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.75rem',
                            color: META_COLOR,
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <AtSign size={12} />
                        {channel.sender}
                    </Typography>
                </Box>
            </Box>
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    fontFamily: 'Poppins, sans-serif',
                    color: 'var(--success-main)',
                    flexShrink: 0,
                }}
            >
                <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-main)' }} />
                {channel.status}
            </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: '0.5rem', width: '100%', mt: 'auto', alignItems: 'center' }}>
            <Button
                variant="contained"
                disableElevation
                onClick={onTemplatesClick}
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
                    background: '#7367f0',
                    color: 'var(--button-color)',
                    boxShadow: 'none',
                    '&:hover': {
                        background: '#7367f0',
                        boxShadow: '0 2px 8px rgba(115, 103, 240, 0.30)',
                    },
                    '& .MuiButton-startIcon': { margin: 0, marginRight: '6px' },
                }}
            >
                Email Templates
            </Button>

            <Tooltip title="Email broadcasts — coming soon" arrow>
                <span>
                    <Button
                        variant="outlined"
                        disableElevation
                        disabled
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
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-color)',
                            boxShadow: 'none',
                        }}
                    >
                        <Send size={18} />
                    </Button>
                </span>
            </Tooltip>
        </Box>
    </Paper>
);

export default EmailChannelCard;
