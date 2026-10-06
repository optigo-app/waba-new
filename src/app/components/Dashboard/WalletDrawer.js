import React from 'react';
import { X, ArrowDownCircle, TrendingUp, Wallet } from 'lucide-react';
import { Drawer } from '@mui/material';
import styles from './ChannelCard.module.scss';

const WalletDrawer = ({ open, onClose, channel }) => {
    const totalCredits = Number(channel?.totalCredits || 0);
    const usedAmount = Number(channel?.used || 0);
    const remainingAmount = Number(channel?.balance || 0);
    const refundAmount = Number(channel?.refundBalance || 0);
    const usedPercent = totalCredits > 0 ? Math.round((usedAmount / totalCredits) * 100) : 0;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%', background: 'transparent', boxShadow: 'none', borderRadius: { sm: '12px 0 0 12px', xs: 0 } } } }}
        >
            <div className={styles.drawerRoot}>
                {/* Drawer Header */}
                <div className={styles.drawerHeader}>
                    <div className={styles.drawerTitleRow}>
                        <Wallet size={20} className={styles.drawerIcon} />
                        <span className={styles.drawerTitle}>Wallet Log</span>
                    </div>
                    <button className={styles.drawerClose} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Balance Summary Cards */}
                <div className={styles.summaryGrid}>
                    <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
                        <span className={styles.summaryLabel}>Total</span>
                        <span className={styles.summaryValue}>₹{totalCredits.toLocaleString('en-IN')}</span>
                        <TrendingUp size={14} className={styles.summaryIcon} />
                    </div>
                    <div className={`${styles.summaryCard} ${styles.summaryDeducted}`}>
                        <span className={styles.summaryLabel}>Used</span>
                        <span className={styles.summaryValue}>₹{usedAmount.toLocaleString('en-IN')}</span>
                        <ArrowDownCircle size={14} className={styles.summaryIcon} />
                    </div>
                    <div className={`${styles.summaryCard} ${styles.summaryRemaining}`}>
                        <span className={styles.summaryLabel}>Remaining</span>
                        <span className={styles.summaryValue}>₹{remainingAmount.toLocaleString('en-IN')}</span>
                        <Wallet size={14} className={styles.summaryIcon} />
                    </div>
                    <div className={`${styles.summaryCard} ${styles.summaryCredit}`}>
                        <span className={styles.summaryLabel}>Credits</span>
                        <span className={styles.summaryValue}>₹{refundAmount.toLocaleString('en-IN')}</span>
                        <TrendingUp size={14} className={styles.summaryIcon} />
                    </div>
                </div>

                <div className={styles.drawerProgressSection}>
                    <div className={styles.drawerProgressLabel}>
                        <span>Progress</span>
                        <span>{usedPercent}% used</span>
                    </div>
                    <div className={styles.drawerProgressBar}>
                        <div className={styles.drawerProgressFill} style={{ width: `${usedPercent}%` }} />
                    </div>
                </div>
            </div>
        </Drawer>
    );
};

export default WalletDrawer;
