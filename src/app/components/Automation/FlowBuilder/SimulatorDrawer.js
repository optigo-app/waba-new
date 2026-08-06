'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFlowStore } from '../../../store/flowStore';
import {
    Send, Smartphone, X, RotateCcw, User, Bot,
    Info, AlertTriangle, CheckCircle, Flame, Server, Clock, Command,
    Check, Download, Terminal, FileCode, PlayCircle
} from 'lucide-react';
import styles from './FlowBuilder.module.scss';

const SimulatorDrawer = () => {
    const isSimulatorOpen = useFlowStore(state => state.isSimulatorOpen);
    const setIsSimulatorOpen = useFlowStore(state => state.setIsSimulatorOpen);
    const triggerKeyword = useFlowStore(state => state.triggerKeyword || 'hi');
    const triggerMode = useFlowStore(state => state.triggerMode || 'contains');
    const nodes = useFlowStore(state => state.nodes);
    const edges = useFlowStore(state => state.edges);
    const flowName = useFlowStore(state => state.flowName);

    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [isBotTyping, setIsBotTyping] = useState(false);

    const [activeFlowModal, setActiveFlowModal] = useState(null);
    const [modalFieldsState, setModalFieldsState] = useState({});
    const [activeTab, setActiveTab] = useState('chat');
    const [traceLogs, setTraceLogs] = useState([]);

    const [variables, setVariables] = useState({
        'user.first_name': 'Sarah',
        'user.last_name': 'Jennings',
        'user.phone': '+1 (555) 019-2834',
        'last_order_reply': 'Unset',
        'order_status_result': 'Unset'
    });

    const chatContainerRef = useRef(null);

    const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const addLog = (type, msg, nodeId) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const targetNode = nodeId ? nodes.find(n => n.id === nodeId) : null;
        const nodeLabel = targetNode ? targetNode.data?.label : undefined;
        setTraceLogs(prev => [
            ...prev,
            { id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, time, type, msg, nodeName: nodeLabel }
        ]);
    };

    const getMetaFlowJson = () => {
        const flowNodes = nodes.filter(n => n.type === 'whatsapp_flow');
        if (flowNodes.length === 0) {
            return JSON.stringify({
                version: "2.1",
                routing_model: { "SCREEN_CHOOSE_STYLE": [] },
                screens: [{
                    id: "SCREEN_CHOOSE_STYLE",
                    title: "Select style choices",
                    terminal: true,
                    layout: {
                        type: "SingleColumnLayout",
                        children: [{
                            type: "Form", name: "form_container",
                            children: [
                                { type: "Dropdown", name: "ring_size_interest", label: "Ring size interest", required: true, data_source: [{ id: "6mm", title: "6mm" }, { id: "7mm", title: "7mm" }] },
                                { type: "TextInput", name: "customer_notes", label: "Customer notes", required: false, placeholder: "Any engraving requests?" },
                                { type: "Footer", label: "Confirm selection", on_click_action: { name: "data_exchange", payload: { ring_size_interest: "${form_container.ring_size_interest}", customer_notes: "${form_container.customer_notes}" } } }
                            ]
                        }]
                    }
                }]
            }, null, 2);
        }

        const routing_model = {};
        const screens = flowNodes.map((flowNode) => {
            const screenId = flowNode.data?.screenId || `SCREEN_${flowNode.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
            const fields = flowNode.data?.fields || [];
            const submitCta = flowNode.data?.submitButtonText || 'Confirm and Continue';
            const nextEdge = edges.find(e => e.source === flowNode.id && e.sourceHandle === 'submitted');
            const targetNode = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null;

            let onClickAction = { name: "data_exchange", payload: {} };
            const transitionDestinations = [];

            if (targetNode) {
                if (targetNode.type === 'whatsapp_flow') {
                    const targetScreenId = targetNode.data?.screenId || `SCREEN_${targetNode.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
                    transitionDestinations.push(targetScreenId);
                    onClickAction = { name: "navigate", next: { type: "screen", name: targetScreenId, payload: fields.reduce((acc, f) => { const cn = f.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_'); acc[cn] = `\${form_container.${cn}}`; return acc; }, {}) } };
                } else if (targetNode.type === 'end_flow') {
                    onClickAction = { name: "complete_flow", payload: fields.reduce((acc, f) => { const cn = f.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_'); acc[cn] = `\${form_container.${cn}}`; return acc; }, {}) };
                } else {
                    onClickAction = { name: "data_exchange", payload: fields.reduce((acc, f) => { const cn = f.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_'); acc[cn] = `\${form_container.${cn}}`; return acc; }, {}) };
                }
            } else {
                onClickAction = { name: "data_exchange", payload: fields.reduce((acc, f) => { const cn = f.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_'); acc[cn] = `\${form_container.${cn}}`; return acc; }, {}) };
            }

            routing_model[screenId] = transitionDestinations;

            return {
                id: screenId,
                title: flowNode.data?.label || "Select style choices",
                terminal: transitionDestinations.length === 0,
                layout: {
                    type: "SingleColumnLayout",
                    children: [{
                        type: "Form", name: "form_container",
                        children: [
                            ...fields.map((f) => {
                                const cn = f.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_');
                                if (f.type === 'text') return { type: "TextInput", name: cn, label: f.label, required: !!f.required, placeholder: f.placeholder || undefined };
                                if (f.type === 'number') return { type: "TextInput", name: cn, label: f.label, required: !!f.required, input_type: "number" };
                                if (f.type === 'dropdown') return { type: "Dropdown", name: cn, label: f.label, required: !!f.required, data_source: f.options?.map(o => ({ id: o.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_'), title: o.label })) || [] };
                                if (f.type === 'radio') return { type: "RadioButtons", name: cn, label: f.label, required: !!f.required, data_source: f.options?.map(o => ({ id: o.label.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').replace(/\s+/g, '_'), title: o.label })) || [] };
                                if (f.type === 'checkbox') return { type: "CheckboxGroup", name: cn, label: f.label, required: !!f.required, max_selected_items: 1, data_source: [{ id: "accepted", title: "Yes, I confirm" }] };
                                return null;
                            }).filter(Boolean),
                            { type: "Footer", label: submitCta, on_click_action: onClickAction }
                        ]
                    }]
                }
            };
        });

        return JSON.stringify({ version: "2.1", routing_model, screens }, null, 2);
    };

    const getNextNode = (sourceId, handleId) => {
        const edge = edges.find(e => e.source === sourceId && (handleId === undefined || handleId === null || e.sourceHandle === handleId));
        if (!edge) return null;
        return nodes.find(n => n.id === edge.target) || null;
    };

    const interpolateVars = (text) => {
        if (!text) return '';
        let result = text;
        Object.keys(variables).forEach(key => {
            result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), variables[key]);
        });
        return result;
    };

    const startInstantly = () => {
        const triggerNode = nodes.find(n => n.type === 'keyword_trigger');
        const currentTimeStr = formatTime(new Date());
        if (triggerNode) {
            const next = getNextNode(triggerNode.id, 'output') || getNextNode(triggerNode.id, null);
            if (next) {
                setMessages(prev => [...prev, { id: `trigger-instant-${Date.now()}`, sender: 'system', text: `⚡ Instant Auto-Trigger activated! Executing flow sequence starting immediately.`, timestamp: currentTimeStr, isSystemEvent: true }]);
                executeNode(next);
            } else {
                const firstSend = nodes.find(n => n.id !== triggerNode.id && (n.type === 'send_message' || n.type === 'send_question' || n.type === 'whatsapp_flow'));
                if (firstSend) executeNode(firstSend);
            }
        } else {
            const firstSend = nodes.find(n => n.type === 'send_message' || n.type === 'send_question' || n.type === 'whatsapp_flow');
            if (firstSend) executeNode(firstSend);
        }
    };

    const handleRestart = () => {
        setCurrentNodeId(null);
        setTraceLogs([]);
        addLog('info', `Initializing virtual terminal session. Listening for keyword trigger "${triggerKeyword}"`);
        if (triggerMode === 'instant') {
            setMessages([{ id: 'sys-start', sender: 'system', text: `🏁 Direct Auto-Start session initialized. Booting welcome pathways instantly...`, timestamp: formatTime(new Date()), isSystemEvent: true }]);
            addLog('info', 'Auto-Start enabled: Launching entry welcome pathways...');
            setTimeout(() => startInstantly(), 150);
        } else {
            setMessages([{ id: 'sys-start', sender: 'system', text: `🏁 Simulator Session Started. Send "${triggerKeyword}" (or type it below) to test keyword triggers.`, timestamp: formatTime(new Date()), isSystemEvent: true }]);
        }
    };

    useEffect(() => {
        if (isSimulatorOpen) handleRestart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSimulatorOpen]);

    useEffect(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [messages, isBotTyping]);

    const executeNode = async (node) => {
        if (!node) return;
        setIsBotTyping(true);
        setCurrentNodeId(node.id);
        addLog('info', `Entered node sequence: "${node.data?.label || 'Unnamed active state'}" [id: ${node.id}]`, node.id);

        let typingDuration = 700;
        if (node.type === 'api_call') typingDuration = 1200;
        if (node.type === 'condition') typingDuration = 800;
        await new Promise(r => setTimeout(r, typingDuration));
        setIsBotTyping(false);

        const currentTimeStr = formatTime(new Date());

        switch (node.type) {
            case 'send_message': {
                const textContent = interpolateVars(node.data?.text || '');
                addLog('success', `Sent Text Message: "${textContent}"`, node.id);
                setMessages(prev => [...prev, { id: `bot-msg-${Date.now()}`, sender: 'bot', text: textContent, timestamp: currentTimeStr, media: node.data?.mediaUrl ? { url: node.data.mediaUrl, type: node.data.mediaType || 'image' } : undefined }]);
                const next = getNextNode(node.id, 'output') || getNextNode(node.id, null);
                if (next) executeNode(next);
                break;
            }
            case 'send_question': {
                const textContent = interpolateVars(node.data?.text || '');
                const btnType = node.data?.buttonType || 'quick_reply';
                addLog('success', `Sent Interactive Question: "${textContent}" with ${node.data?.buttons?.length || 0} button options.`, node.id);
                setMessages(prev => [...prev, { id: `bot-question-${Date.now()}`, sender: 'bot', text: textContent, timestamp: currentTimeStr, media: node.data?.mediaUrl ? { url: node.data.mediaUrl, type: node.data.mediaType || 'image' } : undefined, buttons: node.data?.buttons || [], buttonType: btnType }]);
                if (btnType === 'cta_url') {
                    const next = getNextNode(node.id, 'output') || getNextNode(node.id, null);
                    if (next) executeNode(next);
                }
                break;
            }
            case 'api_call': {
                const resVar = node.data?.responseVariable || 'api_response';
                addLog('api', `[GET / POST Request] Tracing simulated API endpoint: "${node.data?.url || 'https://api.system.service/v1'}"`, node.id);
                setMessages(prev => [...prev, { id: `api-trigger-${Date.now()}`, sender: 'system', text: `🛰️ [API Request] ${node.data?.method || 'GET'} ${node.data?.url || 'https://api.system.service/v1'}`, timestamp: currentTimeStr, isSystemEvent: true }]);
                await new Promise(r => setTimeout(r, 600));
                setVariables(prev => ({ ...prev, [resVar]: 'In Transit (Premium Express)', ['last_order_reply']: 'Delivered tomorrow at 4 PM', ['order_status_result']: 'En route via Cargo 102' }));
                addLog('variable', `Updated Local Sandbox State: "${resVar}" = "In Transit (Premium Express)"`, node.id);
                addLog('success', `API Call resolved successfully (Status 200 OK). Proceeding to "success" node route.`, node.id);
                setMessages(prev => [...prev, { id: `api-success-${Date.now()}`, sender: 'system', text: `📈 [API Response 200 OK] Variable "${resVar}" hydrated with order data.`, timestamp: currentTimeStr, isSystemEvent: true }]);
                const next = getNextNode(node.id, 'success') || getNextNode(node.id, null);
                if (next) executeNode(next);
                else { const failNext = getNextNode(node.id, 'fail'); if (failNext) executeNode(failNext); }
                break;
            }
            case 'condition': {
                const checkVar = node.data?.variable || 'order_status_result';
                const operator = node.data?.operator || 'equals';
                const targetVal = node.data?.value || '';
                const currentVarVal = variables[checkVar] || 'Unset';
                let isMatch = false;
                if (operator === 'equals') isMatch = currentVarVal.toLowerCase() === targetVal.toLowerCase();
                else if (operator === 'contains') isMatch = currentVarVal.toLowerCase().includes(targetVal.toLowerCase());
                else if (operator === 'not_equals') isMatch = currentVarVal.toLowerCase() !== targetVal.toLowerCase();
                else if (operator === 'is_set') isMatch = currentVarVal !== 'Unset' && !!currentVarVal;
                else if (operator === 'is_not_set') isMatch = currentVarVal === 'Unset';
                addLog('info', `Evaluating conditional branch rule: "${checkVar}" (${currentVarVal}) ${operator} "${targetVal}"`, node.id);
                addLog('success', `Condition matched outcome: ${isMatch ? 'TRUE' : 'FALSE'}. Branching next step.`, node.id);
                setMessages(prev => [...prev, { id: `cond-eval-${Date.now()}`, sender: 'system', text: `⚖️ [Conditional Evaluation] Checking if variable "${checkVar}" ("${currentVarVal}") ${operator} "${targetVal}" -> Result: ${isMatch ? 'TRUE' : 'FALSE'}`, timestamp: currentTimeStr, isSystemEvent: true }]);
                await new Promise(r => setTimeout(r, 400));
                const next = getNextNode(node.id, isMatch ? 'true' : 'false') || getNextNode(node.id, null);
                if (next) executeNode(next);
                break;
            }
            case 'delay': {
                const duration = node.data?.duration || 3;
                const unit = node.data?.unit || 'seconds';
                addLog('info', `Waiting active simulated pause: ${duration} ${unit}`, node.id);
                setMessages(prev => [...prev, { id: `delay-start-${Date.now()}`, sender: 'system', text: `⏳ Waiting simulated delay of ${duration} ${unit} before responding...`, timestamp: currentTimeStr, isSystemEvent: true }]);
                await new Promise(r => setTimeout(r, Math.min(duration * 1000, 3000)));
                const next = getNextNode(node.id, 'output') || getNextNode(node.id, null);
                if (next) executeNode(next);
                break;
            }
            case 'human_handoff': {
                addLog('warn', `Ticket escalated: Conversation handed off to support operator context desk.`, node.id);
                setMessages(prev => [...prev, { id: `handoff-${Date.now()}`, sender: 'bot', text: node.data?.message || 'Connecting you to our agent support desk. Please hold.', timestamp: currentTimeStr }, { id: `handoff-sys-${Date.now()}`, sender: 'system', text: `🧑‍⚕️ [WhatsApp Handoff Protocol Initiated] Ticket created. Simulated agent has entered the room.`, timestamp: currentTimeStr, isSystemEvent: true }]);
                break;
            }
            case 'end_flow': {
                addLog('info', `Session complete: Executing session teardown protocol.`, node.id);
                setMessages(prev => [...prev, { id: `end-flow-msg-${Date.now()}`, sender: 'bot', text: node.data?.message || 'Goodbye! Thank you for chatting.', timestamp: currentTimeStr }, { id: `end-flow-sys-${Date.now()}`, sender: 'system', text: `🛑 Flow transaction finalized completely.`, timestamp: currentTimeStr, isSystemEvent: true }]);
                break;
            }
            case 'whatsapp_flow': {
                addLog('info', `Dispatched Meta WhatsApp Flow component [${node.data?.flowId || 'unnamed'}]. Triggering custom bottom-sheet screen.`, node.id);
                setMessages(prev => [...prev, { id: `bot-flow-${Date.now()}`, sender: 'bot', text: `💬 Official Meta Verification State: Interactive form screen sequence has loaded. Tap the form trigger below inside this simulated message block.`, timestamp: currentTimeStr, flowNodeData: node.data }]);
                break;
            }
            default: {
                const next = getNextNode(node.id, 'output') || getNextNode(node.id, null);
                if (next) executeNode(next);
                break;
            }
        }
    };

    const handleSendMessage = () => {
        if (!inputMessage.trim()) return;
        const userText = inputMessage.trim();
        const currentTimeStr = formatTime(new Date());
        setMessages(prev => [...prev, { id: `user-msg-${Date.now()}`, sender: 'user', text: userText, timestamp: currentTimeStr }]);
        setInputMessage('');

        if (!currentNodeId) {
            const matchesTrigger = triggerMode === 'exact' ? userText.toLowerCase() === triggerKeyword.toLowerCase() : userText.toLowerCase().includes(triggerKeyword.toLowerCase());
            if (matchesTrigger) {
                const triggerNode = nodes.find(n => n.type === 'keyword_trigger');
                if (triggerNode) {
                    setMessages(prev => [...prev, { id: `trigger-hit-${Date.now()}`, sender: 'system', text: `🟢 Pattern match! Traced Keyword: "${triggerKeyword}"`, timestamp: currentTimeStr, isSystemEvent: true }]);
                    const next = getNextNode(triggerNode.id, 'output') || getNextNode(triggerNode.id, null);
                    if (next) executeNode(next);
                    else setMessages(prev => [...prev, { id: `trigger-empty-${Date.now()}`, sender: 'system', text: `⚠️ Keyword trigger node found, but no target connections exist on the Canvas.`, timestamp: currentTimeStr, isSystemEvent: true }]);
                }
            } else {
                setTimeout(() => {
                    setMessages(prev => [...prev, { id: `bot-fallback-${Date.now()}`, sender: 'bot', text: `Sorry, I'm just a WhatsApp Bot. Please send "${triggerKeyword}" to wake me up or activate my interactive flowchart routes!`, timestamp: formatTime(new Date()) }]);
                }, 600);
            }
        } else {
            const currNode = nodes.find(n => n.id === currentNodeId);
            if (currNode && currNode.type === 'send_question') {
                setVariables(prev => ({ ...prev, ['last_reply']: userText }));
                addLog('variable', `Updated Local Sandbox State: "last_reply" = "${userText}"`, currentNodeId);
                setMessages(prev => [...prev, { id: `reply-saved-${Date.now()}`, sender: 'system', text: `💾 Saved variable 'last_reply' = "${userText}"`, timestamp: currentTimeStr, isSystemEvent: true }]);
                const next = getNextNode(currentNodeId, 'output') || getNextNode(currentNodeId, null);
                if (next) executeNode(next);
                else {
                    const matchingBtn = currNode.data?.buttons?.find(b => b.label.toLowerCase() === userText.toLowerCase());
                    if (matchingBtn) { const btnNext = getNextNode(currentNodeId, matchingBtn.id); if (btnNext) executeNode(btnNext); }
                }
            }
        }
    };

    const handleButtonClick = (btnId, btnLabel) => {
        if (!currentNodeId) return;
        const currentTimeStr = formatTime(new Date());
        addLog('info', `Simulating click on quick reply button option: "${btnLabel}"`, currentNodeId);
        setMessages(prev => [...prev, { id: `user-btn-${Date.now()}`, sender: 'user', text: btnLabel, timestamp: currentTimeStr }]);
        setVariables(prev => ({ ...prev, ['last_reply']: btnLabel }));
        addLog('variable', `Updated Local Sandbox State: "last_reply" = "${btnLabel}"`, currentNodeId);
        const nextNode = getNextNode(currentNodeId, btnId);
        if (nextNode) executeNode(nextNode);
        else {
            const fallbackNext = getNextNode(currentNodeId, 'output') || getNextNode(currentNodeId, null);
            if (fallbackNext) executeNode(fallbackNext);
            else {
                addLog('warn', `Option button socket trigger ID: "${btnId}" has no outgoing connection routed on canvas`, currentNodeId);
                setMessages(prev => [...prev, { id: `dead-end-${Date.now()}`, sender: 'system', text: `⚠️ Button option "${btnLabel}" has no outgoing connection routed on the board.`, timestamp: currentTimeStr, isSystemEvent: true }]);
            }
        }
    };

    const openFlowModal = (nodeId, flowData) => {
        setActiveFlowModal({ nodeId, label: flowData?.label || 'Meta Flow Screen', flowId: flowData?.flowId || 'flow_id', screenId: flowData?.screenId || 'SCREEN_ID', fields: flowData?.fields || [], submitButtonText: flowData?.submitButtonText || 'Submit' });
        const prefill = {};
        (flowData?.fields || []).forEach(f => { prefill[f.id] = ''; });
        setModalFieldsState(prefill);
        addLog('info', `Opened simulated bottom-sheet modal overlay window for screen layout: "${flowData?.screenId || 'SCREEN_ID'}"`, nodeId);
    };

    const submitFlowForm = () => {
        if (!activeFlowModal) return;
        const nodeId = activeFlowModal.nodeId;
        const currentTimeStr = formatTime(new Date());
        setMessages(prev => [...prev, { id: `user-flow-submit-${Date.now()}`, sender: 'user', text: `Submitted Form Screen matching: [${activeFlowModal.flowId}]`, timestamp: currentTimeStr }]);
        const updatedVars = { ...variables };
        activeFlowModal.fields.forEach((field) => { updatedVars[`flow_${activeFlowModal.flowId}_${field.label.toLowerCase().replace(/\s+/g, '_')}`] = modalFieldsState[field.id] || '(empty)'; });
        setVariables(updatedVars);
        addLog('variable', `Captured screen responses: ` + activeFlowModal.fields.map(f => `"${f.label}" = "${modalFieldsState[f.id] || ''}"`).join(', '), nodeId);
        addLog('success', `Completed form layout submit successfully. Routing matching step.`, nodeId);
        setMessages(prev => [...prev, { id: `flow-sav-${Date.now()}`, sender: 'system', text: `💾 Saved ${activeFlowModal.fields.length} screen variables: ` + activeFlowModal.fields.map(f => `${f.label}: "${modalFieldsState[f.id] || ''}"`).join(', '), timestamp: currentTimeStr, isSystemEvent: true }]);
        setActiveFlowModal(null);
        const nextNode = getNextNode(nodeId, 'submitted') || getNextNode(nodeId, 'output') || getNextNode(nodeId, null);
        if (nextNode) executeNode(nextNode);
        else {
            addLog('warn', `Meta Form Screen submitted but active flow has no outbound connector bound.`, nodeId);
            setMessages(prev => [...prev, { id: `dead-end-flow-${Date.now()}`, sender: 'system', text: `⚠️ Form Screen submitted successfully, but no target connections exist on the Canvas from the "submitted" output handle.`, timestamp: currentTimeStr, isSystemEvent: true }]);
        }
    };

    if (!isSimulatorOpen) return null;

    return (
        <div className={styles.simPanel}>
                {/* Header */}
                <header className={styles.simHeader}>
                    <div className={styles.simHeaderLeft}>
                        <div className={styles.simHeaderIcon}><Smartphone size={16} /></div>
                        <div>
                            <h2 className={styles.simHeaderTitle}>Interactive WhatsApp Simulator</h2>
                            <p className={styles.simHeaderSubtitle}>Real-time keyword testing & tree tracing</p>
                        </div>
                    </div>
                    <div className={styles.simHeaderActions}>
                        <button onClick={handleRestart} title="Reset Live Chat" className={styles.simHeaderBtn}><RotateCcw size={14} /></button>
                        <button onClick={() => setIsSimulatorOpen(false)} className={styles.simHeaderBtn}><X size={14} /></button>
                    </div>
                </header>

                {/* Tabs */}
                <div className={styles.simTabs}>
                    <button onClick={() => setActiveTab('chat')} className={`${styles.simTab} ${activeTab === 'chat' ? styles.simTabActive : ''}`}>
                        <Smartphone size={13} /><span>Live simulator</span>
                    </button>
                    <button onClick={() => setActiveTab('trace')} className={`${styles.simTab} ${activeTab === 'trace' ? styles.simTabActive : ''}`}>
                        <Terminal size={13} /><span>Trace logs</span>
                        {traceLogs.length > 0 && <span className={styles.simTabBadge}>{traceLogs.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('schema')} className={`${styles.simTab} ${activeTab === 'schema' ? styles.simTabActive : ''}`}>
                        <FileCode size={13} /><span>Meta flow json</span>
                    </button>
                </div>

                {/* Body */}
                <div className={styles.simBody}>
                    {activeTab === 'chat' && (
                        <>
                            {/* Phone Mockup */}
                            <div className={styles.simPhone}>
                                <div className={styles.simPhoneNotch} />

                                {/* Flow Modal Overlay */}
                                {activeFlowModal && (
                                    <div className={styles.simFlowModalOverlay}>
                                        <div className={styles.simFlowModal}>
                                            <div className={styles.simFlowModalHeader}>
                                                <div className={styles.simFlowModalHeaderLeft}>
                                                    <Smartphone size={15} />
                                                    <div>
                                                        <div className={styles.simFlowModalFlowId}>{activeFlowModal.flowId}</div>
                                                        <span className={styles.simFlowModalScreenId}>Screen: {activeFlowModal.screenId}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setActiveFlowModal(null)} className={styles.simFlowModalClose}><X size={15} /></button>
                                            </div>
                                            <div className={styles.simFlowModalBody}>
                                                {activeFlowModal.fields.map((field) => (
                                                    <div key={field.id} className={styles.simFlowField}>
                                                        <label className={styles.simFlowFieldLabel}>{field.label} {field.required && <span className={styles.simFlowFieldRequired}>*</span>}</label>
                                                        {field.type === 'text' && <input type="text" value={modalFieldsState[field.id] || ''} onChange={e => setModalFieldsState(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} className={styles.simFlowInput} />}
                                                        {field.type === 'number' && <input type="number" value={modalFieldsState[field.id] || ''} onChange={e => setModalFieldsState(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder || 'Enter...'} className={styles.simFlowInput} />}
                                                        {field.type === 'dropdown' && (
                                                            <select value={modalFieldsState[field.id] || ''} onChange={e => setModalFieldsState(prev => ({ ...prev, [field.id]: e.target.value }))} className={styles.simFlowSelect}>
                                                                <option value="">Select option...</option>
                                                                {(field.options || []).map(opt => <option key={opt.key || opt.label} value={opt.label}>{opt.label}</option>)}
                                                            </select>
                                                        )}
                                                        {field.type === 'radio' && (
                                                            <div className={styles.simFlowRadioGroup}>
                                                                {(field.options || []).map(opt => (
                                                                    <label key={opt.key || opt.label} className={styles.simFlowRadioLabel}>
                                                                        <input type="radio" name={`field_${field.id}`} checked={modalFieldsState[field.id] === opt.label} onChange={() => setModalFieldsState(prev => ({ ...prev, [field.id]: opt.label }))} className={styles.simFlowRadioInput} />
                                                                        <span>{opt.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {field.type === 'checkbox' && (
                                                            <label className={styles.simFlowRadioLabel}>
                                                                <input type="checkbox" checked={modalFieldsState[field.id] === 'true'} onChange={e => setModalFieldsState(prev => ({ ...prev, [field.id]: e.target.checked ? 'true' : 'false' }))} className={styles.simFlowRadioInput} />
                                                                <span>{field.label}</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={styles.simFlowModalFooter}>
                                                <button onClick={submitFlowForm} disabled={activeFlowModal.fields.some(f => f.required && !modalFieldsState[f.id])} className={styles.simFlowSubmitBtn}>{activeFlowModal.submitButtonText || 'Confirm and Submit'}</button>
                                                <button onClick={() => setActiveFlowModal(null)} className={styles.simFlowCancelBtn}>Cancel / Close</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Status Bar */}
                                <div className={styles.simPhoneStatusBar}>
                                    <span>09:41</span>
                                    <div className={styles.simPhoneStatusBarRight}><span>WhatsApp Live</span><span className={styles.simPhoneStatusDot} /></div>
                                </div>

                                {/* Chat Header */}
                                <div className={styles.simPhoneChatHeader}>
                                    <div className={styles.simPhoneAvatar}>💬</div>
                                    <div className={styles.simPhoneChatInfo}>
                                        <h4 className={styles.simPhoneChatName}>ChatBot Support</h4>
                                        <p className={styles.simPhoneChatStatus}>Online & active automation</p>
                                    </div>
                                    {currentNodeId && <div className={styles.simPhoneNodeId} title="Active Canvas Segment">ID: {currentNodeId}</div>}
                                </div>

                                {/* Chat Messages */}
                                <div ref={chatContainerRef} className={styles.simPhoneChatBody}>
                                    {messages.map(msg => {
                                        if (msg.sender === 'system') {
                                            return (
                                                <div key={msg.id} className={styles.simMsgSystemRow}>
                                                    <div className={styles.simMsgSystem}>
                                                        <span>{msg.text}</span>
                                                        <span className={styles.simMsgTime}>{msg.timestamp}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        const isUser = msg.sender === 'user';
                                        return (
                                            <div key={msg.id} className={`${styles.simMsgRow} ${isUser ? styles.simMsgRowUser : styles.simMsgRowBot}`}>
                                                <div className={`${styles.simMsgBubble} ${isUser ? styles.simMsgBubbleUser : styles.simMsgBubbleBot}`}>
                                                    {msg.media?.url && (
                                                        <div className={styles.simMsgMedia}>
                                                            <img src={msg.media.url} alt="Media" onError={e => { e.target.style.display = 'none'; }} />
                                                        </div>
                                                    )}
                                                    <p className={styles.simMsgText}>{msg.text}</p>
                                                    {msg.flowNodeData && (
                                                        <div className={styles.simMsgFlowTrigger}>
                                                            <button onClick={() => openFlowModal(currentNodeId || '', msg.flowNodeData)} className={styles.simMsgFlowBtn}>
                                                                <span className={styles.simMsgFlowBtnLeft}><Smartphone size={13} />{msg.flowNodeData.ctaText || '💍 Open Selector'}</span>
                                                                <span className={styles.simMsgFlowBadge}>FLOW</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                    {msg.buttons && msg.buttons.length > 0 && (
                                                        <div className={styles.simMsgButtons}>
                                                            {msg.buttons.map(btn => (
                                                                msg.buttonType === 'cta_url' ? (
                                                                    <a key={btn.id} href={btn.ctaUrl || btn.url || '#'} className={styles.simMsgBtn} target="_blank" rel="noopener noreferrer">
                                                                        <span>{btn.label}</span>
                                                                        <span className={styles.simMsgBtnTap}>OPEN</span>
                                                                    </a>
                                                                ) : (
                                                                    <button key={btn.id} onClick={() => handleButtonClick(btn.id, btn.label)} className={styles.simMsgBtn}>
                                                                        <span>{btn.label}</span>
                                                                        <span className={styles.simMsgBtnTap}>TAP</span>
                                                                    </button>
                                                                )
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className={styles.simMsgTime}>{msg.timestamp}</div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {messages.length <= 1 && !currentNodeId && triggerMode !== 'instant' && (
                                        <div className={styles.simInstantCard}>
                                            <div className={styles.simInstantCardIcon}><Bot size={18} /></div>
                                            <div className={styles.simInstantCardContent}>
                                                <h4 className={styles.simInstantCardTitle}>Instant Bot Simulator</h4>
                                                <p className={styles.simInstantCardDesc}>Test interactive options, variables, and custom branching routes immediately. No keyword input required!</p>
                                                <button onClick={startInstantly} className={styles.simInstantCardBtn}><Flame size={13} /><span>Launch Interactive Flow Instantly</span></button>
                                            </div>
                                        </div>
                                    )}

                                    {isBotTyping && (
                                        <div className={styles.simTypingRow}>
                                            <div className={styles.simTypingBubble}>
                                                <span className={styles.simTypingText}>Bot is formulating</span>
                                                <span className={styles.simTypingDot} style={{ animationDelay: '0ms' }} />
                                                <span className={styles.simTypingDot} style={{ animationDelay: '150ms' }} />
                                                <span className={styles.simTypingDot} style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input */}
                                <div className={styles.simInputArea}>
                                    {messages.length <= 1 && triggerMode !== 'instant' && (
                                        <button onClick={() => setInputMessage(triggerKeyword)} className={styles.simQuickSendBtn}><span>⚡ Quick Send:</span><span className={styles.simQuickSendKw}>"{triggerKeyword}"</span></button>
                                    )}
                                    <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }} placeholder={currentNodeId ? "Select an option or type..." : (triggerMode === 'instant' ? "Instant Auto-Start active..." : `Type "${triggerKeyword}" to test trigger...`)} className={styles.simInput} />
                                    <button onClick={handleSendMessage} className={styles.simSendBtn}><Send size={14} /></button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Trace Tab */}
                    {activeTab === 'trace' && (
                        <div className={styles.simTracePanel}>
                            <div className={styles.simTraceHeader}>
                                <div className={styles.simTraceHeaderLabel}><Terminal size={15} /><span>Real-Time Step-by-Step State Auditor</span></div>
                                <div className={styles.simTraceHeaderRight}>
                                    <span className={styles.simTraceLiveDot} />
                                    <span className={styles.simTraceLiveText}>Live Tracing</span>
                                    <button onClick={() => setTraceLogs([])} className={styles.simTraceClearBtn}>Clear Console</button>
                                </div>
                            </div>
                            <div className={styles.simTraceList}>
                                {traceLogs.length === 0 ? (
                                    <div className={styles.simTraceEmpty}>
                                        <Command size={28} />
                                        <p>Console is idle. Launch simulator interactions on the first tab to view trace pathways, rule validations, and server bindings.</p>
                                    </div>
                                ) : (
                                    traceLogs.map(log => {
                                        let typeClass = styles.simTraceLogTypeInfo;
                                        let typeIcon = '⚫';
                                        if (log.type === 'success') { typeClass = styles.simTraceLogTypeSuccess; typeIcon = '🟢'; }
                                        else if (log.type === 'warn') { typeClass = styles.simTraceLogTypeWarn; typeIcon = '🟡'; }
                                        else if (log.type === 'api') { typeClass = styles.simTraceLogTypeApi; typeIcon = '🛰️'; }
                                        else if (log.type === 'variable') { typeClass = styles.simTraceLogTypeVar; typeIcon = '💾'; }
                                        return (
                                            <div key={log.id} className={styles.simTraceLog}>
                                                <div className={styles.simTraceLogHeader}>
                                                    <span className={`${styles.simTraceLogType} ${typeClass}`}>{typeIcon} {log.type}</span>
                                                    <span className={styles.simTraceLogTime}>{log.time}</span>
                                                </div>
                                                <p className={styles.simTraceLogMsg}>{log.msg}</p>
                                                {log.nodeName && (
                                                    <div className={styles.simTraceLogNode}>
                                                        <span>Context:</span>
                                                        <span className={styles.simTraceLogNodeBadge}>{log.nodeName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className={styles.simTraceFooter}><Info size={13} /><span>Traces sandbox state modifications, rules evaluation, and button routing hits with precise timestamp logs.</span></div>
                        </div>
                    )}

                    {/* Schema Tab */}
                    {activeTab === 'schema' && (
                        <div className={styles.simSchemaPanel}>
                            <div className={styles.simSchemaHeader}>
                                <div className={styles.simSchemaHeaderLabel}><FileCode size={15} /><span>Meta-Accepted WhatsApp Flow JSON Payload</span></div>
                                <button onClick={() => { navigator.clipboard.writeText(getMetaFlowJson()); addLog('success', 'Copied Meta WhatsApp flow.json schema into clipboard.'); }} className={styles.simSchemaCopyBtn}><Download size={12} /><span>Copy JSON</span></button>
                            </div>
                            <div className={styles.simSchemaCode}>
                                <pre>{getMetaFlowJson()}</pre>
                            </div>
                            <div className={styles.simSchemaFooter}>
                                <Check size={14} />
                                <span><strong>Meta Standard Compliant:</strong> This generated JSON maps directly to Meta's developer schemas for production.</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
    );
};

export default SimulatorDrawer;
