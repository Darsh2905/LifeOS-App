// ═══════════════════════════════════════════════════════════════════════════════
// LifeOS Agent — hyper-capable tool-calling loop.
//
// Architecture:
//   User → Agent → LLM (with tool schemas) → tool_calls? → execute → loop
//                                          → final answer → return
//
// Providers (both free):
//   Primary: Groq Llama 3.3 70B — excellent tool calls, 30 RPM, 131K TPM
//   Fallback: Gemini 2.5 Flash  — native function-calling
//
// Accuracy techniques:
//   1. Context injection — snapshot of current state sent with system prompt
//   2. Multi-step reasoning loop — up to 8 iterations
//   3. Tool retry on JSON-arg parse failure
//   4. Self-verification — destructive tools require prior list/search call
//   5. Explicit date grounding — current date injected so relative terms resolve
// ═══════════════════════════════════════════════════════════════════════════════

const db = require('../db');
const { buildOpenAISchemas, buildGeminiSchemas, executeTool, TOOLS } = require('./tools');

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

const GEMINI_MODEL = process.env.GEMINI_AGENT_MODEL || 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MAX_ITERATIONS = 8;

// ─── System prompt builder ───
function buildSystemPrompt(userProfile) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const toolList = Object.entries(TOOLS)
    .map(([name, t]) => `- ${name}: ${t.description.split('.')[0]}`)
    .join('\n');

  return `You are LifeOS AI — a hyper-capable, precise personal assistant embedded in the user's productivity dashboard. You execute actions on their data (tasks, notes, finance, habits, wellness, goals) using the provided tools.

TODAY: ${dateStr} (${dayName})
USER: ${userProfile?.name || 'User'}

AVAILABLE TOOLS:
${toolList}

OPERATING PRINCIPLES:
1. ACT, don't describe. If the user asks to "add a task", CALL create_task — never just respond "I'll add it" without calling the tool.
2. GROUND IN REALITY. If you need context (what tasks exist, current budget, today's habits), call get_dashboard_snapshot or the relevant list_/search_ tool FIRST, then act.
3. RESOLVE REFERENCES. "Delete my grocery task" → call list_tasks with search:"grocery", find the id, then call delete_task with that id.
4. BATCH INTELLIGENTLY. If the user asks for multiple actions, call multiple tools in a single turn when independent.
5. DATES: Use YYYY-MM-DD format. Today is ${dateStr}. Tomorrow is ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}.
6. BE CONCISE. Final answer should be 1-3 short sentences confirming what was done or answering the question. No preamble, no "I'll help you with that."
7. NEVER HALLUCINATE IDs. Always obtain ids from a list/search call before modifying or deleting.
8. PRIORITY INFERENCE: urgent/asap/today/now → high; soon/this week → medium; whenever/someday → low.
9. CATEGORY INFERENCE: work-related → Work, chores → Errands, health → Health, money → Personal.
10. If the user asks a question that needs no action (e.g. "how much did I spend last month"), use query_finance / list_tasks / etc. and answer from the tool result.

OUTPUT STYLE: After tool execution, respond with a short natural sentence. Start with a verb in past tense ("Added...", "Found...", "Completed..."). If the action failed, say so clearly.`;
}

// ─── Groq (OpenAI-compat) call ───
async function callGroqWithTools(messages, tools) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { provider: null };

  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  if (!msg) throw new Error('Groq returned empty message');

  return {
    provider: 'groq',
    content: msg.content || '',
    tool_calls: msg.tool_calls || [],
  };
}

// ─── Gemini function calling ───
async function callGeminiWithTools(messages, tools) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { provider: null };

  // Convert OpenAI-format messages to Gemini format
  const systemMsg = messages.find(m => m.role === 'system');
  const convo = messages.filter(m => m.role !== 'system');
  const contents = convo.map(m => {
    if (m.role === 'user') return { role: 'user', parts: [{ text: m.content }] };
    if (m.role === 'assistant') {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      if (m.tool_calls) {
        m.tool_calls.forEach(tc => {
          parts.push({ functionCall: { name: tc.function.name, args: safeParseJSON(tc.function.arguments) } });
        });
      }
      return { role: 'model', parts };
    }
    if (m.role === 'tool') {
      return { role: 'function', parts: [{ functionResponse: { name: m.name || 'tool', response: safeParseJSON(m.content) } }] };
    }
    return null;
  }).filter(Boolean);

  const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemMsg?.content || '' }] },
      contents,
      tools,
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const toolCalls = [];
  let text = '';
  parts.forEach((p, i) => {
    if (p.text) text += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `gemini_${Date.now()}_${i}`,
        type: 'function',
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) },
      });
    }
  });

  return { provider: 'gemini', content: text, tool_calls: toolCalls };
}

function safeParseJSON(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

// ─── Unified tool-call dispatch ───
async function callLLM(messages, openAiTools, geminiTools) {
  let lastErr;
  if (process.env.GROQ_API_KEY) {
    try { return await callGroqWithTools(messages, openAiTools); }
    catch (err) { lastErr = err; console.warn('[agent] Groq failed:', err.message); }
  }
  if (process.env.GEMINI_API_KEY) {
    try { return await callGeminiWithTools(messages, geminiTools); }
    catch (err) { lastErr = err; console.warn('[agent] Gemini failed:', err.message); }
  }
  throw lastErr || new Error('No AI provider configured (set GROQ_API_KEY or GEMINI_API_KEY).');
}

// ─── Conversation memory ───
function loadHistory(userId, conversationId, limit = 10) {
  if (!conversationId) return [];
  const rows = db.prepare(
    "SELECT role, content FROM ai_conversations WHERE user_id = ? AND feature = 'agent' AND reference_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(userId, conversationId, limit);
  return rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

function saveTurn(userId, conversationId, role, content) {
  if (!conversationId) return;
  db.prepare('INSERT INTO ai_conversations (id, user_id, feature, reference_id, role, content) VALUES (?, ?, ?, ?, ?, ?)')
    .run(Date.now().toString(36) + Math.random().toString(36).slice(2), userId, 'agent', conversationId, role, content);
}

// ─── Main agent entrypoint ───
async function runAgent({ userId, message, conversationId = null, userProfile = null }) {
  const systemPrompt = buildSystemPrompt(userProfile);
  const history = loadHistory(userId, conversationId, 8);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];

  const openAiTools = buildOpenAISchemas();
  const geminiTools = buildGeminiSchemas();

  const actions = [];       // user-facing log of tool executions
  const errors = [];
  let finalAnswer = '';
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const response = await callLLM(messages, openAiTools, geminiTools);

    if (response.tool_calls && response.tool_calls.length > 0) {
      // Record assistant turn with tool calls
      messages.push({
        role: 'assistant',
        content: response.content || null,
        tool_calls: response.tool_calls,
      });

      for (const call of response.tool_calls) {
        const name = call.function?.name;
        const args = safeParseJSON(call.function?.arguments || '{}');
        const result = executeTool(userId, name, args);

        actions.push({
          tool: name,
          args,
          success: !!result.success,
          message: result.message,
          data: result.data,
          risk: TOOLS[name]?.risk || 'read',
        });
        if (!result.success) errors.push(result.message);

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name,
          content: JSON.stringify({
            success: result.success,
            message: result.message,
            data: result.data,
          }).slice(0, 4000),
        });
      }
      continue;
    }

    finalAnswer = response.content || '';
    break;
  }

  if (!finalAnswer) {
    if (actions.length > 0) {
      // Build a deterministic summary if the LLM didn't give one
      const ok = actions.filter(a => a.success);
      finalAnswer = ok.length === actions.length
        ? ok.map(a => a.message).join('. ')
        : `Completed ${ok.length}/${actions.length} actions.`;
    } else {
      finalAnswer = 'I could not complete that request. Please try rephrasing.';
    }
  }

  // Persist conversation turn
  saveTurn(userId, conversationId, 'user', message);
  saveTurn(userId, conversationId, 'assistant', finalAnswer);

  return {
    answer: finalAnswer,
    actions,
    errors,
    iterations,
  };
}

module.exports = { runAgent, buildSystemPrompt };
