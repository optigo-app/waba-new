import { useCallback } from 'react';
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    TextField,
    InputAdornment,
    Tooltip
} from '@mui/material';
import { Search as SearchIcon, Tag, X as CloseIcon } from 'lucide-react';

const TagSearchInput = ({ value, onChange, onKeyDownCapture, onKeyDown, ICON_PROPS }) => (
    <TextField
        value={value}
        onChange={onChange}
        placeholder="Search tags"
        size="small"
        fullWidth
        autoFocus
        onKeyDownCapture={onKeyDownCapture}
        onKeyDown={onKeyDown}
        sx={{
            '& .MuiInputBase-root': {
                backgroundColor: '#fff',
            },
        }}
        InputProps={{
            startAdornment: (
                <InputAdornment position="start">
                    <SearchIcon {...ICON_PROPS} />
                </InputAdornment>
            ),
        }}
    />
);

const TagMenuItem = ({ tag, isSelected, onClick }) => (
    <MenuItem
        key={tag.TagId}
        selected={isSelected}
        onClick={onClick}
        sx={{
            py: 1,
            display: 'flex',
            alignItems: 'center',
        }}
    >
        <span
            style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: tag.color || '#e0f2f1',
                display: 'inline-block',
                marginRight: 10,
                flex: '0 0 auto',
            }}
        />
        <span
            style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '14px',
                fontWeight: isSelected ? 600 : 500,
            }}
        >
            {tag.TagName}
        </span>
    </MenuItem>
);

export default function TagSidebar({
    isCollapsed,
    selectedTag,
    selectedTagId,
    filteredTagsForMenu,
    tagsMenuAnchorEl,
    isTagsMenuOpen,
    handleOpenTagsMenu,
    handleCloseTagsMenu,
    handleTagsClick,
    tagSearchTerm,
    setTagSearchTerm,
    onTagSelect,
    tagsMenuListRef,
    focusMenuItemByDirection,
    getTagId,
    ICON_PROPS
}) {
    const selectedTagName = typeof selectedTag === 'string' ? selectedTag : selectedTag?.TagName;
    const selectedTagColor = typeof selectedTag === 'object' ? selectedTag?.color : undefined;

    const compactSelectedTagName = (() => {
        const name = String(selectedTagName || '').trim();
        if (!name) return '';
        if (name.length <= 8) return name;
        return `${name.slice(0, 7)}...`;
    })();

    const handleInputKeyDownCapture = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            focusMenuItemByDirection('down');
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            focusMenuItemByDirection('up');
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            handleCloseTagsMenu();
            return;
        }

        // Prevent Menu type-to-select from stealing typing while cursor is in the input.
        if (e.key !== 'Tab') {
            e.stopPropagation();
        }
    }, [focusMenuItemByDirection, handleCloseTagsMenu]);

    const rootClassName = `sidebar_tags_compact${isCollapsed ? ' sidebar_tags_collapsed' : ''}`;
    const tagsBtnClassName = `sidebar_tags_btn${selectedTag !== 'All' ? ' has-selection' : ''}`;

    return (
        <div className={rootClassName}>
            <Tooltip
                title="Tags"
                placement="right"
                arrow
                disableHoverListener={!isCollapsed}
                disableFocusListener={!isCollapsed}
                disableTouchListener={!isCollapsed}
            >
                <IconButton
                    className={tagsBtnClassName}
                    size="small"
                    onClick={handleOpenTagsMenu}
                >
                    <Tag {...ICON_PROPS} />
                </IconButton>
            </Tooltip>

            {isCollapsed && selectedTag !== 'All' && selectedTagName && (
                <div
                    className="sidebar_tags_selected"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTagSelect('All');
                        handleCloseTagsMenu();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onTagSelect('All');
                            handleCloseTagsMenu();
                        }
                    }}
                >
                    <span
                        className="sidebar_tags_selected_dot"
                        style={{ backgroundColor: selectedTagColor || '#e0f2f1' }}
                    />
                    <Tooltip title={selectedTagName} placement="right" arrow>
                        <span className="sidebar_tags_selected_name">{compactSelectedTagName}</span>
                    </Tooltip>
                </div>
            )}

            <Menu
                anchorEl={tagsMenuAnchorEl}
                open={isTagsMenuOpen}
                onClose={handleCloseTagsMenu}
                autoFocus={false}
                disableAutoFocusItem
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2,
                            minWidth: 220,
                            overflow: 'hidden',
                            boxShadow: '0 18px 50px rgba(17, 24, 39, 0.18)',
                            border: '1px solid rgba(0,0,0,0.06)',
                        },
                    }
                }}
                MenuListProps={{
                    sx: { p: 0, maxHeight: 360, overflowY: 'auto' },
                    ref: tagsMenuListRef,
                }}
            >
                {/* Search input */}
                <MenuItem
                    data-tags-skip-focus="true"
                    disableRipple
                    disableTouchRipple
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        cursor: 'default',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: 'background.paper',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        '&:hover': { backgroundColor: 'background.paper' },
                        py: 1,
                    }}
                >
                    <Box sx={{ width: '100%' }}>
                        <TagSearchInput
                            value={tagSearchTerm}
                            onChange={(e) => setTagSearchTerm(e.target.value)}
                            onKeyDownCapture={handleInputKeyDownCapture}
                            ICON_PROPS={ICON_PROPS}
                        />
                    </Box>
                </MenuItem>

                {/* Clear selection */}
                {selectedTag !== 'All' && (
                    <MenuItem
                        data-tags-skip-focus="true"
                        onClick={() => {
                            onTagSelect('All');
                            handleCloseTagsMenu();
                        }}
                        sx={{
                            py: 1,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                        }}
                    >
                        <CloseIcon {...ICON_PROPS} />
                        Clear tag filter
                    </MenuItem>
                )}

                {/* Tag items */}
                {filteredTagsForMenu.map((tag) => {
                    const tagId = typeof getTagId === 'function' ? getTagId(tag) : tag.TagId;
                    const isSelected = selectedTagId && String(selectedTagId) === String(tagId);
                    return (
                        <TagMenuItem
                            key={tag.TagId}
                            tag={tag}
                            isSelected={isSelected}
                            onClick={() => {
                                handleTagsClick(tag);
                                handleCloseTagsMenu();
                            }}
                        />
                    );
                })}
            </Menu>
        </div>
    );
}
