import React, { useMemo, useState } from 'react';
import { Info, Zap, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TextField, Typography, Chip, Checkbox, FormControlLabel, Button, Radio, RadioGroup, Box, MenuItem, Select } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import styles from '../AddCampaign.module.scss';

const CampaignDetails = ({
  campaignName,
  setCampaignName,
  campaignType,
  setCampaignType,
  repeat,
  setRepeat,
  onNext,
  scheduledFor,
  setScheduledFor,
  recurrenceStartDate,
  setRecurrenceStartDate,
  recurrenceTermination,
  setRecurrenceTermination,
  recurrenceEndAfter,
  setRecurrenceEndAfter,
  recurrenceEndBy,
  setRecurrenceEndBy,
  recurrenceFrequency,
  setRecurrenceFrequency,
  recurrenceDays,
  setRecurrenceDays,
  recurrenceTime,
  setRecurrenceTime,
  recurrenceMonthlyDay,
  setRecurrenceMonthlyDay,
  recurrenceYearlyMonth,
  setRecurrenceYearlyMonth,
  recurrenceYearlyDay,
  setRecurrenceYearlyDay,
  showError,
  campaignNameError,
  setCampaignNameError
}) => {
  const [nameError, setNameError] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);

  const handleNextClick = () => {
    if (!campaignName.trim()) {
      setNameError(true);
      return;
    }
    if (campaignType === 'schedule' && (!scheduledFor || scheduledFor.isBefore(dayjs()))) {
      setScheduleError(true);
      toast.error('Please select a future date/time for the schedule.');
      return;
    }
    setNameError(false);
    setScheduleError(false);
    onNext();
  };

  const handleCampaignNameChange = (value) => {
    setCampaignName(value);
    if (value.trim()) {
      setNameError(false);
      setCampaignNameError?.(false);
    }
  };
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const monthsOfYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // Calculate upcoming events based on recurrence settings
  const upcomingEvents = useMemo(() => {
    if (!repeat) return [];

    const events = [];
    let currentDate = recurrenceStartDate.clone();
    currentDate = currentDate.hour(recurrenceTime.hour()).minute(recurrenceTime.minute());

    for (let i = 0; i < 5; i++) {
      if (recurrenceFrequency === 'daily') {
        currentDate = currentDate.add(1, 'day');
      } else if (recurrenceFrequency === 'weekly') {
        const currentDayIndex = currentDate.day();
        const nextDayIndex = daysOfWeek.findIndex(day => day === recurrenceDays[0]);
        const daysToAdd = (nextDayIndex - currentDayIndex + 7) % 7 || 7;
        currentDate = currentDate.add(daysToAdd, 'day');
      } else if (recurrenceFrequency === 'monthly') {
        currentDate = currentDate.add(1, 'month');
        currentDate = currentDate.date(recurrenceMonthlyDay);
      } else if (recurrenceFrequency === 'yearly') {
        currentDate = currentDate.add(1, 'year');
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(recurrenceYearlyMonth);
        currentDate = currentDate.month(monthIndex).date(recurrenceYearlyDay);
      }

      // Check termination conditions
      if (recurrenceTermination === 'endAfter' && events.length >= recurrenceEndAfter) {
        break;
      }
      if (recurrenceTermination === 'endBy' && recurrenceEndBy && currentDate.isAfter(recurrenceEndBy)) {
        break;
      }

      events.push(currentDate.clone());
    }

    return events;
  }, [repeat, recurrenceStartDate, recurrenceFrequency, recurrenceDays, recurrenceTime, recurrenceTermination, recurrenceEndAfter, recurrenceEndBy, recurrenceMonthlyDay, recurrenceYearlyMonth, recurrenceYearlyDay]);
  const router = useRouter();

  const overviewStats = [
    {
      label: 'Delivery Mode',
      value: campaignType === 'immediate' ? 'Immediate' : 'Schedule',
      dot: campaignType === 'immediate'
    },
    { label: 'Queue Init Time', value: '~1 Minute' },
    { label: 'Target Audience', value: 'Not selected yet' },
    { label: 'Channel Type', value: 'WhatsApp Broadcast' }
  ];

  const wizardSteps = [
    'Configure campaign name & type',
    'Select target contact tags & lists',
    'Choose template and personalize dynamic tags',
    'Run final safety check and trigger broadcast'
  ];

  return (
    <div className={styles.detailsWrap}>
      {/* Left: form card */}
      <div className={styles.formCard}>
      <h2 className={styles.formTitle}>Campaign Details</h2>
      <p className={styles.formSubtitle}>Configure your campaign title, delivery trigger schedule, and dispatch behaviors.</p>

      {/* Campaign Name */}
      <div className={styles.formField}>
        <div className={styles.labelRow}>
          <label className={styles.labelCaps}>Campaign Name <span style={{ color: 'var(--error-main)' }}>*</span></label>
          <span className={styles.charCounter}>{campaignName.length}/60 characters</span>
        </div>
        <TextField
          fullWidth
          placeholder="Enter Campaign Name"
          value={campaignName}
          onChange={(e) => {
            handleCampaignNameChange(e.target.value);
          }}
          error={nameError || campaignNameError}
          helperText={(nameError || campaignNameError) ? 'Campaign name is required' : 'Internal name to identify and analyze this campaign performance later.'}
          variant="outlined"
          size="small"
          className={styles.textField}
          slotProps={{ htmlInput: { maxLength: 60 } }}
        />
      </div>

      {/* Campaign Type */}
      <div className={styles.formField}>
        <label className={styles.labelCaps}>Campaign Delivery Type</label>
        <div className={styles.chipGroup}>
          <Chip
            label="Immediate"
            onClick={() => setCampaignType('immediate')}
            className={`${styles.chipButton} ${campaignType === 'immediate' ? styles.active : ''}`}
          />
          <Chip
            label="Schedule"
            onClick={() => setCampaignType('schedule')}
            className={`${styles.chipButton} ${campaignType === 'schedule' ? styles.active : ''}`}
          />
        </div>
      </div>

      {/* Info Alert Box */}
      {campaignType === 'immediate' && (
        <div className={styles.infoAlert}>
          <Info size={18} className={styles.alertIcon} />
          <div className={styles.alertContent}>
            <div className={styles.alertTitle}>Immediate Dispatch Mode</div>
            <Typography variant="body2" className={styles.alertMessage}>
              Immediate triggers the dispatch process as soon as configuration is verified. Once triggered, message dispatch begins within <strong>1 minute</strong> of queue setup time.
            </Typography>
          </div>
        </div>
      )}

      {/* Schedule For */}
      {campaignType === 'schedule' && (
        <div className={styles.formField}>
          <label className={styles.labelCaps}>Schedule For</label>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              value={scheduledFor}
              onChange={(newValue) => {
                setScheduledFor(newValue);
                if (newValue && newValue.isBefore(dayjs())) {
                  setScheduleError(true);
                } else {
                  setScheduleError(false);
                }
              }}
              views={['year', 'month', 'day', 'hours']}
              ampm={true}
              format="DD/MM/YYYY hh A"
              minDateTime={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  className: styles.textField,
                  error: scheduleError,
                  helperText: scheduleError ? 'Please select a future date/time' : ''
                }
              }}
            />
          </LocalizationProvider>
        </div>
      )}

      {/* Repeat Option */}
      <div className={styles.formField}>
        <FormControlLabel
          control={
            <Checkbox
              checked={repeat}
              onChange={(e) => {
                if (e.target.checked) {
                  toast('Repeat feature coming soon...', { icon: '🚧' });
                  return;
                }
                setRepeat(e.target.checked);
              }}
              className={styles.checkbox}
            />
          }
          label="Repeat this Campaign"
          className={styles.checkboxLabel}
        />
        <span className={styles.fieldHint}>Automatically re-trigger this campaign based on recurring intervals (e.g., Weekly, Monthly).</span>
      </div>

      {/* Recurrence Configuration */}
      {repeat && (
        <div className={styles.recurrenceSection}>
          {/* Range of Recurrence */}
          <div className={styles.recurrenceSectionTitle}>Range of Recurrence</div>

          <div className={styles.recurrenceRangeRow}>
            <div className={styles.recurrenceRangeField}>
              <label className={styles.label}>Start Date</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={recurrenceStartDate}
                  onChange={(newValue) => setRecurrenceStartDate(newValue)}
                  format="DD/MM/YYYY"
                  minDate={dayjs()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      className: styles.textField
                    }
                  }}
                />
              </LocalizationProvider>
            </div>

            <div className={styles.recurrenceRangeField}>
              <label className={styles.label}>Termination</label>
              <RadioGroup
                value={recurrenceTermination}
                onChange={(e) => setRecurrenceTermination(e.target.value)}
                className={styles.radioGroupInline}
              >
                <FormControlLabel
                  value="noEndDate"
                  control={<Radio />}
                  label="No end date"
                  className={styles.radioLabel}
                />
                <FormControlLabel
                  value="endAfter"
                  control={<Radio />}
                  label="End after"
                  className={styles.radioLabel}
                />
                <FormControlLabel
                  value="endBy"
                  control={<Radio />}
                  label="End by"
                  className={styles.radioLabel}
                />
              </RadioGroup>
            </div>
          </div>

          {recurrenceTermination === 'endAfter' && (
            <div className={styles.formField}>
              <label className={styles.label}>Occurrences</label>
              <TextField
                fullWidth
                type="number"
                value={recurrenceEndAfter}
                onChange={(e) => setRecurrenceEndAfter(parseInt(e.target.value))}
                variant="outlined"
                size="small"
                className={styles.textField}
              />
            </div>
          )}

          {recurrenceTermination === 'endBy' && (
            <div className={styles.formField}>
              <label className={styles.label}>End Date</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={recurrenceEndBy}
                  onChange={(newValue) => setRecurrenceEndBy(newValue)}
                  format="DD/MM/YYYY"
                  minDate={recurrenceStartDate || dayjs()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      className: styles.textField
                    }
                  }}
                />
              </LocalizationProvider>
            </div>
          )}

          {/* Recurrence Pattern */}
          <div className={styles.recurrencePatternBox}>
            <div className={styles.recurrenceSectionTitle}>Recurrence Pattern</div>

            <div className={styles.formField}>
              <label className={styles.label}>Frequency</label>
              <div className={styles.chipGroup}>
                <Chip
                  label="Daily"
                  onClick={() => setRecurrenceFrequency('daily')}
                  className={`${styles.chipButton} ${recurrenceFrequency === 'daily' ? styles.active : ''}`}
                />
                <Chip
                  label="Weekly"
                  onClick={() => setRecurrenceFrequency('weekly')}
                  className={`${styles.chipButton} ${recurrenceFrequency === 'weekly' ? styles.active : ''}`}
                />
                <Chip
                  label="Monthly"
                  onClick={() => setRecurrenceFrequency('monthly')}
                  className={`${styles.chipButton} ${recurrenceFrequency === 'monthly' ? styles.active : ''}`}
                />
                <Chip
                  label="Yearly"
                  onClick={() => setRecurrenceFrequency('yearly')}
                  className={`${styles.chipButton} ${recurrenceFrequency === 'yearly' ? styles.active : ''}`}
                />
              </div>
            </div>

            {recurrenceFrequency === 'weekly' && (
              <div className={styles.formField}>
                <label className={styles.label}>Select Days</label>
                <div className={styles.daysPicker}>
                  {daysOfWeek.map((day) => (
                    <div key={day} className={styles.dayCheckboxWrapper}>
                      <Checkbox
                        checked={recurrenceDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRecurrenceDays([...recurrenceDays, day]);
                          } else {
                            setRecurrenceDays(recurrenceDays.filter(d => d !== day));
                          }
                        }}
                        className={styles.checkbox}
                      />
                      <span className={styles.dayLabel}>{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recurrenceFrequency === 'monthly' && (
              <div className={styles.formField}>
                <label className={styles.label}>Select Day of Month</label>
                <Select
                  value={recurrenceMonthlyDay}
                  onChange={(e) => setRecurrenceMonthlyDay(e.target.value)}
                  className={styles.textField}
                  size="small"
                  fullWidth
                >
                  {daysOfMonth.map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
              </div>
            )}

            {recurrenceFrequency === 'yearly' && (
              <div className={styles.recurrenceYearlyRow}>
                <div className={styles.formField}>
                  <label className={styles.label}>Select Month</label>
                  <Select
                    value={recurrenceYearlyMonth}
                    onChange={(e) => setRecurrenceYearlyMonth(e.target.value)}
                    className={styles.textField}
                    size="small"
                    fullWidth
                  >
                    {monthsOfYear.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Select Day</label>
                  <Select
                    value={recurrenceYearlyDay}
                    onChange={(e) => setRecurrenceYearlyDay(e.target.value)}
                    className={styles.textField}
                    size="small"
                    fullWidth
                  >
                    {daysOfMonth.map((day) => (
                      <MenuItem key={day} value={day}>
                        {day}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            <div className={styles.formField}>
              <label className={styles.label}>Recurrence Time</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker
                  value={recurrenceTime}
                  onChange={(newValue) => setRecurrenceTime(newValue)}
                  views={['hours']}
                  ampm={true}
                  format="hh A"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      className: styles.textField
                    }
                  }}
                />
              </LocalizationProvider>
            </div>
          </div>

          {/* Dynamic Preview */}
          <div className={styles.recurrenceSectionTitle}>Upcoming Events</div>
          <div className={styles.upcomingEvents}>
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => (
                <div key={index} className={styles.eventItem}>
                  <Typography variant="body2" className={styles.eventDate}>
                    {event.format('DD MMM YYYY')} at {event.format('hh:mm A')}
                  </Typography>
                </div>
              ))
            ) : (
              <Typography variant="body2" className={styles.noEvents}>
                No upcoming events
              </Typography>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.formActions}>
        <Button className='varientOutlinedBtn' onClick={() => router.push('/campaign')}>
          Cancel
        </Button>
        <Button className='buttonClassname' onClick={handleNextClick}>
          Next: Audience →
        </Button>
      </div>
      </div>

      {/* Right: overview + tip */}
      <div className={styles.detailsAside}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewHeader}>
            <h3 className={styles.overviewTitle}>Campaign Overview</h3>
            <span className={styles.draftBadge}>DRAFT</span>
          </div>
          <div className={styles.overviewStats}>
            {overviewStats.map((stat) => (
              <div key={stat.label} className={styles.statBox}>
                <div className={styles.statLabel}>{stat.label}</div>
                <div className={styles.statValue}>
                  {stat.dot && <span className={styles.statDot} />}
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.stepsProgress}>
            <div className={styles.statLabel}>Step-by-Step Progress</div>
            {wizardSteps.map((step, idx) => (
              <div key={step} className={`${styles.stepRow} ${idx === 0 ? styles.stepRowActive : ''}`}>
                <span className={styles.stepRowNum}>
                  {idx === 0 ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.proTipCard}>
          <div className={styles.proTipTitle}>
            <Zap size={14} />
            Pro Tip
          </div>
          <p className={styles.proTipText}>
            Naming campaigns using date prefixes like <span className={styles.proTipCode}>[2023-Q4] Promo</span> helps your team filter analytics much faster.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
