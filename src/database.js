'use strict';

const debug = require('./debug');
const fileSystem = require('fs');
const sqlite = require('sqlite');
const Promise = require('bluebird');
const schema = require('./database.schema');
const uuidGenerator = require('uuid/v4');

class Database {
  constructor (configuration) {
    this.config = configuration;
  }

  /* ===================================================================================== */
  /* Useful Methods */
  /* ===================================================================================== */

  getDataBasePath () {
    return this.config.path + this.config.name;
  }

  existsDB (database) {
    return fileSystem.existsSync(database);
  }

  async getCarsFromUser (user) {
    const db = await this.getDataBaseInstance();
    const sql = 'SELECT LocalCars.* FROM LocalCars, LocaluserOwnCar WHERE LocaluserOwnCar.user = ? AND LocalUserOwnCar.carId = LocalCars.uuid';
    const cars = await this.getAsyncSQL(db, db.all(sql, user), {
      tag: 'database',
      msg: `Getting cars of ${user}`
    });
    return cars;
  }

  /* ===================================================================================== */
  /* Initialitation/Instance of the data base */
  /* ===================================================================================== */

  async createTables (database) {
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
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  createTable (database, tableName, sql) {
    debug('database:instance', `Creating ${tableName} table...`);
    return database.run(sql);
  }

  async initialize (database) {
    const db = await sqlite.open(database);
    await this.createTables(db);
    return db;
  }

  async getDataBaseInstance () {
    const databasePath = this.getDataBasePath();
    let db;
    if (!this.existsDB(databasePath)) {
      debug('database:instance', 'The database does not exist. Creating it.');
      db = await this.initialize(databasePath);
    } else {
      debug('database:instance', 'getting db instance');
      db = await sqlite.open(databasePath);
    }
    return db;
  }

  /* ===================================================================================== */
  /* User Table */
  /* ===================================================================================== */

  async getUser (username) {
    debug('database:user', `Getting the user ${username}...`);
    const db = await this.getDataBaseInstance();
    let user;
    await Promise.all([
      user = db.get('SELECT * FROM LocalUsers WHERE username = ?', username)
    ])
      .catch(error => console.error(error))
      .finally(() => db.close())
      .then(() => debug('database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
    return user;
  }

  async addUser (username, password) {
    const db = await this.getDataBaseInstance();
    await this.execAsyncSQL(
      db,
      [db.run(`INSERT INTO LocalUsers VALUES (?, ?, 0, 1, 1)`, [username, password])],
      {
        tag: 'database:user',
        msg: `Creating the user ${username}...`
      }
    );
  }

  async deleteUser (username) {
    const carsToDelete = await this.getCarsFromUser(username);
    const db = await this.getDataBaseInstance();
    const listOfPromisesToDetele = [];
    carsToDelete.forEach(car => {
      debug('database:user:car', `Preparing promises to delete the car ${car.model}:${car.value}:${car.uuid}`);
      listOfPromisesToDetele.push(db.run('DELETE FROM LocalUserOwnCar WHERE carId = ?', [car.uuid]));
      listOfPromisesToDetele.push(db.run('DELETE FROM LocalCars WHERE uuid = ?', [car.uuid]));
    });
    listOfPromisesToDetele.push(db.run('DELETE FROM LocalUsers WHERE username = ?', [username]));
    await this.execAsyncSQL(db, listOfPromisesToDetele, {
      tag: 'database:user',
      msg: `Deleting the user ${username} and all the cars.`
    });
  }

  /* ===================================================================================== */
  /* Car Table */
  /* ===================================================================================== */

  async getCar (uuid) {
    const db = await this.getDataBaseInstance();
    const sql = 'SELECT * FROM LocalCars WHERE uuid = ?';
    const car = await this.getAsyncSQL(db, db.all(sql, uuid), {
      tag: 'database:car',
      msg: `Getting car ${uuid}`
    });
    if (car.length > 1) {
      throw Error('It not allowed to have more than 1 car with the same uuid.');
    } else {
      return car[0];
    }
  }

  async addCar (user, car) {
    const db = await this.getDataBaseInstance();
    car.uuid = uuidGenerator();
    const promises = [
      db.run('INSERT INTO LocalCars VALUES (?, ?, ?, 0, 1, 1)', [car.uuid, car.model, car.value]),
      db.run('INSERT INTO LocalUserOwnCar VALUES (?, ?, 0, 1, 1)', [user, car.uuid])
    ];
    await this.execAsyncSQL(db, promises, {
      tag: 'database:car',
      msg: `Adding the car ${car.model}:${car.value} to ${user}.`
    });
    return car.uuid;
  }

  // This delete not consider the sync way.
  async deleteCar (carId) {
    const db = await this.getDataBaseInstance();
    debug('database:car', `Deleting the car ${carId}.`);
    await Promise.all([
      db.run('DELETE FROM LocalUserOwnCar WHERE carId = ?', [carId]),
      db.run('DELETE FROM LocalCars WHERE uuid = ?', [carId])
    ])
      .catch(error => console.error(error))
      .finally(() => db.close())
      .then(() => debug('database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
  }

  async updateCar (newDetails) {
    const db = await this.getDataBaseInstance();
    debug('database:car', `Updating the car ${newDetails.uuid}`);
    const update = 'UPDATE LocalCars SET model = ?, value = ?, isOnServer = 0, isModified = 1, isActive = 1 WHERE uuid = ?';
    await Promise.all([
      db.run(update, [newDetails.model, newDetails.value, newDetails.uuid])
    ]).catch(error => console.error(error))
      .finally(() => db.close())
      .then(() => debug('database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
  }

  /* ===================================================================================== */
  /* Sync operations */
  /* ===================================================================================== */

  async setDateTimeFromServer (dateTimeFromServer) {
    const db = await this.getDataBaseInstance();
    await this.execAsyncSQL(db, [
      db.run('INSERT INTO SyncProperties VALUES (?)', [dateTimeFromServer])
    ], {
      tag: 'database:sync:SyncProperties',
      msg: 'Setting the date of the server: <' + dateTimeFromServer + '> : ' + new Date(dateTimeFromServer).toUTCString()
    });
  }

  async getLastSynchronization () {
    const db = await this.getDataBaseInstance();
    const time = await this.getAsyncSQL(db, [
      db.get('SELECT lastSync FROM SyncProperties ORDER BY rowid DESC LIMIT 1', [])
    ], {
      tag: 'database:sync',
      msg: 'Getting the last time when the app was synchronize.'
    });
    if (time.length > 1) {
      throw Error('Something wrong happens.');
    } else {
      debug('database:sync', time[0]);
      return time[0];
    }
  }

  /* ===================================================================================== */
  /* Database generic SQL executers */
  /* ===================================================================================== */

  async execAsyncSQL (database, promises, debugOptions) {
    debug(debugOptions.tag, debugOptions.msg);
    await Promise.all(promises)
      .catch(error => console.error(error))
      .finally(() => database.close())
      .then(() => debug('database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
  }

  async getAsyncSQL (database, promise, debugOptions) {
    let result = [];
    debug(debugOptions.tag, debugOptions.msg);
    await Promise.all([
      result = promise
    ])
      .catch(error => console.error(error))
      .finally(() => database.close())
      .then(() => debug('database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
    return result;
  }
}

module.exports = Database;
