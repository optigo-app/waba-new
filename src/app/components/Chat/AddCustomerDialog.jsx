'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Button } from '@mui/material';
import { addCustomer } from '../../api/chat/conversationApi';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import CustomerModal from './ui/CustomerModal';
import CustomTextField from './ui/CustomTextField';

export default function AddCustomerDialog({ open, onClose, selectedMember, onSuccess }) {
  const auth = useAuthStore((s) => s.auth);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [debouncedFirstName, setDebouncedFirstName] = useState('');
  const [debouncedLastName, setDebouncedLastName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setDebouncedFirstName(firstName);
      setDebouncedLastName(lastName);
    }, 300);

    return () => clearTimeout(timer);
  }, [firstName, lastName, open]);

  const handleClose = useCallback(() => {
    // Batch all resets into a single render cycle
    setFirstName('');
    setLastName('');
    setDebouncedFirstName('');
    setDebouncedLastName('');
    setLoading(false);
    onClose?.();
  }, [onClose]);

  const handleSaveCustomer = useCallback(async () => {
    if (!selectedMember?.CustomerPhone) {
      toast.error('Missing customer phone number. Cannot add customer.');
      return;
    }

    if (!debouncedFirstName.trim()) {
      toast.error('Please enter a first name.');
      return;
    }

    if (!debouncedLastName.trim()) {
      toast.error('Please enter a last name.');
      return;
    }

    setLoading(true);
    try {
      const response = await addCustomer(
        selectedMember.CustomerPhone,
        auth?.userId || 1,
        debouncedFirstName.trim(),
        debouncedLastName.trim(),
        selectedMember?.ConversationId || ''
      );

      if (response) {
        toast.success('Customer added successfully!');
        onSuccess?.();
        handleClose();
      } else {
        toast.error('Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer', error);
      toast.error('Something went wrong while adding the customer.');
    } finally {
      setLoading(false);
    }
  }, [selectedMember, auth?.userId, debouncedFirstName, debouncedLastName, onSuccess, handleClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && debouncedFirstName.trim() && debouncedLastName.trim()) {
      e.preventDefault();
      handleSaveCustomer();
    }
  };

  return (
    <CustomerModal
      open={open}
      onClose={handleClose}
      title="Add Customer"
      actions={
        <>
          <Button
            onClick={handleClose}
            variant="outlined"
            color="secondary"
            disabled={loading}
            className='secondaryBtnClassname'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveCustomer}
            variant="contained"
            disableElevation
            disabled={!debouncedFirstName.trim() || !debouncedLastName.trim() || loading}
            className='buttonClassname'
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Box>
        <CustomTextField
          label="Mobile Number"
          value={selectedMember?.CustomerPhone || ''}
          disabled
          margin="normal"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'action.hover',
            },
          }}
        />

        <CustomTextField
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter first name"
          disabled={loading}
          margin="normal"
        />

        <CustomTextField
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter last name"
          disabled={loading}
          margin="normal"
        />
      </Box>
    </CustomerModal>
  );
}
