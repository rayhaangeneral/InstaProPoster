import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/schedule
 * Schedule a single post
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { filename, videoUrl, caption, scheduledFor } = body;

        if (!filename || !videoUrl || !scheduledFor) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: filename, videoUrl, scheduledFor' },
                { status: 400 }
            );
        }

        console.log(`📅 Scheduling post: ${filename} for ${scheduledFor}`);

        const { data, error } = await supabase
            .from('scheduled_posts')
            .insert([{
                filename,
                video_url: videoUrl,
                caption: caption || '',
                scheduled_for: scheduledFor,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ Post scheduled successfully: ID ${data.id}`);

        return NextResponse.json({ success: true, job: data });

    } catch (error) {
        console.error('❌ Error scheduling post:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/schedule
 * Bulk schedule with FIXED DAILY TIMES (e.g., 8 AM & 5 PM every day)
 */
export async function PUT(request) {
    try {
        const body = await request.json();
        const { videos, startDate, postsPerDay } = body;

        if (!videos || !Array.isArray(videos) || !startDate) {
            return NextResponse.json(
                { success: false, error: 'Invalid request: videos (array) and startDate required' },
                { status: 400 }
            );
        }

        if (videos.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No videos provided' },
                { status: 400 }
            );
        }

        const postsCount = postsPerDay || 2;

        // Fixed times for each posts-per-day option
        const fixedTimes = {
            1: ['08:00'],
            2: ['08:00', '17:00'],  // 8 AM & 5 PM
            3: ['08:00', '14:00', '20:00'],  // 8 AM, 2 PM & 8 PM
            4: ['08:00', '12:00', '16:00', '20:00'],
            6: ['08:00', '11:00', '14:00', '17:00', '20:00', '23:00']
        };

        const times = fixedTimes[postsCount] || fixedTimes[2];

        console.log(`📅 Bulk scheduling ${videos.length} videos, ${postsCount} per day at: ${times.join(', ')}`);

        const postsToSchedule = [];
        const startDateTime = new Date(startDate);

        // Schedule videos at fixed daily times
        videos.forEach((video, index) => {
            const dayOffset = Math.floor(index / postsCount);
            const timeIndex = index % postsCount;
            const [hours, minutes] = times[timeIndex].split(':');

            const scheduledTime = new Date(startDateTime);
            scheduledTime.setDate(scheduledTime.getDate() + dayOffset);
            scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            postsToSchedule.push({
                filename: video.filename,
                video_url: video.videoUrl,
                caption: video.caption || '',
                scheduled_for: scheduledTime.toISOString(),
                status: 'pending'
            });
        });

        const { data, error } = await supabase
            .from('scheduled_posts')
            .insert(postsToSchedule)
            .select();

        if (error) throw error;

        console.log(`✅ Successfully scheduled ${data.length} posts`);

        return NextResponse.json({
            success: true,
            scheduled: data.length,
            jobs: data,
            distribution: {
                postsPerDay: postsCount,
                postTimes: times,
                totalDays: Math.ceil(videos.length / postsCount),
                startDate: startDateTime.toISOString(),
                endDate: postsToSchedule[postsToSchedule.length - 1].scheduled_for
            }
        });

    } catch (error) {
        console.error('❌ Error bulk scheduling:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
