'use client';

import React from 'react';
import { Typography, IconButton } from '@mui/material';
import {
    Zap,
    MessageSquare,
    HelpCircle,
    UserCheck,
    CheckCircle2,
    ListPlus,
    Image,
    ImagePlus,
    PanelLeft,
} from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import { getDefaultNodeData } from './CustomNodes';
import styles from './NodePalette.module.scss';

const categories = [
    {
        title: 'Start',
        items: [
            { type: 'keyword_trigger', label: 'Keyword Trigger', description: 'Start flow on incoming keywords', icon: Zap, color: '#1daa61' },
        ],
    },
    {
        title: 'Messages',
        items: [
            { type: 'send_message', label: 'Send Message', description: 'Send a simple text message', icon: MessageSquare, color: '#25D366' },
            { type: 'send_question', label: 'Send Question', description: 'Ask with quick reply buttons', icon: HelpCircle, color: '#ff2d55' },
            { type: 'send_message_image', label: 'Image Card', description: 'Send an image message', icon: Image, color: '#8b5cf6', nodeType: 'send_message' },
            { type: 'send_question_image', label: 'Image with Options', description: 'Image card with reply buttons', icon: ImagePlus, color: '#8b5cf6', nodeType: 'send_question' },
        ],
    },
    {
        title: 'Finish',
        items: [
            { type: 'human_handoff', label: 'Human Handoff', description: 'Pass chat to a live agent', icon: UserCheck, color: '#ec4899' },
            { type: 'end_flow', label: 'End Flow', description: 'Close the chatbot session', icon: CheckCircle2, color: '#64748b' },
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
                        Flow Blocks
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setShowNodePalette(false)}
                        className={styles.sidebarCloseBtn}
                        title="Hide node panel"
                    >
                        <PanelLeft size={16} />
                    </IconButton>
                </div>
                <Typography component="p" className={styles.sidebarHint}>
                    Drag a block onto the canvas — or click it to add instantly.
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
                    Link blocks by dragging between their handles.
                </span>
            </div>
        </div>
    );
};

export default NodePalette;
