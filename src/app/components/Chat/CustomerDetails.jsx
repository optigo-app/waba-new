'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Drawer, Box, Avatar, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { X, Image, FileText, Link, Flag } from 'lucide-react';
import {
  getWhatsAppAvatarConfig,
  getCustomerDisplayName,
  getCustomerAvatarSeed,
  hasCustomerName,
} from './utils/chatUtils';
import { fetchMediaLists, fetchChatMediaBlob } from '../../api/chat/conversationApi';
import { useAuthStore } from '../../store/authStore';
import MediaSection from './MediaSection';
import DocumentsSection from './DocumentsSection';
import LinksSection from './LinksSection';
import AddCustomerButton from './AddCustomerButton';

export default function CustomerDetails({ customer, open, onClose, variant = 'drawer' }) {
  const [activeTab, setActiveTab] = useState('media');
  const [mediaItems, setMediaItems] = useState({
    images: [],
    videos: [],
    documents: [],
    links: [],
  });
  const [pagination, setPagination] = useState({
    images: { page: 1, hasMore: true, isLoading: false },
    videos: { page: 1, hasMore: true, isLoading: false },
    documents: { page: 1, hasMore: true, isLoading: false },
    links: { page: 1, hasMore: true, isLoading: false },
  });
  const [mediaCache, setMediaCache] = useState({});

  const auth = useAuthStore((s) => s.auth);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const pageSize = 6;
  const enablePagination = true;

  const inFlightRequestsRef = useRef(new Set());
  const fetchedPagesRef = useRef(new Set());
  const paginationRef = useRef(pagination);

  const getItemKey = (item) => item?.Id ?? item?.MediaUrl;

  const mergeUniqueByKey = (prevList, nextList) => {
    const map = new Map();
    (prevList || []).forEach((it) => {
      const k = getItemKey(it);
      if (k != null) map.set(k, it);
    });
    (nextList || []).forEach((it) => {
      const k = getItemKey(it);
      if (k != null) map.set(k, it);
    });
    return Array.from(map.values());
  };

  const fetchMediaItem = async (mediaUrl) => {
    if (!mediaUrl || mediaCache[mediaUrl]) return mediaCache[mediaUrl];

    try {
      const result = await fetchChatMediaBlob(mediaUrl);
      if (result?.url) {
        setMediaCache((prev) => ({ ...prev, [mediaUrl]: result.url }));
        return result.url;
      }
      if (result?.blob) {
        const objectUrl = URL.createObjectURL(result.blob);
        setMediaCache((prev) => ({ ...prev, [mediaUrl]: objectUrl }));
        return objectUrl;
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    }
    return null;
  };

  const processMediaItems = (items) => {
    const categorized = {
      images: [],
      videos: [],
      documents: [],
      links: [],
    };

    items.forEach((item) => {
      const mediaItem = { ...item };
      if (item.MessageType === 'image') {
        categorized.images.push(mediaItem);
      } else if (item.MessageType === 'video') {
        categorized.videos.push(mediaItem);
      } else if (item.MessageType === 'document') {
        categorized.documents.push(mediaItem);
      } else {
        categorized.links.push(mediaItem);
      }
    });

    return categorized;
  };

  const fetchMediaData = useCallback(
    async (type, page = 1) => {
      if (!customer?.ConversationId || !auth?.userId) return;

      const group = type === 'images' || type === 'videos' ? 'media' : 'docs';
      const requestKey = `${customer.ConversationId}:${group}:${page}`;
      if (inFlightRequestsRef.current.has(requestKey) || fetchedPagesRef.current.has(requestKey)) return;

      inFlightRequestsRef.current.add(requestKey);
      if (paginationRef.current[type]?.isLoading) {
        inFlightRequestsRef.current.delete(requestKey);
        return;
      }

      setPagination((prev) => ({
        ...prev,
        [type]: { ...prev[type], isLoading: true },
      }));

      try {
        const response = await fetchMediaLists(page, pageSize, customer.ConversationId, auth.userId);
        if (response?.data) {
          const categorized = processMediaItems(response.data);

          if (type === 'images' || type === 'videos') {
            setMediaItems((prev) => ({
              ...prev,
              images: page === 1 ? categorized.images : mergeUniqueByKey(prev.images, categorized.images),
              videos: page === 1 ? categorized.videos : mergeUniqueByKey(prev.videos, categorized.videos),
            }));

            const hasMoreItems = response.data.length === pageSize;
            setPagination((prev) => ({
              ...prev,
              images: {
                ...prev.images,
                page,
                hasMore: hasMoreItems,
                isLoading: false,
              },
              videos: {
                ...prev.videos,
                page,
                hasMore: hasMoreItems,
                isLoading: false,
              },
            }));
          } else if (type === 'documents' || type === 'links') {
            setMediaItems((prev) => ({
              ...prev,
              documents: page === 1 ? categorized.documents : mergeUniqueByKey(prev.documents, categorized.documents),
              links: page === 1 ? categorized.links : mergeUniqueByKey(prev.links, categorized.links),
            }));

            const hasMoreItems = response.data.length === pageSize;
            setPagination((prev) => ({
              ...prev,
              documents: {
                ...prev.documents,
                page,
                hasMore: hasMoreItems,
                isLoading: false,
              },
              links: {
                ...prev.links,
                page,
                hasMore: hasMoreItems,
                isLoading: false,
              },
            }));
          }

          await Promise.all(
            response.data
              .filter((item) => item.MediaUrl)
              .map((item) => fetchMediaItem(item.MediaUrl))
          );

          fetchedPagesRef.current.add(requestKey);
        }
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        setPagination((prev) => ({
          ...prev,
          [type]: { ...prev[type], hasMore: false, isLoading: false },
        }));
      } finally {
        inFlightRequestsRef.current.delete(requestKey);
      }
    },
    [customer?.ConversationId, auth?.userId]
  );

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  const loadMoreItems = useCallback(
    (type) => {
      const current = paginationRef.current;
      if (!current[type]?.isLoading && current[type]?.hasMore) {
        const nextPage = current[type].page + 1;
        fetchMediaData(type, nextPage);
      }
    },
    [fetchMediaData]
  );

  const loadMoreMedia = useCallback(() => {
    const current = paginationRef.current;
    if (!current.images.isLoading && (current.images.hasMore || current.videos.hasMore)) {
      const nextPage = current.images.page + 1;
      fetchMediaData('images', nextPage);
    }
  }, [fetchMediaData]);

  const loadMoreDocuments = useCallback(() => {
    const current = paginationRef.current;
    if (!current.documents.isLoading && (current.documents.hasMore || current.links.hasMore)) {
      const nextPage = current.documents.page + 1;
      fetchMediaData('documents', nextPage);
    }
  }, [fetchMediaData]);

  useEffect(() => {
    if (customer?.ConversationId && open) {
      setMediaItems({ images: [], videos: [], documents: [], links: [] });
      setPagination({
        images: { page: 1, hasMore: true, isLoading: false },
        videos: { page: 1, hasMore: true, isLoading: false },
        documents: { page: 1, hasMore: true, isLoading: false },
        links: { page: 1, hasMore: true, isLoading: false },
      });
      setMediaCache({});
      inFlightRequestsRef.current.clear();
      fetchedPagesRef.current.clear();

      fetchMediaData('images', 1);
      fetchMediaData('documents', 1);
    }
  }, [customer?.ConversationId, open, fetchMediaData]);

  const handleMediaClick = (media) => {
    if (media.MessageType === 'image' || media.MessageType === 'video') {
      window.open(mediaCache[media.MediaUrl] || media.MediaUrl, '_blank');
    } else if (media.MessageType === 'document') {
      handleDownload(media.MediaUrl, media.MediaName || `document_${media.Id}`);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const link = document.createElement('a');
      const objectUrl = mediaCache[url] || (await fetchMediaItem(url));

      if (objectUrl) {
        link.href = objectUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = (url) => {
    if (navigator.share) {
      navigator
        .share({ title: 'Check this out', url })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      }).catch((err) => {
        console.error('Could not copy text: ', err);
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!customer) return null;

  const displayName = getCustomerDisplayName(customer);
  const avatarSeed = getCustomerAvatarSeed(customer);
  const cfg = customer?.avatarConfig || getWhatsAppAvatarConfig(avatarSeed, 80);

  const tabs = [
    { key: 'media', icon: Image, label: 'Media' },
    { key: 'docs', icon: FileText, label: 'Docs' },
    { key: 'links', icon: Link, label: 'Links' },
  ];

  const content = (
    <>
    <div className="customer-details-drawer">
        {/* Header */}
        <div className="cd-header">
          <span className="cd-header-title">Contact Info</span>
          <IconButton size="small" onClick={onClose} className="cd-header-close">
            <X size={18} />
          </IconButton>
        </div>

        {/* Profile */}
        <div className="cd-profile">
          <div className="cd-avatar-wrap">
            <Avatar
              {...cfg}
              alt={displayName}
              className={`cd-avatar ${!hasCustomerName(customer) ? 'lead-avatar' : ''}`}
            >
              {!hasCustomerName(customer) ? cfg?.children : null}
            </Avatar>
          </div>
          <p className="cd-name">
            {displayName}
            {!hasCustomerName(customer) && (
              <span className="lead-indicator-icon" title="Lead">
                <Flag size={14} fill="#f59e0b" />
              </span>
            )}
          </p>
          {customer?.CustomerPhone && (
            <p className="cd-phone">{customer.CustomerPhone}</p>
          )}
          <AddCustomerButton customer={customer} variant="label" sx={{ mt: 1 }} />
        </div>

        {/* Tabs */}
        <div className="cd-tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                className={`cd-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                <Icon size={20} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="cd-tab-content">
          {activeTab === 'media' && (
            <MediaSection
              mediaItems={mediaItems}
              mediaCache={mediaCache}
              isLoading={pagination.images.isLoading || pagination.videos.isLoading}
              hasMore={pagination.images.hasMore || pagination.videos.hasMore}
              onLoadMore={loadMoreMedia}
              onMediaClick={handleMediaClick}
              paginationFlag={enablePagination}
            />
          )}
          {activeTab === 'docs' && (
            <DocumentsSection
              documents={mediaItems.documents}
              mediaCache={mediaCache}
              isLoading={pagination.documents.isLoading}
              hasMore={pagination.documents.hasMore}
              onLoadMore={loadMoreDocuments}
              onDocumentClick={handleMediaClick}
              onDownload={handleDownload}
              paginationFlag={enablePagination}
            />
          )}
          {activeTab === 'links' && (
            <LinksSection
              links={mediaItems.links}
              isLoading={pagination.links.isLoading}
              hasMore={pagination.links.hasMore}
              onLoadMore={loadMoreDocuments}
              onShare={handleShare}
              paginationFlag={enablePagination}
            />
          )}
        </div>
      </div>
    </>
  );

  if (variant === 'panel') {
    return (
      <div className={`customer-details-panel ${open ? 'open' : ''}`}>
        {content}
      </div>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: isSmallScreen ? '100%' : 400,
            bgcolor: 'var(--bg-default)',
          },
        },
      }}
    >
      {content}
    </Drawer>
  );
}
