import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Grid } from '@mui/material';
import {
    Eye, Send, Copy, Trash2, BookOpen, CheckCircle2, Clock, XCircle, AlertCircle,
    Image, Video, FileType, FileQuestion, Rocket, Edit2, Hash, Globe, Variable,
} from 'lucide-react';
import IconButton from '../Common/IconButton';
import Pagination from '../Common/Pagination/Pagination';

// ── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'var(--primary-main)', bg: 'rgba(29, 170, 97, 0.10)' },
    REJECTED: { label: 'Rejected', icon: XCircle, color: 'var(--error-main)', bg: 'rgba(211, 47, 47, 0.10)' },
    PENDING: { label: 'Pending', icon: Clock, color: 'var(--warning-main)', bg: 'rgba(245, 158, 11, 0.10)' },
    IN_APPEAL: { label: 'In Appeal', icon: AlertCircle, color: '#7367f0', bg: 'rgba(115, 103, 240, 0.10)' },
    DRAFT: { label: 'Draft', icon: BookOpen, color: 'var(--text-tertiary)', bg: 'rgba(109, 107, 119, 0.10)' },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status?.toUpperCase()] || { label: status || 'Unknown', icon: Clock, color: 'var(--text-tertiary)', bg: 'var(--bg-light)' };

// ── Header Type ───────────────────────────────────────────────────────────────
const getHeaderType = (components = []) => {
    if (components.find((c) => c.type === 'CAROUSEL')) return 'carousel';
    const header = components.find((c) => c.type === 'HEADER');
    if (!header) return 'text';
    const fmt = header.format?.toLowerCase();
    if (fmt === 'image') return 'image';
    if (fmt === 'video') return 'video';
    if (fmt === 'document') return 'document';
    return 'text';
};

const HEADER_META = {
    carousel: { Icon: Image, label: 'Carousel', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
    image: { Icon: Image, label: 'Image', color: '#7367f0', bg: 'rgba(115,103,240,0.10)' },
    video: { Icon: Video, label: 'Video', color: 'var(--info-main)', bg: 'rgba(3,195,236,0.10)' },
    document: { Icon: FileType, label: 'Document', color: '#ff9f43', bg: 'rgba(255,159,67,0.10)' },
    text: { Icon: FileQuestion, label: 'Text', color: 'var(--text-tertiary)', bg: 'rgba(109,107,119,0.10)' },
};

// ── Edit Permission ───────────────────────────────────────────────────────────
const canEditTemplate = (template) => {
    const updatedAt = template?.UpdatedAt;
    if (!updatedAt) return true;
    const updatedAtMs = new Date(updatedAt).getTime();
    if (!Number.isFinite(updatedAtMs)) return true;
    return (Date.now() - updatedAtMs) >= 24 * 60 * 60 * 1000;
};

// ── Card ─────────────────────────────────────────────────────────────────────
const TemplateCard = ({ template, onView, onSend, onClone, onEdit, onDelete, onPublish }) => {
    const status = getStatusConfig(template.WabaStatus);
    const StatusIcon = status.icon;

    let components = [];
    try { components = JSON.parse(template.Components || '[]'); } catch { components = []; }

    const headerType = getHeaderType(components);
    const headerInfo = HEADER_META[headerType];
    const HeaderIcon = headerInfo.Icon;

    const body = components.find((c) => c.type === 'BODY');
    const footer = components.find((c) => c.type === 'FOOTER');
    const buttons = components.find((c) => c.type === 'BUTTONS');

    const formattedDate = template.EntryDate
        ? new Date(template.EntryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const isApproved = template.WabaStatus?.toUpperCase() === 'APPROVED';
    const isDraft = template.WabaStatus?.toUpperCase() === 'DRAFT';
    const isPending = template.WabaStatus?.toUpperCase() === 'PENDING';
    const canEdit = canEditTemplate(template);

    return (
        <Card
            sx={{
                height: '100%',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
                transition: 'box-shadow 0.3s ease, transform 0.25s ease',
                '&:hover': {
                    boxShadow: '0 12px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
                    transform: 'translateY(-3px)',
                },
                overflow: 'hidden',
                position: 'relative',
            }}
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
                        {template.TemplateName}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            px: '8px',
                            py: '3px',
                            borderRadius: '20px',
                            backgroundColor: status.bg,
                            flexShrink: 0,
                        }}
                    >
                        <Box
                            sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                backgroundColor: status.color,
                                flexShrink: 0,
                            }}
                        />
                        <Typography
                            sx={{
                                fontWeight: 500,
                                fontSize: '0.7rem',
                                color: status.color,
                                letterSpacing: '0.3px',
                                lineHeight: 1,
                            }}
                        >
                            {status.label}
                        </Typography>
                    </Box>
                </Box>

                {/* Meta Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.75 }}>
                    <Chip
                        icon={<HeaderIcon size={11} />}
                        label={headerInfo.label}
                        size="small"
                        sx={{
                            backgroundColor: headerInfo.bg,
                            color: headerInfo.color,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            fontFamily: 'Poppins, sans-serif',
                            height: 20,
                            borderRadius: '4px',
                            '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: 'inherit' },
                        }}
                    />
                    <Chip
                        icon={<Hash size={10} />}
                        label={template.TemplateType || 'Standard'}
                        size="small"
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                            height: 20,
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-light)',
                            color: 'var(--text-tertiary)',
                            '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: 'inherit' },
                        }}
                    />
                    <Chip
                        icon={<Globe size={10} />}
                        label={template.Language || 'en'}
                        size="small"
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            fontFamily: 'Poppins, sans-serif',
                            height: 20,
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-light)',
                            color: 'var(--text-tertiary)',
                            '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: 'inherit' },
                        }}
                    />
                    {template.IsVariables === 1 && (
                        <Chip
                            icon={<Variable size={10} />}
                            label="Variables"
                            size="small"
                            sx={{
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                fontFamily: 'Poppins, sans-serif',
                                height: 20,
                                borderRadius: '4px',
                                '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: 'inherit' },
                            }}
                        />
                    )}
                </Box>

                {/* Body Preview */}
                {body?.text && (
                    <Box
                        sx={{
                            background: 'var(--bg-subtle)',
                            borderRadius: '10px',
                            p: '10px 12px',
                            mb: 1.5,
                        }}
                    >
                        <Typography
                            sx={{
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                                fontFamily: 'Poppins, sans-serif',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {body.text}
                        </Typography>
                    </Box>
                )}

                {/* Footer Preview */}
                {footer?.text && (
                    <Typography
                        sx={{
                            color: 'var(--text-placeholder)',
                            fontSize: '0.7rem',
                            fontFamily: 'Poppins, sans-serif',
                            display: 'block',
                            mb: 1.25,
                            fontStyle: 'italic',
                        }}
                    >
                        {footer.text}
                    </Typography>
                )}

                {/* Buttons Preview */}
                {buttons?.buttons?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {buttons.buttons.map((btn, i) => (
                            <Chip
                                key={i}
                                label={btn.text}
                                size="small"
                                variant="outlined"
                                sx={{
                                    fontSize: '0.68rem',
                                    height: 20,
                                    borderRadius: '12px',
                                    fontWeight: 500,
                                    fontFamily: 'Poppins, sans-serif',
                                }}
                            />
                        ))}
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
                        color: 'var(--text-placeholder)',
                        fontSize: '0.68rem',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 500,
                        letterSpacing: '0.3px',
                    }}
                >
                    {formattedDate}
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.2, alignItems: 'center' }}>
                    <IconButton icon={Eye} color="secondary" tooltip="View" onClick={() => onView(template)} size={18} />

                    {isApproved && (
                        <IconButton icon={Send} color="success" tooltip="Send" onClick={() => onSend(template)} size={18} />
                    )}

                    {!isPending && (
                        <IconButton icon={Copy} color="info" tooltip="Clone" onClick={() => onClone(template)} size={18} />
                    )}

                    {!isPending && (
                        <IconButton
                            icon={Edit2}
                            color="secondary"
                            tooltip={canEdit ? 'Edit' : 'Meta restricts template editing within 24 hours of the last update'}
                            onClick={canEdit ? () => onEdit(template) : undefined}
                            disabled={!canEdit}
                            size={18}
                        />
                    )}

                    {isDraft && (
                        <IconButton icon={Rocket} color="primary" tooltip="Publish" onClick={() => onPublish(template)} size={18} />
                    )}

                    <IconButton icon={Trash2} color="error" tooltip="Delete" onClick={() => onDelete(template)} size={18} />
                </Box>
            </Box>
        </Card>
    );
};

// ── Grid ─────────────────────────────────────────────────────────────────────
const TemplateCardGrid = ({ items, onView, onSend, onClone, onEdit, onDelete, onPublish, count, page, rowsPerPage, onPageChange, onRowsPerPageChange }) => {
    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
                <Box sx={{ pb: 16, pr: 1 }}>
                    <Grid container spacing={2}>
                        {items.map((template) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={template.Id}>
                                <TemplateCard
                                    template={template}
                                    onView={onView}
                                    onSend={onSend}
                                    onClone={onClone}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onPublish={onPublish}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Pagination - Sticky at bottom */}
                <Pagination
                    count={count}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={onPageChange}
                    onRowsPerPageChange={onRowsPerPageChange}
                />
            </Box>
        </Box>
    );
};

export default React.memo(TemplateCardGrid);
