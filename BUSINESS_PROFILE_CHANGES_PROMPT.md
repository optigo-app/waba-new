    # Business Profile & Channel Card — Implementation Prompt

    Use this prompt to replicate all Business Profile and Channel Card changes in another project.

    ---

    ## Context

    The WhatsApp Business Profile management and Channel Card display need to follow Meta's API rules (character limits, URL format, email format), support a new API response format, and show richer channel info (profile picture, WhatsApp name, mobile number).

    **Meta docs reference:** https://developers.facebook.com/docs/whatsapp/cloud-api/reference/business-profiles/

    ---

    ## 1. API Layer — `BusinessProfileApi.js`

    ### `fetchWabaProfile` — support new response format

    The API now returns a new format. Update `fetchWabaProfile` to check for the new format first, then fall back to the legacy format.

    **New API response format:**
    ```json
    {
        "success": true,
        "message": "WhatsApp Business profile details retrieved successfully.",
        "data": {
            "address": "...",
            "description": "...",
            "profile_picture_url": "https://pps.whatsapp.net/...",
            "websites": ["https://optigoapps.com/"],
            "vertical": "PROF_SERVICES",
            "messaging_product": "whatsapp"
        }
    }
    ```

    **Legacy API response format:**
    ```json
    {
        "Status": "200",
        "Data": { "rd": [{ "ProfilePictureUrl": "...", "BusinessEmail": "...", ... }] }
    }
    ```

    **Implementation — after `const result = await response.json();`:**

    ```js
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
    ```

    **Key field mapping (new format):**
    | API field | Returned field |
    |---|---|
    | `profile_picture_url` | `logo` |
    | `vertical` | `category` |
    | `address` | `address` |
    | `description` | `description` |
    | `websites` (array) | `websites` (normalized to array) |
    | `email` | `email` |
    | `about` | `about` |

    ---

    ## 2. Business Profile Component — `BusinessProfile.js`

    ### 2.1 Add Meta character limit constants

    Per Meta docs, add these constants near the top of the file (after `EMPTY_PROFILE`):

    ```js
    // WhatsApp Business Profile limits (per Meta docs)
    const MAX_WEBSITES = 2;
    const MAX_WEBSITE_LENGTH = 256;
    const MAX_ABOUT_LENGTH = 139;
    const MAX_ADDRESS_LENGTH = 256;
    const MAX_DESCRIPTION_LENGTH = 512;
    const MAX_EMAIL_LENGTH = 128;
    ```

    **Meta limits reference:**
    | Field | Max Length |
    |---|---|
    | `about` | 139 chars |
    | `address` | 256 chars |
    | `description` | 512 chars |
    | `email` | 128 chars |
    | `websites` | 2 entries, 256 chars each |

    ### 2.2 Add URL and email validation

    ```js
    // Meta requires http:// or https:// prefix on website URLs
    const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
    const isValidWebsiteUrl = (url) => !url || URL_PATTERN.test(url);

    // Meta requires valid email format
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = (email) => !email || EMAIL_PATTERN.test(email);
    ```

    Both validators allow empty values (fields are optional).

    ### 2.3 Add `hasErrors` computed value

    Add after `hasChanges`:

    ```js
    const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(savedData) ||
        logoPreview !== savedLogo;

    // Validation errors — block update when any field is invalid
    const hasErrors = (() => {
        if (formData.email && !isValidEmail(formData.email)) return true;
        if ((formData.websites || []).some((w) => w && !isValidWebsiteUrl(w))) return true;
        return false;
    })();
    ```

    ### 2.4 Disable Update button when errors exist

    ```jsx
    <Button
        variant="contained"
        onClick={handleUpdateClick}
        disabled={!hasChanges || hasErrors}
        startIcon={<CheckCircle2 size={18} />}
        className={styles.updateBtn}
    >
        Update
    </Button>
    ```

    ### 2.5 Apply character limits to all TextFields

    **IMPORTANT: MUI v9 uses `slotProps={{ htmlInput: {...} }}` — NOT the deprecated `inputProps`.**

    Using `inputProps` causes: `React does not recognize the inputProps prop on a DOM element.`

    **Email field:**
    ```jsx
    <TextField
        fullWidth
        size="small"
        placeholder="Enter Email"
        value={formData.email}
        onChange={handleChange('email')}
        slotProps={{ htmlInput: { maxLength: MAX_EMAIL_LENGTH } }}
        error={formData.email && !isValidEmail(formData.email)}
        helperText={formData.email && !isValidEmail(formData.email)
            ? 'Enter a valid email address'
            : (formData.email ? `${formData.email.length}/${MAX_EMAIL_LENGTH}` : undefined)}
        className={styles.textField}
    />
    ```

    **Address field:**
    ```jsx
    <TextField
        fullWidth
        size="small"
        multiline
        rows={2}
        placeholder="Enter business address"
        value={formData.address}
        onChange={handleChange('address')}
        slotProps={{ htmlInput: { maxLength: MAX_ADDRESS_LENGTH } }}
        helperText={formData.address ? `${formData.address.length}/${MAX_ADDRESS_LENGTH}` : undefined}
        className={styles.textField}
    />
    ```

    **About field:**
    ```jsx
    <TextField
        fullWidth
        size="small"
        multiline
        rows={2}
        placeholder="Short bio or tagline"
        value={formData.about}
        onChange={handleChange('about')}
        slotProps={{ htmlInput: { maxLength: MAX_ABOUT_LENGTH } }}
        helperText={formData.about ? `${formData.about.length}/${MAX_ABOUT_LENGTH}` : undefined}
        className={styles.textField}
    />
    ```

    **Description field:**
    ```jsx
    <TextField
        fullWidth
        size="small"
        multiline
        rows={4}
        placeholder="Detailed business description"
        value={formData.description}
        onChange={handleChange('description')}
        slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH } }}
        helperText={formData.description ? `${formData.description.length}/${MAX_DESCRIPTION_LENGTH}` : undefined}
        className={styles.textField}
    />
    ```

    ### 2.6 Website field with URL validation + error state

    ```jsx
    <TextField
        fullWidth
        size="small"
        placeholder="https://www.yourwebsite.com"
        value={site}
        onChange={(e) => handleWebsiteChange(idx, e.target.value.slice(0, MAX_WEBSITE_LENGTH))}
        slotProps={{ htmlInput: { maxLength: MAX_WEBSITE_LENGTH } }}
        error={urlError}
        helperText={urlError
            ? 'URL must start with http:// or https://'
            : (site ? `${site.length}/${MAX_WEBSITE_LENGTH}` : undefined)}
        className={styles.textField}
    />
    ```

    Where `urlError` is computed per row:
    ```js
    const urlError = site && !isValidWebsiteUrl(site);
    ```

    ### 2.7 Limit website additions to MAX_WEBSITES (2)

    ```js
    const handleAddWebsite = () => {
        setFormData((prev) => {
            const current = prev.websites || [];
            if (current.length >= MAX_WEBSITES) {
                toast.error(`You can add up to ${MAX_WEBSITES} websites only.`);
                return prev;
            }
            return {
                ...prev,
                websites: [...current, ''],
            };
        });
    };
    ```

    ### 2.8 Restructure Websites UI — label row with add icon + tooltip

    Replace the old "Add Website" outlined button with an icon button on the same row as the "Websites" label.

    **Add `Tooltip` to MUI imports:**
    ```js
    import { ..., Tooltip } from '@mui/material';
    ```

    **Websites section JSX:**
    ```jsx
    {/* Row 5: Websites */}
    <Grid size={{ xs: 12 }}>
        <Box className={styles.websiteLabelRow}>
            <Typography component="label" className={styles.fieldLabel}>
                Websites
            </Typography>
            <Tooltip
                title={(formData.websites || []).length >= MAX_WEBSITES
                    ? `Maximum ${MAX_WEBSITES} websites allowed`
                    : 'Add website'}
                placement="top"
                arrow
            >
                <span>
                    <IconButton
                        size="small"
                        onClick={handleAddWebsite}
                        disabled={(formData.websites || []).length >= MAX_WEBSITES}
                        className={styles.websiteAddIconBtn}
                    >
                        <Plus size={18} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
        <Box className={styles.websiteList}>
            {(formData.websites || []).map((site, idx) => {
                const urlError = site && !isValidWebsiteUrl(site);
                return (
                <Box key={idx} className={styles.websiteRow}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="https://www.yourwebsite.com"
                        value={site}
                        onChange={(e) => handleWebsiteChange(idx, e.target.value.slice(0, MAX_WEBSITE_LENGTH))}
                        slotProps={{ htmlInput: { maxLength: MAX_WEBSITE_LENGTH } }}
                        error={urlError}
                        helperText={urlError
                            ? 'URL must start with http:// or https://'
                            : (site ? `${site.length}/${MAX_WEBSITE_LENGTH}` : undefined)}
                        className={styles.textField}
                    />
                    <Tooltip title="Remove website" placement="top" arrow>
                        <IconButton
                            size="small"
                            onClick={() => handleRemoveWebsite(idx)}
                            className={styles.websiteRemoveBtn}
                        >
                            <Trash2 size={16} />
                        </IconButton>
                    </Tooltip>
                </Box>
                );
            })}
        </Box>
    </Grid>
    ```

    **Note:** The `<span>` wrapper around the add IconButton is required because MUI Tooltip doesn't forward ref to a disabled IconButton directly.

    ### 2.9 SCSS for Websites section

    ```scss
    // ── Website Fields ──
    .websiteLabelRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
    }

    .websiteAddIconBtn {
        color: $primary-main !important;
        border: 1px solid $border-color !important;
        border-radius: 8px !important;
        flex-shrink: 0;
        padding: 6px !important;

        &:hover {
            background: rgba($primary-main, 0.06) !important;
            border-color: $primary-main !important;
        }

        &:disabled {
            color: #cbd5e1 !important;
            border-color: $border-color !important;
        }
    }

    .websiteList {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .websiteRow {
        display: flex;
        align-items: flex-start;  // NOT center — keeps remove btn aligned when helperText shows
        gap: 8px;
    }

    .websiteRemoveBtn {
        color: #ef4444 !important;
        border: 1px solid $border-color !important;
        border-radius: 8px !important;
        flex-shrink: 0;
        margin-top: 4px;  // Aligns with input text (small TextField has ~4px top padding)

        &:hover {
            background: rgba(239, 68, 68, 0.06) !important;
            border-color: #fca5a5 !important;
        }
    }
    ```

    ### 2.10 Update success check — support new response format

    In `handleConfirmUpdate`, update the success check to handle both formats:

    ```js
    // New format: { success: true, message, data } | Legacy: { Status: '200' }
    const isSuccess = result?.success === true || result?.Status === '200';
    if (isSuccess) {
        setSavedData(formData);
        setSavedLogo(logoPreview);
        setLogoFile(null);
        toast.success(result?.message || 'Business profile updated successfully!');
        setUpdateDialogOpen(false);
    } else {
        toast.error(result?.message || result?.Message || 'Failed to update business profile');
    }
    ```

    ### 2.11 Add submit-time URL validation guard

    At the start of `handleConfirmUpdate`, before `setIsUpdating(true)`:

    ```js
    const handleConfirmUpdate = async () => {
        // Validate website URLs — Meta requires http:// or https:// prefix
        const invalidWebsites = (formData.websites || []).filter((w) => w && !isValidWebsiteUrl(w));
        if (invalidWebsites.length > 0) {
            toast.error('Website URLs must start with http:// or https://');
            setIsUpdating(false);
            return;
        }

        setIsUpdating(true);
        try {
            // ... API call
        }
    };
    ```

    ### 2.12 Channel info card in update confirmation dialog

    Add the WhatsApp SVG import:
    ```js
    import { Whatsapp } from '../../assests/svg';
    ```

    In the update confirmation dialog's `<DialogContent>`, add a channel info card before the confirmation message:

    ```jsx
    <DialogContent>
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            p: '12px',
            mb: '14px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e4e8ee',
        }}>
            <Box
                sx={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(29,170,97,0.15)',
                    overflow: 'hidden',
                }}
            >
                {channel?.profilePictureUrl ? (
                    <img
                        src={channel.profilePictureUrl}
                        alt={channel?.whatsappName || channel?.companyCode || 'Channel'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ) : (
                    <Whatsapp width={22} height={22} fill="#1daa61" />
                )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <Typography sx={{
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#444050',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {channel?.whatsappName || channel?.companyCode || 'Channel'}
                </Typography>
                {channel?.mobileNumber && (
                    <Typography sx={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '0.75rem',
                        color: '#6D6B77',
                        fontWeight: 500,
                    }}>
                        {channel.mobileNumber}
                    </Typography>
                )}
            </Box>
        </Box>
        <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', color: '#7d7f85', lineHeight: 1.6 }}>
            Are you sure you want to update your business profile? This will reflect changes across your WhatsApp Business account.
        </Typography>
    </DialogContent>
    ```

    ### 2.13 Show WhatsAppName + profile picture in main dialog header

    Update `channelName` to prefer `whatsappName`:

    ```js
    const channelName = channel?.whatsappName || channel?.companyCode || 'Channel';
    const [headerImgError, setHeaderImgError] = useState(false);
    const hasHeaderPic = Boolean(channel?.profilePictureUrl) && !headerImgError;
    ```

    Restructure the header — left side has icon + title + subtitle, right side has a dark badge with WhatsAppName + mobileNumber, then the close button:

    ```jsx
    <DialogTitle className={styles.dialogHeader}>
        <Box className={styles.dialogHeaderLeft}>
            <Box className={styles.pageHeaderIcon} sx={{ overflow: 'hidden', p: hasHeaderPic ? 0 : undefined }}>
                {hasHeaderPic ? (
                    <img
                        src={channel.profilePictureUrl}
                        alt={channelName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setHeaderImgError(true)}
                    />
                ) : (
                    <Building2 size={18} />
                )}
            </Box>
            <Box>
                <Typography component="h2" className={styles.pageTitle}>
                    Business Profile
                </Typography>
                <Typography component="p" className={styles.pageSubtitle}>
                    Manage your business identity
                </Typography>
            </Box>
        </Box>
        <Box className={styles.dialogHeaderRight}>
            <Box className={styles.channelBadge}>
                <Typography component="span" className={styles.channelBadgeText}>
                    {channelName}{channel?.mobileNumber ? ` • ${channel.mobileNumber}` : ''}
                </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: '#7d7f85' }}>
                <X size={20} />
            </IconButton>
        </Box>
    </DialogTitle>
    ```

    **SCSS for the badge:**
    ```scss
    .dialogHeaderRight {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .channelBadge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 8px;
        background: #eef1f5;  // light background
        max-width: 260px;
    }

    .channelBadgeText {
        font-family: $font-family !important;
        font-size: 0.78rem !important;
        font-weight: 600 !important;
        color: #1f2c33 !important;  // dark text
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2 !important;
    }

    // Hide badge on very small screens
    @media (max-width: 480px) {
        .channelBadge {
            display: none;
        }
    }
    ```

    **Key behaviors:**
    - Left side: profile picture (or Building2 fallback) + "Business Profile" title + "Manage your business identity" subtitle
    - Right side: dark badge (`#1f2c33` background, white text) showing `Optigo Waba • 919725150900` with a small profile pic thumbnail, then the close button
    - `whatsappName` takes priority over `companyCode` for the display name
    - Badge is hidden on screens ≤480px to save space

    ---

    ## 3. WabaBilling API — `WabaBilling.js`

    ### Add `whatsappName` and `profilePictureUrl` to mapped response

    The wallet/billing API response includes `WhatsappName` and `ProfilePictureUrl` fields that need to be mapped.

    **API response:**
    ```json
    {
        "Status": "200",
        "Data": {
            "rd": [{
                "CompanyCode": "orail25",
                "MobileNumber": "919725150900",
                "WabaId": "2191181245002791",
                "WhatsappName": "Optigo Waba",
                "ProfilePictureUrl": "https://pps.whatsapp.net/...",
                "AvailableBalance": 4941,
                ...
            }]
        }
    }
    ```

    **Add to the mapped data object in `fetchWabaBilling`:**

    ```js
    return {
        success: true,
        data: {
            ...row,
            companyCode: row?.CompanyCode || '-',
            mobileNumber: row?.MobileNumber || '-',
            wabaId: row?.WabaId || '-',
            wabaPhoneNo: row?.WabaPhoneNo || '-',
            whatsappName: row?.WhatsappName || '',           // NEW
            profilePictureUrl: row?.ProfilePictureUrl || '', // NEW
            totalBalance: Number(row?.TotalBalance || row?.BillAmount || 0),
            debitedBalance: Number(row?.DebitedBalance || 0),
            refundBalance: Number(row?.RefundBalance || 0),
            availableBalance: Number(row?.AvailableBalance || row?.CurrentAmount || 0),
        },
    };
    ```

    ---

    ## 4. ChannelsDashboard — `ChannelsDashboard.js`

    ### Pass new fields to channel objects

    In the `channels` useMemo, add the new fields when mapping:

    ```js
    return CHANNELS.map((channel) => ({
        ...channel,
        ...walletInfo,
        balance: walletInfo.availableBalance,
        totalCredits: walletInfo.totalCredits,
        used: walletInfo.used,
        progressPercent: walletInfo.progressPercent,
        companyCode: walletInfo.companyCode || '-',
        mobileNumber: walletInfo.mobileNumber || '-',
        wabaId: walletInfo.wabaId || '-',
        wabaPhoneNo: walletInfo.wabaPhoneNo || '-',
        whatsappName: walletInfo.whatsappName || '',           // NEW
        profilePictureUrl: walletInfo.profilePictureUrl || '', // NEW
        refundBalance: walletInfo.refundBalance,
    }));
    ```

    ---

    ## 5. ChannelCard — `ChannelCard.js`

    ### Show profile picture with fallback icon + WhatsAppName as title

    **Add state for image error tracking:**
    ```js
    const [imgError, setImgError] = useState(false);
    const hasProfilePic = Boolean(channel.profilePictureUrl) && !imgError;
    ```

    **Replace the icon box and info text:**

    ```jsx
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Box
            sx={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: hasProfilePic
                    ? 'transparent'
                    : 'linear-gradient(135deg, rgba(29,170,97,0.12), rgba(37,211,102,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(29,170,97,0.15)',
                overflow: 'hidden',
            }}
        >
            {hasProfilePic ? (
                <img
                    src={channel.profilePictureUrl}
                    alt={channel.whatsappName || channel.companyCode}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImgError(true)}
                />
            ) : (
                <Whatsapp width={28} height={28} fill="#1daa61" />
            )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <Typography sx={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#444050',
                lineHeight: 1.2,
                fontFamily: 'Poppins, sans-serif',
            }}>
                {channel.whatsappName || channel.companyCode}
            </Typography>
            <Typography sx={{
                fontSize: '0.75rem',
                color: '#6D6B77',
                fontWeight: 500,
                fontFamily: 'Poppins, sans-serif',
            }}>
                Mobile: {channel.mobileNumber}
            </Typography>
            <Typography sx={{
                fontSize: '0.75rem',
                color: '#6D6B77',
                fontWeight: 500,
                fontFamily: 'Poppins, sans-serif',
            }}>
                WABA ID: {channel.wabaId}
            </Typography>
        </Box>
    </Box>
    ```

    **Key behaviors:**
    - If `profilePictureUrl` exists and loads → shows the image (`object-fit: cover`)
    - If URL is missing OR image fails to load (`onError` → `setImgError(true)`) → falls back to WhatsApp SVG icon
    - Background switches to `transparent` when showing image, gradient when showing icon
    - Title shows `whatsappName` (e.g. "Optigo Waba"), falls back to `companyCode`

    ---

    ## Summary of Files to Change

    | File | Changes |
    |---|---|
    | `api/BusinessProfileApi.js` | Support new `{ success, data }` response format in `fetchWabaProfile` |
    | `components/BusinessProfile/BusinessProfile.js` | Character limits, URL/email validation, `hasErrors`, `slotProps` instead of `inputProps`, website UI restructure with tooltips, new success format check, channel info card in update dialog |
    | `components/BusinessProfile/BusinessProfile.module.scss` | `.websiteLabelRow`, `.websiteAddIconBtn`, `.websiteRow` align flex-start, `.websiteRemoveBtn` margin-top, remove old `.websiteAddBtn` |
    | `api/WabaBilling.js` | Map `whatsappName` and `profilePictureUrl` from API row |
    | `components/Dashboard/ChannelsDashboard.js` | Pass `whatsappName` and `profilePictureUrl` to channel objects |
    | `components/Dashboard/ChannelCard.js` | Profile picture with fallback icon, WhatsAppName as title |

    ---

    ## Important Notes

    1. **MUI v9:** Use `slotProps={{ htmlInput: {...} }}` — NOT `inputProps`. Using `inputProps` causes React DOM warnings.
    2. **Tooltip + disabled IconButton:** Wrap disabled IconButton in a `<span>` — MUI Tooltip needs a ref-forwarding element.
    3. **Website row alignment:** Use `align-items: flex-start` (not `center`) so the remove button stays aligned when `helperText` makes the TextField taller. Add `margin-top: 4px` to the remove button.
    4. **Image fallback:** Use `onError` handler to set state (`setImgError(true)`) and conditionally render the fallback icon. Don't just hide the img — swap to the icon component.
    5. **Validation order:** Empty values pass validation (fields are optional). Only non-empty values are validated.
    6. **API format fallback:** Always check new format (`result.success === true`) first, then legacy format (`result.Status === '200'`).
