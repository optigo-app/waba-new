'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import { Menu, MessageCircle } from 'lucide-react';
import { TagsProvider } from '../contexts/TagsContexts';
import { ArchieveProvider } from '../contexts/ArchieveContext';
import { DashboardFiltersProvider, useDashboardFilters } from '../contexts/DashboardFiltersContext';
import { WalletProvider } from '../contexts/WalletContext';
import Sidebar from './Siderbar/Sidebar';
import AuthGuard from './AuthGuard';
import NotificationBanner from './NotificationBanner/NotificationBanner';
import { storage } from '../utils/storage';
import { useFlowStore } from '../store/flowStore';

const MOBILE_BREAKPOINT = 768;

function SidebarWrapper({ isCollapsed, onCollapsedChange, mobileOpen, onMobileClose }) {
  const { selectedStatus, selectedTag, setSelectedStatus, setSelectedTag } = useDashboardFilters();
  return (
    <Sidebar
      onStatusSelect={setSelectedStatus}
      selectedStatus={selectedStatus}
      onTagSelect={setSelectedTag}
      selectedTag={selectedTag}
      isCollapsed={isCollapsed}
      onCollapsedChange={onCollapsedChange}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'optigo_sidebar_collapsed';

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [isBreakpointSidebarCollapsed, setIsBreakpointSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = storage.getLocal(SIDEBAR_COLLAPSED_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsBreakpointSidebarCollapsed(w <= 1440 && w > MOBILE_BREAKPOINT);
      setIsMobile(w <= MOBILE_BREAKPOINT);
      if (w > MOBILE_BREAKPOINT) {
        setMobileDrawerOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      storage.setLocal(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);

  const isPublicRoute = pathname === '/login' || pathname === '/session-check' || pathname === '/test';
  const isChatRoute = pathname === '/chat' || pathname?.startsWith('/chat/');
  const flowView = useFlowStore((state) => state.view);
  const isFlowBuilderRoute = pathname === '/auto-reply' && flowView === 'builder';

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const isSidebarCollapsedEffective = !isMobile && (isSidebarCollapsed || isBreakpointSidebarCollapsed);
  const sidebarWidth = isSidebarCollapsedEffective ? '70px' : '260px';

  const sidebar = (
    <SidebarWrapper
      isCollapsed={isSidebarCollapsedEffective}
      onCollapsedChange={setIsSidebarCollapsed}
      mobileOpen={mobileDrawerOpen}
      onMobileClose={() => setMobileDrawerOpen(false)}
    />
  );

  const content = (isChatRoute || isFlowBuilderRoute) ? (
    <>{children}</>
  ) : (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {!isMobile && sidebar}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: isMobile ? 0 : `calc(${sidebarWidth} + 10px)`,
          width: isMobile ? '100%' : `calc(100% - ${sidebarWidth} - 10px)`,
          minHeight: '100vh',
          transition: 'margin-left 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          backgroundColor: '#f8f9fa',
        }}
      >
        {isMobile && (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: '1rem',
              py: '0.75rem',
              background: '#fff',
              borderBottom: '1px solid #e4e8ee',
            }}
          >
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid #e4e8ee',
                color: '#444050',
              }}
            >
              <Menu size={20} />
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '10px',
                  background: '#1daa61',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={16} color="#fff" />
              </Box>
              <Typography
                sx={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#444050',
                }}
              >
                Agentic chat
              </Typography>
            </Box>
          </Box>
        )}
        {children}
      </Box>
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 260,
              background: '#fff',
              borderRadius: '0 16px 16px 0 !important',
            },
          },
        }}
        className="app-drawer"
        ModalProps={{ keepMounted: true }}
      >
        {sidebar}
      </Drawer>
    </Box>
  );

  return (
    <TagsProvider>
      <ArchieveProvider>
        <DashboardFiltersProvider>
          <WalletProvider>
            <AuthGuard>
              {content}
              {isChatRoute && <NotificationBanner />}
            </AuthGuard>
          </WalletProvider>
        </DashboardFiltersProvider>
      </ArchieveProvider>
    </TagsProvider>
  );
}
