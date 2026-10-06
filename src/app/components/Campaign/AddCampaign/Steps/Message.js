import React, { useState, useEffect, useCallback } from 'react';
import { Typography, TextField, Button, RadioGroup, Radio, FormControlLabel, Select, MenuItem, Box, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Menu, ListItemText, ListItemIcon, Popover, Skeleton, Alert, Drawer, useMediaQuery, Paper } from '@mui/material';
import { Smile, Send, Info, Eye, X, Smartphone, BadgeCheck, Check } from 'lucide-react';
import SelectAutocomplete from '../../Audience/SelectAutocomplete';
import { useAuthToken } from '../../../../hooks/useAuthToken';
import { useWallet } from '../../../../contexts/WalletContext';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import MessagePreview from '../../../Common/MessagePreview';
import TemplateVariableInput from '../../../Common/TemplateVariableInput';
import DynamicVariableMenu from '../DynamicVariableMenu';
import SendTemplateDialog from '../../../SendTemplateDialog/SendTemplateDialog';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import styles from '../AddCampaign.module.scss';
import { fetchTemplateLists } from '@/app/api/TemplateList';
import { getChannelDisplayName, getChannelSubName, getChannelMobile } from '../../../Chat/utils/chatUtils';
import { Whatsapp } from '../../../../assests/svg';

// Returns the URL only when it's a usable http(s) image URL — '' for junk values
const getValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '-' || /^(null|undefined|n\/a)$/i.test(trimmed)) return '';
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? trimmed : '';
  } catch {
    return '';
  }
};

const getChannelImgUrl = (ch) =>
  getValidImageUrl(ch.ChannelImage || ch.channelImage || ch.ProfilePictureUrl || ch.profilePictureUrl || ch.profile_picture_url);

// ── Local Input Wrapper for General Performance ──────────────────────────────
const LocalTextField = React.memo(({ value, onChange, ...props }) => {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value || '');
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <TextField
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
    />
  );
});



const Message = ({ onNext, onBack, onMessageConfigured, showError, messageError, onTemplateData, onChannelSelect, channelId, preSelectedTemplate }) => {
  const { userToken } = useAuthToken();
  const { channels } = useWallet();
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState(channelId || '');
  const [channelImgErrors, setChannelImgErrors] = useState({});

  useEffect(() => {
    if (channelId && channelId !== selectedChannel) {
      setSelectedChannel(channelId);
    }
  }, [channelId]);

  // Auto-select the default channel (same as chat dashboard), or the only channel
  if (!selectedChannel && channels?.length) {
    const defaultCh = channels.find((c) => Number(c.IsDefault) === 1);
    if (defaultCh || channels.length === 1) {
      setSelectedChannel(String((defaultCh || channels[0]).Id));
    }
  }

  useEffect(() => {
    onChannelSelect?.(selectedChannel);
  }, [selectedChannel, onChannelSelect]);
  const [messageType, setMessageType] = useState('preApprovedTemplate');
  const [template, setTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
  const [autoFillText, setAutoFillText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [variableCount, setVariableCount] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [regularMessageType, setRegularMessageType] = useState('Text');
  const [regularMessageText, setRegularMessageText] = useState('');
  const [variableMenuAnchor, setVariableMenuAnchor] = useState(null);
  const [selectedVariableIndex, setSelectedVariableIndex] = useState(null);
  const [sendTestDialogOpen, setSendTestDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [mediaDataMissing, setMediaDataMissing] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const isMobilePreview = useMediaQuery('(max-width:768px)');

  const handleVariableMenuOpen = (event, index) => {
    setVariableMenuAnchor(event.currentTarget);
    setSelectedVariableIndex(index);
  };

  const handleVariableMenuClose = () => {
    setVariableMenuAnchor(null);
    setSelectedVariableIndex(null);
  };

  const handleVariableSelect = (variableValue) => {
    if (selectedVariableIndex !== null) {
      setVariables(prev => ({
        ...prev,
        [selectedVariableIndex + 1]: variableValue
      }));
    }
    handleVariableMenuClose();
  };

  // Fetch templates only when a channel is selected
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!userToken?.userId && !userToken?.userid && !userToken?.appuserid) return;
      if (!selectedChannel) {
        setTemplates([]);
        return;
      }
      setTemplatesLoading(true);
      try {
        const response = await fetchTemplateLists(userToken?.userId || userToken?.userid || userToken?.appuserid, selectedChannel);
        if (response?.data) {
          setTemplates(response.data);
          // Auto-select template when editing/cloning (matched by TemplateId from draft)
          if (preSelectedTemplate?.TemplateId) {
            const matched = response.data.find(t => String(t.Id) === String(preSelectedTemplate.TemplateId));
            if (matched) setTemplate(matched);
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, [userToken?.userId, userToken?.userid, userToken?.appuserid, selectedChannel]);

  // Parse template to get variable count
  useEffect(() => {
    if (!template) {
      setVariableCount(0);
      setVariables({});
      onTemplateData?.(null);
      setPreviewData(null);
      setMediaDataMissing(false);
      return;
    }

    try {
      // Parse Components to extract variable count
      const components = JSON.parse(template.Components);
      let mediaUrls = [];
      try {
        if (Array.isArray(template.MediaData)) {
          mediaUrls = template.MediaData.filter(Boolean);
        } else if (typeof template.MediaData === 'string' && template.MediaData.trim()) {
          const parsedMedia = JSON.parse(template.MediaData);
          mediaUrls = Array.isArray(parsedMedia) ? parsedMedia.filter(Boolean) : [];
        }
      } catch (mediaError) {
        console.error('Error parsing template media data:', mediaError);
      }

      // Extract header, footer, buttons, carousel for preview
      const header = components.find(c => c.type === 'HEADER');
      const body = components.find(c => c.type === 'BODY');
      const footer = components.find(c => c.type === 'FOOTER');
      const buttons = components.find(c => c.type === 'BUTTONS');
      const carousel = components.find(c => String(c?.type || '').toUpperCase() === 'CAROUSEL');
      const isCarousel = Array.isArray(carousel?.cards);

      // Check if MediaData is missing for image or carousel templates
      const hasMediaHeader = header && header.format !== 'TEXT';
      const isMediaTemplate = hasMediaHeader || isCarousel;
      const hasValidMediaData = mediaUrls.length > 0;
      
      if (isMediaTemplate && !hasValidMediaData) {
        setMediaDataMissing(true);
      } else {
        setMediaDataMissing(false);
      }

      // Build preview data
      let previewHeaderType = 'None';
      let previewHeaderText = '';
      let previewHeaderTextExample = '';
      let previewHeaderMedia = null;
      let previewFooter = '';
      let previewButtons = [];
      let previewCarouselCards = [];
      let previewTemplateType = 'Interactive';

      if (isCarousel) {
        previewTemplateType = 'Carousel';
        previewCarouselCards = carousel.cards.map((card, idx) => {
          const cardComps = card.components || [];
          const cardHeader = cardComps.find(c => String(c?.type || '').toUpperCase() === 'HEADER');
          const cardBody = cardComps.find(c => String(c?.type || '').toUpperCase() === 'BODY');
          const cardButtons = cardComps.find(c => String(c?.type || '').toUpperCase() === 'BUTTONS');
          const cardHandle = cardHeader?.example?.header_handle?.[0] || '';
          const cardMediaUrl = mediaUrls[idx] || cardHandle;
          const cardFormat = (cardHeader?.format || 'IMAGE').toLowerCase();

          return {
            id: card.id || idx,
            header: {
              mediaType: cardFormat,
              file: null,
              existingHandle: cardHandle,
              mediaUrl: cardMediaUrl,
            },
            body: cardBody?.text || '',
            buttons: (cardButtons?.buttons || []).map((b, bIdx) => ({
              id: b.id || bIdx,
              type: b.type,
              text: b.text,
              phone_number: b.phone_number,
              url: b.url,
              urlType: b.url_type === 'DYNAMIC' ? 'DYNAMIC' : 'STATIC',
              example: b.example,
            })),
          };
        });
      } else {
        // Non-carousel template
        if (header) {
          if (header.format === 'TEXT') {
            previewHeaderType = 'Text';
            previewHeaderText = header.text || '';
            previewHeaderTextExample = header.example?.header_text?.[0] || '';
          } else {
            previewHeaderType = 'Media';
            const headerHandle = header.example?.header_handle?.[0] || '';
            const headerFormat = (header.format || 'IMAGE').toLowerCase();
            // Use MediaData URL if available, otherwise fall back to header_handle
            const mediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : headerHandle;
            previewHeaderMedia = {
              mediaType: headerFormat,
              file: null,
              existingHandle: headerHandle,
              mediaUrl: mediaUrl,
            };
          }
        }

        previewFooter = footer?.text || '';
        previewButtons = (buttons?.buttons || []).map((b, idx) => ({
          id: b.id || idx,
          type: b.type,
          text: b.text,
          phone_number: b.phone_number,
          url: b.url,
          urlType: b.url_type === 'DYNAMIC' ? 'DYNAMIC' : 'STATIC',
          example: b.example,
        }));
      }

      setPreviewData({
        headerType: previewHeaderType,
        headerText: previewHeaderText,
        headerTextExample: previewHeaderTextExample,
        headerMedia: previewHeaderMedia,
        footer: previewFooter,
        buttons: previewButtons,
        templateType: previewTemplateType,
        carouselCards: previewCarouselCards,
        body: body?.text || '',
      });

      if (components && components.length > 0) {
        const bodyComponent = components.find(c => c.type === 'BODY');
        if (bodyComponent && bodyComponent.text) {
          // Count {{1}}, {{2}}, etc. placeholders
          const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
          const count = matches ? matches.length : 0;
          setVariableCount(count);

          // Initialize variables object if count changes - Pre-fill with sample values if available
          const newVars = {};
          const bodyExample = bodyComponent?.example?.body_text?.[0] || [];
          for (let i = 1; i <= count; i++) {
            newVars[i] = bodyExample[i - 1] || '';
          }
          setVariables(newVars);

          // Pass template data to parent
          const templateData = {
            TemplateId: template.TemplateId || template.Id,
            WabaTemplateId: template.WabaTemplateId,
            TemplateJson: template.TemplateJson,
            Components: components,
            MediaUrls: mediaUrls,
            variables: newVars,
            mediaDataMissing: false
          };
          onTemplateData?.(templateData);
        } else {
          setVariableCount(0);
          setVariables({});
          onTemplateData?.({
            TemplateId: template.TemplateId || template.Id,
            WabaTemplateId: template.WabaTemplateId,
            TemplateJson: template.TemplateJson,
            Components: components,
            MediaUrls: mediaUrls,
            variables: {},
            mediaDataMissing: false
          });
        }
      } else {
        setVariableCount(0);
        setVariables({});
        onTemplateData?.(null);
      }
    } catch (error) {
      console.error('Error parsing template components:', error);
      setVariableCount(0);
      setVariables({});
      onTemplateData?.(null);
      setPreviewData(null);
    }
  }, [template, onTemplateData]);

  const getTemplateLabel = (option) => {
    if (!option) return '';
    return `${option.TemplateName} (${option.TemplateType})`;
  };

  const handleVariableChange = useCallback((index, value) => {
    setVariables(prev => {
      if (prev[index] === value) return prev;
      return {
        ...prev,
        [index]: value
      };
    });
  }, []);

  const handleEmojiPickerOpen = (event, index) => {
    setEmojiAnchorEl(event.currentTarget);
    setEmojiPickerOpen(index !== undefined ? index : 'regularMessage');
  };

  const handleEmojiPickerClose = () => {
    setEmojiPickerOpen(null);
    setEmojiAnchorEl(null);
  };

  const handleEmojiSelect = (emoji) => {
    if (emojiPickerOpen === 'regularMessage') {
      setRegularMessageText(prev => prev + emoji.native);
    } else if (emojiPickerOpen !== null) {
      const currentValue = variables[emojiPickerOpen] || '';
      setVariables(prev => ({
        ...prev,
        [emojiPickerOpen]: currentValue + emoji.native
      }));
    }
    handleEmojiPickerClose();
  };

  // Show preview column when: template is selected (preApproved) OR regular message mode
  const showPreview = (messageType === 'preApprovedTemplate' && template !== null) || messageType === 'regularMessage';

  // Check if message is configured
  useEffect(() => {
    let isConfigured = false;

    if (messageType === 'preApprovedTemplate') {
      // Check if template is selected, has valid media (if required), and all variables are filled
      if (template && !mediaDataMissing) {
        const allVarsFilled = Object.values(variables).every(val => val && val.trim() !== '');
        isConfigured = variableCount === 0 || allVarsFilled;
      }
    } else if (messageType === 'regularMessage') {
      // Check if message text is not empty
      isConfigured = regularMessageText && regularMessageText.trim() !== '';
    }

    onMessageConfigured?.(isConfigured);
  }, [messageType, template, variables, variableCount, regularMessageText, onMessageConfigured, mediaDataMissing]);

  // Update template data when variables change - Debounced
  useEffect(() => {
    if (template && variableCount > 0) {
      const timer = setTimeout(() => {
        try {
          const components = JSON.parse(template.Components);
          let mediaUrls = [];
          try {
            if (Array.isArray(template.MediaData)) {
              mediaUrls = template.MediaData.filter(Boolean);
            } else if (typeof template.MediaData === 'string' && template.MediaData.trim()) {
              const parsedMedia = JSON.parse(template.MediaData);
              mediaUrls = Array.isArray(parsedMedia) ? parsedMedia.filter(Boolean) : [];
            }
          } catch (mediaError) {
            console.error('Error parsing template media data:', mediaError);
          }

          onTemplateData?.({
            TemplateId: template.TemplateId || template.Id,
            WabaTemplateId: template.WabaTemplateId,
            TemplateJson: template.TemplateJson,
            Components: components,
            MediaUrls: mediaUrls,
            variables,
            mediaDataMissing
          });
        } catch (error) {
          console.error('Error parsing template components:', error);
        }
      }, 400); // Larger debounce for the heavy parent update
      return () => clearTimeout(timer);
    }
  }, [variables, template, variableCount, onTemplateData]);

  return (
    <div className={styles.formCard}>
      {/* Mobile preview toggle */}
      {isMobilePreview && showPreview && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Eye size={16} />}
            onClick={() => setMobilePreviewOpen(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Preview
          </Button>
        </Box>
      )}

      <Grid container spacing={4}>
        {/* Left: Form */}
        <Grid size={{ lg: showPreview ? 8 : 12, md: showPreview ? 8 : 12, sm: 12, xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!selectedChannel && (
            <Box className={`${styles.infoAlert} ${messageError ? styles.errorAlert : ''}`}>
              <Info size={18} className={styles.alertIcon} />
              <Typography variant="body2" className={styles.alertMessage}>
                {messageError
                  ? 'Please select a channel to continue.'
                  : 'Please select a channel to proceed. Templates are channel-specific, so you need to choose a channel before configuring your message.'}
              </Typography>
            </Box>
          )}

          {/* Channel Selection - Cards on desktop (≤4 channels), dropdown otherwise */}
          <div className={styles.formField}>
            <label className={styles.label}>Channel</label>
            {channels && channels.length > 0 && channels.length <= 4 && !isMobilePreview ? (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                {channels.map((ch) => {
                  const isSelected = String(selectedChannel) === String(ch.Id);
                  const imgUrl = getChannelImgUrl(ch);
                  const showImg = Boolean(imgUrl) && !channelImgErrors[ch.Id];
                  const subName = getChannelSubName(ch);
                  const mobile = getChannelMobile(ch);
                  const isDefault = Number(ch.IsDefault) === 1;
                  const isActive = ch.IsActive !== 0;
                  return (
                    <Paper
                      key={ch.Id}
                      onClick={() => {
                        if (!isActive) return;
                        setSelectedChannel(String(ch.Id));
                        setTemplate(null);
                      }}
                      sx={{
                        position: 'relative',
                        cursor: isActive ? 'pointer' : 'not-allowed',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #1daa61' : '1px solid #e4e8ee',
                        background: isSelected ? 'rgba(29,170,97,0.04)' : '#fff',
                        p: 2,
                        minWidth: 240,
                        maxWidth: 320,
                        flex: '1 1 240px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        opacity: isActive ? 1 : 0.55,
                        '&:hover': isActive ? {
                          borderColor: 'rgba(29,170,97,0.4)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          transform: 'translateY(-1px)',
                        } : {},
                      }}
                    >
                      {/* Avatar — channel photo in a rounded-square box, like the dashboard card */}
                      <Box sx={{ position: 'relative', flexShrink: 0 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            background: showImg ? 'transparent' : 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(29,170,97,0.15)',
                            overflow: 'hidden',
                          }}
                        >
                          {showImg ? (
                            <Box
                              component="img"
                              src={imgUrl}
                              alt={getChannelDisplayName(ch)}
                              onError={() => setChannelImgErrors((prev) => (prev[ch.Id] ? prev : { ...prev, [ch.Id]: true }))}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <Whatsapp width={22} height={22} fill="#1daa61" />
                          )}
                        </Box>
                        {ch.IsOfficialAccount === 1 && (
                          <Box sx={{ position: 'absolute', bottom: -2, right: -2, background: '#fff', borderRadius: '50%', display: 'flex', lineHeight: 0 }}>
                            <BadgeCheck size={15} color="#1daa61" fill="#fff" />
                          </Box>
                        )}
                      </Box>

                      {/* Name + subname + phone */}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#444050', fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getChannelDisplayName(ch)}
                          </Typography>
                          {isDefault && (
                            <Tooltip title="Default channel" arrow placement="top">
                              <Box
                                component="span"
                                sx={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: '50%',
                                  background: '#1daa61',
                                  flexShrink: 0,
                                  boxShadow: '0 0 0 2px rgba(29,170,97,0.18)',
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                        {subName && (
                          <Typography sx={{ fontSize: '0.7rem', color: '#8a8794', fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {subName}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, color: '#6D6B77' }}>
                          <Smartphone size={11} />
                          <Typography component="span" sx={{ fontSize: '0.72rem', fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mobile || '-'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Selected check */}
                      {isSelected && (
                        <Box sx={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#1daa61', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} strokeWidth={3} />
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Select
                value={selectedChannel}
                onChange={(e) => {
                  setSelectedChannel(e.target.value);
                  setTemplate(null);
                }}
                displayEmpty
                sx={{
                  width: '100%',
                  borderRadius: '8px',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.875rem',
                  color: '#444050',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1daa61' },
                }}
              >
                <MenuItem value="" disabled sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: '#9e9e9e' }}>
                  Select a channel
                </MenuItem>
                {channels && channels.map((ch) => {
                  const mobile = getChannelMobile(ch);
                  return (
                    <MenuItem key={ch.Id} value={String(ch.Id)} sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem' }}>
                      {getChannelDisplayName(ch)} {mobile && mobile !== '-' ? `(${mobile})` : ''}
                    </MenuItem>
                  );
                })}
              </Select>
            )}
          </div>

          {/* Message Type - Only show after channel is selected */}
          {selectedChannel && (
          <div className={styles.formField}>
            <label className={styles.label}>Message Type</label>
            <RadioGroup
              row
              value={messageType}
              onChange={(e) => {
                if (e.target.value === 'regularMessage') {
                  toast('Regular Message coming soon...', { icon: '🚧' });
                  return;
                }
                setMessageType(e.target.value);
              }}
              className={styles.messageTypeRadioGroup}
            >
              <FormControlLabel
                value="preApprovedTemplate"
                control={<Radio />}
                label="Pre Approved Template"
                className={styles.radioLabel}
              />
              <FormControlLabel
                value="regularMessage"
                control={<Radio />}
                label="Regular Message"
                className={styles.radioLabel}
              />
            </RadioGroup>

            {/* Info Box - Conditional based on message type */}
            <Box className={styles.infoAlert}>
              <Info size={18} className={styles.alertIcon} />
              <Typography variant="body2" className={styles.alertMessage}>
                {messageType === 'preApprovedTemplate'
                  ? 'Pre-Approved Template messages are approved by Meta and ensure delivery. If your recipient has not messaged you in last 24 Hours, regular messages can not be delivered where Pre-Approved messages can be delivered out of this window.'
                  : 'Regular messages are delivered in 24 Hours Active Session Window. If your recipient has not messages you in last 24 Hours, these messages will not be delivered. You can use Pre-Approved Template Messages to ensure delivery. You can also use system field Last Seen Timestamp to filter the audience with active session.'}
              </Typography>
            </Box>

            {messageError && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'var(--error-light-bg)', borderRadius: '8px', border: '1px solid var(--error-main)' }}>
                <Typography sx={{ color: 'var(--error-main)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Message configuration is required. Please configure your message before proceeding.
                </Typography>
              </Box>
            )}
          </div>
          )}

          {/* Template Section - Only show for Pre Approved Template when channel is selected */}
          {messageType === 'preApprovedTemplate' && selectedChannel && (
            <div className={styles.formField} style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Template</label>
              {templatesLoading ? (
                <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: '8px' }} />
              ) : (
                <SelectAutocomplete
                  value={template}
                  onChange={(e, newValue) => setTemplate(newValue)}
                  options={templates}
                  placeholder="Select a template"
                  getOptionLabel={getTemplateLabel}
                  disabled={templatesLoading}
                />
              )}
            </div>
          )}

          {/* MediaData Missing Alert */}
          {mediaDataMissing && template && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 2, 
                borderRadius: '8px',
                '& .MuiAlert-icon': {
                  fontSize: '24px'
                }
              }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => router.push(`/templates?search=${encodeURIComponent(template.TemplateName)}`)}
                  sx={{ 
                    minWidth:'200px',
                    fontWeight: 600,
                    textTransform: 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  Update Template
                </Button>
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Template has no valid image
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    This template requires media but has no valid image. Please update the template with a valid image before using it in your campaign.
                  </Typography>
                </Box>
              </Box>
            </Alert>
          )}

          {/* Regular Message Section - Only show for Regular Message */}
          {messageType === 'regularMessage' && (
            <>
              {/* Regular Message Type */}
              <div className={styles.formField}>
                <label className={styles.label}>Message Type</label>
                <Select
                  value={regularMessageType}
                  onChange={(e) => setRegularMessageType(e.target.value)}
                  variant="outlined"
                  size="small"
                  className={styles.textField}
                  fullWidth
                >
                  <MenuItem value="Text">Text</MenuItem>
                  <MenuItem value="Image">Image</MenuItem>
                  <MenuItem value="Document">Document</MenuItem>
                  <MenuItem value="Video">Video</MenuItem>
                </Select>
              </div>

              {/* Text Message Area */}
              <div className={styles.formField}>
                <label className={styles.label}>Message</label>
                <LocalTextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Start typing..."
                  value={regularMessageText}
                  onChange={(val) => setRegularMessageText(val)}
                  variant="outlined"
                  className={styles.textField}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Typography variant="caption" className={styles.charCount}>
                            {regularMessageText.length} characters
                          </Typography>
                          <Tooltip title="Add Emoji">
                            <IconButton
                              size="small"
                              className={styles.inputIconButton}
                              onClick={(e) => handleEmojiPickerOpen(e, 'regularMessage')}
                            >
                              <Smile size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ),
                    },
                  }}
                />
              </div>
            </>
          )}

          {/* Auto Fill Button - Only show for Pre Approved Template with variables */}
          {messageType === 'preApprovedTemplate' && variableCount > 0 && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 1.5 }}>
              <Button
                variant='contained'
                className='secondaryBtnClassname'
                onClick={() => setAutoFillDialogOpen(true)}
              >
                Auto Fill Body Variables
              </Button>
            </Box>
          )}

          {/* Variables Section - Only show for Pre Approved Template */}
          {messageType === 'preApprovedTemplate' && variableCount > 0 && (
            <div className={`${styles.variablesSection} ${variableCount > 4 ? styles.threeColumns : ''} ${variableCount > 9 ? styles.fourColumns : ''}`}>
              {Array.from({ length: variableCount }, (_, i) => i + 1).map(index => (
                <TemplateVariableInput
                  key={index}
                  label={`BODY VARIABLE #${index}`}
                  value={variables[index] || ''}
                  onChange={(val) => handleVariableChange(index, val)}
                  onEmojiClick={(e) => handleEmojiPickerOpen(e, index)}
                  onVariableClick={(e) => handleVariableMenuOpen(e, index - 1)}
                  className={styles.variableInput}
                />
              ))}
            </div>
          )}

          {/* Dynamic Variables Menu */}
          <DynamicVariableMenu
            anchorEl={variableMenuAnchor}
            open={Boolean(variableMenuAnchor)}
            onClose={handleVariableMenuClose}
            onSelect={handleVariableSelect}
          />

          {/* Send Test Message Button */}
          {(messageType === 'preApprovedTemplate' && template) && (
            <Box className={styles.sendTestButtonContainer}>
              <Button
                variant="contained"
                className='secondaryBtnClassname'
                startIcon={<Send size={18} />}
                onClick={() => setSendTestDialogOpen(true)}
              >
                Send Test Message
              </Button>
            </Box>
          )}

          {/* Auto Fill Dialog - Only show for Pre Approved Template */}
          {messageType === 'preApprovedTemplate' && (
            <Dialog
              open={autoFillDialogOpen}
              onClose={() => setAutoFillDialogOpen(false)}
              maxWidth="md"
              fullWidth
              slotProps={{ paper: { className: styles.autoFillDialogPaper } }}
            >
              <DialogTitle className={styles.dialogTitle}>Auto Fill Body Variables</DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <Typography variant="body2" className={styles.dialogHelperText}>
                  Enter values separated by commas or new lines. Each value will be assigned to a variable in order.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Enter variable values separated by commas or new lines...&#10;Example: John, jane@example.com, +919876543210"
                  value={autoFillText}
                  onChange={(e) => setAutoFillText(e.target.value)}
                  variant="outlined"
                  className={styles.autoFillTextArea}
                />
              </DialogContent>
              <DialogActions className={styles.dialogActions}>
                <Button onClick={() => setAutoFillDialogOpen(false)} className='varientOutlinedBtn'>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Parse text by comma or new line
                    const values = autoFillText
                      .split(/[\n,]+/)
                      .map(v => v.trim())
                      .filter(v => v.length > 0);

                    // Fill variables in order based on variableCount
                    const newVars = {};
                    for (let i = 1; i <= variableCount; i++) {
                      if (values[i - 1]) {
                        newVars[i] = values[i - 1];
                      } else {
                        newVars[i] = variables[i] || '';
                      }
                    }
                    setVariables(newVars);

                    setAutoFillText('');
                    setAutoFillDialogOpen(false);
                  }}
                  className='buttonClassname'
                >
                  Apply
                </Button>
              </DialogActions>
            </Dialog>
          )}

          {/* Action Buttons */}
          <div className={styles.formActions}>
            <Button className='varientOutlinedBtn' onClick={onBack}>
              Back
            </Button>
            <Button className='buttonClassname' onClick={onNext}>
              Next
            </Button>
          </div>
        </Grid>

        {/* Right: Preview — desktop only; mobile uses drawer */}
        {showPreview && !isMobilePreview && (
          <Grid size={{ lg: 4, md: 4 }}>
            {messageType === 'preApprovedTemplate' && template ? (
              <MessagePreview
                headerType={previewData?.headerType || 'None'}
                headerText={previewData?.headerText || ''}
                headerTextExample={previewData?.headerTextExample || ''}
                headerMedia={previewData?.headerMedia || null}
                body={previewData?.body || ''}
                footer={previewData?.footer || ''}
                buttons={previewData?.buttons || []}
                templateType={previewData?.templateType || 'Interactive'}
                carouselCards={previewData?.carouselCards || []}
                variableValues={variables}
                showEmptyHint={false}
              />
            ) : messageType === 'regularMessage' ? (
              <MessagePreview
                headerType="None"
                headerText=""
                headerTextExample=""
                headerMedia={null}
                body={regularMessageText}
                footer=""
                buttons={[]}
                templateType="Interactive"
                carouselCards={[]}
                variableValues={{}}
                showEmptyHint={false}
              />
            ) : null}
          </Grid>
        )}
      </Grid>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={handleEmojiPickerClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              overflow: 'hidden'
            }
          }
        }}
      >
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
        />
      </Popover>

      {/* Send Test Message Dialog */}
      <SendTemplateDialog
        open={sendTestDialogOpen}
        onClose={() => setSendTestDialogOpen(false)}
        template={template}
        userToken={userToken}
        wabaPhoneNo={
          channels?.find((c) => String(c.Id) === String(selectedChannel))?.WabaPhoneNo
          || channels?.find((c) => String(c.Id) === String(selectedChannel))?.MobileNumber
          || channels?.find((c) => String(c.Id) === String(selectedChannel))?.mobileNumber
          || ''
        }
      />

      {/* Mobile Preview Drawer */}
      <Drawer
        anchor="right"
        open={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 400 },
              p: 2,
              background: '#f8fafc',
              borderRadius:'16px 0px 0px 16px'
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>Preview</Typography>
          <IconButton size="small" onClick={() => setMobilePreviewOpen(false)}>
            <X size={18} />
          </IconButton>
        </Box>
        {messageType === 'preApprovedTemplate' && template ? (
          <MessagePreview
            headerType={previewData?.headerType || 'None'}
            headerText={previewData?.headerText || ''}
            headerTextExample={previewData?.headerTextExample || ''}
            headerMedia={previewData?.headerMedia || null}
            body={previewData?.body || ''}
            footer={previewData?.footer || ''}
            buttons={previewData?.buttons || []}
            templateType={previewData?.templateType || 'Interactive'}
            carouselCards={previewData?.carouselCards || []}
            variableValues={variables}
            showEmptyHint={false}
          />
        ) : messageType === 'regularMessage' ? (
          <MessagePreview
            headerType="None"
            headerText=""
            headerTextExample=""
            headerMedia={null}
            body={regularMessageText}
            footer=""
            buttons={[]}
            templateType="Interactive"
            carouselCards={[]}
            variableValues={{}}
            showEmptyHint={false}
          />
        ) : null}
      </Drawer>
    </div>
  );
};

export default Message;
