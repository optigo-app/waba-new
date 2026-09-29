'use client';

import React, { useState } from 'react';
import {
    Box,
    InputBase,
    Paper,
    Chip,
    FormControl,
    Select,
    MenuItem,
    MenuList,
    Popover,
    IconButton,
} from '@mui/material';
import { Search, ArrowDownUp, SlidersHorizontal, ListFilter } from 'lucide-react';

const FilterBar = ({
    search,
    onSearchChange,
    searchPlaceholder = 'Search...',
    sortBy,
    onSortChange,
    sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'name', label: 'Name (A-Z)' },
    ],
    filterChips = [],
    activeFilter,
    onFilterChange,
    channelOptions = [],
    selectedChannel = '',
    onChannelChange,
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [sortAnchorEl, setSortAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const sortOpen = Boolean(sortAnchorEl);

    const searchEl = (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                px: '0.875rem',
                py: '5px',
                flex: 1,
                minWidth: { xs: 0, sm: 200 },
                maxWidth: { xs: '100%', sm: 320 },
                background: 'var(--bg-paper)',
                transition: 'border-color 0.2s',
                '&:focus-within': {
                    borderColor: 'var(--primary-main)',
                    boxShadow: '0 0 0 3px var(--primary-light-bg)',
                },
            }}
        >
            <Search size={16} color="var(--text-placeholder)" />
            <InputBase
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                sx={{
                    ml: '0.5rem',
                    flex: 1,
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    '& input::placeholder': { color: 'var(--text-placeholder)', opacity: 1 },
                }}
            />
        </Paper>
    );

    const sortEl = (
        <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 140 } }}>
            <Select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                displayEmpty
                IconComponent={() => <ArrowDownUp size={14} color="var(--text-tertiary)" style={{ marginRight: 8 }} />}
                sx={{
                    borderRadius: '10px',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-strong)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary-main)' },
                }}
            >
                {sortOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem' }}>
                        {opt.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    const chipsEl = filterChips.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center' }}>
            {filterChips.map((chip) => {
                const isActive = activeFilter === chip.value;
                return (
                    <Chip
                        key={chip.value}
                        label={chip.label}
                        onClick={() => onFilterChange(chip.value)}
                        sx={{
                            borderRadius: '8px',
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            height: 28,
                            cursor: 'pointer',
                            background: isActive ? 'var(--primary-main)' : 'var(--bg-light)',
                            color: isActive ? 'var(--button-color)' : 'var(--text-tertiary)',
                            '&:hover': {
                                background: isActive ? 'var(--primary-main)' : 'var(--border-color)',
                            },
                        }}
                    />
                );
            })}
        </Box>
    );

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: { xs: 1, sm: 1.5 },
                py: 1,
                background: 'var(--bg-paper)',
                borderRadius: '12px',
                border: '1px solid var(--sidebar-borderColor)',
                flexShrink: 0,
            }}
        >
            {searchEl}

            <Box sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'nowrap',
                flexShrink: 0,
                maxWidth: '100%',
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: '3px' },
                '&::-webkit-scrollbar-thumb': { background: 'var(--text-placeholder)', borderRadius: '99px' },
            }}>
                {sortEl}
                <Box sx={{
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center',
                    gap: 0.6,
                    flexWrap: 'nowrap',
                    flexShrink: 0,
                }}>
                    {chipsEl}
                </Box>
            </Box>

            {/* Mobile/Tablet: sort + filter icon buttons */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <IconButton
                    onClick={(e) => setSortAnchorEl(e.currentTarget)}
                    sx={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        background: 'var(--bg-paper)',
                        color: 'var(--text-tertiary)',
                        p: 1,
                    }}
                >
                    <ArrowDownUp size={18} />
                </IconButton>
                {filterChips.length > 0 && (
                    <IconButton
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            background: 'var(--bg-paper)',
                            color: 'var(--text-tertiary)',
                            p: 1,
                        }}
                    >
                        <SlidersHorizontal size={18} />
                    </IconButton>
                )}
            </Box>

            {/* Mobile: sort popover */}
            <Popover
                open={sortOpen}
                anchorEl={sortAnchorEl}
                onClose={() => setSortAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            p: 0.5,
                            borderRadius: '12px',
                            boxShadow: 'var(--box-shadow)',
                            mt: 0.5,
                            display: { xs: 'block', sm: 'none' },
                            minWidth: 160,
                        },
                    },
                }}
            >
                <MenuList>
                    {sortOptions.map((opt) => (
                        <MenuItem
                            key={opt.value}
                            value={opt.value}
                            onClick={() => { onSortChange(opt.value); setSortAnchorEl(null); }}
                            selected={sortBy === opt.value}
                            sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontSize: '0.82rem',
                                borderRadius: '8px',
                                mx: 0.5,
                                my: 0.25,
                            }}
                        >
                            {opt.label}
                        </MenuItem>
                    ))}
                </MenuList>
            </Popover>

            {/* Mobile: filter chips popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            p: 1.5,
                            width: 280,
                            borderRadius: '12px',
                            boxShadow: 'var(--box-shadow)',
                            mt: 0.5,
                            display: { xs: 'block', sm: 'none' },
                        },
                    },
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center' }}>
                    {filterChips.map((chip) => {
                        const isActive = activeFilter === chip.value;
                        return (
                            <Chip
                                key={chip.value}
                                label={chip.label}
                                onClick={() => onFilterChange(chip.value)}
                                sx={{
                                    borderRadius: '8px',
                                    fontFamily: 'Poppins, sans-serif',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    height: 28,
                                    cursor: 'pointer',
                                    background: isActive ? 'var(--primary-main)' : 'var(--bg-light)',
                                    color: isActive ? 'var(--button-color)' : 'var(--text-tertiary)',
                                    '&:hover': {
                                        background: isActive ? 'var(--primary-main)' : 'var(--border-color)',
                                    },
                                }}
                            />
                        );
                    })}
                </Box>
            </Popover>
        </Box>
    );
};

export default FilterBar;
