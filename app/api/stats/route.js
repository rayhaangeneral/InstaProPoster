import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/stats
 * Get statistics about scheduled posts
 * Returns counts for each status and overall totals
 */
export async function GET() {
    try {
        console.log('📊 Fetching statistics...');

        // Get all jobs to calculate stats
        const { data: allJobs, error } = await supabase
            .from('scheduled_posts')
            .select('status, scheduled_for, created_at');

        if (error) throw error;

        // Calculate counts by status using reduce
        const stats = allJobs.reduce((acc, job) => {
            acc.total++;
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, { total: 0, pending: 0, processing: 0, published: 0, failed: 0 });

        // Find next scheduled post
        const now = new Date().toISOString();
        const nextPending = allJobs
            .filter(j => j.status === 'pending' && j.scheduled_for > now)
            .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))[0];

        // Find most recent published post
        const recentPublished = allJobs
            .filter(j => j.status === 'published')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            [0];

        console.log(`📊 Stats computed: ${stats.total} total, ${stats.pending} pending, ${stats.published} published`);

        return NextResponse.json({
            success: true,
            stats,
            next: nextPending ? {
                scheduledFor: nextPending.scheduled_for,
                timeUntil: Math.round((new Date(nextPending.scheduled_for) - new Date()) / 60000) // minutes
            } : null,
            lastPublished: recentPublished ? {
                publishedAt: recentPublished.created_at
            } : null
        });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
