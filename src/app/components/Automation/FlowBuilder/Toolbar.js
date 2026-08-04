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
} from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import { useShallow } from 'zustand/react/shallow';
import ConfirmationModal from '../../ConfirmationModal/ConfirmationModal';
import styles from './FlowBuilder.module.scss';

const Toolbar = () => {
    const setView = useFlowStore((state) => state.setView);
    const flowName = useFlowStore((state) => state.flowName);
    const flowDescription = useFlowStore((state) => state.flowDescription);
    const triggerKeyword = useFlowStore((state) => state.triggerKeyword);
    const triggerMode = useFlowStore((state) => state.triggerMode);
    const isActive = useFlowStore((state) => state.isActive);
    const nodesCount = useFlowStore((state) => state.nodes.length);
    const triggerNodeKeywords = useFlowStore(useShallow((state) => {
        const triggerNode = state.nodes.find((n) => n.type === 'keyword_trigger');
        return triggerNode?.data?.keywords || [];
    }));

    const setFlowName = useFlowStore((state) => state.setFlowName);
    const setFlowDescription = useFlowStore((state) => state.setFlowDescription);
    const setTriggerKeyword = useFlowStore((state) => state.setTriggerKeyword);
    const setTriggerMode = useFlowStore((state) => state.setTriggerMode);
    const setIsActive = useFlowStore((state) => state.setIsActive);
    const saveCurrentFlow = useFlowStore((state) => state.saveCurrentFlow);
    const setIsSimulatorOpen = useFlowStore((state) => state.setIsSimulatorOpen);
    const undo = useFlowStore((state) => state.undo);
    const redo = useFlowStore((state) => state.redo);
    const canUndo = useFlowStore((state) => state._past.length > 0);
    const canRedo = useFlowStore((state) => state._future.length > 0);
    const showAiModal = useFlowStore((state) => state.showAiModal);
    const setShowAiModal = useFlowStore((state) => state.setShowAiModal);
    const autoFixFlowErrors = useFlowStore((state) => state.autoFixFlowErrors);

    const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_FLOW === 'true';

    const [showConfig, setShowConfig] = useState(false);
    const [showSaveSchema, setShowSaveSchema] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [saveErrors, setSaveErrors] = useState([]);
    const [showTitlePrompt, setShowTitlePrompt] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [triggerError, setTriggerError] = useState('');
    const [extraKwInput, setExtraKwInput] = useState('');
    const [flowNameError, setFlowNameError] = useState('');

    const flowsList = useFlowStore((state) => state.flowsList);
    const flowId = useFlowStore((state) => state.flowId);

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
        const result = await saveCurrentFlow();
        if (result?.success) {
            if (result.errors?.length > 0) {
                setSaveErrors(result.errors);
            } else {
                setShowSaveSchema(true);
            }
        } else {
            const errorList = result?.errors?.length > 0
                ? result.errors
                : [{ nodeId: null, message: result?.error || 'Save failed unexpectedly.' }];
            setSaveErrors(errorList);
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
            const result = await saveCurrentFlow();
            if (result?.success) {
                setShowSaveSchema(true);
                setView('list');
            } else {
                const errorList = result?.errors?.length > 0
                    ? result.errors
                    : [{ nodeId: null, message: result?.error || 'Save failed after auto-fix. Please fix manually.' }];
                setSaveErrors(errorList);
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

                {/* Right: Info, Status button, Simulator, Save */}
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
                        onClick={() => setIsActive(!isActive)}
                        className={`${styles.toolbarStatusBtn} ${isActive ? styles.toolbarStatusActive : styles.toolbarStatusDraft}`}
                    >
                        {isActive ? 'ACTIVE' : 'DRAFT'}
                    </Button>

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
                        className="buttonClassname"
                    >
                        Save Flow
                    </Button>
                </Box>
            </div>

            {/* Floating trigger config */}
            {showConfig && (
                <div className={styles.configPopover}>
                    <div className={styles.configPopoverHeader}>
                        <span>Flow Trigger Criteria</span>
                        <IconButton size="small" onClick={() => setShowConfig(false)}>
                            <X size={16} />
                        </IconButton>
                    </div>
                    <div className={styles.configPopoverBody}>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsFieldLabel}>Flow Action Name</label>
                            <TextField
                                fullWidth size="small"
                                value={flowName}
                                onChange={(e) => setFlowName(e.target.value.replace(/\s+/g, '_'))}
                                className={styles.settingsInput}
                            />
                        </div>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsFieldLabel}>Brief Summary</label>
                            <TextField
                                fullWidth size="small"
                                value={flowDescription}
                                onChange={(e) => setFlowDescription(e.target.value)}
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
                                <MenuItem value="contains">Contains (e.g. "hi there")</MenuItem>
                                <MenuItem value="exact">Exact (e.g. "hi" only)</MenuItem>
                                <MenuItem value="instant">Instant Auto-Start (No Trigger)</MenuItem>
                            </TextField>
                        </div>
                        {triggerMode !== 'instant' && (
                            <div className={styles.settingsField}>
                                <label className={styles.settingsFieldLabel}>Primary Keyword</label>
                                <TextField
                                    fullWidth size="small"
                                    value={triggerKeyword}
                                    onChange={(e) => handleTriggerChange(e.target.value)}
                                    placeholder="e.g. hi, info, track"
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
                            fullWidth variant="contained" size="small"
                            onClick={() => setShowConfig(false)}
                            className="buttonClassname"
                        >
                            Done Updating
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
                        <span className={styles.saveModalHeaderText}>Flow Errors — Backend Not Saved</span>
                        <IconButton size="small" onClick={() => setSaveErrors([])} className={styles.saveModalCloseBtn}>
                            <X size={18} />
                        </IconButton>
                    </div>
                    <div className={styles.saveErrorBody}>
                        <div className={styles.saveErrorBanner}>
                            The backend JSON was not uploaded because
                            the following errors must be fixed first:
                        </div>
                        <ul className={styles.saveErrorList}>
                            {saveErrors.map((err, i) => (
                                <li key={i} className={styles.saveErrorItem}>
                                    {err.nodeId && <span className={styles.saveErrorNode}>[{err.nodeId}]</span>}
                                    <span>{err.message}</span>
                                </li>
                            ))}
                        </ul>
                        <div className={styles.saveErrorActions}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<Wand2 size={16} />}
                                onClick={handleAutoFix}
                                className="buttonClassname"
                            >
                                AI Fix & Save
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setSaveErrors([])}
                            >
                                Fix Manually
                            </Button>
                        </div>
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
