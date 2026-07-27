import {
    TEMPLATE_CREATE,
    TEMPLATE_DELETE,
    TEMPLATE_EDIT,
    TEMPLATE_PUBLISH,
    TEMPLATE_SYNC,
    getTemplateBaseUrl,
} from "./Config";
import { postJson } from "./postJson";

/**
 * Fetch template details by name from Meta API.
 * @param {string} templateName - Name of the template to fetch
 * @param {Object} creds - { whatsappPhoneNo, whatsappKey, isMeta }
 * @returns {Promise<Object|null>} - Template data object or null
 */
export const fetchTemplateByName = async (templateName, creds = {}) => {
    const phoneNo = creds?.whatsappPhoneNo || creds?.whatsappNumber;
    const apiKey = creds?.whatsappKey;
    if (!phoneNo || !apiKey || !templateName) return null;

    try {
        const baseUrl = getTemplateBaseUrl(creds?.isMeta);
        const url = `${baseUrl}/${phoneNo}/message_templates?name=${encodeURIComponent(templateName)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data?.data?.[0] || null;
    } catch (err) {
        console.error(`fetchTemplateByName error (${templateName}):`, err);
        return null;
    }
};

/**
 * Fetch multiple templates by name from Meta API.
 * @param {Array} templateNames - Array of template names
 * @param {Object} creds - { whatsappPhoneNo, whatsappKey, isMeta }
 * @returns {Promise<Array>} - Array of fetched template objects
 */
export const fetchTemplatesByName = async (templateNames = [], creds = {}) => {
    if (!Array.isArray(templateNames) || templateNames.length === 0) return [];
    const fetched = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < templateNames.length; i += CONCURRENCY) {
        const batch = templateNames.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            batch.map((tName) => fetchTemplateByName(tName, creds))
        );
        results.forEach((template) => {
            if (template) fetched.push(template);
        });
    }
    return fetched;
};

export const createTemplate = async (payload) => {
    try {
        const data = await postJson(TEMPLATE_CREATE(), {
            ...payload,
            IsDraft: payload.IsDraft ?? 0,
        });
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("createTemplate Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};

export const deleteTemplate = async (payload) => {
    try {
        const data = await postJson(TEMPLATE_DELETE(), payload);
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("deleteTemplate Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};

export const editTemplate = async (payload) => {
    try {
        const data = await postJson(TEMPLATE_EDIT(), payload);
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("editTemplate Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};

export const publishTemplate = async (payload) => {
    try {
        const data = await postJson(TEMPLATE_PUBLISH(), payload);
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("publishTemplate Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};

export const sendTemplate = async (payload) => {
    try {
        const data = await postJson(TEMPLATE_TESTSEND(), payload);
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("sendTemplate Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};

export const syncTemplates = async (payload) => {
    try {
        const data = await postJson(TEMPLATE_SYNC(), payload);
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("syncTemplates Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};
