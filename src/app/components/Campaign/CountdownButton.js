import React, { useState, useEffect, useCallback } from 'react';
import { Tooltip } from '@mui/material';
import styles from './CampaignGrid.module.scss';

/**
 * Self-contained countdown timer that manages its own interval.
 * Clicking it stops the pending launch.
 * Does NOT cause parent re-renders - only re-renders itself.
 */
const CountdownButton = ({ expiry, onStop, row }) => {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));

  useEffect(() => {
    // Update immediately then every second
    const tick = () => {
      const msLeft = expiry - Date.now();
      if (msLeft <= 0) {
        // Natural expiry: do NOT call onStop here.
        // The global interval in CampaignGrid detects expiry and calls triggerSendBulk.
        // Calling onStop would remove the timer from state before the global interval runs,
        // preventing the API from ever firing.
        return false;
      }
      setRemaining(Math.ceil(msLeft / 1000));
      return true;
    };

    if (!tick()) return;

    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiry]);

  const handleClick = useCallback(() => {
    onStop?.(row);
  }, [onStop, row]);

  // Don't render if timer already expired
  if (remaining <= 0) return null;

  const digits = String(remaining).split('');

  return (
    <Tooltip title={`Click to stop — fires in ${remaining}s`} arrow>
      <button
        type="button"
        className={styles.countdownChip}
        onClick={handleClick}
        aria-label={`Stop launch, fires in ${remaining} seconds`}
      >
        <span className={styles.countdownDigits}>
          {digits.map((d, i) => (
            <span key={`${i}-${d}`} className={styles.countdownSeconds}>{d}</span>
          ))}
        </span>
      </button>
    </Tooltip>
  );
};

export default React.memo(CountdownButton);
