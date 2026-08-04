import { io } from 'socket.io-client';
import { getSocketState, setSocketState, removeSocketState } from './utils/storage';
import { getSocketURL } from './api/Config';
import { useChatStore } from './store/chatStore';
import { processIncomingMedia } from './utils/processIncomingMedia';

// Socket state
let socketInstance = null;
let isAuthenticated = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/* ── Window event bus for non-chat concerns (notifications, logout, etc.) ── */
const dispatch = (type, detail) => {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(type, { detail }));
    } catch (e) {
        // ignore
    }
};

const on = (type, handler) => {
    if (typeof window === 'undefined') return () => {};
    const wrapped = (e) => handler(e.detail);
    window.addEventListener(type, wrapped);
    return () => window.removeEventListener(type, wrapped);
};

// Restore connection state if available
const restoreConnection = () => {
    if (typeof window === 'undefined') return;
    const savedState = getSocketState();
    if (savedState) {
        try {
            const { token } = savedState;
            if (token) {
                initializeSocket(token);
            }
        } catch (e) {
            console.error('Error restoring socket state:', e);
            removeSocketState();
        }
    }
};

/**
 * Initialize socket connection with token
 * @param {string} token - Authentication token
 * @returns {object} Socket instance
 */
export const initializeSocket = (token) => {
    if (token) {
        setSocketState({ token });
    }

    // If we already have a working connection, return it
    if (socketInstance?.connected && isAuthenticated) {
        return socketInstance;
    }

    // Clean up existing connection if any
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
    }

    const socketURL = getSocketURL();

    socketInstance = io(socketURL, {
        auth: { token },
        reconnection: true,
    });

    socketInstance.on('connect', () => {
        isAuthenticated = true;
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    });

    socketInstance.on('disconnect', (reason) => {
        isAuthenticated = false;
    });

    socketInstance.on('connect_error', (err) => {
        isAuthenticated = false;
    });

    socketInstance.on('reconnect', (attemptNumber) => {
        isAuthenticated = true;
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
    });

    // Remove existing event listeners to prevent duplicates
    // socketInstance.removeAllListeners('newMessage');
    // socketInstance.removeAllListeners('changeStatus');

    // Handle new messages — push to store + broadcast for notifications
    socketInstance.on('newMessage', (data) => {
        try {
            useChatStore.getState().handleSocketMessage(data);
        } catch (e) {
            console.error('Chat store newMessage error:', e);
        }
        // Skip notification when CampaignId is "1" (campaign messages)
        if (String(data?.CampaignId) !== '1') {
            dispatch('waba:newMessage', data);
        }

        // Background: fetch from Meta, upload to own server, save URL
        processIncomingMedia(data).then((result) => {
            if (result?.serverUrl && result?.conversationId) {
                const msgId = String(data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId ?? '');
                if (msgId) {
                    useChatStore.getState().updateMessage(result.conversationId, msgId, {
                        FileUrl: result.serverUrl,
                        fileUrl: result.serverUrl,
                        MediaUrl: result.serverUrl,
                        mediaUrl: result.serverUrl,
                    });
                }
            }
        }).catch((err) => {
            console.error('Incoming media processing error:', err);
        });
    });

    // session logout
    socketInstance.on('sessionLogout', (data) => {
        dispatch('waba:sessionLogout', data);
    });

    // Handle new messages from assigning users — push to store + broadcast
    socketInstance.on('sendMessage', (data) => {
        try {
            useChatStore.getState().handleSocketMessage(data);
        } catch (e) {
            console.error('Chat store sendMessage error:', e);
        }
        // Skip notification when CampaignId is "1" (campaign messages)
        if (String(data?.CampaignId) !== '1') {
            dispatch('waba:sendMessage', data);
        }

        // Background: fetch from Meta, upload to own server, save URL
        processIncomingMedia(data).then((result) => {
            if (result?.serverUrl && result?.conversationId) {
                const msgId = String(data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId ?? '');
                if (msgId) {
                    useChatStore.getState().updateMessage(result.conversationId, msgId, {
                        FileUrl: result.serverUrl,
                        fileUrl: result.serverUrl,
                        MediaUrl: result.serverUrl,
                        mediaUrl: result.serverUrl,
                    });
                }
            }
        }).catch((err) => {
            console.error('Incoming media processing error:', err);
        });
    });

    // Handle message reactions
    socketInstance.on('sendReaction', (data) => {
        dispatch('waba:sendReaction', data);
    });

    // Handle status changes
    socketInstance.on('changeStatus', (data) => {
        dispatch('waba:changeStatus', data);
    });
    return socketInstance;
};

/**
 * Get the current socket instance
 */
export const getSocket = () => {
    // console.log("📡 getSocket called. Current instance:", socketInstance);
    return socketInstance;
};

/**
 * Check if socket is connected and authenticated
 */
export const isSocketConnected = () => {
    const state = socketInstance?.connected && isAuthenticated;

    // If not connected but we have a token, try to reconnect
    if (!state && !socketInstance && typeof window !== 'undefined') {
        const savedState = getSocketState();
        if (savedState) {
            try {
                const { token } = savedState;
                if (token && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    initializeSocket(token);
                }
            } catch (e) {
                console.error('Error during reconnection attempt:', e);
            }
        }
    }

    return state;
};

/**
 * Check if user is authenticated
 */
export const isSocketAuthenticated = () => {
    // console.log("🔑 isSocketAuthenticated ->", isAuthenticated);
    return isAuthenticated;
};

/**
 * Listen for new messages (newMessage only)
 */
export const addMessageHandler = (handler) => {
    return on('waba:newMessage', handler);
};

/**
 * Add a handler for session logout
 */
export const addSessionLogoutHandler = (handler) => {
    return on('waba:sessionLogout', handler);
};

/**
 * Add a handler for new messages coming from assigning users (sendMessage only)
 */
export const addMessageHandlerFromAssigningUser = (handler) => {
    return on('waba:sendMessage', handler);
};

/**
 * Emit a reaction to the server via socket
 */
export const emitReaction = (data) => {
    if (socketInstance && isAuthenticated) {
        socketInstance.emit('sendReaction', data);
    }
};

/**
 * Add reaction message handler
 */
export const addMessageReactionHandler = (handler) => {
    if (typeof handler === 'function') {
        return on('waba:sendReaction', handler);
    }
    return () => {};
};

/**
 * Add a handler for status changes
 */
export const addStatusHandler = (handler) => {
    return on('waba:changeStatus', handler);
};

const BROADCAST_CHANNEL = 'waba-session-logout';

/**
 * Broadcast logout event to all browser tabs
 */
export const broadcastLogout = () => {
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL);
    bc.postMessage('logout');
    bc.close();
  } catch (_) {
    try {
      localStorage.setItem('waba-logout', Date.now().toString());
    } catch (__) { /* ignore */ }
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (permanent = false) => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
        if (permanent) {
            removeSocketState();
        }
    } else {
        if (permanent) {
            removeSocketState();
        }
    }
};
