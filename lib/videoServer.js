import axios from 'axios';
import * as cheerio from 'cheerio';

// Video server URL from environment
const VIDEO_SERVER_URL = process.env.VIDEO_SERVER_URL || 'https://q.fronxx.com/videos/videos/';

/**
 * Fetch list of all videos from the video server
 * Parses HTML directory listing to extract .mp4 files
 * 
 * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
 */
export async function fetchVideoList() {
    try {
        console.log(`🔍 Scanning video server: ${VIDEO_SERVER_URL}`);

        const response = await axios.get(VIDEO_SERVER_URL);
        const html = response.data;
        const $ = cheerio.load(html);

        const files = [];

        // Parse the directory listing HTML
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();

            // Skip parent directory and non-video files
            if (!href || href === '../' || href === '.' || href === '..') {
                return;
            }

            // Look for .mp4 files
            if (href.endsWith('.mp4')) {
                // Extract just the filename (in case href includes full path)
                const filename = href.split('/').pop();
                const baseFilename = filename.replace('.mp4', '');

                files.push({
                    filename: filename,
                    baseFilename: baseFilename,
                    videoUrl: `${VIDEO_SERVER_URL}${filename}`,
                    captionFile: `${baseFilename}.txt`
                });
            }
        });

        console.log(`✅ Found ${files.length} videos`);

        return { success: true, files };
    } catch (error) {
        console.error('❌ Error fetching video list:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch caption text from a .txt file on the video server
 * 
 * @param {string} captionFilename - Name of the caption file (e.g., "21.txt")
 * @returns {Promise<{success: boolean, caption: string}>}
 */
export async function fetchCaption(captionFilename) {
    try {
        const captionUrl = `${VIDEO_SERVER_URL}${captionFilename}`;
        console.log(`📄 Fetching caption: ${captionUrl}`);

        const response = await axios.get(captionUrl, {
            responseType: 'text',
            timeout: 5000
        });

        const captionText = typeof response.data === 'string'
            ? response.data.trim()
            : String(response.data).trim();

        console.log(`✅ Caption loaded for ${captionFilename}: ${captionText.substring(0, 50)}...`);

        return {
            success: true,
            caption: captionText
        };
    } catch (error) {
        // If caption file doesn't exist, return empty caption (not an error)
        console.log(`ℹ️  No caption file found: ${captionFilename} - ${error.message}`);
        return {
            success: false,
            caption: ''
        };
    }
}

/**
 * Fetch all videos with their captions in one call
 * Convenience function that combines fetchVideoList and fetchCaption
 * 
 * @returns {Promise<{success: boolean, videos?: Array, count?: number, error?: string}>}
 */
export async function fetchAllVideosWithCaptions() {
    try {
        // Get video list
        const listResult = await fetchVideoList();

        if (!listResult.success) {
            throw new Error(listResult.error);
        }

        const videos = [];

        console.log(`📋 Fetching captions for ${listResult.files.length} videos...`);

        // Fetch captions for each video
        for (const file of listResult.files) {
            const captionResult = await fetchCaption(file.captionFile);

            videos.push({
                filename: file.filename,
                videoUrl: file.videoUrl,
                caption: captionResult.caption || '',
                hasCaption: captionResult.success
            });
        }

        const withCaptions = videos.filter(v => v.hasCaption).length;
        console.log(`✅ Retrieved ${videos.length} videos (${withCaptions} with captions)`);

        return {
            success: true,
            videos,
            count: videos.length
        };
    } catch (error) {
        console.error('❌ Error fetching videos with captions:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test if the video server is accessible
 * 
 * @returns {Promise<{success: boolean, message: string, url?: string}>}
 */
export async function testVideoServer() {
    try {
        const response = await axios.head(VIDEO_SERVER_URL, { timeout: 5000 });

        return {
            success: true,
            message: 'Video server is accessible',
            url: VIDEO_SERVER_URL,
            status: response.status
        };
    } catch (error) {
        return {
            success: false,
            message: `Video server is not accessible: ${error.message}`,
            url: VIDEO_SERVER_URL
        };
    }
}
