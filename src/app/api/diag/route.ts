import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    const diagnostics: any = {
        env: {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_URL_METADATA: process.env.NEXT_PUBLIC_SUPABASE_URL ? {
                length: process.env.NEXT_PUBLIC_SUPABASE_URL.length,
                startsWithHttps: process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://'),
                prefix: process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 8),
            } : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
        },
        supabase: {
            status: 'untested',
            error: null,
            testResults: null
        }
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // 1. READ TEST
            const { error: readError } = await supabase.from('system_status').select('key').limit(1);

            // 2. WRITE TEST (Self-cleaning)
            const { data: writeData, error: writeError } = await supabase
                .from('response_quality_logs')
                .insert({
                    user_prompt: 'DIAGNOSTIC_WRITE_PROMPT',
                    agent_response: 'DIAGNOSTIC_WRITE_RESPONSE',
                    score: 0,
                    description: 'This is a test entry from /api/diag. It can be safely deleted.'
                })
                .select();

            diagnostics.supabase.status = (readError || writeError) ? 'partial_failure' : 'connected';
            diagnostics.supabase.testResults = {
                read: readError ? `FAIL: ${readError.message}` : 'SUCCESS',
                write: writeError ? `FAIL: ${writeError.message}` : 'SUCCESS',
                insertedId: writeData?.[0]?.id || null
            };
            diagnostics.supabase.error = writeError || readError;

        } catch (err: any) {
            diagnostics.supabase.status = 'exception';
            diagnostics.supabase.error = err.message;
        }
    } else {
        diagnostics.supabase.status = 'skipped_missing_keys';
    }

    return NextResponse.json(diagnostics);
}
