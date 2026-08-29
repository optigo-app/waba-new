'use client';

import React from 'react';
import { Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
    count,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    rowsPerPageOptions = [10, 15, 25, 50, 100],
}) => {
    return (
        <Box
            sx={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                py: 2,
                backgroundColor: 'transparent',
                zIndex: 1,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: 'var(--bg-paper)',
                    borderRadius: '999px',
                    boxShadow: 'var(--paper-shadow)',
                    border: '1px solid var(--border-color)',
                    px: 2,
                    py: '6px',
                    whiteSpace: 'nowrap',
                    flexWrap: 'nowrap',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-placeholder)', fontFamily: 'Poppins, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Rows per page
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 48 }}>
                        <Select
                            value={rowsPerPage}
                            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                            variant="standard"
                            disableUnderline
                            sx={{
                                fontSize: '0.875rem',
                                fontFamily: 'Poppins, sans-serif',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                '.MuiSelect-select': { py: 0, px: '2px', pr: '18px' },
                                '&:before, &:after': { display: 'none' },
                                '& .MuiSvgIcon-root': { right: 0, color: 'var(--text-placeholder)' },
                            }}
                            MenuProps={{ slotProps: { paper: { sx: { borderRadius: '10px', mt: 0.5, boxShadow: 'var(--box-shadow)' } } } }}
                        >
                            {rowsPerPageOptions.map((n) => (
                                <MenuItem key={n} value={n} sx={{ fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif' }}>{n}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ width: 1, height: 14, backgroundColor: 'var(--border-color)' }} />

                <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, count)} of {count}
                </Typography>

                <Box sx={{ width: 1, height: 14, backgroundColor: 'var(--border-color)' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Box
                        onClick={() => onPageChange(null, Math.max(0, page - 1))}
                        sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: page === 0 ? 'not-allowed' : 'pointer',
                            opacity: page === 0 ? 0.3 : 1,
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.15s',
                            '&:hover': { backgroundColor: page === 0 ? 'transparent' : 'var(--bg-light)', color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)' },
                        }}
                    >
                        <ChevronLeft size={15} strokeWidth={2.5} />
                    </Box>
                    <Box
                        onClick={() => onPageChange(null, Math.min(Math.ceil(count / rowsPerPage) - 1, page + 1))}
                        sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: page >= Math.ceil(count / rowsPerPage) - 1 ? 'not-allowed' : 'pointer',
                            opacity: page >= Math.ceil(count / rowsPerPage) - 1 ? 0.3 : 1,
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.15s',
                            '&:hover': { backgroundColor: page >= Math.ceil(count / rowsPerPage) - 1 ? 'transparent' : 'var(--bg-light)', color: page >= Math.ceil(count / rowsPerPage) - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)' },
                        }}
                    >
                        <ChevronRight size={15} strokeWidth={2.5} />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default Pagination;
