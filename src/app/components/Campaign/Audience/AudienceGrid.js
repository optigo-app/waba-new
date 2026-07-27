import React, { useState, useCallback, useMemo, useRef } from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { TextField, InputAdornment, Box, IconButton, Tooltip } from '@mui/material';
import { Search, Delete, Download, File } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  GridToolbarFilterButton,
} from '@mui/x-data-grid';

// ── Stable column definitions (never recreated) ───────────────────────────────
const renderDashIfEmpty = (params) => params.value || '-';

const CRM_COLUMNS = [
  { field: 'SrNo',          headerName: 'Sr #',             width: 60,  minWidth: 50, type: 'number', headerClassName: 'data-grid-header' },
  { field: 'CustomerCode',  headerName: 'Customer Code', width: 160, minWidth: 110, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'CustomerName',  headerName: 'Name',          width: 200, minWidth: 120, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'CompanyType',   headerName: 'Company Type',  width: 150, minWidth: 110, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'CustomerEmail', headerName: 'Email',         width: 220, minWidth: 120, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'CustomerPhone', headerName: 'Phone',         width: 160, minWidth: 110, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'CountryCode',   headerName: 'Country Code',  width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'Country',       headerName: 'Country',       width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'State',         headerName: 'State',         width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'City',          headerName: 'City',          width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
];

const EXCEL_COLUMNS = [
  { field: 'SrNo',         headerName: '#',             width: 60,  minWidth: 50, type: 'number', headerClassName: 'data-grid-header' },
  { field: 'CustomerName', headerName: 'Customer Name', width: 200, minWidth: 120, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'Email',        headerName: 'Email',         width: 220, minWidth: 120, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'PhoneNo',      headerName: 'Phone',         width: 160, minWidth: 110, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'Company',      headerName: 'Company',       width: 220, minWidth: 120, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'CustomerType', headerName: 'Type',          width: 140, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'Category',     headerName: 'Category',      width: 160, minWidth: 110, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'Source',       headerName: 'Source',        width: 160, minWidth: 110, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'PinCode',      headerName: 'Pin Code',      width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'City',         headerName: 'City',          width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
  { field: 'State',        headerName: 'State',         width: 120, minWidth: 80, headerClassName: 'data-grid-header', renderCell: renderDashIfEmpty },
];

// Unified columns for mixed Excel and CRM data
const UNIFIED_COLUMNS = [
  { field: 'SrNo', headerName: '#', width: 60, minWidth: 50, type: 'number', headerClassName: 'data-grid-header' },
  {
    field: 'CustomerName',
    headerName: 'Customer Name',
    width: 200,
    minWidth: 120,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.CustomerName || '—'
  },
  {
    field: 'CountryCode',
    headerName: 'Country Code',
    width: 120,
    minWidth: 80,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.Source === 'Excel' ? '—' : (params.row.CountryCode || '—')
  },
  {
    field: 'Phone',
    headerName: 'Phone',
    width: 160,
    minWidth: 110,
    headerClassName: 'data-grid-header',
    renderCell: (params) => {
      if (params.row.Source === 'Excel') {
        return params.row.PhoneNo || '—';
      }
      return params.row.CustomerPhone || '—';
    }
  },
  {
    field: 'Email',
    headerName: 'Email',
    width: 220,
    minWidth: 120,
    headerClassName: 'data-grid-header',
    renderCell: (params) => {
      if (params.row.Source === 'Excel') {
        return params.row.Email || '—';
      }
      return params.row.CustomerEmail || '—';
    }
  },
  {
    field: 'Company',
    headerName: 'Company',
    width: 220,
    minWidth: 120,
    headerClassName: 'data-grid-header',
    renderCell: (params) => {
      if (params.row.Source === 'Excel') {
        return params.row.Company || '—';
      }
      return params.row.CustomerCode || '—';
    }
  },
  {
    field: 'Type',
    headerName: 'Type',
    width: 140,
    minWidth: 80,
    headerClassName: 'data-grid-header',
    renderCell: (params) => {
      if (params.row.Source === 'Excel') {
        return params.row.CustomerType || '—';
      }
      return params.row.CompanyType || '—';
    }
  },
  {
    field: 'Source',
    headerName: 'Source',
    width: 100,
    minWidth: 70,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.Source || 'CRM'
  },
  {
    field: 'Category',
    headerName: 'Category',
    width: 160,
    minWidth: 110,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.Source === 'Excel' ? (params.row.Category || '—') : '—'
  },
  {
    field: 'City',
    headerName: 'City',
    width: 120,
    minWidth: 80,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.City || '—'
  },
  {
    field: 'State',
    headerName: 'State',
    width: 120,
    minWidth: 80,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.State || '—'
  },
  {
    field: 'Country',
    headerName: 'Country',
    width: 120,
    minWidth: 80,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.Source === 'Excel' ? '—' : (params.row.Country || '—')
  },
  {
    field: 'PinCode',
    headerName: 'Pin Code',
    width: 120,
    minWidth: 80,
    headerClassName: 'data-grid-header',
    renderCell: (params) => params.row.Source === 'Excel' ? (params.row.PinCode || '—') : '—'
  },
];

// ── Stable sx object (never recreated) ───────────────────────────────────────
const GRID_SX = {
  border: '1px solid var(--sidebar-borderColor)',
  borderRadius: '12px',
  boxShadow: 'var(--box-shadow-value)',
  '& .MuiDataGrid-columnHeaders': { backgroundColor: '#fff', borderBottom: '1px solid var(--sidebar-borderColor)' },
  '& .MuiDataGrid-cell': { borderBottom: '1px solid var(--sidebar-borderColor)' },
  '& .MuiDataGrid-columnHeader': { fontWeight: 600, borderBottom: '1px solid var(--sidebar-borderColor)' },
  '& .MuiDataGrid-virtualScroller': { overflowX: 'auto' },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
  '& .MuiDataGrid-row:last-child .MuiDataGrid-cell': { borderBottom: 'none' },
};

// ── Toolbar — fully memoized, stable prop shape ───────────────────────────────
const CustomToolbar = React.memo(({ onFilterClick, onSearchChange, searchText, selectedCount, onExportClick }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, gap: 1, flexWrap: 'wrap' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
      <TextField
        variant="outlined"
        size="small"
        placeholder="Search..."
        value={searchText}
        onChange={onSearchChange}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} style={{ color: 'rgba(125,127,133,0.6)' }} />
              </InputAdornment>
            ),
            sx: {
              height: 36,
              borderRadius: '10px',
              backgroundColor: '#fcfcfd',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--sidebar-borderColor)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(90,90,90,0.2)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary-main)', borderWidth: 2 },
            },
          },
        }}
        sx={{ width: { xs: '100%', md: 260 } }}
      />
      <Tooltip title="Filter audience">
        <IconButton
          onClick={onFilterClick}
          size="small"
          sx={{ border: '1px solid var(--sidebar-borderColor)', borderRadius: '10px', backgroundColor: '#fcfcfd', color: 'var(--secondary-color)', p: 0.75, flexShrink: 0 }}
        >
          <File size={16} />
        </IconButton>
      </Tooltip>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      <Box sx={{ fontSize: '0.8rem', color: 'var(--secondary-color)', mr: 0.5, whiteSpace: 'nowrap' }}>
        Selected: {selectedCount}
      </Box>
      <GridToolbarFilterButton size="small" />
      <Tooltip title="Export Excel">
        <IconButton
          onClick={onExportClick}
          size="small"
          sx={{ border: '1px solid var(--sidebar-borderColor)', borderRadius: '10px', backgroundColor: '#fcfcfd', color: 'var(--secondary-color)', p: 0.75 }}
        >
          <Download size={16} />
        </IconButton>
      </Tooltip>
    </Box>
  </Box>
));

// ── Stable slots object (defined once at module level) ────────────────────────
const GRID_SLOTS = { toolbar: CustomToolbar };

// ── AudienceGrid ──────────────────────────────────────────────────────────────
const AudienceGrid = ({
  rows = [],
  onRowSelectionModelChange,
  rowSelectionModel,
  onFilterClick,
  source,
  loading = false,
  pageSizeOptions = [20, 50, 100],
  searchText: externalSearchText,
  onSearchChange: externalOnSearchChange,
  onDelete,
  selectedRows = [],
}) => {
  const apiRef = useGridApiRef();
  const [internalSearch, setInternalSearch] = useState('');
  const searchText = externalSearchText !== undefined ? externalSearchText : internalSearch;

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    if (externalOnSearchChange) externalOnSearchChange(val);
    else setInternalSearch(val);
  }, [externalOnSearchChange]);

  const safeSelection = useMemo(() => {
    if (!rowSelectionModel) return { type: 'include', ids: new Set() };
    if (Array.isArray(rowSelectionModel)) return { type: 'include', ids: new Set(rowSelectionModel) };
    if (rowSelectionModel.ids instanceof Set) return rowSelectionModel;
    if (rowSelectionModel.ids) return { type: 'include', ids: new Set(rowSelectionModel.ids) };
    return { type: 'include', ids: new Set() };
  }, [rowSelectionModel]);

  const selectedCount = safeSelection.ids.size;

  const processedRows = useMemo(() => {
    return rows.map((row, i) => {
      if (row.SrNo === i + 1) return row;
      return { ...row, SrNo: i + 1 };
    });
  }, [rows]);

  const searchBlobs = useMemo(() => {
    return processedRows.map((row) => {
      const fields = source === 'crm'
        ? [row.CustomerCode, row.CustomerName, row.CompanyType, row.CustomerEmail, row.CustomerPhone, row.Country, row.State, row.City]
        : [row.CustomerName, row.Email, row.PhoneNo, row.Company, row.CustomerType, row.Category, row.City, row.State];
      return fields.filter(Boolean).join(' ').toLowerCase();
    });
  }, [processedRows, source]);

  const filteredRows = useMemo(() => {
    const q = searchText?.trim().toLowerCase();
    if (!q) return processedRows;
    return processedRows.filter((_, i) => searchBlobs[i].includes(q));
  }, [processedRows, searchBlobs, searchText]);

  const handleSelectionChange = useCallback((model) => {
    // DataGrid may pass object { ids: Set } or array — normalize to array
    let idsArray = [];
    if (Array.isArray(model)) {
      idsArray = model;
    } else if (model?.ids instanceof Set) {
      idsArray = Array.from(model.ids);
    } else if (model?.ids) {
      idsArray = Array.from(model.ids);
    }
    onRowSelectionModelChange?.(idsArray);
  }, [onRowSelectionModelChange]);

  const getRowId = useCallback((row) => row.CustomerId ?? row.id ?? row.PhoneNo ?? row.Email ?? row.SrNo?.toString(), []);

  // Detect if data is mixed (has both Excel and CRM sources)
  const hasMixedData = useMemo(() => {
    if (!processedRows.length) return false;
    const hasExcel = processedRows.some(row => row.Source === 'Excel');
    const hasCRM = processedRows.some(row => !row.Source || row.Source !== 'Excel');
    return hasExcel && hasCRM;
  }, [processedRows]);

  const actionColumn = useMemo(() => ({
    field: 'actions',
    headerName: 'Action',
    width: 80,
    sortable: false,
    filterable: false,
    headerClassName: 'data-grid-header',
    renderCell: (params) => (
      <IconButton
        size="small"
        color="error"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(params.row);
        }}
        sx={{ '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)' } }}
      >
        <Delete size={16} />
      </IconButton>
    ),
  }), [onDelete]);

  const baseColumns = hasMixedData ? UNIFIED_COLUMNS : (source === 'crm' ? CRM_COLUMNS : EXCEL_COLUMNS);
  const columns = useMemo(() => onDelete ? [...baseColumns, actionColumn] : baseColumns, [baseColumns, actionColumn, onDelete]);

  const handleExport = useCallback(() => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.error('No selected rows to export');
      return;
    }

    const exportColumns = columns.filter((col) => col.field !== 'actions' && col.field !== 'SrNo');
    const headers = exportColumns.map((col) => col.headerName);

    const selectedIds = new Set(selectedRows.map((r) => r.CustomerId ?? r.id ?? r.PhoneNo ?? r.Email));
    const sortedRows = apiRef.current ? apiRef.current.getSortedRows() : filteredRows;
    const rowsToExport = sortedRows.filter((row) => selectedIds.has(row.CustomerId ?? row.id ?? row.PhoneNo ?? row.Email));

    const rows = rowsToExport.map((row) => {
      const obj = {};
      exportColumns.forEach((col) => {
        let val = row[col.field];
        if (col.field === 'CustomerName') {
          val = row.CustomerName || '—';
        } else if (col.field === 'Phone') {
          val = row.Source === 'Excel' ? (row.PhoneNo || '—') : (row.CustomerPhone || '—');
        } else if (col.field === 'Email') {
          val = row.Source === 'Excel' ? (row.Email || '—') : (row.CustomerEmail || '—');
        } else if (col.field === 'Company') {
          val = row.Source === 'Excel' ? (row.Company || '—') : (row.CustomerCode || '—');
        } else if (col.field === 'Type') {
          val = row.Source === 'Excel' ? (row.CustomerType || '—') : (row.CompanyType || '—');
        } else if (col.field === 'Source') {
          val = row.Source || 'CRM';
        } else if (col.field === 'Category') {
          val = row.Source === 'Excel' ? (row.Category || '—') : '—';
        } else if (col.field === 'City') {
          val = row.City || '—';
        } else if (col.field === 'State') {
          val = row.State || '—';
        } else if (col.field === 'Country') {
          val = row.Source === 'Excel' ? '—' : (row.Country || '—');
        } else if (col.field === 'CountryCode') {
          val = row.Source === 'Excel' ? '—' : (row.CountryCode || '—');
        } else if (col.field === 'PinCode') {
          val = row.Source === 'Excel' ? (row.PinCode || '—') : '—';
        } else if (!val) {
          val = '—';
        }
        obj[col.headerName] = val;
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audience');

    const filename = `Audience_${source || 'data'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success(`Exported ${rowsToExport.length} selected rows to Excel`);
  }, [selectedRows, columns, source, filteredRows, apiRef]);

  const slotProps = useMemo(() => ({
    toolbar: {
      onFilterClick,
      onSearchChange: handleSearchInputChange,
      searchText,
      selectedCount,
      onExportClick: handleExport,
    },
  }), [onFilterClick, handleSearchInputChange, searchText, selectedCount, handleExport]);

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', minWidth: 0 }}>
      <Box sx={{ minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <DataGrid
          apiRef={apiRef}
          rows={filteredRows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnFilter
          keepNonExistentRowsSelected
          loading={loading}
          getRowId={getRowId}
          rowSelectionModel={safeSelection}
          onRowSelectionModelChange={handleSelectionChange}
          paginationMode="client"
          initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          pageSizeOptions={pageSizeOptions}
          slots={GRID_SLOTS}
          slotProps={slotProps}
          sx={{ ...GRID_SX, height: '100%' }}
          columnHeaderHeight={44}
        />
      </Box>
    </Box>
  );
};

export default React.memo(AudienceGrid);
