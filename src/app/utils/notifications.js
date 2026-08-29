'use client';

import toast from 'react-hot-toast';
import { playNotificationSound } from './notificationSound';
import { useAuthStore } from '../store/authStore';
import { getStaticUrl } from './globalFunc';

// Cache the service worker registration so we can use it synchronously
// (awaiting inside a click handler consumes the user gesture in some browsers)
let cachedSwReg = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
        cachedSwReg = reg;
    }).catch(() => {});
}

const getAppIcon = () => getStaticUrl('/waba_logo.png');

const capitalizeWords = (str) =>
    str
        ? str
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : '';

/**
 * Dispatch an in-page notification card (bottom-right toast UI).
 */
const showInPageNotification = ({ title, body, tag, group = 'OTHER' }) => {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent('waba:inPageNotification', {
                detail: { title, body, tag, group },
            })
        );
    } catch (_) {
        // ignore
    }
};

/**
 * Show a browser notification or fallback to in-app toast
 */
export const showBrowserNotification = async ({
    title,
    body,
    icon = getAppIcon(),
    badge = getAppIcon(),
    data,
    tag,
}) => {
    const isChatRoute = typeof window !== 'undefined' && window.location.pathname.includes('/chat');
    const notifType = data?.type || '';
    // NEW_MESSAGE -> only show when user is on /chat; all other types -> show everywhere
    const shouldPlaySound = notifType === 'NEW_MESSAGE' ? isChatRoute : true;

    // Suppress NEW_MESSAGE notifications when user is not on /chat
    if (notifType === 'NEW_MESSAGE' && !isChatRoute) {
        return;
    }

    // Not in browser or API not supported
    if (typeof window === 'undefined' || !('Notification' in window)) {
        if (shouldPlaySound) playNotificationSound();
        toast(body, { icon: '🔔' });
        return;
    }

    const isTabVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';

    // Tab active -> show inline notification only, no browser notification
    if (isTabVisible) {
        showInPageNotification({ title, body, tag, group: data?.group || 'OTHER' });
        if (shouldPlaySound) playNotificationSound();
        return;
    }

    // Tab not active -> show browser notification only, no inline notification
    if (Notification.permission !== 'granted') {
        return;
    }
    if (shouldPlaySound) playNotificationSound();

    const iconUrl = icon || getStaticUrl('/waba_logo.png');
    const badgeUrl = badge || getStaticUrl('/waba_logo.png');

    const options = {
        body,
        icon: iconUrl,
        badge: badgeUrl,
        data,
        tag: tag || `msg-${data?.conversationId || data?.ConversationId || Date.now()}`,
        requireInteraction: false,
        silent: true, // We play our own sound for consistency
    };

    const showViaNative = (opts) => {
        const nativeOpts = { ...options, ...opts };
        try {
            const notification = new Notification(title, nativeOpts);
            notification.onclick = (e) => {
                e.preventDefault();
                window.focus();
                const conversationId = data?.conversationId || data?.ConversationId;
                const chatUrl = data?.chatUrl || '/chat';
                if (!window.location.pathname.includes('/chat')) {
                    window.location.href = `${window.location.origin}${chatUrl}`;
                }
                if (conversationId) {
                    window.dispatchEvent(
                        new CustomEvent('SELECT_CONVERSATION', {
                            detail: { conversationId },
                        })
                    );
                }
                notification.close();
            };
        } catch (e) {
            console.error('[Notification] Native notification failed:', e);
        }
    };

    // Use cached Service Worker registration synchronously
    if ('serviceWorker' in navigator && cachedSwReg && cachedSwReg.active) {
        try {
            const result = cachedSwReg.showNotification(title, options);
            if (result && typeof result.then === 'function') {
                result
                    .then(() => {})
                    .catch((err) => {
                        console.error('[Notification] SW showNotification rejected:', err?.name, err?.message, err);
                        showViaNative({ body });
                    });
            }
        } catch (swErr) {
            console.warn('[Notification] SW showNotification failed (sync):', swErr?.name, swErr?.message, swErr);
            showViaNative({ body });
        }
        return;
    }

    // Fallback async path for socket-driven notifications
    if ('serviceWorker' in navigator) {
        try {
            const reg = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 2000)),
            ]);
            if (reg && reg.active) {
                cachedSwReg = reg; // cache for next time
                try {
                    await reg.showNotification(title, options);
                } catch (swErr) {
                    console.warn('[Notification] SW showNotification failed:', swErr?.name, swErr?.message, swErr);
                    const minimalOpts = { body, data: options.data, tag: options.tag };
                    try {
                        await reg.showNotification(title, minimalOpts);
                    } catch (swErr2) {
                        console.warn('[Notification] SW minimal also failed:', swErr2?.name, swErr2?.message);
                        showViaNative(minimalOpts);
                    }
                }
            } else {
                throw new Error('No active service worker');
            }
        } catch (e) {
            console.warn('[Notification] Service Worker path failed:', e?.name, e?.message);
            showViaNative({ body });
        }
    } else {
        showViaNative({ body });
    }
};

export const NOTIFICATION_TEMPLATES = {
    // New incoming message
    NEW_MESSAGE: (data) => {
        const name = capitalizeWords(
            data?.senderName || data?.CustomerName || data?.customerName || 'New Message'
        );
        const body = data?.message || data?.Message || data?.text || 'You have a new message.';
        return {
            title: name,
            body,
            icon: getAppIcon(),
            badge: getAppIcon(),
            tag: `msg-${data?.conversationId || data?.ConversationId || data?.customerId || data?.CustomerId}`,
        };
    },

    // Message reaction
    MESSAGE_REACTION: (data) => {
        let emoji = '👍';
        try {
            const reactions =
                typeof data?.ReactionEmojis === 'string'
                    ? JSON.parse(data.ReactionEmojis)
                    : data?.ReactionEmojis;
            if (Array.isArray(reactions) && reactions.length > 0) {
                emoji = reactions[reactions.length - 1].Reaction || '👍';
            }
        } catch (e) {
            /* ignore */
        }
        const name = capitalizeWords(data?.senderName || data?.sender || 'User');
        return {
            title: `${name} reacted`,
            body: `${emoji} ${data?.messagePreview || 'Reacted to your message'}`,
            icon: getAppIcon(),
            badge: getAppIcon(),
        };
    },

    // Conversation assigned to user
    CONVERSATION_ASSIGNED: (data) => ({
        title: '👤 Conversation Assigned',
        body: `A conversation with ${capitalizeWords(
            data?.CustomerName || data?.customerName || 'a customer'
        )} has been assigned to you.`,
        icon: getAppIcon(),
        badge: getAppIcon(),
    }),

    // Session logged out from another device
    SESSION_LOGOUT: () => ({
        title: '🔒 Session Logged Out',
        body: 'Your account was logged in from another device.',
        icon: getAppIcon(),
        badge: getAppIcon(),
    }),
};

export const notify = (data, templateId) => {
    const templateFn = NOTIFICATION_TEMPLATES[templateId];
    if (!templateFn) {
        console.warn(`Notification template "${templateId}" not found`);
        return;
    }

    const notificationOptions = templateFn(data);

    let typeGroup = 'OTHER';
    if (templateId === 'NEW_MESSAGE') typeGroup = 'MESSAGE';
    if (templateId === 'MESSAGE_REACTION') typeGroup = 'REACTION';
    if (templateId === 'CONVERSATION_ASSIGNED') typeGroup = 'ASSIGNMENT';
    if (templateId === 'SESSION_LOGOUT') typeGroup = 'AUTH';

    const auth = useAuthStore.getState().auth;
    const isLocalhost = typeof window !== 'undefined' && window.location.origin.includes('localhost');
    const basePath = isLocalhost ? '' : (auth?.redirect_version || '');

    showBrowserNotification({
        ...notificationOptions,
        data: {
            conversationId: data?.conversationId || data?.ConversationId || data?.ConversationId,
            customerId: data?.customerId || data?.CustomerId,
            type: templateId,
            group: typeGroup,
            redirectVersion: basePath,
            chatUrl: `${basePath}/chat`,
        },
    });
};
