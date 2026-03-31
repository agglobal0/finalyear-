// backend/models/Presentation.js
// backend/models/Presentation.js
const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class Presentation {
  constructor({ user, title, content, summaryPrompt }) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : user;
    this.title = title;
    this.content = content;
    this.summaryPrompt = summaryPrompt;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const db = getDB();
    const result = await db.collection('presentations').insertOne(this);
    this._id = result.insertedId;
    return result;
  }

  static async find(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    return db.collection('presentations').find(filter).toArray();
  }

  static findOne(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    return db.collection('presentations').findOne(filter);
  }

  static findOneAndUpdate(filter = {}, update = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    return db.collection('presentations').findOneAndUpdate(
      filter,
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = Presentation;
