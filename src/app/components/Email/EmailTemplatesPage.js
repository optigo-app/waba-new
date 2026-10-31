'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
    Drawer,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';
import {
    Plus, RefreshCw, Mail, LayoutGrid, List, ArrowLeft,
    X, Eye, Edit2, Copy, Trash2, CheckCircle2, BookOpen, Archive, Calendar,
} from 'lucide-react';
import FilterBar from '../Common/FilterBar/FilterBar';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import IconButton from '../Common/IconButton';
import tstyles from '../Template/Templates.module.scss';
import styles from './EmailTemplatesPage.module.scss';
import { buildQueryString } from '../../utils/urlUtils';
import NewTemplateDrawer from './NewTemplateDrawer';
import { EMAIL_TEMPLATES } from './emailTemplateFixtures';

// ── Real starter templates (document + rendered html) — replace with the
// email-template API when it lands ────────────────────────────────────────────
const STATIC_TEMPLATES = EMAIL_TEMPLATES;

const STATUS_CONFIG = {
    ACTIVE: { label: 'Active', icon: CheckCircle2, color: 'var(--success-main)', bg: 'rgba(40, 199, 111, 0.12)' },
    DRAFT: { label: 'Draft', icon: BookOpen, color: 'var(--text-tertiary)', bg: 'rgba(109, 107, 119, 0.12)' },
    ARCHIVED: { label: 'Archived', icon: Archive, color: 'var(--warning-main)', bg: 'rgba(245, 158, 11, 0.12)' },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.DRAFT;

const formatDate = (d) => {
    const ms = new Date(d).getTime();
    return Number.isFinite(ms)
        ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
};

// Hide scrollbars inside rendered-email iframes (scrolling still works).
// The email markup may not include a <head>, so fall back to injecting right
// after <html> — a <style> in that position still applies in browsers.
const HIDE_SCROLLBARS_STYLE =
    '<style>html,body{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}</style>';

const hideIframeScrollbars = (html) => {
    if (typeof html !== 'string') return html;
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${HIDE_SCROLLBARS_STYLE}</head>`);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}${HIDE_SCROLLBARS_STYLE}`);
    return `${HIDE_SCROLLBARS_STYLE}${html}`;
};

// ── Mini email-mock thumbnail (like real template galleries) ─────────────────
// Used only for records that don't have rendered HTML stored yet.
const EmailThumb = ({ accent, variant }) => (
    <div className={styles.thumb}>
        <div className={styles.thumbHeader} style={{ background: accent }}>
            <span className={styles.thumbLogo} />
            <span className={styles.thumbHeaderLine} />
        </div>
        <div className={styles.thumbBody}>
            {variant === 'promo' && (
                <div className={styles.thumbImage} style={{ background: `${accent}26` }} />
            )}
            <div className={styles.thumbTitleLine} />
            <div className={styles.thumbLine} />
            <div className={styles.thumbLine} style={{ width: '78%' }} />
            {variant === 'standard' && <div className={styles.thumbLine} style={{ width: '55%' }} />}
            <div className={styles.thumbCta} style={{ background: accent }} />
        </div>
    </div>
);

// ── Real-email thumbnail — renders the template's saved HTML in a scaled,
// inert iframe (sandboxed, no pointer events). Fills the whole thumb area.
const EMAIL_RENDER_WIDTH = 640;

const HtmlThumb = ({ html }) => {
    const wrapRef = useRef(null);
    const [dims, setDims] = useState({ scale: 0.4, height: 480 });

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;
        const update = () => {
            const scale = el.clientWidth / EMAIL_RENDER_WIDTH;
            if (scale > 0) setDims({ scale, height: Math.ceil(el.clientHeight / scale) });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div ref={wrapRef} className={styles.htmlThumbWrap}>
            <iframe
                className={styles.htmlThumb}
                title="template preview"
                sandbox=""
                scrolling="no"
                tabIndex={-1}
                srcDoc={hideIframeScrollbars(html)}
                style={{
                    width: EMAIL_RENDER_WIDTH,
                    height: dims.height,
                    transform: `scale(${dims.scale})`,
                }}
            />
        </div>
    );
};

// ── Card ─────────────────────────────────────────────────────────────────────
const EmailTemplateCard = ({ template, onView, onEdit, onClone, onDelete }) => {
    const status = getStatusConfig(template.Status);
    const StatusIcon = status.icon;
    const html = template.Html || template.html;

    return (
        <div className={styles.emailCard}>
            <div className={`${styles.thumbWrap} ${html ? styles.thumbWrapFill : ''}`} onClick={() => onView(template)}>
                {html
                    ? <HtmlThumb html={html} />
                    : <EmailThumb accent={template.Accent || '#7367f0'} variant={template.Variant} />}
                <div className={styles.thumbOverlay}>
                    <Tooltip title="Preview" arrow>
                        <button className={styles.thumbAction} onClick={(e) => { e.stopPropagation(); onView(template); }}>
                            <Eye size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip title="Edit" arrow>
                        <button className={styles.thumbAction} onClick={(e) => { e.stopPropagation(); onEdit(template); }}>
                            <Edit2 size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip title="Clone" arrow>
                        <button className={styles.thumbAction} onClick={(e) => { e.stopPropagation(); onClone(template); }}>
                            <Copy size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip title="Delete" arrow>
                        <button className={`${styles.thumbAction} ${styles.danger}`} onClick={(e) => { e.stopPropagation(); onDelete(template); }}>
                            <Trash2 size={16} />
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div className={styles.cardInfo}>
                <div className={styles.cardNameRow}>
                    <span className={styles.cardName}>{template.TemplateName}</span>
                    <span className={styles.statusChip} style={{ color: status.color, background: status.bg }}>
                        <StatusIcon size={10} />
                        {status.label}
                    </span>
                </div>
                <span className={styles.cardMeta}>{template.Category} · {template.Subject}</span>
                <div className={styles.cardFooter}>
                    <span className={styles.dateText}>
                        <Calendar size={11} />
                        Updated {formatDate(template.UpdatedAt)}
                    </span>
                    <span className={styles.cardMeta}>{template.From}</span>
                </div>
            </div>
        </div>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const EmailTemplatesPage = () => {
    const router = useRouter();

    // Static for the prototype — swap with useEmailTemplates() when the API lands
    const [templates, setTemplates] = useState(STATIC_TEMPLATES);
    const [viewMode, setViewMode] = useState('grid');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [refreshing, setRefreshing] = useState(false);

    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [deleteTemplate, setDeleteTemplate] = useState(null);
    const [newOpen, setNewOpen] = useState(false);

    const goToBuilder = useCallback((params) => {
        const qs = buildQueryString(params);
        router.push(qs ? `/email/templates/create?${qs}` : '/email/templates/create');
    }, [router]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        // Prototype: simulate a refresh tick
        setTimeout(() => setRefreshing(false), 600);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!deleteTemplate) return;
        setTemplates((prev) => prev.filter((t) => t.Id !== deleteTemplate.Id));
        setDeleteTemplate(null);
    }, [deleteTemplate]);

    const { filtered, statusCounts } = useMemo(() => {
        let list = templates;

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((t) =>
                [t.TemplateName, t.Subject, t.Category, t.From]
                    .filter(Boolean)
                    .some((f) => String(f).toLowerCase().includes(q))
            );
        }

        if (filterStatus !== 'ALL') {
            list = list.filter((t) => t.Status?.toUpperCase() === filterStatus);
        }

        const sorted = [...list].sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.UpdatedAt) - new Date(a.UpdatedAt);
            if (sortBy === 'oldest') return new Date(a.UpdatedAt) - new Date(b.UpdatedAt);
            if (sortBy === 'name') return (a.TemplateName || '').localeCompare(b.TemplateName || '');
            return 0;
        });

        const counts = templates.reduce((acc, t) => {
            const s = t.Status?.toUpperCase() || 'DRAFT';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});

        return { filtered: sorted, statusCounts: counts };
    }, [templates, search, filterStatus, sortBy]);

    const filterChips = useMemo(() => [
        { value: 'ALL', label: `All (${templates.length})` },
        { value: 'ACTIVE', label: `Active (${statusCounts.ACTIVE || 0})` },
        { value: 'DRAFT', label: `Draft (${statusCounts.DRAFT || 0})` },
        { value: 'ARCHIVED', label: `Archived (${statusCounts.ARCHIVED || 0})` },
    ], [templates.length, statusCounts]);

    const viewToggle = (
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
            <Tooltip title="Grid View" arrow><ToggleButton value="grid"><LayoutGrid size={16} /></ToggleButton></Tooltip>
            <Tooltip title="List View" arrow><ToggleButton value="list"><List size={16} /></ToggleButton></Tooltip>
        </ToggleButtonGroup>
    );

    const refreshBtn = (
        <Button
            variant="outlined"
            startIcon={<RefreshCw size={15} className={refreshing ? tstyles.spinning : ''} />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
                textTransform: 'none', borderRadius: '10px',
                fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.8rem',
            }}
        >
            Refresh
        </Button>
    );

    return (
        <div className={tstyles.page}>
            {/* Top Bar */}
            <div className={tstyles.topBarWrapper}>
                <div className={tstyles.topBar}>
                    <div className={tstyles.topBarLeft}>
                        <button className={tstyles.backBtn} onClick={() => router.push('/')}>
                            <ArrowLeft size={16} />
                        </button>
                        <div className={tstyles.headerIconWrap} style={{ background: 'rgba(115,103,240,0.10)', color: '#7367f0' }}>
                            <Mail size={18} />
                        </div>
                        <div>
                            <h2 className={tstyles.pageTitle}>Email Templates</h2>
                            <p className={tstyles.pageSubtitle}>
                                {templates.length} template{templates.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                    </div>
                    <div className={tstyles.topBarRight}>
                        <div className={tstyles.desktopActions}>
                            {viewToggle}
                            {refreshBtn}
                        </div>
                        <Button
                            variant="contained"
                            startIcon={<Plus size={16} />}
                            onClick={() => setNewOpen(true)}
                            sx={{
                                textTransform: 'none', borderRadius: '10px',
                                fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                                background: '#7367f0', color: 'var(--button-color)', boxShadow: 'none',
                                '&:hover': { background: '#7367f0', boxShadow: 'none' },
                            }}
                        >
                            Create Template
                        </Button>
                    </div>
                </div>

                {/* Mobile toolbar row */}
                <div className={tstyles.toolbarRow}>
                    {viewToggle}
                    <div className={tstyles.toolbarActions}>{refreshBtn}</div>
                </div>
            </div>

            {/* Filters */}
            <FilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search email templates..."
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterChips={filterChips}
                activeFilter={filterStatus}
                onFilterChange={setFilterStatus}
            />

            {/* Content */}
            <div className={tstyles.contentArea}>
                {filtered.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: '6rem', gap: '1.5rem' }}>
                        <Box sx={{
                            width: 64, height: 64, borderRadius: '18px',
                            background: 'rgba(115,103,240,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(115,103,240,0.18)',
                        }}>
                            <Mail size={28} color="#7367f0" />
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                No email templates found
                            </Typography>
                            <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: 'var(--text-tertiary)', mt: '0.25rem' }}>
                                {search || filterStatus !== 'ALL' ? 'Try adjusting your search or filters' : 'Create your first email template to get started'}
                            </Typography>
                        </Box>
                    </Box>
                ) : viewMode === 'grid' ? (
                    <div className={styles.grid}>
                        {filtered.map((t) => (
                            <EmailTemplateCard
                                key={t.Id}
                                template={t}
                                onView={setPreviewTemplate}
                                onEdit={(tpl) => goToBuilder({ id: tpl.Id, name: tpl.TemplateName })}
                                onClone={(tpl) => goToBuilder({ clone: '1', id: tpl.Id, name: tpl.TemplateName })}
                                onDelete={setDeleteTemplate}
                            />
                        ))}
                    </div>
                ) : (
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-paper)' }}
                    >
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {['Name', 'Subject', 'Category', 'Status', 'Updated', 'Actions'].map((h) => (
                                        <TableCell key={h} sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.map((t) => {
                                    const status = getStatusConfig(t.Status);
                                    const StatusIcon = status.icon;
                                    return (
                                        <TableRow key={t.Id} hover>
                                            <TableCell sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {t.TemplateName}
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 280 }}>
                                                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.Subject}</Box>
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                {t.Category}
                                            </TableCell>
                                            <TableCell>
                                                <span className={styles.statusChip} style={{ color: status.color, background: status.bg }}>
                                                    <StatusIcon size={10} />
                                                    {status.label}
                                                </span>
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {formatDate(t.UpdatedAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className={styles.cardActions}>
                                                    <IconButton icon={Eye} tooltip="Preview" color="info" size={15} onClick={() => setPreviewTemplate(t)} />
                                                    <IconButton icon={Edit2} tooltip="Edit" color="primary" size={15} onClick={() => goToBuilder({ id: t.Id, name: t.TemplateName })} />
                                                    <IconButton icon={Copy} tooltip="Clone" color="secondary" size={15} onClick={() => goToBuilder({ clone: '1', id: t.Id, name: t.TemplateName })} />
                                                    <IconButton icon={Trash2} tooltip="Delete" color="error" size={15} onClick={() => setDeleteTemplate(t)} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </div>

            {/* Preview drawer */}
            <Drawer
                anchor="right"
                open={Boolean(previewTemplate)}
                onClose={() => setPreviewTemplate(null)}
                slotProps={{ paper: { sx: { borderRadius: '14px 0 0 14px' } } }}
            >
                <Box sx={{ width: { xs: '100vw', sm: 520 }, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-light)' }}>
                    <div className={tstyles.drawerHeader} style={{ background: 'var(--bg-paper)' }}>
                        <h3 className={tstyles.drawerTitle}>Email Preview</h3>
                        <button className={tstyles.drawerClose} onClick={() => setPreviewTemplate(null)}>
                            <X size={18} />
                        </button>
                    </div>
                    {previewTemplate && (
                        <>
                            <div className={styles.previewBody}>
                                {/* Meta card */}
                                <div className={styles.previewMeta}>
                                    <div className={styles.previewNameRow}>
                                        <span className={styles.previewName}>{previewTemplate.TemplateName}</span>
                                        {(() => {
                                            const s = getStatusConfig(previewTemplate.Status);
                                            const SIcon = s.icon;
                                            return (
                                                <span className={styles.statusChip} style={{ color: s.color, background: s.bg }}>
                                                    <SIcon size={10} />
                                                    {s.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className={styles.previewSubject}>{previewTemplate.Subject}</div>
                                    <div className={styles.previewMetaRow}>
                                        <span><b>From:</b> {previewTemplate.From}</span>
                                        <span className={styles.previewDot}>·</span>
                                        <span><b>To:</b> {'{{recipient}}'}</span>
                                    </div>
                                    <div className={styles.previewMetaRow}>
                                        <span>{previewTemplate.Category}</span>
                                        <span className={styles.previewDot}>·</span>
                                        <span>Updated {formatDate(previewTemplate.UpdatedAt)}</span>
                                    </div>
                                </div>

                                {/* Email body */}
                                {(previewTemplate.Html || previewTemplate.html) ? (
                                    <div className={styles.previewFrame}>
                                        <iframe
                                            title={`Preview: ${previewTemplate.TemplateName}`}
                                            sandbox="allow-same-origin"
                                            srcDoc={hideIframeScrollbars(previewTemplate.Html || previewTemplate.html)}
                                            style={{ width: '100%', flex: 1, minHeight: 420, border: 0, background: '#fff', display: 'block' }}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.emailMock}>
                                        <div className={styles.emailMockHeader}>
                                            <div className={styles.emailMockSubject}>{previewTemplate.Subject}</div>
                                            <div className={styles.emailMockMeta}>
                                                From: {previewTemplate.From} · To: {'{{recipient}}'}
                                            </div>
                                        </div>
                                        <div className={styles.emailMockBody}>{previewTemplate.PreviewText}</div>
                                        <div className={styles.emailMockFooter}>
                                            You received this email because you subscribed to updates. Unsubscribe
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className={styles.drawerActions}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<Edit2 size={14} />}
                                    onClick={() => {
                                        goToBuilder({ id: previewTemplate.Id, name: previewTemplate.TemplateName });
                                    }}
                                    sx={{
                                        textTransform: 'none', borderRadius: '10px',
                                        fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                                        background: '#7367f0', color: '#fff', boxShadow: 'none',
                                        '&:hover': { background: '#675dd8', boxShadow: 'none' },
                                    }}
                                >
                                    Edit in Builder
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Copy size={14} />}
                                    onClick={() => {
                                        goToBuilder({ clone: '1', id: previewTemplate.Id, name: previewTemplate.TemplateName });
                                    }}
                                    sx={{
                                        textTransform: 'none', borderRadius: '10px',
                                        fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                                    }}
                                >
                                    Clone
                                </Button>
                            </div>
                        </>
                    )}
                </Box>
            </Drawer>

            {/* New template — name + optional AI prompt, before the editor opens */}
            <NewTemplateDrawer
                open={newOpen}
                onClose={() => setNewOpen(false)}
                onCreate={(name, aiPrompt, starterId) =>
                    goToBuilder({
                        name,
                        new: '1', // deliberate fresh start — skips stale draft restore
                        ...(aiPrompt ? { ai: aiPrompt } : {}),
                        ...(starterId ? { starter: starterId } : {}),
                    })
                }
            />

            {/* Delete confirm */}
            <ConfirmationModal
                isOpen={Boolean(deleteTemplate)}
                onClose={() => setDeleteTemplate(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Email Template"
                description={`Are you sure you want to delete "${deleteTemplate?.TemplateName}"?\nThis action cannot be undone.`}
                icon={Trash2}
                isDanger
                confirmLabel="Delete"
            />
        </div>
    );
};

export default EmailTemplatesPage;
