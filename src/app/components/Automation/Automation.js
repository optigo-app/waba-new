'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Button, IconButton, Modal, Chip, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
    Zap,
    Plus,
    Trash2,
    Pencil,
    Workflow,
    Upload,
    Hash,
    Eye,
    LayoutGrid,
    Table,
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Automation.module.scss';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { useFlowStore } from '../../store/flowStore';
import { useWallet } from '../../contexts/WalletContext';
import FilterBar from '../Common/FilterBar/FilterBar';
import FlowBuilder from './FlowBuilder/FlowBuilder';
import AutomationSkelton from './AutomationSkelton';
import AutomationSetupDialog from './AutomationSetupDialog';

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
    const loadFlowsFromBackend = useFlowStore((state) => state.loadFlowsFromBackend);
    const isLoadingFlows = useFlowStore((state) => state.isLoadingFlows);
    const hasDraft = useFlowStore((state) => state.hasDraft);
    const restoreDraft = useFlowStore((state) => state.restoreDraft);
    const discardDraft = useFlowStore((state) => state.discardDraft);
    const { channels: walletChannels } = useWallet();

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [selectedChannel, setSelectedChannel] = useState('');
    const [viewMode, setViewMode] = useState('table');
    const [importError, setImportError] = useState('');
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [showSetupDialog, setShowSetupDialog] = useState(false);
    const [flowToDelete, setFlowToDelete] = useState(null);
    const [isDeletingFlow, setIsDeletingFlow] = useState(false);
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

    const channelOptions = useMemo(() => {
        if (!walletChannels || walletChannels.length === 0) return [];
        return walletChannels.map((ch) => ({
            value: ch.mobileNumber || '',
            label: ch.whatsappName || ch.companyCode || ch.mobileNumber || `Channel ${ch.Id}`,
            MobileNumber: ch.mobileNumber,
        }));
    }, [walletChannels]);

    // Auto-select when only one channel is connected (render-adjust pattern)
    if (!selectedChannel && channelOptions.length === 1) {
        setSelectedChannel(channelOptions[0].value);
    }

    const filteredFlows = useMemo(() => {
        let list = [...flowsList];

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (flow) =>
                    flow.name.toLowerCase().includes(q) ||
                    (flow.description && flow.description.toLowerCase().includes(q)) ||
                    flow.triggerKeyword.toLowerCase().includes(q)
            );
        }

        if (filterStatus !== 'ALL') {
            list = list.filter((flow) =>
                filterStatus === 'ACTIVE' ? flow.isActive : !flow.isActive
            );
        }

        switch (sortBy) {
            case 'oldest':
                list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'name':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
            default:
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        return list;
    }, [flowsList, search, filterStatus, sortBy]);

    const handleAddAutomation = () => {
        if (process.env.NEXT_PUBLIC_ENABLE_AI_FLOW === 'true') {
            setShowSetupDialog(true);
        } else {
            createNewFlow();
        }
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

    const handleEditFlow = (flowId) => {
        loadFlow(flowId);
    };

    const handleDeleteFlow = (flow, e) => {
        e?.stopPropagation();
        setFlowToDelete(flow);
    };

    const confirmDeleteFlow = async () => {
        if (!flowToDelete) return;
        setIsDeletingFlow(true);
        try {
            const result = await deleteFlow(flowToDelete.id);
            if (result?.success === false) {
                toast.error(result.error || `Failed to delete "${flowToDelete.name}"`);
            } else {
                toast.success(`Flow "${flowToDelete.name}" deleted`);
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to delete flow');
        } finally {
            setIsDeletingFlow(false);
            setFlowToDelete(null);
        }
    };

    const flowColumns = [
        { field: 'name', headerName: 'Flow Name', flex: 2, minWidth: 220 },
        { field: 'triggerKeyword', headerName: 'Keyword', width: 250 },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 120,
            renderCell: ({ row }) => (
                <Chip
                    size="small"
                    label={row.isActive ? 'Active' : 'Draft'}
                    sx={{
                        height: 22,
                        borderRadius: '11px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: row.isActive ? 'var(--primary-light-bg)' : 'var(--bg-light)',
                        color: row.isActive ? 'var(--primary-main)' : 'var(--text-tertiary)',
                    }}
                />
            ),
        },
        { field: 'nodeCount', headerName: 'Nodes', width: 90, type: 'number' },
        {
            field: 'updatedAt',
            headerName: 'Last Updated',
            width: 140,
            renderCell: ({ row }) => formatFlowDate(row.updatedAt),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleEditFlow(row.id)} sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--titleColor)' } }}>
                        <Eye size={18} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditFlow(row.id)} sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--titleColor)' } }}>
                        <Pencil size={18} />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => handleDeleteFlow(row, e)} sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--error-main)' } }}>
                        <Trash2 size={18} />
                    </IconButton>
                </Box>
            ),
        },
    ];

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
                        <p className={styles.pageSubtitle}>{flowsList.length} automation{flowsList.length !== 1 ? 's' : ''} total</p>
                    </div>
                </div>
                <div className={styles.topActions}>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(e, newMode) => newMode && setViewMode(newMode)}
                        className="toggle-button-group"
                        size="small"
                    >
                        <Tooltip title="Grid View" arrow>
                            <ToggleButton value="grid"><LayoutGrid size={16} /></ToggleButton>
                        </Tooltip>
                        <Tooltip title="Table View" arrow>
                            <ToggleButton value="table"><Table size={16} /></ToggleButton>
                        </Tooltip>
                    </ToggleButtonGroup>
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

            {/* AI setup wizard for new automations */}
            <AutomationSetupDialog open={showSetupDialog} onClose={() => setShowSetupDialog(false)} />

            {/* Filter bar — only when flows exist */}
            {flowsList.length > 0 && (
                <FilterBar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search automations..."
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    filterChips={[
                        { value: 'ALL', label: 'All' },
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'DRAFT', label: 'Draft' },
                    ]}
                    activeFilter={filterStatus}
                    onFilterChange={setFilterStatus}
                    channelOptions={channelOptions}
                    selectedChannel={selectedChannel}
                    onChannelChange={setSelectedChannel}
                />
            )}

            {/* Content */}
            <div className={styles.contentArea}>
                {/* Flow List */}
                {isLoadingFlows && viewMode === 'grid' ? (
                    <AutomationSkelton count={8} />
                ) : (
                <>
                {filteredFlows.length === 0 && !isLoadingFlows ? (
                    <Box className={styles.emptyState}>
                        <div className={styles.emptyStateIconWrap}>
                            <Zap size={40} className={styles.emptyStateIcon} />
                        </div>
                        <Typography component="h3" className={styles.emptyStateTitle}>
                            {search ? 'No automations found' : 'No automations yet'}
                        </Typography>
                        <Typography component="p" className={styles.emptyStateDesc}>
                            {search
                                ? 'Try adjusting your search term.'
                                : 'Create your first WhatsApp chatbot flow to get started.'}
                        </Typography>
                        {!search && (
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
                ) : viewMode === 'grid' ? (
                    <Box className={styles.automationGrid}>
                    {filteredFlows.map((flow) => {
                        const statusConfig = flow.isActive
                            ? { label: 'Active', color: 'var(--primary-main)', bg: 'var(--primary-light-bg)' }
                            : { label: 'Draft', color: 'var(--text-tertiary)', bg: 'rgba(109, 107, 119, 0.10)' };

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
                                                backgroundColor: 'var(--primary-light-bg)',
                                                color: 'var(--primary-main)',
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
                                        <Box sx={{ background: 'var(--bg-subtle)', borderRadius: '10px', p: '10px 12px', mb: 1.5 }}>
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
                                            sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--titleColor)' } }}
                                        >
                                            <Eye size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditFlow(flow.id);
                                            }}
                                            sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--titleColor)' } }}
                                        >
                                            <Pencil size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleDeleteFlow(flow, e)}
                                            sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--error-main)' } }}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Box>
                                </Box>
                            </Card>
                        );
                    })}
                    </Box>
                ) : viewMode === 'table' ? (
                    <Box className={styles.automationTable}>
                        <DataGrid
                            autoHeight
                            rows={filteredFlows}
                            columns={flowColumns}
                            loading={isLoadingFlows}
                            getRowId={(row) => row.id}
                            onRowClick={(params) => handleEditFlow(params.id)}
                            disableRowSelectionOnClick
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                            sx={{
                                border: 'none',
                                '& .MuiDataGrid-main': { borderRadius: '12px' },
                                '& .MuiDataGrid-cell': {
                                    fontFamily: 'Poppins, sans-serif',
                                    '&:focus, &:focus-within': { outline: 'none' },
                                },
                                '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
                                '& .MuiDataGrid-columnHeaderTitle': { fontFamily: 'Poppins, sans-serif', fontWeight: 600 },
                            }}
                        />
                    </Box>
                ) : null}
                </>
                )}
            </div>

            {/* Delete flow confirmation */}
            <ConfirmationModal
                isOpen={Boolean(flowToDelete)}
                onClose={() => { if (!isDeletingFlow) setFlowToDelete(null); }}
                onConfirm={confirmDeleteFlow}
                title="Delete Automation"
                description={`Are you sure you want to delete the flow "${flowToDelete?.name || 'this flow'}"? This action cannot be undone.`}
                icon={Trash2}
                isDanger={true}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isLoading={isDeletingFlow}
            />
        </div>
    );
};

export default Automation;
