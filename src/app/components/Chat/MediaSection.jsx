'use client';

import { Box, ImageList, ImageListItem, Skeleton } from '@mui/material';
import { Image, Play } from 'lucide-react';
import useLazyLoading from './useLazyLoading';

export default function MediaSection({
  mediaItems,
  mediaCache,
  isLoading,
  hasMore,
  onLoadMore,
  onMediaClick,
  paginationFlag,
}) {
  const combinedMedia = [...(mediaItems.images || []), ...(mediaItems.videos || [])];

  const lastMediaElementRef = useLazyLoading(onLoadMore, hasMore && paginationFlag, isLoading);

  if (isLoading && combinedMedia.length === 0) {
    return (
      <Box>
        <p className="cd-section-title">Media</p>
        <ImageList cols={3} gap={6} sx={{ m: 0 }}>
          {Array.from({ length: 9 }).map((_, idx) => (
            <ImageListItem key={`media-skel-${idx}`} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                <Skeleton variant="rounded" width="100%" height="100%" sx={{ position: 'absolute', inset: 0 }} />
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      </Box>
    );
  }

  if (combinedMedia.length === 0) {
    return (
      <div className="cd-empty-state">
        <div className="cd-empty-icon">
          <Image size={44} />
        </div>
        <p className="cd-empty-title">No media found</p>
        <p className="cd-empty-subtitle">Shared photos and videos will appear here</p>
      </div>
    );
  }

  return (
    <Box>
      <p className="cd-section-title">Media</p>
      <ImageList cols={3} gap={6} sx={{ m: 0 }}>
        {combinedMedia.map((item, index) => {
          const isVideo = item.MessageType === 'video';
          const isLastElement = index === combinedMedia.length - 1;
          const title = item.MediaName || (isVideo ? 'Video' : 'Image');
          const src = mediaCache[item.MediaUrl] || '';

          return (
            <ImageListItem
              ref={isLastElement ? lastMediaElementRef : null}
              key={item.Id || item.MediaUrl || index}
              onClick={() => onMediaClick(item)}
              title={title}
              sx={{ cursor: 'pointer' }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'action.hover',
                }}
              >
                {!src ? (
                  <Skeleton
                    variant="rounded"
                    width="100%"
                    height="100%"
                    sx={{ position: 'absolute', inset: 0, borderRadius: 0 }}
                  />
                ) : isVideo ? (
                  <Box
                    component="video"
                    preload="metadata"
                    playsInline
                    muted
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  >
                    <source src={src} type="video/mp4" />
                  </Box>
                ) : (
                  <Box
                    component="img"
                    src={src}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.28)',
                    opacity: 0,
                    transition: 'opacity 160ms ease',
                    '&:hover': { opacity: 1 },
                  }}
                >
                  {src ? (
                    isVideo ? (
                      <Play size={22} color="var(--button-color)" />
                    ) : (
                      <Image size={22} color="var(--button-color)" />
                    )
                  ) : null}
                </Box>
              </Box>
            </ImageListItem>
          );
        })}
      </ImageList>

      {!paginationFlag && hasMore ? (
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
          <button className="cd-load-more-btn" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </Box>
      ) : null}
    </Box>
  );
}
