#!/usr/bin/env node

/**
 * Test the overview endpoint with proper token handling
 * Usage: node test-overview-endpoint.js [baseUrl] [token]
 */

import fetch from 'node-fetch';

const baseUrl = process.argv[2] || 'http://localhost:5000';
const token = process.argv[3] || 'YOUR_JWT_TOKEN_HERE';

async function testOverview() {
  console.log('🧪 Testing Overview Endpoint');
  console.log('━'.repeat(50));
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`🔑 Token: ${token.substring(0, 20)}...`);
  console.log('');

  try {
    const url = `${baseUrl}/api/dashboard/overview`;
    console.log(`⏳ Calling: GET ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('');

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS - Overview data loaded:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ ERROR - Server returned error:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('💡 Troubleshooting Tips:');
      
      if (response.status === 401) {
        console.log('   • Status 401: Token is invalid or expired');
        console.log('   • Check JWT_SECRET matches environment');
        console.log('   • Regenerate token from login endpoint');
      } else if (response.status === 403) {
        console.log('   • Status 403: CORS or permission issue');
        console.log('   • Check CORS_ORIGINS includes your frontend URL');
      } else if (response.status === 500) {
        console.log('   • Status 500: Server error - check server logs');
        console.log('   • Database connection might be failing');
        console.log('   • Run: npm run setup-full-schema');
      }
    }

  } catch (error) {
    console.log('❌ CONNECTION ERROR:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('💡 Troubleshooting Tips:');
    console.log(`   • Is server running on ${baseUrl}?`);
    console.log('   • Check firewall settings');
    console.log('   • Verify DATABASE_URL is correct');
    console.log('   • Check network connectivity');
  }
}

testOverview();
