import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  IconButton,
  Box,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { X } from 'lucide-react';
import styles from './AudienceSection.module.scss';
import { fetchFilterMasterList } from '../../api/FilterMaster';
import { useAuthToken } from '../../../hooks/useAuthToken';
import VirtualizedAutocomplete from './VirtualizedAutoComplete';

// Static branch data (will be replaced with API data later)
const STATIC_BRANCH_DATA = [
  { id: 1, name: 'New York' },
  { id: 2, name: 'Los Angeles' },
  { id: 3, name: 'Chicago' },
  { id: 4, name: 'Houston' },
  { id: 5, name: 'Phoenix' },
  { id: 6, name: 'Philadelphia' },
  { id: 7, name: 'San Antonio' },
  { id: 8, name: 'San Diego' },
  { id: 9, name: 'Dallas' },
  { id: 10, name: 'San Jose' },
];

// ✅ Main Filter Drawer Component
const FilterDrawer = ({ open, onClose, onApplyFilters, filters = {} }) => {
  const [localFilters, setLocalFilters] = useState({
    country: null,
    companyName: null,
    companyType: null,
    city: null,
    state: null,
    branch: null,
    ...filters,
  });

  const [companyName, setCompanyName] = useState([]);
  const [companyType, setCompanyType] = useState([]);
  const [state, setState] = useState([]);
  const [country, setCountry] = useState([]);
  const [city, setCity] = useState([]);
  const [branch, setBranch] = useState(STATIC_BRANCH_DATA);
  const { userToken } = useAuthToken();

  const fetchFilterData = async () => {
    try {
      const response = await fetchFilterMasterList(userToken?.userId || userToken?.userid || userToken?.appuserid);
      if (response?.data) {
        setCompanyName(response?.data?.rd || []);
        setCompanyType(response?.data?.rd1 || []);
        setState(response?.data?.rd2 || []);
        setCountry(response?.data?.rd3 || []);
        setCity(response?.data?.rd4 || []);
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  useEffect(() => {
    if (open) fetchFilterData();
  }, [open]);


  // ✅ Handles filter selection
  const handleFilterChange = (field) => (newValue) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: newValue || null
    }));
  };

  // ✅ Reset filters
  const handleReset = () => {
    const resetFilters = {
      country: null,
      companyName: null,
      companyType: null,
      city: null,
      state: null,
      branch: null,
    };
    setLocalFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  // ✅ Apply filters
  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };


  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      classes={{ paper: styles.filterDrawer }}
    >
      {/* Header */}
      <Box className={styles.filterHeader}>
        <Typography variant="h6">Filters</Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <Divider />

      {/* Filter Fields */}
      <Box className={styles.filterContent} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <VirtualizedAutocomplete
          data={companyName}
          label="Select Company"
          valueKey="companyname"
          value={localFilters.companyName}
          onChange={handleFilterChange('companyName')}
        />
        <VirtualizedAutocomplete
          data={companyType}
          label="Select Company Type"
          valueKey="businessclassname"
          value={localFilters.companyType}
          onChange={handleFilterChange('companyType')}
        />
        <VirtualizedAutocomplete
          data={state}
          label="Select State"
          valueKey="StateName"
          value={localFilters.state}
          onChange={handleFilterChange('state')}
        />
        <VirtualizedAutocomplete
          data={country}
          label="Select Country"
          valueKey="CountryName"
          value={localFilters.country}
          onChange={handleFilterChange('country')}
        />
        <VirtualizedAutocomplete
          data={city}
          label="Select City"
          valueKey="City"
          value={localFilters.city}
          onChange={handleFilterChange('city')}
        />
        <VirtualizedAutocomplete
          data={branch}
          label="Select Branch"
          valueKey="name"
          value={localFilters.branch}
          onChange={handleFilterChange('branch')}
        />
      </Box>

      {/* Footer Actions */}
      <Box className={styles.filterActions}>
        <Button onClick={handleReset} color="secondary" variant="outlined" fullWidth>
          Reset
        </Button>
        <Button
          onClick={handleApply}
          color="primary"
          variant="contained"
          fullWidth
          className={styles.applyButton}
        >
          Apply Filters
        </Button>
      </Box>
    </Drawer>
  );
};

export default FilterDrawer;
