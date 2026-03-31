const { getDB } = require('../util/db');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

class User {
  constructor(username, email, password) {
    this.username = username;
    this.email = email;
    this.password = password;
  }

  async save() {
    const db = getDB();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return db.collection('users').insertOne(this);
  }

  static findById(id) {
    const db = getDB();
    return db.collection('users').findOne({ _id: new ObjectId(id) });
  }

  static findOne(filter) {
    const db = getDB();
    return db.collection('users').findOne(filter);
  }

  static async findOneAndUpdate(filter, update) {
    const db = getDB();
    return db.collection('users').findOneAndUpdate(filter, update);
  }

  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }
}

module.exports = User;
