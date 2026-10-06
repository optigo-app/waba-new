'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '../contexts/WalletContext';
import { parseQueryString } from '../utils/urlUtils';

/**
 * Resolves the WabaId from URL query params (wabaid, tempid, whatsappNo)
 * using parseQueryString for Base64-encoded keys and values.
 *
 * Priority:
 *   1. `wabaid` URL param (direct WabaId)
 *   2. Channel lookup from walletChannels by `tempid` or `whatsappNo`
 *   3. `channelId` URL param (legacy fallback)
 *
 * @returns {{ wabaId: string, tempId: string, whatsappNo: string, channelId: string, urlParams: Record<string,string> }}
 */
export const useWabaId = () => {
    const searchParams = useSearchParams();
    const { channels: walletChannels } = useWallet();

    const urlParams = useMemo(
        () => parseQueryString(searchParams?.toString() || ''),
        [searchParams]
    );

    const tempId = urlParams.tempid || '';
    const whatsappNo = urlParams.whatsappNo || '';
    const wabaIdParam = urlParams.wabaid || '';
    const channelId = urlParams.channelId || '';

    const wabaId = useMemo(() => {
        if (wabaIdParam) return wabaIdParam;
        if (tempId || whatsappNo) {
            const ch = walletChannels?.find(
                (c) =>
                    (tempId && String(c.Id) === tempId) ||
                    (whatsappNo && c.mobileNumber === whatsappNo)
            );
            if (ch?.wabaId) return String(ch.wabaId);
        }
        if (channelId) return channelId;
        // Auto-select when only one channel is connected
        if (walletChannels?.length === 1) {
            const only = walletChannels[0];
            return String(only?.wabaId || only?.WabaId || only?.Id || '');
        }
        return '';
    }, [wabaIdParam, tempId, whatsappNo, walletChannels, channelId]);

    return { wabaId, tempId, whatsappNo, channelId, urlParams };
};
