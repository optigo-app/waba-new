'use client';

import { getApiBaseUrl, getHeaders, AUTOMATION_LIST, AUTOMATION_UPLOAD, AUTOMATION_DELETE } from './Config';
import { getToken } from '../utils/storage';
import { getDecodedSession } from '../utils/session';

const getCompanyCode = () => {
    const token = getToken();
    const session = getDecodedSession();
    return token?.companycode || token?.CompanyCode || session?.companycode || session?.cc || '';
};

/**
 * Fetch the list of automation flows from the backend.
 * @returns {Promise<object>} Backend response with `files` array
 */
export async function fetchAutomationList() {
    const headers = getHeaders();
    const companyCode = getCompanyCode();

    const forwardHeaders = { 'Content-Type': 'application/json' };
    if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
    if (headers?.sp) forwardHeaders['sp'] = headers.sp;
    if (headers?.Version) forwardHeaders['version'] = headers.Version;
    if (headers?.sv) forwardHeaders['sv'] = headers.sv;

    const res = await fetch(AUTOMATION_LIST(), {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ company: companyCode || '' }),
    });

    let data;
    try {
        data = await res.json();
    } catch {
        data = { raw: await res.text() };
    }

    if (!res.ok) {
        throw new Error(data?.message || data?.error || `Backend returned ${res.status}`);
    }

    return data;
}

/**
 * Upload frontend + backend flow JSON to the backend.
 * @param {object} frontendJson - Frontend flow definition
 * @param {object} backendJson - Backend compiled flow
 * @param {string} flowName - Name of the flow
 * @returns {Promise<object>} Upload response with frontendUrl/backendUrl
 */
export async function uploadAutomationFlow(frontendJson, backendJson, flowName) {
    const headers = getHeaders();
    const companyCode = getCompanyCode();

    const formData = new FormData();

    if (backendJson) {
        const backendContent = JSON.stringify(backendJson, null, 2);
        const backendFile = new File([backendContent], `${flowName}.backend.json`, { type: 'application/json' });
        formData.append('backend', backendFile);
    }

    if (frontendJson) {
        const frontendContent = JSON.stringify(frontendJson, null, 2);
        const frontendFile = new File([frontendContent], `${flowName}.frontend.json`, { type: 'application/json' });
        formData.append('frontend', frontendFile);
    }

    formData.append('flowName', flowName);
    formData.append('company', companyCode || '');

    const forwardHeaders = {};
    if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
    if (headers?.sp) forwardHeaders['sp'] = headers.sp;
    if (headers?.Version) forwardHeaders['version'] = headers.Version;
    if (headers?.sv) forwardHeaders['sv'] = headers.sv;

    const res = await fetch(AUTOMATION_UPLOAD(), {
        method: 'POST',
        headers: forwardHeaders,
        body: formData,
    });

    let data;
    try {
        data = await res.json();
    } catch {
        data = { raw: await res.text() };
    }

    if (!res.ok) {
        throw new Error(data?.message || data?.error || `Backend returned ${res.status}`);
    }

    return data;
}

/**
 * Delete an automation flow on the backend.
 * @param {object} params
 * @param {string} params.appuserid - App user id (email)
 * @param {number|string} params.FlowId - Numeric backend flow id
 * @param {number|string} params.AccountId - Channel account id
 * @returns {Promise<object>} Delete response
 */
export async function deleteAutomationFlow({ appuserid, FlowId, AccountId }) {
    const headers = getHeaders();

    const forwardHeaders = { 'Content-Type': 'application/json' };
    if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
    if (headers?.sp) forwardHeaders['sp'] = headers.sp;
    if (headers?.Version) forwardHeaders['version'] = headers.Version;
    if (headers?.sv) forwardHeaders['sv'] = headers.sv;

    const res = await fetch(AUTOMATION_DELETE(), {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({
            appuserid: appuserid || '',
            FlowId: FlowId || '',
            AccountId: AccountId || '',
        }),
    });

    let data;
    try {
        data = await res.json();
    } catch {
        data = { raw: await res.text() };
    }

    if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || `Backend returned ${res.status}`);
    }

    return data;
}

/**
 * Fetch a flow JSON file from the backend.
 * @param {string} fileUrl - Full URL or relative path to the flow file
 * @returns {Promise<object>} Parsed JSON content of the flow file
 */
export async function fetchAutomationFile(fileUrl) {
    const apiUrl = getApiBaseUrl();
    const headers = getHeaders();

    const targetUrl = fileUrl.startsWith('http')
        ? fileUrl
        : `${apiUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;

    const forwardHeaders = {};
    if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
    if (headers?.sp) forwardHeaders['sp'] = headers.sp;
    if (headers?.Version) forwardHeaders['version'] = headers.Version;
    if (headers?.sv) forwardHeaders['sv'] = headers.sv;

    const res = await fetch(targetUrl, { headers: forwardHeaders });
    const text = await res.text();

    if (!res.ok) {
        throw new Error(`Failed to fetch file: ${res.status}`);
    }

    return JSON.parse(text);
}
