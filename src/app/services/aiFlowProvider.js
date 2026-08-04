/**
 * AI Flow Provider — provider-agnostic wrapper for generating WhatsApp
 * chatbot flows from plain-language descriptions.
 *
 * Supports multiple AI providers controlled by the AI_PROVIDER env var:
 *   - "mistral" (default) — uses MISTRAL_API_KEY
 *   - "gemini"            — uses GEMINI_API_KEY
 *
 * SECURITY: API keys must only live in backend environment variables.
 * This module is designed to be called from a server-side context only.
 * Never import this directly from client-side code.
 */

// ── Provider config (overridable via env) ────────────────────────────────────
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const SYSTEM_PROMPT = `You are a flow-generation engine for a WhatsApp chatbot visual builder (React Flow based). Given a plain-language description of a business and what its bot should do, output ONLY a JSON object shaped exactly like this — no prose, no markdown fences:

{
  "id": "flow-<short-slug>",
  "name": "<Flow Name>",
  "description": "<one line>",
  "triggerKeyword": "<primary keyword>",
  "triggerMode": "contains",
  "isActive": true,
  "nodes": [ ... ],
  "edges": [ ... ]
}

NODE TYPES YOU MAY USE:
- "keyword_trigger": data = { label, keywords: string[], matchMode: "contains" }. Always exactly one, always id "n1".
- "send_question": data = { label, text, mediaUrl?, mediaType?, buttonType: "quick_reply" | "list", buttons: [{id, label, description?}], timeoutMinutes: 30 }. Max 3 buttons for quick_reply (WhatsApp reply-button limit), max 10 for list. Each button label under 20 characters (WhatsApp hard limit). Use buttonType: "list" when the user needs a category menu with more than 3 options — list buttons support a description field (max 72 chars).
- "send_message": data = { label, text, mediaUrl?, mediaType?, mediaFileName? }. Use for terminal messages with no buttons. mediaType can be "image", "video", "audio", or "document". For video, text becomes the caption. For audio, text is ignored. For document, text becomes the caption and mediaFileName is the filename.
- "goto": data = { label, targetFlowId, targetNodeId, targetNodeLabel }. Use for "back to menu" style loops instead of duplicating a menu node.

WHATSAPP CLOUD API LIMITS (MUST OBEY):
- Reply buttons (buttonType: "quick_reply"): MAX 3 buttons, each label MAX 20 chars, unique within message, body text MAX 1024 chars.
- List messages (buttonType: "list"): MAX 10 rows total, row title MAX 24 chars, row id MAX 200 chars, row description MAX 72 chars, list button text MAX 20 chars, body text MAX 4096 chars. List headers can ONLY be text — do NOT add mediaUrl to list-type nodes.
- Plain text messages: body text MAX 4096 chars.
- Button message headers: can be text, image, video, or document — NEVER audio.
- Audio can only be sent as a standalone send_message (not as a header on any interactive message).
- Media size limits: image 5MB, video 16MB, audio 16MB, document 100MB.

RULES:
1. Every button on every send_question node MUST have a corresponding edge with matching sourceHandle — never create a button with no exit path. This is the #1 failure mode; check it before returning.
2. Keep node ids short (n1, n2, n3...) and edge ids short (e1, e2...).
3. Always include a "Back to menu" style path so the user is never stuck at a dead end.
4. Do not invent business details (prices, addresses, phone numbers) beyond what the user's description implies — use clearly generic placeholder text instead, e.g. "[Add your store address]".
5. Output must be valid JSON parseable by JSON.parse with no trailing commas.
6. For location-type messages, use send_message with mediaType: "" and _locationData: { latitude, longitude, name, address }.
7. ALWAYS add placeholder images to send_question and send_message nodes when the flow involves showcasing products, collections, or visual content. Use this exact placeholder URL: "https://placehold.co/600x400/e5ddd5/075E54?text=Upload+Your+Image" with mediaType: "image". The user will replace these with real images via the upload feature. Do NOT add mediaUrl to list-type send_question nodes — list headers are text-only.
8. For video content, use mediaUrl: "https://placehold.co/600x400/e5ddd5/075E54?text=Upload+Your+Video" with mediaType: "video".
9. For document/PDF content, use mediaUrl: "https://placehold.co/600x400/e5ddd5/075E54?text=Upload+Your+Document" with mediaType: "document" and mediaFileName: "sample.pdf".
10. Do NOT worry about node positions (x, y) — the system auto-layouts all nodes after generation. You can set position to { x: 0, y: 0 } for all nodes.
11. NEVER add more than 3 buttons to a quick_reply send_question node — use buttonType: "list" instead if more options are needed.
12. NEVER add audio mediaType to a send_question node — audio is not valid as an interactive header. Use send_message for audio.
13. No two buttons on the same node may share an identical "label".
14. Total buttons on a single node must not exceed 10 (WhatsApp's absolute max for list rows).

QUALITY CHECKS (avoid these before outputting):
- A button label within 2 characters of its limit that looks awkwardly cut off (ends mid-word, trailing "..." with no closing thought) — shorten or reword it.
- A node's "text" unusually close to its limit in a way that suggests important information might be missing (e.g. an incomplete sentence at the end) — trim or rephrase to fit cleanly.`;

const EDIT_SYSTEM_PROMPT = `You are a flow-editing engine for a WhatsApp chatbot visual builder (React Flow based). You will receive the CURRENT flow JSON (nodes + edges) and an EDIT INSTRUCTION describing what to change. Apply ONLY the requested changes while preserving everything else. Output ONLY the complete modified JSON object — no prose, no markdown fences:

{
  "id": "<keep existing>",
  "name": "<keep existing>",
  "description": "<keep existing>",
  "triggerKeyword": "<keep existing>",
  "triggerMode": "<keep existing>",
  "isActive": <keep existing>,
  "nodes": [ ... ],
  "edges": [ ... ]
}

NODE TYPES:
- "keyword_trigger": data = { label, keywords: string[], matchMode: "contains" }. Always exactly one, always id "n1".
- "send_question": data = { label, text, mediaUrl?, mediaType?, buttonType: "quick_reply" | "list", buttons: [{id, label, description?}], timeoutMinutes: 30 }. Max 3 buttons for quick_reply, max 10 for list. Each button label under 20 characters.
- "send_message": data = { label, text, mediaUrl?, mediaType?, mediaFileName? }. mediaType can be "image", "video", "audio", or "document". For location, use _locationData: { latitude, longitude, name, address }.
- "goto": data = { label, targetFlowId, targetNodeId, targetNodeLabel }. Use for "back to menu" loops.

WHATSAPP CLOUD API LIMITS (MUST OBEY):
- Node with ≤3 buttons (reply-button message): each label ≤ 20 characters, node "text" ≤ 1024 characters.
- Node with >3 buttons (list message): each label ≤ 24 characters, node "text" ≤ 4096 characters, and mediaUrl must NOT be present (list messages can't have a media header).
- Button labels must be unique within a node.
- mediaType must be "image" (.jpg/.jpeg/.png), "video" (.mp4/.3gp), or "document" (.pdf/.doc/.docx/.xls/.xlsx/.ppt/.pptx/.txt) — never "audio" or "sticker".
- If an edit would push a node's text or a button label over its limit, shorten it rather than leaving it over the limit — never output text/labels that violate these limits.

EDIT RULES:
1. Return the FULL flow (all unchanged nodes/edges included), not just a diff or the changed portion.
2. Preserve existing node ids and edge ids wherever possible — only add new ids for new nodes/edges.
3. When adding a node, use the next available n# id. Do NOT worry about position — the system auto-layouts all nodes. Wire it in with real edges — do not add a node without connecting it to something.
4. When removing a node, also remove every edge that referenced it (as source or target). If that leaves another node's button dangling, either rewire that button elsewhere sensible (e.g. back to the menu) or remove the button — never leave a button with no edge.
5. When modifying a node's data (e.g. changing text or buttons), keep the same id and only change the relevant fields. If the instruction changes button text, keep the same button "id" so existing edges keep working — only change "label", and keep it within the limit above.
6. If an edit causes a node to cross from ≤3 buttons to >3 buttons (or vice versa), re-check that node against the corresponding limit tier above, and strip any mediaUrl if it now has >3 buttons.
7. Every button on every send_question node MUST have a corresponding edge with matching sourceHandle.
8. Ensure the flow remains valid — no dead ends, no orphaned nodes (unless intentionally terminal).
9. Do not invent business details beyond what's implied by the instruction or the existing flow.
10. Output must be valid JSON parseable by JSON.parse with no trailing commas.
11. Return the COMPLETE flow with all nodes and edges (not just the changes).
12. When adding new nodes with visual content, use placeholder image URL: "https://placehold.co/600x400/e5ddd5/075E54?text=Upload+Your+Image" with mediaType: "image". Preserve any existing real mediaUrl values from the current flow. Do NOT add mediaUrl to list-type send_question nodes.
13. NEVER add more than 3 buttons to a quick_reply send_question node — use buttonType: "list" instead if more options are needed.
14. NEVER add audio mediaType to a send_question node — audio is not valid as an interactive header. Use send_message for audio.

MANDATORY SELF-CHECK — perform silently before outputting, on the FULL resulting graph (not just your edit):
  a. List every "send_question" node and every button id in its buttons array.
  b. List every edge's source + sourceHandle.
  c. Confirm every (node, button) pair from (a) has a matching edge in (b).
  d. Confirm every node except the trigger is reachable from the trigger by following edges — no orphans left behind by your edit.
  e. For every send_question node, confirm its label/text lengths and mediaUrl presence match the limit tier for its current button count (see limits above) — including nodes you didn't directly touch, in case your edit changed their button count indirectly.
  f. Confirm no duplicate button labels within any single node, and no mediaType other than image/video/document.
  g. If anything fails (c), (d), (e), or (f), fix it (rewire, shorten, or remove) before producing final output. Never return a flow with an unwired button, an orphaned node, or a Meta limit violation, even as a side effect of an unrelated change.
  h. Check for quality issues: button labels within 2 characters of their limit that look awkwardly cut off (ends mid-word, trailing "..." with no closing thought), or node "text" unusually close to its limit suggesting incomplete information (e.g. an incomplete sentence at the end). Fix these by shortening or rephrasing.
  i. Do not describe this check in your output — output only the final JSON object.`;

// ── Mistral provider ──────────────────────────────────────────────────────────
async function callMistral(description, apiKey) {
    const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MISTRAL_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: description },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mistral API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Mistral returned no content');

    return raw;
}

async function callMistralEdit(currentFlow, instruction, apiKey) {
    const flowSummary = {
        id: currentFlow.id,
        name: currentFlow.name,
        description: currentFlow.description,
        triggerKeyword: currentFlow.triggerKeyword,
        triggerMode: currentFlow.triggerMode,
        isActive: currentFlow.isActive,
        nodes: currentFlow.nodes,
        edges: currentFlow.edges,
    };

    const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MISTRAL_MODEL,
            messages: [
                { role: 'system', content: EDIT_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `CURRENT FLOW JSON:\n${JSON.stringify(flowSummary, null, 2)}\n\nEDIT INSTRUCTION:\n${instruction}`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mistral API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Mistral returned no content');

    return raw;
}

// ── Gemini provider ───────────────────────────────────────────────────────────
async function callGemini(description, apiKey) {
    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
                { role: 'user', parts: [{ text: description }] },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini returned no content');

    return raw;
}

async function callGeminiEdit(currentFlow, instruction, apiKey) {
    const flowSummary = {
        id: currentFlow.id,
        name: currentFlow.name,
        description: currentFlow.description,
        triggerKeyword: currentFlow.triggerKeyword,
        triggerMode: currentFlow.triggerMode,
        isActive: currentFlow.isActive,
        nodes: currentFlow.nodes,
        edges: currentFlow.edges,
    };

    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: EDIT_SYSTEM_PROMPT }] },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `CURRENT FLOW JSON:\n${JSON.stringify(flowSummary, null, 2)}\n\nEDIT INSTRUCTION:\n${instruction}` }],
                },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini returned no content');

    return raw;
}

/**
 * Generates a React Flow compatible flow JSON from a plain-language
 * description of a WhatsApp bot.
 *
 * @param {string} description - e.g. "A jewellery store bot that shows ring collections and lets users book appointments"
 * @param {string} [apiKey] - API key (defaults to env var)
 * @returns {Promise<object>} Flow JSON with { id, name, description, triggerKeyword, triggerMode, isActive, nodes, edges }
 */
export async function generateFlowFromDescription(description, apiKey) {
    const provider = process.env.AI_PROVIDER || 'mistral';
    const key = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.MISTRAL_API_KEY);
    if (!key) {
        const envVar = provider === 'gemini' ? 'GEMINI_API_KEY' : 'MISTRAL_API_KEY';
        throw new Error(`${envVar} is not set in environment variables.`);
    }

    const raw = provider === 'gemini'
        ? await callGemini(description, key)
        : await callMistral(description, key);

    let flow;
    try {
        flow = JSON.parse(raw);
    } catch (e) {
        throw new Error(`AI returned invalid JSON: ${e.message}`);
    }

    // Basic validation
    if (!flow.nodes || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
        throw new Error('AI returned flow with no nodes.');
    }

    const hasTrigger = flow.nodes.some((n) => n.type === 'keyword_trigger');
    if (!hasTrigger) {
        throw new Error('AI returned flow with no keyword_trigger node.');
    }

    return flow;
}

/**
 * Edits an existing React Flow graph using AI based on a plain-language
 * instruction. Sends the current flow JSON to the AI and returns the
 * modified version.
 *
 * @param {object} currentFlow - The current flow { id, name, nodes, edges, ... }
 * @param {string} instruction - e.g. "Add a video node after the welcome message" or "Change the button text to 'Shop Now'"
 * @param {string} [apiKey] - API key (defaults to env var)
 * @returns {Promise<object>} Modified flow JSON with { id, name, nodes, edges, ... }
 */
export async function editFlowFromDescription(currentFlow, instruction, apiKey) {
    const provider = process.env.AI_PROVIDER || 'mistral';
    const key = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.MISTRAL_API_KEY);
    if (!key) {
        const envVar = provider === 'gemini' ? 'GEMINI_API_KEY' : 'MISTRAL_API_KEY';
        throw new Error(`${envVar} is not set in environment variables.`);
    }

    const raw = provider === 'gemini'
        ? await callGeminiEdit(currentFlow, instruction, key)
        : await callMistralEdit(currentFlow, instruction, key);

    let flow;
    try {
        flow = JSON.parse(raw);
    } catch (e) {
        throw new Error(`AI returned invalid JSON: ${e.message}`);
    }

    if (!flow.nodes || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
        throw new Error('AI returned edited flow with no nodes.');
    }

    return flow;
}

/**
 * Provider registry — allows adding new AI providers in the future.
 * Each provider must implement: async generateFlow(description, apiKey) -> flowObject
 */
export const aiProviders = {
    mistral: { generateFlow: generateFlowFromDescription, editFlow: editFlowFromDescription },
    gemini: { generateFlow: generateFlowFromDescription, editFlow: editFlowFromDescription },
};

/**
 * Returns the active AI provider based on env config.
 * Set AI_PROVIDER=gemini in .env to switch to Gemini.
 * Defaults to 'mistral'.
 */
export function getActiveProvider() {
    const providerName = process.env.AI_PROVIDER || 'mistral';
    return aiProviders[providerName] || aiProviders.mistral;
}
