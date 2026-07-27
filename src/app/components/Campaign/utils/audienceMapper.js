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
        CountryCode: item.CountryCode || '',
        Country: item.Country || '',
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
    return [];
};
