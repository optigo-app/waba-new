'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Globe,
    Copy,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    ChevronRight,
    Smartphone,
} from 'lucide-react';
import { exchangeToken, saveOnboardingData } from '../../api/OnboardingApi';
import { useAuth } from '../../hooks/useAuth';

const EmbeddedSignupStep = ({ onSuccess, onBack }) => {
    const [signupData, setSignupData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    const { auth } = useAuth();
    const appUserId = auth?.userid || auth?.userId || auth?.appuserid || '';

    const addDebugLog = useCallback((message) => {
        console.log(`[EmbeddedSignup] ${message}`);
    }, []);

    useEffect(() => {
        const styleId = 'waba-embedded-signup-theme';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                :root {
                    --waba-border-radius: 16px;
                    --waba-color-primary: #1daa61;
                    --waba-color-primary-hover: #1a9a57;
                    --waba-font-family: 'Poppins', sans-serif;
                }
                .fb-embedded-signup {
                    border-radius: 16px !important;
                    overflow: hidden !important;
                }
                .fb-embedded-signup iframe {
                    border-radius: 16px !important;
                }
            `;
            document.head.appendChild(style);
        }

        if (!window.FB) {
            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: process.env.NEXT_PUBLIC_WABA_APP_ID,
                    autoLogAppEvents: true,
                    xfbml: true,
                    version: 'v24.0',
                });
                setSdkLoaded(true);
                addDebugLog('Facebook SDK loaded successfully');
            };

            const script = document.createElement('script');
            script.src = process.env.NEXT_PUBLIC_WABA_FB_SDK;
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            document.body.appendChild(script);
        } else {
            setSdkLoaded(true);
        }

        const handleMessage = (event) => {
            if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
                return;
            }

            try {
                const data = JSON.parse(event.data);
                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id } = data.data;
                        setSignupData((prev) => ({
                            ...prev,
                            phoneNumberId: phone_number_id,
                            wabaId: waba_id,
                            success: true,
                        }));
                        setLoading(false);
                    } else if (data.event === 'CANCEL') {
                        const { current_step } = data.data;
                        setError(`Signup cancelled at step: ${current_step}`);
                        setLoading(false);
                    } else if (data.event === 'ERROR') {
                        const { error_message } = data.data;
                        setError(error_message || 'An error occurred during signup');
                        setLoading(false);
                    }
                }
            } catch (e) {
                // Not JSON, ignore
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [addDebugLog]);

    // Process signup: exchange token + save credentials when all data is available
    useEffect(() => {
        const processSignup = async () => {
            console.log('[EmbeddedSignup] processSignup triggered — authCode:', !!signupData?.authCode, 'phoneId:', !!signupData?.phoneNumberId, 'wabaId:', !!signupData?.wabaId);
            if (!signupData?.authCode || !signupData?.phoneNumberId || !signupData?.wabaId) return;
            if (signupData?.apiProcessed) {
                console.log('[EmbeddedSignup] Already processed, skipping');
                return;
            }
            if (retryCount >= MAX_RETRIES) {
                setError('Maximum retry attempts reached. Please restart the signup process.');
                setIsProcessing(false);
                return;
            }

            console.log('[EmbeddedSignup] Starting token exchange...');
            setSignupData((prev) => ({ ...prev, apiProcessed: true }));
            setIsProcessing(true);
            setError(null);

            try {
                const isLocalhost = typeof window !== 'undefined' && window.location.origin.includes('localhost');
                const redirectUri = typeof window !== 'undefined'
                    ? `${window.location.origin}${isLocalhost ? '' : (auth?.redirect_version || '')}/onboarding`
                    : '';
                const exchangeRes = await exchangeToken(
                    signupData.authCode || '',
                    redirectUri || '',
                    signupData.phoneNumberId || '',
                    signupData.wabaId || ''
                );
                console.log('[EmbeddedSignup] exchangeToken response:', exchangeRes);

                if (!exchangeRes?.success) {
                    const errMsg = exchangeRes?.error || 'Token exchange failed. Please try again.';
                    setError(errMsg);
                    setSignupData((prev) => ({ ...prev, apiProcessed: false }));
                    setRetryCount((prev) => prev + 1);
                    return;
                }

                const token =
                    exchangeRes?.data?.long_lived_token ||
                    exchangeRes?.data?.short_lived_token ||
                    '';

                if (!token) {
                    setError('No access token received from Meta. Please try again.');
                    setSignupData((prev) => ({ ...prev, apiProcessed: false }));
                    setRetryCount((prev) => prev + 1);
                    return;
                }

                const credentials = {
                    companycode: auth?.companycode || auth?.CompanyCode || '',
                    verified_name:signupData.verified_name || '',
                    UserPhone: signupData.display_phone_number || '',
                    is_official_business_account:signupData.is_official_business_account || '',
                    WabaId: signupData.wabaId || '',
                    WabaPhoneNo: signupData.phoneNumberId || '',
                    AppId: process.env.NEXT_PUBLIC_WABA_APP_ID || '',
                    WabaKey: token,
                };

                console.log('[EmbeddedSignup] Saving credentials to DB...');
                const saveRes = await saveOnboardingData(appUserId, credentials);
                if (!saveRes?.success) {
                    setError('Failed to save account details. Please try again.');
                    setSignupData((prev) => ({ ...prev, apiProcessed: false }));
                    setRetryCount((prev) => prev + 1);
                    return;
                }
                console.log('[EmbeddedSignup] Account saved — calling onSuccess');
                if (onSuccess) {
                    onSuccess(credentials);
                }
            } catch (err) {
                setError('Failed to exchange token or save credentials. Please try again.');
                console.error('[EmbeddedSignup] Signup processing error:', err);
            } finally {
                setIsProcessing(false);
            }
        };

        processSignup();
    }, [signupData, appUserId, onSuccess]);

    const launchWhatsAppSignup = () => {
        if (!window.FB) {
            setError('Facebook SDK not loaded yet. Please wait a moment and try again.');
            return;
        }

        setLoading(true);
        setError(null);

        window.FB.login(
            function (response) {
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    setSignupData((prev) => ({
                        ...prev,
                        authCode: code,
                        authResponse: response.authResponse,
                    }));
                } else {
                    setError('Login was cancelled or not authorized');
                    setLoading(false);
                }
            },
            {
                config_id: process.env.NEXT_PUBLIC_WABA_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3',
                },
            }
        );
    };

    const handleCopy = async (text, field) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // Fallback for insecure contexts
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        }
    };

    const handleReset = () => {
        setSignupData(null);
        setError(null);
        setLoading(false);
        setRetryCount(0);
    };

    return (
        <Box sx={{ py: 2 }}>
            {!signupData ? (
                <Box
                    sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: '20px',
                        border: '1px solid rgba(29,170,97,0.15)',
                        background: 'linear-gradient(180deg, rgba(29,170,97,0.03), rgba(37,211,102,0.01))',
                    }}
                >
                    {!sdkLoaded && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '14px',
                                border: '1px solid #e4e8ee',
                                background: '#fff',
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <CircularProgress size={22} thickness={4} sx={{ color: '#1daa61' }} />
                            <Typography
                                sx={{
                                    fontFamily: 'Poppins, sans-serif',
                                    fontSize: '0.85rem',
                                    color: '#6D6B77',
                                }}
                            >
                                Loading Facebook SDK...
                            </Typography>
                        </Paper>
                    )}

                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, sm: 4 },
                            borderRadius: '18px',
                            border: '1px solid #e4e8ee',
                            background: '#fff',
                            textAlign: 'center',
                            transition: 'all 0.25s ease',
                            '&:hover': {
                                borderColor: 'rgba(29,170,97,0.3)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                            },
                        }}
                    >
                        <Box
                            sx={{
                                width: 64,
                                height: 64,
                                borderRadius: '20px',
                                background: 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2.5,
                                border: '1px solid rgba(29,170,97,0.18)',
                            }}
                        >
                            <Smartphone size={28} color="#1daa61" />
                        </Box>
                        <Typography
                            sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '1.05rem',
                                color: '#444050',
                                mb: 1,
                            }}
                        >
                            Connect WhatsApp Business
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.82rem',
                                color: '#6D6B77',
                                mb: 3,
                                maxWidth: 320,
                                mx: 'auto',
                                lineHeight: 1.6,
                            }}
                        >
                            Launch the secure Facebook login to link your WhatsApp Business Account automatically.
                        </Typography>
                        <Button
                            variant="contained"
                            disableElevation
                            onClick={launchWhatsAppSignup}
                            disabled={loading || !sdkLoaded}
                            startIcon={
                                loading ? (
                                    <CircularProgress size={18} color="inherit" />
                                ) : (
                                    <Globe size={18} />
                                )
                            }
                            sx={{
                                textTransform: 'none',
                                borderRadius: '14px',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                background: '#1daa61',
                                color: '#fff',
                                px: 4,
                                py: 1.25,
                                boxShadow: '0 4px 16px rgba(29,170,97,0.3)',
                                '&:hover': {
                                    background: '#1a9a57',
                                    boxShadow: '0 6px 20px rgba(29,170,97,0.4)',
                                },
                                '&:disabled': {
                                    background: '#e4e8ee',
                                    color: '#a0a0a0',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {loading ? 'Opening Signup...' : 'Launch Embedded Signup'}
                        </Button>
                        <Typography
                            sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.75rem',
                                color: '#a0a0a0',
                                mt: 2,
                            }}
                        >
                            {sdkLoaded
                                ? 'Powered by Facebook Embedded Signup'
                                : 'Please wait for the SDK to load...'}
                        </Typography>
                    </Paper>
                </Box>
            ) : (
                <>
                    <Alert
                        severity="success"
                        sx={{
                            mb: 3,
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '0.85rem',
                        }}
                        icon={<CheckCircle2 size={22} />}
                    >
                        Successfully connected to WhatsApp Business!
                    </Alert>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                        {signupData.phoneNumberId && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    border: '1px solid #e4e8ee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '0.7rem',
                                            color: '#6D6B77',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            mb: 0.5,
                                        }}
                                    >
                                        Phone Number ID
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '0.88rem',
                                            fontWeight: 600,
                                            color: '#444050',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {signupData.phoneNumberId}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => handleCopy(signupData.phoneNumberId, 'phoneId')}
                                    startIcon={copiedField === 'phoneId' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#1daa61',
                                        borderColor: '#1daa61',
                                        border: '1px solid',
                                        minWidth: 'auto',
                                        px: 1.5,
                                        py: 0.5,
                                        '&:hover': {
                                            background: 'rgba(29,170,97,0.06)',
                                        },
                                    }}
                                >
                                    {copiedField === 'phoneId' ? 'Copied' : 'Copy'}
                                </Button>
                            </Paper>
                        )}

                        {signupData.wabaId && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    border: '1px solid #e4e8ee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '0.7rem',
                                            color: '#6D6B77',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            mb: 0.5,
                                        }}
                                    >
                                        WABA ID
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '0.88rem',
                                            fontWeight: 600,
                                            color: '#444050',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {signupData.wabaId}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => handleCopy(signupData.wabaId, 'wabaId')}
                                    startIcon={copiedField === 'wabaId' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#1daa61',
                                        borderColor: '#1daa61',
                                        border: '1px solid',
                                        minWidth: 'auto',
                                        px: 1.5,
                                        py: 0.5,
                                        '&:hover': {
                                            background: 'rgba(29,170,97,0.06)',
                                        },
                                    }}
                                >
                                    {copiedField === 'wabaId' ? 'Copied' : 'Copy'}
                                </Button>
                            </Paper>
                        )}

                        {signupData.authCode && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    border: '1px solid #e4e8ee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '0.7rem',
                                            color: '#6D6B77',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            mb: 0.5,
                                        }}
                                    >
                                        Authorization Code
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '0.82rem',
                                            fontWeight: 500,
                                            color: '#444050',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {signupData.authCode}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => handleCopy(signupData.authCode, 'authCode')}
                                    startIcon={copiedField === 'authCode' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#1daa61',
                                        borderColor: '#1daa61',
                                        border: '1px solid',
                                        minWidth: 'auto',
                                        px: 1.5,
                                        py: 0.5,
                                        '&:hover': {
                                            background: 'rgba(29,170,97,0.06)',
                                        },
                                    }}
                                >
                                    {copiedField === 'authCode' ? 'Copied' : 'Copy'}
                                </Button>
                            </Paper>
                        )}
                    </Box>

                    <Button
                        variant="outlined"
                        onClick={handleReset}
                        fullWidth
                        sx={{
                            textTransform: 'none',
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: '#6D6B77',
                            borderColor: '#e4e8ee',
                            py: 1,
                            '&:hover': {
                                borderColor: '#1daa61',
                                color: '#1daa61',
                                background: 'rgba(29,170,97,0.04)',
                            },
                        }}
                    >
                        <RefreshCw size={16} style={{ marginRight: 8 }} />
                        Connect Another Account
                    </Button>
                </>
            )}

            {error && (
                <Alert
                    severity="error"
                    sx={{
                        mt: 2,
                        borderRadius: '12px',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '0.82rem',
                    }}
                    icon={<AlertTriangle size={20} />}
                >
                    {error}
                </Alert>
            )}

            {onBack && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
                    <Button
                        onClick={onBack}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '10px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 500,
                            color: '#6D6B77',
                        }}
                    >
                        <ChevronRight size={16} style={{ transform: 'rotate(180deg)', marginRight: 4 }} />
                        Back
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default EmbeddedSignupStep;
