'use client';

import React, { memo } from 'react';
import { Paper, TextField, Box } from '@mui/material';
import TemplateBodyInput from './TemplateBodyInput';

const VariableInputs = memo(({
    styles,
    variableKeys,
    variableValues,
    onVariableValueChange,
}) => {
    if (variableKeys.length === 0) return null;
    return (
        <Box className={styles.variableSection}>
            <span className={styles.variableTitle} style={{ display: 'block', marginBottom: '16px' }}>Sample variable values</span>
            <Box className={styles.variableInputList}>
                {variableKeys.map((key) => (
                    <TextField
                        key={key}
                        fullWidth
                        size="small"
                        label={`{{${key}}} sample`}
                        value={variableValues[key] || ''}
                        onChange={(e) => onVariableValueChange(key, e.target.value)}
                        placeholder="e.g. John"
                        sx={{
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
                ))}
            </Box>
        </Box>
    );
});

const MemoizedTemplateBodyInput = memo(TemplateBodyInput, (prev, next) => {
    return (
        prev.value === next.value &&
        prev.maxLength === next.maxLength &&
        prev.error === next.error &&
        prev.helperText === next.helperText &&
        prev.emojiPickerOpen === next.emojiPickerOpen &&
        prev.showCharCounter === next.showCharCounter &&
        prev.showFormatting === next.showFormatting &&
        prev.showEmoji === next.showEmoji &&
        prev.showVariableButton === next.showVariableButton &&
        prev.variableKeys === next.variableKeys &&
        prev.styles === next.styles
    );
});

const TemplateBodySection = ({
    styles,
    body,
    templateType,
    saveError,
    bodyCharCount,
    emojiPickerOpen,
    variableKeys,
    variableValues,
    onBodyChange,
    onToggleEmoji,
    onEmojiSelect,
    onAddVariablePlaceholder,
    onVariableValueChange,
    textareaRef,
}) => {
    return (
        <Paper elevation={0} className={styles.sectionCard} sx={{ p: 2.5, mb: 2, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <h3 className={styles.sectionTitle}>Body <span style={{ color: 'red' }}>*</span></h3>
            <p className={styles.sectionSubtitle}>Enter the text for your message in the language that you've selected.</p>
            <MemoizedTemplateBodyInput
                value={body}
                onChange={(value) => onBodyChange(value)}
                placeholder="Enter body text"
                minRows={1}
                maxRows={12}
                maxLength={1024}
                error={saveError === 'Template body is required.'}
                helperText={saveError === 'Template body is required.' ? 'This field is required' : ''}
                showCharCounter={true}
                showFormatting={true}
                showEmoji={true}
                showVariableButton={true}
                emojiPickerOpen={emojiPickerOpen}
                onToggleEmoji={onToggleEmoji}
                onEmojiSelect={onEmojiSelect}
                onAddVariablePlaceholder={onAddVariablePlaceholder}
                variableKeys={variableKeys}
                styles={styles}
                textareaRef={textareaRef}
            />
            {variableKeys.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, mb: 1.5 }}>
                    <span style={{
                        fontSize: '0.78rem',
                        fontWeight: bodyCharCount > 1024 ? 600 : 400,
                        color: bodyCharCount > 1024 ? '#ef4444' : 'var(--secondary-color)',
                    }}>
                        Effective characters (with variable values): {bodyCharCount}/1024
                        {bodyCharCount > 1024 && ' — exceeds limit'}
                    </span>
                </Box>
            )}
            <VariableInputs
                styles={styles}
                variableKeys={variableKeys}
                variableValues={variableValues}
                onVariableValueChange={onVariableValueChange}
            />
        </Paper>
    );
};

export default TemplateBodySection;
