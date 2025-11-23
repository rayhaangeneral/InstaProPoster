import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/jobs
 * Get all scheduled jobs, optionally filtered by status
 * 
 * Query params: ?status=pending|processing|published|failed
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const id = searchParams.get('id');

        let query = supabase
            .from('scheduled_posts')
            .select('*')
            .order('scheduled_for', { ascending: true });

        // Filter by status if provided
        if (status) {
            query = query.eq('status', status);
        }

        // Filter by ID if provided
        if (id) {
            query = query.eq('id', id);
        }

        const { data, error } = await query;

        if (error) throw error;

        console.log(`✅ Retrieved ${data.length} jobs${status ? ` with status: ${status}` : ''}`);

        return NextResponse.json({
            success: true,
            jobs: data,
            count: data.length
        });

    } catch (error) {
        console.error('❌ Error fetching jobs:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/jobs?id=xxx
 * Delete a scheduled job by ID
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('id');

        if (!jobId) {
            return NextResponse.json(
                { success: false, error: 'Job ID required' },
                { status: 400 }
            );
        }

        console.log(`🗑️  Deleting job: ${jobId}`);

        const { error } = await supabase
            .from('scheduled_posts')
            .delete()
            .eq('id', jobId);

        if (error) throw error;

        console.log(`✅ Job deleted successfully`);

        return NextResponse.json({
            success: true,
            message: 'Job deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting job:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/jobs?id=xxx
 * Update a job's schedule or status
 * 
 * Body: { scheduledFor?, status? }
 */
export async function PATCH(request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('id');
        const body = await request.json();

        if (!jobId) {
            return NextResponse.json(
                { success: false, error: 'Job ID required' },
                { status: 400 }
            );
        }

        const updates = {};
        if (body.scheduledFor) updates.scheduled_for = body.scheduledFor;
        if (body.status) updates.status = body.status;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No updates provided' },
                { status: 400 }
            );
        }

        console.log(`✏️  Updating job ${jobId}:`, updates);

        const { data, error } = await supabase
            .from('scheduled_posts')
            .update(updates)
            .eq('id', jobId)
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ Job updated successfully`);

        return NextResponse.json({
            success: true,
            job: data
        });

    } catch (error) {
        console.error('❌ Error updating job:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
