'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,
    Grid,
    CircularProgress,
    Divider,
    IconButton,
} from '@mui/material';
import {
    QrCode,
    Download,
    Printer,
    Phone,
    MessageCircle,
    Zap,
    Clock,
    RefreshCw,
    ExternalLink,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import toast from 'react-hot-toast';
import { getStaticUrl, normalizeMobileNumber } from '../../utils/globalFunc';
import { useAuth } from '../../hooks/useAuth';
import { getFlyerTemplate } from './FlyerTemplate';
import { getStandeeTemplate } from './StandeeTemplate';
import styles from './QRGenerator.module.scss';

const WHATSAPP_GREEN = '#25D366';
const WHATSAPP_DARK = '#0F6A44';

const phoneInputStyles = {
    input: {
        width: '100%',
        height: '40px',
        fontSize: '0.875rem',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        color: '#444050',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '500'
    },
    button: {
        border: '1px solid #e2e8f0',
        borderRadius: '10px 0 0 10px',
        backgroundColor: '#f8fafc'
    },
    dropdown: {
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        zIndex: 1,
        fontFamily: 'Inter, sans-serif'
    },
    search: {
        margin: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '0.875rem'
    },
    container: {
        marginBottom: '0.5rem',
        width: '100%'
    }
};

// Format phone number with proper spacing (e.g., +91 89481 84848)
const formatPhoneNumber = (digits) => {
    if (!digits) return '';
    const cleaned = digits.replace(/\D/g, '');
    if (cleaned.length <= 10) {
        return `+${cleaned}`;
    }
    // For Indian numbers: +91 89481 84848
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    // Default: add space after country code
    if (cleaned.length > 10) {
        const countryCodeLen = cleaned.length - 10;
        return `+${cleaned.slice(0, countryCodeLen)} ${cleaned.slice(countryCodeLen)}`;
    }
    return `+${cleaned}`;
};

const QRGenerator = () => {
    const { auth } = useAuth();

    // Prefill mobile number from logged-in user's auth.mobileno
    const initialMobile = auth?.mobileno ? normalizeMobileNumber(auth.mobileno) : '';
    const [phoneData, setPhoneData] = useState({ phone: initialMobile, countryCode: '' });
    const [rawPhone, setRawPhone] = useState(initialMobile);
    const [phoneError, setPhoneError] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [whatsappLink, setWhatsappLink] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    // Branding fields
    const [brandName, setBrandName] = useState('');
    const [headline, setHeadline] = useState('Connect with Us on WhatsApp Instantly!');
    const [tagline, setTagline] = useState('Scan the QR Code and start chatting with us on WhatsApp.');
    const [logoFile, setLogoFile] = useState(null);
    const [logoDataUrl, setLogoDataUrl] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [designType, setDesignType] = useState('flyer'); // 'flyer' | 'standee'

    const flyerRef = useRef(null);
    const logoDropRef = useRef(null);

    // ── Validation ──────────────────────────────────────────────────────────
    const validatePhone = useCallback((phone, country) => {
        if (!phone || phone.trim().length === 0) {
            return 'Mobile number is required';
        }
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 8) {
            return 'Mobile number is too short';
        }
        if (digitsOnly.length > 15) {
            return 'Mobile number is too long';
        }
        if (country && country.format) {
            const formatPattern = country.format.replace(/\./g, '\\d').replace(/\D/g, '');
            if (formatPattern) {
                const regex = new RegExp(`^${formatPattern}$`);
                if (!regex.test(digitsOnly)) {
                    return `Please enter a valid ${country.name} phone number`;
                }
            }
        }
        return '';
    }, []);

    const handlePhoneChange = (value, country) => {
        setPhoneData({ phone: value, countryCode: country?.dialCode || '' });
        setRawPhone(value);
        if (phoneError) {
            const err = validatePhone(value, country);
            setPhoneError(err);
        }
    };

    // ── QR Generation ───────────────────────────────────────────────────────
    const generateQR = useCallback(async () => {
        const err = validatePhone(phoneData.phone, null);
        if (err) {
            setPhoneError(err);
            toast.error(err);
            return;
        }

        const digitsOnly = phoneData.phone.replace(/\D/g, '');
        const link = `https://wa.me/${digitsOnly}?text=Hi`;

        setIsGenerating(true);
        setPhoneError('');

        try {
            const dataUrl = await QRCode.toDataURL(link, {
                width: 512,
                margin: 2,
                color: {
                    dark: WHATSAPP_DARK,
                    light: '#ffffff',
                },
                errorCorrectionLevel: 'H',
            });
            setQrDataUrl(dataUrl);
            setWhatsappLink(link);
            setHasGenerated(true);
            toast.success('QR code generated successfully!');
        } catch (e) {
            toast.error('Failed to generate QR code');
        } finally {
            setIsGenerating(false);
        }
    }, [phoneData, validatePhone]);

    const handleLogoFile = useCallback((file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setLogoDataUrl(reader.result);
            setLogoFile(file);
        };
        reader.onerror = () => toast.error('Failed to read image');
        reader.readAsDataURL(file);
    }, []);

    const handleLogoDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleLogoFile(file);
    }, [handleLogoFile]);

    const handleLogoDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleLogoDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleLogoPaste = useCallback((e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    handleLogoFile(file);
                    e.preventDefault();
                    break;
                }
            }
        }
    }, [handleLogoFile]);

    // Global paste listener — works even when the drop zone is not focused
    useEffect(() => {
        const onGlobalPaste = (e) => {
            if (!logoDropRef.current) return;
            // Only handle if the paste target is not an input/textarea (don't hijack text fields)
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        handleLogoFile(file);
                        e.preventDefault();
                        break;
                    }
                }
            }
        };
        window.addEventListener('paste', onGlobalPaste);
        return () => window.removeEventListener('paste', onGlobalPaste);
    }, [handleLogoFile]);

    const handleReset = () => {
        setPhoneData({ phone: initialMobile, countryCode: '' });
        setRawPhone(initialMobile);
        setQrDataUrl('');
        setWhatsappLink('');
        setPhoneError('');
        setHasGenerated(false);
        setLogoFile(null);
        setLogoDataUrl('');
        setDesignType('flyer');
    };

    // ── Print ───────────────────────────────────────────────────────────────
    const handlePrint = useCallback(async () => {
        if (!qrDataUrl || !flyerRef.current) return;

        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            toast.error('Please allow pop-ups to print');
            return;
        }

        try {
            const canvas = await html2canvas(flyerRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>WhatsApp QR Print</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: #fff; }
@page { size: ${imgWidth}px ${imgHeight}px; margin: 0; }
body { display: flex; justify-content: center; align-items: center; }
.print-img { width: ${imgWidth}px; height: ${imgHeight}px; display: block; }
@media print {
    body { display: block; }
    .print-img { max-width: 100%; max-height: 100vh; }
}
</style>
</head>
<body>
<img class="print-img" src="${imgData}" alt="QR Print" onload="window.print(); setTimeout(function(){ window.close(); }, 500);" />
</body>
</html>`);
            printWindow.document.close();
        } catch (e) {
            console.error('Print error:', e);
            toast.error('Failed to prepare print');
            printWindow.close();
        }
    }, [qrDataUrl]);

    // ── PDF Download ─────────────────────────────────────────────────────────
    const handleDownloadPDF = useCallback(async () => {
        if (!qrDataUrl || !flyerRef.current) return;

        try {
            const digitsOnly = phoneData.phone.replace(/\D/g, '');

            // Capture the flyer preview element as canvas
            const canvas = await html2canvas(flyerRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = 210;
            const pageHeight = 297;

            // Calculate dimensions to fit the flyer on one A4 page
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // If the image is taller than the page, scale to fit
            let finalWidth = imgWidth;
            let finalHeight = imgHeight;
            if (imgHeight > pageHeight) {
                finalHeight = pageHeight;
                finalWidth = (canvas.width * finalHeight) / canvas.height;
            }

            const xOffset = (pageWidth - finalWidth) / 2;
            const yOffset = 0;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
            pdf.save(`whatsapp-qr-${digitsOnly}.pdf`);
            toast.success('PDF downloaded successfully!');
        } catch (e) {
            console.error('PDF generation error:', e);
            toast.error('Failed to generate PDF');
        }
    }, [qrDataUrl, phoneData]);

    const digitsOnly = phoneData.phone.replace(/\D/g, '');

    return (
        <Box className={styles.qrGeneratorPage}>
            {/* ── Page Header ── */}
            <Box className={styles.pageHeader}>
                <Box className={styles.pageHeaderLeft}>
                    <Box className={styles.pageHeaderIcon}>
                        <QrCode size={18} />
                    </Box>
                    <Box>
                        <Typography component="h2" className={styles.pageTitle}>
                            WhatsApp QR Generator
                        </Typography>
                        <Typography component="p" className={styles.pageSubtitle}>
                            Create and export a marketing-ready WhatsApp flyer
                        </Typography>
                    </Box>
                </Box>
                <Box className={styles.headerActions}>
                    <Box className={styles.designToggle}>
                        <Button
                            size="small"
                            variant={designType === 'flyer' ? 'contained' : 'outlined'}
                            onClick={() => setDesignType('flyer')}
                            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                        >
                            Flyer
                        </Button>
                        <Button
                            size="small"
                            variant={designType === 'standee' ? 'contained' : 'outlined'}
                            onClick={() => setDesignType('standee')}
                            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                        >
                            Standee
                        </Button>
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handlePrint}
                        disabled={!hasGenerated}
                        startIcon={<Printer size={15} />}
                    >
                        Print
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleDownloadPDF}
                        disabled={!hasGenerated}
                        startIcon={<Download size={15} />}
                    >
                        Download PDF
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        href={hasGenerated ? whatsappLink : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        disabled={!hasGenerated}
                        startIcon={<ExternalLink size={15} />}
                    >
                        Test Link
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3} className={styles.mainGrid}>
                {/* ── Left: Input Form ── */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper className={styles.formCard}>
                        <Typography variant="h6" className={styles.sectionTitle}>
                            <Phone size={18} /> Mobile Number
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Box className={styles.phoneInputWrapper}>
                            <Typography component="label" htmlFor="qr-mobile-number" className={styles.fieldLabel}>
                                Mobile number <span className={styles.requiredMark}>*</span>
                            </Typography>
                            <PhoneInput
                                country={'in'}
                                value={rawPhone}
                                onChange={handlePhoneChange}
                                enableSearch={true}
                                countryCodeEditable={true}
                                inputProps={{
                                    id: 'qr-mobile-number',
                                    name: 'phone',
                                    required: true,
                                    autoFocus: true,
                                }}
                                inputStyle={{
                                    ...phoneInputStyles.input,
                                    borderColor: phoneError ? '#ef4444' : '#e2e8f0',
                                    boxShadow: phoneError ? '0 0 0 1px #ef4444' : 'none',
                                }}
                                buttonStyle={phoneInputStyles.button}
                                dropdownStyle={phoneInputStyles.dropdown}
                                searchStyle={phoneInputStyles.search}
                                containerStyle={phoneInputStyles.container}
                            />
                            <Typography className={styles.fieldHint}>
                                Select a country code and enter the complete number.
                            </Typography>
                            {phoneError && (
                                <Typography className={styles.errorText}>
                                    {phoneError}
                                </Typography>
                            )}
                        </Box>

                        <Typography variant="h6" className={styles.sectionTitle} sx={{ mt: 3 }}>
                            <Sparkles size={18} /> Branding
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Box className={styles.fieldGroup}>
                            <Box className={styles.fieldControl}>
                                <Typography component="label" htmlFor="qr-brand-name" className={styles.fieldLabel}>
                                    Brand / Company name
                                </Typography>
                                <TextField
                                    id="qr-brand-name"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="e.g. Optigo Solutions"
                                />
                            </Box>
                            <Box className={styles.fieldControl}>
                                <Typography component="label" htmlFor="qr-headline" className={styles.fieldLabel}>
                                    Headline
                                </Typography>
                                <TextField
                                    id="qr-headline"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="Connect with Us on WhatsApp Instantly!"
                                />
                            </Box>
                            <Box className={styles.fieldControl}>
                                <Typography component="label" htmlFor="qr-tagline" className={styles.fieldLabel}>
                                    Tagline / Call to action
                                </Typography>
                                <TextField
                                    id="qr-tagline"
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={3}
                                    placeholder="Scan the QR Code and start chatting with us on WhatsApp."
                                />
                            </Box>
                            <Box className={styles.fieldControl}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Logo <span className={styles.optionalLabel}>Optional — upload, drag & drop, or paste</span>
                                </Typography>
                                <Box
                                    ref={logoDropRef}
                                    onDrop={handleLogoDrop}
                                    onDragOver={handleLogoDragOver}
                                    onDragLeave={handleLogoDragLeave}
                                    onPaste={handleLogoPaste}
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        border: isDragOver ? '2px dashed #25D366' : '2px dashed #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        transition: 'border-color 0.2s',
                                        backgroundColor: isDragOver ? 'rgba(37, 211, 102, 0.05)' : 'transparent',
                                    }}
                                >
                                    <Button
                                        component="label"
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Upload size={16} />}
                                        sx={{ flexShrink: 0, textTransform: 'none' }}
                                    >
                                        {logoFile ? 'Change' : 'Upload'}
                                        <input
                                            hidden
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                handleLogoFile(e.target.files[0]);
                                                e.target.value = '';
                                            }}
                                        />
                                    </Button>
                                    {logoFile ? (
                                        <Typography variant="caption" sx={{ color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {logoFile.name}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" sx={{ color: '#94a3b8', flex: 1 }}>
                                            Drop image here or paste (Ctrl+V)
                                        </Typography>
                                    )}
                                    {logoDataUrl && (
                                        <IconButton size="small" onClick={() => { setLogoFile(null); setLogoDataUrl(''); }}>
                                            <X size={16} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Box className={styles.actionButtons}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={generateQR}
                                disabled={isGenerating}
                                startIcon={isGenerating ? <CircularProgress size={18} color="inherit" /> : <QrCode size={18} />}
                                className={styles.generateBtn}
                            >
                                {isGenerating ? 'Generating...' : 'Generate QR Code'}
                            </Button>
                            {hasGenerated && (
                                <Button
                                    variant="outlined"
                                    onClick={handleReset}
                                    startIcon={<RefreshCw size={16} />}
                                >
                                    Reset
                                </Button>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* ── Right: Flyer Preview ── */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper className={styles.previewCard}>
                        {!hasGenerated ? (
                            <Box className={styles.emptyPreview}>
                                <Box className={styles.emptyPreviewIcon}>
                                    <QrCode size={48} color={WHATSAPP_GREEN} />
                                </Box>
                                <Typography className={styles.emptyPreviewTitle}>
                                    QR Code Preview
                                </Typography>
                                <Typography className={styles.emptyPreviewText}>
                                    Enter a mobile number and click "Generate QR Code" to see the preview here.
                                </Typography>
                            </Box>
                        ) : designType === 'standee' ? (
                            <Box className={styles.standeeCard} ref={flyerRef}>
                                {/* SVG Gradient Definition */}
                                <svg width="0" height="0" style={{ position: 'absolute' }}>
                                    <defs>
                                        <linearGradient id="waGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                                            <stop offset="0%" stopColor="rgba(37, 211, 102, 0.85)" />
                                            <stop offset="100%" stopColor="#1daa61" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* Top Corner Accents */}
                                <svg className={`${styles.standeeAccentSvg} ${styles.standeeAccentLeft}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0 0H40L0 40V0Z" fill="url(#waGrad)" />
                                    <path d="M45 0H65L0 65V45L45 0Z" fill="url(#waGrad)" opacity="0.8" />
                                    <path d="M70 0H85L0 85V70L70 0Z" fill="url(#waGrad)" opacity="0.5" />
                                    <rect x="5" y="75" width="12" height="12" fill="url(#waGrad)" transform="rotate(45 5 75)" />
                                    <rect x="75" y="5" width="10" height="10" fill="url(#waGrad)" transform="rotate(45 75 5)" />
                                </svg>
                                <svg className={`${styles.standeeAccentSvg} ${styles.standeeAccentRight}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0 0H40L0 40V0Z" fill="url(#waGrad)" />
                                    <path d="M45 0H65L0 65V45L45 0Z" fill="url(#waGrad)" opacity="0.8" />
                                    <path d="M70 0H85L0 85V70L70 0Z" fill="url(#waGrad)" opacity="0.5" />
                                    <rect x="5" y="75" width="12" height="12" fill="url(#waGrad)" transform="rotate(45 5 75)" />
                                </svg>

                                {/* Logo Area */}
                                <Box className={styles.standeeLogoArea}>
                                    {logoDataUrl ? (
                                        <img src={logoDataUrl} alt="Logo" className={styles.standeeLogoImg} />
                                    ) : brandName ? (
                                        <Box className={styles.standeeBrandText}>
                                            <span style={{ color: '#1daa61' }}>✦</span> {brandName}
                                        </Box>
                                    ) : null}
                                </Box>

                                {/* Decorative Side Elements */}
                                <Box className={`${styles.standeeDecoIcon} ${styles.standeeDotsLeft}`}>••••••••</Box>
                                <Box className={`${styles.standeeDecoIcon} ${styles.standeeArrowsRight}`}>»<br />»<br />»</Box>
                                <Box className={`${styles.standeeDecoIcon} ${styles.standeeArrowsLeft}`}>«<br />«<br />«</Box>
                                <Box className={`${styles.standeeDecoIcon} ${styles.standeeCrossesRight}`}>× × × ×</Box>

                                {/* Header */}
                                <Box className={styles.standeeHeader}>
                                    <Typography component="h1" className={styles.standeeHeaderH1}>
                                        {headline || 'CONNECT'}
                                    </Typography>
                                </Box>
                                {/* Phone Display */}
                                <Box className={styles.standeePhoneDisplay}>
                                    <svg className={styles.standeePhoneIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                    <span>{formatPhoneNumber(digitsOnly)}</span>
                                </Box>

                                {/* QR Code */}
                                <Box className={styles.standeeQrContainer}>
                                    <img src={qrDataUrl} alt="WhatsApp QR Code" className={styles.standeeQrCode} />
                                </Box>

                                {/* Info Message */}
                                <Typography className={styles.standeeInfoMsg}>
                                    {tagline || 'Scan to Chat'}
                                </Typography>


                                {/* Footer Panel */}
                                <Box className={styles.standeeFooterPanel}>
                                    <Typography className={styles.standeeThankYou}>Thank You</Typography>
                                    <Box className={styles.standeePoweredWrapper}>
                                        <Typography className={styles.standeePoweredLabel}>Powered by</Typography>
                                        <img src={getStaticUrl('/poweredBy.png')} alt="Optigo" className={styles.standeePoweredImg} />
                                    </Box>
                                </Box>
                            </Box>
                        ) : (
                            <Box className={styles.flyerPreview} ref={flyerRef}>
                                {/* Gradient Banner */}
                                <Box className={styles.flyerBanner}>
                                    <Box className={styles.flyerBannerGlow} />
                                    <Box className={styles.flyerHeaderRow}>
                                        {logoDataUrl && (
                                            <img src={logoDataUrl} alt="Logo" className={styles.flyerLogo} />
                                        )}
                                        {brandName && (
                                            <Typography className={styles.flyerBrand}>
                                                {brandName}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography className={styles.flyerHeadline}>
                                        {headline}
                                    </Typography>
                                </Box>

                                {/* Body */}
                                <Box className={styles.flyerBody}>
                                    <Typography className={styles.flyerTagline}>
                                        {tagline}
                                    </Typography>

                                    {/* Phone number above QR */}
                                    <Typography className={styles.flyerBodyPhoneLabel}>
                                        Or message us directly at
                                    </Typography>
                                    <Typography className={styles.flyerBodyPhone}>
                                        {formatPhoneNumber(digitsOnly)}
                                    </Typography>

                                    {/* Large centered QR */}
                                    <Box className={styles.flyerQrWrapper}>
                                        <Box className={styles.flyerQrFrame}>
                                            <img src={qrDataUrl} alt="WhatsApp QR Code" className={styles.flyerQr} />
                                        </Box>
                                        <Box className={styles.flyerQrBadge}>
                                            <MessageCircle size={16} color="#fff" />
                                            <span>Scan to Chat on WhatsApp</span>
                                        </Box>
                                    </Box>

                                    {/* Benefits */}
                                    <Box className={styles.flyerBenefits}>
                                        <Box className={styles.flyerBenefit}>
                                            <Box className={styles.flyerBenefitIcon}>
                                                <Zap size={28} color={WHATSAPP_GREEN} />
                                            </Box>
                                            <Typography className={styles.flyerBenefitLabel}>Quick Support</Typography>
                                            <Typography className={styles.flyerBenefitSub}>Get help instantly</Typography>
                                        </Box>
                                        <Box className={styles.flyerBenefit}>
                                            <Box className={styles.flyerBenefitIcon}>
                                                <Clock size={28} color={WHATSAPP_GREEN} />
                                            </Box>
                                            <Typography className={styles.flyerBenefitLabel}>Instant Response</Typography>
                                            <Typography className={styles.flyerBenefitSub}>No waiting time</Typography>
                                        </Box>
                                        <Box className={styles.flyerBenefit}>
                                            <Box className={styles.flyerBenefitIcon}>
                                                <MessageCircle size={28} color={WHATSAPP_GREEN} />
                                            </Box>
                                            <Typography className={styles.flyerBenefitLabel}>Easy Communication</Typography>
                                            <Typography className={styles.flyerBenefitSub}>Chat anytime</Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Footer */}
                                <Box className={styles.flyerFooter}>
                                    <Box className={styles.poweredBy}>
                                        <Typography component="span" className={styles.poweredByLabel}>
                                            Powered by
                                        </Typography>
                                        <Box component="span" className={styles.poweredByBrand}>
                                            <img src={getStaticUrl('/poweredBy.png')} alt="Optigo" className={styles.poweredByImg} />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default QRGenerator;
