'use strict';

const debug         = require('debug')('database');
const fileSystem    = require('fs');
const sqlite        = require('sqlite');
const Promise       = require('bluebird');
const schema        = require('./database.schema');
const uuidGenerator = require('uuid/v4');

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
    debug(`Getting the user ${username}...`);
    const db = await this.getDataBaseInstance();
    let user;
    await Promise.all([
      user = db.get('SELECT * FROM LocalUsers WHERE username = ?', username),
    ])
    .catch(error => console.error(error))
    .finally(() =>  db.close())
    .then(() => debug('Database closed.'))
    .catch(errorToClose => console.error(errorToClose));
    return user;
  }
  
  async addUser(username, password) {
    const db = await this.getDataBaseInstance();
    return await this.executeAsyncSQL(
      db,
      [db.run( `INSERT INTO LocalUsers VALUES (?, ?, 0, 1, 1)`, [username, password])],
      `Creating the user ${username}...`,
    );
  }
  
  async addCar(user, car) {
    const db = await this.getDataBaseInstance();
    car.uuid = uuidGenerator();
    
    const promises = [
      db.run('INSERT INTO LocalCars VALUES (?, ?, ?, 0, 1, 1)', [car.uuid, car.model, car.value]),
      db.run('INSERT INTO LocalUserOwnCar VALUES (?, ?, 0, 1, 1)', [user, car.uuid]),
    ];
    const result = await this.insertAsyncSQL(db, promises, `Adding the car ${car.model}:${car.value} to ${user}`);
    return result;
  }
  
  async getCarsFromUser(user) {
    const db = await this.getDataBaseInstance();
    const sql = 'SELECT LocalCars.* FROM LocalCars, LocaluserOwnCar WHERE LocaluserOwnCar.user = ? AND LocalUserOwnCar.carId = LocalCars.uuid';
    return await this.getAsyncSQL(db, db.all(sql, user), `Getting cars of ${user}`);
  }

  async getCar(uuid) {
    const db = await this.getDataBaseInstance();
    const sql = 'SELECT * FROM LocalCars WHERE uuid = ?';
    return await this.getAsyncSQL(db, db.all(sql, uuid), `Getting car ${uuid}`);
  }
  
  async updateCar(newDetails) {
    const db = await this.getDataBaseInstance();
    debug(`Updating the car ${newDetails.uuid}`);
    const update = 'UPDATE LocalCars SET model = ?, value = ?, isOnServer = 0, isModified = 1, isActive = 1 WHERE uuid = ?';
    return await Promise.all([
      db.run(update, [newDetails.model, newDetails.value, newDetails.uuid]),
    ])
    .catch(error => console.error(error))
    .finally(() => db.close())
    .then(() => debug('Database closed.'))
    .catch(errorToClose => console.error(errorToClose));
  }

  async insertAsyncSQL(database, promises, debugMessage) {
    debug(debugMessage);
    return await Promise.all(promises)
    .catch(error => console.error(error))
    .finally(() =>  database.close())
    .then(() => debug('Database closed.'))
    .catch(errorToClose => console.error(errorToClose));
  }

  async getAsyncSQL(database, promise, debugMessage) {
    let result = [];
    debug(debugMessage);
    await Promise.all([
      result = promise,
    ])
    .catch(error => console.error(error))
    .finally(() =>  database.close())
    .then(() => debug('Database closed.'))
    .catch(errorToClose => console.error(errorToClose));
    return result;
  }
}

module.exports = Database;
