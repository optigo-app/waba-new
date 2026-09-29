'use client';

import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './FlowBuilder.module.scss';
import Toolbar from './Toolbar';
import NodePalette from './NodePalette';
import Canvas from './Canvas';
import SettingsPanel from './SettingsPanel';
import SimulatorDrawer from './SimulatorDrawer';
import AiChatPanel from './AiChatPanel';
import { useFlowStore } from '../../../store/flowStore';

const FlowBuilderInner = () => {
    const showNodePalette = useFlowStore((state) => state.showNodePalette);

    return (
        <div className={styles.flowBuilder}>
            <Toolbar />
            <div className={styles.flowBuilderBody}>
                {showNodePalette && <NodePalette />}
                <Canvas />
                <SettingsPanel />
                <SimulatorDrawer />
                <AiChatPanel />
            </div>
        </div>
    );
};

const FlowBuilder = () => {
    return (
        <ReactFlowProvider>
            <FlowBuilderInner />
        </ReactFlowProvider>
    );
};

export default FlowBuilder;
