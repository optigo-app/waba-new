import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Button,
  InputAdornment,
  IconButton,
  useTheme,
  Typography,
} from '@mui/material';
import { Search } from 'lucide-react';
import styles from './AudienceSection.module.scss';
import { fetchGroupList } from '../../api/GroupLists';
import { useAuthToken } from '../../../hooks/useAuthToken';
import SelectAutocomplete from './SelectAutocomplete';

// Static branch data (will be replaced with API data later)
const STATIC_BRANCH_DATA = [
  { id: 1, name: 'Surat' },
  { id: 2, name: 'Mumbai' },
  { id: 3, name: 'Delhi' },
  { id: 4, name: 'Bengaluru' },
  { id: 5, name: 'Lucknow' },
  { id: 6, name: 'Ahmedabad' },
  { id: 7, name: 'Chennai' },
  { id: 8, name: 'Kolkata' },
  { id: 9, name: 'Pune' },
  { id: 10, name: 'Jaipur' },
];

const GroupDropdown = ({
  GroupData,
  selectedGroup,
  onGroupChange,
  source,
  currentStep,
  onSearchChange,
  onCreateNewGroup,
  isDisabled = false,
  selectedBranches,
  onBranchChange,
  showBranchDropdown = false,
  groupSearchTerm = '',
}) => {
  const theme = useTheme();
  const [value, setValue] = useState(selectedGroup || null);
  const [inputValue, setInputValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const { userToken } = useAuthToken();
  const [groupOptions, setGroupOptions] = useState(GroupData || []);

  // Fetch group list only if GroupData is not provided
  const fetchGroupData = async () => {
    try {
      const result = await fetchGroupList(userToken?.userId || userToken?.userid || userToken?.appuserid);
      if (result?.data) {
        setGroupOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    }
  };

  useEffect(() => {
    if (currentStep === 3 && source === 'crm') {
      fetchGroupData();
    } else if (GroupData?.length) {
      setGroupOptions(GroupData);
    }
  }, [GroupData, currentStep, source]);

  useEffect(() => {
    setValue(selectedGroup || null);
  }, [selectedGroup]);

  useEffect(() => {
    setSearchText(groupSearchTerm);
  }, [groupSearchTerm]);

  useEffect(() => {
    setValue(null);
    setInputValue('');
    setSearchText('');
    onGroupChange && onGroupChange(null);
  }, [source]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    onSearchChange && onSearchChange(value);
  };

  const handleSearchClick = () => {
    onSearchChange && onSearchChange(searchText);
  };

  const isGroupSelected = !!selectedGroup?.id || !!selectedGroup?.Category;

  return (
    <Box className={styles.section}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography className={styles.sectionTitle}>
            Select Group
          </Typography>
        </Box>
      </Box>

      {/* Dropdown + Search */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Branch Selector - Multi-select */}
        {showBranchDropdown && (
          <SelectAutocomplete
            value={selectedBranches || []}
            onChange={onBranchChange}
            options={STATIC_BRANCH_DATA}
            label="Select Branches" 
            placeholder="Select branches"
            multiple={true}
            limitTags={2}
            showCheckbox={true}
            showSelectAll={true}
            getOptionLabel={(option) => option?.name || ""}
          />
        )}
        
        {/* Group Selector */}
        <SelectAutocomplete
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            onGroupChange && onGroupChange(newValue);
          }}
          options={groupOptions}
          label="Select Group"
          placeholder={isDisabled ? "Clear filters to select group" : "Select Group"}
          disabled={isDisabled}
          getOptionLabel={(option) =>
            option?.SerchFilterName || option?.Category || ""
          }
        />


        {/* Search Input */}
        <TextField
          placeholder="Search contacts..."
          variant="outlined"
          size="medium"
          value={searchText}
          onChange={handleSearchChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSearchClick}
                  edge="end"
                  sx={{ color: 'rgba(125, 127, 133, 0.6)' }}
                >
                  <Search size={20} />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              backgroundColor: '#fcfcfd',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--sidebar-borderColor)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(90, 90, 90, 0.15)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--primary-main)',
                borderWidth: '2px',
              }
            }
          }}
          sx={{ flex: 2, minWidth: 300 }}
        />
      </Box>
    </Box>
  );
};

export default GroupDropdown;
