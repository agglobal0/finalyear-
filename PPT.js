const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class PPT {
  constructor(data) {
    this.userId = data.userId ? new ObjectId(data.userId) : null;
    this.topic = data.topic;
    this.status = data.status || 'outline';
    this.themeSlug = data.themeSlug || null;
    this.imagePreference = data.imagePreference || 'none';
    this.slides = data.slides || [];
    this.filePath = data.filePath || null;
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const db = getDB();
    const result = await db.collection('ppts').insertOne(this);
    this._id = result.insertedId;
    return this;
  }

  static findById(id) {
    const db = getDB();
    return db.collection('ppts').findOne({ _id: new ObjectId(id) });
  }

  static findOne(filter) {
    const db = getDB();
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    if (filter.userId && typeof filter.userId === 'string') {
      filter.userId = new ObjectId(filter.userId);
    }
    return db.collection('ppts').findOne(filter);
  }

  static find(filter) {
    const db = getDB();
    if (filter.userId && typeof filter.userId === 'string') {
      filter.userId = new ObjectId(filter.userId);
    }
    return db.collection('ppts').find(filter);
  }

  static async findOneAndUpdate(filter, update, options = {}) {
    const db = getDB();
    
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    if (filter.userId && typeof filter.userId === 'string') {
      filter.userId = new ObjectId(filter.userId);
    }

    const result = await db.collection('ppts').findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: 'after', ...options }
    );
    // MongoDB driver v6+ returns the document directly. Older versions return { value: document } 
    return result && result.value !== undefined ? result.value : result;
  }

  static async updateOne(filter, update) {
    const db = getDB();
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    return db.collection('ppts').updateOne(filter, { $set: update });
  }

  static async deleteOne(filter) {
    const db = getDB();
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    if (filter.userId && typeof filter.userId === 'string') {
      filter.userId = new ObjectId(filter.userId);
    }
    return db.collection('ppts').deleteOne(filter);
  }
}


module.exports = PPT;
