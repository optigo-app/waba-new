'use client';

import { callCommonApi } from './CommonApi';
import { PROFILE_UPDATE, getHeaders, getApiBaseUrl } from './Config';

export const fetchWabaCategories = async (userId, signal) => {
    try {
        const result = await callCommonApi({
            mode: 'get_waba_category',
            f: 'Profile ( get Whatsapp Category)',
            userId,
            signal,
        });

        if (result?.Status === '200' && Array.isArray(result?.Data?.rd)) {
            return result.Data.rd.map((item) => ({
                id: item.Id,
                code: item.CategoryCode,
                name: item.CategoryName,
            }));
        }

        return [];
    } catch (error) {
        if (error.name === 'AbortError') return [];
        console.error('Error fetching WABA categories:', error);
        return [];
    }
};

export const fetchWabaProfile = async ({ userId, accountId, companyCode, signal }) => {
    try {
        const headers = getHeaders();
        const response = await fetch(`${getApiBaseUrl()}/whatsapp/profile/details`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                sp: headers.sp || '16',
                sv: headers.sv || '0',
                version: headers.Version || 'v4',
                yearcode: headers.Yearcode || '',
            },
            body: JSON.stringify({
                appuserid: userId || '',
                AccountId: Number(accountId) || 1,
                companycode: companyCode || '',
            }),
            ...(signal ? { signal } : {}),
        });

        if (!response.ok) {
            console.error('WABA profile fetch error:', response.statusText);
            return null;
        }

        const result = await response.json();

        // New format: { success, message, data: { address, description, profile_picture_url, websites[], vertical, ... } }
        if (result?.success && result?.data) {
            const d = result.data;
            const websites = Array.isArray(d.websites)
                ? d.websites.filter(Boolean)
                : (typeof d.websites === 'string'
                    ? d.websites.split(',').map((w) => w.trim()).filter(Boolean)
                    : []);

            return {
                logo: d.profile_picture_url || '',
                email: d.email || '',
                category: d.vertical || '',
                address: d.address || '',
                about: d.about || '',
                description: d.description || '',
                websites,
                companyId: d.company_id || d.companyId || null,
                channelId: d.channel_id || d.channelId || null,
            };
        }

        // Legacy format: { Status: '200', Data: { rd: [...] } }
        if (result?.Status === '200' && Array.isArray(result?.Data?.rd)) {
            const row = result.Data.rd[0];
            if (!row) return null;

            let websites = '';
            try {
                const parsed = JSON.parse(row.Website || '[]');
                websites = Array.isArray(parsed) ? parsed.join(', ') : String(row.Website || '');
            } catch {
                websites = String(row.Website || '');
            }

            return {
                logo: row.ProfilePictureUrl || '',
                email: row.BusinessEmail || '',
                category: row.BusinessCategory || '',
                address: row.BusinessAddress || '',
                about: row.About || '',
                description: row.BusinessDescription || '',
                websites,
                companyId: row.CompanyId,
                channelId: row.ChannelId,
            };
        }

        return null;
    } catch (error) {
        if (error.name === 'AbortError') return null;
        console.error('Error fetching WABA profile:', error);
        return null;
    }
};

export const updateWabaProfile = async ({ profile, logoFile, channel, userId }) => {
    try {
        const formData = new FormData();

        if (logoFile) {
            formData.append('file', logoFile);
        }

        formData.append('about', profile.about || '');
        formData.append('description', profile.description || '');
        formData.append('address', profile.address || '');
        formData.append('email', profile.email || '');
        formData.append('vertical', profile.category || '');
        formData.append('websites', Array.isArray(profile.websites) ? profile.websites.filter(Boolean).join(', ') : (profile.websites || ''));
        formData.append('channelid', String(channel?.channelId || channel?.ChannelId || 1));
        formData.append('companycode', channel?.companyCode || '');
        formData.append('appuserid', userId || '');

        const headers = getHeaders();
        delete headers['Content-Type'];

        const response = await fetch(PROFILE_UPDATE(), {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || response.statusText);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating WABA profile:', error);
        throw error;
    }
};
