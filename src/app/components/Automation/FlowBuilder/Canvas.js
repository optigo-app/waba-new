'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { Sparkles } from 'lucide-react';
import { useFlowStore } from '../../../store/flowStore';
import { customNodeTypes, getDefaultNodeData } from './CustomNodes';
import styles from './FlowBuilder.module.scss';

const edgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: { strokeWidth: 2, stroke: 'var(--primary-main)' },
};

const Canvas = () => {
    const reactFlowWrapper = useRef(null);

    const nodes = useFlowStore((state) => state.nodes);
    const edges = useFlowStore((state) => state.edges);
    const onNodesChange = useFlowStore((state) => state.onNodesChange);
    const onEdgesChange = useFlowStore((state) => state.onEdgesChange);
    const onConnect = useFlowStore((state) => state.onConnect);
    const selectNode = useFlowStore((state) => state.selectNode);
    const addNode = useFlowStore((state) => state.addNode);
    const undo = useFlowStore((state) => state.undo);
    const redo = useFlowStore((state) => state.redo);
    const setShowAiModal = useFlowStore((state) => state.setShowAiModal);
    const showAiModal = useFlowStore((state) => state.showAiModal);

    const { screenToFlowPosition } = useReactFlow();

    useEffect(() => {
        const handleKeyDown = (e) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            if (!isCtrlOrCmd) return;

            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('application/reactflow-node-type');
            const templateType = e.dataTransfer.getData('application/reactflow-template-type') || type;
            if (!type) return;

            const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            const newNode = {
                id: `n-${templateType}-${Date.now()}`,
                type,
                position,
                data: getDefaultNodeData(templateType),
            };

            addNode(newNode);
            selectNode(newNode.id);
        },
        [screenToFlowPosition, addNode, selectNode]
    );

    const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_FLOW === 'true';

    const onPaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const onNodeClick = useCallback((e, node) => {
        selectNode(node.id);
    }, [selectNode]);

    const miniMapNodeColor = useCallback((n) => {
        const colors = {
            keyword_trigger: 'var(--primary-main)',
            send_question: 'var(--success-main)',
            send_message: 'var(--success-main)',
            condition: 'var(--warning-main)',
            delay: 'var(--info-main)',
            goto: '#6366f1',
            set_variable: '#a855f7',
            api_call: '#3b82f6',
            human_handoff: '#ec4899',
            end_flow: 'var(--text-tertiary)',
            whatsapp_flow: '#075E54',
        };
        return colors[n.type] || 'var(--text-placeholder)';
    }, []);

    return (
        <div ref={reactFlowWrapper} className={styles.canvas}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={customNodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                defaultEdgeOptions={edgeOptions}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onPaneClick={onPaneClick}
                onNodeClick={onNodeClick}
                fitView
                className={styles.reactFlow}
            >
                <Background color="var(--border-strong)" gap={22} size={1.5} />
                <Controls />
                <MiniMap
                    zoomable
                    pannable
                    nodeColor={miniMapNodeColor}
                    maskColor="rgba(0, 0, 0, 0.05)"
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                />
            </ReactFlow>

            {aiEnabled && !showAiModal && (
                <button
                    className="aiFloatingBtn"
                    onClick={() => setShowAiModal(true)}
                    title="Generate flow with AI"
                >
                    <span className="aiFloatingBtnShimmer" />
                    <Sparkles size={22} />
                </button>
            )}
        </div>
    );
};

export default Canvas;
