import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, Paper, Chip, Button, Dialog, IconButton } from '@mui/material';
import { Plus, Database, FileSpreadsheet, X, Download } from 'lucide-react';
import StepperNavigation from "../NavigationStepper/StepperNavigation";
import AudienceGrid from './AudienceGrid';
import FilterSelectionDialog from './FilterSelectionDialog';
import styles from './AudienceSection.module.scss';
import { ExcelImport } from '../../api/UploadMedia';
import toast from 'react-hot-toast';
import { fetchExcelList } from '../../api/ExcelLists';
import { useAuthToken } from '../../../hooks/useAuthToken';
import { getCampaignStepper, getAudienceDraft, setAudienceDraft } from '../../../utils/storage';
import { getStaticUrl } from '../../../utils/globalFunc';

const AudienceSection = ({ audience, onAudienceChange, onDataSourceChange, onNext, onPrevious, currentStep, steps }) => {
    const [source, setSource] = useState('crm');
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [sourceSelectionOpen, setSourceSelectionOpen] = useState(false);
    const [filteredDataFromDialog, setFilteredDataFromDialog] = useState(null);
    const { userToken } = useAuthToken();
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 20,
    });
    const [rowCount, setRowCount] = useState(0);
    const [filters, setFilters] = useState({
        companyName: null,
        companyType: null,
        state: null,
        city: null,
        country: null,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [rowSelectionModel, setRowSelectionModel] = useState({ type: 'include', ids: new Set() });
    const [selectedRowMap, setSelectedRowMap] = useState({});
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Create a ref to store the timeout ID
    const searchTimeoutRef = useRef(null);

    // Debounce search function
    const debounceSearch = (value) => {
        // Clear any existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set a new timeout
        searchTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
            setPaginationModel(prev => ({ ...prev, page: 0 }));
        }, 200); // 200ms delay
    };

    const [tableData, setTableData] = useState({
        rows: [],
        loading: true
    });
    const [excelData, setExcelData] = useState({
        rows: [],
        loading: true
    });

    const fetchCampignId = getCampaignStepper()?.selectedTemplates[0]?.campaignId;

    const getAudienceRowId = useCallback((row) => row?.CustomerId || row?.id, []);

    const saveAudienceDraft = useCallback((rows, selectedIdsList, currentSource, currentFile) => {
        const safeRows = Array.isArray(rows) ? rows : [];
        const safeSelectedIds = Array.isArray(selectedIdsList) ? selectedIdsList : [];

        setAudienceDraft({
            source: currentSource,
            rows: safeRows,
            selectedIds: safeSelectedIds,
            fileName: currentFile?.name || '',
            fileSize: currentFile?.size || 0,
        });
    }, []);

    useEffect(() => {
        const draft = getAudienceDraft();
        if (!draft) return;

        try {
            // draft already parsed
            const draftRows = Array.isArray(draft?.rows) ? draft.rows : [];
            const draftSelectedIds = Array.isArray(draft?.selectedIds)
                ? draft.selectedIds
                : draftRows.map((row) => row?.CustomerId || row?.id).filter(Boolean);

            if (draft?.source) {
                setSource(draft.source);
            }

            if (draftRows.length > 0) {
                setFilteredDataFromDialog(draftRows);
                setRowSelectionModel({ type: 'include', ids: new Set(draftSelectedIds) });

                const draftRowMap = {};
                draftRows.forEach((row) => {
                    const rowId = row?.CustomerId || row?.id;
                    if (rowId !== undefined && rowId !== null) {
                        draftRowMap[rowId] = row;
                    }
                });
                setSelectedRowMap(draftRowMap);
            }

            if (draft?.fileName) {
                setFile({ name: draft.fileName, size: draft.fileSize || 0 });
            }
        } catch (error) {
            console.error('Error restoring audience draft:', error);
        }
    }, []);

    const selectedIds = useMemo(() => {
        if (rowSelectionModel?.ids instanceof Set) {
            return Array.from(rowSelectionModel.ids);
        }
        return [];
    }, [rowSelectionModel]);

    const rowSelectionData = useMemo(() => {
        return selectedIds
            .map((id) => selectedRowMap[id])
            .filter(Boolean);
    }, [selectedIds, selectedRowMap]);

    // Handle filter changes
    const handleApplyFilters = (newFilters) => {
        setFilters({
            companyName: newFilters.companyName?.companyname || null,
            companyType: newFilters.companyType?.businessclassname || null,
            state: newFilters.state?.StateName || null,
            city: newFilters.city?.City || null,
            country: newFilters.country?.CountryName || null,
        });
        // Reset to first page when filters change
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    };

    // Handle pagination model change
    const handlePaginationModelChange = (newPaginationModel) => {
        setPaginationModel({
            page: newPaginationModel.page,
            pageSize: newPaginationModel.pageSize
        });

        // If the source is Excel, fetch the new page of data
        if (source === 'excel' && fetchCampignId) {
            fetchExcelData(fetchCampignId);
        }
    };

    // Fetch Excel data with pagination
    const fetchExcelData = async (campaignId) => {
        try {
            setExcelData(prev => ({ ...prev, loading: true }));
            const result = await fetchExcelList(userToken?.userId || userToken?.userid || userToken?.appuserid, campaignId, "", filters, searchTerm);

            if (result) {
                setExcelData({
                    rows: result.data || [],
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error fetching Excel data:', error);
            setExcelData({
                rows: [],
                loading: false
            });
            setRowCount(0);
        }
    };

    // Handle next button click
    const handleNext = () => {
        const audience = rowSelectionData.map(item => {
            let phone = (item.CustomerPhone || item.PhoneNo || item.phone || '').replace(/\D/g, '');

            if (phone.length === 10) {
                phone = '91' + phone;
            }

            return {
                customerId: item.CustomerId,
                phone: phone
            };
        });

        const selectedIdsToPersist = rowSelectionData
            .map((row) => row?.CustomerId || row?.id)
            .filter((id) => id !== undefined && id !== null);
        saveAudienceDraft(rowSelectionData, selectedIdsToPersist, source, file);

        onAudienceChange(audience);
        onDataSourceChange(source === "crm" ? "optigo" : "excel");
        onNext();
    };

    // Check if next button should be enabled
    const isNextDisabled = rowSelectionData.length === 0;

    // Toggle filter dialog
    const toggleFilterDialog = () => {
        setFilterDialogOpen(!filterDialogOpen);
    };

    const openSourceSelectionDialog = () => {
        setSourceSelectionOpen(true);
    };

    const closeSourceSelectionDialog = () => {
        setSourceSelectionOpen(false);
    };

    const handleSourceSelection = (selectedSource) => {
        setSource(selectedSource);
        setSourceSelectionOpen(false);
        setFilterDialogOpen(true);
    };

    // Handle continue from filter dialog
    const handleFilterContinue = (data) => {
        if (data?.source && data.source !== source) {
            setSource(data.source);
        }

        setFilters(data.filters);
        setSearchTerm(data.searchTerm);
        setSelectedBranches(data.selectedBranches || []);
        setSelectedGroup(data.selectedGroup || null);

        // Set selected rows from dialog - use object format with Set
        const selectedIds = Array.isArray(data.selectedIds) ? data.selectedIds : [];

        // Filter gridData to only include selected rows
        const selectedRows = (data.gridData || []).filter(row => {
            const rowId = row.CustomerId || row.id;
            return selectedIds.includes(rowId);
        });

        if (data.mode === 'replace') {
            // Replace mode: replace all existing data with only selected rows
            setFilteredDataFromDialog(selectedRows);
            setRowSelectionModel({ type: 'include', ids: new Set(selectedIds) });

            // Build selected row map
            const newSelectedRowMap = {};
            selectedRows.forEach(row => {
                const rowId = row.CustomerId || row.id;
                newSelectedRowMap[rowId] = row;
            });
            setSelectedRowMap(newSelectedRowMap);
            saveAudienceDraft(selectedRows, selectedIds, source, file);
        } else {
            // Append mode: add only selected rows to existing data
            const existingData = filteredDataFromDialog || [];

            // Combine data, avoiding duplicates
            const combinedData = [...existingData];
            selectedRows.forEach(newRow => {
                const rowId = newRow.CustomerId || newRow.id;
                if (!combinedData.some(row => (row.CustomerId || row.id) === rowId)) {
                    combinedData.push(newRow);
                }
            });

            setFilteredDataFromDialog(combinedData);

            // Update selection to include all rows (since we're showing only selected data)
            const allIds = combinedData.map(row => row.CustomerId || row.id);
            setRowSelectionModel({ type: 'include', ids: new Set(allIds) });

            // Build selected row map
            const newSelectedRowMap = { ...selectedRowMap };
            selectedRows.forEach(row => {
                const rowId = row.CustomerId || row.id;
                newSelectedRowMap[rowId] = row;
            });
            setSelectedRowMap(newSelectedRowMap);
            saveAudienceDraft(combinedData, allIds, source, file);
        }

        setFilterDialogOpen(false);
    };

    // Handle row selection change
    const handleRowSelectionModelChange = (newRowSelectionModel) => {
        // Ensure object format with Set
        let selectionModel;
        if (typeof newRowSelectionModel === 'object' && newRowSelectionModel?.ids instanceof Set) {
            selectionModel = newRowSelectionModel;
        } else if (Array.isArray(newRowSelectionModel)) {
            selectionModel = { type: 'include', ids: new Set(newRowSelectionModel) };
        } else {
            selectionModel = { type: 'include', ids: new Set() };
        }

        // Ensure ids is always a Set
        if (!selectionModel.ids || !(selectionModel.ids instanceof Set)) {
            selectionModel = { type: 'include', ids: new Set() };
        }

        setRowSelectionModel(selectionModel);

        const currentRows = source === 'crm'
            ? tableData.rows
            : excelData.rows;

        setSelectedRowMap((prev) => {
            const next = { ...prev };
            const selectedIdSet = selectionModel.ids;

            currentRows.forEach((row) => {
                const rowId = getAudienceRowId(row);
                if (!rowId) return;

                if (selectedIdSet.has(rowId)) {
                    next[rowId] = row;
                } else {
                    delete next[rowId];
                }
            });

            return next;
        });
    };

    const processDroppedExcelFile = async (excelFile) => {
        if (!excelFile) return;

        const fileExt = excelFile.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['xlsx', 'xls', 'csv'];

        if (!allowedExtensions.includes(fileExt)) {
            alert('Please upload only Excel (.xlsx, .xls) or CSV files');
            return;
        }

        if (excelFile.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit');
            return;
        }

        if (!fetchCampignId) {
            toast.error('Please select a campaign first');
            return;
        }

        // Open dialog first for better UX, then process upload
        setSource('excel');
        setFile(excelFile);
        setFilterDialogOpen(true);
        setIsDragging(false);

        const fileUpload = await ExcelImport(excelFile, userToken?.userId || userToken?.userid || userToken?.appuserid, fetchCampignId);
        if (fileUpload?.success) {
            toast.success(fileUpload?.message || 'File uploaded successfully');
            await fetchExcelData(fetchCampignId);
        } else {
            toast.error(fileUpload?.message || 'Failed to upload file');
        }
    };

    // Handle global drag & drop overlay
    const handleGlobalDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer?.types?.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleGlobalDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleGlobalDrop = async (e) => {
        // Outside drop box should not accept files
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    return (
        <>
            <div
                className="home_main_section"
                onDragOver={handleGlobalDragOver}
                onDragLeave={handleGlobalDragLeave}
                onDrop={handleGlobalDrop}
            >
                <Paper elevation={0} className={styles.content}>
                    {isDragging && (
                        <Box
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 1300,
                                backgroundColor: 'rgba(10, 20, 30, 0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(false);
                            }}
                        >
                            <Box
                                sx={{
                                    width: 'min(680px, 90vw)',
                                    minHeight: 260,
                                    border: '3px dashed #ffffff',
                                    borderRadius: 4,
                                    px: 6,
                                    py: 5,
                                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                                    backdropFilter: 'blur(4px)',
                                    textAlign: 'center',
                                    color: '#fff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1,
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const files = Array.from(e.dataTransfer.files || []);
                                    await processDroppedExcelFile(files[0]);
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                    Drop Excel/CSV file here
                                </Typography>
                                <Typography variant="body1" sx={{ opacity: 0.95 }}>
                                    Drop inside this box to upload
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    {source === 'crm' ? 'CRM will switch to Excel mode automatically' : 'Excel mode active'}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                    Supported: .xlsx, .xls, .csv (Max 10MB)
                                </Typography>
                            </Box>
                        </Box>
                    )}
                    {/* Data Grid - Hide when no data */}
                    <Box className={styles.gridBox}>
                        <Box className={styles.gridHeader} sx={{ justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                <Typography className={styles.gridTitle}>
                                    {source === 'crm' ? 'CRM Contacts' : 'Imported Contacts'}
                                </Typography>
                                {source === 'excel' && file && (
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        ({file.name})
                                    </Typography>
                                )}
                                {source === 'excel' && file && (
                                    <Typography variant="caption" sx={{ color: 'var(--secondary-color)' }}>
                                        Total: {excelData?.rows?.length || 0}
                                    </Typography>
                                )}
                                <Typography sx={{ color: 'var(--secondary-color)', fontSize: '0.875rem' }}>
                                    Selected: {selectedIds.length}
                                </Typography>
                                {/* Selected Branches Chips */}
                                {selectedBranches.length > 0 && (
                                    <Box sx={{ px: 2, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {selectedBranches.slice(0, 3).map((branch) => (
                                            <Chip
                                                key={branch.Number}
                                                label={branch.UFCC}
                                                size="small"
                                            />
                                        ))}
                                        {selectedBranches.length > 3 && (
                                            <Chip
                                                label={`+${selectedBranches.length - 3} more`}
                                                size="small"
                                            />
                                        )}
                                    </Box>
                                )}
                            </Box>
                            {source === 'crm' && (
                                <Button
                                    variant='contained'
                                    className='buttonClassname'
                                    size="small"
                                    startIcon={<Plus />}
                                    onClick={openSourceSelectionDialog}
                                >
                                    Add Audience
                                </Button>
                            )}
                            {source === 'excel' && (
                                <Button
                                    variant='contained'
                                    className='buttonClassname'
                                    size="small"
                                    startIcon={<Plus />}
                                    onClick={openSourceSelectionDialog}
                                >
                                    {file ? 'Filter Audience' : 'Add Audience'}
                                </Button>
                            )}
                        </Box>

                        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {filteredDataFromDialog && filteredDataFromDialog.length > 0 ? (
                                // Show filtered data from dialog
                                <AudienceGrid
                                    rows={filteredDataFromDialog}
                                    onRowSelectionModelChange={handleRowSelectionModelChange}
                                    rowSelectionModel={rowSelectionModel}
                                    onFilterClick={toggleFilterDialog}
                                    source={source}
                                    loading={false}
                                    rowCount={filteredDataFromDialog.length}
                                    paginationModel={paginationModel}
                                    onPaginationModelChange={handlePaginationModelChange}
                                    searchText={searchInput}
                                    onSearchChange={(value) => {
                                        setSearchInput(value);
                                        debounceSearch(value);
                                    }}
                                />
                            ) : (
                                // Show empty state with Add button
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '420px',
                                        border: '2px dashed var(--sidebar-borderColor)',
                                        borderRadius: '12px',
                                        backgroundColor: '#fcfcfd'
                                    }}
                                >
                                    <Typography variant="h6" sx={{ color: 'var(--secondary-color)', mb: 2 }}>
                                        {source === 'excel' && file ? 'Excel uploaded successfully' : 'No contacts selected'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--secondary-color)', mb: 3 }}>
                                        {source === 'crm'
                                            ? 'Click Add to filter and select contacts from CRM'
                                            : file
                                                ? `Excel has ${excelData?.rows?.length || 0} contacts. Click Filter Audience to select contacts.`
                                                : 'Upload Excel file to filter contacts'}
                                    </Typography>
                                    <Button
                                        variant='contained'
                                        className='buttonClassname'
                                        startIcon={<Plus />}
                                        onClick={openSourceSelectionDialog}
                                    >
                                        {source === 'crm' ? 'Add Audience' : file ? 'Filter Audience' : 'Upload Excel'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Paper>

                {/* Filter Selection Dialog */}
                <FilterSelectionDialog
                    open={filterDialogOpen}
                    onClose={toggleFilterDialog}
                    onContinue={handleFilterContinue}
                    filters={filters}
                    onFilterChange={handleApplyFilters}
                    userToken={userToken}
                    source={source}
                    excelData={excelData?.rows || []}
                    onFileUpload={async (file) => {
                        if (!file) {
                            setFile(null);
                            return;
                        }

                        setFile(file);
                        const fileUpload = await ExcelImport(file, userToken?.userId || userToken?.userid || userToken?.appuserid, fetchCampignId);
                        if (fileUpload?.success) {
                            toast.success(fileUpload?.message || 'File uploaded successfully');
                            await fetchExcelData(fetchCampignId);
                        } else {
                            toast.error(fileUpload?.message || 'Failed to upload file');
                        }
                    }}
                    uploadedFile={file}
                />

                <Dialog
                    open={sourceSelectionOpen}
                    onClose={closeSourceSelectionDialog}
                    maxWidth="md"
                    fullWidth
                    slotProps={{ paper: { className: styles.sourceSelectionDialogPaper } }}
                >
                    <Box className={styles.sourceSelectionDialogBody}>
                        <Typography className={styles.sourceSelectionTitle}>
                            Choose import source
                        </Typography>
                        <Typography className={styles.sourceSelectionSubtitle}>
                            Select where you want to import audience contacts from.
                        </Typography>
                        <IconButton
                            onClick={closeSourceSelectionDialog}
                            sx={{ position: 'absolute', top: 16, right: 16, '&:hover': { backgroundColor: '#f5f5f5', color: '#ff2727' } }}
                        >
                            <X size={20} />
                        </IconButton>

                        <Box className={styles.sourceCardGrid}>
                            <Box
                                className={`${styles.sourceCard} ${styles.crmSourceCard}`}
                                onClick={() => handleSourceSelection('crm')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSourceSelection('crm');
                                    }
                                }}
                            >
                                <Box className={styles.sourceIconWrap}>
                                    <Database size={22} />
                                </Box>
                                <Typography className={styles.sourceCardTitle}>Import from CRM</Typography>
                                <Typography className={styles.sourceCardDesc}>
                                    Use your CRM customer contacts and filter by group, branch, and profile data.
                                </Typography>
                            </Box>

                            <Box
                                className={`${styles.sourceCard} ${styles.excelSourceCard}`}
                                onClick={() => handleSourceSelection('excel')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSourceSelection('excel');
                                    }
                                }}
                            >
                                <Box className={styles.sourceIconWrap}>
                                    <FileSpreadsheet size={22} />
                                </Box>
                                <Typography className={styles.sourceCardTitle}>Import from Excel / CSV</Typography>
                                <Typography className={styles.sourceCardDesc}>
                                    Upload and use audience contacts from your spreadsheet file.
                                </Typography>
                            </Box>
                        </Box>
                        <Box className={styles.sampleDownloadWrap}>
                            <Typography className={styles.sampleDownloadText}>
                                Need a sample file?
                            </Typography>
                            <Button
                                component="a"
                                href={getStaticUrl('/sampleAud.xlsx')}
                                download="sample_audience.xlsx"
                                size="small"
                                startIcon={<Download size={16} />}
                                className={`varientTextBtn ${styles.sampleDownloadBtn}`}
                                sx={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', p: 0, minWidth: 'auto' }}
                            >
                                Download Sample
                            </Button>
                        </Box>
                    </Box>
                </Dialog>

            </div>
            <StepperNavigation
                currentStep={currentStep}
                steps={steps}
                onNext={handleNext}
                onPrevious={onPrevious}
                nextDisabled={isNextDisabled}
            />
        </>
    );
};

export default AudienceSection;
