'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [permissionStatus, setPermissionStatus] = useState(
        typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'default'
    );
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        setPermissionStatus(Notification.permission);

        // Listen for permission changes via Permissions API
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions
                .query({ name: 'notifications' })
                .then((status) => {
                    status.onchange = () => {
                        setPermissionStatus(status.state);
                        if (status.state === 'granted') {
                            setShowGuide(false);
                            toast.success('Notifications enabled!');
                        }
                    };
                })
                .catch(() => {});
        }
    }, []);

    // Register service worker for reliable background notifications
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        const auth = useAuthStore.getState().auth;
        const isLocalhost = window.location.origin.includes('localhost');
        const basePath = isLocalhost ? '' : (auth?.redirect_version || '');
        const swPath = `${basePath}/sw.js`;
        const swScope = `${basePath}/`;
        console.log('[SW] Registering:', swPath, 'scope:', swScope);
        navigator.serviceWorker
            .register(swPath, { scope: swScope, updateViaCache: 'none' })
            .then((reg) => {
                console.log('[SW] Service Worker registered:', reg.scope);
            })
            .catch((err) => {
                console.warn('[SW] Service Worker registration failed:', err);
            });

        // Bridge SW postMessage → window CustomEvent for notification clicks
        const swMessageHandler = (event) => {
            console.log('[SW] Message from SW:', event.data);
            if (event.data?.type === 'SELECT_CONVERSATION' && event.data?.conversationId) {
                window.dispatchEvent(
                    new CustomEvent('SELECT_CONVERSATION', {
                        detail: { conversationId: event.data.conversationId },
                    })
                );
            }
        };
        navigator.serviceWorker.addEventListener('message', swMessageHandler);

        return () => {
            navigator.serviceWorker.removeEventListener('message', swMessageHandler);
        };
    }, []);

    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';

        if (Notification.permission === 'default') {
            setShowGuide(true);
            return 'default';
        }

        if (Notification.permission === 'denied') {
            setShowGuide(true);
            return 'denied';
        }

        return 'granted';
    }, []);

    const executeNativeRequest = useCallback(async (fromModal = false) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';

        try {
            const status = await Notification.requestPermission();
            setPermissionStatus(status);
            if (!fromModal) setShowGuide(false);

            if (status === 'granted') {
                setShowGuide(false);
            } else if (status === 'denied') {
                if (!fromModal) {
                    toast(
                        'Notifications blocked. You can enable them in your browser settings.',
                        { icon: '⚠️' }
                    );
                }
            }
            return status;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            setShowGuide(false);
            return 'error';
        }
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                permissionStatus,
                showGuide,
                setShowGuide,
                requestPermission,
                executeNativeRequest,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotificationManager = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationManager must be used within a NotificationProvider');
    }
    return context;
};
