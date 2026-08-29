import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { User } from 'lucide-react';

/**
 * Shared list of predefined dynamic variables.
 */
export const predefinedVariables = [
    { label: 'First Name', value: '{{dynamic_firstname}}' },
    { label: 'Last Name', value: '{{dynamic_lastname}}' },
];

/**
 * Reusable menu for selecting dynamic variables (placeholders).
 */
const DynamicVariableMenu = ({ anchorEl, open, onClose, onSelect }) => {
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            slotProps={{
                paper: {
                    sx: {
                        maxHeight: 300,
                        minWidth: 220,
                        borderRadius: '12px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        border: '1px solid #e2e8f0',
                        mt: 0.5
                    },
                }
            }}
        >
            {predefinedVariables.map((variable) => (
                <MenuItem
                    key={variable.value}
                    onClick={() => onSelect(variable.value)}
                    sx={{ 
                        fontSize: '0.875rem',
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                            backgroundColor: 'rgba(29, 170, 97, 0.06)',
                            color: 'var(--primary-main)'
                        }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: '32px !important', color: 'inherit' }}>
                        <User size={16} color='var(--secondary-color)' />
                    </ListItemIcon>
                    <ListItemText 
                        primary={variable.label} 
                        secondary={variable.value}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: '0.75rem', color: 'var(--secondary-color)' }}
                    />
                </MenuItem>
            ))}
        </Menu>
    );
};

export default DynamicVariableMenu;
