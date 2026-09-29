'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
    Drawer,
    CircularProgress,
} from '@mui/material';
import {
    Plus, RefreshCw, FileText, LayoutGrid, List, ArrowLeft,
    X, AlertTriangle, Hash,
} from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../contexts/WalletContext';
import { useWabaId } from '../hooks/useWabaId';
import TemplateCardGrid from '../components/Template/TemplateCardGrid';
import TemplateTable from '../components/Template/TemplateTable';
import TemplateSkelton from '../components/Template/TemplateSkelton';
import FilterBar from '../components/Common/FilterBar/FilterBar';
import ConfirmationModal from '../components/ConfirmationModal/ConfirmationModal';
import styles from '../components/Template/Templates.module.scss';
import { extractTemplatePreviewData } from '../utils/templatePreviewUtils';
import { buildQueryString, parseQueryString } from '../utils/urlUtils';

const SendTemplateDialog = lazy(() => import('../components/SendTemplateDialog/SendTemplateDialog'));
const MessagePreview = lazy(() => import('../components/Common/MessagePreview'));

// ── Helpers ───────────────────────────────────────────────────────────────────
const getSortTime = (item) => {
    const updatedAtMs = new Date(item?.UpdatedAt).getTime();
    if (Number.isFinite(updatedAtMs)) return updatedAtMs;
    const entryDateMs = new Date(item?.EntryDate).getTime();
    if (Number.isFinite(entryDateMs)) return entryDateMs;
    return 0;
};

// ── Module-level sx constants (avoid inline object churn) ──────────────────────
const SX_WABA_CHIP = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    px: '10px',
    py: '4px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-light-bg)',
    border: '1px solid var(--primary-light-bg)',
    color: 'var(--primary-main)',
    fontSize: '0.72rem',
    fontWeight: 600,
    fontFamily: 'Poppins, sans-serif',
    whiteSpace: 'nowrap',
    '& .waba-id-icon': {
        opacity: 0.7,
        flexShrink: 0,
    },
    '& .waba-id-label': {
        opacity: 0.75,
        fontWeight: 500,
    },
    '& .waba-id-value': {
        fontWeight: 700,
        letterSpacing: '0.02em',
    },
};

const SX_EMPTY_OUTER = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: '6rem',
    gap: '1.5rem',
};

const SX_EMPTY_ICON = {
    width: 64,
    height: 64,
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(29,170,97,0.08), rgba(37,211,102,0.05))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--primary-light-bg)',
};

const SX_TEXT_TITLE = {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: '1.1rem',
    color: 'var(--text-primary)',
};

const SX_TEXT_SUBTITLE = {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '0.875rem',
    color: 'var(--text-tertiary)',
    mt: '0.25rem',
};

const SX_BTN_OUTLINE = {
    textTransform: 'none',
    borderRadius: '10px',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: '0.8rem',
};

const SX_BTN_CONTAINED = {
    textTransform: 'none',
    borderRadius: '10px',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: '0.8rem',
    background: 'var(--primary-main)',
    color: 'var(--button-color)',
    boxShadow: 'none',
    '&:hover': { background: 'var(--primary-main)', boxShadow: 'none' },
};

// ── Page ──────────────────────────────────────────────────────────────────────
const TemplatesPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { auth } = useAuth();
    const { hasSufficientBalance, walletInfo, channels: walletChannels } = useWallet();
    const { wabaId, tempId, whatsappNo, urlParams } = useWabaId();
    const selectedChannelId = useMemo(() => {
        if (tempId) return tempId;
        if (!whatsappNo || !walletChannels) return '';
        const ch = walletChannels.find((c) => c.mobileNumber === whatsappNo);
        return ch ? String(ch.Id) : '';
    }, [tempId, whatsappNo, walletChannels]);
    const { templates, loading, syncLoading, refresh, sync, remove, publish } = useTemplates(selectedChannelId, wabaId);

    // UI State
    const [viewMode, setViewMode] = useState('grid');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [pageChangeLoading, setPageChangeLoading] = useState(false);
    const pageChangeTimeoutRef = useRef(null);

    // Dialog State
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [openPreview, setOpenPreview] = useState(false);
    const [deleteTemplateData, setDeleteTemplateData] = useState(null);
    const [publishTemplateData, setPublishTemplateData] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [openSendDialog, setOpenSendDialog] = useState(false);
    const [selectedTemplateForSend, setSelectedTemplateForSend] = useState(null);
    const [selectedWhatsappNo, setSelectedWhatsappNo] = useState(whatsappNo);
    const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);

    const selectedWabaPhoneNo = useMemo(() => {
        if (!walletChannels || walletChannels.length === 0) return '';
        const ch = walletChannels.find((c) =>
            String(c.Id) === String(selectedChannelId) ||
            c.mobileNumber === selectedWhatsappNo ||
            c.MobileNumber === selectedWhatsappNo
        );
        return ch?.WabaPhoneNo || ch?.wabaPhoneNo || '';
    }, [walletChannels, selectedChannelId, selectedWhatsappNo]);

    const channelOptions = useMemo(() => {
        if (!walletChannels || walletChannels.length === 0) return [];
        return walletChannels.map((ch) => ({ value: ch.mobileNumber || '', label: ch.whatsappName || ch.companyCode || ch.mobileNumber || `Channel ${ch.Id}` }));
    }, [walletChannels]);

    useEffect(() => () => {
        if (pageChangeTimeoutRef.current) {
            clearTimeout(pageChangeTimeoutRef.current);
            pageChangeTimeoutRef.current = null;
        }
    }, []);

    const userToken = auth;

    // Synchronous preview data — MessagePreview handles broken URLs internally
    const validatedPreviewData = useMemo(() => {
        if (!previewTemplate) return null;
        return extractTemplatePreviewData(previewTemplate);
    }, [previewTemplate]);

    // Reset page when search/filter changes
    const handleChannelChange = useCallback((val) => {
        setSelectedWhatsappNo(val);
        const existing = parseQueryString(searchParams.toString());
        if (val) existing.whatsappNo = val; else delete existing.whatsappNo;
        const qs = buildQueryString(existing);
        router.replace(qs ? `/templates?${qs}` : '/templates', { scroll: false });
        setCurrentPage(1);
    }, [router, searchParams]);
    const handleSearchChange = useCallback((val) => { setSearch(val); setCurrentPage(1); }, []);
    const handleFilterChange = useCallback((val) => { setFilterStatus(val); setCurrentPage(1); }, []);

    // Filtered, sorted, paginated
    const { filtered, paginated, statusCounts } = useMemo(() => {
        let list = templates;

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((t) => {
                const fields = [
                    t.TemplateName, t.WabaStatus, t.Category,
                    t.Type, t.EntryDate, t.WabaTemplateId,
                ].filter(Boolean).map((f) => String(f).toLowerCase());
                return fields.some((f) => f.includes(q));
            });
        }

        if (filterStatus !== 'ALL') {
            list = filterStatus === 'OTHERS'
                ? list.filter((t) => !t.WabaStatus || !['APPROVED', 'PENDING', 'REJECTED', 'DRAFT'].includes(t.WabaStatus.toUpperCase()))
                : list.filter((t) => t.WabaStatus?.toUpperCase() === filterStatus);
        }

        const sorted = [...list].sort((a, b) => {
            if (sortBy === 'newest') return getSortTime(b) - getSortTime(a);
            if (sortBy === 'oldest') return getSortTime(a) - getSortTime(b);
            if (sortBy === 'name') return (a.TemplateName || '').localeCompare(b.TemplateName || '');
            return 0;
        });

        const counts = templates.reduce((acc, t) => {
            const s = t.WabaStatus?.toUpperCase() || 'OTHERS';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});

        const start = (currentPage - 1) * itemsPerPage;
        const pageItems = sorted.slice(start, start + itemsPerPage).map((t) => ({
            ...t,
            wabaId: t.WabaId || walletInfo?.wabaId || '-',
        }));

        return { filtered: sorted, paginated: pageItems, statusCounts: counts };
    }, [templates, search, filterStatus, sortBy, currentPage, itemsPerPage]);

    // Action Handlers — all memoized so child list components don't re-render on every parent render
    const handlers = useMemo(() => ({
        onView: (t) => { setPreviewTemplate(t); setOpenPreview(true); },
        onSend: (t) => {
            if (!hasSufficientBalance) {
                setShowInsufficientBalanceDialog(true);
                return;
            }
            setSelectedTemplateForSend(t);
            setOpenSendDialog(true);
        },
        onClone: (t) => {
            const qs = buildQueryString({ clone: '1', id: t.Id, tempid: tempId, wabaid: wabaId, whatsappNo: selectedWhatsappNo });
            router.push(qs ? `/templates/create?${qs}` : '/templates/create');
        },
        onEdit: (t) => {
            const qs = buildQueryString({ id: t.Id, tempid: tempId, wabaid: wabaId, whatsappNo: selectedWhatsappNo });
            router.push(qs ? `/templates/create?${qs}` : '/templates/create');
        },
        onDelete: (t) => setDeleteTemplateData(t),
        onPublish: (t) => setPublishTemplateData(t),
    }), [router, hasSufficientBalance, selectedWhatsappNo, tempId, wabaId]);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTemplateData) return;
        const ok = await remove(deleteTemplateData);
        if (ok) setDeleteTemplateData(null);
    }, [deleteTemplateData, remove]);

    const handleConfirmPublish = useCallback(async () => {
        if (!publishTemplateData) return;
        setIsPublishing(true);
        await publish(publishTemplateData);
        setIsPublishing(false);
        setPublishTemplateData(null);
    }, [publishTemplateData, publish]);

    const filterChips = useMemo(() => {
        const all = templates.length;
        return [
            { value: 'ALL', label: `All (${all})` },
            { value: 'APPROVED', label: `Approved (${statusCounts.APPROVED || 0})` },
            { value: 'PENDING', label: `Pending (${statusCounts.PENDING || 0})` },
            { value: 'REJECTED', label: `Rejected (${statusCounts.REJECTED || 0})` },
            { value: 'DRAFT', label: `Draft (${statusCounts.DRAFT || 0})` },
            { value: 'OTHERS', label: `Others (${statusCounts.OTHERS || 0})` },
        ];
    }, [templates.length, statusCounts]);


    const renderPreviewContent = () => {
        if (!validatedPreviewData) return null;

        return (
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>}>
                <MessagePreview
                    headerType={validatedPreviewData.headerType}
                    headerText={validatedPreviewData.headerText}
                    headerTextExample={validatedPreviewData.headerTextExample}
                    headerMedia={validatedPreviewData.headerMedia}
                    body={validatedPreviewData.body}
                    footer={validatedPreviewData.footer}
                    buttons={validatedPreviewData.buttons}
                    templateType={validatedPreviewData.templateType}
                    carouselCards={validatedPreviewData.carouselCards}
                    variableValues={validatedPreviewData.variableValues}
                    showEmptyHint={false}
                />
            </Suspense>
        );
    };

    return (
        <div className={styles.page}>
            {/* Top Bar */}
            <div className={styles.topBarWrapper}>
                <div className={styles.topBar}>
                    <div className={styles.topBarLeft}>
                        <button className={styles.backBtn} onClick={() => router.push('/')}>
                            <ArrowLeft size={16} />
                        </button>
                        <div className={styles.headerIconWrap}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 className={styles.pageTitle}>Templates</h2>
                            </Box>
                            <p className={styles.pageSubtitle}>
                                {templates.length} template{templates.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        {selectedWhatsappNo && (
                            <Tooltip title="WhatsApp Number" arrow>
                                <Box sx={SX_WABA_CHIP}>
                                    <span className="waba-id-label">WhatsApp No</span>
                                    <span className="waba-id-value">{selectedWhatsappNo}</span>
                                </Box>
                            </Tooltip>
                        )}
                    </div>
                    <div className={styles.topBarRight}>
                        <div className={styles.desktopActions}>
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={(_, v) => v && setViewMode(v)}
                                size="small"
                            >
                                <Tooltip title="Grid View" arrow>
                                    <ToggleButton value="grid"><LayoutGrid size={16} /></ToggleButton>
                                </Tooltip>
                                <Tooltip title="List View" arrow>
                                    <ToggleButton value="list"><List size={16} /></ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                            <Button
                                variant="outlined"
                                startIcon={loading ? <CircularProgress size={15} thickness={5} /> : <RefreshCw size={15} />}
                                onClick={() => refresh()}
                                disabled={loading || syncLoading}
                                sx={SX_BTN_OUTLINE}
                            >
                                Refresh
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={syncLoading ? <CircularProgress size={15} thickness={5} /> : <RefreshCw size={15} />}
                                onClick={sync}
                                disabled={loading || syncLoading}
                                sx={SX_BTN_OUTLINE}
                            >
                                Sync
                            </Button>
                        </div>
                        <Button
                            variant="contained"
                            startIcon={<Plus size={16} />}
                            onClick={() => {
                                const qs = buildQueryString({ tempid: tempId, wabaid: wabaId, whatsappNo: selectedWhatsappNo });
                                router.push(qs ? `/templates/create?${qs}` : '/templates/create');
                            }}
                            sx={SX_BTN_CONTAINED}
                        >
                            Create Template
                        </Button>
                    </div>
                </div>

                {/* Toolbar Row */}
                <div className={styles.toolbarRow}>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => v && setViewMode(v)}
                        size="small"
                    >
                        <Tooltip title="Grid View" arrow>
                            <ToggleButton value="grid"><LayoutGrid size={16} /></ToggleButton>
                        </Tooltip>
                        <Tooltip title="List View" arrow>
                            <ToggleButton value="list"><List size={16} /></ToggleButton>
                        </Tooltip>
                    </ToggleButtonGroup>

                    <div className={styles.toolbarActions}>
                        <Button
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={15} thickness={5} /> : <RefreshCw size={15} />}
                            onClick={() => refresh()}
                            disabled={loading || syncLoading}
                            sx={SX_BTN_OUTLINE}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={syncLoading ? <CircularProgress size={15} thickness={5} /> : <RefreshCw size={15} />}
                            onClick={sync}
                            disabled={loading || syncLoading}
                            sx={SX_BTN_OUTLINE}
                        >
                            Sync
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <FilterBar
                search={search}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Search templates..."
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterChips={filterChips}
                activeFilter={filterStatus}
                onFilterChange={handleFilterChange}
                channelOptions={channelOptions}
                selectedChannel={selectedWhatsappNo}
                onChannelChange={handleChannelChange}
            />

            {/* Content */}
            <div className={styles.contentArea}>
                {loading || pageChangeLoading ? (
                    <TemplateSkelton count={8} />
                ) : filtered.length === 0 ? (
                    <Box sx={SX_EMPTY_OUTER}>
                        <Box sx={SX_EMPTY_ICON}>
                            <FileText size={28} color="var(--primary-main)" />
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography sx={SX_TEXT_TITLE}>
                                {search ? 'No templates found' : 'No templates yet'}
                            </Typography>
                            <Typography sx={SX_TEXT_SUBTITLE}>
                                {search ? 'Try adjusting your search query' : 'Create your first WhatsApp message template to get started.'}
                            </Typography>
                        </Box>
                    </Box>
                ) : viewMode === 'grid' ? (
                    <TemplateCardGrid
                        items={paginated}
                        {...handlers}
                        count={filtered.length}
                        page={currentPage - 1}
                        rowsPerPage={itemsPerPage}
                        onPageChange={(_, p) => {
                            setPageChangeLoading(true);
                            setCurrentPage(p + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            if (pageChangeTimeoutRef.current) clearTimeout(pageChangeTimeoutRef.current);
                            pageChangeTimeoutRef.current = setTimeout(() => setPageChangeLoading(false), 400);
                        }}
                        onRowsPerPageChange={(e) => {
                            setPageChangeLoading(true);
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            if (pageChangeTimeoutRef.current) clearTimeout(pageChangeTimeoutRef.current);
                            pageChangeTimeoutRef.current = setTimeout(() => setPageChangeLoading(false), 400);
                        }}
                    />
                ) : (
                    <TemplateTable
                        items={paginated}
                        {...handlers}
                        count={filtered.length}
                        page={currentPage - 1}
                        rowsPerPage={itemsPerPage}
                        onPageChange={(_, p) => {
                            setPageChangeLoading(true);
                            setCurrentPage(p + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            if (pageChangeTimeoutRef.current) clearTimeout(pageChangeTimeoutRef.current);
                            pageChangeTimeoutRef.current = setTimeout(() => setPageChangeLoading(false), 400);
                        }}
                        onRowsPerPageChange={(e) => {
                            setPageChangeLoading(true);
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            if (pageChangeTimeoutRef.current) clearTimeout(pageChangeTimeoutRef.current);
                            pageChangeTimeoutRef.current = setTimeout(() => setPageChangeLoading(false), 400);
                        }}
                    />
                )}
            </div>

            {/* Preview Drawer */}
            <Drawer
                anchor="right"
                open={openPreview}
                onClose={() => setOpenPreview(false)}
                slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 }, background: 'var(--bg-subtle)' } } }}
            >
                <div className={styles.drawerRoot}>
                    <div className={styles.drawerHeader}>
                        <h3 className={styles.drawerTitle}>{previewTemplate?.TemplateName}</h3>
                        <button className={styles.drawerClose} onClick={() => setOpenPreview(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className={styles.drawerContent}>
                        {renderPreviewContent()}
                    </div>
                </div>
            </Drawer>

            {/* Send Dialog */}
            <Suspense fallback={null}>
                <SendTemplateDialog
                    open={openSendDialog}
                    onClose={() => setOpenSendDialog(false)}
                    template={selectedTemplateForSend}
                    userToken={userToken}
                    wabaPhoneNo={selectedWabaPhoneNo}
                />
            </Suspense>

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={!!deleteTemplateData}
                onClose={() => setDeleteTemplateData(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Template"
                description={`Are you sure you want to delete the template "${deleteTemplateData?.TemplateName}"? This action cannot be undone.`}
                isDanger
            />
            <ConfirmationModal
                isOpen={!!publishTemplateData}
                onClose={() => setPublishTemplateData(null)}
                onConfirm={handleConfirmPublish}
                title="Publish Template"
                description={`Are you sure you want to publish the template "${publishTemplateData?.TemplateName}"? This will submit it to WhatsApp for approval.`}
                isDanger={false}
                isLoading={isPublishing}
            />
            <ConfirmationModal
                isOpen={showInsufficientBalanceDialog}
                onClose={() => setShowInsufficientBalanceDialog(false)}
                onConfirm={() => setShowInsufficientBalanceDialog(false)}
                title="Insufficient Balance"
                description={`Your available balance is ₹${walletInfo?.availableBalance?.toLocaleString('en-IN') || 0}. You need at least ₹1 to send templates. Please recharge your wallet to continue.`}
                icon={AlertTriangle}
                isDanger={false}
                confirmLabel="OK"
                hideCancel
            />
        </div>
    );
};

export default TemplatesPage;
