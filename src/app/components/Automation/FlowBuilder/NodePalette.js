'use client';

import React from 'react';
import { Typography, IconButton } from '@mui/material';
import {
    Zap,
    MessageSquare,
    HelpCircle,
    GitBranch,
    Clock,
    ArrowRight,
    Database,
    Globe,
    UserCheck,
    CheckCircle2,
    ListPlus,
    Smartphone,
    Image,
    ImagePlus,
    PanelLeftClose,
} from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import { getDefaultNodeData } from './CustomNodes';
import styles from './FlowBuilder.module.scss';

const categories = [
    {
        title: 'Incoming Events',
        items: [
            { type: 'keyword_trigger', label: 'Keyword Trigger', description: 'Triggers flow on incoming keywords', icon: Zap, color: '#1daa61' },
        ],
    },
    {
        title: 'Interactive Replies',
        items: [
            { type: 'send_question', label: 'Send Question', description: 'Ask choice with custom buttons', icon: HelpCircle, color: '#25D366' },
            { type: 'send_message', label: 'Send Message', description: 'Send simple text or media', icon: MessageSquare, color: '#25D366' },
            { type: 'whatsapp_flow', label: 'Meta WhatsApp Flow', description: 'Validated form screen in WhatsApp', icon: Smartphone, color: '#075E54' },
        ],
    },
    {
        title: 'Media Templates',
        items: [
            { type: 'send_message_image', label: 'Image Card', description: 'Send image-only card (no buttons)', icon: Image, color: '#8b5cf6', nodeType: 'send_message' },
            { type: 'send_question_image', label: 'Image with Options', description: 'Image card with quick reply buttons', icon: ImagePlus, color: '#8b5cf6', nodeType: 'send_question' },
        ],
    },
    {
        title: 'Router & Storage',
        items: [
            { type: 'condition', label: 'Condition', description: 'Evaluate if-else branches', icon: GitBranch, color: '#f57c00' },
            { type: 'set_variable', label: 'Set Variable', description: 'Record custom user variables', icon: Database, color: '#a855f7' },
        ],
    },
    {
        title: 'Workflow Helpers',
        items: [
            { type: 'delay', label: 'Wait / Delay', description: 'Suspend action for durations', icon: Clock, color: '#00CFE8' },
            { type: 'goto', label: 'Goto Node', description: 'Redirect flow to any node', icon: ArrowRight, color: '#6366f1' },
            { type: 'api_call', label: 'Service API Call', description: 'Request external JSON APIs', icon: Globe, color: '#3b82f6' },
        ],
    },
    {
        title: 'Customer Exit',
        items: [
            { type: 'human_handoff', label: 'Human Handoff', description: 'Escalate chat to agent desk', icon: UserCheck, color: '#ec4899' },
            { type: 'end_flow', label: 'End Flow', description: 'Close chatbot session', icon: CheckCircle2, color: '#64748b' },
        ],
    },
];

const NodePalette = () => {
    const addNode = useFlowStore((state) => state.addNode);
    const selectNode = useFlowStore((state) => state.selectNode);
    const showNodePalette = useFlowStore((state) => state.showNodePalette);
    const setShowNodePalette = useFlowStore((state) => state.setShowNodePalette);

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData('application/reactflow-node-type', item.nodeType || item.type);
        e.dataTransfer.setData('application/reactflow-template-type', item.type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleQuickAdd = (item) => {
        const type = item.type;
        const actualNodeType = item.nodeType || type;
        const newNode = {
            id: `n-${type}-${Date.now()}`,
            type: actualNodeType,
            position: { x: 200 + Math.random() * 100, y: 150 + Math.random() * 100 },
            data: getDefaultNodeData(type),
        };
        addNode(newNode);
        selectNode(newNode.id);
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div className={styles.sidebarTitleRow}>
                    <ListPlus size={16} className={styles.sidebarTitleIcon} />
                    <Typography component="h3" className={styles.sidebarTitle}>
                        Interactive Nodes
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setShowNodePalette(false)}
                        className={styles.sidebarCloseBtn}
                        title="Hide node panel"
                    >
                        <PanelLeftClose size={16} />
                    </IconButton>
                </div>
                <Typography component="p" className={styles.sidebarHint}>
                    Drag any element below, then drop it on the canvas to expand your chatbot flow.
                </Typography>
            </div>

            <div className={styles.sidebarSeparator} />

            <div className={styles.nodeList}>
                {categories.map((cat, catIndex) => (
                    <div key={catIndex} className={styles.nodeCategory}>
                        <div className={styles.nodeCategoryTitle}>{cat.title}</div>
                        <div className={styles.nodeCategoryItems}>
                            {cat.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.type}
                                        className={styles.nodeItem}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        onClick={() => handleQuickAdd(item)}
                                    >
                                        <div
                                            className={styles.nodeItemIcon}
                                            style={{ background: `${item.color}15`, color: item.color }}
                                        >
                                            <Icon size={16} />
                                        </div>
                                        <div className={styles.nodeItemContent}>
                                            <div className={styles.nodeItemLabel}>{item.label}</div>
                                            <div className={styles.nodeItemDesc}>{item.description}</div>
                                        </div>
                                        <span className={styles.nodeItemDrag}>DRAG</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.sidebarTip}>
                <span className={styles.sidebarTipText}>
                    Connect handles to map user buttons to triggers.
                </span>
            </div>
        </div>
    );
};

export default NodePalette;
