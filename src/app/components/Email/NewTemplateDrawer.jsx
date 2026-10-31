'use client';

import React, { useState, useEffect, memo } from 'react';
import { Box, Button, Drawer, Typography } from '@mui/material';
import { ArrowLeft, ArrowRight, LayoutTemplate, Pencil, Search, Sparkles, X } from 'lucide-react';
import { normalizeTemplateName } from '../Template/Create/templateBuilderUtils';
import { EMAIL_TEMPLATES } from './emailTemplateFixtures';
import tstyles from '../Template/Templates.module.scss';

// Hide scrollbars inside preview iframes — same injection the templates page uses.
const HIDE_SCROLLBARS_STYLE =
    '<style>html,body{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}</style>';
const hideIframeScrollbars = (html) => {
    if (typeof html !== 'string') return html;
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${HIDE_SCROLLBARS_STYLE}</head>`);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}${HIDE_SCROLLBARS_STYLE}`);
    return `${HIDE_SCROLLBARS_STYLE}${html}`;
};

// Must mirror STARTER_TEMPLATES ids in the builder
// (central-email-builder/editor/getConfiguration/sample/starterTemplates.js).
const STARTERS = [
    { id: 'starter-welcome', name: 'Welcome' },
    { id: 'starter-order', name: 'Order confirmation' },
    { id: 'starter-newsletter', name: 'Newsletter' },
    { id: 'starter-promo', name: 'Promo sale' },
    { id: 'starter-invoice', name: 'Invoice' },
    { id: 'starter-reset', name: 'Password reset' },
];

const QUICK_IDEAS = [
    'Festive offer',
    'New collection launch',
    'Order confirmation',
    'Abandoned cart reminder',
];

// First screen — pick a starting path; second screen collects its details.
const PATHS = [
    {
        key: 'blank',
        icon: Pencil,
        title: 'Start blank',
        sub: 'Empty canvas — build it yourself',
    },
    {
        key: 'ai',
        icon: Sparkles,
        title: 'Generate with AI',
        sub: 'Describe the email, AI drafts it',
        accent: true,
    },
    {
        key: 'starter',
        icon: LayoutTemplate,
        title: 'Start from a template',
        sub: 'Pick a ready-made layout',
    },
];

const STEP_TITLES = {
    blank: 'New blank template',
    ai: 'Generate with AI',
    starter: 'Choose a template',
    'starter-name': 'Name your template',
};

const FIELD_STYLE = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    fontFamily: 'Poppins, sans-serif', borderRadius: 10,
    border: '1px solid var(--border-color)', outline: 'none',
    background: 'var(--bg-light)', color: 'var(--text-primary)',
    boxSizing: 'border-box',
};

const LABEL_SX = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', mb: 0.75, fontFamily: 'Poppins, sans-serif' };

function NameField({ value, onChange, autoFocus = false }) {
    return (
        <Box>
            <Typography sx={LABEL_SX}>Template name</Typography>
            <input
                autoFocus={autoFocus}
                type="text"
                placeholder="e.g. Festive_gold_offer"
                value={value}
                onChange={(e) => onChange(normalizeTemplateName(e.target.value))}
                style={FIELD_STYLE}
            />
        </Box>
    );
}

/**
 * Pre-editor gate — two-step flow:
 *  1) pick a path (blank / AI generate / starter template)
 *  2) fill in what that path needs
 * Self-contained so keystrokes re-render only this drawer.
 */
function NewTemplateDrawer({ open, onClose, onCreate }) {
    const [step, setStep] = useState(null); // null | 'blank' | 'ai' | 'starter' | 'starter-name'
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [starterQuery, setStarterQuery] = useState('');
    const [selectedStarter, setSelectedStarter] = useState(null);

    // Reset every time the drawer opens.
    useEffect(() => {
        if (open) {
            setStep(null);
            setName('');
            setPrompt('');
            setStarterQuery('');
            setSelectedStarter(null);
        }
    }, [open]);

    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();
    const sq = starterQuery.trim().toLowerCase();
    const visibleStarters = STARTERS.filter((s) => !sq || s.name.toLowerCase().includes(sq));
    const starterHtml = (s) => EMAIL_TEMPLATES.find((t) => t.TemplateName === s.name)?.Html;

    const create = (withAi) => {
        if (!trimmedName) return;
        onClose();
        onCreate(trimmedName, withAi ? trimmedPrompt : '');
    };

    // Card click → name step (prefilled with the starter's own name).
    const pickStarter = (starter) => {
        setSelectedStarter(starter);
        if (!trimmedName) setName(normalizeTemplateName(starter.name));
        setStep('starter-name');
    };

    const confirmStarter = () => {
        if (!trimmedName || !selectedStarter) return;
        onClose();
        onCreate(trimmedName, '', selectedStarter.id);
    };

    const back = () => setStep(step === 'starter-name' ? 'starter' : null);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{ paper: { sx: { borderRadius: '14px 0 0 14px' } } }}
        >
            <Box sx={{ width: { xs: '100vw', sm: 480 }, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-paper)' }}>
                {/* Header — back arrow on step 2 */}
                <div className={tstyles.drawerHeader} style={{ background: 'var(--bg-paper)' }}>
                    <h3 className={tstyles.drawerTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {step && (
                            <button
                                onClick={back}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 26, height: 26, borderRadius: '50%', border: 'none',
                                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                                    flexShrink: 0,
                                }}
                                aria-label="Back"
                            >
                                <ArrowLeft size={15} />
                            </button>
                        )}
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 26, height: 26, borderRadius: '50%',
                            background: '#f0deff', color: '#6400b8', flexShrink: 0,
                        }}>
                            <Sparkles size={13} />
                        </span>
                        {step ? STEP_TITLES[step] : 'New Email Template'}
                    </h3>
                    <button className={tstyles.drawerClose} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* ── Screen 1: pick a path ─────────────────────────── */}
                    {step === null && PATHS.map((p) => {
                        const Icon = p.icon;
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => setStep(p.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                                    padding: '14px 14px', borderRadius: 12, cursor: 'pointer',
                                    textAlign: 'left',
                                    border: `1px solid ${p.accent ? 'rgba(100,0,184,0.35)' : 'var(--border-color)'}`,
                                    background: p.accent ? 'rgba(100,0,184,0.04)' : 'transparent',
                                    fontFamily: 'Poppins, sans-serif',
                                }}
                            >
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                    background: p.accent ? '#f0deff' : 'var(--bg-light)',
                                    color: p.accent ? '#6400b8' : 'var(--text-secondary)',
                                }}>
                                    <Icon size={16} />
                                </span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {p.title}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>
                                        {p.sub}
                                    </span>
                                </span>
                                <ArrowRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                            </button>
                        );
                    })}

                    {/* ── Screen 2a: blank → just the name ──────────────── */}
                    {step === 'blank' && (
                        <NameField value={name} onChange={setName} autoFocus />
                    )}

                    {/* ── Screen 2b: AI → name + prompt + ideas ─────────── */}
                    {step === 'ai' && (
                        <>
                            <NameField value={name} onChange={setName} />
                            <Box>
                                <Typography sx={LABEL_SX}>Describe the email</Typography>
                                <textarea
                                    autoFocus
                                    placeholder="e.g. Diwali offer — 20% off making charges, hero image + CTA"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={4}
                                    style={{ ...FIELD_STYLE, lineHeight: 1.5, resize: 'vertical' }}
                                />
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                                    {QUICK_IDEAS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            style={{
                                                padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                                fontFamily: 'Poppins, sans-serif', borderRadius: 8,
                                                border: '1px solid var(--border-color)', background: 'transparent',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </Box>
                            </Box>
                        </>
                    )}

                    {/* ── Screen 2c: starter → optional name + grid ─────── */}
                    {step === 'starter' && (
                        <>
                            {/* Compact right-aligned search */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Box sx={{ position: 'relative', width: '58%' }}>
                                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        placeholder="Search…"
                                        value={starterQuery}
                                        onChange={(e) => setStarterQuery(e.target.value)}
                                        style={{ ...FIELD_STYLE, paddingLeft: 30, paddingTop: 7, paddingBottom: 7, fontSize: 12 }}
                                    />
                                </Box>
                            </Box>

                            {/* Preview cards — real rendered HTML scaled into a thumb */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                                {visibleStarters.map((s) => {
                                    const html = starterHtml(s);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => pickStarter(s)}
                                            style={{
                                                padding: 0, borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-paper)',
                                                fontFamily: 'Poppins, sans-serif', textAlign: 'left',
                                            }}
                                        >
                                            <div style={{ height: 140, overflow: 'hidden', background: '#F5F5F5', position: 'relative' }}>
                                                {html ? (
                                                    <iframe
                                                        title={s.name}
                                                        srcDoc={hideIframeScrollbars(html)}
                                                        sandbox="allow-same-origin"
                                                        tabIndex={-1}
                                                        style={{
                                                            width: 600, height: 720, border: 0, display: 'block',
                                                            transform: 'scale(0.34)', transformOrigin: '0 0',
                                                            pointerEvents: 'none',
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                                                        <LayoutTemplate size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '8px 10px', borderTop: '1px solid var(--border-color)',
                                                fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                                            }}>
                                                {s.name}
                                                <ArrowRight size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </Box>
                            {visibleStarters.length === 0 && (
                                <Typography sx={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Poppins, sans-serif', py: 1 }}>
                                    No templates match "{starterQuery}".
                                </Typography>
                            )}
                        </>
                    )}

                    {/* ── Screen 2d: starter picked → name it ─────────── */}
                    {step === 'starter-name' && selectedStarter && (
                        <>
                            {/* Selected template — larger preview */}
                            <Box sx={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-paper)' }}>
                                <div style={{ height: 200, overflow: 'hidden', background: '#F5F5F5' }}>
                                    {starterHtml(selectedStarter) ? (
                                        <iframe
                                            title={selectedStarter.name}
                                            srcDoc={hideIframeScrollbars(starterHtml(selectedStarter))}
                                            sandbox="allow-same-origin"
                                            tabIndex={-1}
                                            style={{
                                                width: 600, height: 780, border: 0, display: 'block',
                                                transform: 'scale(0.69)', transformOrigin: '0 0',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                                            <LayoutTemplate size={20} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border-color)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif' }}>
                                    {selectedStarter.name}
                                </div>
                            </Box>
                            <NameField value={name} onChange={setName} autoFocus />
                        </>
                    )}
                </Box>

                {/* Footer — only the steps that need a confirm button */}
                {(step === 'blank' || step === 'ai' || step === 'starter-name') && (
                    <Box sx={{ p: 2, borderTop: '1px solid var(--border-color)' }}>
                        {step === 'starter-name' ? (
                            <Button
                                fullWidth
                                variant="contained"
                                disabled={!trimmedName}
                                onClick={confirmStarter}
                                sx={{
                                    textTransform: 'none', borderRadius: '10px', fontFamily: 'Poppins, sans-serif',
                                    fontWeight: 600, fontSize: '0.8rem',
                                    background: '#7367f0', color: 'var(--button-color)', boxShadow: 'none',
                                    '&:hover': { background: '#7367f0', boxShadow: 'none' },
                                }}
                            >
                                Create template
                            </Button>
                        ) : step === 'blank' ? (
                            <Button
                                fullWidth
                                variant="contained"
                                disabled={!trimmedName}
                                onClick={() => create(false)}
                                sx={{
                                    textTransform: 'none', borderRadius: '10px', fontFamily: 'Poppins, sans-serif',
                                    fontWeight: 600, fontSize: '0.8rem',
                                    background: '#7367f0', color: 'var(--button-color)', boxShadow: 'none',
                                    '&:hover': { background: '#7367f0', boxShadow: 'none' },
                                }}
                            >
                                Create template
                            </Button>
                        ) : (
                            <Button
                                fullWidth
                                variant="contained"
                                disabled={!trimmedName || !trimmedPrompt}
                                startIcon={<Sparkles size={14} />}
                                onClick={() => create(true)}
                                sx={{
                                    textTransform: 'none', borderRadius: '10px', fontFamily: 'Poppins, sans-serif',
                                    fontWeight: 600, fontSize: '0.8rem',
                                    background: '#6400b8', color: '#fff', boxShadow: 'none',
                                    '&:hover': { background: '#6400b8', boxShadow: 'none' },
                                    '&.Mui-disabled': { background: 'rgba(100,0,184,0.25)', color: '#fff' },
                                }}
                            >
                                Generate with AI
                            </Button>
                        )}
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}

export default memo(NewTemplateDrawer);
