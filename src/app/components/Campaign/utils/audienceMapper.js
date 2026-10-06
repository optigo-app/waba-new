// CRM API returns CountryCode as a tuple — [91, "India"] — not a scalar.
// Normalize to just the dialing code wherever it appears.
export const getCountryCodeValue = (value) => {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
};

// Tuple's second element is the country name — use it when Country is missing.
export const getCountryNameValue = (value, country) => {
    if (country) return country;
    if (Array.isArray(value)) return value[1] ?? '';
    return '';
};

// 'optigo' is the backend name for CRM-sourced contacts — users see "CRM".
export const getSourceLabel = (source) => {
    const s = String(source || '').toLowerCase();
    if (s === 'excel' || s === 'csv') return 'Excel';
    return 'CRM';
};

export const mapAudienceData = (items = []) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
        CustomerId: item.CustomerId || item.MessageId || '',
        CustomerCode: item.CustomerCode || item.CustomerId || '',
        CustomerName: item.CustomerName || item.FirstName || '',
        CompanyType: item.CompanyType || item.Company || '',
        CustomerEmail: item.CustomerEmail || item.Email || '',
        CustomerPhone: item.CustomerPhone || item.PhoneNo || '',
        PhoneNo: item.PhoneNo || item.CustomerPhone || '',
        Email: item.Email || item.CustomerEmail || '',
        CountryCode: getCountryCodeValue(item.CountryCode),
        Country: getCountryNameValue(item.CountryCode, item.Country),
        State: item.State || '',
        City: item.City || '',
        Company: item.Company || item.CompanyType || '',
        CustomerType: item.CustomerType || '',
        Category: item.Category || '',
        FirstName: item.FirstName || '',
        LastName: item.LastName || '',
        Source: item.DataSource || item.Source || 'optigo'
    }));
};

export const extractAudienceFromResponse = (data) => {
    if (!data) return [];
    if (data.rd3 && data.rd3.length > 0) return mapAudienceData(data.rd3);
    if (data.rd2 && data.rd2.length > 0) return mapAudienceData(data.rd2);
    if (data.rd && data.rd.length > 0) return mapAudienceData(data.rd);
    return [];
};
