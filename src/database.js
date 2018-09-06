'use strict';

const debug       = require('debug')('database');
const fileSystem  = require('fs');
const sqlite3     = require('sqlite3').verbose();
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
  
  createTables(database) {
    database.serialize(function () {
      this.createTable(database, 'SyncProperties', schema.SyncProperties.sql);
      schema.tables.forEach(table => {
          this.createTable(database, `Local${table.name}`, table.local);
          this.createTable(database, `Conflict${table.name}`, table.conflict);
      })
    });
  }
  
  createTable(database, tableName, sql) {
    debug(`Creating ${tableName} table...`);
    database.run(sql, function(error) {
      if (error) {
        database.close();
        throw new Error('An error appear: ' + error);
      }
    });
  }
  
  getDataBaseInstance() {
    const database = this.getDataBasePath();
    if (!this.existsDB(database)) {
      debug('The database does not exist. Creating it.');
      return initialize(database);
    } else {
      return new sqlite3.Database(database, sqlite3.OPEN_READWRITE);
    }
  }
  
  initialize(database) {
    const db = new sqlite3.Database(database);
    this.createTables(db);
    db.close();
  }
  
  isUsernameAvaliable(username) {
    const db = this.getDataBaseInstance();
    db.get('SELECT username FROM LocalUsers WHERE username = ?',
    username,
    function(error, rows) {
      if (error) {
        return console.error(error.message);
      }
      return rows && rows.length === 0;
    });
  }
  
  storeUser(db, username, password) {
  
  }
}


module.exports = Database;