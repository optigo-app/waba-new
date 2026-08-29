import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Grid, Box, TextField, Alert, Chip } from '@mui/material';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { RefreshCw, Link, Info, Upload } from 'lucide-react';
import TemplateVariableInput from '../Common/TemplateVariableInput';
import { sendTemplate } from '../../api/SendTemplate';
import { filesUploadApi } from '../../api/filesUploadApi';
import toast from 'react-hot-toast';
import styles from './SendTemplateDialog.module.scss';
import MessagePreview from '../Common/MessagePreview';
import { extractTemplatePreviewData } from '../../utils/templatePreviewUtils';
import { isOwnServerUrl } from '../../utils/mediaUtils';
import { MEDIA_CONFIG, validateMediaFile } from '../../utils/templateBuilderUtils';
import { getInvalidImageUrls } from '../../utils/globalFunc';

const phoneInputStyles = {
    input: {
        width: '100%',
        height: '42px',
        fontSize: '0.9rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        '&:focus': {
            borderColor: '#6366f1',
            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
        },
    },
    button: {
        border: 'none',
        background: 'transparent',
        padding: '0 8px',
    },
    dropdown: {
        zIndex: 9999,
    },
    search: {
        width: '100%',
        marginBottom: '8px',
    },
    container: {
        width: '100%',
    },
};

const SendTemplateDialog = ({ open, onClose, template, userToken }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [templateVariables, setTemplateVariables] = useState({});
    const [variableErrors, setVariableErrors] = useState({});
    const [sendLoading, setSendLoading] = useState(false);
    const [publicMediaUrl, setPublicMediaUrl] = useState('');
    const [publicCarouselUrls, setPublicCarouselUrls] = useState({});
    const [uploadedMediaFile, setUploadedMediaFile] = useState(null);
    const [uploadedCarouselFiles, setUploadedCarouselFiles] = useState({});
    const [uploading, setUploading] = useState(false);
    const [hasCorruptOwnServerMedia, setHasCorruptOwnServerMedia] = useState(false);

    // Extract preview data from template using reusable utility
    const previewData = useMemo(() => {
        return extractTemplatePreviewData(template);
    }, [template]);

    useEffect(() => {
        let cancelled = false;

        const validateTemplateMediaUrls = async () => {
            if (!open || !template) {
                if (!cancelled) setHasCorruptOwnServerMedia(false);
                return;
            }

            const mediaUrls = getMediaUrls(template);
            const ownServerUrls = mediaUrls.filter((url) => isOwnServerUrl(url));

            if (ownServerUrls.length === 0) {
                if (!cancelled) setHasCorruptOwnServerMedia(false);
                return;
            }

            try {
                const invalidUrls = await getInvalidImageUrls(ownServerUrls);
                if (!cancelled) {
                    setHasCorruptOwnServerMedia(invalidUrls.length > 0);
                }
            } catch {
                if (!cancelled) {
                    setHasCorruptOwnServerMedia(false);
                }
            }
        };

        validateTemplateMediaUrls();

        return () => {
            cancelled = true;
        };
    }, [open, template]);

    const handlePhoneChange = (value) => {
        setPhoneNumber(value);
        setPhoneError('');
    };

    const extractTemplateVariables = (tmpl) => {
        if (!tmpl) return [];
        try {
            const components = JSON.parse(tmpl.Components || '[]');
            const bodyComponent = components.find(c => c.type === 'BODY');
            if (bodyComponent && bodyComponent.text) {
                const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
                if (matches) {
                    return matches.map(m => parseInt(m.match(/\d+/)[0]));
                }
            }
        } catch (error) {
            console.error('Error extracting variables:', error);
        }
        return [];
    };

    const isCarouselTemplate = (tmpl) => {
        if (!tmpl) return false;
        try {
            const components = JSON.parse(tmpl.Components || '[]');
            return components.some(c => c.type === 'CAROUSEL');
        } catch (error) {
            console.error('Error checking carousel:', error);
            return false;
        }
    };

    const getHeaderType = (tmpl) => {
        if (!tmpl) return 'None';
        try {
            const components = JSON.parse(tmpl.Components || '[]');
            const header = components.find(c => c.type === 'HEADER');
            return header?.format || 'None';
        } catch {
            return 'None';
        }
    };

    const getTemplateImageUrl = (tmpl) => {
        if (!tmpl) return null;
        try {
            const components = JSON.parse(tmpl.Components || '[]');
            const header = components.find(c => c.type === 'HEADER');
            if (header && header.example) {
                return header.example.header_handle?.[0] || null;
            }
        } catch {
            return null;
        }
        return null;
    };

    const getMediaUrls = (tmpl) => {
        if (!tmpl) return [];
        try {
            if (Array.isArray(tmpl.MediaData)) {
                return tmpl.MediaData.filter(Boolean);
            }
            if (typeof tmpl.MediaData === 'string' && tmpl.MediaData.trim()) {
                const parsed = JSON.parse(tmpl.MediaData);
                return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            }
        } catch (error) {
            console.error('Error parsing media data:', error);
        }
        return [];
    };

    const handleClose = () => {
        onClose();
        setPhoneNumber('');
        setPhoneError('');
        setTemplateVariables({});
        setVariableErrors({});
        setPublicMediaUrl('');
        setPublicCarouselUrls({});
        setUploadedMediaFile(null);
        setUploadedCarouselFiles({});
    };

    const handleMediaFileUpload = async (file) => {
        if (!file) return;
        const validation = validateMediaFile({
            file,
            mediaType: 'image',
            mediaConfig: MEDIA_CONFIG,
            includeMaxSizeLabel: true
        });
        
        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }
        
        setUploading(true);
        try {
            const result = await filesUploadApi({
                attachments: [{ file }],
                folderName: 'wababroadcast/sampletest',
                uniqueNo: `${Date.now()}_${Math.floor(Math.random() * 1000000)}`
            });
            if (result?.files?.[0]?.url) {
                setPublicMediaUrl(result.files[0].url);
                setUploadedMediaFile(file);
                toast.success('Image uploaded successfully');
            }
        } catch (error) {
            toast.error('Failed to upload image');
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleCarouselFileUpload = async (index, file) => {
        if (!file) return;
        
        // Validate file
        const validation = validateMediaFile({
            file,
            mediaType: 'image',
            mediaConfig: MEDIA_CONFIG,
            includeMaxSizeLabel: true
        });
        
        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }
        
        setUploading(true);
        try {
            const result = await filesUploadApi({
                attachments: [{ file }],
                folderName: 'wababroadcast/sampletest',
                uniqueNo: `${Date.now()}_${Math.floor(Math.random() * 1000000)}`
            });
            if (result?.files?.[0]?.url) {
                setPublicCarouselUrls(prev => ({ ...prev, [index]: result.files[0].url }));
                setUploadedCarouselFiles(prev => ({ ...prev, [index]: file }));
                toast.success(`Card ${index + 1} image uploaded successfully`);
            }
        } catch (error) {
            toast.error('Failed to upload image');
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleSend = async () => {
        // Validate mobile number
        if (!phoneNumber) {
            setPhoneError('Mobile number is required');
            return;
        }

        // Validate public media URLs if needed
        const mediaUrls = getMediaUrls(template);
        const hasOwnServerMedia = mediaUrls.some(url => isOwnServerUrl(url));
        const hasUsableOwnServerMedia = hasOwnServerMedia && !hasCorruptOwnServerMedia;
        const headerType = getHeaderType(template);
        const isImageTemplate = headerType === 'IMAGE';
        const isCarousel = isCarouselTemplate(template);

        if ((isImageTemplate || isCarousel) && !hasUsableOwnServerMedia) {
            if (isCarousel) {
                const carouselComponent = JSON.parse(template.Components || '[]').find(c => c.type === 'CAROUSEL');
                const cards = carouselComponent?.cards || [];
                const missingUrls = [];
                cards.forEach((card, index) => {
                    if (!publicCarouselUrls[index] && !uploadedCarouselFiles[index]) {
                        missingUrls.push(index + 1);
                    }
                });
                if (missingUrls.length > 0) {
                    toast.error(`Please provide images for Card ${missingUrls.join(', ')}`);
                    return;
                }
            } else {
                if (!publicMediaUrl && !uploadedMediaFile) {
                    toast.error('Please provide an image');
                    return;
                }
            }
        }

        // Validate template variables (only for non-carousel templates)
        if (!isCarouselTemplate(template)) {
            const vars = extractTemplateVariables(template);
            const errors = {};
            vars.forEach(varNum => {
                if (!templateVariables[varNum] || templateVariables[varNum].trim() === '') {
                    errors[varNum] = `Variable {{${varNum}}} is required`;
                }
            });

            if (Object.keys(errors).length > 0) {
                setVariableErrors(errors);
                toast.error('Please fill in all required template variables');
                return;
            }
        }

        setVariableErrors({});
        setSendLoading(true);

        // Parse phone number - PhoneInput returns full number with country code
        const phoneNo = phoneNumber.replace(/\D/g, '');

        // Build components with parameters
        let components = [];
        try { components = JSON.parse(template.Components || '[]'); } catch { components = []; }

        // Build components array for API
        const templateComponents = [];

        // Check if it's a carousel template
        if (isCarouselTemplate(template)) {
            const carouselComponent = components.find(c => c.type === 'CAROUSEL');
            if (carouselComponent && carouselComponent.cards) {
                const carouselCards = carouselComponent.cards.map((card, index) => {
                    const cardComponents = [];
                    const mediaUrlFromStore = mediaUrls[index];
                    const publicUrl = publicCarouselUrls[index];

                    // Extract header from each card
                    const cardHeader = card.components?.find(c => c.type === 'HEADER');
                    const fallbackHeaderUrl = cardHeader?.example?.header_handle?.[0];
                    // Priority: public URL > stored URL > fallback
                    const resolvedHeaderUrl = publicUrl || mediaUrlFromStore || fallbackHeaderUrl;

                    if (cardHeader) {
                        const headerParams = [];
                        if (cardHeader.format === 'IMAGE' && resolvedHeaderUrl) {
                            headerParams.push({ type: 'image', image: { link: resolvedHeaderUrl } });
                        } else if (cardHeader.format === 'VIDEO' && resolvedHeaderUrl) {
                            headerParams.push({ type: 'video', video: { link: resolvedHeaderUrl } });
                        } else if (cardHeader.format === 'DOCUMENT' && resolvedHeaderUrl) {
                            headerParams.push({ type: 'document', document: { link: resolvedHeaderUrl } });
                        } else if (cardHeader.format === 'PRODUCT') {
                            headerParams.push({
                                type: 'product',
                                product: {
                                    catalog_id: templateVariables['catalog_id'] || 'VARIABLE_CATALOG_ID',
                                    product_retailer_id: templateVariables['product_id'] || 'VARIABLE_PRODUCT_ID'
                                }
                            });
                        } else if (cardHeader.format === 'LOCATION') {
                            headerParams.push({
                                type: 'location',
                                location: {
                                    latitude: templateVariables['latitude'] || 'VARIABLE_LATITUDE',
                                    longitude: templateVariables['longitude'] || 'VARIABLE_LONGITUDE',
                                    name: templateVariables['location_name'] || 'VARIABLE_NAME',
                                    address: templateVariables['address'] || 'VARIABLE_ADDRESS'
                                }
                            });
                        } else if (cardHeader.text && /\{\{.+\}\}/.test(cardHeader.text)) {
                            const matches = cardHeader.text.match(/\{\{([^}]+)\}\}/g);
                            if (matches) {
                                matches.forEach((match, idx) => {
                                    const varNum = match.match(/\d+/)?.[0];
                                    headerParams.push({ type: 'text', text: templateVariables[varNum] || 'VARIABLE_TEXT' });
                                });
                            }
                        }
                        if (headerParams.length > 0) {
                            cardComponents.push({ type: 'header', parameters: headerParams });
                        }
                    }

                    // Handle buttons in carousel cards
                    const cardButtons = card.components?.find(c => c.type === 'BUTTONS');
                    if (cardButtons && Array.isArray(cardButtons.buttons)) {
                        cardButtons.buttons.forEach((btn, btnIndex) => {
                            if (btn.type === 'URL' && btn.url && /\{\{.+\}\}/.test(btn.url)) {
                                const matches = btn.url.match(/\{\{([^}]+)\}\}/g);
                                if (matches) {
                                    matches.forEach((match, idx) => {
                                        const varNum = match.match(/\d+/)?.[0];
                                        cardComponents.push({
                                            type: 'button',
                                            sub_type: 'url',
                                            index: btnIndex.toString(),
                                            parameters: [{ type: 'text', text: templateVariables[varNum] || 'VARIABLE_TEXT' }]
                                        });
                                    });
                                }
                            }
                        });
                    }

                    return {
                        card_index: index,
                        components: cardComponents
                    };
                });

                templateComponents.push({
                    type: 'carousel',
                    cards: carouselCards
                });
            }
        } else {
            // Regular template handling
            const headerType = getHeaderType(template);
            const templateImageUrl = mediaUrls[0] || getTemplateImageUrl(template);
            // Priority: public URL > stored URL > fallback
            const finalImageUrl = publicMediaUrl || templateImageUrl;

            // Handle HEADER component
            const header = components.find(c => c.type === 'HEADER');
            if (header) {
                const headerParams = [];
                if (header.format === 'IMAGE' && finalImageUrl) {
                    headerParams.push({ type: 'image', image: { link: finalImageUrl } });
                } else if (header.format === 'VIDEO' && finalImageUrl) {
                    headerParams.push({ type: 'video', video: { link: finalImageUrl } });
                } else if (header.format === 'DOCUMENT' && finalImageUrl) {
                    headerParams.push({ type: 'document', document: { link: finalImageUrl } });
                } else if (header.format === 'PRODUCT') {
                    headerParams.push({
                        type: 'product',
                        product: {
                            catalog_id: templateVariables['catalog_id'] || 'VARIABLE_CATALOG_ID',
                            product_retailer_id: templateVariables['product_id'] || 'VARIABLE_PRODUCT_ID'
                        }
                    });
                } else if (header.format === 'LOCATION') {
                    headerParams.push({
                        type: 'location',
                        location: {
                            latitude: templateVariables['latitude'] || 'VARIABLE_LATITUDE',
                            longitude: templateVariables['longitude'] || 'VARIABLE_LONGITUDE',
                            name: templateVariables['location_name'] || 'VARIABLE_NAME',
                            address: templateVariables['address'] || 'VARIABLE_ADDRESS'
                        }
                    });
                } else if (header.text && /\{\{.+\}\}/.test(header.text)) {
                    const matches = header.text.match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                        matches.forEach((match) => {
                            const varNum = match.match(/\d+/)?.[0];
                            headerParams.push({ type: 'text', text: templateVariables[varNum] || 'VARIABLE_TEXT' });
                        });
                    }
                }
                if (headerParams.length > 0) {
                    templateComponents.push({ type: 'header', parameters: headerParams });
                }
            }

            // Handle BODY component with variables
            const body = components.find(c => c.type === 'BODY');
            if (body && body.text && /\{\{.+\}\}/.test(body.text)) {
                const bodyParams = [];
                const matches = body.text.match(/\{\{([^}]+)\}\}/g);
                if (matches) {
                    matches.forEach((match) => {
                        const varNum = match.match(/\d+/)?.[0];
                        bodyParams.push({ type: 'text', text: templateVariables[varNum] || 'VARIABLE_TEXT' });
                    });
                }
                if (bodyParams.length > 0) {
                    templateComponents.push({ type: 'body', parameters: bodyParams });
                }
            }

            // Handle BUTTONS component
            const buttons = components.find(c => c.type === 'BUTTONS');
            if (buttons && Array.isArray(buttons.buttons)) {
                buttons.buttons.forEach((btn, index) => {
                    if (btn.type === 'URL' && btn.url && /\{\{.+\}\}/.test(btn.url)) {
                        const matches = btn.url.match(/\{\{([^}]+)\}\}/g);
                        if (matches) {
                            matches.forEach((match) => {
                                const varNum = match.match(/\d+/)?.[0];
                                templateComponents.push({
                                    type: 'button',
                                    sub_type: 'url',
                                    index: index.toString(),
                                    parameters: [{ type: 'text', text: templateVariables[varNum] || 'VARIABLE_TEXT' }]
                                });
                            });
                        }
                    } else if (btn.type === 'OTP') {
                        templateComponents.push({
                            type: 'button',
                            sub_type: 'url',
                            index: index.toString(),
                            parameters: [{ type: 'text', text: templateVariables['otp'] || 'VARIABLE_CODE' }]
                        });
                    } else if (btn.type === 'COPY_CODE') {
                        templateComponents.push({
                            type: 'button',
                            sub_type: 'copy_code',
                            index: index.toString(),
                            parameters: [{ type: 'text', text: templateVariables['copy_code'] || 'VARIABLE_CODE' }]
                        });
                    } else if (btn.type === 'CATALOG') {
                        templateComponents.push({
                            type: 'button',
                            sub_type: 'catalog',
                            index: index.toString(),
                            parameters: [{
                                type: 'action',
                                action: { thumbnail_product_retailer_id: templateVariables['product_id'] || 'VARIABLE_PRODUCT_ID' }
                            }]
                        });
                    } else if (btn.type === 'MPM') {
                        templateComponents.push({
                            type: 'button',
                            sub_type: 'mpm',
                            index: index.toString(),
                            parameters: [{
                                type: 'action',
                                action: {
                                    sections: [{
                                        title: templateVariables['section_title'] || 'VARIABLE_SECTION_TITLE',
                                        product_items: [{ product_retailer_id: templateVariables['product_id'] || 'VARIABLE_PRODUCT_ID' }]
                                    }]
                                }
                            }]
                        });
                    } else if (btn.type === 'FLOW') {
                        templateComponents.push({
                            type: 'button',
                            sub_type: 'flow',
                            index: index.toString(),
                            parameters: [{
                                type: 'action',
                                action: {
                                    flow_token: templateVariables['flow_token'] || 'VARIABLE_FLOW_TOKEN',
                                    flow_action_data: { key: 'value' }
                                }
                            }]
                        });
                    }
                });
            }

            // Handle ORDER_DETAILS component
            const orderDetails = components.find(c => c.type === 'ORDER_DETAILS');
            if (orderDetails) {
                templateComponents.push({
                    type: 'order_details',
                    parameters: [{
                        type: 'order_details',
                        order_details: {
                            order_number: templateVariables['order_number'] || 'VARIABLE_ORDER_NUMBER',
                            order_status: templateVariables['order_status'] || 'VARIABLE_ORDER_STATUS',
                            order_date: templateVariables['order_date'] || 'VARIABLE_ORDER_DATE',
                            total_amount: {
                                value: templateVariables['amount'] || 100,
                                currency: templateVariables['currency'] || 'VARIABLE_CURRENCY'
                            }
                        }
                    }]
                });
            }

            // Handle LIMITED_TIME_OFFER component
            const limitedTimeOffer = components.find(c => c.type === 'LIMITED_TIME_OFFER');
            if (limitedTimeOffer) {
                templateComponents.push({
                    type: 'limited_time_offer',
                    parameters: [{
                        type: 'limited_time_offer',
                        limited_time_offer: {
                            expiration_time_ms: Date.now() + 86400000
                        }
                    }]
                });
            }
        }

        // Build the API payload
        const payload = {
            phoneNo: phoneNo,
            appuserid: userToken?.userId || '',
            customerId: '',
            type: 'template',
            template: {
                name: template.TemplateName,
                language: {
                    code: template?.Language || 'en'
                }
            }
        };

        // Only add components if there are any
        if (templateComponents.length > 0) {
            payload.template.components = templateComponents;
        }

        // Call the API
        toast.promise(
            sendTemplate(payload).then((result) => {
                if (result.success) {
                    handleClose();
                    return 'Template sent successfully';
                } else {
                    throw new Error(result.error || 'Failed to send template');
                }
            }).finally(() => {
                setSendLoading(false);
            }),
            {
                loading: 'Sending template...',
                success: 'Template sent successfully',
                error: (err) => {
                    setSendLoading(false);
                    return err.message || 'Failed to send template';
                }
            }
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth='md'
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '16px',
                        padding: '16px',
                        width: '100%',
                        minWidth: '800px !important',
                        maxWidth: '900px !important'
                    }
                }
            }}
        >
            <DialogTitle style={{ fontWeight: 600, color: '#0f172a', paddingBottom: '8px' }}>
                Send Template
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3}>
                    {/* Left Side: Form Inputs */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', marginBottom: '1.5rem', marginTop: 0 }}>
                            Enter the recipient's mobile number to send the template <strong>{template?.TemplateName}</strong>.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>
                                Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <PhoneInput
                                country={'in'}
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                enableSearch={true}
                                countryCodeEditable={true}
                                disabled={sendLoading}
                                inputStyle={{
                                    ...phoneInputStyles.input,
                                    borderColor: phoneError ? '#ef4444' : '#e2e8f0',
                                    boxShadow: phoneError ? '0 0 0 1px #ef4444' : 'none',
                                    opacity: sendLoading ? 0.6 : 1
                                }}
                                buttonStyle={phoneInputStyles.button}
                                dropdownStyle={phoneInputStyles.dropdown}
                                searchStyle={phoneInputStyles.search}
                                containerStyle={phoneInputStyles.container}
                            />
                            {phoneError && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                                    {phoneError}
                                </span>
                            )}
                        </div>

                        {/* Template Variables */}
                        {extractTemplateVariables(template).length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: '0.75rem', display: 'block' }}>
                                    Template Variables <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {extractTemplateVariables(template).map(varNum => (
                                        <div key={varNum}>
                                            <TemplateVariableInput
                                                label={`Variable {{${varNum}}}`}
                                                value={templateVariables[varNum] || ''}
                                                onChange={(val) => {
                                                    setTemplateVariables(prev => ({ ...prev, [varNum]: val }));
                                                    if (variableErrors[varNum]) {
                                                        setVariableErrors(prev => {
                                                            const next = { ...prev };
                                                            delete next[varNum];
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                showDynamic={false}
                                                error={!!variableErrors[varNum]}
                                                disabled={sendLoading}
                                            />
                                            {variableErrors[varNum] && (
                                                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                                                    {variableErrors[varNum]}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Public Media URL - for templates without MediaData */}
                        {(() => {
                            const mediaUrls = getMediaUrls(template);
                            const hasOwnServerMedia = mediaUrls.some(url => isOwnServerUrl(url));
                            const hasUsableOwnServerMedia = hasOwnServerMedia && !hasCorruptOwnServerMedia;
                            const headerType = getHeaderType(template);
                            const isImageTemplate = headerType === 'IMAGE';
                            const isCarousel = isCarouselTemplate(template);

                            // Show if: image template OR carousel, and no own server media
                            if ((isImageTemplate || isCarousel) && !hasUsableOwnServerMedia) {
                                return (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>
                                            Image <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <div className={styles.infoAlert} style={{marginBottom: '1rem'}}>
                                            <Info size={18} className={styles.alertIcon} />
                                            <div className={styles.alertContent}>
                                                <Typography variant="body2" className={styles.alertMessage}>
                                                    This template needs an image. You can upload an image or provide a public URL.
                                                </Typography>
                                            </div>
                                        </div>
                                        {isCarousel ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {(() => {
                                                    const carouselComponent = JSON.parse(template.Components || '[]').find(c => c.type === 'CAROUSEL');
                                                    const cards = carouselComponent?.cards || [];
                                                    return cards.map((card, index) => (
                                                        <div key={index}>
                                                            <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                                                                Card {index + 1} Image
                                                            </label>
                                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                <Button
                                                                    component="label"
                                                                    variant="outlined"
                                                                    size="small"
                                                                    disabled={sendLoading || uploading}
                                                                    startIcon={<Upload size={14} />}
                                                                    sx={{ flexShrink: 0 }}
                                                                >
                                                                    {uploadedCarouselFiles[index] ? 'Change' : 'Upload'}
                                                                    <input
                                                                        hidden
                                                                        type="file"
                                                                        accept="image/*"
                                                                        key={uploadedCarouselFiles[index] ? `${index}-${uploadedCarouselFiles[index].name}` : `carousel-upload-${index}`}
                                                                        onChange={(e) => {
                                                                            const file = e.target.files[0];
                                                                            if (file) handleCarouselFileUpload(index, file);
                                                                        }}
                                                                    />
                                                                </Button>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    placeholder="Or paste URL here"
                                                                    value={publicCarouselUrls[index] || ''}
                                                                    onChange={(e) => setPublicCarouselUrls(prev => ({ ...prev, [index]: e.target.value }))}
                                                                    disabled={sendLoading}
                                                                    InputProps={{
                                                                        endAdornment: (
                                                                            <Chip
                                                                                label={publicCarouselUrls[index] || uploadedCarouselFiles[index] ? 'Added' : 'Required'}
                                                                                size="small"
                                                                                color={publicCarouselUrls[index] || uploadedCarouselFiles[index] ? 'success' : 'default'}
                                                                                sx={{ fontSize: '0.7rem' }}
                                                                            />
                                                                        )
                                                                    }}
                                                                />
                                                            </div>
                                                            {uploadedCarouselFiles[index] && (
                                                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                                                    Uploaded: {uploadedCarouselFiles[index].name}
                                                                </Typography>
                                                            )}
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <Button
                                                    component="label"
                                                    variant="outlined"
                                                    size="small"
                                                    disabled={sendLoading || uploading}
                                                    startIcon={<Upload size={14} />}
                                                    sx={{ flexShrink: 0 }}
                                                >
                                                    {uploadedMediaFile ? 'Change' : 'Upload'}
                                                    <input
                                                        hidden
                                                        type="file"
                                                        accept="image/*"
                                                        key={uploadedMediaFile ? uploadedMediaFile.name : 'upload-input'}
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) handleMediaFileUpload(file);
                                                        }}
                                                    />
                                                </Button>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    placeholder="Or paste URL here"
                                                    value={publicMediaUrl}
                                                    onChange={(e) => setPublicMediaUrl(e.target.value)}
                                                    disabled={sendLoading}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <Chip
                                                                label={publicMediaUrl || uploadedMediaFile ? 'Added' : 'Required'}
                                                                size="small"
                                                                color={publicMediaUrl || uploadedMediaFile ? 'success' : 'default'}
                                                                sx={{ fontSize: '0.7rem' }}
                                                            />
                                                        )
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {uploadedMediaFile && !isCarousel && (
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                                Uploaded: {uploadedMediaFile.name}
                                            </Typography>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </Grid>

                    {/* Right Side: Template Preview */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ mt: { md: 4 } }}>
                            {previewData ? (
                                <MessagePreview
                                    headerType={previewData.headerType}
                                    headerText={previewData.headerText}
                                    headerTextExample={previewData.headerTextExample}
                                    headerMedia={previewData.headerMedia}
                                    previewImageUrl={publicMediaUrl}
                                    body={previewData.body}
                                    footer={previewData.footer}
                                    buttons={previewData.buttons}
                                    templateType={previewData.templateType}
                                    carouselCards={previewData.carouselCards?.map((card, idx) => ({
                                        ...card,
                                        header: {
                                            ...card.header,
                                            mediaUrl: publicCarouselUrls[idx] || card.header.mediaUrl
                                        }
                                    }))}
                                    variableValues={templateVariables}
                                    showEmptyHint={false}
                                />
                            ) : (
                                <Typography sx={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', py: 4 }}>
                                    No template selected
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions style={{ paddingBlock: '12px' }}>
                <Button
                    onClick={handleClose}
                    color="inherit"
                    className='secondaryBtnClassname'
                    disabled={sendLoading}
                >
                    Close
                </Button>
                <Button
                    onClick={handleSend}
                    variant="contained"
                    color="primary"
                    className='buttonClassname'
                    disabled={sendLoading}
                    startIcon={sendLoading ? <RefreshCw size={16} className={styles.spinning} /> : null}
                >
                    {sendLoading ? 'Sending...' : 'Send'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SendTemplateDialog;
