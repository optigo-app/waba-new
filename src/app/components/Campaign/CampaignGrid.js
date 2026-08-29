import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid } from '@mui/x-data-grid';
import { Paper, Chip, Box, Typography, Button, ToggleButtonGroup, ToggleButton, Grid, Card, CardContent, Tooltip, CircularProgress, Popover } from '@mui/material';
import { BarChart3, Copy, Rocket, Edit2, Plus, RefreshCw, Megaphone, LayoutGrid, List, AlertTriangle, Trash2, SlidersHorizontal, MoreHorizontal } from 'lucide-react';
import FilterBar from '../Common/FilterBar/FilterBar';
import IconButton from '../Common/IconButton';
import Pagination from '../Common/Pagination/Pagination';
import CountdownButton from './CountdownButton';
import { fetchCampaignLists } from '../../api/CampaignList';
import { deleteCampaign } from '../../api/DeleteCampaign';
import { getCampaignTimers, setCampaignTimers, setCampaignDraft } from '../../utils/storage';
import { fetchCampaignDetails } from '../../api/FetchCampaignDetails';
import { fetchCampaignCustomerList } from '../../api/FetchCampaignCustomerList';
import { extractAudienceFromResponse } from './utils/audienceMapper';
import { sendBulk } from '../../api/SendBulk';
import { useAuthToken } from '../../hooks/useAuthToken';
import { useWallet } from '../../contexts/WalletContext';
import styles from './CampaignGrid.module.scss';
import { formatDate } from '../../utils/globalFunc';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import ConfettiCanvas from '../Dashboard/ConfettiCanvas';
import { playCelebrationSound } from '../../utils/celebrationSound';
import toast from 'react-hot-toast';

// ── Stable helpers ────────────────────────────────────────────────────────────
const getStatusConfig = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return { label: 'Completed', color: 'var(--success-main)', bg: 'var(--success-light-bg)' };
    case 'pending': return { label: 'Pending', color: 'var(--warning-main)', bg: 'var(--warning-light-bg)' };
    case 'active': return { label: 'Active', color: 'var(--info-main)', bg: 'var(--info-light-bg)' };
    case 'failed': return { label: 'Failed', color: 'var(--error-main)', bg: 'var(--error-light-bg)' };
    default: return { label: status || 'Unknown', color: 'var(--text-secondary)', bg: 'var(--neutral-light-bg)' };
  }
};

const getTypeConfig = (type) => {
  switch (type?.toLowerCase()) {
    case 'schedule': return { label: 'Schedule', color: 'var(--info-main)', bg: 'var(--info-light-bg)' };
    case 'immediate': return { label: 'Immediate', color: 'var(--primary-main)', bg: 'var(--primary-light-bg)' };
    case 'recurring': return { label: 'Recurring', color: 'var(--warning-main)', bg: 'var(--warning-light-bg)' };
    default: return { label: type || 'Unknown', color: 'var(--text-primary)', bg: 'var(--neutral-light-bg)' };
  }
};

// ── Action menu (popover with card-style items) ───────────────────────────────
const POPOVER_PAPER_SX = {
  borderRadius: '14px',
  boxShadow: 'var(--paper-shadow)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-paper)',
  p: 0.5,
  minWidth: 250,
  animation: 'menuPopIn 0.18s ease-out',
  '@keyframes menuPopIn': {
    '0%': { opacity: 0, transform: 'scale(0.92) translateY(-4px)' },
    '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
  },
};

const ActionMenuItem = ({ icon: Icon, label, description, color, onClick, disabled, disabledReason }) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.25,
      px: 1.5,
      py: 1.25,
      borderRadius: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      transition: 'background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
      '&:hover': disabled ? {} : {
        backgroundColor: `rgba(${color}, 0.06)`,
        transform: 'translateX(3px)',
        boxShadow: `inset 3px 0 0 rgb(${color})`,
        '& .menu-item-icon': {
          transform: 'scale(1.12) rotate(-3deg)',
          backgroundColor: `rgba(${color}, 0.22)`,
        },
      },
    }}
  >
    <Box
      className="menu-item-icon"
      sx={{
        width: 34,
        height: 34,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: `rgba(${color}, 0.12)`,
        color: `rgb(${color})`,
        transition: 'transform 0.18s ease, background-color 0.18s ease',
        mt: 0.25,
      }}
    >
      <Icon size={17} />
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, minWidth: 0, flex: 1 }}>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Poppins, sans-serif', color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 400, fontFamily: 'Poppins, sans-serif', color: 'var(--text-tertiary)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {description}
      </Typography>
      {disabled && disabledReason && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.25,
            px: 0.75,
            py: 0.3,
            borderRadius: '6px',
            backgroundColor: 'var(--warning-light-bg)',
            border: '1px solid rgba(245, 124, 0, 0.2)',
          }}
        >
          <AlertTriangle size={11} color="var(--warning-main)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 500, fontFamily: 'Poppins, sans-serif', color: 'var(--warning-main)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
            {disabledReason}
          </Typography>
        </Box>
      )}
    </Box>
  </Box>
);

const ActionMenu = ({ items, triggerEl, anchorPos, open, onClose, onOpenFromIcon }) => {
  // Icon-triggered mode (internal state)
  const [iconAnchorEl, setIconAnchorEl] = useState(null);
  const iconOpen = Boolean(iconAnchorEl);

  const handleIconOpen = (e) => {
    e.stopPropagation();
    setIconAnchorEl(e.currentTarget);
  };
  const handleIconClose = () => setIconAnchorEl(null);

  // External mode (right-click) — controlled by parent via anchorPos/open
  const isControlled = anchorPos !== undefined;

  const currentOpen = isControlled ? open : iconOpen;
  const handleClose = isControlled ? onClose : handleIconClose;

  return (
    <>
      {!isControlled && (
        <IconButton icon={MoreHorizontal} color="secondary" tooltip="More actions" onClick={handleIconOpen} />
      )}
      <Popover
        open={currentOpen}
        anchorEl={isControlled ? undefined : iconAnchorEl}
        anchorPosition={isControlled ? { top: anchorPos?.y || 0, left: anchorPos?.x || 0 } : undefined}
        onClose={handleClose}
        anchorReference={isControlled ? 'anchorPosition' : 'anchorEl'}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: POPOVER_PAPER_SX,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0.5 }}>
          {items.map((item, i) => (
            <ActionMenuItem key={i} {...item} onClick={() => { handleClose(); item.onClick?.(); }} />
          ))}
        </Box>
      </Popover>
    </>
  );
};

// ── Stable column definitions ─────────────────────────────────────────────────
const buildColumns = (onAnalytics, onDuplicate, onDownload, onLaunch, onStop, onEdit, onDelete, getActiveTimers, launchingCampaignIds) => {
  return [
    {
      field: 'actions', headerName: 'ACTION', minWidth: 140, sortable: false,
      filterable: false, disableColumnMenu: true,
      renderCell: (params) => {
        const isPending = Number(params.row.Status) === 1;
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pl: 1 }}>
            {(Number(params.row.Type) === 1 && Number(params.row.Status) === 1) && (
              (() => {
                const timers = getActiveTimers();
                const hasActiveTimer = Object.keys(timers).length > 0;
                const rowTimer = timers[String(params.row.Id)];
                if (rowTimer) {
                  return (
                    <CountdownButton
                      expiry={rowTimer}
                      onStop={onStop}
                      row={params.row}
                    />
                  );
                }
                if (launchingCampaignIds.has(String(params.row.Id))) {
                  return (
                    <IconButton
                      icon={CircularProgress}
                      color="primary"
                      tooltip="Launching..."
                      disabled
                      className={styles.rocketHighlight}
                    />
                  );
                }
                return (
                  <IconButton
                    icon={Rocket}
                    color="primary"
                    tooltip={hasActiveTimer ? "Another launch in progress" : "Launch"}
                    onClick={() => onLaunch(params.row)}
                    disabled={hasActiveTimer}
                    className={styles.rocketHighlight}
                  />
                );
              })()
            )}
            <ActionMenu
              items={[
                { icon: BarChart3, label: 'Analytics', description: 'View campaign report & insights', color: '29, 170, 97', onClick: () => onAnalytics(params.row), disabled: isPending, disabledReason: 'Available after campaign is launched' },
                { icon: Copy, label: 'Quick Clone', description: 'Duplicate this campaign setup', color: '0, 207, 232', onClick: () => onDuplicate(params.row) },
                ...(isPending ? [
                  { icon: Edit2, label: 'Edit', description: 'Modify campaign details & audience', color: '125, 127, 133', onClick: () => onEdit(params.row) },
                  { icon: Trash2, label: 'Delete', description: 'Permanently remove this campaign', color: '211, 47, 47', onClick: () => onDelete(params.row) },
                ] : []),
              ]}
            />
          </Box>
        );
      },
    },
    {
      field: 'Name', headerName: 'NAME', minWidth: 200, flex: 1.5,
      renderCell: (p) => {
        const isPending = Number(p.row.Status) === 1;
        return (
          <Typography
            variant="body2"
            onClick={() => { if (!isPending) onAnalytics(p.row); }}
            sx={{
              fontWeight: 600,
              color: 'var(--title-color)',
              fontSize: '0.875rem',
              cursor: isPending ? 'default' : 'pointer',
              transition: 'color 0.15s ease',
              '&:hover': isPending ? {} : { color: 'var(--primary-main)' },
            }}
          >
            {p.value || '—'}
          </Typography>
        );
      },
    },
    {
      field: 'WhatsappName', headerName: 'CHANNEL', minWidth: 140, flex: 0.8,
      renderCell: (p) => (
        <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem', fontWeight: 500 }}>
          {p.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'Type', headerName: 'TYPE', minWidth: 120, flex: 0.7,
      renderCell: (p) => {
        // Type is numeric: 1=Immediate, 2=Schedule, 3=Recurring
        const typeLabel = p.value === 1 ? 'Immediate' : p.value === 2 ? 'Schedule' : p.value === 3 ? 'Recurring' : String(p.value || '');
        const cfg = getTypeConfig(typeLabel);
        return <Chip label={cfg.label} size="small" sx={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: '0.72rem', height: 22, fontWeight: 600 }} />;
      },
    },
    {
      field: 'Status', headerName: 'STATUS', minWidth: 120, flex: 0.7,
      renderCell: (p) => {
        // Status is numeric: 1=Pending, 2=Active, 3=Completed, 4=Failed
        const statusLabel = p.value === 1 ? 'Pending' : p.value === 2 ? 'Active' : p.value === 3 ? 'Completed' : p.value === 4 ? 'Failed' : String(p.value || '');
        const cfg = getStatusConfig(statusLabel);
        return <Chip label={cfg.label} size="small" sx={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: '0.72rem', height: 22, fontWeight: 600 }} />;
      },
    },
    {
      field: 'Receiver', headerName: 'RECEIVERS', minWidth: 80, flex: 0.6, type: 'number',
      renderCell: (p) => (
        <Chip label={p.value ?? 0} size="small" sx={{ fontSize: '0.72rem', height: 22, fontWeight: 500 }} />
      ),
    },
    {
      field: 'Message', headerName: 'MESSAGES', minWidth: 100, flex: 0.6, type: 'number',
      renderCell: (p) => (
        <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontWeight: 600, fontSize: '0.875rem' }}>
          {p.value ?? 0}
        </Typography>
      ),
    },
    {
      field: 'EntryDate', headerName: 'CREATED ON', minWidth: 146, flex: 0.8,
      renderCell: (p) => (
        <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem' }}>
          {formatDate(p.value) || '—'}
        </Typography>
      ),
    },
    {
      field: 'ScheduleTime', headerName: 'SCHEDULED FOR', minWidth: 150, flex: 0.9,
      renderCell: (p) => {
        if (!p.value) return <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem' }}>—</Typography>;
        return (
          <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem', lineHeight: 1.4 }}>
            {formatDate(p.value)}
          </Typography>
        );
      },
    },
    {
      field: 'ProcessTime', headerName: 'PROCESSED ON', minWidth: 150, flex: 0.9,
      renderCell: (p) => {
        if (!p.value) return <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem' }}>—</Typography>;
        return (
          <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem', lineHeight: 1.4 }}>
            {formatDate(p.value)}
          </Typography>
        );
      },
    },
    {
      field: 'ComplateTime', headerName: 'COMPLETED ON', minWidth: 150, flex: 0.9,
      renderCell: (p) => {
        if (!p.value) return <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem' }}>—</Typography>;
        return (
          <Typography variant="body2" sx={{ color: 'var(--text-2nd-color)', fontSize: '0.8rem', lineHeight: 1.4 }}>
            {formatDate(p.value)}
          </Typography>
        );
      },
    },
  ];
};

// ── Component ─────────────────────────────────────────────────────────────────
const CampaignGrid = () => {
  const router = useRouter();
  const { userToken } = useAuthToken();
  const userId = userToken?.userId || userToken?.userid || userToken?.appuserid || '';
  const username = userToken?.username || userToken?.userName || userToken?.userid || userToken?.appuserid || '';

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [launchConfirmOpen, setLaunchConfirmOpen] = useState(false);
  const [campaignToLaunch, setCampaignToLaunch] = useState(null);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [insufficientCampaign, setInsufficientCampaign] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [launchingCampaignIds, setLaunchingCampaignIds] = useState(() => new Set());
  const launchingCampaignIdsRef = useRef(new Set());
  const sendingCampaignIdsRef = useRef(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 100 });
  const [cardPage, setCardPage] = useState(0);
  const [cardRowsPerPage, setCardRowsPerPage] = useState(15);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, row } for right-click
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const { channels } = useWallet();
  const campaignsRef = useRef([]);

  const [activeTimers, setActiveTimers] = useState(() => {
    try {
      const saved = getCampaignTimers();
      if (saved) {
        const timers = saved;
        const now = Date.now();
        const validTimers = {};
        Object.entries(timers).forEach(([id, expiry]) => {
          if (expiry > now) validTimers[id] = expiry;
        });
        return validTimers;
      }
    } catch (e) { console.error('Error loading timers:', e); }
    return {};
  });

  const activeTimersRef = useRef(activeTimers);
  useEffect(() => { activeTimersRef.current = activeTimers; }, [activeTimers]);

  const loadCampaigns = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    const result = await fetchCampaignLists(username, selectedChannel);
    const raw = result.data || [];
    // Deduplicate by Id to prevent DataGrid duplicate key errors
    const seen = new Set();
    const deduped = [];
    for (const row of raw) {
      const id = Number(row?.Id);
      if (!seen.has(id)) {
        seen.add(id);
        deduped.push(row);
      }
    }
    setCampaigns(deduped);
    campaignsRef.current = deduped;
    setLoading(false);
  }, [username, selectedChannel]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const triggerSendBulk = useCallback(async (campaignId) => {
    const campaignKey = String(campaignId);
    if (!campaignId || launchingCampaignIdsRef.current.has(campaignKey) || sendingCampaignIdsRef.current.has(campaignKey)) return;

    sendingCampaignIdsRef.current.add(campaignKey);
    launchingCampaignIdsRef.current.add(campaignKey);

    // Force re-render for UI only (spinner icon)
    setLaunchingCampaignIds(new Set(launchingCampaignIdsRef.current));

    // Look up the campaign's ChannelId for AccountId
    const campaign = campaignsRef.current.find((c) => Number(c?.Id) === Number(campaignId));
    const accountId = campaign?.ChannelId || '';

    try {
      const response = await sendBulk({
        appuserid: userId || '',
        userId: userToken?.id || '',
        campaignId,
        whatsappNumber: userToken?.whatsappNumber,
        accountId,
      });

      if (response?.success || response?.stat === 1 || response?.stat_code === 1000) {
        setCampaigns(prev => prev.map(campaign =>
          Number(campaign?.Id) === Number(campaignId)
            ? {
              ...campaign,
              Status: 3,
              ComplateTime: campaign.ComplateTime || new Date().toISOString(),
            }
            : campaign
        ));
        setShowConfetti(true);
        playCelebrationSound();
        setTimeout(() => setShowConfetti(false), 3000);
        toast.success(`Campaign ${campaignId} completed`);
        await loadCampaigns();
      } else {
        toast.error(`Failed to send campaign ${campaignId}`);
      }
    } catch (error) {
      console.error('Error triggering send bulk:', error);
      toast.error(`Error sending campaign ${campaignId}`);
    } finally {
      launchingCampaignIdsRef.current.delete(campaignKey);
      sendingCampaignIdsRef.current.delete(campaignKey);
      
      // Update UI state after
      setLaunchingCampaignIds(new Set(launchingCampaignIdsRef.current));
    }
  }, [userId, userToken?.id, userToken?.whatsappNumber, loadCampaigns]);

  const triggerSendBulkRef = useRef(triggerSendBulk);

  useEffect(() => {
    triggerSendBulkRef.current = triggerSendBulk;
  }, [triggerSendBulk]);

  // Timer logic - single interval, reads from ref, minimal state updates
  useEffect(() => {
    setCampaignTimers(activeTimers);
  }, [activeTimers]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timers = activeTimersRef.current;
      const expiredIds = Object.keys(timers).filter(id => timers[id] <= now);

      if (expiredIds.length > 0) {
        setActiveTimers(prev => {
          const next = { ...prev };
          expiredIds.forEach((id) => delete next[id]);
          return next;
        });
        expiredIds.forEach((id) => {
          triggerSendBulkRef.current(Number(id));
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Action handlers
  const handlers = useMemo(() => ({
    onAnalytics: (row) => router.push(`/campaign/report/${row.Id}?channelId=${row.ChannelId || ''}`),
    onDuplicate: async (row) => {
      try {
        toast.loading('Fetching campaign data...', { id: 'fetch-campaign' });
        const [result, audienceResult] = await Promise.all([
          fetchCampaignDetails(userId, row.Id, null, null, row.ChannelId),
          fetchCampaignCustomerList(userId, row.Id)
        ]);
        toast.dismiss('fetch-campaign');

        if (result.success && result.data) {
          const audienceData = audienceResult.success
            ? extractAudienceFromResponse(audienceResult.data)
            : extractAudienceFromResponse(result.data);
          const campaignData = {
            ...result.data.rd[0],
            templateData: result.data.rd1[0],
            audienceData,
            isClone: true
          };
          setCampaignDraft(campaignData);
          router.push('/campaign/create');
          toast.success('Campaign data loaded for cloning');
        } else {
          toast.error('Failed to fetch campaign details');
        }
      } catch (error) {
        toast.dismiss('fetch-campaign');
        toast.error('Error fetching campaign details');
        console.error('Error:', error);
      }
    },
    onDownload: (row) => {},
    onLaunch: (row) => {
      if (Object.keys(activeTimersRef.current).length > 0) {
        toast.error('Another campaign is currently being launched. Please wait or stop it first.');
        return;
      }
      // Check if campaign has sufficient balance from its own data
      const availableBalance = row.AvailableBalance ?? 0;
      const campaignBalance = row.CampaignBalance ?? 0;
      if (availableBalance < campaignBalance) {
        setInsufficientCampaign(row);
        setShowInsufficientBalanceModal(true);
        return;
      }
      setCampaignToLaunch(row);
      setLaunchConfirmOpen(true);
    },
    onEdit: async (row) => {
      try {
        toast.loading('Fetching campaign data...', { id: 'fetch-campaign' });
        const [result, audienceResult] = await Promise.all([
          fetchCampaignDetails(userId, row.Id, null, null, row.ChannelId),
          fetchCampaignCustomerList(userId, row.Id)
        ]);
        toast.dismiss('fetch-campaign');

        if (result.success && result.data) {
          const audienceData = audienceResult.success
            ? extractAudienceFromResponse(audienceResult.data)
            : extractAudienceFromResponse(result.data);
          const campaignData = {
            ...result.data.rd[0],
            templateData: result.data.rd1[0],
            audienceData,
            isEdit: true
          };
          setCampaignDraft(campaignData);
          router.push('/campaign/create');
          toast.success('Campaign data loaded for editing');
        } else {
          toast.error('Failed to fetch campaign details');
        }
      } catch (error) {
        toast.dismiss('fetch-campaign');
        toast.error('Error fetching campaign details');
        console.error('Error:', error);
      }
    },
    onDelete: (row) => {
      setCampaignToDelete(row);
      setDeleteConfirmOpen(true);
    },
    onStop: (row) => {
      setActiveTimers(prev => {
        const next = { ...prev };
        delete next[row.Id];
        return next;
      });
      toast.success(`Campaign "${row.Name}" stopped`);
    }
  }), [router, userId]);

  const contextMenuItems = useMemo(() => {
    if (!contextMenu?.row) return [];
    const row = contextMenu.row;
    const isPending = Number(row.Status) === 1;
    return [
      { icon: BarChart3, label: 'Analytics', description: 'View campaign report & insights', color: '29, 170, 97', onClick: () => handlers.onAnalytics(row), disabled: isPending, disabledReason: 'Available after campaign is launched' },
      { icon: Copy, label: 'Quick Clone', description: 'Duplicate this campaign setup', color: '0, 207, 232', onClick: () => handlers.onDuplicate(row) },
      ...(isPending ? [
        { icon: Edit2, label: 'Edit', description: 'Modify campaign details & audience', color: '125, 127, 133', onClick: () => handlers.onEdit(row) },
        { icon: Trash2, label: 'Delete', description: 'Permanently remove this campaign', color: '211, 47, 47', onClick: () => handlers.onDelete(row) },
      ] : []),
    ];
  }, [contextMenu, handlers]);

  const handleLaunchConfirm = () => {
    if (campaignToLaunch) {
      setActiveTimers(prev => ({
        ...prev,
        [campaignToLaunch.Id]: Date.now() + 30000
      }));
      toast.success(`Campaign "${campaignToLaunch.Name}" launched. You have 30 seconds to stop it.`);
      setLaunchConfirmOpen(false);
      setCampaignToLaunch(null);
    }
  };

  const handleLaunchCancel = () => {
    setLaunchConfirmOpen(false);
    setCampaignToLaunch(null);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      toast.loading('Deleting campaign...', { id: 'delete-campaign' });
      const result = await deleteCampaign(userToken?.username, campaignToDelete.Id, campaignToDelete.ChannelId);
      toast.dismiss('delete-campaign');

      if (result.success) {
        setCampaigns(prev => prev.filter(c => Number(c.Id) !== Number(campaignToDelete.Id)));
        toast.success(`Campaign "${campaignToDelete.Name}" deleted successfully`);
      } else {
        toast.error('Failed to delete campaign');
      }
    } catch (error) {
      toast.dismiss('delete-campaign');
      toast.error('Error deleting campaign');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setCampaignToDelete(null);
  };

  const columns = useMemo(() =>
    buildColumns(
      handlers.onAnalytics,
      handlers.onDuplicate,
      handlers.onDownload,
      handlers.onLaunch,
      handlers.onStop,
      handlers.onEdit,
      handlers.onDelete,
      () => activeTimersRef.current,
      launchingCampaignIds
    ),
    [handlers, launchingCampaignIds, activeTimers]
  );

  const statusCounts = useMemo(() =>
    campaigns.reduce((acc, c) => {
      const label = c.Status === 1 ? 'Pending' : c.Status === 2 ? 'Active' : c.Status === 3 ? 'Completed' : c.Status === 4 ? 'Failed' : 'Unknown';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {}),
    [campaigns]
  );

  const filteredData = useMemo(() => {
    let rows = [...campaigns];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(c => {
        const searchableFields = [
          c.Name,
          c.Status,
          c.Type,
          c.EntryDate,
          c.ScheduleTime,
          c.ProcessTime,
          c.ComplateTime,
          c.Receiver,
          c.Message,
          c.Id
        ].filter(Boolean).map(f => String(f).toLowerCase());

        return searchableFields.some(field => field.includes(q));
      });
    }

    if (filterStatus !== 'ALL') {
      const statusMap = { Pending: 1, Active: 2, Completed: 3, Failed: 4 };
      const statusNum = statusMap[filterStatus];
      if (statusNum) rows = rows.filter(c => c.Status === statusNum);
    }

    if (sortBy === 'newest') rows.sort((a, b) => new Date(b.EntryDate) - new Date(a.EntryDate));
    else if (sortBy === 'oldest') rows.sort((a, b) => new Date(a.EntryDate) - new Date(b.EntryDate));
    else if (sortBy === 'name') rows.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));

    return rows;
  }, [campaigns, search, filterStatus, sortBy]);

  const paginatedRows = useMemo(() =>
    filteredData.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize),
    [filteredData, paginationModel.page, paginationModel.pageSize]
  );

  // Keep latest paginatedRows in a ref so the context menu handler doesn't need it as a dep
  const paginatedRowsRef = useRef(paginatedRows);
  useEffect(() => { paginatedRowsRef.current = paginatedRows; }, [paginatedRows]);

  // Stable handler — no dependency on paginatedRows, reads from ref
  const handleRowContextMenu = useCallback((e) => {
    e.preventDefault();
    const rowId = e.currentTarget?.getAttribute('data-id');
    const campaign = paginatedRowsRef.current.find((c) => String(c.Id) === String(rowId));
    if (campaign) {
      setContextMenu({ x: e.clientX, y: e.clientY, row: campaign });
    }
  }, []);

  // Stable slotProps object — doesn't change between renders
  const rowSlotProps = useMemo(() => ({
    row: { onContextMenu: handleRowContextMenu },
  }), [handleRowContextMenu]);

  const cardPaginatedData = useMemo(() =>
    filteredData.slice(cardPage * cardRowsPerPage, (cardPage + 1) * cardRowsPerPage),
    [filteredData, cardPage, cardRowsPerPage]
  );

  const getRowClassNameMemo = useCallback((params) =>
    activeTimersRef.current[String(params.row.Id)] ? styles.stoppingRow : '',
    []
  );

  const filterChips = useMemo(() =>
    ['ALL', 'Completed', 'Pending', 'Active', 'Failed'].map((s) => ({
      value: s,
      label: s === 'ALL' ? `All (${campaigns.length})` : `${s} (${statusCounts[s] || 0})`,
    })),
    [campaigns.length, statusCounts]
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.headerIconWrap}>
            <Megaphone size={18} />
          </div>
          <div>
            <h2 className={styles.pageTitle}>Campaigns</h2>
            <p className={styles.pageSubtitle}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className={styles.topActions}>
          {/* Desktop: inline buttons */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: '0.6rem' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              className='toggle-button-group'
              size="medium"
            >
              <Tooltip title="Grid View" arrow>
                <ToggleButton value="grid"><LayoutGrid size={16} /></ToggleButton>
              </Tooltip>
              <Tooltip title="Card View" arrow>
                <ToggleButton value="card"><List size={16} /></ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <Button variant="outlined" className='varientOutlinedBtn' startIcon={<RefreshCw size={15} className={loading ? styles.spinning : ''} />} onClick={loadCampaigns} disabled={loading}>
              Refresh
            </Button>
            <Button variant="contained" className='buttonClassname' startIcon={<Plus size={16} />} onClick={() => router.push('/campaign/create')}>
              Add Campaign
            </Button>
          </Box>

          {/* Mobile: direct icon buttons */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: '0.4rem' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              className='toggle-button-group'
              size="small"
            >
              <Tooltip title="Grid View" arrow>
                <ToggleButton value="grid"><LayoutGrid size={14} /></ToggleButton>
              </Tooltip>
              <Tooltip title="Card View" arrow>
                <ToggleButton value="card"><List size={14} /></ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <Tooltip title="Refresh" arrow>
              <Button
                variant="outlined"
                className='varientOutlinedBtn'
                onClick={loadCampaigns}
                disabled={loading}
                sx={{ minWidth: 'auto', px: 1, py: 0.5 }}
              >
                <RefreshCw size={16} className={loading ? styles.spinning : ''} />
              </Button>
            </Tooltip>
            <Tooltip title="Add Campaign" arrow>
              <Button
                variant="contained"
                className='buttonClassname'
                onClick={() => router.push('/campaign/create')}
                sx={{ minWidth: 'auto', px: 1, py: 0.5 }}
              >
                <Plus size={16} />
              </Button>
            </Tooltip>
          </Box>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaigns..."
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterChips={filterChips}
        activeFilter={filterStatus}
        onFilterChange={setFilterStatus}
        channelOptions={channels && channels.length > 0 ? channels.map((ch) => ({ value: String(ch.Id), label: ch.whatsappName || ch.mobileNumber || `Channel ${ch.Id}`, MobileNumber: ch.MobileNumber })) : []}
        selectedChannel={selectedChannel}
        onChannelChange={setSelectedChannel}
      />

      {/* Status Tabs - tablet and mobile only */}
      <Box sx={{
        display: { xs: 'flex', md: 'none' },
        gap: 0.5,
        px: 0.5,
        py: 0.5,
        background: 'background.paper',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': { height: '3px' },
        '&::-webkit-scrollbar-thumb': { background: 'var(--text-placeholder)', borderRadius: '99px' },
      }}>
        {filterChips.map((chip) => {
          const isActive = filterStatus === chip.value;
          return (
            <Box
              key={chip.value}
              onClick={() => setFilterStatus(chip.value)}
              sx={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                px: 1.25,
                py: 0.6,
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                background: isActive ? 'var(--primary-main)' : 'transparent',
                color: isActive ? 'var(--button-color)' : 'var(--text-tertiary)',
                '&:hover': {
                  background: isActive ? 'var(--primary-main)' : 'var(--bg-light)',
                },
              }}
            >
              {chip.label}
            </Box>
          );
        })}
      </Box>

      {/* Grid */}
      <div className={styles.contentArea}>
        {viewMode === 'grid' ? (
          <Paper sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid', borderColor: 'var(--border-color)', overflow: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <DataGrid
                rows={paginatedRows}
                columns={columns}
                loading={loading}
                getRowId={(row) => row.Id}
                rowHeight={60}
                disableRowSelectionOnClick
                disableColumnMenu
                disableColumnFilter
                getRowClassName={getRowClassNameMemo}
                slotProps={rowSlotProps}
                sx={{
                  height: '100%',
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                  },
                  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
                  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
                }}
              />
            </Box>
          </Paper>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}>
            <Box sx={{ pb: 16 }}>
              <Grid container spacing={2}>
                {cardPaginatedData.map((campaign) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={campaign.Id}>
                    <Card
                      className={activeTimers[String(campaign.Id)] ? styles.stoppingCard : ''}
                      sx={{
                        height: '100%',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: 'var(--border-color)',
                        boxShadow: 'var(--box-shadow)',
                        transition: 'box-shadow 0.3s ease, transform 0.25s ease',
                        '&:hover': {
                          boxShadow: 'var(--paper-shadow)',
                          transform: 'translateY(-3px)',
                        },
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                    <CardContent sx={{ p: '18px 20px 16px', flex: 1, '&:last-child': { pb: '16px' } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                        {(() => {
                          const isPending = Number(campaign.Status) === 1;
                          return (
                            <Typography
                              onClick={() => { if (!isPending) handlers.onAnalytics(campaign); }}
                              sx={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '1rem',
                                lineHeight: 1.35,
                                wordBreak: 'break-word',
                                flex: 1,
                                cursor: isPending ? 'default' : 'pointer',
                                transition: 'color 0.15s ease',
                                '&:hover': isPending ? {} : { color: 'var(--primary-main)' },
                              }}
                            >
                              {campaign.Name || '—'}
                            </Typography>
                          );
                        })()}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {(() => {
                            const statusLabel = campaign.Status === 1 ? 'Pending' : campaign.Status === 2 ? 'Active' : campaign.Status === 3 ? 'Completed' : campaign.Status === 4 ? 'Failed' : String(campaign.Status || '');
                            const statusCfg = getStatusConfig(statusLabel);
                            return <Chip label={statusCfg.label} size="small" sx={{ backgroundColor: statusCfg.bg, color: statusCfg.color, fontSize: '0.7rem', fontWeight: 500, fontFamily: 'Poppins, sans-serif', height: 20, borderRadius: '4px' }} />;
                          })()}
                          <ActionMenu
                            items={[
                              { icon: BarChart3, label: 'Analytics', description: 'View campaign report & insights', color: '29, 170, 97', onClick: () => handlers.onAnalytics(campaign), disabled: Number(campaign.Status) === 1, disabledReason: 'Available after campaign is launched' },
                              { icon: Copy, label: 'Quick Clone', description: 'Duplicate this campaign setup', color: '0, 207, 232', onClick: () => handlers.onDuplicate(campaign) },
                              ...(Number(campaign.Status) === 1 ? [
                                { icon: Edit2, label: 'Edit', description: 'Modify campaign details & audience', color: '125, 127, 133', onClick: () => handlers.onEdit(campaign) },
                                { icon: Trash2, label: 'Delete', description: 'Permanently remove this campaign', color: '211, 47, 47', onClick: () => handlers.onDelete(campaign) },
                              ] : []),
                            ]}
                          />
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          background: 'var(--bg-subtle)',
                          borderRadius: '10px',
                          p: '10px 12px',
                          mb: 1.5,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            lineHeight: 1.6,
                            fontFamily: 'Poppins, sans-serif',
                          }}
                        >
                          Receivers: {campaign.Receiver ?? 0} &nbsp;·&nbsp; Messages: {campaign.Message ?? 0}
                        </Typography>
                        {(() => {
                          const typeLabel = campaign.Type === 1 ? 'Immediate' : campaign.Type === 2 ? 'Schedule' : campaign.Type === 3 ? 'Recurring' : String(campaign.Type || '');
                          const typeCfg = getTypeConfig(typeLabel);
                          return <Chip label={typeCfg.label} size="small" sx={{ backgroundColor: typeCfg.bg, color: typeCfg.color, fontSize: '0.7rem', fontWeight: 500, fontFamily: 'Poppins, sans-serif', height: 20, borderRadius: '4px', flexShrink: 0 }} />;
                        })()}
                      </Box>
                    </CardContent>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: '20px',
                        pb: '14px',
                        pt: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          color: 'var(--text-placeholder)',
                          fontSize: '0.68rem',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          letterSpacing: '0.3px',
                        }}
                      >
                        {formatDate(campaign.EntryDate) || '—'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {(() => {
                          const timers = activeTimers;
                          const hasActiveTimer = Object.keys(timers).length > 0;
                          const rowTimer = timers[String(campaign.Id)];
                          return (
                            (Number(campaign.Type) === 1 && Number(campaign.Status) === 1) && (
                              rowTimer ? (
                                <CountdownButton
                                  expiry={rowTimer}
                                  onStop={handlers.onStop}
                                  row={campaign}
                                />
                              ) : (
                                <IconButton
                                  icon={Rocket}
                                  color="primary"
                                  tooltip={hasActiveTimer ? "Another launch in progress" : "Launch"}
                                  onClick={() => handlers.onLaunch(campaign)}
                                  disabled={hasActiveTimer}
                                  iconClassName={launchingCampaignIds.has(String(campaign.Id)) ? styles.spinning : ''}
                                  className={styles.rocketHighlight}
                                />
                              )
                            )
                          );
                        })()}
                      </Box>
                    </Box>
                  </Card>
              </Grid>
            ))}
            </Grid>
            </Box>

            {/* Pagination - Sticky at bottom */}
            {filteredData.length > cardRowsPerPage && (
              <Pagination
                count={filteredData.length}
                page={cardPage}
                rowsPerPage={cardRowsPerPage}
                onPageChange={(_, p) => setCardPage(p)}
                onRowsPerPageChange={(val) => { setCardRowsPerPage(val); setCardPage(0); }}
              />
            )}
          </Box>
        )}
      </div>

      {/* Launch Confirmation Modal */}
      <ConfirmationModal
        isOpen={launchConfirmOpen}
        onClose={handleLaunchCancel}
        onConfirm={handleLaunchConfirm}
        title="Launch Campaign"
        description={`Are you sure you want to launch the campaign "${campaignToLaunch?.Name || 'this campaign'}"? Once launched, messages will start sending immediately to ${campaignToLaunch?.Receiver || 0} recipients.`}
      />

      {/* Insufficient Balance Modal */}
      <ConfirmationModal
        isOpen={showInsufficientBalanceModal}
        onClose={() => setShowInsufficientBalanceModal(false)}
        onConfirm={() => setShowInsufficientBalanceModal(false)}
        title="Insufficient Balance"
        description={`Your available balance is ₹${insufficientCampaign?.AvailableBalance?.toLocaleString('en-IN') || 0}. This campaign requires ₹${insufficientCampaign?.CampaignBalance?.toLocaleString('en-IN') || 0} to launch. Please recharge your wallet to continue.`}
        icon={AlertTriangle}
        isDanger={false}
        confirmLabel="OK"
        hideCancel={true}
        maxWidth="400px"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Campaign"
        description={`Are you sure you want to delete the campaign "${campaignToDelete?.Name || 'this campaign'}"? This action cannot be undone.`}
        icon={Trash2}
        isDanger={true}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />

      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
          <ConfettiCanvas active={showConfetti} duration={3000} />
        </div>
      )}

      {/* Right-click context menu — always mounted, toggled via open prop */}
      <ActionMenu
        items={contextMenuItems}
        anchorPos={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: 0, y: 0 }}
        open={Boolean(contextMenu)}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default CampaignGrid;
