import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  TextField,
  Chip,
  IconButton,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { LinearProgress } from '@mui/material';
import { InputAdornment } from '@mui/material';
import { Upload, FileText, X, Download, Building2, Search } from 'lucide-react';
import SelectAutocomplete from './SelectAutocomplete';
import { fetchGroupList } from '../../../api/GroupLists';
import { fetchBranchListsApi } from '../../../api/GetBranchListApi';
import { formatMobileNumber, normalizeMobileNumber, getStaticUrl } from '../../../utils/globalFunc';
import { fetchFilterMasterList } from '../../../api/FilterMaster';
import { useAuthToken } from '../../../hooks/useAuthToken';
import ConfirmationModal from '../../ConfirmationModal/ConfirmationModal';
import { fetchGroupFilterList } from '@/app/api/GroupFilterData';

const sampleExcelFile = () => getStaticUrl('/sampleAud.xlsx');

const EMPTY_LOCAL_FILTERS = {
  companyName: null,
  companyType: null,
  state: null,
  city: null,
  country: null,
};

const FilterSelectionDialog = ({
  open,
  onClose,
  onContinue,
  filters,
  onFilterChange,
  userToken,
  source,
  excelData,
  onFileUpload,
  uploadedFile,
  preSelectedData,
  preSelectedBranches,
  preSelectedGroup,
}) => {
  const { userToken: token } = useAuthToken();
  const [dialogFilters, setDialogFilters] = useState({
    companyType: null,
    state: null,
    city: null,
    country: null,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    companyType: null,
    state: null,
    city: null,
    country: null,
  });
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [removeDuplicateMobiles, setRemoveDuplicateMobiles] = useState(true);
  const searchDebounceRef = React.useRef(null);
  const filterDebounceRef = React.useRef(null);
  const hasAppliedPreselectionRef = React.useRef(false);

  // Branch and Group filters
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [appliedBranches, setAppliedBranches] = useState([]);
  const [branchData, setBranchData] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [appliedGroup, setAppliedGroup] = useState(null);
  const [groupOptions, setGroupOptions] = useState([]);
  const [companyTypeOptions, setCompanyTypeOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Confirmation modal state
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [showSourceSwitchConfirmation, setShowSourceSwitchConfirmation] = useState(false);
  const [pendingSource, setPendingSource] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const filterOptionsInitializedRef = React.useRef(false);

  // Local source state for toggle
  const [localSource, setLocalSource] = useState(source);
  const latestSourceRef = React.useRef(source);

  useEffect(() => {
    latestSourceRef.current = localSource;
  }, [localSource]);

  // Sync localSource with source prop when dialog opens
  useEffect(() => {
    if (open) {
      hasAppliedPreselectionRef.current = false;
      filterOptionsInitializedRef.current = false;
      setLocalSource(source);

      // Initialize filters from parent if provided
      if (filters) {
        setDialogFilters(filters);
        setAppliedFilters(filters);
      }

      // Initialize pre-selected branches and group if provided
      if (preSelectedBranches && preSelectedBranches.length > 0) {
        setSelectedBranches(preSelectedBranches);
        setAppliedBranches(preSelectedBranches);
      }

      if (preSelectedGroup) {
        setSelectedGroup(preSelectedGroup);
        setAppliedGroup(preSelectedGroup);
      }
    }
  }, [open, source, filters, preSelectedBranches, preSelectedGroup]);

  // Reset selections when source changes
  useEffect(() => {
    setSelectedIds([]);
    setRowSelectionModel({ type: 'include', ids: new Set() });
    setSelectedBranches([]);
    setAppliedBranches([]);
    setSelectedGroup(null);
    setAppliedGroup(null);
    setDialogFilters({
      companyName: null,
      companyType: null,
      state: null,
      city: null,
      country: null,
    });
    setAppliedFilters({
      companyName: null,
      companyType: null,
      state: null,
      city: null,
      country: null,
    });
    setSearchText('');
    setSearchInput('');
  }, [localSource]);

  useEffect(() => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }

    filterDebounceRef.current = setTimeout(() => {
      setAppliedFilters(dialogFilters);
      setAppliedBranches(selectedBranches);
      setAppliedGroup(selectedGroup);
    }, 250);

    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
      }
    };
  }, [dialogFilters, selectedBranches, selectedGroup]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchText(searchInput);
    }, 240);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchInput]);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['xlsx', 'xls', 'csv'];

    if (!allowedExtensions.includes(fileExt)) {
      alert('Please upload only Excel (.xlsx, .xls) or CSV files');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    try {
      setLoading(true);
      if (onFileUpload) {
        await onFileUpload(file);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error processing file');
    } finally {
      setLoading(false);
    }
  };

  // Handle drag & drop inside dialog content area
  const handleDragOver = (e) => {
    e.preventDefault();
    if (localSource === 'excel') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (localSource === 'excel') {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    }
  };

  // Ensure rowSelectionModel is always in correct format
  const [rowSelectionModel, setRowSelectionModel] = useState({ type: 'include', ids: new Set() });

  const safeRowSelectionModel = React.useMemo(() => {
    if (!rowSelectionModel || typeof rowSelectionModel !== 'object') {
      return { type: 'include', ids: new Set() };
    }
    if (rowSelectionModel?.ids instanceof Set) {
      return rowSelectionModel;
    }
    if (Array.isArray(rowSelectionModel)) {
      return { type: 'include', ids: new Set(rowSelectionModel) };
    }
    if (rowSelectionModel.ids) {
      return { type: 'include', ids: new Set(Array.isArray(rowSelectionModel.ids) ? rowSelectionModel.ids : []) };
    }
    return { type: 'include', ids: new Set() };
  }, [rowSelectionModel]);

  // Fetch group list and branch list
  useEffect(() => {
    if (open) {
      fetchGroupData();
      fetchBranchData();
      fetchFilterMasterData();
    }
  }, [open]);

  const getUniqueOptionValues = (rows, key) => {
    return [...new Set((rows || []).map((item) => item?.[key]).filter(Boolean))].sort();
  };

  const isLocalFilterMode = localSource === 'crm' && (
    selectedBranches.length > 0
    || appliedBranches.length > 0
    || Boolean(selectedGroup)
    || Boolean(appliedGroup)
  );

  const effectiveAppliedFilters = appliedFilters;
  const effectiveSearchTerm = '';

  const getFieldValue = (row, keys = []) => {
    for (const key of keys) {
      if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  const searchableRows = React.useMemo(() => {
    return (Array.isArray(gridData) ? gridData : []).map((row) => {
      const rawMobile = getFieldValue(row, [
        'CustomerPhone',
        'PhoneNo',
        'MobileNo',
        'mobileNo',
        'Mobile',
        'mobile',
        'phone',
        'phoneno',
      ]);
      const digitsOnly = rawMobile.replace(/\D/g, '');
      const normalizedPhone = normalizeMobileNumber(rawMobile);
      const searchExtras = [];
      if (digitsOnly) searchExtras.push(digitsOnly);
      if (normalizedPhone) {
        searchExtras.push(normalizedPhone);
        if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
          searchExtras.push(normalizedPhone.slice(2));
        }
      }

      return {
        row,
        searchBlob: Object.values(row || {})
          .filter((value) => value !== undefined && value !== null)
          .join(' ')
          .toLowerCase() + ' ' + searchExtras.join(' '),
      };
    });
  }, [gridData]);

  const filteredGridData = React.useMemo(() => {
    let rows = Array.isArray(gridData) ? [...gridData] : [];

    const q = (searchText || '').trim().toLowerCase();
    if (q) {
      const matchedRowIds = new Set(
        searchableRows
          .filter((item) => item.searchBlob.includes(q))
          .map((item) => item.row?.CustomerId ?? item.row?.id)
      );

      rows = rows.filter((row) => matchedRowIds.has(row?.CustomerId ?? row?.id));
    }

    // Apply additional filters regardless of filter mode
    if (appliedFilters.companyName) {
      const companyName = String(appliedFilters.companyName).toLowerCase();
      rows = rows.filter((row) =>
        getFieldValue(row, ['CompanyName', 'companyname', 'Company', 'company']).toLowerCase() === companyName
      );
    }

    if (appliedFilters.companyType) {
      const companyType = String(appliedFilters.companyType).toLowerCase();
      rows = rows.filter((row) =>
        getFieldValue(row, ['CompanyType', 'CustomerType', 'companytype', 'customertype']).toLowerCase() === companyType
      );
    }

    if (appliedFilters.country) {
      const country = String(appliedFilters.country).toLowerCase();
      rows = rows.filter((row) =>
        getFieldValue(row, ['Country', 'country']).toLowerCase() === country
      );
    }

    if (appliedFilters.state) {
      const state = String(appliedFilters.state).toLowerCase();
      rows = rows.filter((row) =>
        getFieldValue(row, ['State', 'state']).toLowerCase() === state
      );
    }

    if (appliedFilters.city) {
      const city = String(appliedFilters.city).toLowerCase();
      rows = rows.filter((row) =>
        getFieldValue(row, ['City', 'city']).toLowerCase() === city
      );
    }

    // Filter out rows without a valid phone number and normalize the phone field
    rows = rows.filter((row) => {
      const rawMobile = getFieldValue(row, [
        'CustomerPhone',
        'PhoneNo',
        'MobileNo',
        'mobileNo',
        'Mobile',
        'mobile',
        'phone',
        'phoneno',
      ]);
      const normalized = normalizeMobileNumber(rawMobile);
      if (normalized) {
        if (row.CustomerPhone !== undefined) row.CustomerPhone = normalized;
        else if (row.PhoneNo !== undefined) row.PhoneNo = normalized;
        return true;
      }
      return false;
    });

    return rows;
  }, [gridData, searchText, appliedFilters, searchableRows]);

  const getMobileValue = (row) => {
    const rawMobile = getFieldValue(row, [
      'CustomerPhone',
      'PhoneNo',
      'MobileNo',
      'mobileNo',
      'Mobile',
      'mobile',
      'phone',
      'phoneno',
    ]);
    return normalizeMobileNumber(rawMobile);
  };

  const dedupeStats = React.useMemo(() => {
    if (!removeDuplicateMobiles) {
      return {
        rows: filteredGridData,
        duplicateRowsRemoved: 0,
        duplicateNumbersCount: 0,
      };
    }

    const seenMobiles = new Set();
    const duplicateMobileNumbers = new Set();
    const uniqueRows = [];
    let duplicateRowsRemoved = 0;

    filteredGridData.forEach((row) => {
      const mobile = getMobileValue(row);
      if (!mobile) {
        uniqueRows.push(row);
        return;
      }

      if (seenMobiles.has(mobile)) {
        duplicateRowsRemoved += 1;
        duplicateMobileNumbers.add(mobile);
        return;
      }

      seenMobiles.add(mobile);
      uniqueRows.push(row);
    });

    return {
      rows: uniqueRows,
      duplicateRowsRemoved,
      duplicateNumbersCount: duplicateMobileNumbers.size,
    };
  }, [filteredGridData, removeDuplicateMobiles]);

  const visibleGridData = dedupeStats.rows;

  // Apply pre-selected data after grid data is loaded
  useEffect(() => {
    if (
      open
      && !hasAppliedPreselectionRef.current
      && preSelectedData
      && preSelectedData.length > 0
      && visibleGridData.length > 0
    ) {
      const preSelectedIds = preSelectedData.map(row => row.CustomerId || row.id);
      setSelectedIds(preSelectedIds);
      setRowSelectionModel({ type: 'include', ids: new Set(preSelectedIds) });
      hasAppliedPreselectionRef.current = true;
    }
  }, [open, preSelectedData, visibleGridData.length]);

  const fetchGroupData = async () => {
    try {
      const result = await fetchGroupList(token?.userId);
      if (result?.data) {
        setGroupOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching group list:', error);
    }
  };

  const fetchBranchData = async () => {
    try {
      const result = await fetchBranchListsApi(token?.userId);
      if (result?.data) {
        setBranchData(result.data);
      }
    } catch (error) {
      console.error('Error fetching branch list:', error);
      setBranchData([]);
    }
  };

  const fetchFilterMasterData = async () => {
    try {
      const result = await fetchFilterMasterList(token?.userId);
      if (result?.data) {
        setCompanyTypeOptions(getUniqueOptionValues(result?.data?.rd1, 'businessclassname'));
        setStateOptions(getUniqueOptionValues(result?.data?.rd2, 'StateName'));
        setCountryOptions(getUniqueOptionValues(result?.data?.rd3, 'CountryName'));
        setCityOptions(getUniqueOptionValues(result?.data?.rd4, 'City'));
      }
    } catch (error) {
      console.error('Error fetching filter master data:', error);
      setCompanyTypeOptions([]);
      setStateOptions([]);
      setCountryOptions([]);
      setCityOptions([]);
    }
  };

  const fetchFilteredData = async (searchTermValue = '', filtersValue = appliedFilters) => {
    try {
      if (latestSourceRef.current !== 'crm') {
        return;
      }

      setLoading(true);
      const branchFilter = Array.isArray(appliedBranches)
        ? appliedBranches
          .map((branch) => branch?.ToDbName || branch?.name || branch?.BranchName || branch?.label || '')
          .filter(Boolean)
          .join(',')
        : '';

      const groupFilter = appliedGroup?.WhereClause
        || appliedGroup?.SerchFilterName
        || appliedGroup?.Category
        || appliedGroup?.name
        || appliedGroup?.id
        || '';

      const result = await fetchGroupFilterList(userToken?.userId || userToken?.userid || userToken?.appuserid, {
        groupFilter,
        branchFilter,
      });

      if (result && latestSourceRef.current === 'crm') {
        setGridData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch filtered data only when applied filters/search change
  useEffect(() => {
    if (!open) return;

    if (localSource === 'excel') {
      const excelRows = Array.isArray(excelData)
        ? excelData
        : (excelData?.rows || excelData?.data || []);
      setGridData(Array.isArray(excelRows) ? excelRows : []);

      // Populate filter options from Excel data only once
      if (Array.isArray(excelRows) && excelRows.length > 0 && !filterOptionsInitializedRef.current) {
        setCompanyTypeOptions(getUniqueOptionValues(excelRows, 'CustomerType'));
        setStateOptions(getUniqueOptionValues(excelRows, 'State'));
        setCountryOptions(getUniqueOptionValues(excelRows, 'Country'));
        setCityOptions(getUniqueOptionValues(excelRows, 'City'));
        filterOptionsInitializedRef.current = true;
      }

      setLoading(false);
      return;
    }

    fetchFilteredData(effectiveSearchTerm, effectiveAppliedFilters);
  }, [open, localSource, excelData, appliedBranches, appliedGroup, effectiveSearchTerm, effectiveAppliedFilters]);

  const getRowSerialNumber = (params) => {
    const currentRowId = params?.row?.CustomerId || params?.row?.id;

    if (currentRowId !== undefined && currentRowId !== null) {
      const indexById = visibleGridData.findIndex((row) => (row?.CustomerId || row?.id) === currentRowId);
      if (indexById >= 0) {
        return indexById + 1;
      }
    }

    const nodeIndex = params?.rowNode?.index;
    if (typeof nodeIndex === 'number' && nodeIndex >= 0) {
      return nodeIndex + 1;
    }

    return '';
  };


  const columns = React.useMemo(() => {
    // Dynamic columns based on source
    if (localSource === 'excel') {
      return [
        {
          field: 'SrNo',
          headerName: 'Sr No',
          width: 70,
          minWidth: 60,
          type: 'number',
          headerClassName: 'data-grid-header',
          renderCell: (params) => getRowSerialNumber(params),
        },
        {
          field: 'CustomerName',
          headerName: 'Name',
          width: 200,
          minWidth: 120,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.CustomerName || params?.row?.customername || params?.row?.customer_name || '',
        },
        {
          field: 'Email',
          headerName: 'Email',
          width: 200,
          minWidth: 120,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.Email || params?.row?.email || '',
        },
        {
          field: 'PhoneNo',
          headerName: 'Phone',
          width: 150,
          minWidth: 110,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.PhoneNo || params?.row?.phoneno || params?.row?.phone_no || '',
        },
        {
          field: 'Company',
          headerName: 'Company',
          width: 150,
          minWidth: 110,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.Company || params?.row?.company || '',
        },
        {
          field: 'CustomerType',
          headerName: 'Type',
          width: 120,
          minWidth: 80,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.CustomerType || params?.row?.customertype || params?.row?.customer_type || '',
        },
        {
          field: 'Category',
          headerName: 'Category',
          width: 150,
          minWidth: 110,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.Category || params?.row?.category || '',
        },
        {
          field: 'City',
          headerName: 'City',
          width: 120,
          minWidth: 80,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.City || params?.row?.city || '',
        },
        {
          field: 'State',
          headerName: 'State',
          width: 120,
          minWidth: 80,
          headerClassName: 'data-grid-header',
          renderCell: (params) => params?.row?.State || params?.row?.state || '',
        },
      ];
    }

    // CRM columns
    return [
      {
        field: 'SrNo',
        headerName: 'Sr No',
        width: 70,
        minWidth: 60,
        type: 'number',
        headerClassName: 'data-grid-header',
        renderCell: (params) => getRowSerialNumber(params),
      },
      {
        field: 'CustomerCode',
        headerName: 'Customer Code',
        width: 180,
        minWidth: 120,
        headerClassName: 'data-grid-header',
      },
      {
        field: 'CustomerName',
        headerName: 'Name',
        width: 200,
        minWidth: 120,
        headerClassName: 'data-grid-header',
      },
      {
        field: 'CompanyType',
        headerName: 'Company type',
        width: 150,
        minWidth: 110,
        headerClassName: 'data-grid-header',
      },
      {
        field: 'CustomerEmail',
        headerName: 'Email',
        width: 200,
        minWidth: 120,
        headerClassName: 'data-grid-header',
      },
      {
        field: 'CustomerPhone',
        headerName: 'Phone',
        width: 200,
        minWidth: 120,
        headerClassName: 'data-grid-header',
        renderCell: (params) => (
          <span>
            {formatMobileNumber(params.value)}
          </span>
        )
      },
      {
        field: 'Country',
        headerName: 'Country',
        width: 120,
        minWidth: 80,
        headerClassName: 'data-grid-header',
      },
      {
        field: 'State',
        headerName: 'State',
        width: 120,
        minWidth: 80,
        headerClassName: 'data-grid-header',
      },
      {
        field: 'City',
        headerName: 'City',
        width: 120,
        minWidth: 80,
        headerClassName: 'data-grid-header',
      },
    ];
  }, [localSource, visibleGridData]);


  const handleFilterChange = (filterKey, value) => {
    setDialogFilters(prev => {
      const newFilters = { ...prev, [filterKey]: value || null };

      // Cascading logic for state -> city
      if (filterKey === 'state' && value !== prev.state) {
        // Reset city when state changes
        newFilters.city = null;
      }

      return newFilters;
    });
  };

  const handleRemoveFilter = (filterKey) => {
    setDialogFilters(prev => ({
      ...prev,
      [filterKey]: null,
    }));
  };

  const handleContinue = (mode) => {
    if (mode === 'replace') {
      setShowReplaceConfirmation(true);
    } else {
      onContinue({
        filters: appliedFilters,
        searchTerm: searchText,
        selectedIds: selectedIds,
        gridData: gridData,
        selectedBranches: appliedBranches,
        selectedGroup: appliedGroup,
        mode: mode, // 'append' or 'replace'
        source: localSource,
      });
    }
  };

  const handleReplaceConfirm = () => {
    setShowReplaceConfirmation(false);
    onContinue({
      filters: appliedFilters,
      searchTerm: searchText,
      selectedIds: selectedIds,
      gridData: gridData,
      selectedBranches: appliedBranches,
      selectedGroup: appliedGroup,
      mode: 'replace',
      source: localSource,
    });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
  };

  const handleClearAllFilters = () => {
    setDialogFilters({
      companyName: null,
      companyType: null,
      state: null,
      city: null,
      country: null,
    });
    setAppliedFilters({
      companyName: null,
      companyType: null,
      state: null,
      city: null,
      country: null,
    });
    setSelectedBranches([]);
    setAppliedBranches([]);
    setSelectedGroup(null);
    setAppliedGroup(null);
    setSearchInput('');
    setSearchText('');
  };

  const handleClearAppliedFilter = (filterKey) => {
    setDialogFilters((prev) => ({ ...prev, [filterKey]: null }));
    setAppliedFilters((prev) => ({ ...prev, [filterKey]: null }));
  };

  const handleClearAppliedBranches = () => {
    setSelectedBranches([]);
    setAppliedBranches([]);
  };

  const handleClearAppliedGroup = () => {
    setSelectedGroup(null);
    setAppliedGroup(null);
  };

  const handleClearAppliedSearch = () => {
    setSearchInput('');
    setSearchText('');
  };

  const getBranchKey = (branches = []) => branches
    .map((branch) => branch?.ToDbName || branch?.name || branch?.BranchName || branch?.label || '')
    .filter(Boolean)
    .sort()
    .join('|');

  const getGroupKey = (group) => group?.id || group?.SerchFilterName || group?.Category || group?.name || '';

  const hasPendingChanges =
    JSON.stringify(dialogFilters) !== JSON.stringify(appliedFilters)
    || searchInput !== searchText
    || getBranchKey(selectedBranches) !== getBranchKey(appliedBranches)
    || getGroupKey(selectedGroup) !== getGroupKey(appliedGroup);

  const hasAppliedFilters =
    appliedBranches.length > 0
    || Boolean(appliedGroup)
    || Object.values(appliedFilters).some((value) => value !== null)
    || Boolean(searchText);

  const isContinueDisabled = selectedIds.length === 0;

  const theme = useMediaQuery;
  const isMobile = theme((t) => t.breakpoints.down('md'));
  const isSmall = theme((t) => t.breakpoints.down('sm'));

  const prioritySectionSx = {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    p: isMobile ? 1 : 1.5,
    backgroundColor: '#f8fafc',
  };

  const secondarySectionSx = {
    border: '1px solid #edf2f7',
    borderRadius: '12px',
    p: isMobile ? 1 : 1.25,
    backgroundColor: '#ffffff',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : '16px',
            height: isMobile ? '100%' : '91vh',
            width: isMobile ? '100%' : '95vw',
            maxWidth: isMobile ? '100%' : '95vw',
            m: isMobile ? 0 : undefined,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.25rem' }, whiteSpace: 'nowrap' }}>
              Filter & Select Audience
            </Typography>
            {/* Applied Filters Display */}
            {hasAppliedFilters && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', minWidth: 0 }}>
                <Chip
                  label="Applied"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
                {appliedBranches.length > 0 && (
                  <Chip
                    label={`Branches: ${appliedBranches.length} selected`}
                    size="small"
                    onDelete={handleClearAppliedBranches}
                  />
                )}
                {appliedGroup && (
                  <Chip
                    label={`Group: ${appliedGroup?.SerchFilterName || appliedGroup?.Category}`}
                    size="small"
                    onDelete={handleClearAppliedGroup}
                  />
                )}
                {appliedFilters.companyName && (
                  <Chip
                    label={`Company: ${appliedFilters.companyName}`}
                    size="small"
                    onDelete={() => handleClearAppliedFilter('companyName')}
                  />
                )}
                {appliedFilters.companyType && (
                  <Chip
                    label={`Type: ${appliedFilters.companyType}`}
                    size="small"
                    onDelete={() => handleClearAppliedFilter('companyType')}
                  />
                )}
                {appliedFilters.state && (
                  <Chip
                    label={`State: ${appliedFilters.state}`}
                    size="small"
                    onDelete={() => handleClearAppliedFilter('state')}
                  />
                )}
                {appliedFilters.city && (
                  <Chip
                    label={`City: ${appliedFilters.city}`}
                    size="small"
                    onDelete={() => handleClearAppliedFilter('city')}
                  />
                )}
                {appliedFilters.country && (
                  <Chip
                    label={`Country: ${appliedFilters.country}`}
                    size="small"
                    onDelete={() => handleClearAppliedFilter('country')}
                  />
                )}
                {searchText && (
                  <Chip
                    label={`Search: ${searchText}`}
                    size="small"
                    onDelete={handleClearAppliedSearch}
                  />
                )}
                <Button size='small' varient='text' className='varientTextBtn' onClick={handleClearAllFilters}>
                  Clear All
                </Button>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-end' } }}>
            <ToggleButtonGroup
              value={localSource}
              exclusive
              onChange={(e, newSource) => {
                if (newSource && newSource !== localSource) {
                  // Check if switching from CRM to Excel with filters
                  if (localSource === 'crm' && newSource === 'excel') {
                    const hasFilters = hasAppliedFilters || hasPendingChanges;
                    if (hasFilters) {
                      setPendingSource(newSource);
                      setShowSourceSwitchConfirmation(true);
                      return;
                    }
                  }
                  setLocalSource(newSource);
                }
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  px: { xs: 1.5, md: 2.25 },
                  py: 0.75,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  minWidth: { xs: 0, md: 160 },
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  backgroundColor: '#f8fafc',
                  transition: 'all 0.2s ease',
                  '&:not(:last-child)': {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  },
                  '&:not(:first-child)': {
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'var(--primary-main)',
                    color: 'white',
                    borderColor: 'var(--primary-main)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                    '&:hover': {
                      backgroundColor: 'var(--primary-main)',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="crm">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Building2 size={18} />
                  Import from CRM
                </Box>
              </ToggleButton>
              <ToggleButton value="excel">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileText size={18} />
                  Import from Excel
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={onClose} size="small">
              <X size={18} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ p: 0, height: isMobile ? 'calc(100% - 140px)' : 'calc(90vh - 140px)', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Left Side - Filters */}
        <Box sx={{ width: isMobile ? '100%' : '400px', p: isMobile ? 1.5 : 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: isMobile ? '1px solid #e0e0e0' : 'none', maxHeight: isMobile ? '35vh' : 'none', flexShrink: 0 }}>
          {/* Excel Upload Area - Show only in Excel mode */}
          {localSource === 'excel' && !uploadedFile && (
            <Box
              sx={{
                border: isDragging ? '2px dashed var(--primary-main)' : '2px dashed var(--sidebar-borderColor)',
                borderRadius: '12px',
                p: 3,
                backgroundColor: isDragging ? '#f0f8ff' : '#fcfcfd',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                cursor: 'pointer',
                mb: 2,
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx, .xls, .csv';
                input.onchange = (e) => {
                  if (e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                };
                input.click();
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                <Upload size={48} color="var(--primary-main)" />
                <Typography variant="h6" gutterBottom>
                  Upload Excel/CSV file
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Click or drag & drop here
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Supported formats: .xlsx, .xls, .csv (Max 10MB)
                </Typography>
              </Box>
            </Box>
          )}
          {localSource === 'excel' && !uploadedFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', mb: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                Need a sample file?
              </Typography>
              <Button
                component="a"
                href={sampleExcelFile()}
                download="sample_audience.xlsx"
                size="small"
                startIcon={<Download size={14} />}
                className="varientTextBtn"
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    color: 'var(--primary-main) !important',
                  },
                }}
              >
                Download Sample
              </Button>
            </Box>
          )}

          {/* Uploaded File Info - Show only in Excel mode */}
          {localSource === 'excel' && uploadedFile && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
              <FileText size={32} color="var(--primary-main)" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  {uploadedFile.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
              <IconButton
                onClick={() => {
                  if (onFileUpload) {
                    onFileUpload(null);
                  }
                  setGridData([]);
                }}
                size="small"
              >
                <X size={20} />
              </IconButton>
            </Box>
          )}

          {/* Filters in order: Search, Branch, Group, then other filters */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>
              Priority Filters
            </Typography>

            {/* Search */}
            <Box sx={prioritySectionSx}>
              <TextField
                label="Search"
                size="medium"
                fullWidth
                value={searchInput}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setSearchText(searchInput);
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} />
                      </InputAdornment>
                    ),
                    endAdornment: searchInput && (
                      <IconButton size="small" onClick={() => {
                        setSearchInput('');
                        setSearchText('');
                      }}>
                        <X size={18} />
                      </IconButton>
                    ),
                  },
                }}
                sx={{
                    borderRadius: 2,
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#cbd5e1',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#94a3b8',
                    },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--primary-main)',
                      borderWidth: 2,
                    },
                  }}
              />
            </Box>

            {/* Duplicate Removal Card */}
            <Box
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                p: 1.5,
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569' }}>
                Remove duplicate mobile numbers
              </Typography>
              <Checkbox
                checked={removeDuplicateMobiles}
                onChange={(e) => setRemoveDuplicateMobiles(e.target.checked)}
                size="small"
              />
            </Box>

            {/* Branch Filter - Chip view - Hide for excel source and when no branch data */}
            {localSource !== 'excel' && branchData.length > 0 && (
              <Box sx={prioritySectionSx}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'text.secondary' }}>
                  Select Branches
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {branchData.map((branch) => {
                    const isSelected = selectedBranches.some(b => b.ToDbName === branch.ToDbName);
                    const label = `${branch.UFCC} (${branch.CustomerCnt})`;
                    return (
                      <Chip
                        key={branch.ToDbName}
                        label={label}
                        size="medium"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBranches(prev => prev.filter(b => b.ToDbName !== branch.ToDbName));
                          } else {
                            setSelectedBranches(prev => [...prev, branch]);
                          }
                        }}
                        sx={{
                          backgroundColor: isSelected ? 'var(--primary-main)' : '#f5f5f5',
                          color: isSelected ? 'white' : 'text.primary',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: isSelected ? 'var(--primary-main)' : '#e0e0e0',
                            color: isSelected ? 'white' : 'text.primary',
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Group Filter - Chip view */}
            {groupOptions.length > 0 && (
              <Box sx={prioritySectionSx}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'text.secondary' }}>
                  Select Group
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {groupOptions.slice(0, showAllGroups ? groupOptions.length : 20).map((group) => {
                    const isSelected = selectedGroup?.id === group.id;
                    return (
                      <Chip
                        key={group.id}
                        label={group?.SerchFilterName || group?.Category}
                        size="medium"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGroup(null);
                          } else {
                            setSelectedGroup(group);
                          }
                        }}
                        sx={{
                          backgroundColor: isSelected ? 'var(--primary-main)' : '#f5f5f5',
                          color: isSelected ? 'white' : 'text.primary',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: isSelected ? 'var(--primary-main)' : '#e0e0e0',
                            color: isSelected ? 'white' : 'text.primary',
                          },
                        }}
                      />
                    );
                  })}
                  {!showAllGroups && groupOptions.length > 20 && (
                    <Chip
                      label={`+ ${groupOptions.length - 20} more`}
                      size="medium"
                      onClick={() => setShowAllGroups(true)}
                      sx={{
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary-main)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'var(--primary-main)',
                          color: 'white',
                        },
                      }}
                    />
                  )}
                  {showAllGroups && groupOptions.length > 20 && (
                    <Chip
                      label="Show less"
                      size="medium"
                      onClick={() => setShowAllGroups(false)}
                      sx={{
                        backgroundColor: '#f5f5f5',
                        color: 'text.primary',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: '#e0e0e0',
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}
            <Divider sx={{ my: 0.5 }} />

            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--secondary-color)', letterSpacing: 0.2 }}>
              Additional Filters
            </Typography>

            {/* Other Filters */}
            <Box sx={secondarySectionSx}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <SelectAutocomplete
                  value={dialogFilters.companyType}
                  onChange={(event, newValue) => handleFilterChange('companyType', newValue)}
                  options={companyTypeOptions}
                  label="Company Type"
                  placeholder="Select Type"
                  multiple={false}
                />

                <SelectAutocomplete
                  value={dialogFilters.country}
                  onChange={(event, newValue) => handleFilterChange('country', newValue)}
                  options={countryOptions}
                  label="Country"
                  placeholder="Select Country"
                  multiple={false}
                />

                <SelectAutocomplete
                  value={dialogFilters.state}
                  onChange={(event, newValue) => handleFilterChange('state', newValue)}
                  options={stateOptions}
                  label="State"
                  placeholder="Select State"
                  multiple={false}
                />

                <SelectAutocomplete
                  value={dialogFilters.city}
                  onChange={(event, newValue) => handleFilterChange('city', newValue)}
                  options={cityOptions}
                  label="City"
                  placeholder="Select City"
                  multiple={false}
                />
              </Box>
            </Box>

          </Box>

        </Box>

        {/* Right Side - Grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Box sx={{ px: isMobile ? 1 : 2, py: 1, display: 'flex', borderLeft: isMobile ? 'none' : '1px solid #e0e0e0', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Filtered Results ({visibleGridData.length} records)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.5 : 2 }}>
              {removeDuplicateMobiles && dedupeStats.duplicateRowsRemoved > 0 && (
                <Typography variant="caption" sx={{ color: 'var(--secondary-color)', display: { xs: 'none', sm: 'block' } }}>
                  Removed {dedupeStats.duplicateRowsRemoved} duplicate rows ({dedupeStats.duplicateNumbersCount} duplicate numbers)
                </Typography>
              )}
              <Button
                size="small"
                onClick={() => {
                  if (selectedIds.length === visibleGridData.length) {
                    setSelectedIds([]);
                    setRowSelectionModel({ type: 'include', ids: new Set() });
                  } else {
                    const allIds = visibleGridData.map(row => row?.CustomerId ?? row?.id).filter((id) => id !== undefined && id !== null);
                    setSelectedIds(allIds);
                    setRowSelectionModel({ type: 'include', ids: new Set(allIds) });
                  }
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                }}
              >
                <Checkbox
                  checked={selectedIds.length === visibleGridData.length && visibleGridData.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < visibleGridData.length}
                  size="small"
                  sx={{ padding: 0 }}
                />
                Select All
              </Button>
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
            <DataGrid
              rows={visibleGridData}
              columns={columns}
              checkboxSelection
              disableSelectionOnClick
              disableColumnMenu
              disableColumnFilter
              getRowId={(row) => row?.CustomerId ?? row?.id ?? row?.PhoneNo ?? row?.CustomerPhone ?? row?.Email ?? row?.CustomerCode}
              loading={loading}
              components={{
                LoadingOverlay: LinearProgress,
              }}
              onRowSelectionModelChange={(newSelection) => {
                let selectionModel;
                if (typeof newSelection === 'object' && newSelection?.ids instanceof Set) {
                  selectionModel = newSelection;
                } else if (Array.isArray(newSelection)) {
                  selectionModel = { type: 'include', ids: new Set(newSelection) };
                } else {
                  selectionModel = { type: 'include', ids: new Set() };
                }

                const visibleIds = visibleGridData
                  .map((row) => row?.CustomerId ?? row?.id)
                  .filter((id) => id !== undefined && id !== null);

                const selectedIdsSet = new Set(selectedIds || []);

                // Preserve previously selected IDs that are not part of current visible rows
                visibleIds.forEach((id) => {
                  selectedIdsSet.delete(id);
                });

                let currentlySelectedVisibleIds = [];
                if (selectionModel.type === 'exclude') {
                  const excludedIds = selectionModel.ids instanceof Set ? selectionModel.ids : new Set();
                  currentlySelectedVisibleIds = visibleGridData
                    .map((row) => row?.CustomerId ?? row?.id)
                    .filter((id) => id !== undefined && id !== null && !excludedIds.has(id));
                } else {
                  currentlySelectedVisibleIds = Array.from(selectionModel.ids || []);
                }

                currentlySelectedVisibleIds.forEach((id) => {
                  selectedIdsSet.add(id);
                });

                const nextSelectedIds = Array.from(selectedIdsSet);
                const prevSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];
                const isSameSelection =
                  prevSelectedIds.length === nextSelectedIds.length
                  && prevSelectedIds.every((id) => selectedIdsSet.has(id));

                if (!isSameSelection) {
                  setSelectedIds(nextSelectedIds);
                  setRowSelectionModel({ type: 'include', ids: new Set(nextSelectedIds) });
                }
              }}
              rowSelectionModel={safeRowSelectionModel}
              sx={{
                borderRadius: '0',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#ffffff',
                },
                '& .MuiDataGrid-cell': {
                },
                '& .MuiDataGrid-columnHeader': {
                  fontWeight: 'bold',
                },
                '& .MuiDataGrid-virtualScroller': {
                  minHeight: isMobile ? '200px' : '500px',
                  overflowX: 'auto',
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
        <Box sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography variant="caption" color="textSecondary">
            {selectedIds.length} contacts selected
          </Typography>
          {hasPendingChanges && <Typography variant="caption" sx={{ display: 'block', color: 'warning.main' }}>Updating results...</Typography>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' } }}>
          <Button className='secondaryBtnClassname' onClick={onClose} variant="contained" size="small">
            Cancel
          </Button>
          <Button className='dangerbtnClassName' onClick={() => handleContinue('replace')} variant="contained" disabled={isContinueDisabled} size="small">
            Append & Replace ({selectedIds.length})
          </Button>
          <Button className='buttonClassname' onClick={() => handleContinue('append')} variant="contained" disabled={isContinueDisabled} size="small">
            Append ({selectedIds.length})
          </Button>
        </Box>
      </DialogActions>

      <ConfirmationModal
        isOpen={showReplaceConfirmation}
        onClose={() => setShowReplaceConfirmation(false)}
        onConfirm={handleReplaceConfirm}
        title="Replace Existing Data"
        description="This will replace all existing contacts with the new selection. Are you sure you want to continue?"
      />
      <ConfirmationModal
        isOpen={showSourceSwitchConfirmation}
        onClose={() => setShowSourceSwitchConfirmation(false)}
        onConfirm={() => {
          setShowSourceSwitchConfirmation(false);
          if (pendingSource) {
            setLocalSource(pendingSource);
            setPendingSource(null);
          }
        }}
        title="Switch to Excel Mode"
        description="You have applied filters in CRM mode. Switching to Excel mode will clear all your current filters and selections. Are you sure you want to continue?"
      />
    </Dialog>
  );
};

export default FilterSelectionDialog;
