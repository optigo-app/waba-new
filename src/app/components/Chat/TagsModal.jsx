'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@mui/material';
import toast from 'react-hot-toast';
import { useTagsContext } from '../../contexts/TagsContexts';
import { useAuth } from '../../hooks/useAuth';
import CustomerModal from './ui/CustomerModal';
import CustomTextField from './ui/CustomTextField';
import { addTagsApi } from '../../api/chat/conversationApi';

export default function TagsModal({
  open,
  onClose,
  selectedCustomer,
  onTagAdded,
  onTagAddingChange,
}) {
  const { triggerRefetch } = useTagsContext();
  const { auth } = useAuth();
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(selectedCustomer?.CustomerId) && Boolean(tagInput?.trim()) && !isSubmitting;
  }, [isSubmitting, selectedCustomer?.CustomerId, tagInput]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setTagInput('');
    onClose?.();
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(async () => {
    const customerId = selectedCustomer?.CustomerId;
    const nextTag = tagInput?.trim();

    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!nextTag) return;

    try {
      setIsSubmitting(true);
      onTagAddingChange?.(true);
      const response = await addTagsApi(customerId, nextTag, auth?.userId);
      if (response?.rd?.[0]?.stat === 1) {
        toast.success('Tag added successfully');
        onTagAdded?.();
        triggerRefetch?.();
        setTagInput('');
        onClose?.();
      } else {
        toast.error('Failed to add tag');
      }
    } catch (error) {
      console.error('handleSubmit error:', error);
      toast.error('Something went wrong while adding the tag');
    } finally {
      setIsSubmitting(false);
      onTagAddingChange?.(false);
    }
  }, [auth?.userId, onClose, onTagAdded, onTagAddingChange, selectedCustomer?.CustomerId, tagInput, triggerRefetch]);

  return (
    <CustomerModal
      open={open}
      onClose={handleClose}
      title="Add Tags"
      maxWidth="xs"
      paperSx={{ width: { xs: '92vw', sm: 420 } }}
      contentSx={{ pt: 2 }}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={isSubmitting}
            className='secondaryBtnClassname'
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='buttonClassname'
          >
            Add
          </Button>
        </>
      }
    >
      <CustomTextField
        label="Tag"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (canSubmit) handleSubmit();
          }
        }}
      />
    </CustomerModal>
  );
}
