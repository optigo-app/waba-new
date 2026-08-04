'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Button, IconButton, InputAdornment, TextField, Modal, Chip } from '@mui/material';
import {
    Zap,
    Plus,
    Smartphone,
    Trash2,
    PenSquare,
    Workflow,
    Search,
    Sparkles,
    Upload,
    Hash,
    Eye,
} from 'lucide-react';
import styles from './Automation.module.scss';
import { useFlowStore } from '../../store/flowStore';
import FlowBuilder from './FlowBuilder/FlowBuilder';
import AutomationSkelton from './AutomationSkelton';

const formatFlowDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Automation = () => {
    const view = useFlowStore((state) => state.view);
    const flowsList = useFlowStore((state) => state.flowsList);
    const createNewFlow = useFlowStore((state) => state.createNewFlow);
    const importFlow = useFlowStore((state) => state.importFlow);
    const loadFlow = useFlowStore((state) => state.loadFlow);
    const deleteFlow = useFlowStore((state) => state.deleteFlow);
    const setShowAiModal = useFlowStore((state) => state.setShowAiModal);
    const loadFlowsFromBackend = useFlowStore((state) => state.loadFlowsFromBackend);
    const isLoadingFlows = useFlowStore((state) => state.isLoadingFlows);
    const hasDraft = useFlowStore((state) => state.hasDraft);
    const restoreDraft = useFlowStore((state) => state.restoreDraft);
    const discardDraft = useFlowStore((state) => state.discardDraft);

    const [searchTerm, setSearchTerm] = useState('');
    const [importError, setImportError] = useState('');
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadFlowsFromBackend();
        if (hasDraft()) {
            setShowDraftPrompt(true);
        }
    }, [loadFlowsFromBackend, hasDraft]);

    const handleRestoreDraft = () => {
        restoreDraft();
        setShowDraftPrompt(false);
    };

    const handleDiscardDraft = () => {
        discardDraft();
        setShowDraftPrompt(false);
    };

    const filteredFlows = useMemo(() => {
        if (!searchTerm.trim()) return flowsList;
        const q = searchTerm.trim().toLowerCase();
        return flowsList.filter(
            (flow) =>
                flow.name.toLowerCase().includes(q) ||
                flow.description.toLowerCase().includes(q) ||
                flow.triggerKeyword.toLowerCase().includes(q)
        );
    }, [flowsList, searchTerm]);

    const handleAddAutomation = () => {
        createNewFlow();
    };

    const handleImportClick = () => {
        setImportError('');
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setImportError('Please select a .json file.');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
                    setImportError('Invalid flow JSON — missing "nodes" array.');
                    return;
                }
                importFlow(parsed);
            } catch (err) {
                setImportError('Failed to parse JSON: ' + err.message);
            }
        };
        reader.onerror = () => setImportError('Failed to read file.');
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleAiGenerateClick = () => {
        createNewFlow();
        setShowAiModal(true);
    };

    const handleEditFlow = (flowId) => {
        loadFlow(flowId);
    };

    const handleDeleteFlow = (flowId, e) => {
        e.stopPropagation();
        deleteFlow(flowId);
    };

    if (view === 'builder') {
        return <FlowBuilder />;
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <div className={styles.headerIconWrap}>
                        <Zap size={18} />
                    </div>
                    <div>
                        <h2 className={styles.pageTitle}>Auto Reply</h2>
                        <p className={styles.pageSubtitle}>Create and manage automated workflows for your conversations</p>
                    </div>
                </div>
                <div className={styles.topActions}>
                    {process.env.NEXT_PUBLIC_ENABLE_AI_FLOW === 'true' && (
                        <button
                            className="aiGenerateBtn"
                            onClick={handleAiGenerateClick}
                        >
                            <span className="aiGenerateBtnShimmer" />
                            <span className="aiGenerateBtnContent">
                                <Sparkles size={16} />
                                <span>AI Generate</span>
                            </span>
                        </button>
                    )}
                    <Button
                        variant="outlined"
                        className={styles.importBtn}
                        startIcon={<Upload size={16} />}
                        onClick={handleImportClick}
                    >
                        Import JSON
                    </Button>
                    <Button
                        variant="contained"
                        className="buttonClassname"
                        startIcon={<Plus size={16} />}
                        onClick={handleAddAutomation}
                    >
                        Add Automation
                    </Button>
                </div>
            </div>

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* Import error toast */}
            {importError && (
                <div className={styles.importErrorToast}>
                    {importError}
                    <button onClick={() => setImportError('')} className={styles.importErrorClose}>×
                    </button>
                </div>
            )}

            {/* Draft restore prompt */}
            <Modal open={showDraftPrompt} onClose={() => setShowDraftPrompt(false)}>
                <div className={styles.draftModal}>
                    <div className={styles.draftModalHeader}>
                        <span className={styles.draftModalTitle}>Unsaved Draft Found</span>
                    </div>
                    <div className={styles.draftModalBody}>
                        <p className={styles.draftModalText}>
                            You have an unsaved flow from a previous session. Would you like to restore it?
                        </p>
                        <div className={styles.draftModalActions}>
                            <Button
                                variant="outlined"
                                onClick={handleDiscardDraft}
                                className={styles.draftModalDiscardBtn}
                            >
                                Discard
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleRestoreDraft}
                                className="buttonClassname"
                            >
                                Restore Draft
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Content */}
            <div className={styles.contentArea}>
                {/* Compact Info Banner */}
                <Box className={styles.infoBanner}>
                    <Box className={styles.infoBanner__deco}>
                        <Smartphone size={180} />
                    </Box>
                    <Box className={styles.infoBanner__content}>
                        <Typography component="h2" className={styles.infoBanner__title}>
                            WhatsApp Chatbot Flows
                        </Typography>
                        <Typography component="p" className={styles.infoBanner__desc}>
                            Build visual chatbot trees with keyword triggers, variables, API calls & more.
                        </Typography>
                    </Box>
                </Box>

                {/* Search bar — only when flows exist */}
                {flowsList.length > 0 && (
                    <Box className={styles.searchBarRow}>
                        <TextField
                            size="small"
                            placeholder="Search automations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={16} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Box>
                )}

                {/* Flow List */}
                {isLoadingFlows ? (
                    <AutomationSkelton count={8} />
                ) : (
                <>
                <Box className={styles.automationGrid}>
                    {filteredFlows.map((flow) => {
                        const statusConfig = flow.isActive
                            ? { label: 'Active', color: '#1daa61', bg: 'rgba(29, 170, 97, 0.10)' }
                            : { label: 'Draft', color: '#6D6B77', bg: 'rgba(109, 107, 119, 0.10)' };

                        return (
                            <Card
                                key={flow.id}
                                onClick={() => handleEditFlow(flow.id)}
                                className={styles.automationCard}
                            >
                                <CardContent sx={{ p: '18px 20px 16px', flex: 1, '&:last-child': { pb: '16px' } }}>
                                    {/* Top Row: Name + Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                                        <Typography
                                            sx={{
                                                fontFamily: 'Poppins, sans-serif',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                lineHeight: 1.35,
                                                wordBreak: 'break-word',
                                                flex: 1,
                                            }}
                                        >
                                            {flow.name}
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                px: '8px',
                                                py: '3px',
                                                borderRadius: '20px',
                                                backgroundColor: statusConfig.bg,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: statusConfig.color }} />
                                            <Typography sx={{ fontWeight: 500, fontSize: '0.7rem', color: statusConfig.color, letterSpacing: '0.3px', lineHeight: 1 }}>
                                                {statusConfig.label}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Meta Chips */}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.75 }}>
                                        <Chip
                                            icon={<Hash size={10} />}
                                            label={flow.triggerKeyword}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                fontFamily: 'Poppins, sans-serif',
                                                height: 20,
                                                borderRadius: '4px',
                                                backgroundColor: 'rgba(29, 170, 97, 0.10)',
                                                color: '#1daa61',
                                                '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: 'inherit' },
                                            }}
                                        />
                                        <Chip
                                            icon={<Workflow size={10} />}
                                            label={`${flow.nodeCount} nodes`}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem',
                                                fontWeight: 500,
                                                fontFamily: 'Poppins, sans-serif',
                                                height: 20,
                                                borderRadius: '4px',
                                                backgroundColor: '#f4f5f7',
                                                color: '#8b8a94',
                                                '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: 'inherit' },
                                            }}
                                        />
                                    </Box>

                                    {/* Description / Body Preview */}
                                    {flow.description && (
                                        <Box sx={{ background: '#f8f9fb', borderRadius: '10px', p: '10px 12px', mb: 1.5 }}>
                                            <Typography
                                                sx={{
                                                    color: '#3d3b47',
                                                    fontSize: '0.85rem',
                                                    lineHeight: 1.6,
                                                    fontFamily: 'Poppins, sans-serif',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {flow.description}
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>

                                {/* Action Bar */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        px: '20px',
                                        pb: '14px',
                                        pt: 0,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: '#c5c8ce',
                                            fontSize: '0.68rem',
                                            fontFamily: 'Poppins, sans-serif',
                                            fontWeight: 500,
                                            letterSpacing: '0.3px',
                                        }}
                                    >
                                        {formatFlowDate(flow.updatedAt)}
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 0.2, alignItems: 'center' }}>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditFlow(flow.id);
                                            }}
                                            sx={{ color: '#6D6B77' }}
                                        >
                                            <Eye size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditFlow(flow.id);
                                            }}
                                            sx={{ color: '#7367f0' }}
                                        >
                                            <PenSquare size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleDeleteFlow(flow.id, e)}
                                            sx={{ color: '#d32f2f' }}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Box>
                                </Box>
                            </Card>
                        );
                    })}
                </Box>

                {filteredFlows.length === 0 && (
                    <Box className={styles.emptyState}>
                        <div className={styles.emptyStateIconWrap}>
                            <Zap size={40} className={styles.emptyStateIcon} />
                        </div>
                        <Typography component="h3" className={styles.emptyStateTitle}>
                            {searchTerm ? 'No automations found' : 'No automations yet'}
                        </Typography>
                        <Typography component="p" className={styles.emptyStateDesc}>
                            {searchTerm
                                ? 'Try adjusting your search term.'
                                : 'Create your first WhatsApp chatbot flow to get started.'}
                        </Typography>
                        {!searchTerm && (
                            <Button
                                variant="contained"
                                className="buttonClassname"
                                startIcon={<Plus size={16} />}
                                onClick={handleAddAutomation}
                                sx={{ mt: 1.5, borderRadius: '10px', textTransform: 'none' }}
                            >
                                Add Automation
                            </Button>
                        )}
                    </Box>
                )}
                </>
                )}
            </div>
        </div>
    );
};

export default Automation;
