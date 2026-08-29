import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { decompileFlow, compileFlow, autoLayoutFlow, validateFlow, autoFixFlow } from '../components/Automation/FlowBuilder/flowCompiler';
import { generateAiFlow as generateAiFlowApi, editAiFlow as editAiFlowApi } from '../api/aiFlowApi';
import { getApiBaseUrl, getHeaders } from '../api/Config';
import { getApiUrl } from '../utils/globalFunc';
import { fetchAutomationList, uploadAutomationFlow, fetchAutomationFile } from '../api/automationApi';
import { callCommonApi } from '../api/CommonApi';
import { getToken, storage, STORAGE_KEYS } from '../utils/storage';
import { getDecodedSession } from '../utils/session';

const mockFlows = [];

const MAX_HISTORY = 50;

let dragTimer = null;
let draftTimer = null;
let triggerSaveTimer = null;

const snapshot = (state) => ({
    nodes: state.nodes,
    edges: state.edges,
});

const pushHistory = (state) => {
    const snap = snapshot(state);
    const past = [...state._past, snap];
    if (past.length > MAX_HISTORY) past.shift();
    return { _past: past, _future: [] };
};

const pushHistoryDebounced = (state, get) => {
    if (dragTimer) clearTimeout(dragTimer);
    const snap = snapshot(state);
    dragTimer = setTimeout(() => {
        const current = get();
        const past = [...current._past, snap];
        if (past.length > MAX_HISTORY) past.shift();
        get()._setHistory({ _past: past, _future: [] });
    }, 400);
};

// ── Auto-draft helpers ────────────────────────────────────────────────────────
const saveDraft = (state) => {
    if (typeof window === 'undefined') return;
    if (!state.flowId || !state.isDirty) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        const draft = {
            flowId: state.flowId,
            flowName: state.flowName,
            flowDescription: state.flowDescription,
            triggerKeyword: state.triggerKeyword,
            triggerMode: state.triggerMode,
            isActive: state.isActive,
            nodes: state.nodes,
            edges: state.edges,
            _past: state._past,
            _future: state._future,
            savedAt: Date.now(),
        };
        storage.setLocalJSON(STORAGE_KEYS.FLOW_DRAFT, draft);
    }, 800);
};

const loadDraft = () => {
    if (typeof window === 'undefined') return null;
    return storage.getLocalJSON(STORAGE_KEYS.FLOW_DRAFT);
};

const clearDraft = () => {
    if (typeof window === 'undefined') return;
    storage.removeLocal(STORAGE_KEYS.FLOW_DRAFT);
};

// ── Store ──────────────────────────────────────────────────────────────────────
export const useFlowStore = create((set, get) => ({
    // Navigation state
    view: 'list',
    flowsList: mockFlows,
    isLoadingFlows: false,

    // Active Builder state
    flowId: null,
    flowName: 'Untitled Flow',
    flowDescription: '',
    triggerKeyword: 'hi',
    triggerMode: 'contains',
    isActive: false,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isDirty: false,
    isSimulatorOpen: false,
    activeThemeId: 'emerald',
    showAiModal: false,
    showNodePalette: true,

    // Undo/Redo history
    _past: [],
    _future: [],
    _setHistory: (partial) => set(partial),

    canUndo: () => get()._past.length > 0,
    canRedo: () => get()._future.length > 0,

    undo: () => {
        const { _past, _future, nodes, edges } = get();
        if (_past.length === 0) return;
        const previous = _past[_past.length - 1];
        const newPast = _past.slice(0, -1);
        const currentSnap = { nodes, edges };
        set({
            nodes: previous.nodes,
            edges: previous.edges,
            _past: newPast,
            _future: [currentSnap, ..._future],
            isDirty: true,
        });
    },

    redo: () => {
        const { _past, _future, nodes, edges } = get();
        if (_future.length === 0) return;
        const next = _future[0];
        const newFuture = _future.slice(1);
        const currentSnap = { nodes, edges };
        set({
            nodes: next.nodes,
            edges: next.edges,
            _past: [..._past, currentSnap],
            _future: newFuture,
            isDirty: true,
        });
    },

    clearHistory: () => set({ _past: [], _future: [] }),

    // Draft management
    hasDraft: () => {
        const draft = loadDraft();
        if (!draft || !draft.flowId) return false;
        // Only show draft prompt if user actually made changes (has undo history)
        return draft._past && draft._past.length > 0;
    },

    restoreDraft: () => {
        const draft = loadDraft();
        if (!draft) return false;
        set({
            flowId: draft.flowId,
            flowName: draft.flowName || 'Untitled Flow',
            flowDescription: draft.flowDescription || '',
            triggerKeyword: draft.triggerKeyword || 'hi',
            triggerMode: draft.triggerMode || 'contains',
            isActive: draft.isActive ?? false,
            nodes: draft.nodes || [],
            edges: (draft.edges || []).map((e) => ({
                ...e,
                type: e.type || 'smoothstep',
                animated: e.animated ?? true,
                style: e.style || { strokeWidth: 2, stroke: '#1daa61' },
            })),
            selectedNodeId: null,
            isDirty: true,
            view: 'builder',
            _past: draft._past || [],
            _future: draft._future || [],
        });
        return true;
    },

    discardDraft: () => {
        clearDraft();
    },

    // Navigation Actions
    setView: (view) => set({ view }),
    setIsSimulatorOpen: (open) => set({ isSimulatorOpen: open }),
    setShowAiModal: (open) => set({ showAiModal: open }),
    setShowNodePalette: (open) => set({ showNodePalette: open }),
    setThemeId: (id) => set({ activeThemeId: id }),

    // Flow List Actions
    loadFlowsFromBackend: async () => {
        set({ isLoadingFlows: true });
        try {
            const data = await fetchAutomationList();
            if (data.success && Array.isArray(data.files)) {
                const backendFlows = data.files.map((item) => ({
                    id: String(item.Id) || item.FlowName,
                    name: item.FlowName || 'Untitled Flow',
                    description: '',
                    triggerKeyword: item.TriggerMessage || 'hi',
                    triggerMode: 'contains',
                    isActive: true,
                    nodeCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    frontendPath: item.frontendUrl || null,
                    backendPath: item.backendUrl || null,
                    _backendData: null,
                    _fromBackend: true,
                }));
                set((state) => ({
                    flowsList: [
                        ...backendFlows,
                        ...state.flowsList.filter(
                            (f) => !f._fromBackend &&
                                   !backendFlows.some((bf) => bf.name?.toLowerCase() === f.name?.toLowerCase())
                        ),
                    ],
                }));
            }
        } catch (e) {
            console.error('Failed to load flows from backend:', e.message);
        } finally {
            set({ isLoadingFlows: false });
        }
    },

    loadFlow: async (flowId) => {
        const listSummary = get().flowsList.find((f) => f.id === flowId);
        if (!listSummary) return;

        let initialNodes;
        let initialEdges;

        // Helper to fetch flow files directly from backend
        const fetchFlowFile = async (fileUrl) => {
            return fetchAutomationFile(fileUrl);
        };

        if (listSummary.frontendPath) {
            // Load frontend JSON (nodes/edges) via proxy
            try {
                const data = await fetchFlowFile(listSummary.frontendPath);
                initialNodes = data.nodes || [];
                initialEdges = (data.edges || []).map((e) => ({
                    ...e,
                    type: 'smoothstep',
                    animated: true,
                    style: { strokeWidth: 2, stroke: '#1daa61' },
                }));
            } catch (e) {
                console.error('Failed to load frontend JSON:', e.message);
                // If frontend fails and we have a backend URL, try decompiling
                if (listSummary.backendPath) {
                    try {
                        const bkData = await fetchFlowFile(listSummary.backendPath);
                        let campaign, messages;
                        if (bkData.campaign && bkData.messages) {
                            campaign = bkData.campaign;
                            messages = bkData.messages;
                        } else {
                            campaign = bkData;
                            messages = null;
                        }
                        const result = decompileFlow(campaign, messages);
                        initialNodes = result.nodes;
                        initialEdges = result.edges.map((e) => ({
                            ...e,
                            type: 'smoothstep',
                            animated: true,
                            style: { strokeWidth: 2, stroke: '#1daa61' },
                        }));
                    } catch (bkErr) {
                        console.error('Failed to load backend JSON:', bkErr.message);
                        return;
                    }
                } else {
                    return;
                }
            }
        } else if (listSummary._backendData) {
            // Decompile backend WA JSON → React Flow nodes/edges
            // Support both flat format (campaign + messages at top level) and old format ({ campaign, messages })
            const data = listSummary._backendData;
            let campaign, messages;
            if (data.campaign && data.messages) {
                // Old format: { campaign: {...}, messages: {...} }
                campaign = data.campaign;
                messages = data.messages;
            } else {
                // New flat format: { campaign: {...}, "Que1": {...}, "Que2": {...} }
                // Pass the whole data object; decompileFlow will extract campaign + messages
                campaign = data;
                messages = null;
            }
            const result = decompileFlow(campaign, messages);
            initialNodes = result.nodes;
            initialEdges = result.edges.map((e) => ({
                ...e,
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 2, stroke: '#1daa61' },
            }));
        } else if (listSummary.backendPath) {
            // No frontend file, but we have a backend URL — fetch and decompile it via proxy
            try {
                const bkData = await fetchFlowFile(listSummary.backendPath);
                let campaign, messages;
                if (bkData.campaign && bkData.messages) {
                    campaign = bkData.campaign;
                    messages = bkData.messages;
                } else {
                    campaign = bkData;
                    messages = null;
                }
                const result = decompileFlow(campaign, messages);
                initialNodes = result.nodes;
                initialEdges = result.edges.map((e) => ({
                    ...e,
                    type: 'smoothstep',
                    animated: true,
                    style: { strokeWidth: 2, stroke: '#1daa61' },
                }));
            } catch (bkErr) {
                console.error('Failed to load backend JSON for decompile:', bkErr.message);
                // Fall through to default placeholder nodes
                initialNodes = [
                    { id: 'n1', type: 'keyword_trigger', position: { x: 80, y: 200 }, data: { label: `1. Trigger: "${listSummary.triggerKeyword}"`, keywords: [listSummary.triggerKeyword], matchMode: 'contains' } },
                    { id: 'n2', type: 'send_message', position: { x: 420, y: 150 }, data: { label: '2. Send Message', text: 'Hello! How can we help you today?' } },
                    { id: 'n3', type: 'end_flow', position: { x: 760, y: 250 }, data: { label: '3. End Flow', message: 'Thank you for your visit. Session ended.' } },
                ];
                initialEdges = [
                    { id: 'e1', source: 'n1', sourceHandle: 'output', target: 'n2', type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#1daa61' } },
                    { id: 'e2', source: 'n2', sourceHandle: 'output', target: 'n3', type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#1daa61' } },
                ];
            }
        } else {
            initialNodes = [
                { id: 'n1', type: 'keyword_trigger', position: { x: 80, y: 200 }, data: { label: `1. Trigger: "${listSummary.triggerKeyword}"`, keywords: [listSummary.triggerKeyword], matchMode: 'contains' } },
                { id: 'n2', type: 'send_message', position: { x: 420, y: 150 }, data: { label: '2. Send Message', text: 'Hello! How can we help you today?' } },
                { id: 'n3', type: 'end_flow', position: { x: 760, y: 250 }, data: { label: '3. End Flow', message: 'Thank you for your visit. Session ended.' } },
            ];
            initialEdges = [
                { id: 'e1', source: 'n1', sourceHandle: 'output', target: 'n2', type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#1daa61' } },
                { id: 'e2', source: 'n2', sourceHandle: 'output', target: 'n3', type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#1daa61' } },
            ];
        }

        // Sync trigger node keywords with the flow's triggerKeyword
        const triggerKw = listSummary.triggerKeyword || 'hi';
        initialNodes = initialNodes.map((n) => {
            if (n.type === 'keyword_trigger') {
                return { ...n, data: { ...n.data, keywords: [triggerKw, ...(n.data.keywords || []).filter((k) => k !== triggerKw && k !== 'start')] } };
            }
            return n;
        });

        // If we decompiled from backend (no frontend file), mark dirty so save generates frontend
        const wasDecompiledFromBackend = !listSummary.frontendPath && (listSummary.backendPath || listSummary._backendData);

        set({
            flowId,
            flowName: listSummary.name,
            flowDescription: listSummary.description,
            triggerKeyword: triggerKw,
            triggerMode: listSummary.triggerMode || 'contains',
            isActive: listSummary.isActive,
            nodes: initialNodes,
            edges: initialEdges,
            selectedNodeId: null,
            isDirty: wasDecompiledFromBackend,
            view: 'builder',
            _past: [],
            _future: [],
        });

        // Clear any stale draft from a previous session — only new changes should create a draft
        clearDraft();
    },

    importFlow: (flowJson) => {
        const newId = flowJson.id || `flow-${Date.now()}`;
        const now = new Date().toISOString();

        const newFlowMeta = {
            id: newId,
            name: flowJson.name || 'Imported Flow',
            description: flowJson.description || 'Imported from JSON',
            triggerKeyword: flowJson.triggerKeyword || 'hi',
            triggerMode: flowJson.triggerMode || 'contains',
            isActive: flowJson.isActive ?? false,
            nodeCount: flowJson.nodes?.length || 0,
            createdAt: flowJson.createdAt || now,
            updatedAt: now,
        };

        const importedEdges = (flowJson.edges || []).map((e) => ({
            ...e,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2, stroke: '#1daa61' },
        }));

        const laidOutNodes = autoLayoutFlow(flowJson.nodes || [], importedEdges);

        set((state) => ({
            flowsList: [newFlowMeta, ...state.flowsList.filter((f) => f.id !== newId)],
            flowId: newId,
            flowName: newFlowMeta.name,
            flowDescription: newFlowMeta.description,
            triggerKeyword: newFlowMeta.triggerKeyword,
            triggerMode: newFlowMeta.triggerMode,
            isActive: newFlowMeta.isActive,
            nodes: laidOutNodes,
            edges: importedEdges,
            selectedNodeId: null,
            isDirty: true,
            view: 'builder',
            _past: [],
            _future: [],
        }));
    },

    createNewFlow: () => {
        const newId = `flow-${Date.now()}`;
        const newFlowMeta = {
            id: newId,
            name: 'Untitled Flow',
            description: 'New chat automation sequence',
            triggerKeyword: 'hi',
            isActive: false,
            nodeCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const initialNodes = [
            {
                id: 'n1',
                type: 'keyword_trigger',
                position: { x: 150, y: 220 },
                data: {
                    label: '1. Start Trigger',
                    keywords: ['hi'],
                    matchMode: 'contains',
                },
            },
        ];

        set((state) => ({
            flowsList: [newFlowMeta, ...state.flowsList],
            flowId: newId,
            flowName: 'Untitled Flow',
            flowDescription: 'New chat automation sequence',
            triggerKeyword: 'start',
            triggerMode: 'contains',
            isActive: false,
            nodes: initialNodes,
            edges: [],
            selectedNodeId: null,
            isDirty: false,
            view: 'builder',
            _past: [],
            _future: [],
        }));
    },

    generateAiFlow: async (description) => {
        try {
            const flow = await generateAiFlowApi(description);

            const newId = flow.id || `flow-${Date.now()}`;
            const newFlowMeta = {
                id: newId,
                name: flow.name || 'AI Generated Flow',
                description: flow.description || 'Generated by AI',
                triggerKeyword: flow.triggerKeyword || 'hi',
                triggerMode: flow.triggerMode || 'contains',
                isActive: flow.isActive ?? false,
                nodeCount: flow.nodes?.length || 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const aiEdges = (flow.edges || []).map((e) => ({
                ...e,
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 2, stroke: '#1daa61' },
            }));

            const laidOutNodes = autoLayoutFlow(flow.nodes || [], aiEdges);

            // Auto-fix validation issues (button count, dead ends)
            const { nodes: fixedNodes, edges: fixedEdges, fixes } = autoFixFlow(laidOutNodes, aiEdges);

            // Re-validate after fixes
            const validationIssues = validateFlow(fixedNodes, fixedEdges);

            set((state) => ({
                flowsList: [newFlowMeta, ...state.flowsList],
                flowId: newId,
                flowName: newFlowMeta.name,
                flowDescription: newFlowMeta.description,
                triggerKeyword: newFlowMeta.triggerKeyword,
                triggerMode: newFlowMeta.triggerMode,
                isActive: newFlowMeta.isActive,
                nodes: fixedNodes,
                edges: fixedEdges,
                selectedNodeId: null,
                isDirty: true,
                view: 'builder',
                _past: [],
                _future: [],
            }));

            return { success: true, warnings: validationIssues, fixes };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    editAiFlow: async (instruction) => {
        try {
            const s = get();
            const currentFlow = {
                id: s.flowId,
                name: s.flowName,
                description: s.flowDescription,
                triggerKeyword: s.triggerKeyword,
                triggerMode: s.triggerMode,
                isActive: s.isActive,
                nodes: s.nodes,
                edges: s.edges,
            };

            const flow = await editAiFlowApi(currentFlow, instruction);

            const aiEdges = (flow.edges || []).map((e) => ({
                ...e,
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 2, stroke: '#1daa61' },
            }));

            const laidOutNodes = autoLayoutFlow(flow.nodes || [], aiEdges);

            // Auto-fix validation issues (button count, dead ends)
            const { nodes: fixedNodes, edges: fixedEdges, fixes } = autoFixFlow(laidOutNodes, aiEdges);

            // Re-validate after fixes
            const validationIssues = validateFlow(fixedNodes, fixedEdges);

            set((state) => ({
                nodes: fixedNodes,
                edges: fixedEdges,
                selectedNodeId: null,
                isDirty: true,
                _past: [...state._past, snapshot(state)].slice(-MAX_HISTORY),
                _future: [],
            }));

            return { success: true, warnings: validationIssues, fixes };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    deleteFlow: async (flowId) => {
        const listSummary = get().flowsList.find((f) => f.id === flowId);
        if (listSummary?.frontendPath) {
            try {
                await fetch(getApiUrl('/api/flow/delete'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ flowId }),
                });
            } catch (e) {
                console.error('Failed to delete flow from disk:', e.message);
            }
        }
        set((state) => ({
            flowsList: state.flowsList.filter((f) => f.id !== flowId),
            selectedNodeId: state.flowId === flowId ? null : state.selectedNodeId,
            flowId: state.flowId === flowId ? null : state.flowId,
            view: state.flowId === flowId ? 'list' : state.view,
        }));
    },

    toggleFlowActiveInList: (flowId) => {
        set((state) => ({
            flowsList: state.flowsList.map((f) =>
                f.id === flowId ? { ...f, isActive: !f.isActive } : f
            ),
            isActive: state.flowId === flowId ? !state.isActive : state.isActive,
            isDirty: state.flowId === flowId,
        }));
    },

    // React Flow Actions
    onNodesChange: (changes) => {
        const hasDrag = changes.some((c) => c.type === 'position' && c.dragging);
        if (hasDrag) {
            pushHistoryDebounced(get(), get);
        }
        set((state) => ({
            nodes: applyNodeChanges(changes, state.nodes),
            isDirty: true,
        }));
        saveDraft(get());
    },

    onEdgesChange: (changes) => {
        set((state) => ({
            ...pushHistory(state),
            edges: applyEdgeChanges(changes, state.edges),
            isDirty: true,
        }));
        saveDraft(get());
    },

    onConnect: (connection) => {
        set((state) => {
            const newEdge = {
                ...connection,
                id: `e-${connection.source}-${connection.sourceHandle || ''}-${connection.target}`,
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 2 },
            };
            return {
                ...pushHistory(state),
                edges: addEdge(newEdge, state.edges),
                isDirty: true,
            };
        });
        saveDraft(get());
    },

    setNodes: (nodes) => { set((state) => ({ ...pushHistory(state), nodes, isDirty: true })); saveDraft(get()); },
    setEdges: (edges) => { set((state) => ({ ...pushHistory(state), edges, isDirty: true })); saveDraft(get()); },
    selectNode: (id) => set({ selectedNodeId: id }),

    autoFixFlowErrors: () => {
        const state = get();
        const { nodes: fixedNodes, edges: fixedEdges, fixes } = autoFixFlow(state.nodes, state.edges);
        set({
            ...pushHistory(state),
            nodes: fixedNodes,
            edges: fixedEdges,
            isDirty: true,
        });
        saveDraft(get());
        return fixes;
    },

    // Flow Node Actions
    updateNodeData: (id, data) => {
        set((state) => ({
            ...pushHistory(state),
            nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...data } } : n
            ),
            isDirty: true,
        }));
        saveDraft(get());
    },

    // Real-time update with debounced history (for live editing without flooding undo)
    updateNodeDataLive: (id, data) => {
        pushHistoryDebounced(get(), get);
        set((state) => ({
            nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...data } } : n
            ),
            isDirty: true,
        }));
        saveDraft(get());
    },

    addNode: (node) => {
        set((state) => ({
            ...pushHistory(state),
            nodes: [...state.nodes, node],
            isDirty: true,
        }));
        saveDraft(get());
    },

    deleteNode: (id) => {
        set((state) => ({
            ...pushHistory(state),
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
            isDirty: true,
        }));
        saveDraft(get());
    },

    duplicateNode: (id) => {
        const parentNode = get().nodes.find((n) => n.id === id);
        if (!parentNode) return;

        const newId = `n-${Date.now()}`;
        const duplicated = {
            ...parentNode,
            id: newId,
            position: { x: parentNode.position.x + 60, y: parentNode.position.y + 60 },
            data: JSON.parse(JSON.stringify(parentNode.data)),
            selected: false,
        };

        if (duplicated.data.label) {
            duplicated.data.label = `${duplicated.data.label} (Copy)`;
        }

        set((state) => ({
            ...pushHistory(state),
            nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), duplicated],
            isDirty: true,
            selectedNodeId: newId,
        }));
        saveDraft(get());
    },

    setFlowName: (name) => { set({ flowName: name, isDirty: true }); saveDraft(get()); },
    setFlowDescription: (desc) => { set({ flowDescription: desc, isDirty: true }); saveDraft(get()); },
    setTriggerKeyword: (keyword) => {
        const state = get();
        const updatedNodes = state.nodes.map((n) => {
            if (n.type === 'keyword_trigger') {
                const existingKws = (n.data.keywords || []);
                const restKws = existingKws.slice(1).filter((k) => k !== keyword);
                return { ...n, data: { ...n.data, keywords: [keyword, ...restKws] } };
            }
            return n;
        });
        set({ triggerKeyword: keyword, nodes: updatedNodes, isDirty: true });
        saveDraft(get());

        // Debounced save trigger to backend
        if (triggerSaveTimer) clearTimeout(triggerSaveTimer);
        triggerSaveTimer = setTimeout(() => {
            get().saveTriggerToBackend();
        }, 1000);
    },
    setTriggerMode: (mode) => { set({ triggerMode: mode, isDirty: true }); saveDraft(get()); },
    setIsActive: (val) => { set({ isActive: val, isDirty: true }); saveDraft(get()); },

    saveTriggerToBackend: async (accountId = '') => {
        const s = get();
        if (!s.flowId) return;

        const token = getToken();
        const session = getDecodedSession();
        const companyCode = token?.companycode || token?.CompanyCode || session?.companycode || session?.cc || '';
        const finalAccountId = accountId || token?.AccountId || token?.accountid || session?.accountid || 1;
        const userId = token?.id || '';
        const appUserId = token?.email || token?.Email || session?.email || 'admin@orail.co.in';

        const triggerNode = s.nodes.find((n) => n.type === 'keyword_trigger');
        const startNode = triggerNode?.data?.label?.replace(/^.*:\s*"?/, '').replace(/"$/, '') || s.flowName || '';

        // Only include FlowId when it's a real numeric ID from the backend (not a temp "flow-xxx" ID)
        const numericFlowId = parseInt(s.flowId);
        const payload = {
            companycode: companyCode,
            AccountId: finalAccountId,
            TriggerMessage: s.triggerKeyword,
            FlowName: s.flowName,
            StartNode: startNode,
            UserId: userId,
        };
        if (!isNaN(numericFlowId)) {
            payload.FlowId = numericFlowId;
        }

        const p = JSON.stringify(payload);

        try {
            const result = await callCommonApi({
                mode: 'wa_save_flow_trigger',
                f: 'save trigger message',
                p,
                userId: appUserId,
            });
            if (result) {
                console.log('Trigger saved to backend:', result);
            }
            return result;
        } catch (err) {
            console.error('Failed to save trigger to backend:', err.message);
            return null;
        }
    },

    // Save & Export
    saveCurrentFlow: async (accountId = '') => {
        const currentId = get().flowId;
        if (!currentId) return { success: false, error: 'No active flow.' };

        const s = get();

        // Validation: check for duplicate flowName or triggerKeyword in other flows
        const duplicateName = s.flowsList.some(
            (f) => f.id !== currentId && f.name?.toLowerCase() === s.flowName?.toLowerCase()
        );
        if (duplicateName) {
            return { success: false, error: `A flow with the name "${s.flowName}" already exists. Please use a different name.` };
        }

        const duplicateTrigger = s.flowsList.some(
            (f) => f.id !== currentId && f.triggerKeyword?.toLowerCase() === s.triggerKeyword?.toLowerCase()
        );
        if (duplicateTrigger) {
            return { success: false, error: `A flow with the trigger keyword "${s.triggerKeyword}" already exists. Please use a different trigger.` };
        }

        // Validation: check for placeholder images that haven't been replaced
        const placeholderNodes = s.nodes.filter(
            (n) => n.data?.mediaUrl && n.data.mediaUrl.includes('placehold.co')
        );
        if (placeholderNodes.length > 0) {
            const nodeNames = placeholderNodes.map((n) => `"${n.data.label || n.id}"`).join(', ');
            return {
                success: false,
                error: `The following nodes still have placeholder images: ${nodeNames}. Please replace them with real images before saving.`,
            };
        }

        const flowJson = {
            id: currentId,
            nodes: s.nodes,
            edges: s.edges,
        };
        const { campaign, messages: backendFlat, errors } = compileFlow(flowJson);

        const now = new Date().toISOString();

        const frontendJson = {
            id: currentId,
            name: s.flowName,
            description: s.flowDescription,
            triggerKeyword: s.triggerKeyword,
            triggerMode: s.triggerMode,
            isActive: s.isActive,
            nodes: s.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
            })),
            edges: s.edges.map((e) => ({
                id: e.id,
                source: e.source,
                sourceHandle: e.sourceHandle || 'output',
                target: e.target,
                targetHandle: e.targetHandle,
            })),
            createdAt: now,
            updatedAt: now,
        };

        // backendFlat is the flat format: { campaign: {...}, "Que1": {...}, "Que2": {...} }
        const backendJson = errors.length === 0
            ? backendFlat
            : null;

        // If compile errors, don't upload anything to the API
        if (errors.length > 0) {
            return { success: false, errors };
        }

        try {
            const apiUrl = getApiBaseUrl();

            // 1. Upload frontend + backend JSON to backend API directly
            const uploadData = await uploadAutomationFlow(
                frontendJson,
                backendJson,
                s.flowName || currentId,
            );

            // Construct frontend/backend URLs from the API response or fallback
            const safeFlowName = (s.flowName || currentId).replace(/[^a-zA-Z0-9_-]/g, '_');
            const frontendUrl = uploadData?.frontendUrl || `${apiUrl}/whatsapp/automation/file/${safeFlowName}.frontend.json`;
            const backendUrl = uploadData?.backendUrl || `${apiUrl}/whatsapp/automation/file/${safeFlowName}.backend.json`;

            set((state) => ({
                flowsList: state.flowsList.map((f) =>
                    f.id === currentId
                        ? {
                              ...f,
                              name: state.flowName,
                              description: state.flowDescription,
                              triggerKeyword: state.triggerKeyword,
                              isActive: state.isActive,
                              nodeCount: state.nodes.length,
                              updatedAt: now,
                              frontendPath: frontendUrl,
                              backendPath: backendUrl,
                              _backendData: backendJson || f._backendData,
                          }
                        : f
                ),
                isDirty: false,
            }));

            clearDraft();

            // 2. Save trigger keyword to backend via report API
            try {
                await get().saveTriggerToBackend(accountId);
            } catch (triggerErr) {
                console.error('Trigger save error:', triggerErr.message);
            }

            return { success: true, errors };
        } catch (error) {
            console.error('Save flow error:', error.message);
            return { success: false, error: error.message };
        }
    },

    getFlowJSON: () => {
        const s = get();
        return {
            id: s.flowId || 'flow-new',
            name: s.flowName,
            description: s.flowDescription,
            triggerKeyword: s.triggerKeyword,
            triggerMode: s.triggerMode,
            isActive: s.isActive,
            nodes: s.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
            })),
            edges: s.edges.map((e) => ({
                id: e.id,
                source: e.source,
                sourceHandle: e.sourceHandle || 'output',
                target: e.target,
                targetHandle: e.targetHandle,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },

    resetBuilder: () => {
        set({
            flowId: null,
            flowName: 'Untitled Flow',
            flowDescription: '',
            triggerKeyword: 'hi',
            isActive: false,
            nodes: [],
            edges: [],
            selectedNodeId: null,
            isDirty: false,
            isSimulatorOpen: false,
            showAiModal: false,
            _past: [],
            _future: [],
        });
    },
}));
