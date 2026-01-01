// test-ai.js
require('dotenv').config();
const { generateRideDescription } = require('./src/utils/aiHelper');

async function testAI() {
    console.log('🧪 Testing AI description generation...');
    
    try {
        const description = await generateRideDescription(
            'Mumbai', 
            'Thane', 
            '2025-08-31 17:00:00', 
            2
        );
        
        console.log('✅ AI Description:', description);
        console.log('✅ AI is working correctly!');
    } catch (error) {
        console.log('❌ AI Error:', error.message);
    }
}

testAI();