
import { useAuthStore } from '../store/authStore';

/**
 * Build a static asset URL that respects redirect_version on production.
 * @param {string} path - e.g. '/bg-3.jpg' or '/waba_logo.png'
 * @returns {string} Full absolute URL
 */
export const getStaticUrl = (path) => {
    if (typeof window === 'undefined') return path;
    const auth = useAuthStore.getState().auth;
    const isLocalhost = window.location.origin.includes('localhost');
    const basePath = isLocalhost ? '' : (auth?.redirect_version || '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${basePath}${cleanPath}`;
};

const hashString = (value) => {
    const str = String(value ?? '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const getInitials = (name) => {
    const cleaned = String(name ?? '').trim();
    if (!cleaned) return '?';

    const numeric = cleaned.replace(/\D/g, '');
    if (numeric && numeric.length >= 2) return numeric.slice(-2);

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

export const getSoftAvatarColors = (seed) => {
    const h = hashString(seed) % 360;
    const s = 45 + (hashString(`${seed}-s`) % 11);
    const l = 86 + (hashString(`${seed}-l`) % 8);

    const fgS = Math.min(72, s + 18);
    const fgL = 26 + (hashString(`${seed}-fg`) % 10);

    return {
        bg: `hsl(${h}, ${s}%, ${l}%)`,
        fg: `hsl(${h}, ${fgS}%, ${fgL}%)`,
    };
};

export const hasCustomerName = (customer) => {
    const name = customer?.CustomerName;
    return Boolean(String(name ?? '').trim());
};

export const getCustomerDisplayName = (customer) => {
    const name = String(customer?.CustomerName ?? '').trim();
    if (name) return name;

    const phone = String(customer?.CustomerPhone ?? '').trim();
    if (phone) return phone;

    const fallback = String(customer?.name ?? '').trim();
    if (fallback) return fallback;

    return 'Unknown';
};

export const getCustomerAvatarSeed = (customer) => {
    const name = String(customer?.CustomerName ?? '').trim();
    if (name) return name;

    const phone = String(customer?.CustomerPhone ?? '').trim();
    if (phone) return phone;

    return String(customer?.name ?? '').trim();
};

export const getWhatsAppAvatarConfig = (name, size = 40) => {
    const cleaned = String(name ?? '').trim();
    const { bg, fg } = getSoftAvatarColors(cleaned || 'unknown');

    return {
        sx: {
            bgcolor: bg,
            color: fg,
            width: size,
            height: size,
            fontSize: Math.max(14, Math.round(size * 0.4)),
            fontWeight: 600,
        },
        children: getInitials(cleaned),
    };
};

export const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC', // remove if you want IST
    });
};

export const previewBg = {
    backgroundImage:
        'linear-gradient(rgba(249, 250, 251, 0.30), rgba(249, 250, 251, 0.80)), url(/bg-3.jpg)',
};


export function normalizePhoneNumber(input, defaultCountryCode = "91") {
    let phone = input.replace(/[+\-\s()]/g, "");
    let hasCountryCode = /^\d{1,3}\d{10}$/.test(phone);
    if (!hasCountryCode) {
        phone = phone.replace(/^0+/, "");
        phone = defaultCountryCode + phone;
    }
    if (!/^\d{10,15}$/.test(phone)) {
        console.error(`❌ Invalid phone number: ${input}`);
        return null;
    }
    return phone;
}

export const MESSAGE_STATUS_MAPPING = {
    0: { label: 'Pending', color: '#f59e0b' },
    1: { label: 'Sent', color: '#3b82f6' },
    2: { label: 'Delivered', color: '#10b981' },
    3: { label: 'Read', color: '#8b5cf6' },
    4: { label: 'Failed', color: '#ef4444' },
    5: { label: 'Replied', color: '#06b6d4' }
};

export const getMessageStatus = (status) => {
    return MESSAGE_STATUS_MAPPING[status] || { label: 'Unknown', color: '#6b7280' };
};


export const formatMobileNumber = (mobileNo = "") => {
    const digits = mobileNo.toString().replace(/\D/g, "");
    if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
};
export const checkImageUrlValid = (url, timeoutMs = 7000) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') {
            resolve(false);
            return;
        }

        const img = new Image();
        let done = false;

        const complete = (isValid) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            img.onload = null;
            img.onerror = null;
            resolve(isValid);
        };

        const timer = setTimeout(() => complete(false), timeoutMs);
        img.onload = () => complete(true);
        img.onerror = () => complete(false);
        img.src = url;
    });
};

export const checkVideoUrlValid = (url, timeoutMs = 7000) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') {
            resolve(false);
            return;
        }

        let done = false;

        const complete = (isValid) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(isValid);
        };

        const timer = setTimeout(() => complete(false), timeoutMs);

        fetch(url, { method: 'HEAD', mode: 'no-cors' })
            .then(() => complete(true))
            .catch(() => complete(false));
    });
};

export const getInvalidImageUrls = async (urls = [], timeoutMs = 7000) => {
    const uniqueUrls = Array.from(new Set((urls || []).filter(Boolean)));
    const results = await Promise.all(
        uniqueUrls.map(async (u) => ({
            url: u,
            valid: await checkImageUrlValid(u, timeoutMs),
        }))
    );

    return results.filter((item) => !item.valid).map((item) => item.url);
};


export const normalizeMobileNumber = (rawMobile = '') => {
  if (!rawMobile) return '';

  let digits = String(rawMobile).replace(/\D/g, '');

  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return '91' + digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  return '';
};


