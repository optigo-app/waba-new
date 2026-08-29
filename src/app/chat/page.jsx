'use client';

import dynamic from 'next/dynamic';

const ChatPage = dynamic(() => import('../components/Chat/ChatPage'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-paper)',
    }} />
  ),
});

export default function ChatRoute() {
  return <ChatPage />;
}
