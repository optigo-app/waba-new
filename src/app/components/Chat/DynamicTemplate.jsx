'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchTemplateByName } from '../../api/TemplateApi';
import { useChatStore } from '../../store/chatStore';
import MediaViewer from './MediaViewer';
import { Skeleton } from '@mui/material';
import {
  ChevronLeft, ChevronRight, ExternalLink, Phone, FileText, Play,
} from 'lucide-react';
import './styles/TemplateStyles.scss';

const MEDIA_FORMATS = ['IMAGE', 'VIDEO'];

const localTemplateCache = new Map();
const inflightRequests = new Map();

export default function DynamicTemplate({
  templateName = '',
  params = {},
  language = 'en',
  components = [],
}) {
  const [templateData, setTemplateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [initialMediaIndex, setInitialMediaIndex] = useState(0);

  const token = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('token') || '{}')
    : {};

  const preloadedTemplates = useChatStore((s) => s.templates);
  const templatesLoaded = useChatStore((s) => s.templatesLoaded);
  const selectedChannel = useChatStore((s) => s.selectedChannel);

  useEffect(() => {
    if (!templateName) return;
    const _wabaid = selectedChannel?.WabaId || token?.wabaid;
    if (!_wabaid) return;

    if (localTemplateCache.has(templateName.toLowerCase())) {
      setTemplateData(localTemplateCache.get(templateName.toLowerCase()));
      setLoading(false);
      return;
    }

    const cached = preloadedTemplates.find(
      (t) => (t.name || t.Name || '')?.toLowerCase() === templateName?.toLowerCase()
    );
    if (cached) {
      localTemplateCache.set(templateName.toLowerCase(), cached);
      setTemplateData(cached);
      setLoading(false);
      return;
    }

    if (!templatesLoaded) {
      setLoading(true);
      return;
    }

    const key = templateName.toLowerCase();
    const fetchTemplate = async () => {
      setLoading(true);
      setError(null);

      if (inflightRequests.has(key)) {
        const data = await inflightRequests.get(key);
        if (data) {
          setTemplateData(data);
        } else {
          setError('Failed to load template');
        }
        setLoading(false);
        return;
      }

      const promise = fetchTemplateByName(templateName, {
        wabaid: selectedChannel?.WabaId || token?.wabaid || '',
      });
      inflightRequests.set(key, promise);

      const data = await promise;
      inflightRequests.delete(key);

      if (data) {
        localTemplateCache.set(key, data);
        useChatStore.getState().setTemplates((prev) => [...prev, data]);
        setTemplateData(data);
      } else {
        setError('Failed to load template');
      }
      setLoading(false);
    };
    fetchTemplate();
  }, [templateName, token?.wabaid, preloadedTemplates, templatesLoaded, selectedChannel?.Id, selectedChannel?.WabaId]);

  const carouselRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const clientWidth = carouselRef.current.clientWidth;
      const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getMediaUrl = (comp) =>
    comp.example?.header_handle?.[0] || comp.example?.header_url?.[0];

  const collectAllMedia = () => {
    if (!templateData) return [];
    const media = [];
    const headerComp = templateData.components?.find(
      (c) => c.type === 'HEADER' && MEDIA_FORMATS.includes(c.format)
    );
    if (headerComp) {
      const url = getMediaUrl(headerComp);
      if (url) media.push({ url, type: headerComp.format.toLowerCase() });
    }
    const carouselComp = templateData.components?.find((c) => c.type === 'CAROUSEL');
    if (carouselComp?.cards) {
      carouselComp.cards.forEach((card) => {
        const cardHeader = card.components?.find(
          (c) => c.type === 'HEADER' && MEDIA_FORMATS.includes(c.format)
        );
        if (cardHeader) {
          const url = getMediaUrl(cardHeader);
          if (url) media.push({ url, type: cardHeader.format.toLowerCase() });
        }
      });
    }
    return media;
  };

  const handleMediaClick = (mediaUrl, mediaType = 'image') => {
    const allMedia = collectAllMedia();
    const items = allMedia.map((m, idx) => ({
      src: m.url,
      name: `Template ${m.type.charAt(0).toUpperCase() + m.type.slice(1)} ${idx + 1}`,
      type: m.type,
    }));
    const clickedIndex = allMedia.findIndex((m) => m.url === mediaUrl);
    setMediaItems(items);
    setInitialMediaIndex(clickedIndex >= 0 ? clickedIndex : 0);
    setMediaViewerOpen(true);
  };

  const renderText = (text = '') => {
    if (!text) return '';
    Object.entries(params).forEach(([key, value], index) => {
      const placeholder = new RegExp(`\\{\\{\\s*${index + 1}\\s*\\}\\}`, 'g');
      text = text.replace(placeholder, value || '');
    });
    return text;
  };

  // Escape HTML special characters to prevent injection from variable values
  const escapeHtml = (str = '') =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Convert WhatsApp markdown (*bold*, _italic_, ~strike~, `code`) to HTML.
  // Escapes HTML first so injected variable values can't break out of markup.
  const formatWhatsAppText = (text = '') => {
    let escaped = escapeHtml(text);
    // Inline code first so markdown markers inside `code` aren't re-processed
    escaped = escaped.replace(/`([^`]+?)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">$1</code>');
    escaped = escaped
      .replace(/\*([^*]+?)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+?)_/g, '<em>$1</em>')
      .replace(/~([^~]+?)~/g, '<s>$1</s>');
    return escaped;
  };

  const renderComponent = (component, isCarouselCard = false) => {
    if (!component) return null;

    switch (component.type) {
      case 'HEADER': {
        const mediaUrl = getMediaUrl(component);

        if (component.format === 'IMAGE') {
          return (
            <div
              className="template-header image"
              onClick={() => mediaUrl && handleMediaClick(mediaUrl, 'image')}
              style={{ cursor: mediaUrl ? 'pointer' : 'default' }}
            >
              {mediaUrl ? (
                <img src={mediaUrl} alt="Header" className="header-image" />
              ) : (
                <Skeleton variant="rectangular" width="100%" height={200} />
              )}
            </div>
          );
        }

        if (component.format === 'VIDEO') {
          return (
            <div
              className="template-header video"
              onClick={() => mediaUrl && handleMediaClick(mediaUrl, 'video')}
              style={{ cursor: mediaUrl ? 'pointer' : 'default' }}
            >
              {mediaUrl ? (
                <div className="video-wrapper">
                  <video src={mediaUrl} className="header-video" preload="metadata" />
                  <div className="video-overlay">
                    <Play size={40} className="play-icon" />
                  </div>
                </div>
              ) : (
                <Skeleton variant="rectangular" width="100%" height={200} />
              )}
            </div>
          );
        }

        if (component.format === 'DOCUMENT') {
          return (
            <div className="template-header document">
              {mediaUrl ? (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="document-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText size={32} className="document-icon" />
                  <span className="document-label">View Document</span>
                </a>
              ) : (
                <Skeleton variant="rectangular" width="100%" height={100} />
              )}
            </div>
          );
        }

        if (component.format === 'LOCATION') {
          return (
            <div className="template-header location">
              <span className="location-label">Location</span>
            </div>
          );
        }

        return component.text ? (
          <div
            className="template-header text"
            dangerouslySetInnerHTML={{ __html: formatWhatsAppText(renderText(component.text)) }}
          />
        ) : null;
      }

      case 'BODY': {
        let bodyText = renderText(component.text || '');
        return (
          <div className="template-body">
            {bodyText.split('\n').map((line, i) => (
              <p
                key={i}
                dangerouslySetInnerHTML={{ __html: formatWhatsAppText(line) }}
              />
            ))}
          </div>
        );
      }

      case 'FOOTER':
        return (
          <div
            className="template-footer"
            dangerouslySetInnerHTML={{ __html: formatWhatsAppText(component.text || '') }}
          />
        );

      case 'BUTTONS':
        return (
          <div className="template-buttons">
            {component.buttons?.map((button, i) => {
              const isUrl = button.type === 'URL';
              const isCall = button.type === 'PHONE_NUMBER';
              const isQuickReply = button.type === 'QUICK_REPLY';

              return (
                <button
                  key={i}
                  className={`template-button ${button.type?.toLowerCase() || ''}`}
                  onClick={() => {
                    if (isUrl && button.url) window.open(button.url, '_blank');
                    if (isCall && button.phone_number) window.location.href = `tel:${button.phone_number}`;
                  }}
                >
                  {isUrl && <ExternalLink size={16} className="button-icon" />}
                  {isCall && <Phone size={16} className="button-icon" />}
                  {button.text}
                </button>
              );
            })}
          </div>
        );

      case 'CAROUSEL':
        return (
          <div className="template-carousel-wrapper">
            <div className="template-carousel-nav-row">
              <button
                className={`carousel-nav-btn left ${!showLeftArrow ? 'hidden' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollCarousel('left');
                }}
                type="button"
                aria-label="Previous card"
              >
                <ChevronLeft size={18} />
              </button>
              <div
                className="template-carousel"
                ref={carouselRef}
                onScroll={handleScroll}
              >
                <div className="carousel-container">
                  {component.cards?.map((card, cardIndex) => (
                    <div key={cardIndex} className="carousel-card">
                      {card.components?.map((cardComp, compIndex) => {
                        if (cardComp.type === 'HEADER' && MEDIA_FORMATS.includes(cardComp.format)) {
                          const cMediaUrl = getMediaUrl(cardComp);
                          return (
                            <div
                              key={compIndex}
                              className="card-component-wrapper"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cMediaUrl) handleMediaClick(cMediaUrl, cardComp.format.toLowerCase());
                              }}
                              style={{ cursor: cMediaUrl ? 'pointer' : 'default' }}
                            >
                              {renderComponent(cardComp, true)}
                            </div>
                          );
                        }
                        return (
                          <div key={compIndex} className="card-component-wrapper">
                            {renderComponent(cardComp, true)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <button
                className={`carousel-nav-btn right ${!showRightArrow ? 'hidden' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollCarousel('right');
                }}
                type="button"
                aria-label="Next card"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading || (!templateData && !error)) {
    return (
      <div className="whatsapp-template-skeleton">
        <Skeleton
          variant="rounded"
          sx={{ width: 320, maxWidth: '100%', height: 200, borderRadius: '12px' }}
        />
      </div>
    );
  }

  if (error) {
    return <div className="whatsapp-template-error">{error}</div>;
  }

  const hasCarousel = templateData.components?.some((c) => c.type === 'CAROUSEL');

  return (
    <>
      <div className={`whatsapp-template whatsapp-template-fade-in${hasCarousel ? ' has-carousel' : ''}`}>
        {templateData.components?.map((component, index) => (
          <div key={`${component.type}-${index}`}>
            {renderComponent(component)}
          </div>
        ))}
      </div>

      {mediaViewerOpen && (
        <MediaViewer
          mediaItems={mediaItems}
          initialIndex={initialMediaIndex}
          onClose={() => setMediaViewerOpen(false)}
        />
      )}
    </>
  );
}
