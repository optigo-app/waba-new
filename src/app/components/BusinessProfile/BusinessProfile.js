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
} from '@mui/material';
import {
    Building2,
    Camera,
    X,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
    websites: '',
};

const BusinessProfile = ({ open, onClose, channel }) => {
    const { auth } = useAuth();
    const [savedData, setSavedData] = useState(EMPTY_PROFILE);
    const [savedLogo, setSavedLogo] = useState(EMPTY_PROFILE.logo);
    const [formData, setFormData] = useState(EMPTY_PROFILE);
    const [logoPreview, setLogoPreview] = useState(EMPTY_PROFILE.logo);
    const [logoFile, setLogoFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const fileInputRef = useRef(null);
    const categoriesAbortRef = useRef(null);
    const profileAbortRef = useRef(null);

    const userId = auth?.username || auth?.userid || auth?.userId || auth?.appuserid || '';

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
                accountId: channel?.Id || channel?.AccountId || 1,
                companyCode: channel?.companyCode || '',
                signal: profileController.signal,
            }).then((profile) => {
                if (!profileController.signal.aborted && profile) {
                    setSavedData(profile);
                    setSavedLogo(profile.logo);
                    setFormData(profile);
                    setLogoPreview(profile.logo);
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

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
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

    const handleRemoveLogo = () => {
        setLogoPreview('');
        setLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpdateClick = () => {
        setUpdateDialogOpen(true);
    };

    const handleConfirmUpdate = async () => {
        setIsUpdating(true);
        try {
            const result = await updateWabaProfile({
                profile: formData,
                logoFile,
                channel,
                userId,
            });

            if (result?.Status === '200') {
                setSavedData(formData);
                setSavedLogo(logoPreview);
                setLogoFile(null);
                toast.success('Business profile updated successfully!');
                setUpdateDialogOpen(false);
            } else {
                toast.error(result?.Message || 'Failed to update business profile');
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

    const channelName = channel?.companyCode || 'Channel';

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
                        <Box className={styles.pageHeaderIcon}>
                            <Building2 size={18} />
                        </Box>
                        <Box>
                            <Typography component="h2" className={styles.pageTitle}>
                                Business Profile
                            </Typography>
                            <Typography component="p" className={styles.pageSubtitle}>
                                {channelName} • Manage your business identity
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{ color: '#7d7f85' }}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
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
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                                border: isDragOver ? '2px dashed #1daa61' : 'none',
                                background: isDragOver ? 'rgba(29, 170, 97, 0.05)' : 'transparent',
                            }}
                        >
                            {logoPreview ? (
                                <Avatar
                                    src={logoPreview}
                                    className={styles.logoAvatar}
                                    sx={{ width: 150, height: 150 }}
                                />
                            ) : (
                                <Avatar className={styles.logoPlaceholder} sx={{ width: 150, height: 150 }}>
                                    <Building2 size={40} color="#a0a0a0" />
                                </Avatar>
                            )}
                            <Box className={styles.logoEditBadge}>
                                <Camera size={14} color="#fff" />
                            </Box>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleLogoUpload}
                            />
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
                                        <MenuItem key={cat.id} value={cat.name}>
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
                                    className={styles.textField}
                                />
                            </Grid>

                            {/* Row 5: Websites */}
                            <Grid size={{ xs: 12 }}>
                                <Typography component="label" className={styles.fieldLabel}>
                                    Websites
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="https://www.yourwebsite.com"
                                    value={formData.websites}
                                    onChange={handleChange('websites')}
                                    className={styles.textField}
                                />
                            </Grid>
                        </Grid>

                        {/* Action Buttons */}
                        <Box className={styles.actionRow}>
                            <Button
                                variant="contained"
                                onClick={handleUpdateClick}
                                disabled={!hasChanges}
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
