import { createClient } from '@supabase/supabase-js';

// Lazy client to prevent build-time errors
let _supabase: any = null;
function getSupabase() {
    if (_supabase) return _supabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key);
    return _supabase;
}

export async function updateModelAvailability(token: string) {
    try {
        const response = await fetch('https://api.cerebras.ai/v1/models', {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
        const data = await response.json();

        const supabase = getSupabase();
        if (!supabase) return data;

        const { error } = await supabase.from('system_status').upsert({
            key: 'cerebras_models',
            value: data,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error('[MONITOR] Supabase Upsert Error (Models):', error);
        } else {
            console.log('[MONITOR] Models updated in DB');
        }

        return data;
    } catch (err) {
        console.error('[MONITOR] Process Error (Models):', err);
        return null;
    }
}

export async function updateRateLimits(headers: Headers) {
    const limits = {
        requests_limit: headers.get('x-ratelimit-limit-requests'),
        requests_remaining: headers.get('x-ratelimit-remaining-requests'),
        requests_reset: headers.get('x-ratelimit-reset-requests'),
        tokens_limit: headers.get('x-ratelimit-limit-tokens'),
        tokens_remaining: headers.get('x-ratelimit-remaining-tokens'),
        tokens_reset: headers.get('x-ratelimit-reset-tokens'),
    };

    try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { error } = await supabase.from('system_status').upsert({
            key: 'cerebras_rate_limits',
            value: limits,
            updated_at: new Date().toISOString()
        });
        if (error) console.error('[MONITOR] Supabase Upsert Error (Limits):', error);
        else console.log('[MONITOR] Rate limits updated in DB');
    } catch (err) {
        console.error('[MONITOR] Process Error (Limits):', err);
    }
}

export async function getProviderStatus() {
    try {
        const supabase = getSupabase();
        if (!supabase) return null;
        const { data, error } = await supabase.from('system_status').select('*');
        if (error) {
            console.error('[MONITOR] Supabase Fetch Error (Status):', error);
            return null;
        }
        return data?.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
    } catch (err) {
        console.error('[MONITOR] Process Error (Status):', err);
        return null;
    }
}
