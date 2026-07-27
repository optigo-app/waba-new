'use client';

import React from 'react';
import { Paper, Typography, TextField, Button, LinearProgress, Box } from '@mui/material';
import { Image, Video, FileText, MapPin, Paperclip, X, Check } from 'lucide-react';
import { isOwnServerUrl } from '../../../utils/mediaUtils';

const TemplateHeaderSection = ({
    styles,
    builderData,
    headerMedia,
    headerOptions,
    mediaConfig,
    isUploading,
    uploadProgress,
    onHeaderTypeChange,
    onHeaderTextChange,
    onHeaderTextExampleChange,
    onHeaderMediaTypeChange,
    onHeaderMediaFileChange,
    onHeaderMediaRemove,
}) => {
    return (
        <Paper elevation={0} className={styles.sectionCard} sx={{ p: 3, mb: 2, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <h3 className={styles.sectionTitle}>Header</h3>
            <p className={styles.sectionSubtitle}>Add a title or choose which type of media you'll use for this header.</p>

            <Box className={styles.chipRow}>
                {headerOptions.map((opt) => {
                    const { icon: Icon, label, key } = opt;
                    const isSelected = builderData.headerType === key;
                    return (
                        <Button
                            key={key}
                            size="small"
                            className={`${styles.choiceChip} ${isSelected ? styles.activeChip : ''}`}
                            onClick={() => onHeaderTypeChange(key)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textTransform: 'none',
                                borderRadius: '999px',
                                padding: '0.45rem 1.1rem',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                backgroundColor: isSelected ? 'var(--primary-light-bg)' : '#ffffff',
                                color: isSelected ? 'var(--primary-main)' : 'var(--titleColor)',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--primary-main)' : 'var(--sidebar-borderColor)',
                                '&:hover': {
                                    borderColor: 'var(--primary-main)',
                                    backgroundColor: isSelected ? 'var(--primary-light-bg)' : 'rgba(29, 170, 97, 0.04)',
                                    color: 'var(--primary-main)',
                                },
                                minWidth: 'auto',
                            }}
                        >
                            <Icon size={16} />
                            {label}
                        </Button>
                    );
                })}
            </Box>

            {builderData.headerType === 'Text' && (
                <Box className={styles.headerTextWrap}>
                    <Box className={styles.sectionHeaderRow}>
                        <span className={styles.variableTitle}>Header Text</span>
                        <span className={styles.charCounter}>{builderData.headerText.length}/60</span>
                    </Box>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="e.g. Our {{1}} is on!"
                        value={builderData.headerText}
                        onChange={(e) => onHeaderTextChange(e.target.value.slice(0, 60))}
                    />
                    {/\{\{1\}\}/.test(builderData.headerText) && (
                        <TextField
                            fullWidth
                            size="small"
                            label="Sample value for {{1}}"
                            value={builderData.headerTextExample}
                            onChange={(e) => onHeaderTextExampleChange(e.target.value)}
                            placeholder="e.g. Summer Sale"
                            sx={{
                                mt: 1,
                                '& .MuiOutlinedInput-input': {
                                    color: '#444050',
                                    fontWeight: 500,
                                },
                                '& .MuiOutlinedInput-input::placeholder': {
                                    color: '#9e9ba8',
                                    opacity: '1 !important',
                                    fontWeight: 400,
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#7D7f85',
                                    fontWeight: 500,
                                },
                                '& .Mui-focused .MuiInputLabel-root': {
                                    color: '#1daa61',
                                },
                            }}
                        />
                    )}
                </Box>
            )}

            {builderData.headerType === 'Media' && (
                <Box className={styles.mediaPickerWrap}>
                    <Box className={styles.mediaIconGrid}>
                        {[
                            { type: 'image', Icon: Image, label: 'Image' },
                            { type: 'video', Icon: Video, label: 'Video' },
                            { type: 'document', Icon: FileText, label: 'Document' },
                            { type: 'location', Icon: MapPin, label: 'Location' },
                        ].map(({ type, Icon, label }) => {
                            const isActive = headerMedia.mediaType === type;
                            return (
                                <Button
                                    key={type}
                                    className={`${styles.mediaIconCard} ${isActive ? styles.mediaIconCardActive : ''}`}
                                    onClick={() => onHeaderMediaTypeChange(type)}
                                >
                                    {isActive && (
                                        <span className={styles.mediaIconCheck}>
                                            <Check size={10} strokeWidth={3} />
                                        </span>
                                    )}
                                    <Icon size={22} className={styles.mediaIconSvg} />
                                    <span className={styles.mediaIconLabel}>{label}</span>
                                    {type === 'location' && <span className={styles.mediaIconSoon}>soon</span>}
                                </Button>
                            );
                        })}
                    </Box>

                    {headerMedia.mediaType !== 'location' && (
                        <Box className={styles.mediaSampleBox}>
                            <h4 className={styles.mediaSampleTitle}>Sample for header content</h4>
                            <p className={styles.mediaSampleDesc}>
                                To help Meta review your content, provide examples of the variables or media in the header.
                                Do not include any customer information.
                            </p>

                            {!headerMedia.file && headerMedia.existingHandle && isOwnServerUrl(headerMedia.mediaUrl) && (
                                <Box className={styles.existingMediaRow}>
                                    {headerMedia.mediaType === 'image' && (
                                        <Box
                                            component="img"
                                            src={headerMedia.mediaUrl}
                                            alt="Current header"
                                            className={styles.existingMediaThumb}
                                        />
                                    )}
                                    {headerMedia.mediaType === 'video' && (
                                        <Box className={styles.existingMediaVideo} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Video size={18} />
                                            <span>Current video</span>
                                        </Box>
                                    )}
                                    {headerMedia.mediaType === 'document' && (
                                        <Box className={styles.existingMediaVideo} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FileText size={18} />
                                            <span>Current document</span>
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                        <p className={styles.existingMediaLabel}>
                                            Current file will be kept. Upload a new file to replace it.
                                        </p>
                                        <Button
                                            size="small"
                                            onClick={onHeaderMediaRemove}
                                            sx={{ minWidth: 'auto', padding: '4px 8px', color: 'var(--error-main)', fontSize: '0.75rem', gap: '4px' }}
                                        >
                                            <X size={14} />
                                            Remove
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            <Box className={styles.mediaSampleActions}>
                                <Button
                                    component="label"
                                    className={styles.mediaUploadBtn}
                                    startIcon={<Paperclip size={14} />}
                                >
                                    {headerMedia.existingHandle && !headerMedia.file ? 'Upload file' : `Choose ${headerMedia.mediaType === 'image' ? 'JPG or PNG' : headerMedia.mediaType === 'video' ? 'MP4' : 'PDF'} file`}
                                    <input
                                        hidden
                                        type="file"
                                        accept={mediaConfig[headerMedia.mediaType]?.mimes.join(',')}
                                        onChange={onHeaderMediaFileChange}
                                    />
                                </Button>
                                {headerMedia.file && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.mediaFileName}>{headerMedia.file.name}</span>
                                        <Button
                                            size="small"
                                            onClick={onHeaderMediaRemove}
                                            sx={{ minWidth: 'auto', padding: '4px', color: 'var(--error-main)' }}
                                        >
                                            <X size={16} />
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                            <Box className={styles.mediaHint}>
                                <span>Supported: {mediaConfig[headerMedia.mediaType]?.extensions} (Max {mediaConfig[headerMedia.mediaType]?.maxSizeLabel})</span>
                                {mediaConfig[headerMedia.mediaType]?.extraNote && (
                                    <span style={{ display: 'block', fontStyle: 'italic' }}>{mediaConfig[headerMedia.mediaType].extraNote}</span>
                                )}
                            </Box>
                            {isUploading && (
                                <Box className={styles.uploadProgressBox}>
                                    <Box className={styles.uploadProgressMeta}>
                                        <span>Uploading to Meta...</span>
                                        <span>{uploadProgress}%</span>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={uploadProgress}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: 'var(--primary-light-bg)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 3,
                                                backgroundColor: 'var(--primary-main)'
                                            }
                                        }}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Paper>
    );
};

export default TemplateHeaderSection;
