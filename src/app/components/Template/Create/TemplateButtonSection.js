'use client';

import React from 'react';
import { Button, TextField, Typography, InputAdornment, Menu, MenuItem, Divider, ListSubheader, IconButton, Tooltip, Box } from '@mui/material';
import { Plus, X, MousePointerClick, Phone, Globe } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const phoneInputStyles = {
    input: {
        width: '100%',
        height: '40px',
        fontSize: '0.875rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-paper)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '500'
    },
    button: {
        border: '1px solid var(--border-color)',
        borderRadius: '10px 0 0 10px',
        backgroundColor: 'var(--bg-subtle)'
    },
    dropdown: {
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        zIndex: 1,
        fontFamily: 'Inter, sans-serif'
    },
    search: {
        margin: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '0.875rem'
    },
    container: {
        marginBottom: '0.5rem',
        width: '100%'
    }
};

const TemplateButtonSection = ({
    title,
    subtitle,
    buttons = [],
    styles,
    isMenuOpen,
    menuOptions = [],
    buttonLimits = {},
    addButtonDisabled = false,
    addButtonFullWidth = false,
    isCarouselContext = false,
    onToggleMenu,
    onAddButton,
    onUpdateButton,
    onRemoveButton,
}) => {
    const addButtonRef = React.useRef(null);
    const quickReplyButtons = buttons.filter((btn) => btn.type === 'QUICK_REPLY');
    const otherButtons = buttons.filter((btn) => btn.type !== 'QUICK_REPLY');
    const {
        maxQuickReply = isCarouselContext ? 1 : 6,
        maxPhone = 1,
        maxUrl = isCarouselContext ? 1 : 2,
    } = buttonLimits;

    const hasQuickReply = quickReplyButtons.length >= maxQuickReply;
    const hasPhone = buttons.filter((btn) => btn.type === 'PHONE_NUMBER').length >= maxPhone;
    const hasUrl = buttons.filter((btn) => btn.type === 'URL').length >= maxUrl;
    const hasCallToAction = hasPhone || hasUrl;

    const handleCloseMenu = () => {
        if (isMenuOpen && onToggleMenu) {
            onToggleMenu();
        }
    };

    const handleAddButton = (type) => {
        onAddButton(type);
    };

    return (
        <>
            {(title || subtitle) && (
                <>
                    {title && <h3 className={styles.sectionTitle}>{title}</h3>}
                    {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
                </>
            )}

            <Box className={styles.addButtonDropdownWrap}>
                <Box className={styles.quickAddButtons}>
                    <Tooltip title={hasQuickReply ? "Meta allows only 1 Quick Reply button" : "Add Quick Reply Button"} arrow>
                        <span style={{ display: 'inline-flex' }}>
                            <Button
                                className={styles.quickAddBtn}
                                onClick={() => handleAddButton('QUICK_REPLY')}
                                disabled={addButtonDisabled || hasQuickReply}
                                startIcon={<MousePointerClick size={14} />}
                            >
                                Quick Reply
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={isCarouselContext && hasUrl ? "Meta allows only 1 Call-to-action button per carousel card" : (hasPhone ? "Meta allows only 1 Call Phone Number button" : "Add Call Phone Number Button")} arrow>
                        <span style={{ display: 'inline-flex' }}>
                            <Button
                                className={styles.quickAddBtn}
                                onClick={() => handleAddButton('PHONE_NUMBER')}
                                disabled={addButtonDisabled || hasPhone || (isCarouselContext && hasUrl)}
                                startIcon={<Phone size={14} />}
                            >
                                Call
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={isCarouselContext && hasPhone ? "Meta allows only 1 Call-to-action button per carousel card" : (hasUrl ? "Meta allows only 2 Visit Website buttons (1 for carousel)" : "Add Visit Website Button")} arrow>
                        <span style={{ display: 'inline-flex' }}>
                            <Button
                                className={styles.quickAddBtn}
                                onClick={() => handleAddButton('URL')}
                                disabled={addButtonDisabled || hasUrl || (isCarouselContext && hasPhone)}
                                startIcon={<Globe size={14} />}
                            >
                                Website
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={addButtonDisabled ? "Maximum buttons reached per Meta policy" : "More Button Options"} arrow>
                        <span style={{ display: 'inline-flex' }}>
                            <Button
                                ref={addButtonRef}
                                className={`${styles.quickAddBtn} ${styles.moreBtn}`}
                                onClick={onToggleMenu}
                                disabled={addButtonDisabled}
                                startIcon={<Plus size={14} />}
                            >
                                More
                            </Button>
                        </span>
                    </Tooltip>
                </Box>

                <Menu
                    anchorEl={addButtonRef.current}
                    open={Boolean(isMenuOpen)}
                    onClose={handleCloseMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1,
                                minWidth: 280,
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)'
                            }
                        }
                    }}
                >
                    {menuOptions.map((section, sectionIdx) => (
                        <Box key={section.section}>
                            <ListSubheader sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.8 }}>
                                {section.section}
                            </ListSubheader>
                            {section.items.map((item) => {
                                let itemDisabled = item.disabled;
                                if (item.key === 'QUICK_REPLY' && quickReplyButtons.length >= maxQuickReply) itemDisabled = true;
                                if (item.key === 'PHONE_NUMBER' && buttons.filter((btn) => btn.type === 'PHONE_NUMBER').length >= maxPhone) itemDisabled = true;
                                if (item.key === 'URL' && buttons.filter((btn) => btn.type === 'URL').length >= maxUrl) itemDisabled = true;
                                if (isCarouselContext) {
                                    if (item.key === 'PHONE_NUMBER' && buttons.some((btn) => btn.type === 'URL')) itemDisabled = true;
                                    if (item.key === 'URL' && buttons.some((btn) => btn.type === 'PHONE_NUMBER')) itemDisabled = true;
                                }
                                return (
                                    <MenuItem
                                        key={item.key}
                                        disabled={itemDisabled}
                                        onClick={() => handleAddButton(item.key)}
                                        sx={{ fontSize: '0.85rem', fontWeight: 600 }}
                                    >
                                        {item.label}
                                    </MenuItem>
                                );
                            })}
                            {sectionIdx < menuOptions.length - 1 && <Divider sx={{ my: 0.5 }} />}
                        </Box>
                    ))}
                </Menu>
            </Box>

            <Box className={styles.buttonList}>
                {quickReplyButtons.length > 0 && (
                    <Box
                        sx={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '12px',
                            background: 'var(--bg-paper)'
                        }}
                    >
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', mb: 1 }}>
                            Quick Reply
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {quickReplyButtons.map((btn) => {
                                const idx = buttons.findIndex((b) => b.id === btn.id);
                                return (
                                    <Box
                                        key={btn.id || idx}
                                        sx={{
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'stretch',
                                            width: '100%'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                flex: 1,
                                                background: 'var(--bg-subtle)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                position: 'relative'
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={() => onRemoveButton(btn, idx)}
                                                sx={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    top: 6,
                                                    color: 'var(--text-secondary)',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--warning-light-bg)'
                                                    }
                                                }}
                                                title="Delete"
                                            >
                                                <X size={16} />
                                            </IconButton>

                                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.7 }}>
                                                Button Text
                                            </Typography>

                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={btn.text || ''}
                                                onChange={(e) => onUpdateButton(btn, idx, { text: e.target.value.slice(0, 25) })}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <span className={styles.inlineCounter}>{(btn.text || '').length}/25</span>
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}

                {otherButtons.length > 0 && (
                    <Box
                        sx={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '12px',
                            background: 'var(--bg-paper)'
                        }}
                    >
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', mb: 1, display: 'flex', alignItems: 'center', gap: 0.7 }}>
                            <MousePointerClick size={14} />
                            Call-to-action Buttons
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {otherButtons.map((btn) => {
                                const idx = buttons.findIndex((b) => b.id === btn.id);
                                return (
                                    <Box className={styles.buttonConfigCard} key={btn.id || idx}>
                                        <IconButton
                                            size="small"
                                            onClick={() => onRemoveButton(btn, idx)}
                                            sx={{
                                                position: 'absolute',
                                                right: 8,
                                                top: 6,
                                                color: 'var(--text-secondary)',
                                                '&:hover': {
                                                    backgroundColor: 'var(--warning-light-bg)'
                                                }
                                            }}
                                            title="Delete"
                                        >
                                            <X size={16} />
                                        </IconButton>

                                        <Box className={styles.buttonConfigRow}>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.7 }}>
                                                    Button Text
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={btn.text || ''}
                                                    placeholder={btn.type === 'URL' ? 'Visit Website' : btn.type === 'PHONE_NUMBER' ? 'Call Now' : 'Custom'}
                                                    onChange={(e) => onUpdateButton(btn, idx, { text: e.target.value.slice(0, 25) })}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <span className={styles.inlineCounter}>{(btn.text || '').length}/25</span>
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                />
                                            </Box>

                                            {btn.type === 'PHONE_NUMBER' && (
                                                <Box sx={{ minWidth: '70%', flex: isCarouselContext ? 1 : 'unset' }}>
                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.7 }}>
                                                        Phone Number
                                                    </Typography>
                                                    <PhoneInput
                                                        country={'in'}
                                                        value={btn.phone_number || ''}
                                                        onChange={(value) => onUpdateButton(btn, idx, { phone_number: value })}
                                                        enableSearch={true}
                                                        countryCodeEditable={true}
                                                        inputStyle={phoneInputStyles.input}
                                                        buttonStyle={phoneInputStyles.button}
                                                        dropdownStyle={phoneInputStyles.dropdown}
                                                        searchStyle={phoneInputStyles.search}
                                                        containerStyle={phoneInputStyles.container}
                                                    />
                                                </Box>
                                            )}

                                            {btn.type === 'URL' && (
                                                <Box sx={{ minWidth: 380, width: '70%' }}>
                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.7 }}>
                                                        Website URL
                                                    </Typography>
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        value={btn.url || ''}
                                                        onChange={(e) => onUpdateButton(btn, idx, { url: e.target.value.slice(0, 2000) })}
                                                        placeholder="https://example.com"
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <span className={styles.inlineCounter}>{(btn.url || '').length}/2000</span>
                                                                </InputAdornment>
                                                            )
                                                        }}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Box>
        </>
    );
};

export default TemplateButtonSection;
