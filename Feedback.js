// backend/models/Feedback.js
const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class Feedback {
  constructor({ user, historyItem, rating, comment }) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : user;
    this.historyItem = ObjectId.isValid(historyItem) ? new ObjectId(historyItem) : historyItem;
    this.rating = rating;
    this.comment = comment;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const db = getDB();
    const result = await db.collection('feedbacks').insertOne(this);
    this._id = result.insertedId;
    return result;
  }

  static async find(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    if (filter.historyItem) filter.historyItem = ObjectId.isValid(filter.historyItem) ? new ObjectId(filter.historyItem) : filter.historyItem;
    return db.collection('feedbacks').find(filter).toArray();
  }

  static findOne(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    if (filter.historyItem) filter.historyItem = ObjectId.isValid(filter.historyItem) ? new ObjectId(filter.historyItem) : filter.historyItem;
    return db.collection('feedbacks').findOne(filter);
  }

  static findOneAndUpdate(filter = {}, update = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    if (filter.historyItem) filter.historyItem = ObjectId.isValid(filter.historyItem) ? new ObjectId(filter.historyItem) : filter.historyItem;
    return db.collection('feedbacks').findOneAndUpdate(
      filter,
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = Feedback;
