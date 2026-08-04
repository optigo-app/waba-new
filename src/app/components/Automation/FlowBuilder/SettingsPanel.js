'use client';

import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    MenuItem,
    Divider,
    Chip,
    FormControlLabel,
    Checkbox,
    Switch,
} from '@mui/material';
import {
    X,
    Plus,
    Trash2,
    Smartphone,
    UploadCloud,
    FileText,
    Link2,
    Loader2,
    AlertTriangle,
    ChevronUp,
    ChevronDown,
    GripVertical,
    Image as ImageIcon,
} from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import { filesUploadApi } from '../../../api/filesUploadApi';
import styles from './FlowBuilder.module.scss';

// ── Reorderable Section helpers ─────────────────────────────────────────────────

const DEFAULT_SECTION_ORDER_SEND_QUESTION = ['text', 'media', 'buttonType', 'buttons', 'timeout'];
const DEFAULT_SECTION_ORDER_SEND_MESSAGE = ['text', 'media'];

function getSectionOrder(data, defaultOrder) {
    const stored = data.sectionOrder;
    if (Array.isArray(stored) && stored.length > 0) {
        // Merge any new default sections not in stored order
        const merged = [...stored];
        for (const s of defaultOrder) {
            if (!merged.includes(s)) merged.push(s);
        }
        return merged;
    }
    return defaultOrder;
}

function ReorderableSection({ id, label, sectionOrder, updateField, children }) {
    const index = sectionOrder.indexOf(id);
    const handleDragStart = (e) => {
        e.dataTransfer.setData('text/section-reorder', String(index));
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add(styles.sectionDragOver);
    };
    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove(styles.sectionDragOver);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove(styles.sectionDragOver);
        const dragIdx = parseInt(e.dataTransfer.getData('text/section-reorder'), 10);
        if (isNaN(dragIdx) || dragIdx === index) return;
        const reordered = [...sectionOrder];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(index, 0, moved);
        updateField('sectionOrder', reordered);
    };
    const handleMove = (dir) => {
        const newIndex = index + dir;
        if (newIndex < 0 || newIndex >= sectionOrder.length) return;
        const reordered = [...sectionOrder];
        [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
        updateField('sectionOrder', reordered);
    };

    return (
        <div
            className={styles.reorderableSection}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={styles.sectionDragBar}>
                <span className={styles.sectionDragHandle} title="Drag to reorder">
                    <GripVertical size={12} />
                </span>
                <span className={styles.sectionDragLabel}>{label}</span>
                <div className={styles.sectionDragBtns}>
                    <button
                        type="button"
                        className={styles.sectionReorderBtn}
                        onClick={() => handleMove(-1)}
                        disabled={index === 0}
                        title="Move up"
                    >
                        <ChevronUp size={12} />
                    </button>
                    <button
                        type="button"
                        className={styles.sectionReorderBtn}
                        onClick={() => handleMove(1)}
                        disabled={index === sectionOrder.length - 1}
                        title="Move down"
                    >
                        <ChevronDown size={12} />
                    </button>
                </div>
            </div>
            {children}
        </div>
    );
}

// ── Main SettingsPanel ─────────────────────────────────────────────────────────
const SettingsPanel = () => {
    const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
    const selectNode = useFlowStore((state) => state.selectNode);
    const nodes = useFlowStore((state) => state.nodes);
    const updateNodeData = useFlowStore((state) => state.updateNodeDataLive);

    const activeNode = nodes.find((n) => n.id === selectedNodeId);

    if (!activeNode) {
        return null;
    }

    // Real-time update: write directly to store on every field change
    const updateField = (key, value) => {
        if (key === 'media' && typeof value === 'object') {
            const newData = { ...activeNode.data, ...value };
            updateNodeData(activeNode.id, newData);
            return;
        }
        const newData = { ...activeNode.data, [key]: value };
        if (activeNode.type === 'goto' && key === 'targetNodeId') {
            const destNode = nodes.find((n) => n.id === value);
            if (destNode) {
                newData.targetNodeLabel = destNode.data.label || `${destNode.id} [${destNode.type}]`;
            }
        }
        updateNodeData(activeNode.id, newData);
    };

    const nodeTypeLabel = activeNode.type.split('_').join(' ').toUpperCase();
    const formData = activeNode.data || {};

    return (
        <div className={styles.settingsPanel}>
            <div className={styles.settingsHeader}>
                <div>
                    <div className={styles.settingsHeaderLabel}>CONFIGURATION PANEL</div>
                    <div className={styles.settingsHeaderTitle}>
                        {nodeTypeLabel} <span className={styles.settingsHeaderId}>({activeNode.id})</span>
                    </div>
                </div>
                <IconButton size="small" onClick={() => selectNode(null)} className={styles.settingsCloseBtn}>
                    <X size={16} />
                </IconButton>
            </div>

            <div className={styles.settingsBody}>
                <div className={styles.settingsField}>
                    <label className={styles.settingsFieldLabel}>Node Label Title</label>
                    <TextField
                        fullWidth
                        size="small"
                        value={formData.label || ''}
                        onChange={(e) => updateField('label', e.target.value)}
                        placeholder="e.g. 2. Welcome Menu"
                        className={styles.settingsInput}
                    />
                </div>

                <Divider className={styles.settingsDivider} />

                {activeNode.type === 'keyword_trigger' && (
                    <KeywordTriggerForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'send_question' && (
                    <SendQuestionForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'send_message' && (
                    <SendMessageForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'condition' && (
                    <ConditionForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'delay' && (
                    <DelayForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'goto' && (
                    <GotoForm data={formData} updateField={updateField} nodes={nodes} activeNodeId={activeNode.id} />
                )}
                {activeNode.type === 'set_variable' && (
                    <SetVariableForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'api_call' && (
                    <APICallForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'human_handoff' && (
                    <HumanHandoffForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'end_flow' && (
                    <EndFlowForm data={formData} updateField={updateField} />
                )}
                {activeNode.type === 'whatsapp_flow' && (
                    <WhatsAppFlowForm data={formData} updateField={updateField} />
                )}
            </div>
        </div>
    );
};

// ── Sub-forms ──────────────────────────────────────────────────────────────────

function KeywordTriggerForm({ data, updateField }) {
    const [kwInput, setKwInput] = useState('');
    const [kwError, setKwError] = useState('');
    const keywords = data.keywords || [];

    const validateKeyword = (kw) => {
        if (!kw || !kw.trim()) return 'Keyword cannot be empty.';
        if (kw.length < 2) return 'Keyword must be at least 2 characters.';
        if (kw.length > 64) return 'Keyword must be 64 characters or less.';
        if (!/^[a-zA-Z0-9_]+$/.test(kw)) return 'Only letters, numbers, and underscores are allowed.';
        if (keywords.includes(kw)) return `"${kw}" is already in the list.`;
        return '';
    };

    const handleAddKeyword = (e) => {
        e?.preventDefault();
        const kw = kwInput.trim().toLowerCase();
        const err = validateKeyword(kw);
        if (err) {
            setKwError(err);
            return;
        }
        updateField('keywords', [...keywords, kw]);
        setKwInput('');
        setKwError('');
    };

    const handleRemoveKeyword = (index) => {
        updateField('keywords', keywords.filter((_, i) => i !== index));
        setKwError('');
    };

    return (
        <>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Match Method Rule</label>
                <TextField
                    fullWidth select size="small"
                    value={data.matchMode || 'contains'}
                    onChange={(e) => updateField('matchMode', e.target.value)}
                    className={styles.settingsInput}
                >
                    <MenuItem value="contains">Contains (Soft Phrase Matching)</MenuItem>
                    <MenuItem value="exact">Exact (Matches Keyword Fully)</MenuItem>
                </TextField>
            </div>

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Trigger Keywords</label>
                <Box className={styles.keywordInputRow}>
                    <TextField
                        size="small"
                        value={kwInput}
                        onChange={(e) => { setKwInput(e.target.value); setKwError(''); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddKeyword();
                            }
                        }}
                        placeholder="Type e.g. hello, support and hit enter"
                        className={styles.settingsInput}
                        error={!!kwError}
                        helperText={kwError}
                    />
                    <Button variant="contained" size="small" onClick={handleAddKeyword} className="buttonClassname">
                        Add
                    </Button>
                </Box>
                <Box className={styles.keywordChips}>
                    {keywords.length === 0 ? (
                        <Typography className={styles.keywordEmpty}>Type keywords above to capture intent...</Typography>
                    ) : (
                        keywords.map((kw, i) => (
                            <Chip
                                key={i}
                                label={kw}
                                size="small"
                                onDelete={() => handleRemoveKeyword(i)}
                                className={styles.keywordChip}
                            />
                        ))
                    )}
                </Box>
            </div>
        </>
    );
}

function SendQuestionForm({ data, updateField }) {
    const buttons = data.buttons || [];
    const buttonType = data.buttonType || 'quick_reply';
    const [btnLabel, setBtnLabel] = useState('');
    const [btnDesc, setBtnDesc] = useState('');

    const limitCount = buttonType === 'quick_reply' ? 3 : 10;
    const maxLabelLength = buttonType === 'quick_reply' ? 20 : 24;

    const sectionOrder = getSectionOrder(data, DEFAULT_SECTION_ORDER_SEND_QUESTION);

    // ── Inline WhatsApp API validation ──────────────────────────
    const validationWarnings = [];
    const isList = buttonType === 'list' && buttons.length > 0;
    const isButton = buttonType !== 'list' && buttons.length > 0;

    // Body text limit
    const bodyLimit = isList ? 4096 : (isButton ? 1024 : 4096);
    if (data.text && data.text.length > bodyLimit) {
        validationWarnings.push(`Body text exceeds ${bodyLimit} char limit for ${isList ? 'list' : isButton ? 'button' : 'text'} messages (current: ${data.text.length}).`);
    }

    // Button count
    if (isButton && buttons.length > 3) {
        validationWarnings.push(`${buttons.length} buttons — Meta allows max 3 for reply buttons. Switch to list type or remove extras.`);
    }
    if (isList && buttons.length > 10) {
        validationWarnings.push(`${buttons.length} list rows — Meta allows max 10 total. Remove extras.`);
    }

    // Duplicate button labels
    if (isButton || isList) {
        const labels = buttons.map((b) => b.label);
        const dups = labels.filter((l, i) => labels.indexOf(l) !== i);
        if (dups.length > 0) {
            validationWarnings.push(`Duplicate button title${dups.length > 1 ? 's' : ''}: "${dups.join('", "')}" — titles must be unique.`);
        }
    }

    // Media header restrictions
    if (data.mediaUrl) {
        if (isList && data.mediaType !== 'text') {
            validationWarnings.push({
                text: `List messages support text-only headers — ${data.mediaType} will be rejected by Meta. Remove media or switch to button type.`,
                action: () => { updateField('mediaUrl', ''); updateField('mediaFileName', ''); updateField('mediaType', 'image'); },
                actionLabel: 'Remove media',
            });
        }
        if (isButton && data.mediaType === 'audio') {
            validationWarnings.push({
                text: `Audio cannot be used as a header on button messages. Send as a separate audio message.`,
                action: () => { updateField('mediaUrl', ''); updateField('mediaFileName', ''); updateField('mediaType', 'image'); },
                actionLabel: 'Remove media',
            });
        }
    }

    const handleAddButton = () => {
        if (buttons.length >= limitCount || !btnLabel.trim()) return;
        const newBtn = {
            id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            label: btnLabel.trim().substring(0, maxLabelLength),
            description: buttonType === 'list' && btnDesc.trim() ? btnDesc.trim() : undefined,
        };
        updateField('buttons', [...buttons, newBtn]);
        setBtnLabel('');
        setBtnDesc('');
    };

    const handleRemoveButton = (id) => {
        updateField('buttons', buttons.filter((b) => b.id !== id));
    };

    const handleMoveButton = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= buttons.length) return;
        const reordered = [...buttons];
        [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
        updateField('buttons', reordered);
    };

    const handleDragReorder = (dragIndex, hoverIndex) => {
        if (dragIndex === hoverIndex || hoverIndex < 0 || hoverIndex >= buttons.length) return;
        const reordered = [...buttons];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(hoverIndex, 0, moved);
        updateField('buttons', reordered);
    };

    const handleEditButton = (btnId, key, value) => {
        const updated = buttons.map((b) => b.id === btnId ? { ...b, [key]: value } : b);
        updateField('buttons', updated);
    };

    // ── Section renderers ──────────────────────────────────────
    const renderSection = (sectionId) => {
        switch (sectionId) {
            case 'text':
                return (
                    <ReorderableSection key="text" id="text" label="Message Body Text" sectionOrder={sectionOrder} updateField={updateField}>
                        <div className={styles.settingsField}>
                            <TextField
                                fullWidth multiline rows={3} size="small"
                                value={data.text || ''}
                                onChange={(e) => updateField('text', e.target.value)}
                                placeholder="Enter WhatsApp response content..."
                                className={styles.settingsInput}
                            />
                        </div>
                    </ReorderableSection>
                );
            case 'media':
                return (
                    <ReorderableSection key="media" id="media" label="Media Attachment" sectionOrder={sectionOrder} updateField={updateField}>
                        <AttachmentUpload data={data} updateField={updateField} />
                    </ReorderableSection>
                );
            case 'buttonType':
                return (
                    <ReorderableSection key="buttonType" id="buttonType" label="Interaction Response Type" sectionOrder={sectionOrder} updateField={updateField}>
                        <div className={styles.settingsField}>
                            <TextField
                                fullWidth select size="small"
                                value={buttonType}
                                onChange={(e) => {
                                    updateField('buttonType', e.target.value);
                                    updateField('buttons', []);
                                }}
                                className={styles.settingsInput}
                            >
                                <MenuItem value="quick_reply">Quick Reply Buttons (Max 3)</MenuItem>
                                <MenuItem value="list">Structured Interactive List (Max 10)</MenuItem>
                            </TextField>
                        </div>
                    </ReorderableSection>
                );
            case 'buttons':
                return (
                    <ReorderableSection key="buttons" id="buttons" label={`Output Options (${buttons.length} / ${limitCount})`} sectionOrder={sectionOrder} updateField={updateField}>
                        <div className={styles.settingsField}>
                            {buttons.length > 0 && (
                                <Box className={styles.buttonList}>
                                    {buttons.map((b, bIdx) => (
                                        <div
                                            key={b.id}
                                            className={styles.buttonListItem}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', String(bIdx));
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const dragIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                                if (!isNaN(dragIdx)) handleDragReorder(dragIdx, bIdx);
                                            }}
                                        >
                                            <div className={styles.buttonListDragHandle} title="Drag to reorder">
                                                <GripVertical size={14} />
                                            </div>
                                            <div className={styles.buttonListItemContent}>
                                                <TextField
                                                    fullWidth size="small"
                                                    value={b.label || ''}
                                                    onChange={(e) => handleEditButton(b.id, 'label', e.target.value.substring(0, maxLabelLength))}
                                                    placeholder="Button label"
                                                    className={styles.buttonListEditInput}
                                                />
                                                {buttonType === 'list' && (
                                                    <TextField
                                                        fullWidth size="small"
                                                        value={b.description || ''}
                                                        onChange={(e) => handleEditButton(b.id, 'description', e.target.value.substring(0, 72))}
                                                        placeholder="Description (max 72 chars)"
                                                        className={styles.buttonListEditInput}
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                )}
                                            </div>
                                            <div className={styles.buttonListActions}>
                                                <button
                                                    type="button"
                                                    className={styles.buttonListReorderBtn}
                                                    onClick={() => handleMoveButton(bIdx, -1)}
                                                    disabled={bIdx === 0}
                                                    title="Move up"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.buttonListReorderBtn}
                                                    onClick={() => handleMoveButton(bIdx, 1)}
                                                    disabled={bIdx === buttons.length - 1}
                                                    title="Move down"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                                <IconButton size="small" onClick={() => handleRemoveButton(b.id)} className={styles.buttonListRemove}>
                                                    <Trash2 size={14} />
                                                </IconButton>
                                            </div>
                                        </div>
                                    ))}
                                </Box>
                            )}
                            {buttons.length < limitCount ? (
                                <Box className={styles.buttonAddBox}>
                                    <div className={styles.buttonAddLabelRow}>
                                        <span className={styles.buttonAddLabel}>BUTTON TEXT LABEL</span>
                                        <span className={styles.buttonAddCount}>{btnLabel.length} / {maxLabelLength}</span>
                                    </div>
                                    <TextField
                                        fullWidth size="small"
                                        value={btnLabel}
                                        onChange={(e) => setBtnLabel(e.target.value.substring(0, maxLabelLength))}
                                        placeholder={`Type short label (max ${maxLabelLength})`}
                                        className={styles.settingsInput}
                                    />
                                    {buttonType === 'list' && (
                                        <TextField
                                            fullWidth size="small"
                                            value={btnDesc}
                                            onChange={(e) => setBtnDesc(e.target.value.substring(0, 72))}
                                            placeholder="Description subtitle (max 72 chars)"
                                            className={styles.settingsInput}
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                    <Button
                                        fullWidth variant="contained" size="small"
                                        onClick={handleAddButton}
                                        disabled={!btnLabel.trim()}
                                        startIcon={<Plus size={14} />}
                                        className="buttonClassname"
                                        sx={{ mt: 1 }}
                                    >
                                        Add Interactive Option
                                    </Button>
                                </Box>
                            ) : (
                                <Typography className={styles.buttonLimitReached}>
                                    Reached max options for WhatsApp {buttonType.replace('_', ' ')} elements.
                                </Typography>
                            )}
                        </div>
                    </ReorderableSection>
                );
            case 'timeout':
                return (
                    <ReorderableSection key="timeout" id="timeout" label="No-Input Timeout" sectionOrder={sectionOrder} updateField={updateField}>
                        <div className={styles.settingsField}>
                            <TextField
                                fullWidth type="number" size="small"
                                value={data.timeoutMinutes || 30}
                                onChange={(e) => updateField('timeoutMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                                className={styles.settingsInput}
                            />
                            <Typography className={styles.settingsFieldHint}>
                                Time before "No Input Timeout" connection executes. 0 for no timeout.
                            </Typography>
                        </div>
                    </ReorderableSection>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {validationWarnings.length > 0 && (
                <div className={styles.validationWarnings}>
                    {validationWarnings.map((w, i) => (
                        <div key={i} className={styles.validationWarningItem}>
                            <AlertTriangle size={13} className={styles.validationWarningIcon} />
                            <span>{typeof w === 'string' ? w : w.text}</span>
                            {typeof w !== 'string' && w.action && (
                                <button
                                    type="button"
                                    className={styles.validationWarningAction}
                                    onClick={w.action}
                                >
                                    {w.actionLabel || 'Fix'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {sectionOrder.map((sectionId) => renderSection(sectionId))}
        </>
    );
}

function SendMessageForm({ data, updateField }) {
    const sendWarnings = [];
    if (data.text && data.text.length > 4096) {
        sendWarnings.push(`Body text exceeds 4096 char limit for WhatsApp messages (current: ${data.text.length}).`);
    }

    const sectionOrder = getSectionOrder(data, DEFAULT_SECTION_ORDER_SEND_MESSAGE);

    const renderSection = (sectionId) => {
        switch (sectionId) {
            case 'text':
                return (
                    <ReorderableSection key="text" id="text" label="Message Body Text" sectionOrder={sectionOrder} updateField={updateField}>
                        <div className={styles.settingsField}>
                            <TextField
                                fullWidth multiline rows={4} size="small"
                                value={data.text || ''}
                                onChange={(e) => updateField('text', e.target.value)}
                                placeholder="Type message content..."
                                className={styles.settingsInput}
                            />
                        </div>
                    </ReorderableSection>
                );
            case 'media':
                return (
                    <ReorderableSection key="media" id="media" label="Media Attachment" sectionOrder={sectionOrder} updateField={updateField}>
                        <AttachmentUpload data={data} updateField={updateField} />
                    </ReorderableSection>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {sendWarnings.length > 0 && (
                <div className={styles.validationWarnings}>
                    {sendWarnings.map((w, i) => (
                        <div key={i} className={styles.validationWarningItem}>
                            <AlertTriangle size={13} className={styles.validationWarningIcon} />
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            )}
            {sectionOrder.map((sectionId) => renderSection(sectionId))}
        </>
    );
}

function ConditionForm({ data, updateField }) {
    return (
        <>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>State Variable Parameter</label>
                <TextField
                    fullWidth size="small"
                    value={data.variable || ''}
                    onChange={(e) => updateField('variable', e.target.value)}
                    placeholder="e.g. user.city or order_status"
                    className={styles.settingsInput}
                    sx={{ '& input': { fontFamily: 'monospace' } }}
                />
            </div>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Comparison Operator</label>
                <TextField
                    fullWidth select size="small"
                    value={data.operator || 'equals'}
                    onChange={(e) => updateField('operator', e.target.value)}
                    className={styles.settingsInput}
                >
                    <MenuItem value="equals">Equals (Exact match)</MenuItem>
                    <MenuItem value="not_equals">Does not Equal</MenuItem>
                    <MenuItem value="contains">Contains substring</MenuItem>
                    <MenuItem value="greater_than">Greater than (&gt; numerical)</MenuItem>
                    <MenuItem value="is_set">Is Set (Variable Exists)</MenuItem>
                    <MenuItem value="is_not_set">Is Not Set (Empty)</MenuItem>
                </TextField>
            </div>
            {!['is_set', 'is_not_set'].includes(data.operator) && (
                <div className={styles.settingsField}>
                    <label className={styles.settingsFieldLabel}>Target Comparison Value</label>
                    <TextField
                        fullWidth size="small"
                        value={data.value || ''}
                        onChange={(e) => updateField('value', e.target.value)}
                        placeholder="e.g. Surat, 100, active"
                        className={styles.settingsInput}
                    />
                </div>
            )}
        </>
    );
}

function DelayForm({ data, updateField }) {
    return (
        <>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Wait Duration</label>
                <TextField
                    fullWidth type="number" size="small"
                    value={data.duration || 5}
                    onChange={(e) => updateField('duration', Math.max(1, parseInt(e.target.value) || 1))}
                    className={styles.settingsInput}
                />
            </div>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Unit Segment</label>
                <TextField
                    fullWidth select size="small"
                    value={data.unit || 'minutes'}
                    onChange={(e) => updateField('unit', e.target.value)}
                    className={styles.settingsInput}
                >
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="hours">Hours</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                </TextField>
            </div>
        </>
    );
}

function GotoForm({ data, updateField, nodes, activeNodeId }) {
    const availableDestinations = nodes.filter((n) => n.id !== activeNodeId);
    return (
        <div className={styles.settingsField}>
            <label className={styles.settingsFieldLabel}>Jump Destination Target Node</label>
            <TextField
                fullWidth select size="small"
                value={data.targetNodeId || ''}
                onChange={(e) => updateField('targetNodeId', e.target.value)}
                className={styles.settingsInput}
            >
                <MenuItem value="">Select node...</MenuItem>
                {availableDestinations.map((node) => {
                    const name = node.data?.label || `${node.id} [${node.type}]`;
                    return (
                        <MenuItem key={node.id} value={node.id}>
                            {name} ({node.type})
                        </MenuItem>
                    );
                })}
            </TextField>
            <Typography className={styles.settingsFieldHint}>
                Forces bot runtime to jump directly to this element. Useful for looping menus.
            </Typography>
        </div>
    );
}

function SetVariableForm({ data, updateField }) {
    return (
        <>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Variable Storage Key</label>
                <TextField
                    fullWidth size="small"
                    value={data.key || ''}
                    onChange={(e) => updateField('key', e.target.value)}
                    placeholder="e.g. user.name or selectedStyle"
                    className={styles.settingsInput}
                    sx={{ '& input': { fontFamily: 'monospace' } }}
                />
            </div>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Value Source</label>
                <TextField
                    fullWidth select size="small"
                    value={data.valueSource || 'last_reply'}
                    onChange={(e) => updateField('valueSource', e.target.value)}
                    className={styles.settingsInput}
                >
                    <MenuItem value="last_reply">Last Client Response (Captured Message)</MenuItem>
                    <MenuItem value="fixed">Fixed Explicit Text Value (Static)</MenuItem>
                </TextField>
            </div>
            {data.valueSource === 'fixed' && (
                <div className={styles.settingsField}>
                    <label className={styles.settingsFieldLabel}>Static Text Value</label>
                    <TextField
                        fullWidth size="small"
                        value={data.fixedValue || ''}
                        onChange={(e) => updateField('fixedValue', e.target.value)}
                        placeholder="e.g. Diamond Ring, true, Gold Chain"
                        className={styles.settingsInput}
                    />
                </div>
            )}
        </>
    );
}

function APICallForm({ data, updateField }) {
    const headers = data.headers || [];
    const [headerKey, setHeaderKey] = useState('');
    const [headerVal, setHeaderVal] = useState('');

    const handleAddHeader = () => {
        if (headerKey.trim() && headerVal.trim()) {
            updateField('headers', [...headers, { key: headerKey.trim(), value: headerVal.trim() }]);
            setHeaderKey('');
            setHeaderVal('');
        }
    };

    const handleRemoveHeader = (index) => {
        updateField('headers', headers.filter((_, i) => i !== index));
    };

    return (
        <>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>REST Method</label>
                <TextField
                    fullWidth select size="small"
                    value={data.method || 'GET'}
                    onChange={(e) => updateField('method', e.target.value)}
                    className={styles.settingsInput}
                >
                    <MenuItem value="GET">GET (Download Content)</MenuItem>
                    <MenuItem value="POST">POST (Create/Send Payload)</MenuItem>
                    <MenuItem value="PUT">PUT (Modify/Update Object)</MenuItem>
                </TextField>
            </div>
            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Request Target URL</label>
                <TextField
                    fullWidth size="small"
                    value={data.url || ''}
                    onChange={(e) => updateField('url', e.target.value)}
                    placeholder="https://api.example.com/v1/orders"
                    className={styles.settingsInput}
                    sx={{ '& input': { fontFamily: 'monospace' } }}
                />
            </div>

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Dynamic Headers</label>
                {headers.length > 0 && (
                    <Box className={styles.headerList}>
                        {headers.map((h, i) => (
                            <div key={i} className={styles.headerListItem}>
                                <span className={styles.headerListItemText}>
                                    <strong>{h.key}</strong>: {h.value}
                                </span>
                                <IconButton size="small" onClick={() => handleRemoveHeader(i)}>
                                    <Trash2 size={12} />
                                </IconButton>
                            </div>
                        ))}
                    </Box>
                )}
                <Box className={styles.headerAddBox}>
                    <TextField
                        size="small"
                        value={headerKey}
                        onChange={(e) => setHeaderKey(e.target.value)}
                        placeholder="Header-Key"
                        className={styles.settingsInput}
                    />
                    <TextField
                        size="small"
                        value={headerVal}
                        onChange={(e) => setHeaderVal(e.target.value)}
                        placeholder="Value or {{vars}}"
                        className={styles.settingsInput}
                    />
                    <Button
                        fullWidth variant="contained" size="small"
                        onClick={handleAddHeader}
                        disabled={!headerKey.trim() || !headerVal.trim()}
                        className="buttonClassname"
                    >
                        Add Header
                    </Button>
                </Box>
            </div>

            {data.method !== 'GET' && (
                <div className={styles.settingsField}>
                    <label className={styles.settingsFieldLabel}>POST Payload JSON Body</label>
                    <TextField
                        fullWidth multiline rows={3} size="small"
                        value={data.body || ''}
                        onChange={(e) => updateField('body', e.target.value)}
                        placeholder='{"orderId": "{{user.orderId}}"}'
                        className={styles.settingsInput}
                        sx={{ '& textarea': { fontFamily: 'monospace' } }}
                    />
                </div>
            )}

            <Divider className={styles.settingsDivider} />

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Save API Response Variable</label>
                <TextField
                    fullWidth size="small"
                    value={data.responseVariable || ''}
                    onChange={(e) => updateField('responseVariable', e.target.value)}
                    placeholder="e.g. order_reply"
                    className={styles.settingsInput}
                    sx={{ '& input': { fontFamily: 'monospace' } }}
                />
            </div>
        </>
    );
}

function HumanHandoffForm({ data, updateField }) {
    return (
        <div className={styles.settingsField}>
            <label className={styles.settingsFieldLabel}>Agent Assignment Banner Text</label>
            <TextField
                fullWidth multiline rows={3} size="small"
                value={data.message || ''}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="Type banner context to alert client..."
                className={styles.settingsInput}
            />
        </div>
    );
}

function EndFlowForm({ data, updateField }) {
    return (
        <div className={styles.settingsField}>
            <label className={styles.settingsFieldLabel}>Final Goodbye Message Text</label>
            <TextField
                fullWidth multiline rows={3} size="small"
                value={data.message || ''}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="e.g. Thank you for visiting us. Chat session is now complete."
                className={styles.settingsInput}
            />
        </div>
    );
}

function WhatsAppFlowForm({ data, updateField }) {
    const fields = data.fields || [];
    const [fLabel, setFLabel] = useState('');
    const [fType, setFType] = useState('text');
    const [fPlaceholder, setFPlaceholder] = useState('');
    const [fOptionsRaw, setFOptionsRaw] = useState('');
    const [fRequired, setFRequired] = useState(true);

    const handleAddField = () => {
        if (!fLabel.trim()) return;
        let options;
        if (['dropdown', 'radio'].includes(fType) && fOptionsRaw.trim()) {
            options = fOptionsRaw.split(',').map((opt, idx) => ({
                key: `opt_${Date.now()}_${idx}`,
                label: opt.trim(),
            }));
        }
        const newField = {
            id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: fType,
            label: fLabel.trim(),
            placeholder: fPlaceholder.trim() || undefined,
            options,
            required: fRequired,
        };
        updateField('fields', [...fields, newField]);
        setFLabel('');
        setFPlaceholder('');
        setFOptionsRaw('');
        setFRequired(true);
    };

    const handleRemoveField = (fieldId) => {
        updateField('fields', fields.filter((f) => f.id !== fieldId));
    };

    const handleEditField = (fieldId, key, value) => {
        const updated = fields.map((f) => f.id === fieldId ? { ...f, [key]: value } : f);
        updateField('fields', updated);
    };

    const handleEditOption = (fieldId, optKey, value) => {
        const updated = fields.map((f) => {
            if (f.id !== fieldId) return f;
            const opts = (f.options || []).map((o) => o.key === optKey ? { ...o, label: value } : o);
            return { ...f, options: opts };
        });
        updateField('fields', updated);
    };

    return (
        <>
            <Box className={styles.waFlowInfo}>
                <div className={styles.waFlowInfoHeader}>
                    <Smartphone size={14} />
                    <span>Meta WhatsApp Flows Setup</span>
                </div>
                <Typography className={styles.waFlowInfoText}>
                    Embed verified multi-screen custom forms inside conversations. Submitted answers are saved dynamically.
                </Typography>
            </Box>

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Meta Flow Endpoint ID</label>
                <TextField
                    fullWidth size="small"
                    value={data.flowId || ''}
                    onChange={(e) => updateField('flowId', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="e.g. flow_luxury_checkout"
                    className={styles.settingsInput}
                    sx={{ '& input': { fontFamily: 'monospace' } }}
                />
            </div>

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Starting Screen ID</label>
                <TextField
                    fullWidth size="small"
                    value={data.screenId || ''}
                    onChange={(e) => updateField('screenId', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    placeholder="e.g. SCREEN_SIZE_SELECT"
                    className={styles.settingsInput}
                    sx={{ '& input': { fontFamily: 'monospace' } }}
                />
            </div>

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Flow CTA Trigger Button Text</label>
                <TextField
                    fullWidth size="small"
                    value={data.ctaText || ''}
                    onChange={(e) => updateField('ctaText', e.target.value)}
                    placeholder="e.g. Choose Size"
                    className={styles.settingsInput}
                />
            </div>

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>Form Submit Button Text</label>
                <TextField
                    fullWidth size="small"
                    value={data.submitButtonText || ''}
                    onChange={(e) => updateField('submitButtonText', e.target.value)}
                    placeholder="e.g. Confirm and Continue"
                    className={styles.settingsInput}
                />
            </div>

            <Divider className={styles.settingsDivider} />

            <div className={styles.settingsField}>
                <label className={styles.settingsFieldLabel}>
                    Dynamic Screen Fields ({fields.length})
                </label>
                {fields.length > 0 && (
                    <Box className={styles.fieldList}>
                        {fields.map((field, idx) => (
                            <div key={field.id || idx} className={styles.fieldListItem}>
                                <div className={styles.fieldListItemContent}>
                                    <div className={styles.fieldListItemHeader}>
                                        <TextField
                                            size="small"
                                            value={field.label || ''}
                                            onChange={(e) => handleEditField(field.id, 'label', e.target.value)}
                                            placeholder="Field label"
                                            className={styles.fieldListEditInput}
                                        />
                                        <span className={styles.fieldListItemType}>{field.type}</span>
                                        {field.required && <span className={styles.fieldListItemRequired}>*</span>}
                                    </div>
                                    <TextField
                                        fullWidth size="small"
                                        value={field.placeholder || ''}
                                        onChange={(e) => handleEditField(field.id, 'placeholder', e.target.value)}
                                        placeholder="Placeholder text (optional)"
                                        className={styles.fieldListEditInput}
                                        sx={{ mt: 0.5 }}
                                    />
                                    {field.options && field.options.length > 0 && (
                                        <Box className={styles.fieldListItemOptions}>
                                            {field.options.map((opt, oI) => (
                                                <TextField
                                                    key={opt.key || oI}
                                                    size="small"
                                                    value={opt.label || ''}
                                                    onChange={(e) => handleEditOption(field.id, opt.key, e.target.value)}
                                                    placeholder="Option label"
                                                    className={styles.fieldListEditInput}
                                                    sx={{ minWidth: 100 }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </div>
                                <IconButton size="small" onClick={() => handleRemoveField(field.id)}>
                                    <Trash2 size={14} />
                                </IconButton>
                            </div>
                        ))}
                    </Box>
                )}

                <Box className={styles.fieldAddBox}>
                    <div className={styles.fieldAddTitle}>Add Native Form Screen Field</div>
                    <Box className={styles.fieldAddRow}>
                        <TextField
                            size="small"
                            value={fLabel}
                            onChange={(e) => setFLabel(e.target.value)}
                            placeholder="Field label"
                            className={styles.settingsInput}
                        />
                        <TextField
                            select size="small"
                            value={fType}
                            onChange={(e) => setFType(e.target.value)}
                            className={styles.settingsInput}
                            sx={{ minWidth: 120 }}
                        >
                            <MenuItem value="text">Text</MenuItem>
                            <MenuItem value="number">Number</MenuItem>
                            <MenuItem value="dropdown">Dropdown</MenuItem>
                            <MenuItem value="checkbox">Checkbox</MenuItem>
                            <MenuItem value="radio">Radio</MenuItem>
                        </TextField>
                    </Box>
                    <TextField
                        fullWidth size="small"
                        value={fPlaceholder}
                        onChange={(e) => setFPlaceholder(e.target.value)}
                        placeholder="Placeholder text (optional)"
                        className={styles.settingsInput}
                        sx={{ mt: 1 }}
                    />
                    {['dropdown', 'radio'].includes(fType) && (
                        <TextField
                            fullWidth size="small"
                            value={fOptionsRaw}
                            onChange={(e) => setFOptionsRaw(e.target.value)}
                            placeholder="Comma-separated options: Option 1, Option 2"
                            className={styles.settingsInput}
                            sx={{ mt: 1 }}
                        />
                    )}
                    <FormControlLabel
                        control={<Checkbox checked={fRequired} onChange={(e) => setFRequired(e.target.checked)} size="small" />}
                        label="Required field"
                        className={styles.fieldRequiredLabel}
                    />
                    <Button
                        fullWidth variant="contained" size="small"
                        onClick={handleAddField}
                        disabled={!fLabel.trim()}
                        startIcon={<Plus size={14} />}
                        className="buttonClassname"
                        sx={{ mt: 1 }}
                    >
                        Add Field
                    </Button>
                </Box>
            </div>
        </>
    );
}

// ── Attachment Upload Component ───────────────────────────────────────────────

function AttachmentUpload({ data, updateField }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const fileInputRef = useRef(null);

    const rawMediaUrl = data.mediaUrl || '';
    const isPlaceholder = rawMediaUrl.includes('placehold.co');
    const mediaUrl = isPlaceholder ? '' : rawMediaUrl;
    const mediaType = data.mediaType || 'image';
    const fileName = isPlaceholder ? '' : (data.mediaFileName || '');

    const inferMediaType = (file) => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'document';
    };

    // WhatsApp Cloud API supported media formats
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/3gpp'];
    const ALLOWED_AUDIO_TYPES = ['audio/aac', 'audio/mp4', 'audio/amr', 'audio/ogg', 'audio/opus'];
    const ALLOWED_DOC_TYPES = [
        'text/plain', 'application/pdf',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const validateMediaFormat = (file, type) => {
        const fileType = file.type.toLowerCase();
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (type === 'image') {
            if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
                return `Unsupported image format "${ext || fileType}". WhatsApp only supports JPEG and PNG. WebP, GIF, BMP, TIFF are not supported.`;
            }
        } else if (type === 'video') {
            if (!ALLOWED_VIDEO_TYPES.includes(fileType)) {
                return `Unsupported video format "${ext || fileType}". WhatsApp only supports MP4 and 3GPP.`;
            }
        } else if (type === 'audio') {
            if (!ALLOWED_AUDIO_TYPES.includes(fileType)) {
                return `Unsupported audio format "${ext || fileType}". WhatsApp supports AAC, MP4, AMR, OGG, and Opus.`;
            }
        } else if (type === 'document') {
            if (!ALLOWED_DOC_TYPES.includes(fileType)) {
                return `Unsupported document format "${ext || fileType}". WhatsApp supports PDF, Word, Excel, PowerPoint, and TXT.`;
            }
        }
        return '';
    };

    const handleFileSelect = async (file) => {
        if (!file) return;

        // WhatsApp Cloud API size limits per media type
        const inferredType = inferMediaType(file);
        const sizeLimits = { image: 5, video: 16, audio: 16, document: 100 };
        const maxSizeMB = sizeLimits[inferredType] || 16;
        if (file.size > maxSizeMB * 1024 * 1024) {
            setUploadError(`File too large. Max ${maxSizeMB}MB for ${inferredType} files (WhatsApp limit).`);
            return;
        }

        // WhatsApp Cloud API format validation
        const formatError = validateMediaFormat(file, inferredType);
        if (formatError) {
            setUploadError(formatError);
            return;
        }

        // Meta validation: check media type against node's buttonType
        const buttonType = data.buttonType || 'quick_reply';
        const isList = buttonType === 'list';
        const isButton = buttonType !== 'list' && (data.buttons || []).length > 0;

        if (isList) {
            setUploadError('List messages support text-only headers. Media cannot be attached to list-type nodes. Remove the media or switch to button type.');
            return;
        }
        if (isButton && inferredType === 'audio') {
            setUploadError('Audio cannot be used as a header on interactive button messages. Send audio as a separate send_message node instead.');
            return;
        }

        setUploadError('');
        setIsUploading(true);

        try {
            const response = await filesUploadApi({
                attachments: [{ file }],
                folderName: 'wababroadcast/automation',
                uniqueNo: `flow_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
            });

            const fileObj = response?.files?.[0];
            const uploadedUrl =
                fileObj?.url ||
                response?.data?.url ||
                response?.data?.fileUrl ||
                response?.url ||
                response?.fileUrl ||
                (typeof response?.data === 'string' ? response.data : null);

            if (uploadedUrl) {
                // Use API-returned fileType for more accurate media type detection
                const apiFileType = fileObj?.fileType || '';
                const apiMediaType = apiFileType.startsWith('image/') ? 'image'
                    : apiFileType.startsWith('video/') ? 'video'
                    : apiFileType.startsWith('audio/') ? 'audio'
                    : inferredType;

                updateField('media', {
                    mediaUrl: uploadedUrl,
                    mediaType: apiMediaType,
                    mediaFileName: fileObj?.fileName || file.name,
                });
            } else {
                console.warn('Upload response structure:', JSON.stringify(response));
                setUploadError('Upload succeeded but no URL returned. Please try the URL input.');
                setShowUrlInput(true);
            }
        } catch (err) {
            setUploadError(err.message || 'Upload failed. Try using the URL input instead.');
            setShowUrlInput(true);
        } finally {
            setIsUploading(false);
        }
    };

    const handleInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRemoveAttachment = () => {
        updateField('media', { mediaUrl: '', mediaType: 'image', mediaFileName: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // When a placeholder is present, clearing it allows fresh upload
    const handleClearPlaceholder = () => {
        updateField('media', { mediaUrl: '', mediaFileName: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={styles.settingsField}>
            <label className={styles.settingsFieldLabel}>Media Attachment (Optional)</label>
            <div className={styles.attachmentUpload}>
                {isUploading ? (
                    <div className={styles.attachmentUploading}>
                        <Loader2 size={14} className="spinner" />
                        Uploading...
                    </div>
                ) : mediaUrl && !showUrlInput ? (
                    <div className={styles.attachmentPreview}>
                        {mediaType === 'image' ? (
                            <>
                                <img
                                    src={mediaUrl}
                                    alt="Preview"
                                    className={styles.attachmentPreviewImage}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className={styles.attachmentPreviewFallback} style={{ display: 'none' }}>
                                    <ImageIcon size={24} />
                                    <span>Image preview unavailable</span>
                                </div>
                            </>
                        ) : mediaType === 'video' ? (
                            <video src={mediaUrl} className={styles.attachmentPreviewVideo} controls muted preload="metadata" />
                        ) : mediaType === 'audio' ? (
                            <div className={styles.attachmentPreviewAudio}>
                                <audio src={mediaUrl} controls preload="metadata" />
                            </div>
                        ) : (
                            <div className={styles.attachmentPreviewDoc}>
                                <FileText size={20} className={styles.attachmentPreviewDocIcon} />
                                <span className={styles.attachmentPreviewDocName}>
                                    {fileName || mediaUrl.split('/').pop() || 'Document'}
                                </span>
                            </div>
                        )}
                        <div className={styles.attachmentPreviewMeta}>
                            <span className={styles.attachmentPreviewMetaText}>
                                {fileName || mediaUrl}
                            </span>
                            <button
                                type="button"
                                className={styles.attachmentPreviewRemove}
                                onClick={handleRemoveAttachment}
                            >
                                <Trash2 size={12} />
                                Remove
                            </button>
                        </div>
                    </div>
                ) : showUrlInput ? (
                    <>
                        <TextField
                            fullWidth size="small"
                            value={mediaUrl}
                            onChange={(e) => {
                                const url = e.target.value;
                                updateField('mediaUrl', url);
                                // Validate URL media type against Meta rules
                                const bt = data.buttonType || 'quick_reply';
                                const isList = bt === 'list';
                                const hasButtons = (data.buttons || []).length > 0;
                                if (isList && url) {
                                    setUploadError('List messages support text-only headers. Media cannot be attached to list-type nodes.');
                                } else if (hasButtons && mediaType === 'audio' && url) {
                                    setUploadError('Audio cannot be used as a header on interactive button messages.');
                                } else {
                                    setUploadError('');
                                }
                            }}
                            placeholder="https://example.com/image.jpg"
                            className={styles.settingsInput}
                        />
                        {mediaUrl && (
                            <TextField
                                fullWidth select size="small"
                                value={mediaType}
                                onChange={(e) => updateField('mediaType', e.target.value)}
                                className={styles.settingsInput}
                            >
                                <MenuItem value="image">JPEG / PNG Image</MenuItem>
                                <MenuItem value="video">MP4 Video</MenuItem>
                                <MenuItem value="audio">Audio File</MenuItem>
                                <MenuItem value="document">PDF / Doc</MenuItem>
                            </TextField>
                        )}
                        <button
                            type="button"
                            className={styles.attachmentUrlToggle}
                            onClick={() => setShowUrlInput(false)}
                        >
                            <UploadCloud size={12} />
                            Switch to file upload
                        </button>
                    </>
                ) : (
                    <>
                        <div
                            className={`${styles.attachmentDropzone} ${isDragging ? styles.attachmentDropzoneActive : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className={styles.attachmentDropzoneIcon}>
                                <UploadCloud size={24} />
                            </div>
                            <div className={styles.attachmentDropzoneText}>
                                Click to browse or drag & drop
                            </div>
                            <div className={styles.attachmentDropzoneHint}>
                                Images (5MB), Videos (16MB), Audio (16MB), Docs (100MB)
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                            onChange={handleInputChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            className={styles.attachmentUrlToggle}
                            onClick={() => setShowUrlInput(true)}
                        >
                            <Link2 size={12} />
                            Or paste a URL instead
                        </button>
                    </>
                )}

                {uploadError && (
                    <div className={styles.attachmentUploadError}>{uploadError}</div>
                )}
            </div>
        </div>
    );
}

export default SettingsPanel;
