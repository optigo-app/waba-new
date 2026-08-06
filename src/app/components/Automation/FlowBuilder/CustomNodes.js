'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import {
    Zap,
    MessageSquare,
    HelpCircle,
    GitBranch,
    Clock,
    ArrowRight,
    Variable,
    Globe,
    UserCheck,
    CheckCircle2,
    Smartphone,
    Copy,
    GripVertical,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
    List,
    MessageCircle,
    ExternalLink,
} from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import styles from './FlowBuilder.module.scss';

// ── Inline Editable Text ─────────────────────────────────────────────────────
function InlineEditable({ value, onSave, placeholder = 'Click to edit...', multiline = false, maxLength, className, stopPropagation = true }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const handleStart = (e) => {
        if (stopPropagation) e.stopPropagation();
        setDraft(value || '');
        setEditing(true);
    };

    const handleSave = (e) => {
        if (stopPropagation) e?.stopPropagation();
        let val = draft;
        if (maxLength && val.length > maxLength) val = val.substring(0, maxLength);
        if (val !== value) onSave(val);
        setEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            handleSave(e);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
        }
    };

    if (editing) {
        const commonProps = {
            ref: inputRef,
            value: draft,
            onChange: (e) => setDraft(e.target.value),
            onBlur: handleSave,
            onKeyDown: handleKeyDown,
            onMouseDown: (e) => e.stopPropagation(),
            onClick: (e) => e.stopPropagation(),
            className: `${styles.inlineEditInput} ${multiline ? styles.inlineEditTextarea : ''} ${className || ''}`,
        };
        return multiline ? (
            <textarea {...commonProps} rows={3} />
        ) : (
            <input {...commonProps} type="text" />
        );
    }

    return (
        <span
            className={`${styles.inlineEditText} ${className || ''}`}
            onClick={handleStart}
            onDoubleClick={(e) => e.stopPropagation()}
            title="Click to edit"
        >
            {value || <span className={styles.inlineEditPlaceholder}>{placeholder}</span>}
        </span>
    );
}

const iconMap = {
    keyword_trigger: Zap,
    send_question: HelpCircle,
    send_message: MessageSquare,
    condition: GitBranch,
    delay: Clock,
    goto: ArrowRight,
    set_variable: Variable,
    api_call: Globe,
    human_handoff: UserCheck,
    end_flow: CheckCircle2,
    whatsapp_flow: Smartphone,
};

const colorMap = {
    keyword_trigger: '#1daa61',
    send_question: '#ff2d55',
    send_message: '#25D366',
    condition: '#f57c00',
    delay: '#00CFE8',
    goto: '#6366f1',
    set_variable: '#a855f7',
    api_call: '#3b82f6',
    human_handoff: '#ec4899',
    end_flow: '#64748b',
    whatsapp_flow: '#075E54',
};

const NODE_TYPE_LABELS = {
    keyword_trigger: 'Trigger',
    send_question: 'Question',
    send_message: 'Message',
    condition: 'Condition',
    delay: 'Delay',
    goto: 'Go To',
    set_variable: 'Variable',
    api_call: 'API Call',
    human_handoff: 'Handoff',
    end_flow: 'End',
    whatsapp_flow: 'WA Flow',
};

const NodeWrapper = ({ id, type, selected, title, icon: Icon, children, warnings = [], onTitleChange }) => {
    const color = colorMap[type] || '#64748b';
    const duplicateNode = useFlowStore((state) => state.duplicateNode);

    return (
        <div className={`${styles.flowNode} ${selected ? styles.flowNodeSelected : ''}`} style={{ '--node-color': color }}>
            <div className={styles.flowNodeHeader} style={{ background: color }}>
                <div className={styles.flowNodeHeaderLeft}>
                    <Icon size={14} />
                    {onTitleChange ? (
                        <InlineEditable
                            value={title}
                            onSave={onTitleChange}
                            placeholder="Untitled"
                            className={styles.flowNodeTitle}
                        />
                    ) : (
                        <span className={styles.flowNodeTitle}>{title}</span>
                    )}
                </div>
                <div className={styles.flowNodeActions}>
                    <button
                        className={styles.flowNodeActionBtn}
                        onClick={(e) => { e.stopPropagation(); duplicateNode(id); }}
                        title="Duplicate"
                        aria-label={`Duplicate ${title}`}
                    >
                        <Copy size={12} />
                    </button>
                </div>
            </div>

            <div className={styles.flowNodeBody}>
                {children}
            </div>

            <div className={styles.flowNodeFooter}>
                <div className={styles.flowNodeTelemetryLeft}>
                    <span className={styles.flowNodeStatusDot} />
                    <span>{NODE_TYPE_LABELS[type] || type}</span>
                </div>
                {warnings.length > 0 ? (
                    <div className={styles.flowNodeValidationBadge} title={warnings.join('\n')}>
                        <AlertTriangle size={10} />
                        <span>{warnings.length}</span>
                    </div>
                ) : (
                    <div className={styles.flowNodeTelemetryRight}>
                        <span className={styles.flowNodeReadyLabel}>Ready</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const KeywordTriggerNode = ({ id, selected, data }) => {
    const color = colorMap.keyword_trigger;
    const safeData = data || {};
    const keywords = safeData.keywords || [];
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="keyword_trigger" selected={selected} title={safeData.label || 'Keyword Match'} icon={iconMap.keyword_trigger}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <div className={styles.flowNodeSection}>
                <div className={styles.flowNodeSectionLabel}>Triggers on Message:</div>
                {keywords.length === 0 ? (
                    <div className={styles.flowNodeEmpty}>No keywords added...</div>
                ) : (
                    <div className={styles.flowNodeKeywordList}>
                        {keywords.map((kw, i) => (
                            <span key={i} className={styles.flowNodeKeyword} style={{ color, background: `${color}12` }}>
                                {kw}
                            </span>
                        ))}
                    </div>
                )}
                <div className={styles.flowNodeMatchMode}>
                    Match Type: <strong>{safeData.matchMode || 'contains'}</strong>
                </div>
            </div>

            <Handle type="source" position={Position.Right} id="output" className={styles.flowNodeHandle} style={{ background: color, top: '50%' }} />
        </NodeWrapper>
    );
};

const DEFAULT_SECTION_ORDER_SEND_QUESTION = ['text', 'media', 'buttons', 'fallback'];
const DEFAULT_SECTION_ORDER_SEND_MESSAGE = ['text', 'media'];

// ── WhatsApp API validation for canvas nodes ─────────────────────────────────
function validateSendQuestion(data) {
    const warnings = [];
    const buttons = data.buttons || [];
    const buttonType = data.buttonType || 'quick_reply';
    const isList = buttonType === 'list';
    const isCtaUrl = buttonType === 'cta_url';
    const isButton = buttonType !== 'list' && buttonType !== 'cta_url' && buttons.length > 0;

    // Body text limit
    const bodyLimit = isList ? 4096 : (isButton || isCtaUrl) ? 1024 : 4096;
    if (data.text && data.text.length > bodyLimit) {
        warnings.push(`Body text exceeds ${bodyLimit} char limit (current: ${data.text.length}).`);
    }

    // Button count
    if (isButton && buttons.length > 3) {
        warnings.push(`${buttons.length} buttons — Meta allows max 3 for reply buttons.`);
    }
    if (isList && buttons.length > 10) {
        warnings.push(`${buttons.length} list rows — Meta allows max 10 total.`);
    }
    if (isCtaUrl && buttons.length > 1) {
        warnings.push(`${buttons.length} buttons — Meta allows max 1 for CTA URL messages.`);
    }
    if (isCtaUrl && buttons[0] && !buttons[0].ctaUrl && !buttons[0].url) {
        warnings.push('CTA URL button has no URL configured.');
    }

    // Button label length
    const maxLabel = isList ? 24 : 20;
    buttons.forEach((btn) => {
        if (btn.label && btn.label.length > maxLabel) {
            warnings.push(`Button "${btn.label}" exceeds ${maxLabel} char limit.`);
        }
    });

    // Duplicate labels
    const labels = buttons.map((b) => b.label);
    const dups = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (dups.length > 0) {
        warnings.push(`Duplicate button title${dups.length > 1 ? 's' : ''}: "${dups.join('", "')}".`);
    }

    // Media header restrictions
    if (data.mediaUrl) {
        if (isList) {
            warnings.push('List messages support text-only headers — media will be rejected.');
        }
        if (isButton && data.mediaType === 'audio') {
            warnings.push('Audio cannot be used as a header on button messages.');
        }
        if (isCtaUrl && data.mediaType === 'audio') {
            warnings.push('Audio cannot be used as a header on CTA URL messages.');
        }
    }

    return warnings;
}

function getSectionOrder(data, defaultOrder) {
    const stored = data.sectionOrder;
    if (Array.isArray(stored) && stored.length > 0) {
        const merged = [...stored];
        for (const s of defaultOrder) {
            if (!merged.includes(s)) merged.push(s);
        }
        return merged;
    }
    return defaultOrder;
}

function renderMedia(data) {
    if (!data.mediaUrl) return null;
    return (
        <div className={styles.flowNodeMedia}>
            {data.mediaType === 'video' ? (
                <video src={data.mediaUrl} className={styles.flowNodeMediaVideo} controls muted preload="metadata" />
            ) : data.mediaType === 'audio' ? (
                <div className={styles.flowNodeMediaAudio}>
                    <audio src={data.mediaUrl} controls preload="metadata" />
                </div>
            ) : data.mediaType === 'document' ? (
                <div className={styles.flowNodeVideoPlaceholder}>
                    {data.mediaFileName || 'Document Attachment'}
                </div>
            ) : (
                <img src={data.mediaUrl} alt="Attachment" className={styles.flowNodeMediaImage} onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            <span className={styles.flowNodeMediaType}>{data.mediaType || 'image'}</span>
        </div>
    );
}

// ── Reorderable section wrapper for canvas nodes ───────────────────────────────
function NodeSectionReorder({ sectionId, sectionOrder, nodeId, children }) {
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);
    const index = sectionOrder.indexOf(sectionId);

    const handleReorder = (newOrder) => {
        updateNodeDataLive(nodeId, { sectionOrder: newOrder });
    };

    const handleMove = (dir) => {
        const newIndex = index + dir;
        if (newIndex < 0 || newIndex >= sectionOrder.length) return;
        const reordered = [...sectionOrder];
        [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
        handleReorder(reordered);
    };

    // Block ReactFlow from receiving mousedown on the drag bar so card doesn't move
    const handleBarMouseDown = (e) => {
        e.stopPropagation();
    };

    return (
        <div className={styles.flowNodeSectionWrapper}>
            <div className={styles.flowNodeSectionDragBar} onMouseDown={handleBarMouseDown}>
                <span className={styles.flowNodeSectionDragLabel}>
                    <GripVertical size={10} />
                </span>
                <div className={styles.flowNodeSectionDragBtns}>
                    <button
                        type="button"
                        className={styles.flowNodeSectionReorderBtn}
                        onClick={(e) => { e.stopPropagation(); handleMove(-1); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={index === 0}
                        title="Move section up"
                    >
                        <ChevronUp size={12} />
                    </button>
                    <button
                        type="button"
                        className={styles.flowNodeSectionReorderBtn}
                        onClick={(e) => { e.stopPropagation(); handleMove(1); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={index === sectionOrder.length - 1}
                        title="Move section down"
                    >
                        <ChevronDown size={12} />
                    </button>
                </div>
            </div>
            {children}
        </div>
    );
}

const SendQuestionNode = ({ id, selected, data }) => {
    const color = colorMap.send_question;
    const safeData = data || {};
    const buttons = safeData.buttons || [];
    const buttonType = safeData.buttonType || 'quick_reply';
    const sectionOrder = getSectionOrder(safeData, DEFAULT_SECTION_ORDER_SEND_QUESTION);
    const warnings = validateSendQuestion(safeData);
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    const handleButtonLabelChange = (btnId, newLabel) => {
        const updated = buttons.map((b) => b.id === btnId ? { ...b, label: newLabel } : b);
        updateNodeDataLive(id, { buttons: updated });
    };

    const renderSection = (sectionId) => {
        switch (sectionId) {
            case 'text':
                return (
                    <NodeSectionReorder key="text" sectionId="text" sectionOrder={sectionOrder} nodeId={id}>
                        <div className={styles.flowNodeMessage}>
                            <InlineEditable
                                value={safeData.text}
                                onSave={(val) => updateNodeDataLive(id, { text: val })}
                                placeholder="No question text configured..."
                                multiline
                                className={styles.flowNodeMessageText}
                            />
                        </div>
                    </NodeSectionReorder>
                );
            case 'media':
                return safeData.mediaUrl ? (
                    <NodeSectionReorder key="media" sectionId="media" sectionOrder={sectionOrder} nodeId={id}>
                        {renderMedia(safeData)}
                    </NodeSectionReorder>
                ) : null;
            case 'buttons':
                return (
                    <NodeSectionReorder key="buttons" sectionId="buttons" sectionOrder={sectionOrder} nodeId={id}>
                        <div className={styles.flowNodeSection}>
                            <div className={styles.flowNodeSectionLabel}>
                                {buttonType === 'list' ? (
                                    <span className={styles.flowNodeBadge} style={{ background: `${color}15`, color }}>
                                        <List size={9} /> List Options
                                    </span>
                                ) : buttonType === 'cta_url' ? (
                                    <span className={styles.flowNodeBadge} style={{ background: `${color}15`, color }}>
                                        <ExternalLink size={9} /> CTA URL
                                    </span>
                                ) : (
                                    <span className={styles.flowNodeBadge} style={{ background: `${color}15`, color }}>
                                        <MessageCircle size={9} /> Quick Reply
                                    </span>
                                )}
                                <span style={{ marginLeft: 'auto' }}>{buttons.length} / {buttonType === 'list' ? 10 : buttonType === 'cta_url' ? 1 : 3}</span>
                            </div>
                            {buttons.length === 0 ? (
                                <div className={styles.flowNodeEmpty}>No response buttons configured...</div>
                            ) : (
                                <div className={styles.flowNodeOutputList}>
                                    {buttons.map((btn) => (
                                        <div key={btn.id} className={styles.flowNodeOutputItem}>
                                            <div className={styles.flowNodeOutputContent}>
                                                <InlineEditable
                                                    value={btn.label}
                                                    onSave={(val) => handleButtonLabelChange(btn.id, val)}
                                                    placeholder="Button label"
                                                    maxLength={buttonType === 'list' ? 24 : 20}
                                                    className={styles.flowNodeOutputLabel}
                                                />
                                                {btn.description && <span className={styles.flowNodeOutputDesc}>{btn.description}</span>}
                                                {buttonType === 'cta_url' && (btn.ctaUrl || btn.url) && (
                                                    <span className={styles.flowNodeOutputDesc} style={{ wordBreak: 'break-all' }}>{btn.ctaUrl || btn.url}</span>
                                                )}
                                            </div>
                                            {buttonType !== 'cta_url' && (
                                                <Handle type="source" position={Position.Right} id={btn.id} className={styles.flowNodeHandleMini} style={{ background: color, top: '50%' }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </NodeSectionReorder>
                );
            case 'fallback':
                return (
                    <NodeSectionReorder key="fallback" sectionId="fallback" sectionOrder={sectionOrder} nodeId={id}>
                        <div className={styles.flowNodeSection}>
                            <div className={styles.flowNodeSectionLabel}>Fallback Branches:</div>
                            <div className={`${styles.flowNodeFallbackItem} ${styles.flowNodeFallbackTimeout}`}>
                                <span>⏳ No Input Timeout ({safeData.timeoutMinutes || 30}m)</span>
                                <Handle type="source" position={Position.Right} id="no_input" className={styles.flowNodeHandleMini} style={{ background: '#f59e0b', top: '50%' }} />
                            </div>
                            <div className={`${styles.flowNodeFallbackItem} ${styles.flowNodeFallbackNoMatch}`}>
                                <span>❌ No Match Exception</span>
                                <Handle type="source" position={Position.Right} id="no_match" className={styles.flowNodeHandleMini} style={{ background: '#a855f7', top: '50%' }} />
                            </div>
                        </div>
                    </NodeSectionReorder>
                );
            default:
                return null;
        }
    };

    return (
        <NodeWrapper id={id} type="send_question" selected={selected} title={safeData.label || 'Ask Question'} icon={iconMap.send_question} warnings={warnings}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />
            {sectionOrder.map((sectionId) => renderSection(sectionId))}
        </NodeWrapper>
    );
};

const SendMessageNode = ({ id, selected, data }) => {
    const color = colorMap.send_message;
    const safeData = data || {};
    const sectionOrder = getSectionOrder(safeData, DEFAULT_SECTION_ORDER_SEND_MESSAGE);
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    const renderSection = (sectionId) => {
        switch (sectionId) {
            case 'text':
                return (
                    <NodeSectionReorder key="text" sectionId="text" sectionOrder={sectionOrder} nodeId={id}>
                        <div className={styles.flowNodeMessage}>
                            <InlineEditable
                                value={safeData.text}
                                onSave={(val) => updateNodeDataLive(id, { text: val })}
                                placeholder="No message text configured..."
                                multiline
                                className={styles.flowNodeMessageText}
                            />
                        </div>
                    </NodeSectionReorder>
                );
            case 'media':
                return safeData.mediaUrl ? (
                    <NodeSectionReorder key="media" sectionId="media" sectionOrder={sectionOrder} nodeId={id}>
                        {renderMedia(safeData)}
                    </NodeSectionReorder>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <NodeWrapper id={id} type="send_message" selected={selected} title={safeData.label || 'Send Message'} icon={iconMap.send_message}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />
            {sectionOrder.map((sectionId) => renderSection(sectionId))}
            <Handle type="source" position={Position.Right} id="output" className={styles.flowNodeHandle} style={{ background: color, top: '50%' }} />
        </NodeWrapper>
    );
};

const ConditionNode = ({ id, selected, data }) => {
    const color = colorMap.condition;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="condition" selected={selected} title={safeData.label || 'Decision Check'} icon={iconMap.condition}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeConditionBox}>
                <div className={styles.flowNodeConditionLabel}>Evaluated Value:</div>
                <div className={styles.flowNodeConditionValue}>
                    <InlineEditable
                        value={safeData.variable}
                        onSave={(val) => updateNodeDataLive(id, { variable: val })}
                        placeholder="(not configured)"
                        className={styles.flowNodeConditionValue}
                    />
                </div>
                <div className={styles.flowNodeConditionOperator}>
                    {safeData.operator ? safeData.operator.replace(/_/g, ' ') : 'equals'} <strong>"<InlineEditable
                        value={safeData.value}
                        onSave={(val) => updateNodeDataLive(id, { value: val })}
                        placeholder=""
                        className={styles.inlineEditInline}
                    />"</strong>
                </div>
            </div>

            <div className={styles.flowNodeOutputList}>
                <div className={`${styles.flowNodeOutputItem} ${styles.flowNodeOutputTrue}`}>
                    <span>True</span>
                    <Handle type="source" position={Position.Right} id="true" className={styles.flowNodeHandleMini} style={{ background: '#10b981', top: '50%' }} />
                </div>
                <div className={`${styles.flowNodeOutputItem} ${styles.flowNodeOutputFalse}`}>
                    <span>False</span>
                    <Handle type="source" position={Position.Right} id="false" className={styles.flowNodeHandleMini} style={{ background: '#ef4444', top: '50%' }} />
                </div>
            </div>
        </NodeWrapper>
    );
};

const DelayNode = ({ id, selected, data }) => {
    const color = colorMap.delay;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="delay" selected={selected} title={safeData.label || 'Wait Duration'} icon={iconMap.delay}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeDelayBox}>
                <Clock size={20} className={styles.flowNodeDelayIcon} />
                <div>
                    <InlineEditable
                        value={String(safeData.duration || 5)}
                        onSave={(val) => updateNodeDataLive(id, { duration: parseInt(val) || 0 })}
                        placeholder="5"
                        className={styles.flowNodeDelayValue}
                    />
                    <span className={styles.flowNodeDelayUnit}>{safeData.unit || 'minutes'}</span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} id="output" className={styles.flowNodeHandle} style={{ background: color, top: '50%' }} />
        </NodeWrapper>
    );
};

const GotoNode = ({ id, selected, data }) => {
    const color = colorMap.goto;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="goto" selected={selected} title={safeData.label || 'Jump To Node'} icon={iconMap.goto}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeGotoBox}>
                <div className={styles.flowNodeGotoLabel}>Redirect Destination:</div>
                <div className={styles.flowNodeGotoValue}>
                    <ArrowRight size={14} />
                    <span>{safeData.targetNodeLabel || '(no node selected)'}</span>
                </div>
            </div>
        </NodeWrapper>
    );
};

const SetVariableNode = ({ id, selected, data }) => {
    const color = colorMap.set_variable;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="set_variable" selected={selected} title={safeData.label || 'Record Variable'} icon={iconMap.set_variable}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeVariableBox}>
                <div className={styles.flowNodeVariableRow}>
                    <span className={styles.flowNodeVariableLabel}>KEY NAME:</span>
                    <span className={styles.flowNodeVariableValue}><InlineEditable
                        value={safeData.key}
                        onSave={(val) => updateNodeDataLive(id, { key: val })}
                        placeholder="(unset)"
                        className={styles.flowNodeVariableValue}
                    /></span>
                </div>
                <div className={styles.flowNodeVariableRow}>
                    <span className={styles.flowNodeVariableLabel}>Source Value:</span>
                    <span className={styles.flowNodeVariableValue}>
                        {safeData.valueSource === 'fixed' ? (<><InlineEditable
                            value={safeData.fixedValue}
                            onSave={(val) => updateNodeDataLive(id, { fixedValue: val })}
                            placeholder=""
                            className={styles.inlineEditInline}
                        /></>) : 'last customer response'}
                    </span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} id="output" className={styles.flowNodeHandle} style={{ background: color, top: '50%' }} />
        </NodeWrapper>
    );
};

const APICallNode = ({ id, selected, data }) => {
    const color = colorMap.api_call;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="api_call" selected={selected} title={safeData.label || 'Service Call'} icon={iconMap.api_call}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeApiHeader}>
                <span className={styles.flowNodeApiMethod}>{safeData.method || 'GET'}</span>
                <span className={styles.flowNodeApiUrl}><InlineEditable
                    value={safeData.url}
                    onSave={(val) => updateNodeDataLive(id, { url: val })}
                    placeholder="Configure URL"
                    className={styles.flowNodeApiUrl}
                /></span>
            </div>

            <div className={styles.flowNodeApiResponse}>
                <span>Save Response To:</span>
                <span>{safeData.responseVariable || 'data_reply'}</span>
            </div>

            <div className={styles.flowNodeOutputList}>
                <div className={`${styles.flowNodeOutputItem} ${styles.flowNodeOutputSuccess}`}>
                    <span>Success</span>
                    <Handle type="source" position={Position.Right} id="success" className={styles.flowNodeHandleMini} style={{ background: '#10b981', top: '50%' }} />
                </div>
                <div className={`${styles.flowNodeOutputItem} ${styles.flowNodeOutputError}`}>
                    <span>Error</span>
                    <Handle type="source" position={Position.Right} id="error" className={styles.flowNodeHandleMini} style={{ background: '#ef4444', top: '50%' }} />
                </div>
            </div>
        </NodeWrapper>
    );
};

const HumanHandoffNode = ({ id, selected, data }) => {
    const color = colorMap.human_handoff;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="human_handoff" selected={selected} title={safeData.label || 'Human Agent'} icon={iconMap.human_handoff}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeHandoffBox}>
                <UserCheck size={28} className={styles.flowNodeHandoffIcon} />
                <div className={styles.flowNodeHandoffTitle}>Active Handoff Loop</div>
                <div className={styles.flowNodeHandoffMessage}>
                    <InlineEditable
                        value={safeData.message}
                        onSave={(val) => updateNodeDataLive(id, { message: val })}
                        placeholder="Connecting loop with high priority..."
                        multiline
                        className={styles.flowNodeHandoffMessage}
                    />
                </div>
            </div>
        </NodeWrapper>
    );
};

const EndFlowNode = ({ id, selected, data }) => {
    const color = colorMap.end_flow;
    const safeData = data || {};
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="end_flow" selected={selected} title={safeData.label || 'End Sequence'} icon={iconMap.end_flow}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeEndBox}>
                <div className={styles.flowNodeEndLabel}>Session Terminated</div>
                <p><InlineEditable
                    value={safeData.message}
                    onSave={(val) => updateNodeDataLive(id, { message: val })}
                    placeholder="Thank you! Goodbye."
                    multiline
                    className={styles.flowNodeEndText}
                /></p>
            </div>
        </NodeWrapper>
    );
};

const WhatsAppFlowNode = ({ id, selected, data }) => {
    const color = colorMap.whatsapp_flow;
    const safeData = data || {};
    const fields = safeData.fields || [];
    const updateNodeDataLive = useFlowStore((state) => state.updateNodeDataLive);

    return (
        <NodeWrapper id={id} type="whatsapp_flow" selected={selected} title={safeData.label || 'Meta WhatsApp Flow'} icon={iconMap.whatsapp_flow}
            onTitleChange={(val) => updateNodeDataLive(id, { label: val })}>
            <Handle type="target" position={Position.Left} id="input" className={styles.flowNodeHandleTarget} style={{ background: color, top: '50%' }} />

            <div className={styles.flowNodeWaBanner}>
                <div className={styles.flowNodeWaBannerTitle}>
                    <Smartphone size={14} />
                    Meta Verified Flow Interactive Screen
                </div>
                <div className={styles.flowNodeWaBannerMeta}>ID: <strong>{safeData.flowId || 'flow_unnamed'}</strong></div>
                <div className={styles.flowNodeWaBannerMeta}>Active Screen: <strong>{safeData.screenId || 'SCREEN_START'}</strong></div>
            </div>

            <div className={styles.flowNodeWaFields}>
                <div className={styles.flowNodeSectionLabel}>Form Fields Inside Screen ({fields.length}):</div>
                {fields.length === 0 ? (
                    <div className={styles.flowNodeEmpty}>No inputs or selections defined yet...</div>
                ) : (
                    <div className={styles.flowNodeWaFieldList}>
                        {fields.map((field, i) => (
                            <div key={field.id || i} className={styles.flowNodeWaField}>
                                <div className={styles.flowNodeWaFieldHeader}>
                                    <span>{field.label || `Field ${i + 1}`}</span>
                                    <span className={styles.flowNodeWaFieldType}>{field.type}</span>
                                </div>
                                {field.placeholder && <div className={styles.flowNodeWaFieldPlaceholder}>"{field.placeholder}"</div>}
                                {field.options && field.options.length > 0 && (
                                    <div className={styles.flowNodeWaFieldOptions}>
                                        {field.options.map((opt, idx) => (
                                            <span key={idx} className={styles.flowNodeWaFieldOption}>{opt.label}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.flowNodeWaSubmit}>
                <div className={styles.flowNodeWaSubmitLabel}>Meta Form Action</div>
                <div className={styles.flowNodeWaSubmitText}>Submitted (Saves to Variables)</div>
                <Handle type="source" position={Position.Right} id="submitted" className={styles.flowNodeHandleMini} style={{ background: color, top: '50%' }} />
            </div>
        </NodeWrapper>
    );
};

export const customNodeTypes = {
    keyword_trigger: memo((props) => <KeywordTriggerNode {...props} />),
    send_question: memo((props) => <SendQuestionNode {...props} />),
    send_message: memo((props) => <SendMessageNode {...props} />),
    condition: memo((props) => <ConditionNode {...props} />),
    delay: memo((props) => <DelayNode {...props} />),
    goto: memo((props) => <GotoNode {...props} />),
    set_variable: memo((props) => <SetVariableNode {...props} />),
    api_call: memo((props) => <APICallNode {...props} />),
    human_handoff: memo((props) => <HumanHandoffNode {...props} />),
    end_flow: memo((props) => <EndFlowNode {...props} />),
    whatsapp_flow: memo((props) => <WhatsAppFlowNode {...props} />),
};

export const nodeTypeList = [
    { type: 'keyword_trigger', label: 'Trigger', icon: <Zap size={16} />, color: '#1daa61' },
    { type: 'send_question', label: 'Question', icon: <HelpCircle size={16} />, color: '#ff2d55' },
    { type: 'send_message', label: 'Message', icon: <MessageSquare size={16} />, color: '#25D366' },
    { type: 'condition', label: 'Condition', icon: <GitBranch size={16} />, color: '#f57c00' },
    { type: 'delay', label: 'Delay', icon: <Clock size={16} />, color: '#00CFE8' },
    { type: 'goto', label: 'Go To', icon: <ArrowRight size={16} />, color: '#6366f1' },
    { type: 'set_variable', label: 'Set Variable', icon: <Variable size={16} />, color: '#a855f7' },
    { type: 'api_call', label: 'API Call', icon: <Globe size={16} />, color: '#3b82f6' },
    { type: 'human_handoff', label: 'Handoff', icon: <UserCheck size={16} />, color: '#ec4899' },
    { type: 'end_flow', label: 'End Flow', icon: <CheckCircle2 size={16} />, color: '#64748b' },
    { type: 'whatsapp_flow', label: 'WA Flow', icon: <Smartphone size={16} />, color: '#075E54' },
];

export function getDefaultNodeData(type) {
    const timestamp = Date.now();
    switch (type) {
        case 'keyword_trigger':
            return { label: 'Message Trigger', keywords: ['hi'], matchMode: 'contains' };
        case 'send_question':
            return {
                label: 'Select Option Path',
                text: 'Hi there! Please select an option:',
                buttonType: 'quick_reply',
                buttons: [
                    { id: `btn_${timestamp}_1`, label: 'Option 1' },
                    { id: `btn_${timestamp}_2`, label: 'Option 2' },
                ],
                timeoutMinutes: 30,
            };
        case 'send_message':
            return { label: 'Send Text', text: 'Thanks for chatting with us today!' };
        case 'send_message_image':
            return {
                label: 'Image Card',
                text: '',
                mediaUrl: '',
                mediaType: 'image',
                mediaFileName: '',
            };
        case 'send_question_image':
            return {
                label: 'Image with Options',
                text: 'Choose an option below:',
                mediaUrl: '',
                mediaType: 'image',
                mediaFileName: '',
                buttonType: 'quick_reply',
                buttons: [
                    { id: `btn_${timestamp}_1`, label: 'Option 1' },
                    { id: `btn_${timestamp}_2`, label: 'Option 2' },
                ],
                timeoutMinutes: 30,
            };
        case 'condition':
            return { label: 'Branch Condition', variable: 'user.city', operator: 'equals', value: 'Surat' };
        case 'delay':
            return { label: 'Wait Delay', duration: 5, unit: 'minutes' };
        case 'goto':
            return { label: 'Redirect', targetFlowId: '', targetNodeId: '', targetNodeLabel: 'Select target node' };
        case 'set_variable':
            return { label: 'Set Variable', key: 'user.tier', valueSource: 'fixed', fixedValue: 'Gold VIP' };
        case 'api_call':
            return {
                label: 'API Call',
                url: 'https://api.example.com/v1/track',
                method: 'POST',
                headers: [{ key: 'Content-Type', value: 'application/json' }],
                body: '{\n  "key": "value"\n}',
                responseVariable: 'api_result',
            };
        case 'human_handoff':
            return { label: 'Handoff to Agent', message: 'Escalating this chat to a support agent now.' };
        case 'end_flow':
            return { label: 'End Flow', message: 'Conversation closed. Come back any time!' };
        case 'whatsapp_flow':
            return {
                label: 'WhatsApp Flow',
                flowId: 'flow_checkout',
                screenId: 'SCREEN_SELECT',
                ctaText: 'Choose Option',
                submitButtonText: 'Confirm',
            };
        default:
            return { label: `${type} node` };
    }
}
