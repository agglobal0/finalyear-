
// backend/models/Refinement.js
const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class Refinement {
  constructor({ user, historyItem, summary, before, after }) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : user;
    this.historyItem = ObjectId.isValid(historyItem) ? new ObjectId(historyItem) : historyItem;
    this.summary = summary;
    this.before = before;
    this.after = after;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const db = getDB();
    const result = await db.collection('refinements').insertOne(this);
    this._id = result.insertedId;
    return result;
  }

  static async find(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    if (filter.historyItem) filter.historyItem = ObjectId.isValid(filter.historyItem) ? new ObjectId(filter.historyItem) : filter.historyItem;
    return db.collection('refinements').find(filter).toArray();
  }

  static findOne(filter = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    if (filter.historyItem) filter.historyItem = ObjectId.isValid(filter.historyItem) ? new ObjectId(filter.historyItem) : filter.historyItem;
    return db.collection('refinements').findOne(filter);
  }

  static findOneAndUpdate(filter = {}, update = {}) {
    const db = getDB();
    if (filter.user) filter.user = ObjectId.isValid(filter.user) ? new ObjectId(filter.user) : filter.user;
    if (filter.historyItem) filter.historyItem = ObjectId.isValid(filter.historyItem) ? new ObjectId(filter.historyItem) : filter.historyItem;
    return db.collection('refinements').findOneAndUpdate(
      filter,
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = Refinement;
