'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Paper,
    Fade,
} from '@mui/material';
import {
    Plus,
    MessageCircle,
    ArrowLeft,
    X,
    CheckCircle2,
} from 'lucide-react';
import EmbeddedSignupStep from '../components/Dashboard/EmbeddedSignupStep';
import ConfettiCanvas from '../components/Dashboard/ConfettiCanvas';
import { playCelebrationSound } from '../utils/celebrationSound';

export default function OnboardingPage() {
    const router = useRouter();
    const [activeStep, setActiveStep] = useState(0);
    const [completedData, setCompletedData] = useState(null);

    const handleSignupSuccess = useCallback((data) => {
        setCompletedData(data);
        setActiveStep(1);
        playCelebrationSound();
    }, []);

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep((prev) => prev - 1);
        }
    };

    const handleFinish = () => {
        router.push('/');
    };

    const handleCancel = () => {
        router.back();
    };

    const renderStepContent = () => {
        if (activeStep === 0) {
            return (
                <EmbeddedSignupStep
                    onSuccess={handleSignupSuccess}
                />
            );
        }

        if (activeStep === 1) {
            return (
                <Box sx={{ position: 'relative', py: 4, textAlign: 'center' }}>
                    <ConfettiCanvas active={activeStep === 1} duration={3500} />
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(29,170,97,0.2)',
                            mx: 'auto',
                            mb: 2.5,
                            position: 'relative',
                            zIndex: 2,
                        }}
                    >
                        <CheckCircle2 size={36} color="#1daa61" />
                    </Box>
                    <Typography
                        sx={{
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            fontSize: '1.15rem',
                            color: '#444050',
                            mb: 1,
                            position: 'relative',
                            zIndex: 2,
                        }}
                    >
                        Channel Connected!
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '0.85rem',
                            color: '#6D6B77',
                            mb: 3,
                            maxWidth: 360,
                            mx: 'auto',
                            lineHeight: 1.6,
                            position: 'relative',
                            zIndex: 2,
                        }}
                    >
                        Your WhatsApp Business account has been connected successfully.
                        You can now create templates and send messages.
                    </Typography>

                    {completedData && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '14px',
                                border: '1px solid #e4e8ee',
                                background: '#fafafa',
                                maxWidth: 360,
                                mx: 'auto',
                                mb: 3,
                                textAlign: 'left',
                                position: 'relative',
                                zIndex: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <MessageCircle size={16} color="#1daa61" />
                                <Typography
                                    sx={{
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        color: '#444050',
                                    }}
                                >
                                    Account Details
                                </Typography>
                            </Box>
                            {completedData.WabaPhoneNo && (
                                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', color: '#6D6B77', mb: 0.5 }}>
                                    <strong>Phone Number ID:</strong> {completedData.WabaPhoneNo}
                                </Typography>
                            )}
                            {completedData.WabaId && (
                                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', color: '#6D6B77', mb: 0.5 }}>
                                    <strong>WABA ID:</strong> {completedData.WabaId}
                                </Typography>
                            )}
                            {completedData.companycode && (
                                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', color: '#6D6B77' }}>
                                    <strong>Company:</strong> {completedData.companycode}
                                </Typography>
                            )}
                        </Paper>
                    )}

                    <Button
                        variant="contained"
                        disableElevation
                        onClick={handleFinish}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            background: '#1daa61',
                            px: 4,
                            py: 1,
                            boxShadow: 'none',
                            position: 'relative',
                            zIndex: 2,
                            '&:hover': { background: '#1a9a57', boxShadow: 'none' },
                        }}
                    >
                        Get Started
                    </Button>
                </Box>
            );
        }

        return null;
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, sm: 3, md: 4 },
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 720,
                    background: '#fff',
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    minHeight: activeStep === 0 ? 560 : 440,
                    transition: 'min-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: { xs: 2, sm: 3 },
                        pb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #1daa61, #25d366)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Plus size={20} color="#fff" />
                        </Box>
                        <Typography
                            sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '1.25rem',
                                color: '#444050',
                            }}
                        >
                            Add New Channel
                        </Typography>
                    </Box>
                    <Button
                        onClick={handleCancel}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '10px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 500,
                            color: '#6D6B77',
                            fontSize: '0.85rem',
                            minWidth: 'auto',
                            p: '6px 12px',
                        }}
                    >
                        <X size={16} />
                    </Button>
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, px: { xs: 2, sm: 3 }, py: 2, overflow: 'auto' }}>
                    <Fade in timeout={350} key={`step-${activeStep}`} unmountOnExit>
                        <Box>
                            {renderStepContent()}
                        </Box>
                    </Fade>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        px: { xs: 2, sm: 3 },
                        pb: 3,
                        pt: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #f0f0f0',
                    }}
                >
                    {activeStep === 1 ? (
                        <Button
                            onClick={handleBack}
                            startIcon={<ArrowLeft size={16} />}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '10px',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 500,
                                color: '#6D6B77',
                                fontSize: '0.85rem',
                            }}
                        >
                            Back
                        </Button>
                    ) : (
                        <Box />
                    )}
                    <Button
                        onClick={handleCancel}
                        startIcon={activeStep === 1 ? <X size={16} /> : null}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '10px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 500,
                            color: '#6D6B77',
                            fontSize: '0.85rem',
                        }}
                    >
                        {activeStep === 1 ? 'Close' : 'Cancel'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
