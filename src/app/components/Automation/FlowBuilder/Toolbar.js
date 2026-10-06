'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    TextField,
    MenuItem,
    Modal,
} from '@mui/material';
import {
    ArrowLeft,
    Save,
    Smartphone,
    X,
    Info,
    Undo2,
    Redo2,
    Sparkles,
    Plus,
    Wand2,
    Check,
    Circle,
    PanelLeft,
    Crosshair,
} from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useFlowStore } from '../../../store/flowStore';
import { useShallow } from 'zustand/react/shallow';
import { useWallet } from '../../../contexts/WalletContext';
import ConfirmationModal from '../../ConfirmationModal/ConfirmationModal';
import styles from './Toolbar.module.scss';

const Toolbar = () => {
    const setView = useFlowStore((state) => state.setView);
    const flowName = useFlowStore((state) => state.flowName);
    const flowDescription = useFlowStore((state) => state.flowDescription);
    const triggerKeyword = useFlowStore((state) => state.triggerKeyword);
    const triggerMode = useFlowStore((state) => state.triggerMode);
    const nodesCount = useFlowStore((state) => state.nodes.length);
    const triggerNodeKeywords = useFlowStore(useShallow((state) => {
        const triggerNode = state.nodes.find((n) => n.type === 'keyword_trigger');
        return triggerNode?.data?.keywords || [];
    }));

    const setFlowName = useFlowStore((state) => state.setFlowName);
    const setFlowDescription = useFlowStore((state) => state.setFlowDescription);
    const setTriggerKeyword = useFlowStore((state) => state.setTriggerKeyword);
    const setTriggerMode = useFlowStore((state) => state.setTriggerMode);
    const saveCurrentFlow = useFlowStore((state) => state.saveCurrentFlow);
    const setIsSimulatorOpen = useFlowStore((state) => state.setIsSimulatorOpen);
    const undo = useFlowStore((state) => state.undo);
    const redo = useFlowStore((state) => state.redo);
    const canUndo = useFlowStore((state) => state._past.length > 0);
    const canRedo = useFlowStore((state) => state._future.length > 0);
    const showAiModal = useFlowStore((state) => state.showAiModal);
    const setShowAiModal = useFlowStore((state) => state.setShowAiModal);
    const autoFixFlowErrors = useFlowStore((state) => state.autoFixFlowErrors);
    const showNodePalette = useFlowStore((state) => state.showNodePalette);
    const setShowNodePalette = useFlowStore((state) => state.setShowNodePalette);
    const selectNode = useFlowStore((state) => state.selectNode);
    const setErrorNodeIds = useFlowStore((state) => state.setErrorNodeIds);

    const { setCenter } = useReactFlow();

    const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_FLOW === 'true';

    const [showConfig, setShowConfig] = useState(false);
    const [showSaveSchema, setShowSaveSchema] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showChannelSelect, setShowChannelSelect] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [channelError, setChannelError] = useState('');
    const [saveErrors, setSaveErrors] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showTitlePrompt, setShowTitlePrompt] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [triggerError, setTriggerError] = useState('');
    const [extraKwInput, setExtraKwInput] = useState('');
    const [flowNameError, setFlowNameError] = useState('');

    const flowsList = useFlowStore((state) => state.flowsList);
    const flowId = useFlowStore((state) => state.flowId);
    const { channels: walletChannels } = useWallet();

    const channelOptions = React.useMemo(() => {
        if (!walletChannels || walletChannels.length === 0) return [];
        return walletChannels.map((ch) => {
            const name = ch.whatsappName || ch.companyCode || ch.mobileNumber || `Channel ${ch.Id}`;
            const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'CH';
            // Format phone: +91 97251 50900
            const raw = String(ch.mobileNumber || '');
            let formattedPhone = raw;
            if (raw.length >= 10) {
                const cc = raw.slice(0, -10);
                const main = raw.slice(-10);
                formattedPhone = `+${cc} ${main.slice(0, 5)} ${main.slice(5)}`;
            }
            return {
                value: String(ch.Id || ''),
                label: name,
                mobileNumber: ch.mobileNumber,
                formattedPhone,
                whatsappName: ch.whatsappName,
                companyCode: ch.companyCode,
                initials,
            };
        });
    }, [walletChannels]);

    // Auto-select when only one channel is available (render-adjust pattern)
    if (!selectedChannelId && channelOptions.length === 1) {
        setSelectedChannelId(channelOptions[0].value);
    }

    const validateFlowName = (name) => {
        if (!name || !name.trim()) {
            return 'Flow name is required.';
        }
        if (name.trim().toLowerCase() === 'untitled_flow' || name.trim().toLowerCase() === 'untitled flow') {
            return 'Please give your flow a meaningful name. "Untitled Flow" is not allowed.';
        }
        if (name.length < 3) {
            return 'Flow name must be at least 3 characters.';
        }
        if (name.length > 64) {
            return 'Flow name must be 64 characters or less.';
        }
        const duplicate = flowsList.some(
            (f) => f.id !== flowId && f.name?.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            return `Flow name "${name}" is already used by another flow.`;
        }
        return '';
    };

    const validateTriggerKeyword = (keyword) => {
        if (!keyword || !keyword.trim()) {
            return 'Trigger keyword is required.';
        }
        if (keyword.length < 2) {
            return 'Trigger keyword must be at least 2 characters.';
        }
        if (keyword.length > 64) {
            return 'Trigger keyword must be 64 characters or less.';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(keyword)) {
            return 'Only letters, numbers, and underscores are allowed.';
        }
        const duplicate = flowsList.some(
            (f) => f.id !== flowId && f.triggerKeyword?.toLowerCase() === keyword.toLowerCase()
        );
        if (duplicate) {
            return `Trigger keyword "${keyword}" is already used by another flow.`;
        }
        return '';
    };

    const handleTriggerChange = (val) => {
        const sanitized = val.toLowerCase().replace(/\s+/g, '_');
        setTriggerKeyword(sanitized);
        setTriggerError(validateTriggerKeyword(sanitized));
    };

    const handleSaveClick = () => {
        const nameErr = validateFlowName(flowName);
        if (nameErr) {
            setFlowNameError(nameErr);
            setTitleInput(flowName === 'Untitled Flow' ? '' : flowName);
            setShowTitlePrompt(true);
            return;
        }
        if (triggerMode !== 'instant') {
            const triggerErr = validateTriggerKeyword(triggerKeyword);
            if (triggerErr) {
                setTriggerError(triggerErr);
                setShowConfig(true);
                return;
            }
        }
        setShowSaveConfirm(true);
    };

    const handleTitleConfirm = () => {
        const sanitized = titleInput.trim().replace(/\s+/g, '_');
        const nameErr = validateFlowName(sanitized);
        if (nameErr) {
            setFlowNameError(nameErr);
            return;
        }
        setFlowName(sanitized);
        setFlowNameError('');
        setShowTitlePrompt(false);
        if (triggerMode !== 'instant') {
            const triggerErr = validateTriggerKeyword(triggerKeyword);
            if (triggerErr) {
                setTriggerError(triggerErr);
                return;
            }
        }
        setShowSaveConfirm(true);
    };

    const handleConfirmSave = async () => {
        setShowSaveConfirm(false);
        if (channelOptions.length === 1) {
            // Single channel — auto-select, no need to ask
            await doSave(channelOptions[0].value);
            return;
        }
        if (channelOptions.length > 0) {
            setShowChannelSelect(true);
        } else {
            // No channels available — save without accountId
            await doSave('');
        }
    };

    const handleChannelSelectConfirm = async () => {
        if (!selectedChannelId) {
            setChannelError('Please select a channel to continue.');
            return;
        }
        setChannelError('');
        setShowChannelSelect(false);
        await doSave(selectedChannelId);
    };

    // Jump to the node that caused a save error — highlights it, opens its
    // settings panel, and pans the canvas so it's in view.
    const jumpToNode = (nodeId) => {
        const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
        if (!node) return;
        setSaveErrors([]);
        selectNode(nodeId);
        setCenter(node.position.x + 140, node.position.y + 80, { zoom: 1.1, duration: 450 });
    };

    const doSave = async (accountId) => {
        setIsSaving(true);
        try {
            const result = await saveCurrentFlow(accountId);
            if (result?.success) {
                if (result.errors?.length > 0) {
                    setSaveErrors(result.errors);
                    setErrorNodeIds(result.errors.map((e) => e.nodeId).filter(Boolean));
                } else {
                    setErrorNodeIds([]);
                    setShowSaveSchema(true);
                }
            } else {
                const errorList = result?.errors?.length > 0
                    ? result.errors
                    : [{ nodeId: null, message: result?.error || 'Save failed unexpectedly.' }];
                setSaveErrors(errorList);
                setErrorNodeIds(errorList.map((e) => e.nodeId).filter(Boolean));
            }
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (showSaveSchema) {
            const timer = setTimeout(() => {
                setShowSaveSchema(false);
                setView('list');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [showSaveSchema, setView]);

    const handleAutoFix = async () => {
        const fixes = autoFixFlowErrors();
        if (fixes && fixes.length > 0) {
            setSaveErrors([]);
            setIsSaving(true);
            try {
                const result = await saveCurrentFlow(selectedChannelId || '');
                if (result?.success) {
                    setErrorNodeIds([]);
                    setShowSaveSchema(true);
                    setView('list');
                } else {
                    const errorList = result?.errors?.length > 0
                        ? result.errors
                        : [{ nodeId: null, message: result?.error || 'Save failed after auto-fix. Please fix manually.' }];
                    setSaveErrors(errorList);
                    setErrorNodeIds(errorList.map((e) => e.nodeId).filter(Boolean));
                }
            } finally {
                setIsSaving(false);
            }
        } else {
            setSaveErrors((prev) => [...prev, { nodeId: null, message: 'Auto-fix could not resolve the issues. Please fix them manually.' }]);
        }
    };

    return (
        <>
            <div className={styles.toolbar}>
                {/* Left: Back + inline flow name */}
                <Box className={styles.toolbarLeft}>
                    <Button
                        size="small"
                        startIcon={<ArrowLeft size={16} />}
                        onClick={() => setView('list')}
                        className={styles.toolbarBackBtn}
                    >
                        Flows
                    </Button>
                    <IconButton
                        size="small"
                        onClick={() => setShowNodePalette(!showNodePalette)}
                        className={`${styles.toolbarPaletteBtn} ${showNodePalette ? styles.toolbarPaletteBtnActive : ''}`}
                        title={showNodePalette ? 'Hide node panel' : 'Show node panel'}
                    >
                        <PanelLeft size={16} />
                    </IconButton>
                    <div className={styles.toolbarDivider} />
                    <div className={styles.toolbarUndoRedo}>
                        <IconButton
                            size="small"
                            onClick={undo}
                            disabled={!canUndo}
                            className={styles.toolbarUndoBtn}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={16} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={redo}
                            disabled={!canRedo}
                            className={styles.toolbarRedoBtn}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={16} />
                        </IconButton>
                    </div>
                    <div className={styles.toolbarDivider} />
                    <div className={styles.toolbarFlowInfo}>
                        <div className={styles.toolbarFlowNameRow}>
                            <input
                                type="text"
                                value={flowName}
                                onChange={(e) => setFlowName(e.target.value.replace(/\s+/g, '_'))}
                                className={styles.toolbarFlowNameInput}
                                placeholder="Give flow a name..."
                            />
                            {triggerMode !== 'instant' && (
                                <div className={styles.toolbarTriggerInline}>
                                    <span className={styles.toolbarTriggerInlineLabel}>Trigger:</span>
                                    <span className={styles.toolbarTriggerBadge}>
                                        {triggerKeyword || 'not set'}
                                    </span>
                                    {triggerNodeKeywords.length > 1 && (
                                        <span className={styles.toolbarTriggerCount} title={triggerNodeKeywords.join(', ')}>
                                            +{triggerNodeKeywords.length - 1} more
                                        </span>
                                    )}
                                </div>
                            )}
                            {triggerMode === 'instant' && (
                                <span className={styles.toolbarTriggerInstantBadge}>
                                    <span className={styles.toolbarTriggerDot} />
                                    Instant Auto-Start
                                </span>
                            )}
                            <button onClick={() => setShowConfig(!showConfig)} className={styles.toolbarTriggerConfigBtn}>
                                Config
                            </button>
                        </div>
                    </div>
                </Box>

                {/* Right: Info, Simulator, Save */}
                <Box className={styles.toolbarRight}>
                    <div className={styles.toolbarInfoWrap}>
                        <IconButton
                            size="small"
                            onClick={() => setShowShortcuts(!showShortcuts)}
                            className={styles.toolbarInfoBtn}
                        >
                            <Info size={16} />
                        </IconButton>
                        {showShortcuts && (
                            <div className={styles.shortcutsPopover}>
                                <div className={styles.shortcutsHeader}>
                                    <span>Canvas Shortcuts</span>
                                    <IconButton size="small" onClick={() => setShowShortcuts(false)}>
                                        <X size={14} />
                                    </IconButton>
                                </div>
                                <div className={styles.shortcutsBody}>
                                    <div className={styles.shortcutItem}>
                                        <span className={styles.shortcutIcon}>↩️</span>
                                        <span>Press <kbd className={styles.shortcutKey}>Ctrl+Z</kbd> to undo last action.</span>
                                    </div>
                                    <div className={styles.shortcutItem}>
                                        <span className={styles.shortcutIcon}>↪️</span>
                                        <span>Press <kbd className={styles.shortcutKey}>Ctrl+Shift+Z</kbd> to redo.</span>
                                    </div>
                                    <div className={styles.shortcutItem}>
                                        <span className={styles.shortcutIcon}>🔗</span>
                                        <span>Drag handle to handle to build transitions.</span>
                                    </div>
                                    <div className={styles.shortcutItem}>
                                        <span className={styles.shortcutIcon}>🖱️</span>
                                        <span>Click node to edit in the config panel.</span>
                                    </div>
                                    <div className={styles.shortcutItem}>
                                        <span className={styles.shortcutIcon}>⌨️</span>
                                        <span>Press <kbd className={styles.shortcutKey}>Backspace</kbd> to delete selected.</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Smartphone size={14} />}
                        onClick={() => setIsSimulatorOpen(true)}
                        className={styles.toolbarSimulatorBtn}
                    >
                        Live Simulator
                    </Button>

                    {aiEnabled && (
                        <button
                            className="aiGenerateBtn aiGenerateBtnSm"
                            onClick={() => setShowAiModal(true)}
                            title="Generate flow with AI"
                        >
                            <span className="aiGenerateBtnShimmer" />
                            <span className="aiGenerateBtnContent aiGenerateBtnContentSm">
                                <Sparkles size={14} />
                                AI Generate
                            </span>
                        </button>
                    )}

                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<Save size={14} />}
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="buttonClassname"
                    >
                        {isSaving ? 'Saving...' : 'Save Flow'}
                    </Button>
                </Box>
            </div>

            {/* Floating trigger config */}
            {showConfig && (
                <div className={styles.configPopover}>
                    <div className={styles.configPopoverHeader}>
                        <span>Flow Settings</span>
                        <IconButton size="small" onClick={() => setShowConfig(false)}>
                            <X size={16} />
                        </IconButton>
                    </div>
                    <div className={styles.configPopoverBody}>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsFieldLabel}>Flow Name</label>
                            <TextField
                                fullWidth size="small"
                                value={flowName}
                                onChange={(e) => setFlowName(e.target.value.replace(/\s+/g, '_'))}
                                placeholder="e.g. Welcome_Bot"
                                className={styles.settingsInput}
                            />
                        </div>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsFieldLabel}>Description <span className={styles.settingsFieldOptional}>(optional)</span></label>
                            <TextField
                                fullWidth size="small"
                                value={flowDescription}
                                onChange={(e) => setFlowDescription(e.target.value)}
                                placeholder="What does this flow do?"
                                className={styles.settingsInput}
                            />
                        </div>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsFieldLabel}>Trigger Mode</label>
                            <TextField
                                fullWidth select size="small"
                                value={triggerMode}
                                onChange={(e) => setTriggerMode(e.target.value)}
                                className={styles.settingsInput}
                            >
                                <MenuItem value="contains">Contains — message includes the keyword</MenuItem>
                                <MenuItem value="exact">Exact match — message equals the keyword</MenuItem>
                                <MenuItem value="instant">Instant — starts on every new chat</MenuItem>
                            </TextField>
                        </div>
                        {triggerMode !== 'instant' && (
                            <div className={styles.settingsField}>
                                <label className={styles.settingsFieldLabel}>Trigger Keyword</label>
                                <TextField
                                    fullWidth size="small"
                                    value={triggerKeyword}
                                    onChange={(e) => handleTriggerChange(e.target.value)}
                                    placeholder="e.g. hi, menu, help"
                                    className={styles.settingsInput}
                                    sx={{ '& input': { fontFamily: 'monospace' } }}
                                    error={!!triggerError}
                                    helperText={triggerError || ''}
                                />
                            </div>
                        )}
                        {triggerMode !== 'instant' && triggerNodeKeywords.length > 1 && (
                            <div className={styles.settingsField}>
                                <label className={styles.settingsFieldLabel}>Additional Keywords</label>
                                <div className={styles.configKeywordList}>
                                    {triggerNodeKeywords.slice(1).map((kw, i) => (
                                        <div key={i} className={styles.configKeywordItem}>
                                            <span className={styles.configKeywordText}>{kw}</span>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    const triggerNode = useFlowStore.getState().nodes.find((n) => n.type === 'keyword_trigger');
                                                    if (triggerNode) {
                                                        const kws = (triggerNode.data.keywords || []).filter((k) => k !== kw);
                                                        useFlowStore.getState().updateNodeDataLive(triggerNode.id, { keywords: kws });
                                                    }
                                                }}
                                                className={styles.configKeywordRemove}
                                            >
                                                <X size={12} />
                                            </IconButton>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {triggerMode !== 'instant' && (
                            <div className={styles.settingsField}>
                                <label className={styles.settingsFieldLabel}>Add Another Keyword</label>
                                <div className={styles.configKeywordAddRow}>
                                    <TextField
                                        size="small"
                                        value={extraKwInput}
                                        onChange={(e) => setExtraKwInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const kw = extraKwInput.trim().toLowerCase();
                                                if (kw && !triggerNodeKeywords.includes(kw)) {
                                                    const triggerNode = useFlowStore.getState().nodes.find((n) => n.type === 'keyword_trigger');
                                                    if (triggerNode) {
                                                        const kws = [...(triggerNode.data.keywords || []), kw];
                                                        useFlowStore.getState().updateNodeDataLive(triggerNode.id, { keywords: kws });
                                                    }
                                                    setExtraKwInput('');
                                                }
                                            }
                                        }}
                                        placeholder="Type and press Enter"
                                        className={styles.settingsInput}
                                        sx={{ '& input': { fontFamily: 'monospace' } }}
                                    />
                                    <Button
                                        variant="contained" size="small"
                                        onClick={() => {
                                            const kw = extraKwInput.trim().toLowerCase();
                                            if (kw && !triggerNodeKeywords.includes(kw)) {
                                                const triggerNode = useFlowStore.getState().nodes.find((n) => n.type === 'keyword_trigger');
                                                if (triggerNode) {
                                                    const kws = [...(triggerNode.data.keywords || []), kw];
                                                    useFlowStore.getState().updateNodeDataLive(triggerNode.id, { keywords: kws });
                                                }
                                                setExtraKwInput('');
                                            }
                                        }}
                                        className="buttonClassname"
                                        startIcon={<Plus size={14} />}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        )}
                        <Button
                            fullWidth variant="contained" size="medium"
                            onClick={() => setShowConfig(false)}
                            className="buttonClassname"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            )}

            {/* Save confirmation modal */}
            <ConfirmationModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                onConfirm={handleConfirmSave}
                title="Save Flow"
                description={`Save the flow "${flowName || 'Untitled Flow'}" with ${nodesCount} node${nodesCount !== 1 ? 's' : ''}?`}
                confirmLabel="Save"
                cancelLabel="Cancel"
            />

            {/* Channel selection modal — redesigned card-based radio group */}
            <Modal open={showChannelSelect} onClose={() => setShowChannelSelect(false)}>
                <div className={styles.saveModal} style={{ width: 520 }}>
                    {/* Header */}
                    <div className={styles.saveModalHeader}>
                        <span className={styles.saveModalHeaderText}>Select Channel</span>
                        <IconButton size="small" onClick={() => setShowChannelSelect(false)} className={styles.saveModalCloseBtn}>
                            <X size={18} />
                        </IconButton>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '16px 20px' }}>
                        <Typography
                            sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.82rem',
                                color: 'var(--text-secondary)',
                                mb: 2,
                            }}
                        >
                            Select the WhatsApp channel for this flow.
                        </Typography>

                        {channelOptions.length === 0 ? (
                            <Typography sx={{ color: 'var(--text-tertiary)', textAlign: 'center', py: 3, fontSize: '0.85rem' }}>
                                No channels available. Please connect a WhatsApp channel first.
                            </Typography>
                        ) : (
                            <Box
                                role="radiogroup"
                                aria-label="WhatsApp channel"
                                sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}
                            >
                                {channelOptions.map((ch) => {
                                    const isSelected = selectedChannelId === ch.value;
                                    return (
                                        <Box
                                            key={ch.value}
                                            role="radio"
                                            aria-checked={isSelected}
                                            tabIndex={0}
                                            onClick={() => { setSelectedChannelId(ch.value); setChannelError(''); }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedChannelId(ch.value);
                                                    setChannelError('');
                                                }
                                            }}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: '14px 16px',
                                                borderRadius: '14px',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                border: `2px solid ${isSelected ? 'var(--primary-main)' : 'var(--border-color)'}`,
                                                background: isSelected ? 'var(--primary-light-bg)' : 'var(--bg-paper)',
                                                transition: 'border-color 0.2s ease, background 0.2s ease',
                                                '&:hover': {
                                                    borderColor: 'var(--primary-main)',
                                                },
                                                '&:focus-visible': {
                                                    boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary-main) 25%, transparent)',
                                                },
                                            }}
                                        >
                                            {/* Avatar badge */}
                                            <Box
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: '50%',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.88rem',
                                                    fontWeight: 700,
                                                    fontFamily: 'Poppins, sans-serif',
                                                    color: '#fff',
                                                    background: 'linear-gradient(135deg, var(--primary-main), #128c7e)',
                                                    letterSpacing: '0.5px',
                                                }}
                                            >
                                                {ch.initials}
                                            </Box>

                                            {/* Channel info */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    sx={{
                                                        fontFamily: 'Poppins, sans-serif',
                                                        fontSize: '0.88rem',
                                                        fontWeight: 600,
                                                        color: 'var(--titleColor)',
                                                        lineHeight: 1.3,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {ch.label}
                                                </Typography>
                                                {ch.formattedPhone && (
                                                    <Typography
                                                        sx={{
                                                            fontFamily: 'Poppins, sans-serif',
                                                            fontSize: '0.76rem',
                                                            fontWeight: 400,
                                                            color: 'var(--text-tertiary)',
                                                            lineHeight: 1.4,
                                                            mt: 0.25,
                                                            letterSpacing: '0.3px',
                                                        }}
                                                    >
                                                        {ch.formattedPhone}
                                                    </Typography>
                                                )}
                                            </Box>

                                            {/* Radio indicator */}
                                            <Box
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `2px solid ${isSelected ? 'var(--primary-main)' : 'var(--border-color)'}`,
                                                    background: isSelected ? 'var(--primary-main)' : 'transparent',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {isSelected ? (
                                                    <Check size={14} strokeWidth={3} color="#fff" />
                                                ) : (
                                                    <Circle size={8} strokeWidth={0} sx={{ color: 'transparent' }} />
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}

                        {channelError && (
                            <Typography sx={{ color: 'var(--error-main)', fontSize: '0.78rem', mt: 1.5, fontFamily: 'Poppins, sans-serif' }}>
                                {channelError}
                            </Typography>
                        )}
                    </div>

                    {/* Action bar */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1.5,
                            px: '20px',
                            py: '14px',
                            borderTop: '1px solid var(--border-color)',
                        }}
                    >
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setShowChannelSelect(false)}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-secondary)',
                                '&:hover': {
                                    borderColor: 'var(--border-color)',
                                    background: 'var(--bg-subtle)',
                                },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleChannelSelectConfirm}
                            disabled={!selectedChannelId}
                            startIcon={<Save size={16} />}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                background: 'var(--primary-main)',
                                boxShadow: '0 4px 12px color-mix(in srgb, var(--primary-main) 30%, transparent)',
                                '&:hover': {
                                    background: 'var(--primary-dark, #1a9a58)',
                                    boxShadow: '0 6px 16px color-mix(in srgb, var(--primary-main) 35%, transparent)',
                                },
                                '&:disabled': {
                                    background: 'var(--bg-light)',
                                    color: 'var(--text-tertiary)',
                                },
                            }}
                        >
                            Save Flow
                        </Button>
                    </Box>
                </div>
            </Modal>

            {/* Title prompt modal — asks user for flow name before save */}
            <Modal open={showTitlePrompt} onClose={() => setShowTitlePrompt(false)}>
                <div className={styles.saveModal}>
                    <div className={styles.saveModalHeader}>
                        <span className={styles.saveModalHeaderText}>Name Your Flow</span>
                        <IconButton size="small" onClick={() => setShowTitlePrompt(false)} className={styles.saveModalCloseBtn}>
                            <X size={18} />
                        </IconButton>
                    </div>
                    <div className={styles.saveSuccessBody}>
                        <p className={styles.saveSuccessDesc} style={{ marginBottom: '1rem' }}>
                            Enter a title for your flow. Spaces will be converted to underscores.
                        </p>
                        <TextField
                            fullWidth size="small"
                            value={titleInput}
                            onChange={(e) => { setTitleInput(e.target.value.replace(/\s+/g, '_')); setFlowNameError(''); }}
                            placeholder="e.g. Welcome_Bot"
                            autoFocus
                            error={!!flowNameError}
                            helperText={flowNameError}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTitleConfirm();
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontFamily: 'Poppins, sans-serif',
                                    fontSize: '0.85rem',
                                },
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setShowTitlePrompt(false)}
                                className={styles.toolbarBackBtn}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleTitleConfirm}
                                disabled={!titleInput.trim()}
                                className="buttonClassname"
                            >
                                Continue
                            </Button>
                        </Box>
                    </div>
                </div>
            </Modal>

            {/* Save error modal */}
            <Modal open={saveErrors.length > 0} onClose={() => setSaveErrors([])}>
                <div className={`${styles.saveModal} ${styles.saveErrorModal}`}>
                    <div className={styles.saveModalHeader}>
                        <span className={styles.saveModalHeaderText}>Almost there — a few things to fix</span>
                        <IconButton size="small" onClick={() => setSaveErrors([])} className={styles.saveModalCloseBtn}>
                            <X size={18} />
                        </IconButton>
                    </div>
                    <div className={styles.saveErrorBody}>
                        <div className={styles.saveErrorBanner}>
                            Your flow couldn&apos;t be saved yet. Fix {saveErrors.length === 1 ? 'this' : `these ${saveErrors.length} things`} and hit <strong>Save Flow</strong> again.
                        </div>
                        <ul className={styles.saveErrorList}>
                            {saveErrors.map((err, i) => {
                                const nodeLabel = err.nodeId
                                    ? useFlowStore.getState().nodes.find((n) => n.id === err.nodeId)?.data?.label
                                    : null;
                                return (
                                    <li
                                        key={i}
                                        className={`${styles.saveErrorItem} ${err.nodeId ? styles.saveErrorItemLink : ''}`}
                                        onClick={() => err.nodeId && jumpToNode(err.nodeId)}
                                        title={err.nodeId ? 'Click to locate this node on the canvas' : undefined}
                                    >
                                        {err.nodeId && <span className={styles.saveErrorNode}>{nodeLabel || err.nodeId}</span>}
                                        <span className={styles.saveErrorText}>{err.message}</span>
                                        {err.nodeId && <Crosshair size={14} className={styles.saveErrorLocate} />}
                                    </li>
                                );
                            })}
                        </ul>
                        {saveErrors.some((e) => e.nodeId) && (
                            <p className={styles.saveErrorHint}>
                                Click an issue to jump straight to that node on the canvas.
                            </p>
                        )}
                        <div className={styles.saveErrorActions}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<Wand2 size={16} />}
                                onClick={handleAutoFix}
                                className="buttonClassname"
                            >
                                Fix with AI
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setSaveErrors([])}
                            >
                                I&apos;ll fix it myself
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Saving loader modal — non-dismissable while the request runs */}
            <Modal open={isSaving} onClose={() => { }}>
                <div className={styles.saveModal}>
                    <div className={styles.saveModalHeader}>
                        <span className={styles.saveModalHeaderText}>Saving Flow</span>
                    </div>
                    <div className={styles.saveSuccessBody}>
                        <div className={styles.saveSuccessIconWrap}>
                            <svg className={styles.saveLoadingSvg} viewBox="0 0 52 52">
                                <circle className={styles.saveLoadingTrack} cx="26" cy="26" r="24" fill="none" />
                                <circle className={styles.saveLoadingRing} cx="26" cy="26" r="24" fill="none" />
                            </svg>
                        </div>
                        <h3 className={styles.saveSuccessTitle}>Saving your flow...</h3>
                        <p className={styles.saveSuccessDesc}>
                            Please wait while we save &quot;{flowName || 'Untitled Flow'}&quot; to the server.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Save success modal */}
            <Modal open={showSaveSchema} onClose={() => setShowSaveSchema(false)}>
                <div className={styles.saveModal}>
                    <div className={styles.saveModalHeader}>
                        <span className={styles.saveModalHeaderText}>Saved Successfully</span>
                        <IconButton size="small" onClick={() => setShowSaveSchema(false)} className={styles.saveModalCloseBtn}>
                            <X size={18} />
                        </IconButton>
                    </div>
                    <div className={styles.saveSuccessBody}>
                        <div className={styles.saveSuccessIconWrap}>
                            <svg className={styles.saveSuccessSvg} viewBox="0 0 52 52">
                                <circle className={styles.saveSuccessCircle} cx="26" cy="26" r="24" fill="none" />
                                <path className={styles.saveSuccessCheck} fill="none" d="M14 27l8 8 16-16" />
                            </svg>
                        </div>
                        <h3 className={styles.saveSuccessTitle}>Your flow is ready to use!</h3>
                        <p className={styles.saveSuccessDesc}>
                            Your WhatsApp chatbot flow has been saved successfully.
                        </p>
                    </div>
                </div>
            </Modal>

        </>
    );
};

export default Toolbar;
