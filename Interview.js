const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class Interview {
  constructor(userId, level, answers, metadata = {}) {
    this.userId = userId;
    this.level = level; // 'basic', 'standard', or 'advanced'
    this.answers = answers; // Array of {question, answer, category}
    this.metadata = metadata; // Additional data
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const db = getDB();
    return db.collection('interviews').insertOne(this);
  }

  static async findById(id) {
    const db = getDB();
    return db.collection('interviews').findOne({ _id: new ObjectId(id) });
  }

  static async findByUserId(userId) {
    const db = getDB();
    return db.collection('interviews').find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  static async findOneAndUpdate(filter, update) {
    const db = getDB();
    return db.collection('interviews').findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' });
  }

  static async deleteOne(filter) {
    const db = getDB();
    return db.collection('interviews').deleteOne(filter);
  }
}

module.exports = Interview;
