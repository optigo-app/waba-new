'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Typography } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatConversation from './ChatConversation';
import CustomerDetails from './CustomerDetails';
import { useAuthStore } from '../../store/authStore';
import './styles/global-chat.css';
import './styles/chat-page.css';
import './styles/chat-sidebar.css';
import './styles/ChatLayout.scss';
import './styles/ChatBubble.scss';
import './styles/ChatOverlays.scss';

export default function ChatPage() {
  const pathname = usePathname();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [converList, setConvList] = useState([]);
  const [isConversationRead, setIsConversationRead] = useState(false);
  const [viewConversationRead, setViewConversationRead] = useState(false);
  const [selectedTag, setSelectedTag] = useState('All');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const layoutRef = useRef(null);

  const toggleDetailsPanel = useCallback(() => {
    setDetailsOpen((prev) => !prev);
  }, []);

  const handleCustomerSelect = useCallback((customer) => {
    setSelectedCustomer(customer);
    setIsConversationRead(false);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  const handleConversationRead = useCallback((isRead) => {
    setIsConversationRead(isRead);
  }, []);

  const handleConversationList = useCallback((list) => {
    setConvList(list);
  }, []);

  const handleViewConversationRead = useCallback((isRead) => {
    setViewConversationRead(isRead);
  }, []);

  // Handle browser-notification click to open a specific conversation
  useEffect(() => {
    const handler = (e) => {
      const conversationId = e?.detail?.conversationId;
      if (!conversationId) return;
      const found = converList.find(
        (c) =>
          String(c?.ConversationId) === String(conversationId) ||
          String(c?.CustomerId) === String(conversationId) ||
          String(c?.autoid) === String(conversationId)
      );
      if (found) {
        handleCustomerSelect(found);
      }
    };
    window.addEventListener('SELECT_CONVERSATION', handler);
    return () => window.removeEventListener('SELECT_CONVERSATION', handler);
  }, [converList, handleCustomerSelect]);

  const auth = useAuthStore((s) => s.auth);
  const isAddConversation = pathname === '/chat/add-conversation';

  const hasChannel = !!auth?.whatsappNumber && !!auth?.whatsappKey;

  if (!hasChannel) {
    return (
      <div className="chat-page-container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          background: '#f8f9fa',
          gap: 16,
        }}>
          <MessageCircle size={48} color="#9ca3af" />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            WhatsApp channel not connected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please complete onboarding to start chatting.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page-container">
      <div ref={layoutRef} className={`chat-page-layout${selectedCustomer ? ' chat-active' : ''}`}>
        {/* Left sidebar: conversation list */}
        <div className="chat-sidebar-section">
          <ChatSidebar
            onCustomerSelect={handleCustomerSelect}
            selectedCustomer={selectedCustomer}
            isConversationRead={isConversationRead}
            viewConversationRead={viewConversationRead}
            onConversationList={handleConversationList}
            isAddConversation={isAddConversation}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
        </div>

        {/* Middle: conversation area */}
        <div className="chat-conversation-section">
          <ChatConversation
            selectedCustomer={selectedCustomer}
            onConversationRead={handleConversationRead}
            onViewConversationRead={handleViewConversationRead}
            onCustomerSelect={handleCustomerSelect}
            onBack={handleBackToList}
            converList={converList}
            isConversationRead={isConversationRead}
            setIsConversationRead={setIsConversationRead}
            onToggleDetailsPanel={toggleDetailsPanel}
          />
        </div>

      </div>

      {/* Contact info drawer (desktop + mobile) */}
      <CustomerDetails
        customer={selectedCustomer}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        variant="drawer"
      />
    </div>
  );
}
