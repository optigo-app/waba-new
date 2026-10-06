import React from 'react';
import { Drawer, Box, Chip, Button } from '@mui/material';
import {
  Megaphone, X, BarChart3, Copy, Edit2, Trash2,
  Users, Wallet, CalendarPlus, Clock, Send, CheckCircle2,
  Zap, RefreshCw, Phone,
} from 'lucide-react';
import { formatDate } from '../../utils/globalFunc';
import styles from './CampaignGrid.module.scss';

const STATUS_LABELS = { 1: 'Pending', 2: 'Active', 3: 'Completed', 4: 'Failed' };
const TYPE_LABELS = { 1: 'Immediate', 2: 'Schedule', 3: 'Recurring' };
const TYPE_ICONS = { 1: Zap, 2: Clock, 3: RefreshCw };

const CHIP_SX = {
  fontSize: '0.72rem',
  fontWeight: 600,
  height: 24,
  borderRadius: '6px',
  fontFamily: 'Poppins, sans-serif',
  '& .MuiChip-icon': { marginLeft: '6px', color: 'inherit' },
  '& .MuiChip-label': { px: '7px' },
};

const getStatusConfig = (label) => {
  switch (label) {
    case 'Completed': return { color: 'var(--success-main)', bg: 'var(--success-light-bg)' };
    case 'Pending': return { color: 'var(--warning-main)', bg: 'var(--warning-light-bg)' };
    case 'Active': return { color: 'var(--info-main)', bg: 'var(--info-light-bg)' };
    case 'Failed': return { color: 'var(--error-main)', bg: 'var(--error-light-bg)' };
    default: return { color: 'var(--text-secondary)', bg: 'var(--neutral-light-bg)' };
  }
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className={`${styles.statCard} ${styles[`stat${tone}`]}`}>
    <span className={styles.statCardLabel}>{label}</span>
    <div className={styles.statCardBody}>
      <span className={styles.statCardValue}>{value}</span>
      <span className={styles.statCardIcon}><Icon size={16} /></span>
    </div>
  </div>
);

const TimelineItem = ({ icon: Icon, label, time, done, last }) => (
  <div className={`${styles.timelineItem} ${done ? styles.timelineDone : ''} ${last ? styles.timelineLast : ''}`}>
    <span className={styles.timelineDot}>
      <Icon size={12} />
    </span>
    <div className={styles.timelineBody}>
      <span className={styles.timelineLabel}>{label}</span>
      <span className={styles.timelineTime}>{time ? formatDate(time) : '—'}</span>
    </div>
  </div>
);

const ActionBtn = ({ icon: Icon, label, description, onClick, disabled, danger }) => (
  <button
    type="button"
    className={`${styles.drawerActionBtn} ${danger ? styles.drawerActionDanger : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    <span className={styles.drawerActionIcon}><Icon size={16} /></span>
    <span className={styles.drawerActionText}>
      <span className={styles.drawerActionLabel}>{label}</span>
      {description && <span className={styles.drawerActionDesc}>{description}</span>}
    </span>
  </button>
);

const CampaignDetailDrawer = ({ open, onClose, campaign, onReport, onClone, onEdit, onDelete }) => {
  const statusLabel = STATUS_LABELS[Number(campaign?.Status)] || 'Unknown';
  const statusCfg = getStatusConfig(statusLabel);
  const typeLabel = TYPE_LABELS[Number(campaign?.Type)] || '—';
  const TypeIcon = TYPE_ICONS[Number(campaign?.Type)] || Zap;
  const isPending = Number(campaign?.Status) === 1;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1400 }}
      slotProps={{ paper: { sx: { borderRadius: 0 } } }}
    >
      <div className={styles.drawerRoot}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleRow}>
            <Megaphone size={18} className={styles.drawerIcon} />
            <span className={styles.drawerTitle}>{campaign?.Name || 'Campaign'}</span>
          </div>
          <button className={styles.drawerClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.drawerContent}>
          {/* Chips: status + type + channel */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={statusLabel}
              size="small"
              sx={{ ...CHIP_SX, backgroundColor: 'var(--bg-subtle)', color: statusCfg.color }}
            />
            <Chip
              icon={<TypeIcon size={12} />}
              label={typeLabel}
              size="small"
              sx={{ ...CHIP_SX, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            />
            {campaign?.WhatsappName && (
              <Chip
                icon={<Phone size={12} />}
                label={campaign.WhatsappName}
                size="small"
                sx={{ ...CHIP_SX, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              />
            )}
          </Box>

          {/* Stat cards */}
          <div className={styles.statGrid}>
            <StatCard icon={Users} label="Receivers" value={campaign?.Receiver ?? 0} tone="Info" />
            <StatCard icon={Wallet} label="Cost" value={campaign?.CampaignBalance != null ? `₹${Number(campaign.CampaignBalance).toLocaleString('en-IN')}` : '—'} tone="Warning" />
          </div>

          {/* Timeline */}
          <div className={styles.detailSection}>
            <h4 className={styles.detailSectionTitle}>Timeline</h4>
            <div className={styles.timeline}>
              <TimelineItem icon={CalendarPlus} label="Created" time={campaign?.EntryDate} done={Boolean(campaign?.EntryDate)} />
              <TimelineItem icon={Clock} label="Scheduled" time={campaign?.ScheduleTime} done={Boolean(campaign?.ScheduleTime)} />
              <TimelineItem icon={Send} label="Processed" time={campaign?.ProcessTime} done={Boolean(campaign?.ProcessTime)} />
              <TimelineItem icon={CheckCircle2} label="Completed" time={campaign?.ComplateTime} done={Boolean(campaign?.ComplateTime)} last />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.detailSection}>
            <h4 className={styles.detailSectionTitle}>Actions</h4>
            <div className={styles.drawerActions}>
              <ActionBtn
                icon={Edit2}
                label="Edit"
                description={isPending ? 'Modify campaign details & audience' : 'Only pending campaigns can be edited'}
                onClick={onEdit}
                disabled={!isPending}
              />
              <ActionBtn
                icon={Copy}
                label="Quick Clone"
                description="Duplicate this campaign setup"
                onClick={onClone}
              />
              <ActionBtn
                icon={Trash2}
                label="Delete Campaign"
                description="Permanently remove this campaign"
                onClick={onDelete}
                danger
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.drawerFooter}>
          <Button
            variant="contained"
            fullWidth
            className={styles.drawerReportBtn}
            startIcon={<BarChart3 size={16} />}
            onClick={onReport}
            disabled={isPending}
          >
            View Full Report
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

export default CampaignDetailDrawer;
