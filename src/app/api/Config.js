'use client';

import { getDecodedSession } from '../utils/session';
import { getToken } from '../utils/storage';

export const getEnvFlags = () => {
    if (typeof window === "undefined") return { isLocal: false, isNxt: false, isLocalWeb: false };
    const hostname = window.location.hostname;
    return {
        isLocal: ['localhost','5dmjw0dg-2000.inc1.devtunnels.ms'].includes(hostname),
        isNxt: hostname.startsWith('nxt') && hostname.endsWith('.optigoapps.com'),
        isLocalWeb: ["waba.web"].includes(hostname),
    };
};

export const getApiBaseUrl = () => {
    const { isLocal, isNxt, isLocalWeb } = getEnvFlags();

    return isLocal
        ? process.env.NEXT_PUBLIC_API_DEVELOPMENT_URL
        : isLocalWeb
            ? process.env.NEXT_PUBLIC_API_WEB_DEVELOPMENT_URL
            : isNxt
                ? process.env.NEXT_PUBLIC_API_NXT_PRODUCTION_URL
                : process.env.NEXT_PUBLIC_API_PRODUCTION_URL;
};

export const getSocketURL = () => {
    const { isLocal, isNxt, isLocalWeb } = getEnvFlags();
    return isLocal
        ? process.env.NEXT_PUBLIC_SOCKET_DEVELOPMENT_URL
        : isLocalWeb
            ? process.env.NEXT_PUBLIC_SOCKET_WEB_DEVELOPMENT_URL
            : isNxt
                ? process.env.NEXT_PUBLIC_SOCKET_NXT_PRODUCTION_URL
                : process.env.NEXT_PUBLIC_SOCKET_PRODUCTION_URL;
};

const Image_upload_url = process.env.NEXT_PUBLIC_IMAGE_UPLOAD;

export const getUploadBaseUrl = () => {
    const { isLocal, isNxt, isLocalWeb } = getEnvFlags();

    const envUrl = (isLocal || isLocalWeb)
        ? process.env.NEXT_PUBLIC_UPLOAD_LOCAL
        : isNxt
            ? process.env.NEXT_PUBLIC_UPLOAD_NXT
            : process.env.NEXT_PUBLIC_UPLOAD_PRODUCTION;

    return envUrl || Image_upload_url || 'https://nxt22.optigoapps.com/api';
};

export const APIURL = () => `${getApiBaseUrl()}/report`;
export const LOGOUTAPI = () => `${getApiBaseUrl()}/whatsapp/chat/logout`;
export const MESSAGEAPIURL = () => `${getApiBaseUrl()}/whatsapp/chat/send`;
export const MESSAGEAPIURLBULK = () => `${getApiBaseUrl()}/whatsapp/chat/send-bulk`;
export const MEDIARETRIEVED = () => `${getApiBaseUrl()}/whatsapp/media/retrieved`;
export const READAPI = () => `${getApiBaseUrl()}/whatsapp/chat/read`;

export const TEMPLATE_CREATE = () => `${getApiBaseUrl()}/whatsapp/templates/manage/create`;
export const TEMPLATE_DELETE = () => `${getApiBaseUrl()}/whatsapp/templates/manage/delete`;
export const TEMPLATE_EDIT = () => `${getApiBaseUrl()}/whatsapp/templates/manage/edit`;
export const TEMPLATE_PUBLISH = () => `${getApiBaseUrl()}/whatsapp/templates/manage/publish`;
export const TEMPLATE_SYNC = () => `${getApiBaseUrl()}/whatsapp/templates/manage/sync`;
export const TEMPLATE_DETAILS = () => `${getApiBaseUrl()}/whatsapp/templates/manage/details`;
export const TEMPLATE_TESTSEND = () => `${getApiBaseUrl()}/whatsapp/templates/send`;

export const TEMPLATE_MD_UPLOAD = () => `${getApiBaseUrl()}/whatsapp/media/upload`;

export const EXCELIMPORT = `${getApiBaseUrl()}/whatsapp/brodcast/excel-import`;
export const SENDBULK = `${getApiBaseUrl()}/whatsapp/brodcast/send-bulk`;

export const ONBOARDING = `${getApiBaseUrl()}/whatsapp/onboarding/exchange-token`;

export const PROFILE_UPDATE = () => `${getApiBaseUrl()}/whatsapp/profile/update`;

export const AUTOMATION_LIST = () => `${getApiBaseUrl()}/whatsapp/automation/list`;
export const AUTOMATION_UPLOAD = () => `${getApiBaseUrl()}/whatsapp/automation/upload`;
export const AUTOMATION_DELETE = () => `${getApiBaseUrl()}/whatsapp/automation/delete`;

export const UPLOADFILE = () => `${getUploadBaseUrl()}/upload`;
export const REMOVE_FILE_URL = () => `${getUploadBaseUrl()}/removefile`;

const getAuthData = () => {
    try {
        return getToken();
    } catch (error) {
        console.error("Error parsing AuthData:", error);
        return null;
    }
};

export const getHeaders = (init = {}) => {
    const decodedSession = getDecodedSession();
    const { version = 'v4', token = "", wabaid = "", overrides = {} } = init;
    const AuthData = getAuthData();
    const bearerToken = token || AuthData?.token || '';

    return {
        Authorization: `Bearer ${bearerToken}`,
        Yearcode: (AuthData?.yc ?? AuthData?.yearcode) ?? decodedSession?.yc ?? "",
        whatsappNumber: AuthData?.whatsappNumber || decodedSession?.whatsappNumber || "",
        Version: (AuthData?.cuver ?? decodedSession?.cuver) ?? version ?? 'v2',
        sv: (AuthData?.sv ?? AuthData?.svid) ?? decodedSession?.sv ?? "1",
        sp: "16",
        ...(wabaid ? { Wabaid: wabaid } : {}),
        ...overrides,
    };
};

export const getHeaders1 = (overrides = {}) => {
    const userToken = getToken();
    const version = "v4";
    return {
        Yearcode: userToken?.yc || userToken?.yearcode,
        sv: userToken?.svid || userToken?.sv,
        Version: version,
        sp: "16",
        wabaphoneno: userToken?.whatsappPhoneNo || "",
        ...overrides,
    };
};

// WhatsApp Graph API template base URLs
export const META_TEMPLATE_BASE_URL = process.env.NEXT_PUBLIC_META_TEMP_BASE_URL || 'https://graph.facebook.com/v18.0';
export const MPL_TEMPLATE_BASE_URL = process.env.NEXT_PUBLIC_MPL_TEMP_BASE_URL || 'https://graph.facebook.com/v18.0';

export const getTemplateBaseUrl = (isMeta = 0) => {
    return isMeta == 1 ? META_TEMPLATE_BASE_URL : MPL_TEMPLATE_BASE_URL;
};
