const mongoose = require('mongoose');

const TEST_DB_URI = process.env.MONGO_URI || 'mongodb://172.17.0.1:27018/pulseboard_test';

async function setupTestDB() {
  await mongoose.connect(TEST_DB_URI);
}

async function teardownTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { setupTestDB, teardownTestDB, clearTestDB };