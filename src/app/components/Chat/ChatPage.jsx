'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatChannelPanel from './ChatChannelPanel';
import ChatConversation from './ChatConversation';
import CustomerDetails from './CustomerDetails';
import ChatPreloader from './ChatPreloader';
import { useChatStore } from '../../store/chatStore';
import './styles/global-chat.css';
import './styles/chat-page.css';
import './styles/chat-sidebar.css';
import './styles/ChatLayout.scss';
import './styles/ChatBubble.scss';
import './styles/ChatOverlays.scss';

export default function ChatPage() {
  const pathname = usePathname();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelCollapsed, setChannelCollapsed] = useState(false);
  const [converList, setConvList] = useState([]);
  const [isConversationRead, setIsConversationRead] = useState(false);
  const [viewConversationRead, setViewConversationRead] = useState(false);
  const [selectedTag, setSelectedTag] = useState('All');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingDropFiles, setPendingDropFiles] = useState(null);
  const [preloading, setPreloading] = useState(true);
  const layoutRef = useRef(null);
  const wasCollapsedByBreakpoint = useRef(false);

  // Auto-collapse channel panel on screens <= 1024px
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handleChange = (e) => {
      if (e.matches) {
        wasCollapsedByBreakpoint.current = true;
        setChannelCollapsed(true);
      } else if (wasCollapsedByBreakpoint.current) {
        wasCollapsedByBreakpoint.current = false;
        setChannelCollapsed(false);
      }
    };
    handleChange(mq);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handlePreloadComplete = useCallback(() => {
    setPreloading(false);
    // Sync local selectedChannel from store (set by ChatPreloader)
    const storeChannel = useChatStore.getState().selectedChannel;
    if (storeChannel) {
      setSelectedChannel(storeChannel);
    }
  }, []);

  const handleChannelSelect = useCallback((channel) => {
    setSelectedChannel(channel);
    setSelectedCustomer(null);
    const store = useChatStore.getState();
    store.setSelectedChannelId(channel?.Id || null);
    store.setSelectedChannel(channel || null);
    // Clear current conversations so ChatSidebar re-checks cache or fetches for the new channel
    store.setConversations([]);
  }, []);

  const toggleChannelCollapse = useCallback(() => {
    setChannelCollapsed((prev) => !prev);
  }, []);

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

  const handleFileDrop = useCallback((files) => {
    setPendingDropFiles(files);
  }, []);

  const clearPendingDropFiles = useCallback(() => {
    setPendingDropFiles(null);
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
        const convId = String(found?.ConversationId ?? found?.Id ?? found?.CustomerId);
        useChatStore.getState().setSelectedConversationId(convId);
        useChatStore.getState().clearConversationUnread(convId);
        handleCustomerSelect(found);
      }
    };
    window.addEventListener('SELECT_CONVERSATION', handler);
    return () => window.removeEventListener('SELECT_CONVERSATION', handler);
  }, [converList, handleCustomerSelect]);

  // Prevent browser from opening files dropped outside drop targets
  // Use capture phase so child stopPropagation() can't bypass it
  useEffect(() => {
    const preventDefault = (e) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefault, true);
    window.addEventListener('drop', preventDefault, true);
    return () => {
      window.removeEventListener('dragover', preventDefault, true);
      window.removeEventListener('drop', preventDefault, true);
    };
  }, []);

  const isAddConversation = pathname === '/chat/add-conversation';

  if (preloading) {
    return <ChatPreloader onComplete={handlePreloadComplete} />;
  }

  return (
    <div className="chat-page-container">
      <div ref={layoutRef} className={`chat-page-layout${selectedCustomer ? ' chat-active' : ''}`}>
        {/* Left: channel list (collapsible) */}
        <div className={`chat-channel-section${channelCollapsed ? ' channel-collapsed' : ''}`}>
          <ChatChannelPanel
            selectedChannel={selectedChannel}
            onChannelSelect={handleChannelSelect}
            collapsed={channelCollapsed}
            onToggleCollapse={toggleChannelCollapse}
          />
        </div>

        {/* Middle: conversation list */}
        <div className="chat-sidebar-section">
          {selectedChannel ? (
            <ChatSidebar
              onCustomerSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
              isConversationRead={isConversationRead}
              viewConversationRead={viewConversationRead}
              onConversationList={handleConversationList}
              isAddConversation={isAddConversation}
              selectedTag={selectedTag}
              onTagSelect={setSelectedTag}
              onFileDrop={handleFileDrop}
              channelId={selectedChannel.Id}
              channel={selectedChannel}
              onChannelSelect={handleChannelSelect}
            />
          ) : (
            <div className="chat-sidebar-placeholder">
              <MessageCircle size={40} />
              <p>Select a WhatsApp channel to view conversations</p>
            </div>
          )}
        </div>

        {/* Right: conversation area */}
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
            pendingDropFiles={pendingDropFiles}
            onClearPendingDropFiles={clearPendingDropFiles}
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
