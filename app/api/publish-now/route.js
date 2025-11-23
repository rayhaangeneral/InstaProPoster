import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createMediaContainer, waitForProcessing, publishMedia } from '@/lib/instagram';

/**
 * POST /api/publish-now
 * Immediately publish a scheduled post to Instagram
 * NO TIMEOUT - will wait as long as needed for video processing
 * 
 * Body: { jobId: uuid }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { success: false, error: 'Job ID required' },
                { status: 400 }
            );
        }

        console.log(`🚀 Starting immediate publish for job: ${jobId}`);

        // Get job from database
        const { data: job, error: fetchError } = await supabase
            .from('scheduled_posts')
            .select('*')
            .eq('id', jobId)
            .single();

        if (fetchError) throw fetchError;

        if (!job) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        console.log(`📹 Publishing: ${job.filename}`);

        // Update status to "processing"
        await supabase
            .from('scheduled_posts')
            .update({ status: 'processing' })
            .eq('id', jobId);

        // Create Instagram media container
        const containerResult = await createMediaContainer(job.video_url, job.caption);

        if (!containerResult.success) {
            await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: containerResult.error
                })
                .eq('id', jobId);

            return NextResponse.json({
                success: false,
                error: containerResult.error
            });
        }

        const creationId = containerResult.creationId;
        console.log(`✅ Container created: ${creationId}`);

        // Save creation_id to database
        await supabase
            .from('scheduled_posts')
            .update({ creation_id: creationId })
            .eq('id', jobId);

        // Wait for Instagram to process video
        console.log('⏳ Waiting for Instagram to process video...');
        const processingResult = await waitForProcessing(creationId, (msg) => {
            console.log(`⏳ ${msg}`);
        });

        if (!processingResult.success) {
            const errorMsg = processingResult.error || 'Video processing failed';
            console.error(`❌ ${errorMsg}`);

            await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: errorMsg
                })
                .eq('id', jobId);

            return NextResponse.json({
                success: false,
                error: errorMsg
            });
        }

        console.log(`✅ Video ready after ${processingResult.attempts}s! Publishing...`);

        // Publish to Instagram
        const publishResult = await publishMedia(creationId);

        if (!publishResult.success) {
            await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: publishResult.error
                })
                .eq('id', jobId);

            return NextResponse.json({
                success: false,
                error: publishResult.error
            });
        }

        // Update database as "published"
        await supabase
            .from('scheduled_posts')
            .update({
                status: 'published',
                published_id: publishResult.publishedId,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId);

        console.log(`🎉 Successfully published! Post ID: ${publishResult.publishedId}`);

        return NextResponse.json({
            success: true,
            publishedId: publishResult.publishedId,
            message: 'Successfully published to Instagram',
            instagramUrl: `https://www.instagram.com/p/${publishResult.publishedId}/`
        });

    } catch (error) {
        console.error('❌ Error publishing now:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
