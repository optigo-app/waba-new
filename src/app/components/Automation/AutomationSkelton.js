import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Skeleton,
    Stack,
    Box,
} from '@mui/material';

const SKELETON_BG = 'rgba(0, 0, 0, 0.04)';

/* ─── Card/Grid skeleton ─── */
const GridSkeleton = ({ count = 8 }) => {
    return (
        <Grid container spacing={2.5}>
            {[...Array(count)].map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                    <Card
                        sx={{
                            borderRadius: '16px',
                            height: '100%',
                            overflow: 'hidden',
                            position: 'relative',
                            background: 'linear-gradient(145deg, var(--bg-paper), var(--bg-subtle))',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        {/* Shimmer animation */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: '-150%',
                                width: '120%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                                animation: 'shimmer 1.8s infinite',
                                zIndex: 1,
                                '@keyframes shimmer': {
                                    '100%': { left: '150%' },
                                },
                            }}
                        />

                        <CardContent sx={{ position: 'relative', zIndex: 2, p: '18px 20px 16px', flex: 1 }}>
                            {/* Top Row: Name + Status */}
                            <Stack
                                direction="row"
                                sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}
                            >
                                <Skeleton
                                    variant="rounded"
                                    width="55%"
                                    height={24}
                                    animation="wave"
                                    sx={{ borderRadius: '6px', bgcolor: SKELETON_BG }}
                                />
                                <Skeleton
                                    variant="rounded"
                                    width={60}
                                    height={22}
                                    animation="wave"
                                    sx={{ borderRadius: '20px', bgcolor: SKELETON_BG }}
                                />
                            </Stack>

                            {/* Body Preview */}
                            <Box sx={{ background: 'var(--bg-subtle)', borderRadius: '10px', p: '10px 12px' }}>
                                <Stack spacing={1}>
                                    <Skeleton variant="text" width="100%" height={18} animation="wave" sx={{ bgcolor: SKELETON_BG }} />
                                </Stack>
                            </Box>
                        </CardContent>

                        {/* Action Bar */}
                        <Stack
                            direction="row"
                            sx={{
                                px: '20px',
                                pb: '14px',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'relative',
                                zIndex: 2,
                            }}
                        >
                            <Skeleton
                                variant="rounded"
                                width={50}
                                height={14}
                                animation="wave"
                                sx={{ borderRadius: '4px', bgcolor: SKELETON_BG }}
                            />
                            <Stack direction="row" spacing={0.5}>
                                <Skeleton variant="circular" width={28} height={28} animation="wave" sx={{ bgcolor: SKELETON_BG }} />
                                <Skeleton variant="circular" width={28} height={28} animation="wave" sx={{ bgcolor: SKELETON_BG }} />
                                <Skeleton variant="circular" width={28} height={28} animation="wave" sx={{ bgcolor: SKELETON_BG }} />
                            </Stack>
                        </Stack>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};

const AutomationSkelton = ({ count = 8 }) => {
    return <GridSkeleton count={count} />;
};

export default AutomationSkelton;
