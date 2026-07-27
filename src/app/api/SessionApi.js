import { callCommonApi } from "./CommonApi";
import { cleanSessionFromUrl, clearSessionCache } from "../utils/session";

export const initSession = async (decodedSession) => {
    console.log('[SessionAPI] initSession called with:', decodedSession);

    if (!decodedSession?.appuserid) {
        console.error('[SessionAPI] Missing appuserid in decoded session');
        return { success: false, error: 'Invalid session data' };
    }

    try {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        console.log('[SessionAPI] isLoggedIn in sessionStorage:', isLoggedIn);

        if (isLoggedIn === 'true') {
            console.log('[SessionAPI] Already logged in — skipping API call');
            return { success: true, data: null, skipped: true };
        }

        const apiParams = {
            mode: "crm_redirect",
            f: "crm_redirect",
            p: "",
            userId: decodedSession.appuserid,
        };
        console.log('[SessionAPI] Calling callCommonApi with params:', apiParams);
        const response = await callCommonApi(apiParams);

        if (!response) {
            console.error('[SessionAPI] No response from server');
            return { success: false, error: 'No response from server' };
        }

        const sessionRes = response?.Data?.rd[0];
        const permision = response?.Data?.rd1;

        if (!sessionRes) {
            console.error('[SessionAPI] Invalid session response — no rd[0]');
            return { success: false, error: 'Invalid session response' };
        }

        const resData = {
            ...sessionRes,
            userId: sessionRes?.userId ?? sessionRes?.userid ?? sessionRes?.appuserid ?? decodedSession?.appuserid,
            username: sessionRes?.username ?? sessionRes?.userName ?? sessionRes?.userid ?? sessionRes?.appuserid ?? decodedSession?.appuserid,
            id: sessionRes?.id ?? sessionRes?.Id ?? decodedSession?.id,
        };
        console.log('[SessionAPI] resData:', resData);

        const socketState = {
            token: resData.token,
        }
        sessionStorage.setItem('token', JSON.stringify(resData));
        sessionStorage.setItem('socketState', JSON.stringify(socketState));
        sessionStorage.setItem('userPermissions', JSON.stringify(permision));
        sessionStorage.setItem('isLoggedIn', 'true');

        cleanSessionFromUrl();
        clearSessionCache();

        return { success: true, data: resData, permissions: permision };
    } catch (error) {
        console.error('[SessionAPI] API error:', error);
        return { success: false, error: error.message };
    }
};
