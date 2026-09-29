'use client';

import React, { useMemo } from 'react';
import { Paper, Box, Typography, Button, Tooltip, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { FileText, Wallet, Building2, Star } from 'lucide-react';

const META_COLOR = 'var(--text-secondary)';

const ChannelTable = ({ items, onWalletOpen, onTemplatesClick, onBusinessProfileClick }) => {
    const columns = useMemo(() => [
        {
            field: 'name',
            headerName: 'Channel',
            flex: 1,
            minWidth: 180,
            renderCell: (params) => {
                const ch = params.row;
                const displayName = ch.channelTitle || ch.whatsappName || ch.companyCode;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Box
                            sx={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--primary-light-bg), var(--primary-light))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid var(--primary-light-bg)',
                            }}
                        >
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-main)', fontFamily: 'Poppins, sans-serif' }}>
                                {displayName?.charAt(0)?.toUpperCase() || '?'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displayName}
                                </Typography>
                                {ch.isDefault && (
                                    <Chip
                                        size="small"
                                        label="Default"
                                        icon={<Star size={10} fill="currentColor" strokeWidth={0} />}
                                        sx={{
                                            height: '18px',
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            fontFamily: 'Poppins, sans-serif',
                                            color: 'var(--primary-main)',
                                            background: 'var(--primary-light-bg)',
                                            border: '1px solid color-mix(in srgb, var(--primary-main) 30%, transparent)',
                                            '& .MuiChip-icon': { color: 'var(--primary-main)', ml: '4px', mr: '-2px' },
                                        }}
                                    />
                                )}
                            </Box>
                            {ch.channelTitle && ch.whatsappName && (
                                <Typography sx={{ fontSize: '0.78rem', color: META_COLOR, fontWeight: 500, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {ch.whatsappName}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                );
            },
        },
        {
            field: 'mobileNumber',
            headerName: 'Mobile',
            width: 160,
            renderCell: (params) => (
                <Typography sx={{ fontSize: '0.85rem', color: META_COLOR, fontWeight: 500, fontFamily: 'Poppins, sans-serif' }}>
                    {params.value || '-'}
                </Typography>
            ),
        },
        {
            field: 'wabaId',
            headerName: 'WABA ID',
            width: 140,
            renderCell: (params) => (
                <Typography sx={{ fontSize: '0.85rem', color: META_COLOR, fontWeight: 500, fontFamily: 'Poppins, sans-serif' }}>
                    {params.value || '-'}
                </Typography>
            ),
        },
        {
            field: 'balance',
            headerName: 'Available',
            width: 140,
            renderCell: (params) => (
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-main)', fontFamily: 'Poppins, sans-serif' }}>
                    ₹{Number(params.value || 0).toLocaleString('en-IN')}
                </Typography>
            ),
        },
        {
            field: 'refundBalance',
            headerName: 'Refund',
            width: 120,
            renderCell: (params) => (
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--info-main)', fontFamily: 'Poppins, sans-serif' }}>
                    ₹{Number(params.value || 0).toLocaleString('en-IN')}
                </Typography>
            ),
        },
        {
            field: 'progressPercent',
            headerName: 'Usage',
            width: 180,
            renderCell: (params) => {
                const pct = Math.round(params.value || 0);
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                        <Box sx={{ flex: 1, height: '6px', borderRadius: '99px', backgroundColor: 'color-mix(in srgb, var(--text-secondary) 18%, transparent)', overflow: 'hidden' }}>
                            <Box sx={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, var(--primary-main), var(--success-main))' }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.8rem', color: META_COLOR, fontWeight: 600, fontFamily: 'Poppins, sans-serif', flexShrink: 0 }}>
                            {pct}%
                        </Typography>
                    </Box>
                );
            },
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 180,
            sortable: false,
            renderCell: (params) => {
                const ch = params.row;
                return (
                    <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <Tooltip title="Templates" arrow>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => onTemplatesClick(ch)}
                                sx={{
                                    minWidth: '32px',
                                    width: '32px',
                                    height: '32px',
                                    p: 0,
                                    borderRadius: '8px',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--primary-main)',
                                    background: 'var(--primary-light-bg)',
                                    '&:hover': { borderColor: 'var(--primary-main)', background: 'var(--primary-light-bg)' },
                                    boxShadow: 'none',
                                }}
                            >
                                <FileText size={15} />
                            </Button>
                        </Tooltip>
                        <Tooltip title="Business Profile" arrow>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => onBusinessProfileClick(ch)}
                                sx={{
                                    minWidth: '32px',
                                    width: '32px',
                                    height: '32px',
                                    p: 0,
                                    borderRadius: '8px',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    '&:hover': { borderColor: 'var(--primary-main)', color: 'var(--primary-main)' },
                                    boxShadow: 'none',
                                }}
                            >
                                <Building2 size={15} />
                            </Button>
                        </Tooltip>
                        <Tooltip title="Wallet Log" arrow>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => onWalletOpen(ch)}
                                sx={{
                                    minWidth: '32px',
                                    width: '32px',
                                    height: '32px',
                                    p: 0,
                                    borderRadius: '8px',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    '&:hover': { borderColor: 'var(--primary-main)', color: 'var(--primary-main)' },
                                    boxShadow: 'none',
                                }}
                            >
                                <Wallet size={15} />
                            </Button>
                        </Tooltip>
                    </Box>
                );
            },
        },
    ], [onWalletOpen, onTemplatesClick, onBusinessProfileClick]);

    const rows = useMemo(() =>
        items.map((ch) => ({
            id: ch.id || ch.Id,
            ...ch,
        })),
    [items]);

    return (
        <Paper
            elevation={0}
            sx={{
                background: 'var(--bg-paper)',
                borderRadius: '12px',
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'var(--border-color)',
                overflow: 'auto',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={false}
                    disableRowSelectionOnClick
                    disableColumnMenu
                    disableColumnFilter
                    rowHeight={60}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 50, page: 0 },
                        },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    sx={{
                        height: '100%',
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        },
                        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
                        '& .MuiDataGrid-row': {
                            transition: 'background-color 0.15s ease',
                            '&:hover': { backgroundColor: 'var(--bg-subtle)' },
                        },
                        '& .MuiDataGrid-cell': {
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            borderColor: 'var(--border-color)',
                        },
                        '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
                        '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
                        '& .MuiDataGrid-main': { backgroundColor: 'var(--bg-paper)' },
                        '& .MuiDataGrid-virtualScroller': { backgroundColor: 'var(--bg-paper)' },
                    }}
                />
            </Box>
        </Paper>
    );
};

export default React.memo(ChannelTable);
