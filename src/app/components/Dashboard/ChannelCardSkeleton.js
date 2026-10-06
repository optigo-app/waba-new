import React from 'react';
import { Box, Skeleton, Paper, Divider } from '@mui/material';

const ChannelCardSkeleton = ({ count = 1 }) => {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '1.5rem', '@media (max-width: 1535.98px)': { gridTemplateColumns: 'repeat(2, 1fr)' }, '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } }}>
            {[...Array(count)].map((_, index) => (
                <Paper
                    key={index}
                    sx={{
                        background: 'var(--bg-paper)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        padding: '1.5rem',
                        boxShadow: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {/* Shimmer animation overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: '-150%',
                            width: '120%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, var(--skeleton-shimmer), transparent)',
                            animation: 'shimmer 1.8s infinite',
                            zIndex: 1,
                            '@keyframes shimmer': {
                                '100%': {
                                    left: '150%',
                                },
                            },
                        }}
                    />

                    {/* Top Row: Icon + Name | Balance */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', position: 'relative', zIndex: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                            <Skeleton
                                variant="rounded"
                                width={52}
                                height={52}
                                animation="wave"
                                sx={{ borderRadius: '14px', bgcolor: 'var(--skeleton-bg)' }}
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <Skeleton
                                    variant="text"
                                    width={120}
                                    height={20}
                                    animation="wave"
                                    sx={{ bgcolor: 'var(--skeleton-bg)' }}
                                />
                                <Skeleton
                                    variant="text"
                                    width={140}
                                    height={14}
                                    animation="wave"
                                    sx={{ bgcolor: 'var(--skeleton-bg)' }}
                                />
                                <Skeleton
                                    variant="text"
                                    width={100}
                                    height={14}
                                    animation="wave"
                                    sx={{ bgcolor: 'var(--skeleton-bg)' }}
                                />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <Skeleton
                                variant="text"
                                width={110}
                                height={12}
                                animation="wave"
                                sx={{ bgcolor: 'var(--skeleton-bg)' }}
                            />
                            <Skeleton
                                variant="text"
                                width={80}
                                height={24}
                                animation="wave"
                                sx={{ bgcolor: 'var(--skeleton-bg)' }}
                            />
                            <Skeleton
                                variant="text"
                                width={70}
                                height={14}
                                animation="wave"
                                sx={{ bgcolor: 'var(--skeleton-bg)' }}
                            />
                        </Box>
                    </Box>

                    {/* Progress Bar */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', zIndex: 2 }}>
                        <Skeleton
                            variant="rounded"
                            width="100%"
                            height={12}
                            animation="wave"
                            sx={{ borderRadius: '99px', bgcolor: 'var(--skeleton-bg)' }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Skeleton
                                variant="text"
                                width={80}
                                height={18}
                                animation="wave"
                                sx={{ bgcolor: 'var(--skeleton-bg)' }}
                            />
                            <Skeleton
                                variant="text"
                                width={70}
                                height={18}
                                animation="wave"
                                sx={{ bgcolor: 'var(--skeleton-bg)' }}
                            />
                        </Box>
                    </Box>

                    {/* Divider */}
                    <Divider />

                    {/* Bottom Actions */}
                    <Box sx={{ display: 'flex', gap: '0.75rem', width: '100%', position: 'relative', zIndex: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <Skeleton
                            variant="rounded"
                            width="100%"
                            height={36}
                            animation="wave"
                            sx={{ borderRadius: '8px', bgcolor: 'var(--skeleton-bg)' }}
                        />
                        <Skeleton
                            variant="rounded"
                            width="100%"
                            height={36}
                            animation="wave"
                            sx={{ borderRadius: '8px', bgcolor: 'var(--skeleton-bg)' }}
                        />
                    </Box>
                </Paper>
            ))}
        </Box>
    );
};

export default ChannelCardSkeleton;
