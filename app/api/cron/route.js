import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createMediaContainer, waitForProcessing, publishMedia } from '@/lib/instagram';

/**
 * GET /api/cron
 * Cron worker endpoint - finds and publishes due posts automatically
 * NO TIMEOUT - will wait as long as needed for each video
 * Should be called every minute by a cron service
 */
export async function GET() {
    const startTime = Date.now();

    try {
        console.log('🔄 Cron job started:', new Date().toISOString());

        // Get all pending jobs that are due
        const now = new Date().toISOString();

        const { data: jobs, error } = await supabase
            .from('scheduled_posts')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', now) // Due now or in the past
            .order('scheduled_for', { ascending: true })
            .limit(5); // Process max 5 at a time

        if (error) throw error;

        console.log(`📋 Found ${jobs.length} jobs to process`);

        if (jobs.length === 0) {
            return NextResponse.json({
                success: true,
                processed: 0,
                message: 'No jobs due for publishing'
            });
        }

        const results = [];

        // Process each job
        for (const job of jobs) {
            console.log(`\n📹 Processing job ${job.id}: ${job.filename}`);

            try {
                // Update status to processing
                await supabase
                    .from('scheduled_posts')
                    .update({ status: 'processing' })
                    .eq('id', job.id);

                // Create media container
                const containerResult = await createMediaContainer(job.video_url, job.caption);

                if (!containerResult.success) {
                    await supabase
                        .from('scheduled_posts')
                        .update({
                            status: 'failed',
                            error_message: containerResult.error
                        })
                        .eq('id', job.id);

                    results.push({
                        jobId: job.id,
                        filename: job.filename,
                        success: false,
                        error: containerResult.error
                    });
                    continue;
                }

                const creationId = containerResult.creationId;
                console.log(`  ✅ Container created: ${creationId}`);

                await supabase
                    .from('scheduled_posts')
                    .update({ creation_id: creationId })
                    .eq('id', job.id);

                // Wait for video processing
                console.log(`  ⏳ ${job.filename}: Waiting for video processing...`);
                const processingResult = await waitForProcessing(creationId, (msg) => {
                    console.log(`  ⏳ ${job.filename}: ${msg}`);
                });

                if (!processingResult.success) {
                    const errorMsg = processingResult.error || 'Video processing failed';
                    console.error(`  ❌ ${job.filename}: ${errorMsg}`);

                    await supabase
                        .from('scheduled_posts')
                        .update({
                            status: 'failed',
                            error_message: errorMsg
                        })
                        .eq('id', job.id);

                    results.push({
                        jobId: job.id,
                        filename: job.filename,
                        success: false,
                        error: errorMsg
                    });
                    continue;
                }

                console.log(`  ✅ ${job.filename}: Ready after ${processingResult.attempts}s! Publishing...`);

                // Publish media
                const publishResult = await publishMedia(creationId);

                if (!publishResult.success) {
                    await supabase
                        .from('scheduled_posts')
                        .update({
                            status: 'failed',
                            error_message: publishResult.error
                        })
                        .eq('id', job.id);

                    results.push({
                        jobId: job.id,
                        filename: job.filename,
                        success: false,
                        error: publishResult.error
                    });
                    continue;
                }

                // Success! Update database
                await supabase
                    .from('scheduled_posts')
                    .update({
                        status: 'published',
                        published_id: publishResult.publishedId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', job.id);

                console.log(`  🎉 Successfully published job ${job.id}`);

                results.push({
                    jobId: job.id,
                    filename: job.filename,
                    success: true,
                    publishedId: publishResult.publishedId
                });

            } catch (error) {
                console.error(`  ❌ Error processing job ${job.id}:`, error);

                await supabase
                    .from('scheduled_posts')
                    .update({
                        status: 'failed',
                        error_message: error.message
                    })
                    .eq('id', job.id);

                results.push({
                    jobId: job.id,
                    filename: job.filename,
                    success: false,
                    error: error.message
                });
            }
        }

        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;

        console.log(`\n✅ Cron job completed in ${duration}ms`);
        console.log(`📊 Results: ${successCount}/${jobs.length} successful`);

        return NextResponse.json({
            success: true,
            processed: jobs.length,
            successful: successCount,
            failed: jobs.length - successCount,
            duration: `${duration}ms`,
            results
        });

    } catch (error) {
        console.error('❌ Cron job error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
