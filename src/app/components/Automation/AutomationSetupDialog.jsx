'use client';

import React, { useState } from 'react';
import { Box, Drawer, Button, TextField, Switch, IconButton, Tooltip } from '@mui/material';
import { keyframes } from '@emotion/react';
import {
    Hash,
    ArrowLeft,
    ArrowRight,
    X,
    Loader2,
    HelpCircle,
    MessageCircleQuestion,
    UserPlus,
    CalendarCheck,
    ShoppingBag,
    PackageSearch,
    Headset,
    User,
    Phone,
    Mail,
    MapPin,
    Wallet,
    ListChecks,
    Handshake,
    Wand2,
    ChevronDown,
} from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';

const FONT = 'var(--font-poppins), Poppins, sans-serif';

const stepIn = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const aiShimmer = keyframes`
    0% { left: -100%; }
    50% { left: 100%; }
    100% { left: 100%; }
`;

// ── Shared sx styles (MUI-first, no SCSS module) ─────────────────────────────

const sx = {
    dialog: {
        width: 640,
        maxWidth: '94vw',
        bgcolor: 'var(--bg-paper)',
        borderLeft: '1px solid var(--border-color)',
        borderRadius: '14px 0 0 14px !important',
        boxShadow: '-12px 0 48px rgba(15, 23, 42, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        outline: 'none',
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        p: '1.15rem 1.5rem 1rem',
        borderBottom: '1px solid var(--sidebar-borderColor)',
        bgcolor: 'var(--bg-subtle)',
        flexShrink: 0,
    },
    headerLeft: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
    title: {
        fontSize: '1.02rem',
        fontWeight: 700,
        color: 'var(--titleColor)',
        fontFamily: FONT,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
    },
    subtitle: {
        fontSize: '0.78rem',
        fontWeight: 500,
        color: 'var(--primary-main)',
        fontFamily: FONT,
        lineHeight: 1.4,
    },
    closeBtn: { color: 'var(--secondary-color)', mt: '-4px', mr: '-6px' },
    body: {
        p: '1.35rem 1.5rem 1.5rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
    },
    stepPane: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        animation: `${stepIn} 0.22s ease`,
    },
    stepHead: { mb: '-0.1rem' },
    stepHeading: {
        fontSize: '1.02rem',
        fontWeight: 600,
        color: 'var(--titleColor)',
        fontFamily: FONT,
        m: '0 0 0.25rem',
        lineHeight: 1.35,
    },
    stepSub: {
        fontSize: '0.82rem',
        fontWeight: 400,
        color: 'var(--secondary-color)',
        fontFamily: FONT,
        m: 0,
        lineHeight: 1.5,
    },
    field: { display: 'flex', flexDirection: 'column', gap: '0.45rem' },
    label: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.84rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        fontFamily: FONT,
    },
    labelIcon: { display: 'inline-flex', alignItems: 'center', color: 'var(--text-tertiary)', cursor: 'help' },
    required: { color: 'var(--error-main)' },
    optional: { color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '0.78rem' },
    hint: {
        fontSize: '0.78rem',
        fontWeight: 400,
        color: 'var(--text-secondary)',
        fontFamily: FONT,
        lineHeight: 1.45,
    },
    hintError: {
        fontSize: '0.78rem',
        fontWeight: 500,
        color: 'var(--error-main)',
        fontFamily: FONT,
        lineHeight: 1.45,
    },
    // Filled-field look: subtle bg + transparent border at rest, ring on focus
    input: {
        '& .MuiOutlinedInput-root': {
            borderRadius: '11px',
            fontFamily: FONT,
            fontSize: '0.92rem',
            bgcolor: 'var(--bg-subtle)',
            transition: 'box-shadow 0.15s ease, background 0.15s ease',
            '& fieldset': { borderColor: 'var(--border-color)', transition: 'border-color 0.15s ease' },
            '&:hover': {
                bgcolor: 'var(--bg-paper)',
                '& fieldset': { borderColor: 'var(--border-strong, var(--border-color))' },
            },
            '&.Mui-focused': {
                bgcolor: 'var(--bg-paper)',
                boxShadow: '0 0 0 3px var(--primary-light-bg)',
                '& fieldset': { borderColor: 'var(--primary-main)' },
            },
            '&.Mui-error': {
                bgcolor: 'var(--bg-paper)',
                '& fieldset': { borderColor: 'var(--error-main)' },
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.08)' },
            },
        },
        '& .MuiInputBase-input': { padding: '0.72rem 0.95rem' },
        '& textarea.MuiInputBase-input': { padding: 0 },
        '& .MuiInputBase-input::placeholder': {
            color: 'var(--text-tertiary)',
            opacity: 0.75,
            fontStyle: 'italic',
        },
    },
    keywordPreview: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
    keywordChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.22rem 0.55rem',
        borderRadius: '6px',
        bgcolor: 'var(--primary-light-bg)',
        color: 'var(--primary-main)',
        fontSize: '0.76rem',
        fontWeight: 600,
        fontFamily: FONT,
    },
    keywordChipTaken: {
        bgcolor: '#fef2f2',
        color: 'var(--error-main)',
        textDecoration: 'line-through',
    },
    segmented: { display: 'flex', gap: '0.5rem' },
    segment: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        minHeight: 44,
        p: '0.6rem 0.85rem',
        borderRadius: '10px',
        border: '1px solid transparent',
        bgcolor: 'var(--bg-subtle)',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        '&:hover': { borderColor: 'var(--border-color)', bgcolor: 'var(--bg-paper)' },
        '&:focus-visible': { outline: '2px solid var(--primary-main)', outlineOffset: 2 },
    },
    segmentCompact: { alignItems: 'center', p: '0.55rem 0.85rem' },
    segmentActive: {
        bgcolor: 'var(--bg-paper)',
        borderColor: 'var(--primary-main)',
        boxShadow: '0 0 0 3px var(--primary-light-bg)',
    },
    segmentLabel: {
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        fontFamily: FONT,
    },
    segmentHint: {
        fontSize: '0.72rem',
        fontWeight: 400,
        color: 'var(--text-tertiary)',
        fontFamily: FONT,
        lineHeight: 1.4,
    },
    goalList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    goalCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        minHeight: 44,
        p: '0.6rem 0.8rem',
        borderRadius: '11px',
        border: '1px solid var(--border-color)',
        bgcolor: 'var(--bg-subtle)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
        '&:hover': { borderColor: 'var(--primary-main)', bgcolor: 'var(--bg-paper)' },
        '&:focus-visible': { outline: '2px solid var(--primary-main)', outlineOffset: 2 },
    },
    goalCardSelected: {
        borderColor: 'var(--primary-main)',
        bgcolor: 'var(--bg-paper)',
        boxShadow: '0 0 0 3px var(--primary-light-bg)',
    },
    goalIcon: {
        width: 30,
        height: 30,
        borderRadius: '8px',
        bgcolor: 'var(--bg-light)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s ease, color 0.15s ease',
    },
    goalIconSelected: { bgcolor: 'var(--primary-main)', color: '#fff' },
    goalText: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, flex: 1 },
    goalLabel: {
        fontSize: '0.84rem',
        fontWeight: 600,
        color: 'var(--titleColor)',
        fontFamily: FONT,
        lineHeight: 1.3,
    },
    goalDesc: {
        fontSize: '0.72rem',
        fontWeight: 400,
        color: 'var(--text-tertiary)',
        fontFamily: FONT,
        lineHeight: 1.35,
    },
    goalRadio: {
        width: 17,
        height: 17,
        borderRadius: '50%',
        border: '1.5px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'border-color 0.15s ease',
    },
    goalRadioSelected: { borderColor: 'var(--primary-main)' },
    goalRadioDot: { width: 7, height: 7, borderRadius: '50%', bgcolor: 'var(--primary-main)' },
    optionsToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        p: '0.7rem 0.95rem',
        borderRadius: '11px',
        border: '1px dashed var(--border-color)',
        bgcolor: 'var(--bg-subtle)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--titleColor)',
        fontFamily: FONT,
        textAlign: 'left',
        transition: 'border-color 0.15s ease',
        '&:hover': { borderColor: 'var(--primary-main)' },
        '&:focus-visible': { outline: '2px solid var(--primary-main)', outlineOffset: 2 },
    },
    optionsChevron: { color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', flexShrink: 0 },
    optionsBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.15rem',
        p: '1rem 1rem 1.1rem',
        borderRadius: '11px',
        border: '1px solid var(--border-color)',
        bgcolor: 'var(--bg-paper)',
    },
    chipGroup: { display: 'flex', flexWrap: 'wrap', gap: '0.45rem' },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        p: '0.4rem 0.8rem',
        borderRadius: '20px',
        border: '1px solid transparent',
        bgcolor: 'var(--bg-subtle)',
        color: 'var(--text-secondary)',
        fontSize: '0.8rem',
        fontWeight: 500,
        fontFamily: FONT,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '& svg': { color: 'var(--text-tertiary)', transition: 'color 0.15s ease' },
        '&:hover': { borderColor: 'var(--border-color)', color: 'var(--titleColor)', '& svg': { color: 'var(--titleColor)' } },
        '&:focus-visible': { outline: '2px solid var(--primary-main)', outlineOffset: 2 },
    },
    chipSelected: {
        bgcolor: 'var(--bg-paper)',
        borderColor: 'var(--primary-main)',
        boxShadow: '0 0 0 3px var(--primary-light-bg)',
        color: 'var(--primary-main)',
        fontWeight: 600,
        '& svg': { color: 'var(--primary-main)' },
    },
    fieldRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        p: '0.7rem 0.9rem',
        border: '1px solid var(--border-color)',
        borderRadius: '11px',
        bgcolor: 'var(--bg-subtle)',
    },
    fieldRowIcon: {
        width: 30,
        height: 30,
        borderRadius: '8px',
        bgcolor: 'var(--primary-light-bg)',
        color: 'var(--primary-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    fieldRowText: { display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 },
    reassure: {
        m: 0,
        fontSize: '0.78rem',
        fontWeight: 400,
        color: 'var(--text-tertiary)',
        fontFamily: FONT,
        lineHeight: 1.45,
        textAlign: 'center',
    },
    error: {
        p: '0.65rem 0.85rem',
        borderRadius: '10px',
        bgcolor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        fontSize: '0.82rem',
        fontWeight: 500,
        fontFamily: FONT,
        lineHeight: 1.5,
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: '1rem 1.5rem',
        borderTop: '1px solid var(--sidebar-borderColor)',
        flexShrink: 0,
        bgcolor: 'var(--bg-subtle)',
        '& button': { minHeight: 42 },
    },
    backBtn: {
        textTransform: 'none',
        fontFamily: FONT,
        fontSize: '0.85rem',
        borderRadius: '10px',
        borderColor: 'var(--sidebar-borderColor)',
        color: 'var(--secondary-color)',
    },
    // Matches the app's shared AI gradient (.aiGenerateBtn / .aiFloatingBtn)
    generateBtn: {
        position: 'relative',
        overflow: 'hidden',
        textTransform: 'none',
        fontFamily: FONT,
        fontSize: '0.85rem',
        fontWeight: 600,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #6200B3 0%, #B300C3 100%)',
        boxShadow: '0 2px 12px rgba(98, 0, 179, 0.25)',
        transition: 'box-shadow 0.25s ease, transform 0.15s ease',
        '&:hover': {
            background: 'linear-gradient(135deg, #6200B3 0%, #B300C3 100%)',
            boxShadow: '0 4px 20px rgba(98, 0, 179, 0.4)',
            transform: 'translateY(-1px)',
        },
        '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '60%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
            animation: `${aiShimmer} 2.5s ease-in-out infinite`,
            pointerEvents: 'none',
        },
        '&.Mui-disabled': {
            background: 'linear-gradient(135deg, #6200B3 0%, #B300C3 100%)',
            color: '#fff',
            opacity: 0.6,
        },
    },
    spin: { animation: `${spin} 1s linear infinite` },
};

const PURPOSES = [
    { value: 'faq', label: 'Answer FAQs', desc: 'Instant replies to common questions', Icon: MessageCircleQuestion },
    { value: 'leads', label: 'Collect leads', desc: 'Qualify & capture contact details', Icon: UserPlus },
    { value: 'booking', label: 'Book appointments', desc: 'Schedule visits, demos & calls', Icon: CalendarCheck },
    { value: 'products', label: 'Showcase products', desc: 'Menus, catalogs & pricing', Icon: ShoppingBag },
    { value: 'orders', label: 'Order updates', desc: 'Status, tracking & returns', Icon: PackageSearch },
    { value: 'support', label: 'Support triage', desc: 'Route issues to the right team', Icon: Headset },
];

const COLLECT_OPTIONS = [
    { label: 'Name', Icon: User },
    { label: 'Phone', Icon: Phone },
    { label: 'Email', Icon: Mail },
    { label: 'Location', Icon: MapPin },
    { label: 'Budget', Icon: Wallet },
    { label: 'Requirements', Icon: ListChecks },
];

const TONES = ['Friendly', 'Professional', 'Casual'];

const MATCH_MODES = [
    { value: 'contains', label: 'Contains', hint: 'Keyword appears anywhere in the message' },
    { value: 'exact', label: 'Exact match', hint: 'Message exactly equals the keyword' },
];

const STEPS = [
    {
        title: 'Basics',
        heading: 'Name your flow & set its trigger',
        sub: 'The trigger decides when the bot jumps into a conversation.',
    },
    {
        title: 'Bot behaviour',
        heading: 'What should this bot do?',
        sub: 'Pick a goal and describe your business — AI builds the flow around it.',
    },
];

const AutomationSetupDialog = ({ open, onClose }) => {
    const generateAiFlow = useFlowStore((state) => state.generateAiFlow);
    const applyFlowMeta = useFlowStore((state) => state.applyFlowMeta);
    const flowsList = useFlowStore((state) => state.flowsList);
    const currentFlowId = useFlowStore((state) => state.flowId);

    const [step, setStep] = useState(0);
    const [flowName, setFlowName] = useState('');
    const [keywords, setKeywords] = useState('');
    const [matchMode, setMatchMode] = useState('contains');
    const [purpose, setPurpose] = useState('');
    const [description, setDescription] = useState('');
    const [menuOptions, setMenuOptions] = useState('');
    const [collectInfo, setCollectInfo] = useState([]);
    const [humanHandoff, setHumanHandoff] = useState(true);
    const [tone, setTone] = useState('Friendly');
    const [extra, setExtra] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const keywordList = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .filter((k, i, arr) => arr.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i);
    const purposeLabel = PURPOSES.find((p) => p.value === purpose)?.label;

    // Map every taken trigger keyword → owning flow name (two flows sharing a
    // keyword breaks routing, so keywords must be unique across all flows)
    const keywordOwner = {};
    flowsList.forEach((f) => {
        if (f.id === currentFlowId) return;
        const kw = f.triggerKeyword?.trim().toLowerCase();
        if (kw && !keywordOwner[kw]) keywordOwner[kw] = f.name || 'another flow';
    });
    const duplicateKeywords = keywordList.filter((k) => keywordOwner[k.toLowerCase()]);

    // Flow names must also be unique — mirrors the save-time validation in flowStore
    const duplicateFlowName =
        flowName.trim().length > 0 &&
        flowsList.some(
            (f) => f.id !== currentFlowId && f.name?.trim().toLowerCase() === flowName.trim().toLowerCase()
        );

    const canNext = () => {
        if (step === 0)
            return (
                flowName.trim().length > 0 &&
                !duplicateFlowName &&
                keywordList.length > 0 &&
                duplicateKeywords.length === 0
            );
        if (step === 1) return description.trim().length > 0;
        return true;
    };

    const reset = () => {
        setStep(0);
        setFlowName('');
        setKeywords('');
        setMatchMode('contains');
        setPurpose('');
        setDescription('');
        setMenuOptions('');
        setCollectInfo([]);
        setHumanHandoff(true);
        setTone('Friendly');
        setExtra('');
        setShowOptions(false);
        setGenerating(false);
        setError('');
    };

    const handleClose = (event, reason) => {
        if (generating) return;
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        reset();
        onClose();
    };

    const buildPrompt = () => {
        const parts = [
            'Build a WhatsApp auto-reply chatbot flow.',
            `Flow name: "${flowName.trim()}".`,
            `Trigger keywords: ${keywordList.map((k) => `"${k}"`).join(', ')} (match mode: ${matchMode === 'exact' ? 'exact match' : 'message contains the keyword'}).`,
            purposeLabel && `Main goal of this bot: ${purposeLabel}.`,
            `About the business and what the bot should help with: ${description.trim()}.`,
            menuOptions.trim() && `The welcome message should offer these options: ${menuOptions.trim()}.`,
            collectInfo.length > 0 && `The flow should collect these details from the customer: ${collectInfo.join(', ')}.`,
            humanHandoff && 'Always include a visible "Talk to a human" option that hands off to a live agent.',
            `Tone of voice: ${tone.toLowerCase()}.`,
            extra.trim() && `Additional requirements: ${extra.trim()}.`,
            'Keep every message short and conversational. Use buttons or list menus for choices instead of asking users to type.',
            'End every branch at a clear endpoint — answer delivered, detail collected, booking confirmed, or agent handoff.',
        ];
        return parts.filter(Boolean).join('\n');
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        const result = await generateAiFlow(buildPrompt());
        if (result.success) {
            applyFlowMeta({
                name: flowName.trim(),
                description: description.trim(),
                keywords: keywordList,
                triggerMode: matchMode,
            });
            reset();
            onClose();
        } else {
            setError(result.error || 'AI flow generation failed. Please try again.');
            setGenerating(false);
        }
    };

    const toggleCollect = (opt) => {
        setCollectInfo((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
    };

    const current = STEPS[step];

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={handleClose}
            transitionDuration={{ enter: 180, exit: 140 }}
            slotProps={{ paper: { sx: sx.dialog } }}
        >
            {/* Header */}
            <Box sx={sx.header}>
                <Box sx={sx.headerLeft}>
                    <Box component="span" sx={sx.title}>New Automation</Box>
                    <Box component="span" sx={sx.subtitle}>
                        Step {step + 1} of {STEPS.length} — {current.title}
                    </Box>
                </Box>
                <IconButton size="small" onClick={handleClose} disabled={generating} sx={sx.closeBtn}>
                    <X size={18} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={sx.body}>
                <Box key={step} sx={sx.stepPane}>
                    <Box sx={sx.stepHead}>
                        <Box component="h3" sx={sx.stepHeading}>{current.heading}</Box>
                        <Box component="p" sx={sx.stepSub}>{current.sub}</Box>
                    </Box>

                    {step === 0 && (
                        <>
                            <Box sx={sx.field}>
                                <Box component="label" sx={sx.label}>
                                    Flow name <Box component="span" sx={sx.required}>*</Box>
                                </Box>
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="e.g. Welcome Support Bot"
                                    value={flowName}
                                    onChange={(e) => setFlowName(e.target.value.replace(/\s+/g, '_'))}
                                    sx={sx.input}
                                    error={duplicateFlowName}
                                />
                                {duplicateFlowName ? (
                                    <Box component="span" sx={sx.hintError}>
                                        &quot;{flowName.trim()}&quot; is already used by another flow. Choose a different name.
                                    </Box>
                                ) : (
                                    <Box component="span" sx={sx.hint}>
                                        Internal name — only you see this. Spaces become underscores.
                                    </Box>
                                )}
                            </Box>

                            <Box sx={sx.field}>
                                <Box component="label" sx={sx.label}>
                                    Trigger keywords <Box component="span" sx={sx.required}>*</Box>
                                    <Tooltip title="The bot starts when a customer sends one of these words" arrow>
                                        <HelpCircle size={13} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-tertiary)', cursor: 'help' }} />
                                    </Tooltip>
                                </Box>
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="e.g. hi, hello, menu"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    sx={sx.input}
                                    error={duplicateKeywords.length > 0}
                                    InputProps={{
                                        startAdornment: <Hash size={14} style={{ marginRight: 6, color: 'var(--text-tertiary)', flexShrink: 0 }} />,
                                    }}
                                />
                                {keywordList.length > 0 && (
                                    <Box sx={sx.keywordPreview}>
                                        {keywordList.map((k) => (
                                            <Box
                                                component="span"
                                                key={k}
                                                sx={[sx.keywordChip, keywordOwner[k.toLowerCase()] && sx.keywordChipTaken]}
                                            >
                                                <Hash size={10} />
                                                {k}
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                {duplicateKeywords.length > 0 ? (
                                    <Box component="span" sx={sx.hintError}>
                                        {duplicateKeywords.map((k) => `"${k}"`).join(', ')}{' '}
                                        already {duplicateKeywords.length === 1 ? 'starts' : 'start'} another flow (
                                        {[...new Set(duplicateKeywords.map((k) => keywordOwner[k.toLowerCase()]))].join(', ')}
                                        ). Try {duplicateKeywords.length === 1 ? 'a different keyword' : 'different keywords'} so each bot knows when to reply.
                                    </Box>
                                ) : keywordList.length === 0 ? (
                                    <Box component="span" sx={sx.hint}>Separate multiple keywords with commas.</Box>
                                ) : null}
                            </Box>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <Box sx={sx.field}>
                                <Box component="label" sx={sx.label}>
                                    Main goal <Box component="span" sx={sx.optional}>(optional)</Box>
                                </Box>
                                <Box sx={sx.goalList}>
                                    {PURPOSES.map(({ value, label, desc, Icon }) => (
                                        <Box
                                            component="button"
                                            type="button"
                                            key={value}
                                            sx={[sx.goalCard, purpose === value && sx.goalCardSelected]}
                                            onClick={() => setPurpose(purpose === value ? '' : value)}
                                        >
                                            <Box component="span" sx={[sx.goalIcon, purpose === value && sx.goalIconSelected]}>
                                                <Icon size={16} />
                                            </Box>
                                            <Box component="span" sx={sx.goalText}>
                                                <Box component="span" sx={sx.goalLabel}>{label}</Box>
                                                <Box component="span" sx={sx.goalDesc}>{desc}</Box>
                                            </Box>
                                            <Box component="span" sx={[sx.goalRadio, purpose === value && sx.goalRadioSelected]}>
                                                {purpose === value && <Box component="span" sx={sx.goalRadioDot} />}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            <Box sx={sx.field}>
                                <Box component="label" sx={sx.label}>
                                    Describe your business &amp; what the bot should help with{' '}
                                    <Box component="span" sx={sx.required}>*</Box>
                                </Box>
                                <TextField
                                    size="small"
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    placeholder="e.g. Jewellery store — greet customers, show collections, book visits"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    sx={sx.input}
                                />
                                <Box component="span" sx={sx.hint}>The more detail you give, the better the generated flow.</Box>
                            </Box>

                            {/* Optional fine-tuning — hidden by default, AI fills the gaps */}
                            <Box
                                component="button"
                                type="button"
                                sx={sx.optionsToggle}
                                onClick={() => setShowOptions((v) => !v)}
                                aria-expanded={showOptions}
                            >
                                <ChevronDown
                                    size={16}
                                    style={{
                                        color: 'var(--text-tertiary)',
                                        transition: 'transform 0.2s ease',
                                        flexShrink: 0,
                                        transform: showOptions ? 'rotate(180deg)' : 'none',
                                    }}
                                />
                                <span>More options</span>
                                <Box component="span" sx={sx.optional}>(optional — menu items, data collection, handoff &amp; tone)</Box>
                            </Box>

                            {showOptions && (
                                <Box sx={sx.optionsBody}>
                                    <Box sx={sx.field}>
                                        <Box component="label" sx={sx.label}>Keyword match type</Box>
                                        <Box sx={sx.segmented}>
                                            {MATCH_MODES.map((opt) => (
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    key={opt.value}
                                                    sx={[sx.segment, matchMode === opt.value && sx.segmentActive]}
                                                    onClick={() => setMatchMode(opt.value)}
                                                >
                                                    <Box component="span" sx={sx.segmentLabel}>{opt.label}</Box>
                                                    <Box component="span" sx={sx.segmentHint}>{opt.hint}</Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>

                                    <Box sx={sx.field}>
                                        <Box component="label" sx={sx.label}>Menu options in the welcome message</Box>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="e.g. Browse products, Check order status, Talk to support"
                                            value={menuOptions}
                                            onChange={(e) => setMenuOptions(e.target.value)}
                                            sx={sx.input}
                                        />
                                        <Box component="span" sx={sx.hint}>Comma-separated — these become buttons or list items.</Box>
                                    </Box>

                                    <Box sx={sx.field}>
                                        <Box component="label" sx={sx.label}>Info to collect from customers</Box>
                                        <Box sx={sx.chipGroup}>
                                            {COLLECT_OPTIONS.map(({ label, Icon }) => {
                                                const selected = collectInfo.includes(label);
                                                return (
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        key={label}
                                                        sx={[sx.chip, selected && sx.chipSelected]}
                                                        onClick={() => toggleCollect(label)}
                                                    >
                                                        <Icon size={13} />
                                                        {label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>

                                    <Box sx={sx.fieldRow}>
                                        <Box sx={sx.fieldRowIcon}>
                                            <Handshake size={16} />
                                        </Box>
                                        <Box sx={sx.fieldRowText}>
                                            <Box component="span" sx={sx.label}>&quot;Talk to a human&quot; option</Box>
                                            <Box component="span" sx={sx.hint}>Let customers reach a live agent at any point — recommended.</Box>
                                        </Box>
                                        <Switch
                                            checked={humanHandoff}
                                            onChange={(e) => setHumanHandoff(e.target.checked)}
                                            size="small"
                                            color="success"
                                        />
                                    </Box>

                                    <Box sx={sx.field}>
                                        <Box component="label" sx={sx.label}>Tone of voice</Box>
                                        <Box sx={sx.segmented}>
                                            {TONES.map((t) => (
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    key={t}
                                                    sx={[sx.segment, sx.segmentCompact, tone === t && sx.segmentActive]}
                                                    onClick={() => setTone(t)}
                                                >
                                                    <Box component="span" sx={sx.segmentLabel}>{t}</Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>

                                    <Box sx={sx.field}>
                                        <Box component="label" sx={sx.label}>Anything else?</Box>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            placeholder="e.g. Send our catalog PDF when users ask for prices."
                                            value={extra}
                                            onChange={(e) => setExtra(e.target.value)}
                                            sx={sx.input}
                                        />
                                    </Box>
                                </Box>
                            )}

                            <Box component="p" sx={sx.reassure}>
                                AI builds the full flow for you — you can edit every detail in the flow builder afterwards.
                            </Box>
                        </>
                    )}
                </Box>
                {error && <Box sx={sx.error}>{error}</Box>}
            </Box>

            {/* Footer */}
            <Box sx={sx.footer}>
                {step === 0 ? (
                    <Button variant="outlined" sx={sx.backBtn} onClick={handleClose} disabled={generating}>
                        Cancel
                    </Button>
                ) : (
                    <Button
                        variant="outlined"
                        sx={sx.backBtn}
                        startIcon={<ArrowLeft size={15} />}
                        onClick={() => setStep((s) => s - 1)}
                        disabled={generating}
                    >
                        Back
                    </Button>
                )}
                {step < STEPS.length - 1 ? (
                    <Button
                        variant="contained"
                        className="buttonClassname"
                        endIcon={<ArrowRight size={15} />}
                        onClick={() => setStep((s) => s + 1)}
                        disabled={!canNext()}
                    >
                        Continue
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        sx={sx.generateBtn}
                        startIcon={generating ? <Box component="span" sx={{ ...sx.spin, display: 'inline-flex' }}><Loader2 size={15} /></Box> : <Wand2 size={15} />}
                        onClick={handleGenerate}
                        disabled={generating}
                    >
                        {generating ? 'Generating your flow...' : 'Generate Flow'}
                    </Button>
                )}
            </Box>
        </Drawer>
    );
};

export default AutomationSetupDialog;
