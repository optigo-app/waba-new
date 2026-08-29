import React from 'react';
import { Paper, Chip, Box, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { FileText, Eye, Send, Copy, Trash2, BookOpen, CheckCircle2, Clock, XCircle, AlertCircle, Image, Video, FileType, FileQuestion, Rocket, Edit2 } from 'lucide-react';
import IconButton from '../Common/IconButton';

const STATUS_CONFIG = {
    APPROVED:   { label: 'Approved',  icon: CheckCircle2, color: 'var(--primary-main)', bg: 'rgba(29, 170, 97, 0.10)',  border: 'var(--primary-main)' },
    REJECTED:   { label: 'Rejected',  icon: XCircle,      color: 'var(--error-main)', bg: 'rgba(211, 47, 47, 0.10)',  border: 'var(--error-main)' },
    PENDING:    { label: 'Pending',   icon: Clock,        color: 'var(--warning-main)', bg: 'rgba(245, 158, 11, 0.10)', border: 'var(--warning-main)' },
    IN_APPEAL:  { label: 'In Appeal', icon: AlertCircle,  color: '#7367f0', bg: 'rgba(115, 103, 240, 0.10)', border: '#7367f0' },
    DRAFT:      { label: 'Draft',     icon: BookOpen,     color: 'var(--text-tertiary)', bg: 'rgba(109, 107, 119, 0.10)', border: 'var(--text-tertiary)' },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status?.toUpperCase()] || { label: status || 'Unknown', icon: Clock, color: 'var(--text-tertiary)', bg: 'var(--bg-light)' };

const getHeaderType = (components = []) => {
    const carousel = components.find((c) => c.type === 'CAROUSEL');
    if (carousel) return 'carousel';

    const header = components.find((c) => c.type === 'HEADER');
    if (!header) return 'text';
    const fmt = header.format?.toLowerCase();
    if (fmt === 'image') return 'image';
    if (fmt === 'video') return 'video';
    if (fmt === 'document') return 'document';
    return 'text';
};

const HEADER_ICONS = {
    carousel: { Icon: Image,       label: 'Carousel', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)', border: '#8b5cf6' },
    image:    { Icon: Image,       label: 'Image',    color: '#7367f0', bg: 'rgba(115, 103, 240, 0.10)', border: '#7367f0' },
    video:    { Icon: Video,       label: 'Video',    color: 'var(--info-main)', bg: 'rgba(3, 195, 236, 0.10)',  border: 'var(--info-main)' },
    document: { Icon: FileType,    label: 'Document', color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.10)',  border: '#ff9f43' },
    text:     { Icon: FileQuestion,label: 'Text',     color: 'var(--text-tertiary)', bg: 'rgba(109, 107, 119, 0.10)',  border: 'var(--text-tertiary)' },
};

const canEditTemplate = (template) => {
    const updatedAt = template?.UpdatedAt;
    if (!updatedAt) return true;

    const updatedAtMs = new Date(updatedAt).getTime();
    if (!Number.isFinite(updatedAtMs)) return true;

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    return (Date.now() - updatedAtMs) >= TWENTY_FOUR_HOURS_MS;
};

const TemplateTable = ({ items, onView, onSend, onClone, onEdit, onDelete, onPublish, count, page, rowsPerPage, onPageChange, onRowsPerPageChange }) => {
    const rows = items.map((template) => {
        const status = getStatusConfig(template.WabaStatus);

        let components = [];
        try { components = JSON.parse(template.Components || '[]'); } catch { components = []; }

        const headerType = getHeaderType(components);
        const headerInfo = HEADER_ICONS[headerType];

        const formattedDate = template.EntryDate
            ? new Date(template.EntryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        return {
            ...template,
            id: template.Id,
            status,
            headerInfo,
            formattedDate,
            isApproved: template.WabaStatus?.toUpperCase() === 'APPROVED',
            isDraft: template.WabaStatus?.toUpperCase() === 'DRAFT',
            isPending: template.WabaStatus?.toUpperCase() === 'PENDING',
            canEdit: canEditTemplate(template),
        };
    });

    const columns = [
        {
            field: 'srNo',
            headerName: 'SR#',
            width: 70,
            sortable: false,
            filterable: false,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const index = params.api.getRowIndexRelativeToVisibleRows(params.id);
                return page * rowsPerPage + index + 1;
            }
        },
        {
            field: 'TemplateName',
            headerName: 'NAME',
            minWidth: 220,
            flex: 1.4,
            align: 'start',
            headerAlign: 'start',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <FileText size={16} color="var(--text-placeholder)" />
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.01em' }} noWrap>
                        {params.row.TemplateName}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'WabaStatus',
            headerName: 'STATUS',
            minWidth: 150,
            flex: 0.9,
            align: 'start',
            headerAlign: 'start',
            renderCell: (params) => {
                const StatusIcon = params.row.status.icon;
                return (
                    <Chip
                        label={params.row.status.label}
                        size="small"
                        sx={{
                            backgroundColor: params.row.status.bg,
                            color: params.row.status.color,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            height: '24px',
                            borderRadius: '6px',
                            pl: 0.5,
                            '& .MuiChip-icon': { marginLeft: '4px', color: 'inherit' },
                        }}
                    />
                );
            }
        },
        {
            field: 'headerType',
            headerName: 'TYPE',
            minWidth: 130,
            flex: 0.8,
            sortable: false,
            filterable: false,
            align: 'start',
            headerAlign: 'start',
            valueGetter: (_, row) => row.headerInfo?.label || 'Text',
            renderCell: (params) => {
                const HeaderIcon = params.row.headerInfo.Icon;
                return (
                    <Chip
                        icon={<HeaderIcon size={11} color={params.row.headerInfo.color} />}
                        label={params.row.headerInfo.label}
                        size="small"
                        sx={{
                            backgroundColor: params.row.headerInfo.bg,
                            color: params.row.headerInfo.color,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            height: '24px',
                            borderRadius: '6px',
                            pl: 0.5,
                            '& .MuiChip-icon': { marginLeft: '4px', color: 'inherit' }
                        }}
                    />
                );
            }
        },
        {
            field: 'TemplateType',
            headerName: 'CATEGORY',
            minWidth: 130,
            flex: 0.8,
            align: 'start',
            headerAlign: 'start',
            renderCell: (params) => (
                <Chip label={params.row.TemplateType || '—'} size="small" sx={{ fontSize: '0.75rem', fontWeight: 500, height: '24px', borderRadius: '6px', backgroundColor: 'var(--bg-light)', color: 'var(--text-tertiary)' }} />
            )
        },
        {
            field: 'Language',
            headerName: 'LANGUAGE',
            minWidth: 120,
            flex: 0.7,
            align: 'start',
            headerAlign: 'start',
            renderCell: (params) => (
                <Chip label={params.row.Language || '—'} size="small" sx={{ fontSize: '0.75rem', fontWeight: 500, height: '24px', borderRadius: '6px', backgroundColor: 'var(--bg-light)', color: 'var(--text-tertiary)' }} />
            )
        },
        {
            field: 'formattedDate',
            headerName: 'CREATED DATE',
            minWidth: 130,
            flex: 0.8,
            align: 'start',
            headerAlign: 'start',
            valueGetter: (_, row) => row.formattedDate,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ color: 'var(--text-placeholder)', fontWeight: 500, fontSize: '0.8rem' }}>
                    {params.row.formattedDate}
                </Typography>
            )
        },
        {
            field: 'actions',
            headerName: 'ACTIONS',
            minWidth: 240,
            flex: 1,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'start',
            headerAlign: 'start',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'start', width: '100%', paddingLeft: '8px' }}>
                    <IconButton icon={Eye} color="secondary" tooltip="View" onClick={() => onView(params.row)} />
                    {params.row.isApproved && (
                        <IconButton icon={Send} color="success" tooltip="Send" onClick={() => onSend(params.row)} />
                    )}
                    {!params.row.isPending && (
                        <IconButton icon={Copy} color="info" tooltip="Clone" onClick={() => onClone(params.row)} />
                    )}
                    {!params.row.isPending && (
                        <IconButton
                            icon={Edit2}
                            color="secondary"
                            tooltip={params.row.canEdit ? 'Edit' : 'Meta restricts template editing within 24 hours of the last update'}
                            onClick={params.row.canEdit ? () => onEdit(params.row) : undefined}
                            disabled={!params.row.canEdit}
                        />
                    )}
                    {params.row.isDraft && (
                        <IconButton icon={Rocket} color="primary" tooltip="Submit/Apply" onClick={() => onPublish(params.row)} />
                    )}
                    <IconButton icon={Trash2} color="error" tooltip="Delete" onClick={() => onDelete(params.row)} />
                </Box>
            )
        },
    ];

    return (
        <Paper sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid var(--border-color)', overflow: 'hidden', backgroundColor: 'var(--bg-paper)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    disableColumnMenu
                    disableColumnFilter
                    paginationMode="server"
                    rowCount={count}
                    pageSizeOptions={[5, 10, 20, 50, 100]}
                    paginationModel={{ page, pageSize: rowsPerPage }}
                    onPaginationModelChange={(model) => {
                        if (model.page !== page && onPageChange) {
                            onPageChange(null, model.page);
                        }
                        if (model.pageSize !== rowsPerPage && onRowsPerPageChange) {
                            onRowsPerPageChange({ target: { value: model.pageSize } });
                        }
                    }}
                    disableRowSelectionOnClick
                    hideFooterSelectedRowCount
                    sx={{
                        border: 'none',
                        height: '100%',

                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-tertiary)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        minHeight: '48px !important',
                    },

                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 600,
                    },

                    '& .MuiDataGrid-row': {
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: 'var(--bg-subtle)' },
                    },

                    '& .MuiDataGrid-cell': {
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 16px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },

                    '& .MuiDataGrid-footerContainer': {
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-paper)',
                    },

                    '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                        outline: 'none',
                    },

                    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
                        outline: 'none',
                    },
                    '& .MuiDataGrid-main': { backgroundColor: 'var(--bg-paper)' },
                }}
            />
            </Box>
        </Paper>
    );
};

export default React.memo(TemplateTable);
