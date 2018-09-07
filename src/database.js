'use strict';

const debug       = require('debug')('database');
const fileSystem  = require('fs');
const sqlite      = require('sqlite');
const Promise     = require('bluebird');
const schema      = require('./database.schema');

class Database {

  constructor(configuration) {
    this.config = configuration;
  }

  getDataBasePath() {
    return this.config.path + this.config.name;
  }

  existsDB(database) {
    return fileSystem.existsSync(database);
  }

  async createTables(database) {
    try {
      await Promise.all([
        this.createTable(database, 'SyncProperties', schema.SyncProperties.sql)
      ]);
      let tablePromises = [];
      schema.tables.forEach(table => {
        tablePromises.push(this.createTable(database, `Local${table.name}`, table.local));
        tablePromises.push(this.createTable(database, `Conflict${table.name}`, table.conflict));
      });
      await Promise.all(tablePromises);
    } catch(error) {
      console.error(error)
      throw new Error(error)
    }
  }
  
  createTable(database, tableName, sql) {
    debug(`Creating ${tableName} table...`);
    return database.run(sql)
  }

  async initialize(database) {
    const db = await sqlite.open(database);
    await this.createTables(db);
    return db;
  }

  async getDataBaseInstance() {
    const databasePath = this.getDataBasePath();
    let db;
    if (!this.existsDB(databasePath)) {
      debug('The database does not exist. Creating it.');
      db = await this.initialize(databasePath);
    } else {
      debug('getting db instance');
      db = await sqlite.open(databasePath);
    }
    return db;
  }

  async getUser(username) {
    try{
      const db = await this.getDataBaseInstance();
      debug(`Getting the user ${username}...`);
      
      let user;
      await Promise.all([
        user = db.get('SELECT * FROM LocalUsers WHERE username = ?', username),
      ])
      .catch(error => console.error(error))
      .finally(() =>  db.close())
      .then(() => debug('Database closed.'));
      return user;
    } catch(error) {
      console.error(error)
      throw new Error(error)
    } 
  }
  
  async register(username, password) {
    try {
      const sql = `INSERT INTO LocalUsers VALUES (?, ?, 0, 1, 1)`;
      const db = await this.getDataBaseInstance();
      debug(`Creating the user ${username}...`);
      await Promise.all([
        db.run(sql, [username, password]),
      ])
      .catch(error => console.error(error))
      .finally(() =>  db.close())
      .then(() => debug('Database closed.'));
    } catch(error) {
      console.error(error)
      throw new Error(error)
    } 
  }
}

module.exports = Database;
