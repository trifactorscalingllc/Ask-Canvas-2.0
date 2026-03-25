import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Lazy clients to prevent build-time errors
let _supabase: any = null;
let _auditorAi: OpenAI | null = null;

function getSupabase() {
    if (_supabase) return _supabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key);
    return _supabase;
}

function getAuditorAi() {
    if (_auditorAi) return _auditorAi;
    const key = process.env.CEREBRAS_API_KEY;
    if (!key) return null;
    _auditorAi = new OpenAI({
        baseURL: 'https://api.cerebras.ai/v1',
        apiKey: key,
    });
    return _auditorAi;
}

export async function gradeResponse(opts: {
    userId?: string;
    chatId?: string;
    userPrompt: string;
    agentResponse: string;
    history: any[];
}) {
    const { userId, chatId, userPrompt, agentResponse, history } = opts;

    const auditPrompt = `You are an AI Quality Auditor for "Ask Canvas".
Your task is to analyze the student's prompt and evaluate the agent's performance.

[INPUT]
- Student Prompt: "${userPrompt}"
- Agent Response Content: "${agentResponse}"
- Internal Iterations: ${history.length}
- Status: ${agentResponse.includes('processing limits') ? 'TIMED_OUT' : 'COMPLETE'}

[EVALUATION RULES]
1. COMPARE the final response to the user's ORIGINAL INTENT.
2. If the response is blank or just a timeout message, the score MUST be below 3.
3. If the response missed a specific request (like "reference Spring semester"), deduct points.
4. Score accurately based on the actual value delivered to the student.

[OUTPUT FORMAT]
Response ONLY with JSON:
{
  "score": number (1-10),
  "description": "Why did it get this score? Mention accuracy vs intent.",
  "improvement_suggestion": "What specific technical fix (e.g. 'faster tool call', 'better prompt') is needed?"
}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[AUDITOR] CRITICAL ERROR: Supabase credentials missing.', { url: !!supabaseUrl, key: !!supabaseKey });
        return null;
    }

    const supabase = getSupabase();
    const auditorAi = getAuditorAi();

    if (!supabase || !auditorAi) {
        console.error('[AUDITOR] CRITICAL: Failed to initialize clients.');
        return null;
    }

    try {
        console.log(`[AUDITOR] Auditing response for student: ${userId}`);

        const response = await auditorAi.chat.completions.create({
            model: 'qwen-3-235b-a22b-instruct-2507', // Using correct model name from user's route.ts
            messages: [{ role: 'system', content: auditPrompt }],
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content || '{}';
        const auditResult = JSON.parse(content);

        console.log(`[AUDITOR] Evaluation complete. Result: Score=${auditResult.score}/10`);

        // 1. Log to independent audit table
        const { error: insertError } = await supabase.from('response_quality_logs').insert({
            user_id: userId || null,
            user_prompt: userPrompt,
            agent_response: agentResponse,
            internal_logs: history,
            score: auditResult.score || 0,
            description: auditResult.description || 'N/A',
            improvement_suggestion: auditResult.improvement_suggestion || 'N/A'
        });

        if (insertError) console.error('[AUDITOR] Database Insert Error:', insertError);

        // 2. Reflect score back (internal only)
        if (chatId) {
            const { data: chat } = await supabase.from('chats').select('messages').eq('id', chatId).single();
            if (chat && chat.messages) {
                const updatedMessages = [...chat.messages];
                const lastMsg = updatedMessages[updatedMessages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    // Still save to metadata for future internal analysis, just not displayed in UI
                    (lastMsg as any).audit = auditResult;
                    await supabase.from('chats').update({ messages: updatedMessages, updated_at: new Date().toISOString() }).eq('id', chatId);
                }
            }
        }

        return auditResult;
    } catch (err) {
        console.error('[AUDITOR] Logic Error:', err);
        return null;
    }
}
