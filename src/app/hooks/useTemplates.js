'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCrmTemplates } from '../api/CrmTemplates';
import { syncTemplates, deleteTemplate, publishTemplate } from '../api/TemplateApi';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import { getSocket } from '../socket';

const getCacheKey = (accountId) => `templates_cache_${accountId || 'all'}`;

const getCachedTemplates = (accountId) => {
    try {
        const raw = sessionStorage.getItem(getCacheKey(accountId));
        if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
};

const setCachedTemplates = (accountId, data) => {
    try {
        sessionStorage.setItem(getCacheKey(accountId), JSON.stringify(data));
    } catch (_) { /* ignore */ }
};

export function useTemplates(accountId = '', wabaId = '') {
    const { auth } = useAuth();
    const cached = getCachedTemplates(accountId);
    const [templates, setTemplates] = useState(cached || []);
    const [loading, setLoading] = useState(!cached);
    const [syncLoading, setSyncLoading] = useState(false);
    const hasLoaded = useRef(false);
    const prevAccountId = useRef(accountId);
    const abortControllerRef = useRef(null);

    const userId = auth?.username || auth?.userid || auth?.userId || '';
    const createdBy = auth?.id || 4;
    const authUserId = auth?.userId || '';

    const load = useCallback(async (showLoader = true) => {
        if (!userId) return;
        if (showLoader) setLoading(true);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            const result = await fetchCrmTemplates(userId, controller.signal, accountId, wabaId);
            const data = result.data || [];
            setTemplates(data);
            setCachedTemplates(accountId, data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Error loading templates:', err);
            toast.error('Failed to load templates');
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [userId, accountId, wabaId]);

    // Initial load — show cache instantly (if any), fetch fresh in background
    useEffect(() => {
        if (userId && !hasLoaded.current) {
            hasLoaded.current = true;
            const hasCache = Boolean(getCachedTemplates(accountId));
            // If cache exists, fetch in background (no skeleton).
            // If no cache, show skeleton while fetching.
            load(!hasCache);
        }
    }, [userId, load]);

    // Reload when accountId changes (not on initial mount)
    useEffect(() => {
        if (userId && hasLoaded.current && prevAccountId.current !== accountId) {
            prevAccountId.current = accountId;
            // Show cached data for new channel instantly if available
            const channelCache = getCachedTemplates(accountId);
            if (channelCache) {
                setTemplates(channelCache);
                setLoading(false);
                // Refresh in background
                load(false);
            } else {
                // No cache for this channel — show skeleton
                setTemplates([]);
                load(true);
            }
        }
    }, [accountId, load]);

    // Socket listener for real-time template updates
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const socket = getSocket();
        if (!socket) return;

        const onUpdate = (eventData) => {
            const update = Array.isArray(eventData) ? eventData[1] : eventData;
            if (!update?.Id) return;
            setTemplates((prev) =>
                prev.map((t) =>
                    Number(t?.Id) === Number(update.Id)
                        ? {
                            ...t,
                            TemplateType: update.TemplateType ?? t.TemplateType,
                            WabaStatus: update.WabaStatus ?? t.WabaStatus,
                            TemplateJson: update.TemplateJson ?? t.TemplateJson,
                        }
                        : t
                )
            );
        };

        socket.on('templateUpdate', onUpdate);
        return () => socket.off('templateUpdate', onUpdate);
    }, [auth?.token]);

    const refresh = useCallback(() => load(true), [load]);

    const sync = useCallback(async () => {
        if (!userId) return;
        setSyncLoading(true);
        try {
            const result = await syncTemplates({ CreatedBy: createdBy, UserId: authUserId }, wabaId);
            if (result.success) {
                await load(false);
                toast.success('Templates synced successfully');
            } else {
                toast.error('Failed to sync templates');
            }
        } catch (err) {
            console.error('Error syncing templates:', err);
            toast.error('Failed to sync templates');
        } finally {
            setSyncLoading(false);
        }
    }, [userId, createdBy, authUserId, load, wabaId]);

    const remove = useCallback(async (template) => {
        try {
            const result = await deleteTemplate({ TemplateId: template.Id }, wabaId);
            if (result.success) {
                await load(false);
                toast.success('Template deleted successfully');
            } else {
                toast.error('Failed to delete template');
            }
            return result.success;
        } catch (err) {
            console.error('Error deleting template:', err);
            toast.error('Failed to delete template');
            return false;
        }
    }, [load, wabaId]);

    const publish = useCallback(async (template) => {
        try {
            const result = await publishTemplate({
                TemplateId: template.Id,
                CreatedBy: createdBy,
                UserId: authUserId,
            }, wabaId);
            if (result.success) {
                await load(false);
                toast.success('Template published successfully');
            } else {
                toast.error(result.error?.message || 'Failed to publish template');
            }
            return result.success;
        } catch (err) {
            console.error('Error publishing template:', err);
            toast.error('Failed to publish template');
            return false;
        }
    }, [createdBy, authUserId, load, wabaId]);

    return { templates, loading, syncLoading, refresh, sync, remove, publish };
}
