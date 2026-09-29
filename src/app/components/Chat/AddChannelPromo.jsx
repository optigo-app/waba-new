'use client';

import { useState, useCallback } from 'react';
import { Box, Button, MenuItem, Tooltip, Typography } from '@mui/material';
import { MessageSquarePlus, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { normalizeMobileNumber } from '../../utils/globalFunc';
import toast from 'react-hot-toast';
import CustomerModal from './ui/CustomerModal';
import CustomTextField from './ui/CustomTextField';
import './AddChannelPromo.scss';

const CHANNEL_OPTIONS = ['1', '2 - 5', '6 - 10', 'More than 10'];

// Promo temporarily hidden — set to true to re-enable the
// "Need more channels?" card in the sidebars.
const PROMO_ENABLED = false;

export default function AddChannelPromo({ collapsed = false }) {
  const auth = useAuthStore((s) => s.auth);

  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channelsNeeded, setChannelsNeeded] = useState('');
  const [note, setNote] = useState('');

  const handleOpen = useCallback(() => {
    setName(auth?.username || [auth?.firstname, auth?.lastname].filter(Boolean).join(' ') || '');
    setPhone(normalizeMobileNumber(auth?.mobileno) || auth?.whatsappNumber || '');
    setEmail(auth?.email || '');
    setOpen(true);
  }, [auth]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSubmitted(false);
    setLoading(false);
    setName('');
    setPhone('');
    setEmail('');
    setChannelsNeeded('');
    setNote('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter a contact number.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!channelsNeeded) {
      toast.error('Please select how many channels you need.');
      return;
    }

    setLoading(true);
    try {
      // No dedicated endpoint yet — simulated submit for the sales team
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }, [name, phone, email, channelsNeeded]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && !submitted && name.trim() && phone.trim() && channelsNeeded) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!PROMO_ENABLED) return null;

  return (
    <>
      {collapsed ? (
        <Tooltip title="Add more channels" placement="right" arrow>
          <button type="button" className="channel-promo-mini" onClick={handleOpen}>
            <Plus size={18} />
          </button>
        </Tooltip>
      ) : (
        <button type="button" className="channel-promo-card" onClick={handleOpen}>
          <div className="channel-promo-head">
            <span className="channel-promo-icon">
              <MessageSquarePlus size={17} />
            </span>
            <span className="channel-promo-title">Need more channels?</span>
          </div>
          <span className="channel-promo-text">
            Connect additional WhatsApp numbers and manage every conversation in one place.
          </span>
          <span className="channel-promo-cta">
            Request a channel
            <ArrowRight size={14} />
          </span>
        </button>
      )}

      <CustomerModal
        open={open}
        onClose={handleClose}
        title={submitted ? '' : 'Request a New Channel'}
        actions={
          submitted ? (
            <Button
              onClick={handleClose}
              variant="contained"
              disableElevation
              className="buttonClassname"
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                onClick={handleClose}
                variant="outlined"
                color="secondary"
                disabled={loading}
                className="secondaryBtnClassname"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disableElevation
                disabled={!name.trim() || !phone.trim() || !channelsNeeded || loading}
                className="buttonClassname"
              >
                {loading ? 'Submitting...' : 'Submit request'}
              </Button>
            </>
          )
        }
      >
        {submitted ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              py: 2,
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: 'linear-gradient(135deg, #1daa61, #25d366)',
                boxShadow: '0 0 0 8px rgba(29, 170, 97, 0.10), 0 8px 24px rgba(29, 170, 97, 0.35)',
              }}
            >
              <CheckCircle2 size={34} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
              Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}!
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.65 }}>
              Your request for a new channel has been received. Our sales team will contact you on{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {phone}
              </Box>{' '}
              as soon as possible.
            </Typography>
            <Box
              sx={{
                mt: 0.5,
                px: 1.5,
                py: 0.75,
                borderRadius: '10px',
                border: '1px dashed rgba(29, 170, 97, 0.35)',
                background: 'rgba(29, 170, 97, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <MessageSquarePlus size={14} color="var(--primary-main)" />
              <Typography variant="caption" sx={{ color: 'var(--primary-main)', fontWeight: 600 }}>
                Channels needed: {channelsNeeded}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            <CustomTextField
              label="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              disabled={loading}
              margin="normal"
            />

            <CustomTextField
              label="Contact Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter WhatsApp / phone number"
              disabled={loading}
              margin="normal"
            />

            <CustomTextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter email address"
              disabled={loading}
              margin="normal"
            />

            <CustomTextField
              select
              label="Channels Needed"
              value={channelsNeeded}
              onChange={(e) => setChannelsNeeded(e.target.value)}
              disabled={loading}
              margin="normal"
            >
              {CHANNEL_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter anything else we should know"
              disabled={loading}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        )}
      </CustomerModal>
    </>
  );
}
