/**
 * Reverse-compiles WhatsApp campaign/messages JSON into a React Flow
 * graph (nodes + edges + notes) so it can be opened/edited in the builder UI.
 *
 * IMPORTANT: this is lossy. The compiled WA JSON never stored canvas
 * positions or original node labels, so this function auto-generates
 * them. Once the user edits and re-saves, prefer storing frontend_json
 * going forward so you never need this path again for that flow.
 *
 * Usage:
 *   const { nodes, edges, notes } = decompileFlow(campaign, messages);
 */

const X_STEP = 420;
const Y_STEP = 220;

function titleCase(str) {
    return str
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function decompileFlow(campaign, messages) {
    // Support both flat format (messages merged at top level) and old format (separate messages object)
    // If messages is null/undefined and campaign has sibling keys, extract them from the flat object
    let msgMap = messages;
    if (!msgMap && campaign && typeof campaign === 'object') {
        // Flat format: the input is { campaign: {...}, "Que1": {...}, "Que2": {...} }
        // In this case, the caller should pass the whole object as the first arg
        // and we extract campaign + messages from it
        msgMap = {};
        for (const [k, v] of Object.entries(campaign)) {
            if (k !== 'campaign' && k !== 'id' && k !== 'start' && k !== 'rules' && k !== 'trigger') {
                msgMap[k] = v;
            }
        }
        campaign = campaign.campaign || campaign;
    }

    const nodes = [];
    const edges = [];
    const notes = [];
    const positionOf = {}; // key -> {x, y}, assigned via BFS layout
    const keyToNodeId = {}; // rule key -> node id (e.g. "Welcome_Greeting" -> "n2")
    let row = 0;
    let nodeCounter = 0;
    let edgeCounter = 0;

    const nextNodeId = () => `n${++nodeCounter}`;
    const nextEdgeId = () => `e${++edgeCounter}`;

    // 1. Trigger node — always first, always column 0
    const triggerId = nextNodeId();
    nodes.push({
        id: triggerId,
        type: 'keyword_trigger',
        position: { x: 80, y: 200 },
        data: {
            label: '1. Message Match Keyword Condition',
            keywords: campaign.trigger?.keywords || [],
            matchMode: campaign.trigger?.matchMode || 'contains',
        },
    });

    // 2. Walk the rules graph breadth-first to assign columns/rows for layout
    const visited = new Set();
    const queue = [{ key: campaign.start, depth: 1 }];
    const order = [];
    // Track incoming edge count per target key to detect goto patterns
    const incomingCount = {};
    // Track all (sourceKey, targetKey) pairs for edge building
    const edgeSpecs = []; // { sourceKey, buttonId, buttonLabel, targetKey }

    while (queue.length) {
        const { key, depth } = queue.shift();
        if (!key || key === 'Invalid' || visited.has(key)) continue;
        visited.add(key);
        order.push(key);
        positionOf[key] = { x: 80 + depth * X_STEP, y: 150 + row * Y_STEP };
        row++;

        const rule = campaign.rules?.[key];

        // Rule can be: { if: [...] } for conditional, string for direct transition, null for terminal
        if (rule && typeof rule === 'object' && rule.if) {
            // if-array alternates [condition, targetKey, condition, targetKey, ..., fallback]
            for (let i = 0; i < rule.if.length - 1; i += 2) {
                const condition = rule.if[i];
                const target = rule.if[i + 1];
                if (typeof target !== 'string' || target === 'Invalid') continue;

                // Extract button id and label from condition
                let buttonId, buttonLabel;
                if (condition?.in && Array.isArray(condition.in) && condition.in[1]) {
                    const aliases = condition.in[1];
                    buttonId = aliases[0];
                    buttonLabel = aliases[1] || titleCase(buttonId || '');
                } else {
                    // Ambiguous condition structure — flag it
                    notes.push(`Rule "${key}" has a condition at index ${i} that does not match the expected {in: [{var}, [id, label]]} structure — could not extract button id/label.`);
                    buttonId = `btn_unknown_${i}`;
                    buttonLabel = 'Unknown';
                }

                edgeSpecs.push({ sourceKey: key, buttonId, buttonLabel, targetKey: target });
                incomingCount[target] = (incomingCount[target] || 0) + 1;

                if (!visited.has(target)) {
                    queue.push({ key: target, depth: depth + 1 });
                }
            }
        } else if (typeof rule === 'string' && rule !== 'Invalid') {
            // Direct transition: rule is a string pointing to the next key
            edgeSpecs.push({ sourceKey: key, buttonId: 'output', buttonLabel: null, targetKey: rule });
            incomingCount[rule] = (incomingCount[rule] || 0) + 1;

            if (!visited.has(rule)) {
                queue.push({ key: rule, depth: depth + 1 });
            }
        }
        // null rule = terminal node, no outgoing edges
    }

    // 3. Detect goto pattern: target reached from 2+ distinct sources AND
    //    target was already visited at an earlier depth ("back to menu" loop)
    const gotoTargets = new Set();
    for (const [targetKey, count] of Object.entries(incomingCount)) {
        if (count >= 2 && visited.has(targetKey)) {
            gotoTargets.add(targetKey);
        }
    }

    // 4. Build nodes for each visited rule key
    order.forEach((key, i) => {
        const nodeId = nextNodeId();
        keyToNodeId[key] = nodeId;
        const msg = msgMap?.[key];
        const label = `${i + 2}. ${titleCase(key)}`;

        if (!msg) {
            // Terminal node (e.g. agent handoff) — no message body in WA JSON
            // Check if rule is null (terminal) — create end_flow or send_message
            const rule = campaign.rules?.[key];
            if (rule === null) {
                nodes.push({
                    id: nodeId,
                    type: 'send_message',
                    position: positionOf[key] || { x: 80 + (i + 1) * X_STEP, y: 150 },
                    data: {
                        label,
                        text: '[Terminal node — no message]',
                    },
                });
            } else {
                notes.push(`Rule key "${key}" has no corresponding message in the input — emitted as send_message with placeholder text.`);
                nodes.push({
                    id: nodeId,
                    type: 'send_message',
                    position: positionOf[key] || { x: 80 + (i + 1) * X_STEP, y: 150 },
                    data: {
                        label,
                        text: '[no message body found]',
                    },
                });
            }
            return;
        }

        // Parse message based on type
        const nodeData = parseWaMessage(msg, label);
        const isInteractive = nodeData.buttonType === 'quick_reply' || (nodeData.buttons && nodeData.buttons.length > 0);

        nodes.push({
            id: nodeId,
            type: isInteractive ? 'send_question' : 'send_message',
            position: positionOf[key] || { x: 80 + (i + 1) * X_STEP, y: 150 },
            data: nodeData,
        });

        // If this is a goto target, note it
        if (gotoTargets.has(key)) {
            notes.push(`Target "${key}" is reached from multiple sources — a goto node was emitted for the "return to menu" pattern.`);
        }
    });

    // 5. Create goto nodes for return-to-menu patterns
    const gotoNodeMap = {}; // targetKey -> gotoNodeId
    for (const targetKey of gotoTargets) {
        const gotoId = nextNodeId();
        const targetNodeId = keyToNodeId[targetKey];
        if (!targetNodeId) continue;
        gotoNodeMap[targetKey] = gotoId;
        nodes.push({
            id: gotoId,
            type: 'goto',
            position: {
                x: (positionOf[targetKey]?.x || 80) + 40,
                y: (positionOf[targetKey]?.y || 150) + 180,
            },
            data: {
                label: `Go To ${titleCase(targetKey)}`,
                targetNodeId,
                targetNodeLabel: nodes.find((n) => n.id === targetNodeId)?.data?.label || titleCase(targetKey),
            },
        });
    }

    // 6. Build trigger → start edge
    const trigStartKey = campaign.start;
    if (trigStartKey && keyToNodeId[trigStartKey]) {
        edges.push({
            id: nextEdgeId(),
            source: triggerId,
            sourceHandle: 'output',
            target: keyToNodeId[trigStartKey],
        });
    } else if (trigStartKey) {
        notes.push(`Campaign start key "${trigStartKey}" was not found in the rules traversal — trigger edge could not be created.`);
    }

    // 7. Build edges from edgeSpecs, routing secondary sources through goto nodes
    const seenEdges = new Set(); // dedupe: "sourceKey:buttonId:targetKey"
    edgeSpecs.forEach(({ sourceKey, buttonId, buttonLabel, targetKey }) => {
        const sourceNodeId = keyToNodeId[sourceKey];
        if (!sourceNodeId) {
            notes.push(`Edge from "${sourceKey}" could not be created — source node was not in the traversal order.`);
            return;
        }

        // If this target is a goto target AND this is NOT the first incoming edge to it,
        // route through the goto node instead
        let targetNodeId;
        if (gotoNodeMap[targetKey]) {
            // First incoming edge goes directly; subsequent ones go through goto
            if (!seenEdges.has(`${targetKey}:first`)) {
                targetNodeId = keyToNodeId[targetKey];
                seenEdges.add(`${targetKey}:first`);
            } else {
                targetNodeId = gotoNodeMap[targetKey];
            }
        } else {
            targetNodeId = keyToNodeId[targetKey];
        }

        if (!targetNodeId) {
            notes.push(`Edge from "${sourceKey}" (button "${buttonLabel || buttonId}") to "${targetKey}" could not be created — target node was not found.`);
            return;
        }

        const dedupeKey = `${sourceKey}:${buttonId}:${targetKey}`;
        if (seenEdges.has(dedupeKey)) return;
        seenEdges.add(dedupeKey);

        edges.push({
            id: nextEdgeId(),
            source: sourceNodeId,
            sourceHandle: buttonId,
            target: targetNodeId,
        });
    });

    // 8. Check for unvisited rules (orphaned nodes not reachable from start)
    const allRuleKeys = Object.keys(campaign.rules || {});
    const orphaned = allRuleKeys.filter((k) => !visited.has(k) && k !== 'Invalid');
    if (orphaned.length) {
        notes.push(`Rule keys not reachable from campaign.start: ${orphaned.join(', ')} — these were not included in the graph.`);
    }

    return { nodes, edges, notes };
}

/**
 * Parses a WhatsApp Cloud API message object into React Flow node data.
 * Supports: interactive (button/list), text, video, audio, document, location, image
 */
function parseWaMessage(msg, label) {
    const interactive = msg.interactive;

    // Interactive button type
    if (msg.type === 'interactive' && interactive?.type === 'button') {
        const buttons = interactive.action?.buttons?.map((b) => ({
            id: b.reply.id,
            label: b.reply.title,
        })) || [];
        return {
            label,
            text: interactive.body?.text || '',
            mediaUrl: interactive.header?.image?.link || undefined,
            mediaType: interactive.header?.type || undefined,
            buttonType: 'quick_reply',
            buttons,
            timeoutMinutes: 30,
        };
    }

    // Interactive CTA URL type
    if (msg.type === 'interactive' && interactive?.type === 'cta_url') {
        return {
            label,
            text: interactive.body?.text || '',
            buttonType: 'cta_url',
            buttons: [{
                id: 'cta_url',
                label: interactive.action?.parameters?.display_text || 'Click Here',
                ctaUrl: interactive.action?.parameters?.url || '',
            }],
            timeoutMinutes: 30,
        };
    }

    // Interactive list type
    if (msg.type === 'interactive' && interactive?.type === 'list') {
        const rows = interactive.action?.sections?.[0]?.rows || [];
        const buttons = rows.map((r) => ({
            id: r.id,
            label: r.title,
            description: r.description,
        }));
        return {
            label,
            text: interactive.body?.text || '',
            mediaUrl: interactive.header?.image?.link || undefined,
            mediaType: interactive.header?.type || undefined,
            buttonType: 'list',
            buttons,
            timeoutMinutes: 30,
        };
    }

    // Video message
    if (msg.type === 'video') {
        return {
            label,
            text: msg.video?.caption || '',
            mediaUrl: msg.video?.link || '',
            mediaType: 'video',
        };
    }

    // Audio message
    if (msg.type === 'audio') {
        return {
            label,
            text: '',
            mediaUrl: msg.audio?.link || '',
            mediaType: 'audio',
        };
    }

    // Document message
    if (msg.type === 'document') {
        return {
            label,
            text: msg.document?.caption || '',
            mediaUrl: msg.document?.link || '',
            mediaType: 'document',
            mediaFileName: msg.document?.filename || '',
        };
    }

    // Location message
    if (msg.type === 'location') {
        return {
            label,
            text: `${msg.location?.name || ''}\n${msg.location?.address || ''}`.trim(),
            mediaUrl: '',
            mediaType: '',
            _locationData: msg.location,
        };
    }

    // Image message (standalone, not interactive)
    if (msg.type === 'image') {
        return {
            label,
            text: msg.image?.caption || '',
            mediaUrl: msg.image?.link || '',
            mediaType: 'image',
        };
    }

    // Plain text message (default)
    return {
        label,
        text: msg.text?.body || '',
    };
}

// ─── Compile (React Flow → WhatsApp runtime JSON) ─────────────────────────────

/**
 * Compiles a React Flow builder graph (nodes + edges) into the
 * WhatsApp Cloud API runtime flat format: { campaign, ...messages }.
 * Messages are at the top level alongside the campaign object.
 *
 * Usage:
 *   const { campaign, messages, errors } = compileFlow(flowJson);
 *   if (errors.length) {
 *     // show these in the UI as red badges on the offending node,
 *     // block "Publish" until errors is empty
 *   } else {
 *     await saveToBackend(messages); // messages is the flat backend object
 *   }
 */

function slugify(label) {
    return label
        .replace(/^\d+\.\s*/, '') // strip "3. " numbering prefix
        .trim()
        .replace(/\s+/g, '_');
}

function buildWaMessage(node) {
    const { text, buttons = [], mediaUrl, mediaType, mediaFileName, buttonType, _locationData } = node.data;

    // Location message
    if (_locationData) {
        return {
            type: 'location',
            location: _locationData,
        };
    }

    // Interactive list type
    if (buttonType === 'list' && buttons.length > 0) {
        const message = {
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text: text || '' },
                action: {
                    button: buttons[0]?.label || 'Select',
                    sections: [
                        {
                            title: 'Options',
                            rows: buttons.map((b) => ({
                                id: b.id,
                                title: b.label,
                                ...(b.description ? { description: b.description } : {}),
                            })),
                        },
                    ],
                },
            },
        };

        if (mediaUrl) {
            const type = mediaType || 'image';
            message.interactive.header = { type, [type]: { link: mediaUrl } };
        }

        return message;
    }

    // Interactive CTA URL type
    if (buttonType === 'cta_url' && buttons.length > 0) {
        const btn = buttons[0];
        const message = {
            type: 'interactive',
            interactive: {
                type: 'cta_url',
                body: { text: text || '' },
                action: {
                    name: 'cta_url',
                    parameters: {
                        display_text: btn.label || 'Click Here',
                        url: btn.ctaUrl || btn.url || '',
                    },
                },
            },
        };

        if (mediaUrl) {
            const type = mediaType || 'image';
            message.interactive.header = { type, [type]: { link: mediaUrl } };
        }

        return message;
    }

    // Interactive button type
    if (buttons.length > 0) {
        const message = {
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: text || '' },
                action: {
                    buttons: buttons.map((b) => ({
                        type: 'reply',
                        reply: { id: b.id, title: b.label },
                    })),
                },
            },
        };

        if (mediaUrl) {
            const type = mediaType || 'image';
            message.interactive.header = { type, [type]: { link: mediaUrl } };
        }

        return message;
    }

    // Video message
    if (mediaUrl && mediaType === 'video') {
        return {
            type: 'video',
            video: {
                link: mediaUrl,
                ...(text ? { caption: text } : {}),
            },
        };
    }

    // Audio message
    if (mediaUrl && mediaType === 'audio') {
        return {
            type: 'audio',
            audio: { link: mediaUrl },
        };
    }

    // Document message
    if (mediaUrl && mediaType === 'document') {
        return {
            type: 'document',
            document: {
                link: mediaUrl,
                filename: mediaFileName || mediaUrl.split('/').pop() || 'document',
                ...(text ? { caption: text } : {}),
            },
        };
    }

    // Image with no buttons — send as interactive with image header
    if (mediaUrl && mediaType === 'image') {
        return {
            type: 'interactive',
            interactive: {
                type: 'button',
                header: { type: 'image', image: { link: mediaUrl } },
                body: { text: text || '' },
                action: {
                    buttons: [{ type: 'reply', reply: { id: 'ok', title: 'OK' } }],
                },
            },
        };
    }

    // Plain text message (default)
    return {
        type: 'text',
        text: { body: text || '' },
    };
}

export function compileFlow(flow) {
    const { nodes, edges } = flow;
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const errors = [];

    const resolveKey = (nodeId) => {
        let node = nodeMap[nodeId];
        // goto nodes aren't real messages — resolve straight through to their target
        if (node?.type === 'goto') node = nodeMap[node.data.targetNodeId];
        return node ? slugify(node.data.label) : null;
    };

    // 1. Trigger — becomes campaign-level metadata, not a message node
    const triggerNode = nodes.find((n) => n.type === 'keyword_trigger');
    if (!triggerNode) {
        errors.push({ nodeId: null, message: 'No keyword_trigger node found.' });
    }
    const triggerEdge = edges.find((e) => e.source === triggerNode?.id);
    if (!triggerEdge) {
        errors.push({ nodeId: triggerNode?.id, message: 'Trigger node has no outgoing edge.' });
    }

    const campaign = {
        id: flow.id,
        start: triggerEdge ? resolveKey(triggerEdge.target) : null,
        rules: {},
    };

    // Collect all message-producing nodes (send_question + send_message)
    const messageNodes = nodes.filter((n) => n.type === 'send_question' || n.type === 'send_message');
    const backend = { campaign };

    // 2. Build messages and rules for each message node
    messageNodes.forEach((node) => {
        const key = slugify(node.data.label);
        backend[key] = buildWaMessage(node);

        const outgoing = edges.filter((e) => e.source === node.id);

        if (node.type === 'send_question' && (node.data.buttons || []).length > 0 && node.data.buttonType !== 'cta_url') {
            // Conditional branching for send_question with buttons
            const conditions = [];

            (node.data.buttons || []).forEach((btn) => {
                const edge = outgoing.find((e) => e.sourceHandle === btn.id);
                if (!edge) {
                    errors.push({
                        nodeId: node.id,
                        message: `Button "${btn.label}" (${btn.id}) on "${node.data.label}" has no outgoing edge — dead end.`,
                    });
                    return;
                }
                conditions.push({ in: [{ var: 'user_reply' }, [btn.id, btn.label]] });
                conditions.push(resolveKey(edge.target));
            });

            conditions.push('Invalid');
            campaign.rules[key] = { if: conditions };
        } else {
            // Direct transition or terminal for send_message / send_question without buttons
            const nextEdge = outgoing.find((e) => e.sourceHandle === 'output') || outgoing[0];
            if (nextEdge) {
                campaign.rules[key] = resolveKey(nextEdge.target);
            } else {
                campaign.rules[key] = null;
            }
        }
    });

    // 3. Handle end_flow nodes — they produce no message, just a terminal rule
    nodes.filter((n) => n.type === 'end_flow').forEach((node) => {
        const key = slugify(node.data.label);
        campaign.rules[key] = null;
    });

    return { campaign, messages: backend, errors };
}

/**
 * Validates a React Flow graph against WhatsApp Cloud API limits.
 * Returns an array of validation issues: { nodeId, severity, message }
 * severity: 'error' (Meta will reject) | 'warning' (may cause issues)
 *
 * Based on official Meta docs (developers.facebook.com, updated May–Jul 2026).
 */
export function validateFlow(nodes, edges) {
    const issues = [];
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

    nodes.forEach((node) => {
        if (node.type !== 'send_question' && node.type !== 'send_message') return;

        const { text, buttons = [], mediaUrl, mediaType, buttonType } = node.data;
        const label = node.data.label || node.id;
        const isCtaUrl = buttonType === 'cta_url' && buttons.length > 0;
        const isList = buttonType === 'list' && buttons.length > 0;
        const isButton = buttonType !== 'list' && buttonType !== 'cta_url' && buttons.length > 0;

        // ── Body text limits ──────────────────────────────────────
        const bodyLimit = isList ? 4096 : (isButton || isCtaUrl) ? 1024 : 4096;
        if (text && text.length > bodyLimit) {
            issues.push({
                nodeId: node.id,
                severity: 'error',
                message: `"${label}" body text is ${text.length} chars — max ${bodyLimit} for ${isList ? 'list' : 'button'} messages.`,
            });
        }

        // ── CTA URL message validation (interactive.type: "cta_url") ──
        if (isCtaUrl) {
            if (buttons.length > 1) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" has ${buttons.length} buttons — max 1 for CTA URL messages.`,
                });
            }
            const btn = buttons[0];
            if (btn.label && btn.label.length > 20) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" CTA button "${btn.label.substring(0, 15)}..." display_text is ${btn.label.length} chars — max 20.`,
                });
            }
            if (!btn.ctaUrl && !btn.url) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" CTA URL button has no URL configured — Meta will reject this message.`,
                });
            }
            // Header type check for CTA URL messages
            if (mediaUrl && mediaType === 'audio') {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" — audio cannot be used as a header on CTA URL messages. Send as a separate audio message.`,
                });
            }
        }

        // ── Button message validation (interactive.type: "button") ─
        if (isButton) {
            if (buttons.length > 3) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" has ${buttons.length} buttons — max 3 for reply button messages. Use list type for more options.`,
                });
            }

            const seenIds = new Set();
            const seenLabels = new Set();
            buttons.forEach((btn) => {
                if (btn.label.length > 20) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" button "${btn.label.substring(0, 15)}..." title is ${btn.label.length} chars — max 20.`,
                    });
                }
                if (seenLabels.has(btn.label)) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" has duplicate button title "${btn.label}" — titles must be unique.`,
                    });
                }
                seenLabels.add(btn.label);

                if (btn.id && btn.id.length > 256) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" button "${btn.label}" id is too long — max 256 chars.`,
                    });
                }
                if (seenIds.has(btn.id)) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" has duplicate button id "${btn.id}" — ids must be unique.`,
                    });
                }
                seenIds.add(btn.id);
            });

            // Header type check for button messages
            if (mediaUrl) {
                if (mediaType === 'audio') {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" — audio cannot be used as a header on interactive button messages. Send as a separate audio message.`,
                    });
                }
                // image, video, document are valid headers for button messages
            }
        }

        // ── List message validation (interactive.type: "list") ────
        if (isList) {
            if (buttons.length > 10) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" has ${buttons.length} list rows — max 10 total across all sections.`,
                });
            }

            const seenRowIds = new Set();
            buttons.forEach((btn) => {
                if (btn.label.length > 24) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" row "${btn.label.substring(0, 15)}..." title is ${btn.label.length} chars — max 24.`,
                    });
                }
                if (btn.id && btn.id.length > 200) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" row "${btn.label}" id is too long — max 200 chars.`,
                    });
                }
                if (btn.description && btn.description.length > 72) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" row "${btn.label}" description is ${btn.description.length} chars — max 72.`,
                    });
                }
                if (seenRowIds.has(btn.id)) {
                    issues.push({
                        nodeId: node.id,
                        severity: 'error',
                        message: `"${label}" has duplicate row id "${btn.id}" — ids must be unique.`,
                    });
                }
                seenRowIds.add(btn.id);
            });

            // List button text limit
            const listBtnText = buttons[0]?.label || 'Select';
            if (listBtnText.length > 20) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" list open button text is ${listBtnText.length} chars — max 20.`,
                });
            }

            // Header type check for list messages — text only!
            if (mediaUrl && mediaType !== 'text') {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `"${label}" — list messages support text-only headers. ${mediaType} header will be rejected by Meta. Remove the media or switch to button type.`,
                });
            }
        }

        // ── Media size limits (informational — can't check actual size, but warn about types) ──
        if (mediaUrl && mediaType === 'audio' && (isButton || isList)) {
            // Already handled above for button; for list it's caught by the text-only header check
        }

        // ── Plain text message limit ──────────────────────────────
        if (!isButton && !isList && !mediaUrl && text && text.length > 4096) {
            issues.push({
                nodeId: node.id,
                severity: 'error',
                message: `"${label}" text is ${text.length} chars — max 4096 for plain text messages.`,
            });
        }
    });

    // ── Dead edge check (same as compileFlow) ──────────────────
    nodes.forEach((node) => {
        if (node.type !== 'send_question') return;
        const buttons = node.data.buttons || [];
        if (buttons.length === 0) return;

        const outgoing = edges.filter((e) => e.source === node.id);
        buttons.forEach((btn) => {
            const edge = outgoing.find((e) => e.sourceHandle === btn.id);
            if (!edge) {
                issues.push({
                    nodeId: node.id,
                    severity: 'error',
                    message: `Button "${btn.label}" on "${node.data.label}" has no outgoing edge — dead end.`,
                });
            }
        });
    });

    return issues;
}

/**
 * Auto-layout a React Flow graph using BFS depth assignment.
 * Nodes at the same depth are stacked vertically with consistent spacing.
 * This prevents overlapping when AI-generated positions are bad.
 *
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {object} [opts] - { xStep, yStep, startX, startY }
 * @returns {Array} New nodes array with updated positions
 */
export function autoLayoutFlow(nodes, edges, opts = {}) {
    const X_STEP = opts.xStep || 420;
    const Y_STEP = opts.yStep || 260;
    const START_X = opts.startX || 80;
    const START_Y = opts.startY || 120;

    if (!nodes.length) return nodes;

    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

    // Build adjacency: source -> [target, ...]
    const children = {};
    nodes.forEach((n) => { children[n.id] = []; });
    edges.forEach((e) => {
        if (children[e.source]) children[e.source].push(e.target);
    });

    // Find root nodes (no incoming edges) — typically keyword_trigger
    const hasIncoming = new Set(edges.map((e) => e.target));
    let roots = nodes.filter((n) => !hasIncoming.has(n.id));
    if (roots.length === 0) roots = [nodes[0]]; // fallback

    // BFS to assign depth levels
    const depth = {}; // nodeId -> depth
    const queue = roots.map((r) => ({ id: r.id, d: 0 }));
    const visited = new Set();

    while (queue.length) {
        const { id, d } = queue.shift();
        if (visited.has(id)) {
            // Already visited — only update if this path is shallower
            if (depth[id] <= d) continue;
        }
        visited.add(id);
        depth[id] = d;

        const childIds = children[id] || [];
        // Deduplicate children
        [...new Set(childIds)].forEach((cid) => {
            if (nodeMap[cid] && (!visited.has(cid) || depth[cid] > d + 1)) {
                queue.push({ id: cid, d: d + 1 });
            }
        });
    }

    // Any unvisited nodes (disconnected) — put them at max depth + 1
    const maxDepth = Math.max(...Object.values(depth), 0);
    nodes.forEach((n) => {
        if (depth[n.id] === undefined) depth[n.id] = maxDepth + 1;
    });

    // Group nodes by depth
    const byDepth = {};
    nodes.forEach((n) => {
        const d = depth[n.id];
        if (!byDepth[d]) byDepth[d] = [];
        byDepth[d].push(n);
    });

    // Sort depths and assign positions
    const sortedDepths = Object.keys(byDepth).map(Number).sort((a, b) => a - b);
    const positioned = [];

    sortedDepths.forEach((d) => {
        const group = byDepth[d];
        // Sort by type priority: keyword_trigger first, then send_question, then others
        const typePriority = { keyword_trigger: 0, send_question: 1, send_message: 2, condition: 3, delay: 4, set_variable: 5, api_call: 6, goto: 7, human_handoff: 8, end_flow: 9, whatsapp_flow: 10 };
        group.sort((a, b) => (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99));

        group.forEach((node, i) => {
            positioned.push({
                ...node,
                position: {
                    x: START_X + d * X_STEP,
                    y: START_Y + i * Y_STEP,
                },
            });
        });
    });

    return positioned;
}

/**
 * Auto-fix common validation issues in a React Flow graph:
 * 1. Converts quick_reply nodes with >3 buttons to list type
 * 2. Connects dead-end buttons (no outgoing edge) to the next reachable node,
 *    or creates an end_flow node if no suitable target is found.
 *
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {{ nodes: Array, edges: Array, fixes: string[] }}
 */
export function autoFixFlow(nodes, edges) {
    const fixes = [];
    let newNodes = nodes.map((n) => ({ ...n, data: { ...n.data } }));
    let newEdges = [...edges];
    let nodeCounter = newNodes.length + 1;

    // 1. Fix quick_reply nodes with >3 buttons → convert to list
    newNodes.forEach((node) => {
        if (node.type !== 'send_question') return;
        const buttons = node.data.buttons || [];
        const isQuickReply = (node.data.buttonType || 'quick_reply') !== 'list';

        if (isQuickReply && (node.data.buttonType || 'quick_reply') !== 'cta_url' && buttons.length > 3) {
            node.data.buttonType = 'list';
            fixes.push(`Converted "${node.data.label}" from quick_reply to list (had ${buttons.length} buttons, max 3 for quick_reply).`);
        }
    });

    // 1b. Strip media from list-type nodes (list messages only support text headers)
    newNodes.forEach((node) => {
        if (node.type !== 'send_question') return;
        const buttons = node.data.buttons || [];
        const isList = (node.data.buttonType || 'quick_reply') === 'list' && buttons.length > 0;

        if (isList && node.data.mediaUrl) {
            node.data.mediaUrl = '';
            node.data.mediaFileName = '';
            node.data.mediaType = 'image';
            fixes.push(`Removed media from "${node.data.label}" — list messages only support text headers.`);
        }
    });

    // 2. Fix dead-end buttons (no outgoing edge)
    newNodes.forEach((node) => {
        if (node.type !== 'send_question') return;
        if (node.data.buttonType === 'cta_url') return; // CTA URL buttons don't create flow branches
        const buttons = node.data.buttons || [];
        if (buttons.length === 0) return;

        const outgoing = newEdges.filter((e) => e.source === node.id);

        buttons.forEach((btn) => {
            const hasEdge = outgoing.some((e) => e.sourceHandle === btn.id);
            if (hasEdge) return;

            // Find a suitable target: the first node that isn't this node or a trigger
            const possibleTargets = newNodes.filter(
                (n) => n.id !== node.id && n.type !== 'keyword_trigger'
            );

            let targetNode = possibleTargets[0];

            if (!targetNode) {
                // No suitable target — create an end_flow node
                const endId = `n${nodeCounter++}`;
                targetNode = {
                    id: endId,
                    type: 'end_flow',
                    position: {
                        x: (node.position?.x || 0) + 420,
                        y: (node.position?.y || 0) + 100,
                    },
                    data: {
                        label: 'End Flow',
                        message: 'Thank you for your interest. Session ended.',
                    },
                };
                newNodes.push(targetNode);
                fixes.push(`Created end node for dead-end button "${btn.label}" on "${node.data.label}".`);
            }

            const edgeId = `e${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            newEdges.push({
                id: edgeId,
                source: node.id,
                sourceHandle: btn.id,
                target: targetNode.id,
                targetHandle: 'input',
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 2, stroke: 'var(--primary-main)' },
            });
            fixes.push(`Connected dead-end button "${btn.label}" on "${node.data.label}" → "${targetNode.data.label}".`);
        });
    });

    return { nodes: newNodes, edges: newEdges, fixes };
}
