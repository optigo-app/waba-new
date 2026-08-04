'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconButton } from '@mui/material';
import { X, Send, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, Loader2, Eraser } from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import { getStaticUrl } from '../../../utils/globalFunc';
import styles from './AiChatPanel.module.scss';

const GENERATE_EXAMPLES = [
    "A jewellery store bot that shows ring collections and lets users book appointments",
];

const EDIT_EXAMPLES = [
    "Add a video node after the welcome message",
    "Change the button text from 'Shop Now' to 'Browse Collection'",
    "Add a 'Back to menu' button on all category nodes",
];

const AI_CHAT_STORAGE_KEY = 'aiChatMessages';

const AiChatPanel = () => {
    const showAiModal = useFlowStore((state) => state.showAiModal);
    const setShowAiModal = useFlowStore((state) => state.setShowAiModal);
    const generateAiFlow = useFlowStore((state) => state.generateAiFlow);
    const editAiFlow = useFlowStore((state) => state.editAiFlow);
    const hasNodes = useFlowStore((state) => state.nodes.length > 0);

    const [aiMessages, setAiMessages] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = sessionStorage.getItem(AI_CHAT_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {}
        return [];
    });
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiLoadingStep, setAiLoadingStep] = useState(0);
    const [lastResult, setLastResult] = useState(null);
    const loadingTimerRef = useRef(null);
    const aiChatEndRef = useRef(null);
    const aiInputRef = useRef(null);

    // Auto-detect mode: edit if nodes exist, generate otherwise
    const mode = hasNodes ? 'edit' : 'generate';

    useEffect(() => {
        if (typeof window !== 'undefined' && aiMessages.length > 0) {
            try {
                sessionStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(aiMessages));
            } catch {}
        }
    }, [aiMessages]);

    useEffect(() => {
        if (showAiModal) {
            // Restore from sessionStorage or create fresh greeting
            const hasSaved = aiMessages.length > 0;
            if (!hasSaved) {
                setAiMessages([
                    {
                        role: 'ai',
                        text: mode === 'edit'
                            ? "Hi! I can see your flow on the canvas. Tell me what to change — I'll apply it instantly."
                            : "Hi! Describe the WhatsApp chatbot you want, and I'll build the complete flow for you.",
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                ]);
            }
            setLastResult(null);
            setAiInput('');
            setAiLoading(false);
            setAiLoadingStep(0);
            setTimeout(() => {
                aiInputRef.current?.focus();
            }, 300);
        }
    }, [showAiModal]);

    useEffect(() => {
        aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages, aiLoading]);

    // Auto-grow textarea
    const handleInputChange = useCallback((e) => {
        setAiInput(e.target.value);
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }, []);

    const handleSend = async () => {
        const text = aiInput.trim();
        if (!text || aiLoading) return;

        const userMsg = {
            role: 'user',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setAiMessages((prev) => [...prev, userMsg]);
        setAiInput('');
        if (aiInputRef.current) aiInputRef.current.style.height = 'auto';
        setAiLoading(true);
        setAiLoadingStep(0);
        setLastResult(null);

        loadingTimerRef.current = setInterval(() => {
            setAiLoadingStep((prev) => (prev + 1) % 4);
        }, 2000);

        // Auto-detect mode at send time
        const currentMode = useFlowStore.getState().nodes.length > 0 ? 'edit' : 'generate';
        const result = currentMode === 'edit'
            ? await editAiFlow(text)
            : await generateAiFlow(text);

        clearInterval(loadingTimerRef.current);
        setAiLoadingStep(4);
        setAiLoading(false);

        if (result.success) {
            const currentNodeCount = useFlowStore.getState().nodes.length;
            const currentFlowName = useFlowStore.getState().flowName;
            setLastResult({ type: 'success', mode: currentMode, nodeCount: currentNodeCount, flowName: currentFlowName });

            const successText = currentMode === 'edit'
                ? `Done! I've updated "${currentFlowName}" — ${currentNodeCount} nodes on canvas. Review the changes and let me know if you need more tweaks.`
                : `Flow "${currentFlowName}" created with ${currentNodeCount} nodes. I've auto-arranged the layout and added placeholder images where needed. You can now edit any node to customize.`;

            setAiMessages((prev) => [...prev, {
                role: 'ai',
                text: successText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSuccess: true,
            }]);

            // Show auto-fixes applied
            if (result.fixes && result.fixes.length > 0) {
                const fixText = result.fixes.map((f) => `✅ ${f}`).join('\n');
                setAiMessages((prev) => [...prev, {
                    role: 'ai',
                    text: `I auto-fixed ${result.fixes.length} issue${result.fixes.length > 1 ? 's' : ''}:\n\n${fixText}`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isSuccess: true,
                }]);
            }

            // Show remaining validation warnings if any (after auto-fix)
            if (result.warnings && result.warnings.length > 0) {
                const warningText = result.warnings.map((w) => `⚠️ ${w.message}`).join('\n');
                setAiMessages((prev) => [...prev, {
                    role: 'ai',
                    text: `${result.warnings.length} issue${result.warnings.length > 1 ? 's' : ''} still need manual attention:\n\n${warningText}\n\nFix these in the settings panel on the right.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isWarning: true,
                }]);
            }
        } else {
            setLastResult({ type: 'error', mode: currentMode });
            setAiMessages((prev) => [...prev, {
                role: 'ai',
                text: result.error || "Sorry, I couldn't process that. Please try again with more details.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true,
            }]);
        }
    };

    const handleAiKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClose = () => {
        if (aiLoading) return;
        setShowAiModal(false);
    };

    const handleClearChat = () => {
        if (aiLoading) return;
        setLastResult(null);
        const greeting = [{
            role: 'ai',
            text: mode === 'edit'
                ? "Hi! I can see your flow on the canvas. Tell me what to change — I'll apply it instantly."
                : "Hi! Describe the WhatsApp chatbot you want, and I'll build the complete flow for you.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }];
        setAiMessages(greeting);
        setAiInput('');
        setAiLoadingStep(0);
        try { sessionStorage.removeItem(AI_CHAT_STORAGE_KEY); } catch {}
    };

    const handleExampleClick = (example) => {
        if (aiLoading) return;
        setAiInput(example);
        setTimeout(() => {
            aiInputRef.current?.focus();
            const el = aiInputRef.current;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 160) + 'px';
        }, 50);
    };

    const handleViewFlow = () => {
        setShowAiModal(false);
    };

    if (!showAiModal) return null;

    const loadingLabels = mode === 'edit'
        ? ['Analyzing current flow', 'Applying changes', 'Updating connections', 'Validating flow']
        : ['Analyzing description', 'Designing node graph', 'Wiring connections', 'Validating flow'];

    const examples = mode === 'edit' ? EDIT_EXAMPLES : GENERATE_EXAMPLES;
    const showExamples = aiMessages.length <= 1 && !aiLoading && !aiInput.trim();

    return (
        <div className={styles.aiChatPanel}>
            <div className={styles.aiChatPanelHeader}>
                <div className={styles.aiChatPanelHeaderLeft}>
                    <div className={styles.aiChatPanelAvatar}>
                        <img src={getStaticUrl('/ai_logo.svg')} alt="AI" />
                    </div>
                    <div className={styles.aiChatPanelHeaderInfo}>
                        <span className={styles.aiChatPanelHeaderName}>AI Flow Assistant</span>
                        <span className={styles.aiChatPanelHeaderStatus}>
                            {aiLoading
                                ? (mode === 'edit' ? 'Editing flow...' : 'Generating flow...')
                                : lastResult?.type === 'success' ? 'Completed'
                                : 'Online'}
                        </span>
                    </div>
                </div>
                <div className={styles.aiChatPanelHeaderActions}>
                    <IconButton
                        size="small"
                        onClick={handleClearChat}
                        className={styles.aiChatPanelClearBtn}
                        disabled={aiLoading || aiMessages.length <= 1}
                        title="Clear chat"
                    >
                        <Eraser size={16} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={handleClose}
                        className={styles.aiChatPanelCloseBtn}
                        disabled={aiLoading}
                    >
                        <X size={18} />
                    </IconButton>
                </div>
            </div>

            <div className={styles.aiChatPanelMessages}>
                {aiMessages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${styles.aiChatPanelMsgItem} ${msg.role === 'user' ? styles.aiChatPanelMsgUser : styles.aiChatPanelMsgAi}`}
                    >
                        {msg.role === 'ai' && (
                            <div className={`${styles.aiChatPanelMsgAvatar} ${msg.isSuccess ? styles.aiChatPanelMsgAvatarSuccess : ''} ${msg.isError ? styles.aiChatPanelMsgAvatarError : ''} ${msg.isWarning ? styles.aiChatPanelMsgAvatarWarning : ''}`}>
                                {msg.isSuccess ? <CheckCircle2 size={14} /> : msg.isError ? <AlertCircle size={14} /> : msg.isWarning ? <AlertTriangle size={14} /> : <img src={getStaticUrl('/ai_logo.svg')} alt="AI" />}
                            </div>
                        )}
                        <div className={styles.aiChatPanelBubbleWrap}>
                            <div
                                className={`${styles.aiChatPanelBubble} ${msg.role === 'user' ? styles.aiChatPanelBubbleUser : styles.aiChatPanelBubbleAi} ${msg.isError ? styles.aiChatPanelBubbleError : ''} ${msg.isSuccess ? styles.aiChatPanelBubbleSuccess : ''} ${msg.isWarning ? styles.aiChatPanelBubbleWarning : ''}`}
                            >
                                <span className={styles.aiChatPanelBubbleText}>{msg.text}</span>
                                <span className={styles.aiChatPanelBubbleTime}>{msg.time}</span>
                            </div>
                            {msg.isSuccess && (
                                <button className={styles.aiChatPanelViewFlowBtn} onClick={handleViewFlow}>
                                    View Flow
                                    <ArrowRight size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {aiLoading && (
                    <div className={`${styles.aiChatPanelMsgItem} ${styles.aiChatPanelMsgAi}`}>
                        <div className={`${styles.aiChatPanelMsgAvatar} ${styles.aiChatPanelMsgAvatarLoading}`}>
                            <Loader2 size={16} className={styles.aiChatPanelSpin} />
                        </div>
                        <div className={styles.aiChatPanelBubbleWrap}>
                            <div className={`${styles.aiChatPanelBubble} ${styles.aiChatPanelBubbleAi} ${styles.aiChatPanelBubbleLoading}`}>
                                <span className={styles.aiChatPanelLoadingText} key={aiLoadingStep}>
                                    {loadingLabels[Math.min(aiLoadingStep, loadingLabels.length - 1)]}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={aiChatEndRef} />
            </div>

            {showExamples && (
                <div className={styles.aiChatPanelExamples}>
                    <div className={styles.aiChatPanelExamplesList}>
                        {examples.map((ex, i) => (
                            <button
                                key={i}
                                className={styles.aiChatPanelExampleChip}
                                onClick={() => handleExampleClick(ex)}
                                disabled={aiLoading}
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.aiChatPanelInputArea}>
                <textarea
                    ref={aiInputRef}
                    className={styles.aiChatPanelInput}
                    value={aiInput}
                    onChange={handleInputChange}
                    onKeyDown={handleAiKeyDown}
                    placeholder={mode === 'edit'
                        ? "Describe what to change in your flow..."
                        : "Describe the WhatsApp chatbot you want to build..."}
                    rows={1}
                    disabled={aiLoading}
                />
                <button
                    className={styles.aiChatPanelSendBtn}
                    onClick={handleSend}
                    disabled={aiLoading || !aiInput.trim()}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default AiChatPanel;
