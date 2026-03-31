// backend/models/PromptFeedback.js
const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class PromptFeedback {
  constructor({ user, prompt, feedback, rating }) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : user;
    this.prompt = prompt;
    this.feedback = feedback;
    this.rating = rating;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const db = getDB();
    const result = await db.collection('promptfeedbacks').insertOne(this);
    this._id = result.insertedId;
    return result;
  }

  static async find(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    return db.collection('promptfeedbacks').find(filter).toArray();
  }

  static findOne(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    return db.collection('promptfeedbacks').findOne(filter);
  }

  static findOneAndUpdate(filter = {}, update = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    return db.collection('promptfeedbacks').findOneAndUpdate(
      filter,
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = PromptFeedback;
