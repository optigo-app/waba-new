'use client';

import React from 'react';
import { FormHelperText, FormControl } from '@mui/material';
import LexicalEditor from './LexicalEditor';

const TemplateBodyInput = ({
    value = '',
    onChange,
    placeholder = 'Enter body text',
    minRows = 6,
    maxRows = 12,
    maxLength = 1024,
    effectiveCharCount,
    error = false,
    helperText = '',
    showCharCounter = true,
    showFormatting = true,
    showEmoji = true,
    showVariableButton = false,
    emojiPickerOpen = false,
    onToggleEmoji,
    onEmojiSelect,
    onAddVariablePlaceholder,
    variableKeys = [],
    styles = {},
    parentStyles = {},
    textareaRef: forwardedRef,
}) => {
    return (
        <FormControl fullWidth error={error}>
            <LexicalEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
                effectiveCharCount={effectiveCharCount}
                showCharCounter={showCharCounter}
                showFormatting={showFormatting}
                showEmoji={showEmoji}
                showVariableButton={showVariableButton}
                emojiPickerOpen={emojiPickerOpen}
                onToggleEmoji={onToggleEmoji}
                onEmojiSelect={onEmojiSelect}
                onAddVariablePlaceholder={onAddVariablePlaceholder}
                variableKeys={variableKeys}
                textareaRef={forwardedRef}
            />
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    );
};

export default TemplateBodyInput;
