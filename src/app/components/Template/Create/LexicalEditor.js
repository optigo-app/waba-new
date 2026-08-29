'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    $createParagraphNode,
    $createTextNode,
    $getRoot,
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    $isParagraphNode,
    $isTextNode,
    TextNode,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Smile, Code, Bold, Italic, Strikethrough, Braces } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { VariableNode, $createVariableNode, $isVariableNode } from './VariableNode';
import styles from './LexicalEditor.module.scss';

const iconButtonSx = {
    color: 'var(--text-secondary)',
    padding: '6px',
    borderRadius: '8px',
    transition: 'all 0.2s ease-in-out',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
        background: 'var(--primary-light-bg)',
        color: 'var(--primary-main)',
        borderRadius: '8px',
    },
};

const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
const IS_STRIKETHROUGH = 1 << 3;
const IS_CODE = 1 << 4;

const PLACEHOLDER_PREFIX = '\u0000VAR';
const PLACEHOLDER_SUFFIX = '\u0000';

function buildWhatsAppText(editorState) {
    return editorState.read(() => {
        const root = $getRoot();
        const paragraphs = [];
        root.getChildren().forEach((paragraph) => {
            if (!$isParagraphNode(paragraph)) return;
            const parts = [];
            paragraph.getChildren().forEach((node) => {
                if ($isVariableNode(node)) {
                    parts.push(`{{${node.getNumber()}}}`);
                } else if ($isTextNode(node)) {
                    const format = node.getFormat();
                    let content = node.getTextContent();
                    if (format & IS_CODE) content = `\`${content}\``;
                    if (format & IS_STRIKETHROUGH) content = `~${content}~`;
                    if (format & IS_ITALIC) content = `_${content}_`;
                    if (format & IS_BOLD) content = `*${content}*`;
                    parts.push(content);
                }
            });
            paragraphs.push(parts.join(''));
        });
        return paragraphs.join('\n');
    });
}

function parseWhatsAppText(text, maxLength = 1024) {
    const raw = (text || '').slice(0, maxLength);
    const variableMap = new Map();
    let counter = 0;
    const withPlaceholders = raw.replace(/\{\{(\d+)\}\}/g, (match, number) => {
        const key = `${PLACEHOLDER_PREFIX}${counter++}${PLACEHOLDER_SUFFIX}`;
        variableMap.set(key, number);
        return key;
    });

    const paragraphs = withPlaceholders.split('\n');
    const paragraphNodes = [];

    paragraphs.forEach((paragraph) => {
        const p = $createParagraphNode();
        const tokens = tokenizeParagraph(paragraph, variableMap);
        tokens.forEach((token) => {
            if (token.type === 'variable') {
                p.append($createVariableNode(token.number));
            } else {
                const textNode = $createTextNode(token.text);
                if (token.bold) textNode.setFormat(textNode.getFormat() | IS_BOLD);
                if (token.italic) textNode.setFormat(textNode.getFormat() | IS_ITALIC);
                if (token.strikethrough) textNode.setFormat(textNode.getFormat() | IS_STRIKETHROUGH);
                if (token.code) textNode.setFormat(textNode.getFormat() | IS_CODE);
                p.append(textNode);
            }
        });
        paragraphNodes.push(p);
    });

    return paragraphNodes;
}

function tokenizeParagraph(text, variableMap) {
    const tokens = [];
    const stack = [];
    let i = 0;

    function pushText(str, formats) {
        if (!str) return;
        const existing = tokens[tokens.length - 1];
        if (existing && existing.type === 'text' && sameFormats(existing, formats)) {
            existing.text += str;
        } else {
            tokens.push({ type: 'text', text: str, ...formats });
        }
    }

    function sameFormats(a, b) {
        return a.bold === b.bold && a.italic === b.italic && a.strikethrough === b.strikethrough && a.code === b.code;
    }

    function currentFormats() {
        return stack.reduce((acc, f) => ({ ...acc, [f]: true }), {
            bold: false, italic: false, strikethrough: false, code: false
        });
    }

    while (i < text.length) {
        const placeholder = Array.from(variableMap.keys()).find((key) => text.startsWith(key, i));
        if (placeholder) {
            const number = variableMap.get(placeholder);
            tokens.push({ type: 'variable', number });
            i += placeholder.length;
            continue;
        }

        const ch = text[i];

        if (ch === '\\' && i + 1 < text.length && '*_~`'.includes(text[i + 1])) {
            pushText(text[i + 1], currentFormats());
            i += 2;
            continue;
        }

        if (ch === '`' && stack.includes('code')) {
            stack.splice(stack.lastIndexOf('code'), 1);
            i += 1;
            continue;
        } else if (ch === '`') {
            stack.push('code');
            i += 1;
            continue;
        }

        if (stack.includes('code')) {
            pushText(ch, currentFormats());
            i += 1;
            continue;
        }

        const markerMap = { '*': 'bold', '_': 'italic', '~': 'strikethrough' };
        if (markerMap[ch]) {
            const format = markerMap[ch];
            if (stack.includes(format)) {
                stack.splice(stack.lastIndexOf(format), 1);
            } else {
                stack.push(format);
            }
            i += 1;
            continue;
        }

        pushText(ch, currentFormats());
        i += 1;
    }

    return tokens;
}

function EditorToolbar({
    maxLength,
    charCount,
    effectiveCharCount,
    showFormatting,
    showEmoji,
    showVariableButton,
    emojiPickerOpen,
    onToggleEmoji,
    onEmojiSelect,
    onAddVariableFromToolbar,
}) {
    const [editor] = useLexicalComposerContext();
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        strikethrough: false,
        code: false,
    });

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    setActiveFormats({
                        bold: selection.hasFormat('bold'),
                        italic: selection.hasFormat('italic'),
                        strikethrough: selection.hasFormat('strikethrough'),
                        code: selection.hasFormat('code'),
                    });
                }
            });
        });
    }, [editor]);

    const toggleFormat = (format) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    const activeStyle = (isActive) => (isActive ? {
        background: 'var(--primary-light-bg)',
        color: 'var(--primary-main)',
    } : {});

    const displayCount = effectiveCharCount != null ? effectiveCharCount : charCount;
    const isOverLimit = displayCount > maxLength;

    return (
        <Box className={styles.bodyFooterRow}>
            <span className={styles.charCounter} style={{ color: isOverLimit ? 'var(--error-main)' : 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: isOverLimit ? 600 : 400 }}>
                Characters: {displayCount}/{maxLength}
                {isOverLimit && ' — exceeds limit'}
            </span>
            {showFormatting && (
                <Box className={styles.formattingButtons} sx={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                    {showEmoji && (
                        <Tooltip title="Add Emoji">
                            <IconButton size="small" sx={{ ...iconButtonSx, ...activeStyle(false) }} onClick={onToggleEmoji}>
                                <Smile size={16} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Bold">
                        <IconButton
                            size="small"
                            sx={{ ...iconButtonSx, ...activeStyle(activeFormats.bold) }}
                            onClick={() => toggleFormat('bold')}
                        >
                            <Bold size={16} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Italic">
                        <IconButton
                            size="small"
                            sx={{ ...iconButtonSx, ...activeStyle(activeFormats.italic) }}
                            onClick={() => toggleFormat('italic')}
                        >
                            <Italic size={16} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Strikethrough">
                        <IconButton
                            size="small"
                            sx={{ ...iconButtonSx, ...activeStyle(activeFormats.strikethrough) }}
                            onClick={() => toggleFormat('strikethrough')}
                        >
                            <Strikethrough size={16} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Code">
                        <IconButton
                            size="small"
                            sx={{ ...iconButtonSx, ...activeStyle(activeFormats.code) }}
                            onClick={() => toggleFormat('code')}
                        >
                            <Code size={16} />
                        </IconButton>
                    </Tooltip>
                    {showVariableButton && (
                        <Tooltip title="Add Variable Placeholder">
                            <IconButton size="small" sx={iconButtonSx} onClick={onAddVariableFromToolbar}>
                                <Braces size={16} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )}
            {emojiPickerOpen && (
                <Box className={styles.emojiPickerWrapper}>
                    <Picker data={data} onEmojiSelect={onEmojiSelect} theme="light" />
                </Box>
            )}
        </Box>
    );
}

function EditorInner({
    value,
    onChange,
    maxLength,
    placeholder,
    showFormatting,
    showEmoji,
    showVariableButton,
    emojiPickerOpen,
    onToggleEmoji,
    onEmojiSelect,
    variableKeys,
    textareaRef,
    charCount,
    setCharCount,
    effectiveCharCount,
}) {
    const [editor] = useLexicalComposerContext();
    const editorRef = useRef(null);

    const setValue = useCallback((text) => {
        editor.update(() => {
            const root = $getRoot();
            const current = buildWhatsAppText(editor.getEditorState());
            if (current === text) return;
            root.clear();
            const paragraphNodes = parseWhatsAppText(text, maxLength);
            if (paragraphNodes.length === 0) {
                root.append($createParagraphNode());
            } else {
                paragraphNodes.forEach((p) => root.append(p));
            }
            root.selectEnd();
        });
    }, [editor, maxLength]);

    useEffect(() => {
        setValue(value);
    }, [setValue, value]);

    useEffect(() => {
        if (textareaRef) {
            textareaRef.current = {
                focus: () => editor.focus(),
                getSelectionRange: () => {
                    let range = null;
                    editor.getEditorState().read(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            range = { start: selection.anchor.offset, end: selection.focus.offset };
                        }
                    });
                    return range;
                },
            };
        }
    }, [editor, textareaRef]);

    const onAddVariableFromToolbar = useCallback(() => {
        const nextNum = variableKeys.length + 1;
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const node = $createVariableNode(nextNum);
                selection.insertNodes([node]);
            } else {
                const root = $getRoot();
                root.selectEnd();
                const node = $createVariableNode(nextNum);
                const lastParagraph = root.getLastChild();
                if ($isParagraphNode(lastParagraph)) {
                    lastParagraph.append(node);
                } else {
                    const p = $createParagraphNode();
                    p.append(node);
                    root.append(p);
                }
            }
            onChange(buildWhatsAppText(editor.getEditorState()));
        });
    }, [editor, onChange, variableKeys]);

    const handleEmojiSelect = useCallback((emoji) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                selection.insertNodes([$createTextNode(emoji.native)]);
            } else {
                const root = $getRoot();
                root.selectEnd();
                const lastParagraph = root.getLastChild();
                if ($isParagraphNode(lastParagraph)) {
                    lastParagraph.append($createTextNode(emoji.native));
                } else {
                    const p = $createParagraphNode();
                    p.append($createTextNode(emoji.native));
                    root.append(p);
                }
            }
            onChange(buildWhatsAppText(editor.getEditorState()));
        });
        onEmojiSelect(emoji);
    }, [editor, onChange, onEmojiSelect]);

    const onEditorChange = useCallback((editorState) => {
        const text = buildWhatsAppText(editorState);
        if (text.length > maxLength) {
            editor.update(() => {
                const root = $getRoot();
                root.clear();
                const paragraphNodes = parseWhatsAppText(text.slice(0, maxLength), maxLength);
                paragraphNodes.forEach((p) => root.append(p));
                root.selectEnd();
            });
            setCharCount(maxLength);
            onChange(text.slice(0, maxLength));
            return;
        }
        setCharCount(text.length);
        onChange(text);
    }, [editor, maxLength, onChange, setCharCount]);

    return (
        <div className={styles.editorWrapper} ref={editorRef}>
            <div className={styles.editorInner}>
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable className={styles.editorInput} />
                    }
                    placeholder={
                        <div className={styles.editorPlaceholder}>{placeholder}</div>
                    }
                    ErrorBoundary={({ error }) => <div className={styles.editorPlaceholder}>Error: {error.message}</div>}
                />
            </div>
            <HistoryPlugin />
            <OnChangePlugin onChange={onEditorChange} />
            <EditorToolbar
                maxLength={maxLength}
                charCount={charCount}
                effectiveCharCount={effectiveCharCount}
                showFormatting={showFormatting}
                showEmoji={showEmoji}
                showVariableButton={showVariableButton}
                emojiPickerOpen={emojiPickerOpen}
                onToggleEmoji={onToggleEmoji}
                onEmojiSelect={handleEmojiSelect}
                onAddVariableFromToolbar={onAddVariableFromToolbar}
                variableKeys={variableKeys}
            />
        </div>
    );
}

const LexicalEditor = ({
    value = '',
    onChange,
    placeholder = 'Enter body text',
    maxLength = 1024,
    effectiveCharCount,
    showFormatting = true,
    showEmoji = true,
    showVariableButton = false,
    emojiPickerOpen = false,
    onToggleEmoji,
    onEmojiSelect,
    onAddVariablePlaceholder,
    variableKeys = [],
    textareaRef,
}) => {
    const [charCount, setCharCount] = useState(value.length);

    const initialConfig = useMemo(() => ({
        namespace: 'WhatsAppTemplateEditor',
        theme: {
            paragraph: styles.editorParagraph,
            text: {
                bold: styles.editorTextBold,
                italic: styles.editorTextItalic,
                strikethrough: styles.editorTextStrikethrough,
                code: styles.editorTextCode,
            },
        },
        onError: (error) => console.error(error),
        nodes: [VariableNode, TextNode],
        editorState: null,
    }), []);

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <EditorInner
                value={value}
                onChange={onChange}
                maxLength={maxLength}
                effectiveCharCount={effectiveCharCount}
                placeholder={placeholder}
                showFormatting={showFormatting}
                showEmoji={showEmoji}
                showVariableButton={showVariableButton}
                emojiPickerOpen={emojiPickerOpen}
                onToggleEmoji={onToggleEmoji}
                onEmojiSelect={onEmojiSelect}
                variableKeys={variableKeys}
                textareaRef={textareaRef}
                charCount={charCount}
                setCharCount={setCharCount}
            />
            <div className={styles.charCounterDisplay} style={{ display: 'none' }}>{charCount}</div>
        </LexicalComposer>
    );
}

export default LexicalEditor;
