#!/usr/bin/env node
/**
 * Create a test user in the database (bypass email verification).
 * Usage:
 *   TEST_EMAIL=test@example.com TEST_PASSWORD=pass TEST_USERNAME=tester node backend/scripts/createTestUser.js
 */
const { connectDB } = require('../util/db');
const User = require('../models/User');

const EMAIL = process.env.TEST_EMAIL || 'tester@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'password123';
const USERNAME = process.env.TEST_USERNAME || 'tester';

async function main() {
  try {
    await connectDB();
    const existing = await User.findOne({ email: EMAIL });
    if (existing) {
      console.log(`User with email ${EMAIL} already exists (id=${existing._id}).`);
      process.exit(0);
    }

    const user = new User(USERNAME, EMAIL, PASSWORD);
    const result = await user.save();
    console.log('Created test user:', { email: EMAIL, username: USERNAME, insertedId: result.insertedId });
    process.exit(0);
  } catch (err) {
    console.error('Failed to create test user:', err);
    process.exit(1);
  }
}

main();
