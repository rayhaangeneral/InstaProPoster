import axios from 'axios';

// Instagram Graph API credentials from environment
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_USER_ID = process.env.INSTAGRAM_USER_ID;

// Validate credentials
if (!ACCESS_TOKEN || !IG_USER_ID) {
    console.warn(
        'Warning: Missing Instagram credentials. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in .env.local'
    );
}

/**
 * Create a media container on Instagram
 * Step 1 of the publishing process
 * 
 * @param {string} videoUrl - Public URL of the video to upload
 * @param {string} caption - Caption text for the Instagram post
 * @returns {Promise<{success: boolean, creationId?: string, error?: string}>}
 */
export async function createMediaContainer(videoUrl, caption) {
    try {
        const url = `https://graph.facebook.com/v20.0/${IG_USER_ID}/media`;

        console.log(`📤 Creating media container for: ${videoUrl}`);

        const response = await axios.post(url, null, {
            params: {
                media_type: 'REELS',
                video_url: videoUrl,
                caption: caption || '',
                access_token: ACCESS_TOKEN
            }
        });

        console.log(`✅ Container created: ${response.data.id}`);

        return {
            success: true,
            creationId: response.data.id
        };
    } catch (error) {
        console.error('❌ Error creating container:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message
        };
    }
}

/**
 * Check the processing status of a media container
 * Step 2 of the publishing process (polling)
 * 
 * @param {string} creationId - The media container ID from createMediaContainer
 * @returns {Promise<{success: boolean, statusCode?: string, error?: string}>}
 */
export async function checkStatus(creationId) {
    try {
        const url = `https://graph.facebook.com/v20.0/${creationId}`;

        const response = await axios.get(url, {
            params: {
                fields: 'status_code',
                access_token: ACCESS_TOKEN
            }
        });

        return {
            success: true,
            statusCode: response.data.status_code
        };
    } catch (error) {
        console.error('❌ Error checking status:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message
        };
    }
}

/**
 * Publish a processed media container to Instagram
 * Step 3 of the publishing process (final step)
 * 
 * @param {string} creationId - The media container ID (must be in READY status)
 * @returns {Promise<{success: boolean, publishedId?: string, error?: string}>}
 */
export async function publishMedia(creationId) {
    try {
        const url = `https://graph.facebook.com/v20.0/${IG_USER_ID}/media_publish`;

        console.log(`📢 Publishing media container: ${creationId}`);

        const response = await axios.post(url, null, {
            params: {
                creation_id: creationId,
                access_token: ACCESS_TOKEN
            }
        });

        console.log(`🎉 Published successfully! Post ID: ${response.data.id}`);

        return {
            success: true,
            publishedId: response.data.id
        };
    } catch (error) {
        console.error('❌ Error publishing media:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message
        };
    }
}

/**
 * Wait for Instagram to process video until READY or ERROR
 * NO TIMEOUT - continues polling until status changes
 * 
 * @param {string} creationId - The media container ID
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<{success: boolean, statusCode?: string, error?: string}>}
 */
export async function waitForProcessing(creationId, onProgress = () => { }) {
    let statusCode = 'IN_PROGRESS';
    let attempts = 0;

    while (statusCode === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

        const statusResult = await checkStatus(creationId);

        if (!statusResult.success) {
            return { success: false, error: statusResult.error };
        }

        statusCode = statusResult.statusCode;
        attempts++;

        if (attempts % 10 === 0) {
            const elapsed = `${attempts * 3}s`;
            onProgress(`Still processing... ${elapsed} elapsed`);
        }
    }

    if (statusCode === 'ERROR') {
        return { success: false, statusCode, error: 'Video processing failed on Instagram' };
    }

    return { success: true, statusCode, attempts: attempts * 3 }; // Total seconds elapsed
}

/**
 * Complete publishing workflow helper
 * Orchestrates all 3 steps: create → wait for ready → publish
 * 
 * @param {string} videoUrl - Public URL of the video
 * @param {string} caption - Caption text
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<{success: boolean, publishedId?: string, error?: string}>}
 */
export async function publishWorkflow(videoUrl, caption, onProgress = () => { }) {
    // Step 1: Create container
    onProgress('Creating media container...');
    const containerResult = await createMediaContainer(videoUrl, caption);

    if (!containerResult.success) {
        return { success: false, error: containerResult.error };
    }

    const creationId = containerResult.creationId;

    // Step 2: Wait for processing
    onProgress('Waiting for Instagram to process video...');
    const processingResult = await waitForProcessing(creationId, onProgress);

    if (!processingResult.success) {
        return { success: false, error: processingResult.error };
    }

    // Step 3: Publish
    onProgress('Publishing to Instagram...');
    const publishResult = await publishMedia(creationId);

    return publishResult;
}
