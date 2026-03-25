import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    const diagnostics = {
        env: {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
        },
        supabase: {
            status: 'untested',
            error: null as any,
        }
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Test insert to response_quality_logs (can be deleted/ignored)
            // Just a read test is safer
            const { data, error } = await supabase.from('system_status').select('key').limit(1);

            if (error) {
                diagnostics.supabase.status = 'failed';
                diagnostics.supabase.error = error;
            } else {
                diagnostics.supabase.status = 'connected';
            }
        } catch (err: any) {
            diagnostics.supabase.status = 'exception';
            diagnostics.supabase.error = err.message;
        }
    } else {
        diagnostics.supabase.status = 'skipped_missing_keys';
    }

    return NextResponse.json(diagnostics);
}
