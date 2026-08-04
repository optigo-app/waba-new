'use client';

import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { IconButton, Tooltip } from '@mui/material';
import { PanelLeftOpen } from 'lucide-react';
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
    const setShowNodePalette = useFlowStore((state) => state.setShowNodePalette);

    return (
        <div className={styles.flowBuilder}>
            <Toolbar />
            <div className={styles.flowBuilderBody}>
                {showNodePalette && <NodePalette />}
                {!showNodePalette && (
                    <Tooltip title="Show node panel" arrow>
                        <IconButton
                            onClick={() => setShowNodePalette(true)}
                            className={styles.sidebarReopenBtn}
                            size="small"
                        >
                            <PanelLeftOpen size={18} />
                        </IconButton>
                    </Tooltip>
                )}
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
