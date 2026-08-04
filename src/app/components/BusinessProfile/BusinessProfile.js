'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchWabaCategories, fetchWabaProfile, updateWabaProfile } from '../../api/BusinessProfileApi';
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
    const [savedData, setSavedData] = useState(EMPTY_PROFILE);
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

    useEffect(() => {
        if (open) {
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

            // Fetch categories
            if (categoriesAbortRef.current) {
                categoriesAbortRef.current.abort();
            }
            const catController = new AbortController();
            categoriesAbortRef.current = catController;
            setCategoriesLoading(true);
            fetchWabaCategories(userId, catController.signal).then((cats) => {
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

        return () => {
            if (categoriesAbortRef.current) {
                categoriesAbortRef.current.abort();
            }
            if (profileAbortRef.current) {
                profileAbortRef.current.abort();
            }
        };
    }, [open, userId, channel]);

    const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(savedData) ||
        logoPreview !== savedLogo;

    // Validation errors — block update when any field is invalid
    const hasErrors = (() => {
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
            setLogoPreview(reader.result);
            setLogoFile(file);
        };
        reader.onerror = () => toast.error('Failed to read image');
        reader.readAsDataURL(file);
    }, []);

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) handleLogoFile(file);
        e.target.value = '';
    };

    const handleLogoDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleLogoFile(file);
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
        const file = e.dataTransfer?.files?.[0];
        if (file) handleLogoFile(file);
    };

    const handleRemoveLogo = () => {
        setLogoPreview('');
        setLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpdateClick = () => {
        setUpdateDialogOpen(true);
    };

    const handleConfirmUpdate = async () => {
        // Validate website URLs — Meta requires http:// or https:// prefix
        const invalidWebsites = (formData.websites || []).filter((w) => w && !isValidWebsiteUrl(w));
        if (invalidWebsites.length > 0) {
            toast.error('Website URLs must start with http:// or https://');
            setIsUpdating(false);
            return;
        }

        setIsUpdating(true);
        try {
            const result = await updateWabaProfile({
                profile: formData,
                logoFile,
                channel,
                userId,
            });

            // New format: { success: true, message, data } | Legacy: { Status: '200' }
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
            toast.error('Failed to update business profile');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelClick = () => {
        setCancelDialogOpen(true);
    };

    const handleConfirmCancel = () => {
        setFormData(savedData);
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
    const hasHeaderPic = Boolean(channel?.profilePictureUrl) && !headerImgError;

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
                        <Box className={styles.pageHeaderIcon} sx={{ overflow: 'hidden', p: hasHeaderPic ? 0 : undefined }}>
                            {hasHeaderPic ? (
                                <img
                                    src={channel.profilePictureUrl}
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
                                Business Profile
                            </Typography>
                            <Typography component="p" className={styles.pageSubtitle}>
                                Manage your business identity
                            </Typography>
                        </Box>
                    </Box>
                    <Box className={styles.dialogHeaderRight}>
                        <Box className={styles.channelBadge}>
                            <Typography component="span" className={styles.channelBadgeText}>
                                {channelName}{channel?.mobileNumber ? ` • ${channel.mobileNumber}` : ''}
                            </Typography>
                        </Box>
                        <IconButton onClick={onClose} size="small" sx={{ color: '#7d7f85' }}>
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
                    {profileLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                            <CircularProgress size={32} sx={{ color: '#1daa61' }} />
                        </Box>
                    ) : (
                    <Box className={styles.dialogContent}>
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
                                border: (isDragOver || modalDragActive) ? '2px dashed #1daa61' : 'none',
                                background: (isDragOver || modalDragActive) ? 'rgba(29, 170, 97, 0.05)' : 'transparent',
                                borderRadius: '16px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {logoPreview ? (
                                <Avatar
                                    src={logoPreview}
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
                                    <Building2 size={40} color="#a0a0a0" />
                                </Avatar>
                            )}
                            {!(isDragOver || modalDragActive) && (
                                <Box className={styles.logoEditBadge}>
                                    <Camera size={14} color="#fff" />
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
                                        background: 'rgba(255, 255, 255, 0.92)',
                                        pointerEvents: 'none',
                                        zIndex: 3,
                                    }}
                                >
                                    <UploadCloud size={36} color="#1daa61" />
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1daa61', fontFamily: 'Poppins, sans-serif' }}>
                                        Drop image here
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        {logoPreview && (
                            <IconButton
                                size="small"
                                className={styles.logoRemoveBtn}
                                onClick={handleRemoveLogo}
                            >
                                <X size={16} />
                            </IconButton>
                        )}
                        <Typography className={styles.logoHint}>
                            Click or drag to upload logo
                        </Typography>
                    </Box>

                    {/* Right: Form Fields */}
                    <Box className={styles.formFields}>
                        <Grid container spacing={2.5}>
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
                <DialogTitle sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: '#444050' }}>
                    Update Business Profile?
                </DialogTitle>
                <DialogContent>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        p: '12px',
                        mb: '14px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e4e8ee',
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
                            {channel?.profilePictureUrl ? (
                                <img
                                    src={channel.profilePictureUrl}
                                    alt={channel?.whatsappName || channel?.companyCode || 'Channel'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <Whatsapp width={22} height={22} fill="#1daa61" />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <Typography sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#444050',
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
                                    color: '#6D6B77',
                                    fontWeight: 500,
                                }}>
                                    {channel.mobileNumber}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: '#7d7f85', lineHeight: 1.6 }}>
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
                            borderColor: '#e4e8ee',
                            color: '#7d7f85',
                            '&:hover': { borderColor: '#c8c8c8', background: 'transparent' },
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
                            background: '#1daa61',
                            boxShadow: '0 4px 12px rgba(29, 170, 97, 0.25)',
                            '&:hover': { background: '#1a9a57' },
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
                <DialogTitle sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: '#444050' }}>
                    Discard Changes?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: '#7d7f85', lineHeight: 1.6 }}>
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
                            borderColor: '#e4e8ee',
                            color: '#7d7f85',
                            '&:hover': { borderColor: '#c8c8c8', background: 'transparent' },
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
                            background: '#ef4444',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                            '&:hover': { background: '#dc2626' },
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
