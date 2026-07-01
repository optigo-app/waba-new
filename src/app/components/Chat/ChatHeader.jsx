'use client';

import { Avatar, IconButton, Popover, useMediaQuery, useTheme } from '@mui/material';
import {
  ArrowLeft, X, Plus, Tag as TagIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getCustomerDisplayName, getCustomerAvatarSeed, getWhatsAppAvatarConfig } from './utils/chatUtils';
import AssigneeDropdown from './AssigneeDropdown';
import EscalatedDropdown from './EscalatedDropdown';
import { fetchAgentLists } from '../../api/chat/conversationApi';
import { useAuthStore } from '../../store/authStore';

export default function ChatHeader({
  selectedCustomer,
  isTabletOrMobile,
  isMobile,
  onBack,
  tagsList,
  setTagModalOpen,
  tagsMenuAnchorEl,
  setTagsMenuAnchorEl,
  canScrollLeft,
  canScrollRight,
  handleScrollTags,
  tagsScrollRef,
  assigneeList,
  setAssigneeList,
  escalatedList,
  setEscalatedList,
  auth,
  onToggleDetails,
  onDeleteTag,
}) {
  const theme = useTheme();
  const isCompact = useMediaQuery('(max-width:1024px)');
  const can = useAuthStore((s) => s.can);
  const baseAvatarConfig = selectedCustomer?.avatarConfig
    || getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer), 38);

  const refreshAgents = async () => {
    if (auth?.userId) {
      try {
        const res = await fetchAgentLists(auth.userId);
        if (res?.rd) setAssigneeList(res.rd);
        if (res?.rd1) setEscalatedList(res.rd1);
      } catch (e) { /* ignore */ }
    }
  };

  return (
    <div className="chat-conv-header">
      <div className="chat-conv-header-left">
        {isTabletOrMobile && (
          <IconButton
            size="small"
            onClick={onBack}
            sx={{
              color: '#6b7280',
              mr: 0.5,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
            }}
          >
            <ArrowLeft size={22} />
          </IconButton>
        )}
        <Avatar
          {...baseAvatarConfig}
          sx={{ ...baseAvatarConfig.sx, width: 40, height: 40, cursor: 'pointer' }}
          onClick={onToggleDetails}
        />
        <div className="chat-conv-header-info" onClick={onToggleDetails}>
          <p className="chat-conv-header-name">{getCustomerDisplayName(selectedCustomer)}</p>
          {selectedCustomer?.CustomerPhone && (
            <p className="chat-conv-header-phone">{selectedCustomer.CustomerPhone}</p>
          )}
        </div>
        {!!selectedCustomer?.CustomerId && (
          <div className="customer-tags-wrapper">
            {isCompact ? (
              <div className="mobile-tags-container">
                <IconButton
                  size="small"
                  onClick={(e) => setTagsMenuAnchorEl(e.currentTarget)}
                  sx={{
                    color: 'var(--chat-primary, #25d366)',
                    bgcolor: 'rgba(37, 211, 102, 0.08)',
                    '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.16)' },
                    p: 0.75,
                  }}
                >
                  <TagIcon size={18} />
                </IconButton>
                <Popover
                  open={Boolean(tagsMenuAnchorEl)}
                  anchorEl={tagsMenuAnchorEl}
                  onClose={() => setTagsMenuAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{
                    paper: {
                      sx: {
                        p: 1.5,
                        maxWidth: 280,
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        fontFamily: 'var(--chat-font)',
                      },
                    },
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span
                      className="customer-tags-add"
                      onClick={() => {
                        setTagsMenuAnchorEl(null);
                        setTagModalOpen(true);
                      }}
                      style={{ display: 'flex', justifyContent: 'center', width: '100%', cursor: 'pointer' }}
                    >
                      <Plus size={12} style={{ marginRight: 4 }} />
                      Add tag
                    </span>
                    {tagsList.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '4px 0', fontFamily: 'var(--chat-font)' }}>
                        No tags added yet
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto', pt: 0.5 }}>
                        {tagsList.map((tag, index) => (
                          <span className="customer-tags-chip" key={tag?.Id ?? index}>
                            {tag?.TagName}
                            <X
                              size={14}
                              style={{ cursor: 'pointer', marginLeft: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTag?.(tag);
                              }}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Popover>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                <span
                  className="customer-tags-add"
                  onClick={() => setTagModalOpen(true)}
                  style={{ marginRight: 4, flexShrink: 0 }}
                >
                  <Plus size={12} style={{ marginRight: 4 }} />
                  Add tag
                </span>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  {canScrollLeft && (
                    <IconButton
                      size="small"
                      className="tag-scroll-btn left"
                      onClick={() => handleScrollTags('left')}
                    >
                      <ChevronLeft size={18} />
                    </IconButton>
                  )}
                  <div className="customer-tags-scroll" ref={tagsScrollRef}>
                    {tagsList.map((tag, index) => (
                      <span className="customer-tags-chip" key={tag?.Id ?? index}>
                        {tag?.TagName}
                        <X
                          size={14}
                          style={{ cursor: 'pointer', marginLeft: 4 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTag?.(tag);
                          }}
                        />
                      </span>
                    ))}
                    {tagsList.length > 0 && (
                      <span className="tag-count-badge" title={`${tagsList.length} tags`}>
                        {tagsList.length}
                      </span>
                    )}
                  </div>
                  {canScrollRight && (
                    <IconButton
                      size="small"
                      className="tag-scroll-btn right"
                      onClick={() => handleScrollTags('right')}
                    >
                      <ChevronRight size={18} />
                    </IconButton>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="chat-conv-header-right">
        {can(5) && assigneeList.length > 0 && (
          <AssigneeDropdown
            options={assigneeList}
            selectedCustomer={selectedCustomer}
            onRefresh={refreshAgents}
          />
        )}
        {can(5) && escalatedList.length > 0 && (
          <EscalatedDropdown
            options={escalatedList}
            selectedCustomer={selectedCustomer}
            onRefresh={refreshAgents}
          />
        )}
      </div>
    </div>
  );
}
