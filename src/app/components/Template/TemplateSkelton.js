// LoadingSkeleton.jsx

import React from "react";
import {
    Grid,
    Card,
    CardContent,
    Skeleton,
    Stack,
    Box,
} from "@mui/material";

const TemplateSkelton = ({ count = 4 }) => {
    return (
        <Grid container spacing={2}>
            {[...Array(count)].map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                    <Card
                        sx={{
                            borderRadius: "18px",
                            height: "100%",
                            overflow: "hidden",
                            position: "relative",
                            background:
                                "linear-gradient(145deg, var(--bg-paper), var(--bg-subtle))",

                            // Better shadow
                            boxShadow:
                                "0 4px 20px rgba(0, 0, 0, 0.04)",

                            border: "1px solid rgba(0,0,0,0.05)",

                            transition: "all 0.3s ease",
                        }}
                    >
                        {/* Top shimmer animation */}
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: "-150%",
                                width: "120%",
                                height: "100%",
                                background:
                                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                                animation: "shimmer 1.8s infinite",
                                zIndex: 1,

                                "@keyframes shimmer": {
                                    "100%": {
                                        left: "150%",
                                    },
                                },
                            }}
                        />

                        <CardContent
                            sx={{
                                position: "relative",
                                zIndex: 2,
                                p: 2.5,
                            }}
                        >
                            {/* Header */}
                            <Stack
                                direction="row"
                                sx={{mb: 3, justifyContent: 'space-between', alignItems: 'center'}}
                            >
                                <Skeleton
                                    variant="rounded"
                                    width="58%"
                                    height={32}
                                    animation="wave"
                                    sx={{ borderRadius: "8px", bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />

                                <Skeleton
                                    variant="rounded"
                                    width={70}
                                    height={28}
                                    animation="wave"
                                    sx={{ borderRadius: "20px", bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />
                            </Stack>

                            {/* Meta chips */}
                            <Stack direction="row" spacing={1} sx={{my:1}}>
                                <Skeleton
                                    variant="rounded"
                                    width={90}
                                    height={30}
                                    animation="wave"
                                    sx={{ borderRadius: "20px", bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />

                                <Skeleton
                                    variant="rounded"
                                    width={75}
                                    height={30}
                                    animation="wave"
                                    sx={{ borderRadius: "20px", bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />
                            </Stack>

                            {/* Large content area */}
                            <Stack spacing={1.5}>
                                <Skeleton
                                    variant="text"
                                    width="100%"
                                    height={28}
                                    animation="wave"
                                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />

                                <Skeleton
                                    variant="text"
                                    width="100%"
                                    height={28}
                                    animation="wave"
                                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />

                                <Skeleton
                                    variant="text"
                                    width="95%"
                                    height={28}
                                    animation="wave"
                                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />
                            </Stack>

                            {/* Footer */}
                            <Stack
                                direction="row"
                                sx={{mt: 4, justifyContent: 'space-between', alignItems: 'center'}}
                                spacing={1}
                            >
                                <Skeleton
                                    variant="rounded"
                                    width={100}
                                    height={34}
                                    animation="wave"
                                    sx={{ borderRadius: "10px", bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />

                                <Skeleton
                                    variant="rounded"
                                    width={100}
                                    height={34}
                                    animation="wave"
                                    sx={{ borderRadius: "10px", bgcolor: 'rgba(0, 0, 0, 0.03)' }}
                                />

                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};

export default TemplateSkelton;