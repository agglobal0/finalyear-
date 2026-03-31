#!/usr/bin/env node
/**
 * Simple smoke test for backend endpoints.
 * Usage:
 *   TEST_EMAIL=tester@example.com TEST_PASSWORD=pass node backend/scripts/smokeTest.js
 */
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('Please set TEST_EMAIL and TEST_PASSWORD environment variables.');
  process.exit(2);
}

async function main() {
  try {
    const client = axios.create({ baseURL: API_BASE, timeout: 30000 });

    console.log('Logging in:', TEST_EMAIL);
    const loginRes = await client.post('/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) {
      console.error('Login did not return cookie. Check backend auth implementation.');
      process.exit(3);
    }
    const cookieHeader = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : setCookie.split(';')[0];
    console.log('Login successful, cookie captured.');

    // Generate resume
    console.log('Calling /api/generateResume ...');
    try {
      const res = await client.post('/api/generateResume', { preference: 'ats_friendly', selectedHighlights: [] }, { headers: { Cookie: cookieHeader } });
      console.log('/api/generateResume response:', res.data && res.data.success ? 'OK' : 'FAILED', JSON.stringify(res.data).slice(0, 200));
    } catch (err) {
      console.error('/api/generateResume error:', err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message);
    }

    // Generate PPTX
    console.log('Calling /api/generatePPTX ...');
    try {
      const res2 = await client.post('/api/generatePPTX', { topic: 'Test Topic', slideCount: 3 }, { headers: { Cookie: cookieHeader } });
      console.log('/api/generatePPTX response:', res2.data && res2.data.success ? 'OK' : 'FAILED', JSON.stringify(res2.data).slice(0, 200));
    } catch (err) {
      console.error('/api/generatePPTX error:', err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message);
    }

    console.log('Smoke test finished.');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err.message || err);
    process.exit(1);
  }
}

main();
