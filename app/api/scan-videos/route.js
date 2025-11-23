import { NextResponse } from 'next/server';
import { fetchAllVideosWithCaptions } from '@/lib/videoServer';

/**
 * GET /api/scan-videos
 * Scans the video server and returns all available videos with their captions
 */
export async function GET() {
    try {
        console.log('🔍 API: Scanning videos from server...');

        // Fetch all videos with captions
        const result = await fetchAllVideosWithCaptions();

        if (!result.success) {
            throw new Error(result.error);
        }

        console.log(`✅ API: Successfully scanned ${result.count} videos`);

        return NextResponse.json({
            success: true,
            videos: result.videos,
            count: result.count,
            source: process.env.VIDEO_SERVER_URL || 'https://q.fronxx.com/videos/videos/'
        });

    } catch (error) {
        console.error('❌ API Error scanning videos:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
    }
}
