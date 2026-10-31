'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowLeft, Mail, Link2Off, Pencil, Copy, Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import tstyles from '../Template/Templates.module.scss';
import { buildQueryString, parseQueryString } from '../../utils/urlUtils';
import { normalizeTemplateName } from '../Template/Create/templateBuilderUtils';
import { getToken } from '../../utils/storage';
import { encodeSession } from '../../utils/session';
import { useThemeMode } from '../../providers/ThemeRegistry';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { EMAIL_TEMPLATES, getEmailTemplateById, toBuilderListEntry } from './emailTemplateFixtures';

// ── central-email-builder host config ─────────────────────────────────────────
// Builder app runs at http://localhost:3000 by default (its /editor route).
// Override via NEXT_PUBLIC_EMAIL_BUILDER_URL / NEXT_PUBLIC_EMAIL_BUILDER_APP.
const BUILDER_URL = (process.env.NEXT_PUBLIC_EMAIL_BUILDER_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
const BUILDER_APP = (process.env.NEXT_PUBLIC_EMAIL_BUILDER_APP || 'default').trim();
const BUILDER_SOURCE = 'central-email-builder';
const HOST_PRIMARY_COLOR = '#7367f0';

const EmailBuilderPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const iframeRef = useRef(null);
    const lastDocRef = useRef(null);
    const [frameLoading, setFrameLoading] = useState(true);
    const [builderReady, setBuilderReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [savePrompt, setSavePrompt] = useState({ open: false, name: '' });
    const { resolvedMode } = useThemeMode();
    const muiTheme = useTheme();

    // Share the host's real palette so the editor chrome blends into waba —
    // builder picks up any of these it validates (all optional).
    const builderTheme = useMemo(() => ({
        primaryColor: HOST_PRIMARY_COLOR,
        mode: resolvedMode,
        backgroundColor: muiTheme.palette.background.default,
        surfaceColor: muiTheme.palette.background.paper,
        textColor: muiTheme.palette.text.primary,
        textSecondaryColor: muiTheme.palette.text.secondary,
        borderColor: muiTheme.palette.divider,
        fontFamily: muiTheme.typography.fontFamily,
    }), [muiTheme, resolvedMode]);

    // waba encodes both keys and values in Base64 (buildQueryString), so the
    // raw searchParams keys don't exist — decode the whole string first.
    const pageParams = parseQueryString(searchParams.toString());
    const templateId = pageParams.id || '';
    const templateName = pageParams.name || '';
    const aiPrompt = pageParams.ai || '';
    const starterId = pageParams.starter || '';
    const isFresh = pageParams.new === '1';
    const isClone = pageParams.clone === '1';
    const isEdit = Boolean(templateId) && !isClone;

    // Embed URL: {BUILDER_URL}/editor?app=<appId>&template=<id>&mode=light
    const builderOrigin = useMemo(() => {
        try { return new URL(BUILDER_URL).origin; } catch { return ''; }
    }, []);

    // Freeze the initial mode — putting resolvedMode in the URL would reload
    // the whole editor on every theme toggle; live changes go through
    // EMAIL_THEME_UPDATE instead.
    const [initialMode] = useState(resolvedMode);

    // Parent session → iframe via ?session= (the builder's getDecodedSession
    // contract) so uploads/API calls inside the editor act as this user.
    // appuserid is required by that decoder — without it the session is dropped.
    const builderSession = useMemo(() => {
        const auth = getToken();
        if (!auth) return null;
        const appuserid = auth.userId || auth.userid || auth.username || auth.appuserid || auth.email || '';
        if (!appuserid) return null;
        return {
            appuserid,
            token: auth.token || '',
            ukey: auth.ukey || '',
            yc: auth.yc || auth.yearcode || '',
            sv: auth.sv || auth.svid || '',
            cuver: auth.cuver || '',
            whatsappNumber: auth.whatsappNumber || auth.whatsappPhoneNo || '',
            whatsappPhoneNo: auth.whatsappPhoneNo || auth.whatsappNumber || '',
        };
    }, []);

    const frameSrc = useMemo(() => {
        if (!builderOrigin) return '';
        // Plain params — the builder app reads raw ?app/?mode/?template keys,
        // not waba's Base64-encoded query format.
        const qs = new URLSearchParams({
            app: BUILDER_APP,
            mode: initialMode,
            ...(templateId ? { template: templateId } : {}),
            ...(templateName ? { name: templateName } : {}),
            ...(aiPrompt ? { ai: aiPrompt } : {}),
            ...(starterId ? { starter: starterId } : {}),
            ...(isFresh ? { new: '1' } : {}),
            ...(builderSession ? { session: encodeSession(builderSession) } : {}),
        }).toString();
        return `${BUILDER_URL}/editor?${qs}`;
    }, [builderOrigin, templateId, templateName, aiPrompt, starterId, isFresh, initialMode, builderSession]);

    const postToBuilder = useCallback((msg) => {
        // Inbound messages to the editor must NOT carry `source` — echoes are dropped
        iframeRef.current?.contentWindow?.postMessage(msg, builderOrigin);
    }, [builderOrigin]);

    // Host ↔ editor postMessage channel (protocol: central-email-builder, version 1)
    useEffect(() => {
        if (!builderOrigin) return undefined;

        const onMessage = (event) => {
            if (event.origin !== builderOrigin) return;
            const data = event.data;
            if (!data || data.source !== BUILDER_SOURCE) return;

            switch (data.type) {
                case 'EMAIL_BUILDER_READY':
                    setBuilderReady(true);
                    setFrameLoading(false);
                    postToBuilder({
                        type: 'EMAIL_BUILDER_INIT',
                        appId: BUILDER_APP,
                        theme: builderTheme,
                        layout: { width: '100%', height: '100%', showFooter: false },
                        ...(templateId ? { templateId } : {}),
                    });
                    break;
                case 'EMAIL_TEMPLATE_CHANGE':
                    lastDocRef.current = data.document || null;
                    setDirty(Boolean(data.dirty));
                    break;
                case 'EMAIL_TEMPLATE_SAVED':
                    setSaving(false);
                    setSavePrompt({ open: false, name: '' });
                    toast.success(`Email template "${data.name || templateName || 'Untitled'}" saved`);
                    router.push('/email/templates');
                    break;
                // Parent-owned template library — the editor asks us for data,
                // it never persists anything itself when embedded.
                case 'EMAIL_TEMPLATE_LIST_REQUEST':
                    postToBuilder({
                        type: 'EMAIL_TEMPLATE_LIST',
                        templates: EMAIL_TEMPLATES.map(toBuilderListEntry),
                    });
                    break;
                case 'EMAIL_TEMPLATE_OPEN': {
                    const tpl = getEmailTemplateById(data.templateId);
                    if (tpl?.Document) {
                        postToBuilder({
                            type: 'EMAIL_TEMPLATE_LOAD',
                            templateId: String(tpl.Id),
                            name: tpl.TemplateName,
                            document: tpl.Document,
                        });
                    }
                    break;
                }
                case 'EMAIL_TEMPLATE_DELETE':
                    // Prototype: fixtures are read-only — swap for the real API
                    // (delete + re-push EMAIL_TEMPLATE_LIST) when it lands.
                    toast.success(`Template "${data.templateId}" deleted`);
                    break;
                case 'EMAIL_HTML_GENERATED':
                    // Ready-to-send markup — will feed the email broadcast payload later
                    toast.success('Email HTML generated');
                    break;
                case 'EMAIL_BUILDER_ERROR':
                    setSaving(false);
                    setSavePrompt({ open: false, name: '' });
                    toast.error(data.message || 'Email builder error');
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [builderOrigin, templateId, templateName, router, postToBuilder, builderTheme]);

    // Live theme sync — when waba toggles dark/light, push the full palette
    // into the builder without a reload.
    useEffect(() => {
        if (!builderReady) return;
        postToBuilder({ type: 'EMAIL_THEME_UPDATE', theme: builderTheme });
    }, [builderReady, builderTheme, postToBuilder]);

    // Save — the name was collected before the editor opened, so don't ask
    // again; only fall back to the prompt when no name arrived in the URL.
    const handleSave = () => {
        if (!templateName) {
            setSavePrompt({ open: true, name: 'Untitled_Email' });
            return;
        }
        const name = normalizeTemplateName(isClone ? `Copy_of_${templateName}` : templateName);
        setSaving(true);
        postToBuilder({ type: 'EMAIL_TEMPLATE_SAVE', name });
    };

    const confirmSave = () => {
        const name = normalizeTemplateName(savePrompt.name.trim()) || 'Untitled_Email';
        setSaving(true);
        postToBuilder({ type: 'EMAIL_TEMPLATE_SAVE', name });
    };

    const modeLabel = isClone ? 'Cloning template' : isEdit ? 'Editing template' : 'New template';
    const ModeIcon = isClone ? Copy : isEdit ? Pencil : Plus;

    return (
        <div className={tstyles.page}>
            <div className={tstyles.topBarWrapper}>
                <div className={tstyles.topBar}>
                    <div className={tstyles.topBarLeft}>
                        <button className={tstyles.backBtn} onClick={() => router.push('/email/templates')}>
                            <ArrowLeft size={16} />
                        </button>
                        <div className={tstyles.headerIconWrap} style={{ background: 'rgba(115,103,240,0.10)', color: '#7367f0' }}>
                            <Mail size={18} />
                        </div>
                        <div>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 className={tstyles.pageTitle}>Email Builder</h2>
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        px: '8px', py: '3px', borderRadius: '8px',
                                        fontSize: '0.66rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif',
                                        color: '#7367f0', background: 'rgba(115,103,240,0.10)',
                                        border: '1px solid rgba(115,103,240,0.25)',
                                        textTransform: 'uppercase', letterSpacing: '0.04em',
                                    }}
                                >
                                    <ModeIcon size={10} />
                                    {modeLabel}
                                </Box>
                                {dirty && (
                                    <Box
                                        component="span"
                                        sx={{
                                            px: '7px', py: '3px', borderRadius: '8px',
                                            fontSize: '0.64rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif',
                                            color: 'var(--warning-main)', background: 'rgba(245, 158, 11, 0.10)',
                                            textTransform: 'uppercase', letterSpacing: '0.04em',
                                        }}
                                    >
                                        Unsaved
                                    </Box>
                                )}
                            </Box>
                            <p className={tstyles.pageSubtitle}>
                                {templateName ? `${templateName}${templateId ? ` · #${templateId}` : ''}` : 'Design your email template'}
                            </p>
                        </div>
                    </div>
                    <div className={tstyles.topBarRight}>
                        {frameSrc && (
                            <>
                                <Button
                                    variant="contained"
                                    startIcon={saving ? <CircularProgress size={14} thickness={5} sx={{ color: 'inherit' }} /> : <Save size={15} />}
                                    onClick={handleSave}
                                    disabled={!builderReady || saving}
                                    sx={{
                                        textTransform: 'none', borderRadius: '10px',
                                        fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                                        background: '#7367f0', color: 'var(--button-color)', boxShadow: 'none',
                                        '&:hover': { background: '#7367f0', boxShadow: 'none' },
                                    }}
                                >
                                    Save Template
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className={tstyles.contentArea} style={{ gap: 0 }}>
                {frameSrc ? (
                    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-paper)' }}>
                        {frameLoading && (
                            <Box
                                sx={{
                                    position: 'absolute', inset: 0, zIndex: 2,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.75rem', background: 'var(--bg-paper)',
                                }}
                            >
                                <CircularProgress size={28} sx={{ color: '#7367f0' }} />
                                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                    Loading email builder…
                                </Typography>
                            </Box>
                        )}
                        <iframe
                            ref={iframeRef}
                            src={frameSrc}
                            title="Email Builder"
                            allow="clipboard-read; clipboard-write"
                            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                        />
                    </Box>
                ) : (
                    <Box
                        sx={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '1rem', px: 2, textAlign: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                width: 64, height: 64, borderRadius: '18px',
                                background: 'rgba(115,103,240,0.08)',
                                border: '1px solid rgba(115,103,240,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Link2Off size={28} color="#7367f0" />
                        </Box>
                        <Box>
                            <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                Email builder not configured
                            </Typography>
                            <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem', color: 'var(--text-tertiary)', mt: '0.4rem', maxWidth: 420 }}>
                                <code>NEXT_PUBLIC_EMAIL_BUILDER_URL</code> is invalid. It should point to the
                                email-builder app origin (e.g. <code>http://localhost:3000</code>).
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowLeft size={15} />}
                            onClick={() => router.push('/email/templates')}
                            sx={{
                                textTransform: 'none', borderRadius: '10px',
                                fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                            }}
                        >
                            Back to Templates
                        </Button>
                    </Box>
                )}
            </div>

            {/* Save — name + confirmation, parent side (reuses ConfirmationModal) */}
            <ConfirmationModal
                isOpen={savePrompt.open}
                onClose={() => !saving && setSavePrompt({ open: false, name: '' })}
                onConfirm={confirmSave}
                title={isEdit ? 'Save Template' : 'Save as Template'}
                description={isEdit ? `Save the current design to "${templateName}"?` : 'Give this template a name to save it to your library.'}
                icon={Save}
                confirmLabel={isEdit ? 'Save changes' : 'Save template'}
                isLoading={saving}
            >
                <input
                    className="modal-input"
                    autoFocus
                    value={savePrompt.name}
                    onChange={(e) => setSavePrompt((p) => ({ ...p, name: normalizeTemplateName(e.target.value) }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmSave(); } }}
                    placeholder="Template name"
                />
            </ConfirmationModal>
        </div>
    );
};

export default EmailBuilderPage;
