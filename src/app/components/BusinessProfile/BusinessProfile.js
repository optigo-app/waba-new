'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../contexts/WalletContext';
import { fetchWabaCategories, fetchWabaProfile, updateWabaProfile, updateWabaChannel } from '../../api/BusinessProfileApi';
import { filesUploadApi } from '../../api/filesUploadApi';
import {
    Box,
    Typography,
    Button,
    TextField,
    Grid,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    CircularProgress,
    Avatar,
    Slide,
    Tooltip,
    Paper,
} from '@mui/material';
import {
    Building2,
    Camera,
    X,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    UploadCloud,
    Plus,
    Trash2,
    ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Whatsapp } from '../../assests/svg';
import styles from './BusinessProfile.module.scss';

const SlideUp = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} timeout={{ enter: 400, exit: 300 }} />;
});

const EMPTY_PROFILE = {
    logo: '',
    email: '',
    category: '',
    address: '',
    about: '',
    description: '',
    websites: [],
};

// WhatsApp Business Profile limits (per Meta docs)
const MAX_WEBSITES = 2;
const MAX_WEBSITE_LENGTH = 256;
const MAX_ABOUT_LENGTH = 139;
const MAX_ADDRESS_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 512;
const MAX_EMAIL_LENGTH = 128;

// Meta requires http:// or https:// prefix on website URLs
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const isValidWebsiteUrl = (url) => !url || URL_PATTERN.test(url);

// Meta requires valid email format
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => !email || EMAIL_PATTERN.test(email);

const BusinessProfile = ({ open, onClose, channel }) => {
    const { auth } = useAuth();
    const { refreshWallet } = useWallet();
    const [view, setView] = useState('select'); // 'select' | 'meta' | 'optigo'
    const isOptigo = view === 'optigo';
    const [savedData, setSavedData] = useState(EMPTY_PROFILE);
    const [channelTitle, setChannelTitle] = useState('');
    const [savedChannelTitle, setSavedChannelTitle] = useState('');
    const [channelImageFile, setChannelImageFile] = useState(null);
    const [channelImagePreview, setChannelImagePreview] = useState('');
    const [savedChannelImage, setSavedChannelImage] = useState('');
    const [savedLogo, setSavedLogo] = useState(EMPTY_PROFILE.logo);
    const [formData, setFormData] = useState(EMPTY_PROFILE);
    const [logoPreview, setLogoPreview] = useState(EMPTY_PROFILE.logo);
    const [logoFile, setLogoFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [modalDragActive, setModalDragActive] = useState(false);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const fileInputRef = useRef(null);
    const categoriesAbortRef = useRef(null);
    const profileAbortRef = useRef(null);

    const userId = auth?.userId || '';

    // Reset to the picker view whenever the dialog opens
    useEffect(() => {
        if (open) setView('select');
    }, [open]);

    useEffect(() => {
        if (open && view !== 'select') {
            setSavedData(EMPTY_PROFILE);
            setSavedLogo(EMPTY_PROFILE.logo);
            setFormData(EMPTY_PROFILE);
            setLogoPreview(EMPTY_PROFILE.logo);
            setLogoFile(null);
            setUpdateDialogOpen(false);
            setCancelDialogOpen(false);
            setIsUpdating(false);
            setIsDragOver(false);
            setModalDragActive(false);
            setProfileLoading(true);

            const initialTitle = channel?.channelTitle || channel?.ChannelTitle || '';
            setChannelTitle(initialTitle);
            setSavedChannelTitle(initialTitle);

            const initialChannelImg = channel?.ChannelImage || channel?.channelImage || channel?.profilePictureUrl || channel?.ProfilePictureUrl || '';
            setChannelImagePreview(initialChannelImg);
            setSavedChannelImage(initialChannelImg);
            setChannelImageFile(null);

            const wabaPhoneNo = channel?.WabaPhoneNo || channel?.wabaPhoneNo || channel?.mobileNumber || channel?.MobileNumber || '';

            if (isOptigo) {
                // Optigo WABA mode — ERP display fields only, no Meta fetch needed
                setProfileLoading(false);
            } else {
            // Fetch categories
            if (categoriesAbortRef.current) {
                categoriesAbortRef.current.abort();
            }
            const catController = new AbortController();
            categoriesAbortRef.current = catController;
            setCategoriesLoading(true);
            fetchWabaCategories(userId, catController.signal, wabaPhoneNo).then((cats) => {
                if (!catController.signal.aborted) {
                    setCategories(cats);
                    setCategoriesLoading(false);
                }
            });

            // Fetch profile data
            if (profileAbortRef.current) {
                profileAbortRef.current.abort();
            }
            const profileController = new AbortController();
            profileAbortRef.current = profileController;
            fetchWabaProfile({
                userId,
                accountId: channel?.Id || '',
                companyCode: channel?.companyCode || '',
                wabaPhoneNo,
                signal: profileController.signal,
            }).then((profile) => {
                if (!profileController.signal.aborted && profile) {
                    const normalizedProfile = {
                        ...profile,
                        websites: Array.isArray(profile.websites)
                            ? profile.websites
                            : (profile.websites || '').split(',').map((w) => w.trim()).filter(Boolean),
                    };
                    setSavedData(normalizedProfile);
                    setSavedLogo(normalizedProfile.logo);
                    setFormData(normalizedProfile);
                    setLogoPreview(normalizedProfile.logo);
                }
                if (!profileController.signal.aborted) {
                    setProfileLoading(false);
                }
            });
            }
        }

        return () => {
            if (categoriesAbortRef.current) {
                categoriesAbortRef.current.abort();
            }
            if (profileAbortRef.current) {
                profileAbortRef.current.abort();
            }
        };
    }, [open, userId, channel, view]);

    const hasChanges = isOptigo
        ? (channelTitle.trim() !== savedChannelTitle.trim() ||
            Boolean(channelImageFile) || channelImagePreview !== savedChannelImage)
        : (JSON.stringify(formData) !== JSON.stringify(savedData) ||
            logoPreview !== savedLogo);

    // Validation errors — block update when any field is invalid (Meta fields only)
    const hasErrors = (() => {
        if (isOptigo) return false;
        if (formData.email && !isValidEmail(formData.email)) return true;
        if ((formData.websites || []).some((w) => w && !isValidWebsiteUrl(w))) return true;
        return false;
    })();

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleWebsiteChange = (index, value) => {
        setFormData((prev) => {
            const websites = [...(prev.websites || [])];
            websites[index] = value;
            return { ...prev, websites };
        });
    };

    const handleAddWebsite = () => {
        setFormData((prev) => {
            const current = prev.websites || [];
            if (current.length >= MAX_WEBSITES) {
                toast.error(`You can add up to ${MAX_WEBSITES} websites only.`);
                return prev;
            }
            return {
                ...prev,
                websites: [...current, ''],
            };
        });
    };

    const handleRemoveWebsite = (index) => {
        setFormData((prev) => ({
            ...prev,
            websites: (prev.websites || []).filter((_, i) => i !== index),
        }));
    };

    const validateImageFile = (file) => {
        if (!file) return false;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return false;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2MB');
            return false;
        }
        return true;
    };

    const handleLogoFile = useCallback((file) => {
        if (!validateImageFile(file)) return;
        const reader = new FileReader();
        reader.onload = () => {
            setLogoPreview(reader.result);
            setLogoFile(file);
        };
        reader.onerror = () => toast.error('Failed to read image');
        reader.readAsDataURL(file);
    }, []);

    // Pick or drop a file — applies directly to the current mode's photo
    const applyPhotoFile = useCallback((file) => {
        if (!validateImageFile(file)) return;
        if (isOptigo) {
            applyChannelImageFile(file);
        } else {
            handleLogoFile(file);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOptigo]);

    const handleLogoUpload = (e) => {
        applyPhotoFile(e.target.files?.[0]);
        e.target.value = '';
    };

    const handleLogoDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        applyPhotoFile(e.dataTransfer?.files?.[0]);
    };

    const handleLogoDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleLogoDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    // Modal-level handlers — active when dragging anywhere in the dialog
    const handleModalDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setModalDragActive(true);
    };

    const handleModalDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) {
            setModalDragActive(false);
        }
    };

    const handleModalDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setModalDragActive(false);
        setIsDragOver(false);
        if (view === 'select') return;
        applyPhotoFile(e.dataTransfer?.files?.[0]);
    };

    const handleRemoveLogo = () => {
        if (isOptigo) {
            setChannelImagePreview('');
            setChannelImageFile(null);
        } else {
            setLogoPreview('');
            setLogoFile(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const applyChannelImageFile = (file) => {
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
            setChannelImagePreview(reader.result);
            setChannelImageFile(file);
        };
        reader.onerror = () => toast.error('Failed to read image');
        reader.readAsDataURL(file);
    };

    const handleUpdateClick = () => {
        setUpdateDialogOpen(true);
    };

    const handleConfirmUpdate = async () => {
        const invalidWebsites = (formData.websites || []).filter((w) => w && !isValidWebsiteUrl(w));
        if (invalidWebsites.length > 0) {
            toast.error('Website URLs must start with http:// or https://');
            setIsUpdating(false);
            return;
        }

        setIsUpdating(true);
        try {
            if (isOptigo) {
                // Optigo WABA mode — ERP channel update only
                const wabaPhoneNo = channel?.WabaPhoneNo || channel?.wabaPhoneNo || channel?.MobileNumber || channel?.mobileNumber || '';
                const channelImgChanged = Boolean(channelImageFile) || channelImagePreview !== savedChannelImage;
                let fileUrl = channel?.ChannelImage || channel?.channelImage || channel?.profilePictureUrl || channel?.ProfilePictureUrl || '';
                if (channelImageFile) {
                    const up = await filesUploadApi({
                        attachments: [{ file: channelImageFile }],
                        folderName: 'waba/channel',
                        uniqueNo: `${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
                    });
                    fileUrl = up?.files?.[0]?.url || fileUrl;
                } else if (channelImgChanged) {
                    fileUrl = channelImagePreview || '';
                }
                await updateWabaChannel({
                    userId,
                    accountId: channel?.Id,
                    channelTitle: channelTitle.trim(),
                    fileUrl,
                    wabaPhoneNo,
                });
                refreshWallet?.();
                setSavedChannelTitle(channelTitle);
                setSavedChannelImage(channelImagePreview);
                setChannelImageFile(null);
                toast.success('Channel updated successfully!');
                setUpdateDialogOpen(false);
                onClose();
                return;
            }

            // Meta mode — WhatsApp business profile update only
            const result = await updateWabaProfile({
                profile: formData,
                logoFile,
                channel,
                userId,
            });

            const isSuccess = result?.success === true || result?.Status === '200';
            if (isSuccess) {
                setSavedData(formData);
                setSavedLogo(logoPreview);
                setLogoFile(null);
                toast.success(result?.message || 'Business profile updated successfully!');
                setUpdateDialogOpen(false);
                onClose();
            } else {
                toast.error(result?.message || result?.Message || 'Failed to update business profile');
            }
        } catch {
            toast.error(isOptigo ? 'Failed to update channel' : 'Failed to update business profile');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelClick = () => {
        setCancelDialogOpen(true);
    };

    const handleConfirmCancel = () => {
        setFormData(savedData);
        setChannelTitle(savedChannelTitle);
        setChannelImagePreview(savedChannelImage);
        setChannelImageFile(null);
        setLogoPreview(savedLogo);
        setLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setCancelDialogOpen(false);
        toast.success('Changes discarded');
        onClose();
    };

    const handleDialogClose = () => {
        if (!isUpdating) setUpdateDialogOpen(false);
    };

    const channelName = channel?.whatsappName || channel?.companyCode || 'Channel';
    const [headerImgError, setHeaderImgError] = useState(false);
    const headerPicUrl = channel?.ChannelImage || channel?.channelImage || channel?.profilePictureUrl || channel?.ProfilePictureUrl || '';
    const hasHeaderPic = Boolean(headerPicUrl) && !headerImgError;

    return (
        <>
            {/* Main Business Profile Dialog */}
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                slots={{ transition: SlideUp }}
                slotProps={{
                    paper: { sx: { borderRadius: '16px', maxHeight: '90vh' } },
                }}
            >
                <DialogTitle className={styles.dialogHeader}>
                    <Box className={styles.dialogHeaderLeft}>
                        {view !== 'select' && (
                            <IconButton
                                size="small"
                                onClick={() => setView('select')}
                                sx={{ color: 'var(--text-tertiary)', mr: 0.5 }}
                            >
                                <ArrowLeft size={18} />
                            </IconButton>
                        )}
                        <Box className={styles.pageHeaderIcon} sx={{ overflow: 'hidden', p: hasHeaderPic ? 0 : undefined }}>
                            {hasHeaderPic ? (
                                <img
                                    src={headerPicUrl}
                                    alt={channelName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={() => setHeaderImgError(true)}
                                />
                            ) : (
                                <Building2 size={18} />
                            )}
                        </Box>
                        <Box>
                            <Typography component="h2" className={styles.pageTitle}>
                                {view === 'select' ? 'Business Profile' : isOptigo ? 'Optigo WABA Profile' : 'Meta Business Profile'}
                            </Typography>
                            <Typography component="p" className={styles.pageSubtitle}>
                                {view === 'select' ? 'Choose what to update' : isOptigo ? 'Dashboard display name & photo' : 'Manage your WhatsApp business identity'}
                            </Typography>
                        </Box>
                    </Box>
                    <Box className={styles.dialogHeaderRight}>
                        <Box className={styles.channelBadge}>
                            <Typography component="span" className={styles.channelBadgeText}>
                                {channelName}{channel?.mobileNumber ? ` • ${channel.mobileNumber}` : ''}
                            </Typography>
                        </Box>
                        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-tertiary)' }}>
                            <X size={20} />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{ p: 0 }}
                    onDragOver={handleModalDragOver}
                    onDragLeave={handleModalDragLeave}
                    onDrop={handleModalDrop}
                >
                    {view === 'select' ? (
                        <Box
                            className={styles.pickerContent}
                            sx={{
                                animation: 'bpSlideLeft 0.28s ease',
                                '@keyframes bpSlideLeft': {
                                    from: { opacity: 0, transform: 'translateX(-24px)' },
                                    to: { opacity: 1, transform: 'translateX(0)' },
                                },
                            }}
                        >
                            <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem', color: 'var(--text-secondary)', mb: 2.5 }}>
                                Choose which profile you want to manage for this channel.
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Paper
                                    onClick={() => setView('meta')}
                                    elevation={0}
                                    sx={{
                                        flex: 1,
                                        px: 2,
                                        py: 3,
                                        borderRadius: '14px',
                                        border: '1.5px solid var(--border-color)',
                                        background: 'linear-gradient(160deg, var(--bg-paper) 0%, rgba(29,170,97,0.07) 100%)',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { borderColor: 'var(--primary-main)', background: 'linear-gradient(160deg, var(--bg-paper) 0%, rgba(29,170,97,0.12) 100%)', boxShadow: '0 8px 20px rgba(29,170,97,0.12)', transform: 'translateY(-2px)' },
                                    }}
                                >
                                    <Box sx={{ width: 52, height: 52, mx: 'auto', mb: 1.5, borderRadius: '14px', background: 'var(--primary-light-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Whatsapp width={26} height={26} fill="var(--primary-main)" />
                                    </Box>
                                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.88rem', fontWeight: 600, color: 'var(--titleColor)', mb: 0.5 }}>
                                        Meta Business
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        WhatsApp profile — photo, about, address, websites
                                    </Typography>
                                </Paper>
                                <Paper
                                    onClick={() => setView('optigo')}
                                    elevation={0}
                                    sx={{
                                        flex: 1,
                                        px: 2,
                                        py: 3,
                                        borderRadius: '14px',
                                        border: '1.5px solid var(--border-color)',
                                        background: 'linear-gradient(160deg, var(--bg-paper) 0%, rgba(100,116,139,0.07) 100%)',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { borderColor: 'var(--primary-main)', background: 'linear-gradient(160deg, var(--bg-paper) 0%, rgba(100,116,139,0.12) 100%)', boxShadow: '0 8px 20px rgba(29,170,97,0.12)', transform: 'translateY(-2px)' },
                                    }}
                                >
                                    <Box sx={{ width: 52, height: 52, mx: 'auto', mb: 1.5, borderRadius: '14px', background: 'var(--primary-light-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={26} color="var(--primary-main)" />
                                    </Box>
                                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.88rem', fontWeight: 600, color: 'var(--titleColor)', mb: 0.5 }}>
                                        Optigo WABA
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Dashboard display — channel title & display photo
                                    </Typography>
                                </Paper>
                            </Box>
                        </Box>
                    ) : profileLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                            <CircularProgress size={32} sx={{ color: 'var(--primary-main)' }} />
                        </Box>
                    ) : (
                    <Box
                        className={styles.dialogContent}
                        sx={{
                            animation: 'bpSlideRight 0.28s ease',
                            '@keyframes bpSlideRight': {
                                from: { opacity: 0, transform: 'translateX(24px)' },
                                to: { opacity: 1, transform: 'translateX(0)' },
                            },
                        }}
                    >
                        <Box className={styles.formLayout}>
                    {/* Left: Logo Upload */}
                    <Box className={styles.logoSection}>
                        <Box
                            className={styles.logoUploadArea}
                            onDrop={handleLogoDrop}
                            onDragOver={handleLogoDragOver}
                            onDragLeave={handleLogoDragLeave}
                            onClick={() => !isDragOver && fileInputRef.current?.click()}
                            sx={{
                                position: 'relative',
                                border: (isDragOver || modalDragActive) ? '2px dashed var(--primary-main)' : 'none',
                                background: (isDragOver || modalDragActive) ? 'rgba(29, 170, 97, 0.05)' : 'transparent',
                                borderRadius: '16px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {(isOptigo ? channelImagePreview : logoPreview) ? (
                                <Avatar
                                    src={isOptigo ? channelImagePreview : logoPreview}
                                    className={styles.logoAvatar}
                                    sx={{
                                        width: 150,
                                        height: 150,
                                        opacity: (isDragOver || modalDragActive) ? 0.15 : 1,
                                        transition: 'opacity 0.2s ease',
                                    }}
                                />
                            ) : (
                                <Avatar
                                    className={styles.logoPlaceholder}
                                    sx={{
                                        width: 150,
                                        height: 150,
                                        opacity: (isDragOver || modalDragActive) ? 0.15 : 1,
                                        transition: 'opacity 0.2s ease',
                                    }}
                                >
                                    <Building2 size={40} color="var(--text-tertiary)" />
                                </Avatar>
                            )}
                            {!(isDragOver || modalDragActive) && (
                                <Box className={styles.logoEditBadge}>
                                    <Camera size={14} color="var(--button-color)" />
                                </Box>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleLogoUpload}
                            />
                            {(isDragOver || modalDragActive) && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        borderRadius: '14px',
                                        background: 'color-mix(in srgb, var(--bg-paper) 92%, transparent)',
                                        pointerEvents: 'none',
                                        zIndex: 3,
                                    }}
                                >
                                    <UploadCloud size={36} color="var(--primary-main)" />
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-main)', fontFamily: 'Poppins, sans-serif' }}>
                                        Drop image here
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        {(isOptigo ? channelImagePreview : logoPreview) && (
                            <IconButton
                                size="small"
                                className={styles.logoRemoveBtn}
                                onClick={handleRemoveLogo}
                            >
                                <X size={16} />
                            </IconButton>
                        )}
                        <Typography className={styles.logoHint}>
                            {isOptigo ? 'Channel display photo' : 'Click or drag to upload photo'}
                        </Typography>
                        {(isOptigo ? channelImageFile : logoFile) && (
                            <Typography sx={{ fontSize: '0.7rem', color: 'var(--primary-main)', fontFamily: 'Poppins, sans-serif', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
                                New photo ready — click Update to save
                            </Typography>
                        )}
                    </Box>

                    {/* Right: Form Fields */}
                    <Box className={styles.formFields}>
                        <Grid container spacing={2.5}>
                            {/* Row 0: Channel Title (Optigo WABA mode only) */}
                            {isOptigo && (
                            <Grid size={{ xs: 12 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Channel Title
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Enter channel display name"
                                    value={channelTitle}
                                    onChange={(e) => setChannelTitle(e.target.value)}
                                    slotProps={{ htmlInput: { maxLength: 100 } }}
                                    helperText="Display name shown in dashboard"
                                    className={styles.textField}
                                />
                            </Grid>
                            )}

                            {!isOptigo && (
                            <>
                            {/* Row 0: WhatsApp Name (read-only — actual Meta display name) */}
                            <Grid size={{ xs: 12 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    WhatsApp Name
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={channel?.whatsappName || channel?.WhatsappName || channelName}
                                    slotProps={{ htmlInput: { readOnly: true } }}
                                    helperText="Display name on WhatsApp — changed via Meta Business Manager"
                                    className={styles.textField}
                                    sx={{
                                        '& .MuiInputBase-input': {
                                            color: 'var(--text-tertiary)',
                                            cursor: 'default',
                                            WebkitTextFillColor: 'var(--text-tertiary)',
                                        },
                                        '& .MuiOutlinedInput-root': {
                                            background: 'color-mix(in srgb, var(--text-secondary) 8%, transparent)',
                                        },
                                    }}
                                />
                            </Grid>

                            {/* Row 1: Email + Business Category */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Email
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Enter Email"
                                    value={formData.email}
                                    onChange={handleChange('email')}
                                    slotProps={{ htmlInput: { maxLength: MAX_EMAIL_LENGTH } }}
                                    error={formData.email && !isValidEmail(formData.email)}
                                    helperText={formData.email && !isValidEmail(formData.email)
                                        ? 'Enter a valid email address'
                                        : (formData.email ? `${formData.email.length}/${MAX_EMAIL_LENGTH}` : undefined)}
                                    className={styles.textField}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Business Category
                                </Typography>
                                <TextField
                                    fullWidth
                                    select
                                    size="small"
                                    placeholder="Select..."
                                    value={formData.category}
                                    onChange={handleChange('category')}
                                    className={styles.textField}
                                    slotProps={{
                                        select: {
                                            renderValue: (value) => {
                                                const cat = categories.find((c) => c.code === value);
                                                return cat ? cat.name : value || '';
                                            },
                                            MenuProps: {
                                                slotProps: {
                                                    paper: { sx: { maxHeight: 250 } },
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {categoriesLoading && (
                                        <MenuItem disabled>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={16} />
                                                <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem' }}>Loading categories...</span>
                                            </Box>
                                        </MenuItem>
                                    )}
                                    {!categoriesLoading && categories.length === 0 && (
                                        <MenuItem disabled>No categories available</MenuItem>
                                    )}
                                    {categories.map((cat) => (
                                        <MenuItem key={cat.id} value={cat.code}>
                                            {cat.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {/* Row 2: Address */}
                            <Grid size={{ xs: 12 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Address
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={2}
                                    placeholder="Enter business address"
                                    value={formData.address}
                                    onChange={handleChange('address')}
                                    slotProps={{ htmlInput: { maxLength: MAX_ADDRESS_LENGTH } }}
                                    helperText={formData.address ? `${formData.address.length}/${MAX_ADDRESS_LENGTH}` : undefined}
                                    className={styles.textField}
                                />
                            </Grid>

                            {/* Row 3: About */}
                            <Grid size={{ xs: 12 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    About
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={2}
                                    placeholder="Short bio or tagline"
                                    value={formData.about}
                                    onChange={handleChange('about')}
                                    slotProps={{ htmlInput: { maxLength: MAX_ABOUT_LENGTH } }}
                                    helperText={formData.about ? `${formData.about.length}/${MAX_ABOUT_LENGTH}` : undefined}
                                    className={styles.textField}
                                />
                            </Grid>

                            {/* Row 4: Business Description */}
                            <Grid size={{ xs: 12 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Business Description
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={4}
                                    placeholder="Detailed business description"
                                    value={formData.description}
                                    onChange={handleChange('description')}
                                    slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH } }}
                                    helperText={formData.description ? `${formData.description.length}/${MAX_DESCRIPTION_LENGTH}` : undefined}
                                    className={styles.textField}
                                />
                            </Grid>

                            {/* Row 5: Websites */}
                            <Grid size={{ xs: 12 }}>
                                <Box className={styles.websiteLabelRow}>
                                    <Typography component="label" className={styles.fieldLabel}>
                                        Websites
                                    </Typography>
                                    <Tooltip
                                        title={(formData.websites || []).length >= MAX_WEBSITES
                                            ? `Maximum ${MAX_WEBSITES} websites allowed`
                                            : 'Add website'}
                                        placement="top"
                                        arrow
                                    >
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={handleAddWebsite}
                                                disabled={(formData.websites || []).length >= MAX_WEBSITES}
                                                className={styles.websiteAddIconBtn}
                                            >
                                                <Plus size={18} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                                <Box className={styles.websiteList}>
                                    {(formData.websites || []).map((site, idx) => {
                                        const urlError = site && !isValidWebsiteUrl(site);
                                        return (
                                        <Box key={idx} className={styles.websiteRow}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="https://www.yourwebsite.com"
                                                value={site}
                                                onChange={(e) => handleWebsiteChange(idx, e.target.value.slice(0, MAX_WEBSITE_LENGTH))}
                                                slotProps={{ htmlInput: { maxLength: MAX_WEBSITE_LENGTH } }}
                                                error={urlError}
                                                helperText={urlError
                                                    ? 'URL must start with http:// or https://'
                                                    : (site ? `${site.length}/${MAX_WEBSITE_LENGTH}` : undefined)}
                                                className={styles.textField}
                                            />
                                            <Tooltip title="Remove website" placement="top" arrow>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveWebsite(idx)}
                                                    className={styles.websiteRemoveBtn}
                                                >
                                                    <Trash2 size={16} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        );
                                    })}
                                </Box>
                            </Grid>
                            </>
                            )}
                        </Grid>

                        {/* Action Buttons */}
                        <Box className={styles.actionRow}>
                            <Button
                                variant="contained"
                                onClick={handleUpdateClick}
                                disabled={!hasChanges || hasErrors}
                                startIcon={<CheckCircle2 size={18} />}
                                className={styles.updateBtn}
                            >
                                Update
                            </Button>
                            {hasChanges && (
                                <Button
                                    variant="outlined"
                                    onClick={handleCancelClick}
                                    startIcon={<RotateCcw size={16} />}
                                    className={styles.cancelBtn}
                                >
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Box>
                </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Update Confirmation Dialog */}
            <Dialog
                open={updateDialogOpen}
                onClose={handleDialogClose}
                maxWidth="xs"
                fullWidth
                slots={{ transition: SlideUp }}
                slotProps={{
                    paper: { sx: { borderRadius: '16px' } },
                }}
            >
                <DialogTitle sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--titleColor)' }}>
                    {isOptigo ? 'Update Channel?' : 'Update Business Profile?'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        p: '12px',
                        mb: '14px',
                        borderRadius: '12px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                    }}>
                        <Box
                            sx={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid rgba(29,170,97,0.15)',
                                overflow: 'hidden',
                            }}
                        >
                            {headerPicUrl ? (
                                <img
                                    src={headerPicUrl}
                                    alt={channel?.whatsappName || channel?.companyCode || 'Channel'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <Whatsapp width={22} height={22} fill="var(--primary-main)" />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <Typography sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: 'var(--titleColor)',
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {channel?.whatsappName || channel?.companyCode || 'Channel'}
                            </Typography>
                            {channel?.mobileNumber && (
                                <Typography sx={{
                                    fontFamily: 'Poppins, sans-serif',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 500,
                                }}>
                                    {channel.mobileNumber}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Are you sure you want to update your business profile? This will reflect changes across your WhatsApp Business account.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={handleDialogClose}
                        variant="outlined"
                        disabled={isUpdating}
                        sx={{
                            textTransform: 'none',
                            fontFamily: 'Poppins, sans-serif',
                            borderRadius: '10px',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)',
                            '&:hover': { borderColor: 'var(--text-tertiary)', background: 'transparent' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmUpdate}
                        variant="contained"
                        disabled={isUpdating}
                        startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <AlertCircle size={18} />}
                        sx={{
                            textTransform: 'none',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            borderRadius: '10px',
                            background: 'var(--primary-main)',
                            boxShadow: '0 4px 12px rgba(29, 170, 97, 0.25)',
                            '&:hover': { background: 'var(--primary-main)', filter: 'brightness(0.93)' },
                        }}
                    >
                        {isUpdating ? 'Updating...' : 'Confirm Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <Dialog
                open={cancelDialogOpen}
                onClose={() => setCancelDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                slots={{ transition: SlideUp }}
                slotProps={{
                    paper: { sx: { borderRadius: '16px' } },
                }}
            >
                <DialogTitle sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--titleColor)' }}>
                    Discard Changes?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        You have unsaved changes. Are you sure you want to discard them and revert to the last saved version?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={() => setCancelDialogOpen(false)}
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            fontFamily: 'Poppins, sans-serif',
                            borderRadius: '10px',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)',
                            '&:hover': { borderColor: 'var(--text-tertiary)', background: 'transparent' },
                        }}
                    >
                        Keep Editing
                    </Button>
                    <Button
                        onClick={handleConfirmCancel}
                        variant="contained"
                        startIcon={<RotateCcw size={16} />}
                        sx={{
                            textTransform: 'none',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            borderRadius: '10px',
                            background: 'var(--error-main)',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                            '&:hover': { background: 'var(--error-main)', filter: 'brightness(0.92)' },
                        }}
                    >
                        Discard
                    </Button>
                </DialogActions>
            </Dialog>

        </>
    );
};

export default BusinessProfile;
