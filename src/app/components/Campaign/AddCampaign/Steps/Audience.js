import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, Paper, Button, Chip, FormControl, InputLabel, Select, MenuItem, Dialog, IconButton, CircularProgress, TextField, InputAdornment, Checkbox } from '@mui/material';
import { Plus, Database, FileSpreadsheet, X, Trash2, Download, Search } from 'lucide-react';
import AudienceGrid from '../../Audience/AudienceGrid';
import FilterSelectionDialog from '../../Audience/FilterSelectionDialog';
import styles from '../AddCampaign.module.scss';
import { ExcelImport } from '../../../../api/UploadMedia';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { fetchExcelList } from '../../../../api/ExcelLists';
import { fetchCampaignDetails } from '../../../../api/FetchCampaignDetails';
import { fetchCampaignCustomerList } from '../../../../api/FetchCampaignCustomerList';
import { fetchTemplateMessages } from '../../../../api/TemplateMessages';
import { useAuthToken } from '../../../../hooks/useAuthToken';
import ConfirmationModal from '../../../ConfirmationModal/ConfirmationModal';
import { normalizeMobileNumber, getStaticUrl } from '../../../../utils/globalFunc';
import { getCampaignStepper, getAudienceDraft, setAudienceDraft } from '../../../../utils/storage';
import { extractAudienceFromResponse, mapAudienceData } from '../../utils/audienceMapper';

const sampleExcelFile = () => getStaticUrl('/sampleAud.xlsx');

const Audience = ({ onNext, onBack, onAudienceChange, onDataSourceChange, onFilterChange, showError, audienceError, customerFilters, audienceData, audienceGridData, isEditClone, campaignId, isRetargetFlow = false, retargetSourceCampaignId = null, retargetChatMsgStatus = null, retemplateData = {} }) => {
    const [source, setSource] = useState('crm');
    const [file, setFile] = useState(null);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [sourceSelectionOpen, setSourceSelectionOpen] = useState(false);
    const [filteredDataFromDialog, setFilteredDataFromDialog] = useState(null);
    const { userToken } = useAuthToken();
    const [filters, setFilters] = useState({
        companyName: null,
        companyType: null,
        state: null,
        city: null,
        country: null,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [removeDuplicateMobiles, setRemoveDuplicateMobiles] = useState(true);
    const [rowSelectionModel, setRowSelectionModel] = useState([]);
    const [selectedRowMap, setSelectedRowMap] = useState({});
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [retargetLoading, setRetargetLoading] = useState(false);
    const hasLoadedCustomersRef = useRef(false);

    const searchTimeoutRef = useRef(null);


    // Use pre-fetched audience data for retarget flow (audienceGridData is populated by handleRetarget)
    useEffect(() => {
        if (isRetargetFlow && !hasLoadedCustomersRef.current) {
            if (audienceGridData && audienceGridData.length > 0) {
                // Use pre-fetched data from handleRetarget — no duplicate API call
                const source = audienceGridData[0]?.Source || 'optigo';
                setSource(source === 'optigo' ? 'crm' : 'excel');
                onDataSourceChange(source === 'optigo' ? 'crm' : 'excel');

                setFilteredDataFromDialog(audienceGridData);
                const selectedIds = audienceGridData.map(row => row.CustomerId || row.MessageId || row.id);
                setRowSelectionModel(selectedIds);

                const rowMap = {};
                audienceGridData.forEach(row => {
                    const rowId = row.CustomerId || row.MessageId || row.id;
                    if (rowId) {
                        rowMap[rowId] = row;
                    }
                });
                setSelectedRowMap(rowMap);

                onAudienceChange(audienceGridData);
                hasLoadedCustomersRef.current = true;
            } else if (retargetSourceCampaignId) {
                // Fallback: fetch from broadcast_camp_temp if audienceGridData is empty
                const fetchRetargetAudience = async () => {
                    setRetargetLoading(true);
                    try {
                        toast.loading('Loading audience data...', { id: 'retarget-audience' });
                        const result = await fetchTemplateMessages(
                            userToken?.userId || userToken?.userid || userToken?.appuserid,
                            retargetSourceCampaignId,
                            retemplateData?.TemplateId,
                            retargetChatMsgStatus
                        );

                        if (result.success) {
                            const mappedAudience = mapAudienceData(result.messages);

                            if (mappedAudience.length > 0) {
                                const source = mappedAudience[0]?.Source || 'optigo';
                                setSource(source === 'optigo' ? 'crm' : 'excel');
                                onDataSourceChange(source === 'optigo' ? 'crm' : 'excel');

                                setFilteredDataFromDialog(mappedAudience);
                                const selectedIds = mappedAudience.map(row => row.CustomerId || row.MessageId || row.id);
                                setRowSelectionModel(selectedIds);

                                const rowMap = {};
                                mappedAudience.forEach(row => {
                                    const rowId = row.CustomerId || row.MessageId || row.id;
                                    if (rowId) {
                                        rowMap[rowId] = row;
                                    }
                                });
                                setSelectedRowMap(rowMap);

                                onAudienceChange(mappedAudience);
                            } else {
                                toast.error('No audience found for the selected status');
                            }
                        } else {
                            toast.error('Failed to load audience data');
                        }
                    } catch (error) {
                        console.error('Error fetching retarget audience:', error);
                        toast.error('Error loading audience data');
                    } finally {
                        toast.dismiss('retarget-audience');
                        hasLoadedCustomersRef.current = true;
                        setRetargetLoading(false);
                    }
                };
                fetchRetargetAudience();
            }
        }
    }, [isRetargetFlow, retargetSourceCampaignId, retargetChatMsgStatus, audienceGridData, retemplateData, userToken?.userId, userToken?.userid, userToken?.appuserid, onDataSourceChange, onAudienceChange]);

    // Handle audience data when editing/cloning
    useEffect(() => {
        if (!hasLoadedCustomersRef.current && !isRetargetFlow) {
            if (isEditClone && audienceGridData && audienceGridData.length > 0) {
                const source = audienceGridData[0]?.Source || 'optigo';
                setSource(source === 'optigo' ? 'crm' : 'excel');
                onDataSourceChange(source === 'optigo' ? 'crm' : 'excel');

                setFilteredDataFromDialog(audienceGridData);
                const selectedIds = audienceGridData.map(row => row.CustomerId || row.id);
                setRowSelectionModel(selectedIds);

                const rowMap = {};
                audienceGridData.forEach(row => {
                    const rowId = row.CustomerId || row.id;
                    if (rowId) {
                        rowMap[rowId] = row;
                    }
                });
                setSelectedRowMap(rowMap);

                if (customerFilters) {
                    setSelectedGroup(customerFilters.selectedGroup || null);
                    setSelectedBranches(customerFilters.selectedBranches || []);
                    setFilters(customerFilters.filters || {
                        companyName: null,
                        companyType: null,
                        state: null,
                        city: null,
                        country: null,
                    });
                    setSearchTerm(customerFilters.searchTerm || '');
                }

                hasLoadedCustomersRef.current = true;
            } else if (isEditClone && campaignId) {
                // Fallback: fetch from broadcast_customer_list if audienceGridData is empty
                const fetchEditCloneAudience = async () => {
                    setRetargetLoading(true);
                    try {
                        toast.loading('Loading audience data...', { id: 'editclone-audience' });
                        const result = await fetchCampaignCustomerList(
                            userToken?.userId || userToken?.userid || userToken?.appuserid,
                            campaignId
                        );

                        if (result.success) {
                            const mappedAudience = extractAudienceFromResponse(result.data);

                            if (mappedAudience.length > 0) {
                                const source = mappedAudience[0]?.Source || 'optigo';
                                setSource(source === 'optigo' ? 'crm' : 'excel');
                                onDataSourceChange(source === 'optigo' ? 'crm' : 'excel');

                                setFilteredDataFromDialog(mappedAudience);
                                const selectedIds = mappedAudience.map(row => row.CustomerId || row.id);
                                setRowSelectionModel(selectedIds);

                                const rowMap = {};
                                mappedAudience.forEach(row => {
                                    const rowId = row.CustomerId || row.id;
                                    if (rowId) {
                                        rowMap[rowId] = row;
                                    }
                                });
                                setSelectedRowMap(rowMap);

                                onAudienceChange(mappedAudience);
                            } else {
                                toast.error('No audience found for this campaign');
                            }
                        } else {
                            toast.error('Failed to load audience data');
                        }
                    } catch (error) {
                        console.error('Error fetching edit/clone audience:', error);
                        toast.error('Error loading audience data');
                    } finally {
                        toast.dismiss('editclone-audience');
                        hasLoadedCustomersRef.current = true;
                        setRetargetLoading(false);
                    }
                };
                fetchEditCloneAudience();
            }
        }
    }, [isEditClone, isRetargetFlow, audienceData, audienceGridData, customerFilters, campaignId, userToken?.userId, userToken?.userid, userToken?.appuserid, onDataSourceChange, onAudienceChange]);

    const debounceSearch = (value) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
        }, 200);
    };

    const [excelData, setExcelData] = useState({
        rows: [],
        loading: true
    });

    const fetchCampignId = campaignId || getCampaignStepper()?.selectedTemplates[0]?.campaignId;

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
            // draft already parsed by getAudienceDraft
            const draftRows = Array.isArray(draft?.rows) ? draft.rows : [];
            const draftSelectedIds = Array.isArray(draft?.selectedIds)
                ? draft.selectedIds
                : draftRows.map((row) => row?.CustomerId || row?.id).filter(Boolean);

            if (draft?.source) {
                setSource(draft.source);
            }

            if (draftRows.length > 0) {
                setFilteredDataFromDialog(draftRows);
                setRowSelectionModel(draftSelectedIds);

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
        return Array.isArray(rowSelectionModel) ? rowSelectionModel : [];
    }, [rowSelectionModel]);

    const getMobileValue = (row) => {
        const fields = ['CustomerPhone', 'PhoneNo', 'MobileNo', 'mobileNo', 'Mobile', 'mobile', 'phone', 'phoneno'];
        for (const field of fields) {
            if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                return normalizeMobileNumber(String(row[field]));
            }
        }
        return '';
    };

    const dedupeStats = useMemo(() => {
        if (!removeDuplicateMobiles || !filteredDataFromDialog) {
            return { rows: filteredDataFromDialog || [], duplicateRowsRemoved: 0, duplicateNumbersCount: 0 };
        }

        const seenMobiles = new Set();
        const duplicateMobileNumbers = new Set();
        const uniqueRows = [];
        let duplicateRowsRemoved = 0;

        filteredDataFromDialog.forEach((row) => {
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
    }, [filteredDataFromDialog, removeDuplicateMobiles]);

    const rowSelectionData = useMemo(() => {
        const dedupedIds = new Set(dedupeStats.rows.map((r) => r.CustomerId || r.id));
        return selectedIds
            .map((id) => selectedRowMap[id])
            .filter(Boolean)
            .filter((row) => dedupedIds.has(row.CustomerId || row.id));
    }, [selectedIds, selectedRowMap, dedupeStats.rows]);

    const handleApplyFilters = (newFilters) => {
        setFilters({
            companyName: newFilters.companyName?.companyname || null,
            companyType: newFilters.companyType?.businessclassname || null,
            state: newFilters.state?.StateName || null,
            city: newFilters.city?.City || null,
            country: newFilters.country?.CountryName || null,
        });
    };

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
        }
    };

    const handleNext = () => {
        const audience = rowSelectionData
            .map(item => {
                const phone = normalizeMobileNumber(item.CustomerPhone || item.PhoneNo || item.phone);
                return {
                    customerId: item.CustomerId,
                    phone: phone
                };
            })
            .filter(item => item.phone.length > 0);

        const selectedIdsToPersist = rowSelectionData
            .map((row) => row?.CustomerId || row?.id)
            .filter((id) => id !== undefined && id !== null);
        saveAudienceDraft(rowSelectionData, selectedIdsToPersist, source, file);

        if (onAudienceChange) {
            onAudienceChange(audience);
        }
        if (onDataSourceChange) {
            onDataSourceChange(source === "crm" ? "optigo" : "excel");
        }
        onNext();
    };

    const handleGridSearchChange = useCallback((value) => {
        setSearchInput(value);
        debounceSearch(value);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFileUploadForDialog = useCallback(async (uploadedFile) => {
        if (!uploadedFile) {
            setFile(null);
            return;
        }
        setFile(uploadedFile);
        const fileUpload = await ExcelImport(uploadedFile, userToken?.userId || userToken?.userid || userToken?.appuserid, fetchCampignId);
        if (fileUpload?.success) {
            toast.success(fileUpload?.message || 'File uploaded successfully');
            await fetchExcelData(fetchCampignId);
        } else {
            toast.error(fileUpload?.message || 'Failed to upload file');
        }
    }, [userToken?.userId, userToken?.userid, userToken?.appuserid, fetchCampignId]); // eslint-disable-line react-hooks/exhaustive-deps

    const isNextDisabled = rowSelectionData.length === 0;

    const toggleFilterDialog = useCallback(() => {
        setFilterDialogOpen(prev => !prev);
    }, []);

    const openSourceSelectionDialog = useCallback(() => {
        setSourceSelectionOpen(true);
    }, []);

    const closeSourceSelectionDialog = useCallback(() => {
        setSourceSelectionOpen(false);
    }, []);

    const handleSourceSelection = useCallback((selectedSource) => {
        setSource(selectedSource);
        setSourceSelectionOpen(false);
        setFilterDialogOpen(true);
    }, []);

    const handleFilterContinue = (data) => {
        if (data?.source && data.source !== source) {
            setSource(data.source);
        }

        setFilters(data.filters);
        setSearchTerm(data.searchTerm);
        setSelectedBranches(data.selectedBranches || []);
        setSelectedGroup(data.selectedGroup || null);

        // Pass filter data to parent
        if (onFilterChange) {
            onFilterChange({
                filters: data.filters,
                searchTerm: data.searchTerm,
                selectedBranches: data.selectedBranches || [],
                selectedGroup: data.selectedGroup || null,
            });
        }

        const selectedIds = Array.isArray(data.selectedIds) ? data.selectedIds : [];

        const selectedRows = (data.gridData || []).filter(row => {
            const rowId = row.CustomerId || row.id;
            return selectedIds.includes(rowId);
        });

        if (data.mode === 'replace') {
            setFilteredDataFromDialog(selectedRows);
            setRowSelectionModel(selectedIds);

            const newSelectedRowMap = {};
            selectedRows.forEach(row => {
                const rowId = row.CustomerId || row.id;
                newSelectedRowMap[rowId] = row;
            });
            setSelectedRowMap(newSelectedRowMap);
            saveAudienceDraft(selectedRows, selectedIds, source, file);
        } else {
            const existingData = filteredDataFromDialog || [];
            const combinedData = [...existingData];
            selectedRows.forEach(newRow => {
                const rowId = newRow.CustomerId || newRow.id;
                if (!combinedData.some(row => (row.CustomerId || row.id) === rowId)) {
                    combinedData.push(newRow);
                }
            });

            setFilteredDataFromDialog(combinedData);

            const allIds = combinedData.map(row => row.CustomerId || row.id);
            setRowSelectionModel(allIds);

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

    const handleRowSelectionModelChange = useCallback((model) => {
        setRowSelectionModel(model);
        onAudienceChange(model);
    }, [onAudienceChange]);

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

    const dragCounterRef = useRef(0);

    // Full-page drag & drop listeners
    useEffect(() => {
        const handleDragEnter = (e) => {
            if (!e.dataTransfer?.types?.includes('Files')) return;
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current += 1;
            setIsDragging(true);
        };
        const handleDragOver = (e) => {
            if (!e.dataTransfer?.types?.includes('Files')) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragging(true);
        };
        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current -= 1;
            if (dragCounterRef.current <= 0) {
                dragCounterRef.current = 0;
                setIsDragging(false);
            }
        };
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current = 0;
            setIsDragging(false);
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    // Handlers moved to window-level useEffect above for full-page drag & drop

    const handleClearAudience = () => {
        setClearConfirmOpen(true);
    };

    const handleClearConfirm = () => {
        const idsToRemove = new Set(Array.isArray(rowSelectionModel) ? rowSelectionModel : []);

        const remainingRows = (filteredDataFromDialog || []).filter((row) => {
            const rowId = row?.CustomerId || row?.id;
            return !idsToRemove.has(rowId);
        });

        setFilteredDataFromDialog(remainingRows.length > 0 ? remainingRows : null);

        setSelectedRowMap((prev) => {
            if (!prev) return prev;
            const updated = { ...prev };
            idsToRemove.forEach((id) => delete updated[id]);
            return updated;
        });

        setRowSelectionModel([]);
        setSelectedBranches([]);
        setSelectedGroup(null);
        setClearConfirmOpen(false);
        onAudienceChange(remainingRows);
        toast.success(`Cleared ${idsToRemove.size} selected rows`);
    };

    const handleDeleteRow = useCallback((row) => {
        const rowId = row?.CustomerId || row?.id;
        if (!rowId) return;

        setFilteredDataFromDialog((prev) => {
            if (!prev) return prev;
            const updated = prev.filter((r) => (r?.CustomerId || r?.id) !== rowId);
            return updated.length > 0 ? updated : null;
        });

        setRowSelectionModel((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.filter((id) => id !== rowId);
        });

        setSelectedRowMap((prev) => {
            if (!prev) return prev;
            const updated = { ...prev };
            delete updated[rowId];
            return updated;
        });

        onAudienceChange((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.filter((r) => (r?.CustomerId || r?.id) !== rowId);
        });

        toast.success('Contact removed');
    }, [onAudienceChange]);

    const handleExport = useCallback(() => {
        if (!rowSelectionData || rowSelectionData.length === 0) {
            toast.error('No selected rows to export');
            return;
        }

        const exportColumns = [
            { header: 'Customer Name', field: 'CustomerName' },
            { header: 'Email', field: 'CustomerEmail' },
            { header: 'Phone', field: 'CustomerPhone' },
            { header: 'Company', field: 'CustomerCode' },
            { header: 'Type', field: 'CompanyType' },
            { header: 'Country Code', field: 'CountryCode' },
            { header: 'Country', field: 'Country' },
            { header: 'State', field: 'State' },
            { header: 'City', field: 'City' },
        ];

        const headers = exportColumns.map((col) => col.header);

        const rows = rowSelectionData.map((row) => {
            const obj = {};
            exportColumns.forEach((col) => {
                let val = row[col.field];
                if (col.field === 'CustomerName') {
                    val = row.CustomerName || '—';
                } else if (col.field === 'CustomerPhone') {
                    val = row.CustomerPhone || row.PhoneNo || '—';
                } else if (col.field === 'CustomerEmail') {
                    val = row.CustomerEmail || row.Email || '—';
                } else if (col.field === 'CustomerCode') {
                    val = row.CustomerCode || row.Company || '—';
                } else if (col.field === 'CompanyType') {
                    val = row.CompanyType || row.CustomerType || '—';
                } else if (!val) {
                    val = '—';
                }
                obj[col.header] = val;
            });
            return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Audience');

        const filename = `Audience_${source || 'data'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, filename);
        toast.success(`Exported ${rowSelectionData.length} selected rows to Excel`);
    }, [rowSelectionData, source]);

    return (
        <div className={styles.formCard}>
            <div className={styles.audienceContainer}>
                {isDragging && (
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9999,
                            backgroundColor: 'rgba(29, 170, 97, 0.08)',
                            backdropFilter: 'blur(2px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'opacity 0.2s ease',
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dragCounterRef.current = 0;
                            setIsDragging(false);
                        }}
                    >
                        <Box
                            sx={{
                                width: 'min(560px, 86vw)',
                                minHeight: 280,
                                border: '3px dashed var(--primary-main)',
                                borderRadius: '20px',
                                px: 6,
                                py: 6,
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                boxShadow: '0 20px 60px rgba(29, 170, 97, 0.20), 0 8px 24px rgba(0,0,0,0.08)',
                                textAlign: 'center',
                                color: 'var(--title-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                animation: 'dragPulse 1.6s ease-in-out infinite',
                                '@keyframes dragPulse': {
                                    '0%, 100%': { transform: 'scale(1)', boxShadow: '0 20px 60px rgba(29, 170, 97, 0.20), 0 8px 24px rgba(0,0,0,0.08)' },
                                    '50%': { transform: 'scale(1.02)', boxShadow: '0 24px 72px rgba(29, 170, 97, 0.30), 0 12px 32px rgba(0,0,0,0.10)' },
                                },
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragCounterRef.current = 0;
                                setIsDragging(false);
                                const files = Array.from(e.dataTransfer.files || []);
                                if (files[0]) await processDroppedExcelFile(files[0]);
                            }}
                        >
                            <Box
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(29, 170, 97, 0.10)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 1,
                                    animation: 'dropBounce 1.2s ease-in-out infinite',
                                    '@keyframes dropBounce': {
                                        '0%, 100%': { transform: 'translateY(0)' },
                                        '50%': { transform: 'translateY(-10px)' },
                                    },
                                }}
                            >
                                <FileSpreadsheet size={34} color="var(--primary-main)" />
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--title-color)', mb: 0.5 }}>
                                Drop file to upload
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'var(--text-2nd-color)', fontWeight: 500 }}>
                                Excel / CSV files accepted
                            </Typography>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    mt: 1.5,
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(29, 170, 97, 0.08)',
                                    color: 'var(--primary-main)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                }}
                            >
                                <span>Max 10MB</span>
                                <span>·</span>
                                <span>.xlsx .xls .csv</span>
                            </Box>
                        </Box>
                    </Box>
                )}

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
                                Selected: {rowSelectionData.length} {rowSelectionData.length === 1 ? 'row' : 'rows'}
                            </Typography>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
                            {filteredDataFromDialog && filteredDataFromDialog.length > 0 && (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', whiteSpace: 'nowrap' }}>
                                            Remove duplicates
                                        </Typography>
                                        <Checkbox
                                            checked={removeDuplicateMobiles}
                                            onChange={(e) => setRemoveDuplicateMobiles(e.target.checked)}
                                            size="small"
                                        />
                                    </Box>
                                    {removeDuplicateMobiles && dedupeStats.duplicateRowsRemoved > 0 && (
                                        <Typography variant="caption" sx={{ color: 'var(--secondary-color)', whiteSpace: 'nowrap' }}>
                                            {dedupeStats.duplicateRowsRemoved} removed
                                        </Typography>
                                    )}
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        placeholder="Search..."
                                        value={searchInput}
                                        onChange={(e) => handleGridSearchChange(e.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Search size={16} style={{ color: 'rgba(125,127,133,0.6)' }} />
                                                    </InputAdornment>
                                                ),
                                                sx: {
                                                    height: 40,
                                                    borderRadius: '16px',
                                                    backgroundColor: '#fff',
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c4c8d0', borderWidth: '1.5px' },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary-main)', borderWidth: 2 },
                                                },
                                            },
                                        }}
                                        sx={{ width: { xs: '100%', md: 220 }, mr: { md: 1 } }}
                                    />
                                </>
                            )}
                            {/* {isRetargetFlow && (
                                <FormControl size="small" sx={{ minWidth: 170 }}>
                                    <InputLabel id="retarget-status-label">Retarget Status</InputLabel>
                                    <Select
                                        labelId="retarget-status-label"
                                        value={retargetStatus || 'Overall'}
                                        label="Retarget Status"
                                        onChange={(e) => onRetargetStatusChange?.(e.target.value)}
                                    >
                                        {retargetStatusOptions.map((statusOption) => (
                                            <MenuItem key={statusOption} value={statusOption}>{statusOption}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )} */}
                            {filteredDataFromDialog && filteredDataFromDialog.length > 0 && (
                                <>
                                    <Button
                                        variant='outlined'
                                        size="small"
                                        startIcon={<Download size={16} />}
                                        onClick={handleExport}
                                        sx={{ mr: 1 }}
                                        className='varientOutlinedBtn'
                                        disabled={rowSelectionData.length === 0}
                                    >
                                        Export Selected
                                    </Button>
                                    <Button
                                        variant='contained'
                                        color='error'
                                        size="small"
                                        startIcon={<Trash2 size={16} />}
                                        onClick={handleClearAudience}
                                        sx={{ mr: 1 }}
                                        className='dangerbtnClassName'
                                        disabled={rowSelectionData.length === 0}
                                    >
                                        Clear Selected
                                    </Button>
                                </>
                            )}
                            <Button
                                variant='contained'
                                className='buttonClassname'
                                size="small"
                                startIcon={<Plus />}
                                onClick={openSourceSelectionDialog}
                            >
                                Add Audience
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ width: '100%', overflow: { xs: 'auto', md: 'hidden' }, height: { xs: '340px', sm: '380px', md: '100%' }, maxHeight: { xs: '340px', sm: '380px', md: '520px' }, flex: { md: 1 }, minHeight: 0 }}>
                        {dedupeStats.rows && dedupeStats.rows.length > 0 ? (
                            <AudienceGrid
                                rows={dedupeStats.rows}
                                onRowSelectionModelChange={handleRowSelectionModelChange}
                                rowSelectionModel={rowSelectionModel}
                                onFilterClick={toggleFilterDialog}
                                source={source}
                                loading={retargetLoading}
                                searchText={searchInput}
                                onSearchChange={handleGridSearchChange}
                                onDelete={handleDeleteRow}
                                selectedRows={rowSelectionData}
                            />
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    minHeight: { xs: 0, md: 300 },
                                    border: '2px dashed var(--sidebar-borderColor)',
                                    borderRadius: '12px',
                                    backgroundColor: '#fcfcfd'
                                }}
                            >
                                {retargetLoading ? (
                                    <>
                                        <CircularProgress size={32} sx={{ mb: 2, color: 'var(--primary-color)' }} />
                                        <Typography variant="h6" sx={{ color: 'var(--secondary-color)', mb: 1 }}>
                                            Loading contacts...
                                        </Typography>
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}
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

                        {audienceError && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'var(--error-light-bg)', borderRadius: '8px', border: '1px solid var(--error-main)' }}>
                                <Typography sx={{ color: 'var(--error-main)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Audience selection is required. Please add audience members before proceeding.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                <FilterSelectionDialog
                    open={filterDialogOpen}
                    onClose={toggleFilterDialog}
                    onContinue={handleFilterContinue}
                    filters={filters}
                    onFilterChange={handleApplyFilters}
                    userToken={userToken}
                    source={source}
                    excelData={excelData}
                    onFileUpload={handleFileUploadForDialog}
                    uploadedFile={file}
                    preSelectedData={filteredDataFromDialog}
                    preSelectedBranches={selectedBranches}
                    preSelectedGroup={selectedGroup}
                />

                <ConfirmationModal
                    isOpen={clearConfirmOpen}
                    onClose={() => setClearConfirmOpen(false)}
                    onConfirm={handleClearConfirm}
                    title="Clear Audience"
                    description={`Are you sure you want to remove ${rowSelectionData.length} selected ${rowSelectionData.length === 1 ? 'contact' : 'contacts'} from the audience? This action cannot be undone.`}
                    icon={Trash2}
                    isDanger={true}
                    confirmLabel="Clear"
                    cancelLabel="Cancel"
                />

                <Dialog
                    open={sourceSelectionOpen}
                    onClose={closeSourceSelectionDialog}
                    fullWidth
                    keepMounted
                    maxWidth="md"
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
                                href={sampleExcelFile()}
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

            {/* Action Buttons */}
            <div className={styles.formActions}>
                <Button className='varientOutlinedBtn' onClick={onBack}>
                    Back
                </Button>
                <Button className='buttonClassname' onClick={handleNext} disabled={isNextDisabled}>
                    Next
                </Button>
            </div>
        </div>
    );
};

export default Audience;
