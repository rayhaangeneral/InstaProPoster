import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to test connection
export async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('scheduled_posts')
            .select('count')
            .limit(1);

        if (error) throw error;
        return { success: true, message: 'Supabase connection successful' };
    } catch (error) {
        return {
            success: false,
            message: 'Supabase connection failed',
            error: error.message
        };
    }
}
