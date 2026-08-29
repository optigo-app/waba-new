import React, { useState, useEffect } from 'react';
import { setCampaignDraft } from '../../../utils/storage';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Grid,
    Typography,
    Paper,
    Button,
    IconButton as MuiIconButton,
    Tooltip,
    Skeleton,
    Breadcrumbs,
    Link,
    Pagination as MuiPagination,
    Chip,
    TextField,
    InputAdornment,
    Popover
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
    RefreshCw,
    Download,
    CheckCircle,
    Send,
    MessageSquare,
    Eye,
    MessageCircle,
    AlertCircle,
    LayoutDashboard,
    FileText,
    ChevronRight,
    ArrowLeft,
    Clock,
    UserCheck,
    Users,
    Hash,
    Play,
    Megaphone,
    Target,
    ChevronLeft,
    Search as SearchIcon,
    X as CloseIcon,
    SlidersHorizontal
} from 'lucide-react';
import { fetchQuickReport } from '../../../api/QuickReport';
import { fetchTemplateMessages } from '../../../api/TemplateMessages';
import { fetchCampaignDetails } from '../../../api/FetchCampaignDetails';
import { extractAudienceFromResponse, mapAudienceData } from '../utils/audienceMapper';
import { useAuthToken } from '../../../hooks/useAuthToken';
import ConfirmationModal from '../../ConfirmationModal/ConfirmationModal';
import toast from 'react-hot-toast';
import styles from './CampaignReport.module.scss';
import { formatDate, getMessageStatus, normalizePhoneNumber } from '../../../utils/globalFunc';
import * as XLSX from 'xlsx';

const REPORT_STEPS = [
    { id: 'overview', label: 'Campaign Overview', icon: LayoutDashboard, step: 1 },
    { id: 'template', label: 'Template', icon: FileText, step: 2 },
];

const CampaignReport = () => {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const channelId = searchParams?.get('channelId') || '';
    const { userToken } = useAuthToken();
    const userId = userToken?.userId || userToken?.userid || userToken?.appuserid || '';
    const [loading, setLoading] = useState(true);
    const [quickReportData, setQuickReportData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [statFilter, setStatFilter] = useState('Overall');
    const [showExportModal, setShowExportModal] = useState(false);
    const [templateMessages, setTemplateMessages] = useState([]);
    const [templateMessagesLoading, setTemplateMessagesLoading] = useState(false);
    const [templateStats, setTemplateStats] = useState(null);
    const [templateSearchText, setTemplateSearchText] = useState('');
    const [selectedTemplateRowSelectionModel, setSelectedTemplateRowSelectionModel] = useState({
        type: 'include',
        ids: new Set()
    });
    const [retargetMenuAnchor, setRetargetMenuAnchor] = useState(null);
    const [headerMenuAnchor, setHeaderMenuAnchor] = useState(null);

    const normalizeSelectionModel = (selectionModel) => {
        if (!selectionModel) return { type: 'include', ids: new Set() };
        if (Array.isArray(selectionModel)) {
            return { type: 'include', ids: new Set(selectionModel) };
        }
        if (selectionModel?.ids instanceof Set) {
            return {
                type: selectionModel.type || 'include',
                ids: new Set(selectionModel.ids)
            };
        }
        if (Array.isArray(selectionModel?.ids)) {
            return {
                type: selectionModel.type || 'include',
                ids: new Set(selectionModel.ids)
            };
        }
        return { type: 'include', ids: new Set() };
    };

    const selectedTemplateCount = selectedTemplateRowSelectionModel.type === 'exclude'
        ? Math.max(0, templateMessages.length - selectedTemplateRowSelectionModel.ids.size)
        : selectedTemplateRowSelectionModel.ids.size;

    const isTemplateRowSelected = (rowId) => {
        if (selectedTemplateRowSelectionModel.type === 'exclude') {
            return !selectedTemplateRowSelectionModel.ids.has(rowId);
        }
        return selectedTemplateRowSelectionModel.ids.has(rowId);
    };

    const getChatMsgStatusFromFilter = (filter) => {
        if (filter === 'Sent') return 1;
        if (filter === 'Delivered') return 2;
        if (filter === 'Read') return 3;
        if (filter === 'Failed') return 4;
        if (filter === 'Replied') return 8;
        return null;
    };

    const getTemplateMessageColumns = (filter) => {
        const baseColumns = [
            {
                field: 'TemplateName',
                headerName: 'Template Name',
                flex: 1,
                minWidth: 140,
                renderCell: (params) => (
                    <Typography variant="body2">
                        {params.value || '—'}
                    </Typography>
                )
            },
            {
                field: 'CustomerName',
                headerName: 'Customer Name',
                flex: 1,
                minWidth: 140,
                renderCell: (params) => (
                    <Typography variant="body2">
                        {params.value || `${params.row.FirstName || ''} ${params.row.LastName || ''}`.trim() || '—'}
                    </Typography>
                )
            },
            {
                field: 'PhoneNo',
                headerName: 'Phone No',
                flex: 1,
                minWidth: 120,
                renderCell: (params) => (
                    <Typography variant="body2" className={styles.userPhone}>
                        {params.value || '—'}
                    </Typography>
                )
            }
        ];

        const statusColumn = {
            field: 'Status',
            headerName: 'Status',
            width: 120,
            minWidth: 120,
            renderCell: (params) => {
                const statusConfig = getMessageStatus(params.value);
                return (
                    <Chip
                        label={statusConfig.label}
                        size="small"
                        sx={{
                            backgroundColor: `${statusConfig.color}20`,
                            color: statusConfig.color,
                            fontSize: '0.72rem',
                            height: '22px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}
                    />
                );
            }
        };

        const sentAtColumn = {
            field: 'SentAt',
            headerName: 'Sent At',
            width: 180,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="body2">
                    {formatDate(params.value) || '—'}
                </Typography>
            )
        };

        const deliveredAtColumn = {
            field: 'DeliveredAt',
            headerName: 'Delivered At',
            width: 180,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="body2">
                    {formatDate(params.value) || '—'}
                </Typography>
            )
        };

        const readAtColumn = {
            field: 'ReadAt',
            headerName: 'Read At',
            width: 180,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="body2">
                    {formatDate(params.value) || '—'}
                </Typography>
            )
        };

        const failedAtColumn = {
            field: 'FailedAt',
            headerName: 'Failed At',
            width: 180,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="body2">
                    {formatDate(params.value) || '—'}
                </Typography>
            )
        };

        const errorColumn = {
            field: 'FailedReson',
            headerName: 'Error',
            width: 300,
            minWidth: 200,
            renderCell: (params) => {
                const errorValue = params.value;
                if (!errorValue) return <Typography variant="body2">—</Typography>;
                
                // Try to parse JSON error
                let errorMessage = errorValue;
                try {
                    const parsed = JSON.parse(errorValue);
                    if (parsed.message) {
                        errorMessage = parsed.message;
                    }
                } catch (e) {
                    // Not JSON, use as-is
                }
                
                return (
                    <Typography
                        variant="body2"
                        sx={{
                            width: '100%',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.4
                        }}
                    >
                        {errorMessage}
                    </Typography>
                );
            }
        };

        const repliedAtColumn = {
            field: 'RepliedAt',
            headerName: 'Replied At',
            width: 180,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="body2">
                    {formatDate(params.value) || '—'}
                </Typography>
            )
        };

        const replyColumn = {
            field: 'ReplyMessage',
            headerName: 'Reply',
            width: 250,
            minWidth: 150,
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    sx={{
                        width: '100%',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.4
                    }}
                >
                    {params.value || '—'}
                </Typography>
            )
        };

        switch (filter) {
            case 'Overall':
                return [...baseColumns, statusColumn];
            case 'Sent':
                return [...baseColumns, sentAtColumn];
            case 'Delivered':
                return [...baseColumns, sentAtColumn, deliveredAtColumn];
            case 'Read':
                return [...baseColumns, sentAtColumn, deliveredAtColumn, readAtColumn];
            case 'Replied':
                return [...baseColumns, sentAtColumn, deliveredAtColumn, readAtColumn, repliedAtColumn, replyColumn];
            case 'Failed':
                return [...baseColumns, failedAtColumn, errorColumn];
            default:
                return [...baseColumns, statusColumn];
        }
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            const quickReportResult = await fetchQuickReport(userId, id, channelId);
            if (quickReportResult.success && quickReportResult.data) {
                setQuickReportData(...quickReportResult.data?.rd);
            } else {
                console.log('Quick Report failed or no data');
            }
        } catch (error) {
            console.error('Error loading report:', error);
            toast.error('Error loading report data');
        } finally {
            setLoading(false);
        }
    };

    const handleRetarget = async () => {
        try {
            toast.loading('Preparing retarget campaign...', { id: 'retarget-campaign' });

            const statusLabel = statFilter || 'Overall';
            const chatMsgStatus = getChatMsgStatusFromFilter(statFilter);
            const templateId = quickReportData?.TemplateId || null;

            // Single call with templateId and chatMsgStatus — gets rd (campaign), rd1 (template), rd3 (audience)
            const detailsResult = await fetchCampaignDetails(userId, id, chatMsgStatus, templateId);
            if (!detailsResult.success || !detailsResult.data?.rd?.length) {
                toast.error('Failed to load campaign details');
                return;
            }

            const templateData = detailsResult.data?.rd1?.[0];
            const templateName = templateData?.TemplateName || 'Template';
            const sourceCampaignName = quickReportData?.CampaignName || detailsResult.data.rd[0]?.CampaignName || detailsResult.data.rd[0]?.Name || `Campaign ${id}`;

            // Audience for retarget comes from templateMessages (broadcast_camp_temp),
            // falling back to broadcast_camp_details audience if template messages are empty
            const mappedAudience = templateMessages.length > 0
                ? mapAudienceData(templateMessages)
                : extractAudienceFromResponse(detailsResult.data);
            
            const campaignData = {
                ...detailsResult.data.rd[0],
                Name: `retarget-${sourceCampaignName}-${statusLabel}`,
                templateData,
                audienceData: mappedAudience,
                isClone: true,
                isRetarget: true,
                RetargetSourceCampaignName: sourceCampaignName,
                RetargetStatusLabel: statusLabel,
                RetargetTemplateName: templateName,
                RetargetSourceCampaignId: id,
                RetargetChatMsgStatus: chatMsgStatus,
            };

            setCampaignDraft(campaignData);
            router.push('/campaign/create');
            toast.success('Retarget campaign flow started');
        } catch (error) {
            console.error('Error starting retarget flow:', error);
            toast.error('Failed to start retarget flow');
        } finally {
            toast.dismiss('retarget-campaign');
        }
    };

    const loadTemplateMessages = async () => {
        setTemplateMessagesLoading(true);
        try {
            const result = await fetchTemplateMessages(
                userToken?.userId || userToken?.userid || userToken?.appuserid,
                id,
                quickReportData?.TemplateId || 1,
                getChatMsgStatusFromFilter(statFilter)
            );

            if (result.success) {
                setTemplateStats(result.stats);
                setTemplateMessages(result.messages);
                setSelectedTemplateRowSelectionModel({ type: 'exclude', ids: new Set() });
            } else {
                setTemplateStats(null);
                setTemplateMessages([]);
                setSelectedTemplateRowSelectionModel({ type: 'include', ids: new Set() });
            }
        } catch (error) {
            console.error('Error loading template messages:', error);
            toast.error('Error loading template messages');
        } finally {
            setTemplateMessagesLoading(false);
        }
    };

    useEffect(() => {
        if (id && userId) {
            loadReport();
        }
    }, [id, userId, channelId]);

    useEffect(() => {
        if (activeTab === 'template' && quickReportData && userId) {
            loadTemplateMessages();
        }
    }, [activeTab, statFilter, quickReportData?.TemplateId]);

    const filteredTemplateMessages = React.useMemo(() => {
        if (!templateSearchText.trim()) return templateMessages;
        const q = templateSearchText.trim().toLowerCase();
        return templateMessages.filter((row) => {
            const searchBlob = [
                row.TemplateName,
                row.CustomerName,
                row.FirstName,
                row.LastName,
                row.PhoneNo,
                row.Status,
                row.FailedReson,
                row.ReplyMessage,
            ].filter(Boolean).join(' ').toLowerCase();

            const rawMobile = (row.PhoneNo || '').toString();
            const digitsOnly = rawMobile.replace(/\D/g, '');
            const normalizedPhone = normalizePhoneNumber(rawMobile);
            const phoneVariants = [];
            if (digitsOnly) phoneVariants.push(digitsOnly);
            if (normalizedPhone) {
                phoneVariants.push(normalizedPhone);
                if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
                    phoneVariants.push(normalizedPhone.slice(2));
                }
            }

            const fullSearchBlob = searchBlob + ' ' + phoneVariants.join(' ');
            return fullSearchBlob.includes(q);
        });
    }, [templateMessages, templateSearchText]);

    const handleExport = () => {
        if (!templateMessages || templateMessages.length === 0) {
            toast.error('No data to export');
            return;
        }
        setShowExportModal(true);
    };

    const handleExportConfirm = () => {
        try {
            const columns = getTemplateMessageColumns(statFilter);
            const headers = columns.map((col) => col.headerName);

            const extractValue = (row, col) => {
                const field = col.field;
                if (field === 'CustomerName') {
                    return row.CustomerName || `${row.FirstName || ''} ${row.LastName || ''}`.trim() || '—';
                }
                if (field === 'Status') {
                    const statusConfig = getMessageStatus(row.Status);
                    return statusConfig?.label || 'Unknown';
                }
                if (field === 'SentAt') return formatDate(row.SentAt) || '—';
                if (field === 'DeliveredAt') return formatDate(row.DeliveredAt) || '—';
                if (field === 'ReadAt') return formatDate(row.ReadAt) || '—';
                if (field === 'FailedAt') return formatDate(row.FailedAt) || '—';
                if (field === 'RepliedAt') return formatDate(row.RepliedAt) || '—';
                if (field === 'FailedReson') {
                    const errorValue = row.FailedReson;
                    if (!errorValue) return '—';
                    try {
                        const parsed = JSON.parse(errorValue);
                        return parsed.message || errorValue;
                    } catch { return errorValue; }
                }
                if (field === 'ReplyMessage') return row.ReplyMessage || '—';
                return row[field] || '—';
            };

            const rows = templateMessages.map((row) => {
                const obj = {};
                columns.forEach((col) => {
                    obj[col.headerName] = extractValue(row, col);
                });
                return obj;
            });

            const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Messages');

            const campaignName = quickReportData?.CampaignName || `Campaign-${id}`;
            const filename = `${campaignName}_${statFilter}_report.xlsx`;
            XLSX.writeFile(workbook, filename);

            toast.success(`Exported ${templateMessages.length} rows to Excel`);
            setShowExportModal(false);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report');
            setShowExportModal(false);
        }
    };

    if (loading) {
        return (
            <Box className={styles.page}>
                {/* ── Page Header Skeleton ── */}
                <div className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                        <div className={styles.headerIconWrap}>
                            <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                        </div>
                        <div>
                            <Skeleton variant="text" width={150} height={28} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                            <Skeleton variant="text" width={200} height={16} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                        <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                    </div>
                </div>

                {/* ── Main Content Skeleton ── */}
                <div className={styles.mainContent}>
                    {/* Left Sidebar Skeleton */}
                    <div className={styles.leftSidebar}>
                        <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: '14px', bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                    </div>

                    {/* Right Content Skeleton */}
                    <div className={styles.rightContent}>
                        <Box className={styles.scrollArea}>
                            {/* Quick Report Metrics Skeleton */}
                            <Box className={styles.section}>
                                <Skeleton variant="text" width={120} height={24} sx={{ mb: 2, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                <Grid container spacing={2}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Grid size={{ xs: 12, sm: 4, md: 2 }} key={i}>
                                            <Box className={styles.metricCard}>
                                                <Skeleton variant="circular" width={44} height={44} sx={{ mb: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                                <Skeleton variant="text" width={60} height={16} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                                <Skeleton variant="text" width={80} height={24} sx={{ mt: 0.5, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Campaign Overview Details Skeleton */}
                            <Box className={styles.section}>
                                <Skeleton variant="text" width={180} height={24} sx={{ mb: 2, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                <Grid container spacing={2}>
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                                            <Box sx={{
                                                padding: '1rem 1.1rem',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: '#fafbfc',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box>
                                                    <Skeleton variant="text" width={100} height={16} sx={{ mb: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                                    <Skeleton variant="text" width={120} height={20} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                                </Box>
                                                <Skeleton variant="circular" width={36} height={36} sx={{ position: 'absolute', right: 12, top: 12, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Segmented Progress Stats Skeleton */}
                            <Box className={styles.section}>
                                <Grid container spacing={2}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Grid size={{ xs: 12, sm: 4, md: 2 }} key={i}>
                                            <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 2, bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Data Grid Skeleton */}
                            <Box className={styles.section}>
                                <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: '12px', bgcolor: 'rgba(0, 0, 0, 0.03)' }} />
                            </Box>
                        </Box>
                    </div>
                </div>
            </Box>
        );
    }

    // Calculate percentages in frontend (backend no longer sends percentage fields)
    // Use Overall as the denominator — it represents the actual total message count
    const totalMessages = quickReportData?.Overall || 0;
    const calcPct = (count) => totalMessages !== 0 ? Number(((count ?? 0) * 100 / totalMessages).toFixed(2)) : 0;

    // Use quick report data
    const metrics = [
        { label: 'All', value: `${totalMessages !== 0 ? 100 : 0}%`, count: totalMessages, icon: LayoutDashboard, color: '#7367f0', bg: 'rgba(115, 103, 240, 0.12)' },
        { label: 'Sent', value: `${calcPct(quickReportData?.SentCount)}%`, count: quickReportData?.SentCount || 0, icon: Send, color: '#00cfe8', bg: 'rgba(0, 207, 232, 0.12)' },
        { label: 'Delivered', value: `${calcPct(quickReportData?.DeliveredCount)}%`, count: quickReportData?.DeliveredCount || 0, icon: MessageSquare, color: '#28c76f', bg: 'rgba(40, 199, 111, 0.12)' },
        { label: 'Read', value: `${calcPct(quickReportData?.ReadCount)}%`, count: quickReportData?.ReadCount || 0, icon: Eye, color: '#1d9051', bg: 'rgba(29, 144, 81, 0.12)' },
        { label: 'Replied', value: `${calcPct(quickReportData?.RepliedCount)}%`, count: quickReportData?.RepliedCount || 0, icon: MessageCircle, color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.12)' },
        { label: 'Failed', value: `${calcPct(quickReportData?.FailedCount)}%`, count: quickReportData?.FailedCount || 0, icon: AlertCircle, color: '#ea5455', bg: 'rgba(234, 84, 85, 0.12)' },
    ];

    const configDetails = [
        { label: 'Campaign Status', value: quickReportData?.Status === 3 ? 'COMPLETED' : 'IN PROGRESS', icon: Play, color: '#28c76f', bg: 'rgba(40, 199, 111, 0.12)' },
        { label: 'Campaign Name', value: quickReportData?.CampaignName || '—', icon: FileText, color: '#7367f0', bg: 'rgba(115, 103, 240, 0.12)' },
        { label: 'Trigger Campaign', value: quickReportData?.Type === 1 ? 'Immediately' : quickReportData?.Type === 2 ? 'Scheduled' : 'Recurring', icon: Clock, color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.12)' },
        { label: 'Processed At', value: formatDate(quickReportData?.ProcessTime) || '—', icon: Clock, color: '#28c76f', bg: 'rgba(40, 199, 111, 0.12)', isStopwatch: true },
        { label: 'Audience Type', value: quickReportData?.Source || 'Segmented', icon: UserCheck, color: '#00cfe8', bg: 'rgba(0, 207, 232, 0.12)' },
        { label: 'Audience Size', value: quickReportData?.Audience || 0, icon: Users, color: '#ea5455', bg: 'rgba(234, 84, 85, 0.12)' },
        { label: 'Messages', value: quickReportData?.TotalMessage || 0, icon: Hash, color: '#7367f0', bg: 'rgba(115, 103, 240, 0.12)' },
    ];

    return (
        <Box className={styles.page}>
            {/* ── Page Header ── */}
            <div className={styles.topHeader}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.push('/campaign')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div className={styles.headerIconWrap}>
                        <Megaphone size={18} />
                    </div>
                    <div>
                        <h1 className={styles.pageTitle}>Campaign Report</h1>
                        <p className={styles.pageSubtitle}>
                            {activeTab === 'template' ? (
                                <span className={styles.metaInfo}>
                                    Channel (Optigo Apps) <span className={styles.separator}>/</span> Campaign Name ({quickReportData?.CampaignName || '-'})
                                </span>
                            ) : (
                                quickReportData?.CampaignName || 'Report'
                            )}
                        </p>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    {/* Step pills */}
                    <div className={styles.stepProgress}>
                        {REPORT_STEPS.map((s, i) => {
                            const active = activeTab === s.id;
                            const done = activeTab === 'template' && s.id === 'overview';
                            return (
                                <React.Fragment key={s.id}>
                                    <button
                                        className={`${styles.stepPill} ${active ? styles.stepPillActive : ''} ${done ? styles.stepPillDone : ''}`}
                                        onClick={() => setActiveTab(s.id)}
                                    >
                                        <span className={styles.stepPillNum}>{done ? '✓' : s.step}</span>
                                        <span className={styles.stepPillLabel}>{s.label}</span>
                                    </button>
                                    {i < REPORT_STEPS.length - 1 && (
                                        <div className={`${styles.stepConnector} ${done ? styles.stepConnectorDone : ''}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tooltip title="Refresh Report" arrow>
                            <MuiIconButton onClick={loadReport} className={styles.iconBtn}>
                                <RefreshCw size={18} />
                            </MuiIconButton>
                        </Tooltip>
                        {activeTab !== 'template' && (
                            <Tooltip title="Export" arrow>
                                <MuiIconButton onClick={handleExport} className={styles.iconBtn}>
                                    <Download size={18} />
                                </MuiIconButton>
                            </Tooltip>
                        )}
                    </Box>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className={styles.mainContent}>
                {/* Left Sidebar */}
                <div className={styles.leftSidebar}>
                    <div className={styles.stepperCard}>
                        <div className={styles.stepperMenu}>
                            {REPORT_STEPS.map((item) => (
                                <Tooltip key={item.id} title={item.label} placement="right" arrow>
                                    <div
                                        className={`${styles.menuItem} ${activeTab === item.id ? styles.active : ''} ${activeTab === 'template' && item.id === 'overview' ? styles.done : ''}`}
                                        onClick={() => setActiveTab(item.id)}
                                    >
                                        <item.icon size={20} className={styles.menuIcon} />
                                    </div>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className={styles.rightContent}>
                    <Box className={styles.scrollArea}>
                        {activeTab === 'overview' ? (
                            <>
                                {/* Quick Report Metrics */}
                                <Box className={styles.section}>
                                    <Typography className={styles.sectionTitle}>Quick Report</Typography>
                                    <Grid container spacing={2}>
                                        {metrics.map((m, idx) => (
                                            <Grid size={{ xs: 12, sm: 4, md: 2 }} key={idx}>
                                                <Box className={styles.metricCard} style={{ color: m.color }}>
                                                    <Box className={styles.metricIconWrap} style={{ backgroundColor: m.bg, color: m.color }}>
                                                        <m.icon size={22} />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" className={styles.metricLabel}>{m.label}</Typography>
                                                        <Typography variant="h6" className={styles.metricValue}>
                                                            {m.value}
                                                            <span className={styles.metricCount}>({m.count})</span>
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>

                                {/* Campaign Overview Details */}
                                <Box className={styles.section}>
                                    <Typography className={styles.sectionTitle}>Campaign Overview</Typography>
                                    <Grid container spacing={2}>
                                        {configDetails.map((d, idx) => (
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                                                <Box className={styles.detailCard} style={{ color: d.color }}>
                                                    <Box className={styles.detailContent}>
                                                        <Typography variant="caption" className={styles.detailLabel}>{d.label}</Typography>
                                                        <Typography variant="subtitle1" className={styles.detailValue}>
                                                            {d.label === 'Campaign Status' && (
                                                                <Box component="span" className={styles.statusSignal} />
                                                            )}
                                                            {d.value}
                                                        </Typography>
                                                    </Box>
                                                    <Box
                                                        className={styles.detailIconWrap}
                                                        style={{
                                                            backgroundColor: d.bg,
                                                            color: d.color
                                                        }}
                                                    >
                                                        <d.icon size={22} />
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </>
                        ) : (
                            <Box className={styles.templateView}>
                                {/* Segmented Progress Stats */}
                                <Box className={styles.segmentedStats}>
                                    {(() => {
                                        const total = templateStats?.Overall || 0;
                                        const overall = total;
                                        const sent = templateStats?.Sent || 0;
                                        const delivered = templateStats?.Delivered || 0;
                                        const read = templateStats?.ReadCount || 0;
                                        const failed = templateStats?.Failed || 0;
                                        const replied = templateStats?.Replied || 0;

                                        const calculatePercentage = (value) => total > 0 ? Number(((value ?? 0) * 100 / total).toFixed(2)) : 0;

                                        return [
                                            { label: 'Overall', value: '100%', count: overall },
                                            { label: 'Sent', value: `${calculatePercentage(sent)}%`, count: sent },
                                            { label: 'Delivered', value: `${calculatePercentage(delivered)}%`, count: delivered },
                                            { label: 'Read', value: `${calculatePercentage(read)}%`, count: read },
                                            { label: 'Replied', value: `${calculatePercentage(replied)}%`, count: replied },
                                            { label: 'Failed', value: `${calculatePercentage(failed)}%`, count: failed },
                                        ];
                                    })().map((stat, i) => (
                                        <Box
                                            key={i}
                                            className={`${styles.statBlock} ${statFilter === stat.label ? styles.statActive : ''}`}
                                            onClick={() => setStatFilter(stat.label)}
                                        >
                                            <Typography className={styles.statValue}>
                                                {stat.value} <span className={styles.statCount}>({stat.count})</span>
                                            </Typography>   
                                            <Typography className={styles.statLabel}>{stat.label}</Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Audience Retargeting Section */}
                                <Box className={styles.retargetSection}>
                                    <Box className={styles.retargetHeader}>
                                        <Box className={styles.retargetInfo}>
                                            <Box className={styles.retargetIcon}>
                                                <Users size={18} />
                                            </Box>
                                            <Typography className={styles.retargetTitle}>Audience Retargeting</Typography>
                                            <Box component="span" className={styles.recordBadge}>
                                                {filteredTemplateMessages.length} record{filteredTemplateMessages.length !== 1 ? 's' : ''}
                                            </Box>
                                        </Box>
                                        <Box className={styles.retargetActions}>
                                            {/* Search: always visible */}
                                            <TextField
                                                size="small"
                                                placeholder="Search by name, phone, status..."
                                                value={templateSearchText}
                                                onChange={(e) => setTemplateSearchText(e.target.value)}
                                                className={styles.searchField}
                                                sx={{
                                                    '& .MuiInputBase-input': {
                                                        fontSize: '0.9rem',
                                                    },
                                                }}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <SearchIcon size={16} />
                                                            </InputAdornment>
                                                        ),
                                                        endAdornment: templateSearchText && (
                                                            <MuiIconButton size="small" onClick={() => setTemplateSearchText('')}>
                                                                <CloseIcon size={16} />
                                                            </MuiIconButton>
                                                        ),
                                                    },
                                                }}
                                            />

                                            {/* Desktop: icon + text buttons */}
                                            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                <Button
                                                    variant="contained"
                                                    className={styles.retargetBtn}
                                                    startIcon={<Target size={16} />}
                                                    onClick={handleRetarget}
                                                >
                                                    Retarget
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    className={styles.exportBtn}
                                                    startIcon={<Download size={16} />}
                                                    onClick={handleExport}
                                                >
                                                    Export
                                                </Button>
                                            </Box>

                                            {/* Mobile: filter icon button */}
                                            <MuiIconButton
                                                onClick={(e) => setRetargetMenuAnchor(e.currentTarget)}
                                                sx={{
                                                    display: { xs: 'flex', sm: 'none' },
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '10px',
                                                    background: '#fff',
                                                    color: '#64748b',
                                                    p: 1,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <SlidersHorizontal size={18} />
                                            </MuiIconButton>

                                            {/* Mobile: popover with buttons only */}
                                            <Popover
                                                open={Boolean(retargetMenuAnchor)}
                                                anchorEl={retargetMenuAnchor}
                                                onClose={() => setRetargetMenuAnchor(null)}
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                slotProps={{
                                                    paper: {
                                                        sx: {
                                                            p: 1.5,
                                                            width: 200,
                                                            borderRadius: '12px',
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                            mt: 0.5,
                                                            display: { xs: 'block', sm: 'none' },
                                                        },
                                                    },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                                    <Button
                                                        variant="contained"
                                                        className='buttonClassname'
                                                        startIcon={<Target size={16} />}
                                                        onClick={() => { handleRetarget(); setRetargetMenuAnchor(null); }}
                                                        fullWidth
                                                    >
                                                        Retarget
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        className='secondaryBtnClassname'
                                                        startIcon={<Download size={16} />}
                                                        onClick={() => { handleExport(); setRetargetMenuAnchor(null); }}
                                                        fullWidth
                                                    >
                                                        Export
                                                    </Button>
                                                </Box>
                                            </Popover>
                                        </Box>
                                    </Box>
                                </Box>

                                <Paper className={styles.gridPaper} sx={{ borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff' }}>
                                    <DataGrid
                                        rows={filteredTemplateMessages}
                                        columns={getTemplateMessageColumns(statFilter)}
                                        getRowId={(row) => row.MessageId || row.PhoneNo}
                                        checkboxSelection
                                        disableRowSelectionOnClick
                                        disableColumnMenu
                                        disableColumnFilter
                                        rowSelectionModel={selectedTemplateRowSelectionModel}
                                        onRowSelectionModelChange={(newSelection) =>
                                            setSelectedTemplateRowSelectionModel(normalizeSelectionModel(newSelection))
                                        }
                                        rowHeight={48}
                                        getRowHeight={() => (statFilter === 'Failed' || statFilter === 'Replied' ? 'auto' : 48)}
                                        initialState={{
                                            pagination: {
                                                paginationModel: { pageSize: 10, page: 0 },
                                            },
                                        }}
                                        pageSizeOptions={[5, 10, 20, 50]}
                                        loading={templateMessagesLoading}
                                        sx={{
                                            border: 'none',
                                            height: { xs: 320, sm: 360, md: 420 },
                                            '& .MuiDataGrid-virtualScroller': {
                                                overflowX: 'auto',
                                            },
                                            '& .MuiDataGrid-columnHeaders': {
                                                backgroundColor: '#f4f5f7',
                                                color: 'var(--titleColor)',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                letterSpacing: '0.3px',
                                            },
                                            '& .MuiDataGrid-columnHeaderTitle': {
                                                fontWeight: 600,
                                                textTransform: 'capitalize !important',
                                            },
                                            '& .MuiDataGrid-row': {
                                                '&:nth-of-type(odd)': {
                                                    backgroundColor: '#ffffff',
                                                },
                                                '&:nth-of-type(even)': {
                                                    backgroundColor: '#fafbfc',
                                                },
                                            },
                                            '& .MuiDataGrid-cell': {
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0 12px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            },
                                            '& .MuiDataGrid-cell[data-field="FailedReson"], & .MuiDataGrid-cell[data-field="ReplyMessage"]': {
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                overflow: 'visible',
                                                textOverflow: 'clip',
                                                alignItems: 'flex-start',
                                                padding: '8px 12px',
                                                lineHeight: 1.4,
                                            },
                                            '& .MuiDataGrid-footerContainer': {
                                                borderTop: '1px solid #f0f0f2',
                                            },
                                            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
                                            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
                                        }}
                                    />
                                </Paper>
                            </Box>
                        )}
                    </Box>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onConfirm={handleExportConfirm}
                title="Export Campaign Report"
                description={`Are you sure you want to download the report for "${quickReportData?.CampaignName || 'this campaign'}"? The file will include audience details based on your current filter (${statFilter}).`}
                confirmLabel="Download"
                cancelLabel="Cancel"
                icon={Download}
            />
        </Box>
    );
};

export default CampaignReport;
