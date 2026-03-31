const { getDB } = require('../util/db');
const { ObjectId } = require('mongodb');

class History {
  constructor(userOrConfig, title, type, sourceData, fileContent, prompt, parentHistoryId = null, lastPage = 'resume') {
    if (typeof userOrConfig === 'object' && !ObjectId.isValid(userOrConfig)) {
      // Configuration object provided
      const config = userOrConfig;
      this.user = ObjectId.isValid(config.user) ? new ObjectId(config.user) : config.user;
      this.title = config.title;
      this.type = config.type;
      this.sourceData = config.sourceData;
      this.fileContent = config.fileContent;
      this.prompt = config.prompt;
      this.parentHistoryId = config.parentHistoryId || null;
      this.isParent = config.isParent !== undefined ? config.isParent : !config.parentHistoryId;
      this.updates = config.updates || [];
      this.lastPage = config.lastPage || 'resume';
    } else {
      // Positional arguments provided
      this.user = ObjectId.isValid(userOrConfig) ? new ObjectId(userOrConfig) : userOrConfig;
      this.title = title;
      this.type = type;
      this.sourceData = sourceData;
      this.fileContent = fileContent;
      this.prompt = prompt;
      this.parentHistoryId = parentHistoryId;
      this.isParent = !parentHistoryId;
      this.updates = [];
      this.lastPage = lastPage;
    }
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const db = getDB();
    return db.collection('histories').insertOne(this);
  }

  static async find(filter) {
    const db = getDB();
    return db.collection('histories').find(filter).toArray();
  }

  static findOne(filter) {
    const db = getDB();
    return db.collection('histories').findOne(filter);
  }

  static findOneAndUpdate(filter, update) {
    const db = getDB();
    return db.collection('histories').findOneAndUpdate(filter, update, { returnDocument: 'after' });
  }

  static async deleteOne(filter) {
    const db = getDB();
    return db.collection('histories').deleteOne(filter);
  }

  // Get all updates for a parent history entry
  static async getUpdateHistory(parentHistoryId) {
    const db = getDB();
    return db.collection('histories').find({ parentHistoryId: new ObjectId(parentHistoryId) }).sort({ createdAt: 1 }).toArray();
  }

  // Add an update to parent history
  static async addUpdate(parentHistoryId, updateEntry) {
    const db = getDB();
    return db.collection('histories').updateOne(
      { _id: new ObjectId(parentHistoryId) },
      {
        $push: { updates: updateEntry },
        $set: { updatedAt: new Date() }
      }
    );
  }
}

module.exports = History;
