// Local cron worker for development
// This script calls the /api/cron endpoint every minute
// In production, use Vercel Cron or another cron service

const cron = require('node-cron');
const axios = require('axios');

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

console.log('🤖 Instagram Auto-Poster Cron Worker');
console.log(`📡 API URL: ${API_URL}/api/cron`);
console.log('⏰ Running every minute...\n');

// Run every minute
cron.schedule('* * * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔄 [${timestamp}] Running cron job...`);

    try {
        const response = await axios.get(`${API_URL}/api/cron`, {
            timeout: 120000 // 2 minute timeout
        });

        const data = response.data;

        if (data.success) {
            console.log(`✅ Processed ${data.processed} jobs`);
            console.log(`   Success: ${data.successful} | Failed: ${data.failed}`);
            console.log(`   Duration: ${data.duration}`);

            if (data.results && data.results.length > 0) {
                data.results.forEach(result => {
                    if (result.success) {
                        console.log(`   ✅ ${result.filename} - Published: ${result.publishedId}`);
                    } else {
                        console.log(`   ❌ ${result.filename} - Error: ${result.error}`);
                    }
                });
            }
        } else {
            console.error(`❌ Cron job failed: ${data.error}`);
        }
    } catch (error) {
        console.error(`❌ Error calling cron endpoint:`, error.message);
    }
});

console.log('✅ Cron worker started successfully');
console.log('Press Ctrl+C to stop\n');
