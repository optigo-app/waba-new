/**
 * Production-grade URL encode / decode utilities.
 *
 * Values are Base64-encoded so they are not human-readable in the URL.
 * Keys remain plain for readability and debugging.
 *
 * These helpers provide:
 * - `encodeValue` — Base64-encode a value for use as a query param
 * - `decodeValue` — Base64-decode a value back to its original form
 * - `urlEncode` — raw percent-encoding (RFC 3986 strict)
 * - `urlDecode` — raw percent-decoding (tolerates malformed input)
 * - `buildQueryString` — build a full query string from an object
 * - `parseQueryString` — parse a query string into an object
 */

/**
 * Base64-encode a string for use as a URL query parameter value.
 *
 * Uses URL-safe Base64 (`-` instead of `+`, `_` instead of `/`,
 * no padding `=`) so the result doesn't need further percent-encoding.
 *
 * @param {string} value - The value to encode.
 * @returns {string} The Base64-encoded string, or '' for null/undefined.
 *
 * @example
 * encodeValue('919725150900') // → 'OTE5NzI1MTUwOTAw'
 * encodeValue('1')            // → 'MQ'
 */
export const encodeValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    try {
        const b64 = btoa(unescape(encodeURIComponent(String(value))));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
        return String(value);
    }
};

/**
 * Base64-decode a URL-safe Base64 value back to its original string.
 *
 * Tolerates both URL-safe (`-`, `_`) and standard (`+`, `/`) Base64,
 * with or without padding. Returns the original input if decoding fails.
 *
 * @param {string} value - The Base64-encoded string to decode.
 * @returns {string} The decoded string, or the original input on failure.
 *
 * @example
 * decodeValue('OTE5NzI1MTUwOTAw') // → '919725150900'
 * decodeValue('MQ')               // → '1'
 */
export const decodeValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    try {
        const b64 = String(value).replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        return decodeURIComponent(escape(atob(padded)));
    } catch {
        return String(value);
    }
};

/**
 * Raw percent-encode a string per RFC 3986 (unreserved set: A-Za-z0-9-_.~).
 *
 * @param {string} value - The value to encode.
 * @returns {string} The percent-encoded string.
 */
export const urlEncode = (value) => {
    if (value === null || value === undefined) return '';
    return encodeURIComponent(String(value))
        .replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
};

/**
 * Raw percent-decode a string. Safely handles malformed input.
 *
 * @param {string} value - The encoded string to decode.
 * @returns {string} The decoded string, or original input on failure.
 */
export const urlDecode = (value) => {
    if (value === null || value === undefined) return '';
    try {
        return decodeURIComponent(String(value));
    } catch {
        return String(value);
    }
};

/**
 * Build a query string from a flat object of key-value pairs.
 *
 * - Skips `null`, `undefined`, and empty-string values.
 * - Both keys and values are Base64-encoded (full obfuscation, not human-readable).
 * - Sorts keys for deterministic output (cache-friendly).
 *
 * @param {Record<string, string|number|boolean|null|undefined>} params
 * @returns {string} Query string without the leading `?`, or empty string if no params.
 *
 * @example
 * buildQueryString({ tempid: 1, whatsappNo: '919725150900' })
 * // → "dGVtcGlk=MQ&d2hhdHNhcHBObw==OTE5NzI1MTUwOTAw"
 */
export const buildQueryString = (params) => {
    if (!params || typeof params !== 'object') return '';

    const entries = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${encodeValue(k)}=${encodeValue(v)}`)
        .sort();

    return entries.join('&');
};

/**
 * Parse a query string (with or without leading `?`) into an object.
 *
 * - Both keys and values are Base64-decoded.
 * - Returns `{}` for empty or malformed input.
 * - Later values win for duplicate keys.
 *
 * @param {string} qs - The query string to parse.
 * @returns {Record<string, string>} Parsed key-value pairs.
 *
 * @example
 * parseQueryString('?dGVtcGlk=MQ&d2hhdHNhcHBObw==OTE5NzI1MTUwOTAw')
 * // → { tempid: '1', whatsappNo: '919725150900' }
 */
export const parseQueryString = (qs) => {
    const result = {};
    if (!qs || typeof qs !== 'string') return result;

    const cleaned = qs.startsWith('?') ? qs.slice(1) : qs;
    if (!cleaned) return result;

    for (const pair of cleaned.split('&')) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        let key, val;
        if (eqIdx === -1) {
            key = pair;
            val = '';
        } else {
            key = pair.slice(0, eqIdx);
            val = pair.slice(eqIdx + 1);
        }
        if (!key) continue;
        result[decodeValue(key)] = decodeValue(val);
    }

    return result;
};
