import {
    TEMPLATE_CREATE,
    TEMPLATE_DELETE,
    TEMPLATE_DETAILS,
    TEMPLATE_EDIT,
    TEMPLATE_PUBLISH,
    TEMPLATE_SYNC,
} from "./Config";
import { postJson } from "./postJson";

/**
 * Fetch a single template's details by name from backend API.
 * @param {string} templateName - Name of the template to fetch
 * @param {Object} opts - { wabaid }
 * @returns {Promise<Object|null>} - Template data object or null
 */
export const fetchTemplateByName = async (templateName, opts = {}) => {
    const wabaid = opts?.wabaid || '';
    if (!templateName) return null;

    try {
        const data = await postJson(
            TEMPLATE_DETAILS(),
            { TemplateName: templateName },
            undefined,
            { wabaid }
        );
        // Backend may return Meta-shaped { data: [templateObj] } or the template object directly
        return data?.data?.[0] || data?.data || data || null;
    } catch (err) {
        console.error(`fetchTemplateByName error (${templateName}):`, err);
        return null;
    }
};

/**
 * Fetch multiple templates by name from backend API.
 * @param {Array} templateNames - Array of template names
 * @param {Object} opts - { wabaid }
 * @returns {Promise<Array>} - Array of fetched template objects
 */
export const fetchTemplatesByName = async (templateNames = [], opts = {}) => {
    if (!Array.isArray(templateNames) || templateNames.length === 0) return [];
    const fetched = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < templateNames.length; i += CONCURRENCY) {
        const batch = templateNames.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            batch.map((tName) => fetchTemplateByName(tName, opts))
        );
        results.forEach((template) => {
            if (template) fetched.push(template);
        });
    }
    return fetched;
};

export const createTemplate = async (payload, wabaid = '') => {
    try {
        const data = await postJson(TEMPLATE_CREATE(), {
            ...payload,
            IsDraft: payload.IsDraft ?? 0,
        }, undefined, { wabaid });
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

export const deleteTemplate = async (payload, wabaid = '') => {
    try {
        const data = await postJson(TEMPLATE_DELETE(), payload, undefined, { wabaid });
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

export const editTemplate = async (payload, wabaid = '') => {
    try {
        const data = await postJson(TEMPLATE_EDIT(), payload, undefined, { wabaid });
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

export const publishTemplate = async (payload, wabaid = '') => {
    try {
        const data = await postJson(TEMPLATE_PUBLISH(), payload, undefined, { wabaid });
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

export const syncTemplates = async (payload, wabaid = '') => {
    try {
        const data = await postJson(TEMPLATE_SYNC(), payload, undefined, { wabaid });
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
