'use strict';

const debug       = require('debug')('database');
const fileSystem  = require('fs');
const sqlite3     = require('sqlite3').verbose();
const schema      = require('./database.schema');

function existsDB(database) {
  return fileSystem.existsSync(database);
}

function createTables(database) {
  database.serialize(function () {
    createTable(database, 'SyncProperties', schema.SyncProperties.sql);
    schema.tables.forEach(table => {
        createTable(database, `Local${table.name}`, table.local);
        createTable(database, `Conflict${table.name}`, table.conflict);
    })
  });
}

function createTable(database, tableName, sql) {
  debug(`Creating ${tableName} table...`);
  database.run(sql, function(error) {
    if (error) {
      database.close();
      throw new Error('An error appear: ' + error);
    }
  });
}

function getDataBaseInstance(configuration) {
  const database = configuration.path + configuration.name;
  if (!existsDB(database)) {
    return initialize(database);
  } else {
    return new sqlite3.Database(database, sqlite3.OPEN_READWRITE);
  }
}

function initialize(database) {
  let db;
  try {
    db = new sqlite3.Database(database);
    createTables(db);
    db.close();
  } catch(error) {
    console.error('Something happens meanwhile the database was created.' + error);
    if (fileSystem.existsSync(database)) {
      fileSystem.unlinkSync(database, err => {
        if (err) {
          throw err;
        }
        console.error('The database was successfully deleted.');
      });
    }
  }
}

module.exports = {
  existsDB,
  initialize,
  getDataBaseInstance
}