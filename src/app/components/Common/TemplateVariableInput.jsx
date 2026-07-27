'use client';

import React, { useState, useEffect, memo } from 'react';
import { TextField, IconButton, Tooltip, Box, Typography } from '@mui/material';
import { Smile, Code } from 'lucide-react';

/**
 * Reusable input for Template Variables
 * Handles local state for performance and includes emoji/dynamic buttons
 */
const TemplateVariableInput = memo(({ 
    label, 
    value, 
    onChange, 
    onEmojiClick, 
    onVariableClick,
    placeholder = "Start typing...",
    showDynamic = true,
    fullWidth = true,
    className = ""
}) => {
    const [localValue, setLocalValue] = useState(value || '');

    // Sync local state with prop when prop changes externally
    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value || '');
        }
    }, [value]);

    // Debounce the parent update to avoid laggy re-renders while typing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    return (
        <Box sx={{ width: fullWidth ? '100%' : 'auto' }} className={className}>
            {label && (
                <Typography
                    component="label"
                    sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--secondary-color)',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '0.5rem',
                        letterSpacing: '0.5px'
                    }}
                >
                    {label}
                </Typography>
            )}
            <TextField
                fullWidth={fullWidth}
                placeholder={placeholder}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={() => {
                    if (localValue !== value) {
                        onChange(localValue);
                    }
                }}
                variant="outlined"
                size="small"
                slotProps={{
                    input: {
                        sx: { 
                            borderRadius: '8px',
                            backgroundColor: '#fff',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#e2e8f0'
                            }
                        },
                        endAdornment: (
                            <Box sx={{ display: 'flex', gap: 0.25 }}>
                                {onEmojiClick && (
                                    <Tooltip title="Add Emoji">
                                        <IconButton 
                                            size="small" 
                                            onClick={onEmojiClick}
                                            sx={{ color: 'var(--secondary-color)', '&:hover': { color: '#fbbf24', backgroundColor: '#fffbeb' } }}
                                        >
                                            <Smile size={16} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {showDynamic && onVariableClick && (
                                    <Tooltip title="Add Dynamic Variable">
                                        <IconButton 
                                            size="small" 
                                            onClick={onVariableClick}
                                            sx={{ color: 'var(--secondary-color)', '&:hover': { color: 'var(--primary-main)', backgroundColor: 'var(--primary-light-bg)' } }}
                                        >
                                            <Code size={16} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        ),
                    }
                }}
            />
        </Box>
    );
});

export default TemplateVariableInput;
