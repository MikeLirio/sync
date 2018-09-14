'use strict';

const debug = require('./debug');
const fileSystem = require('fs');
const sqlite = require('sqlite');
const Promise = require('bluebird');
const { tables, syncProperties, operations } = require('./database.schema');
const uuidGenerator = require('uuid/v4');

class Database {
  constructor (configuration) {
    this.config = configuration;
    this.get = operations.get;
    this.users = tables.users.operations;
    this.cars = tables.cars.operations;
    this.userOwnCar = tables.userOwnCar.operations;
  }

  /* ===================================================================================== */
  /* Useful Methods */
  /* ===================================================================================== */

  getDataBasePath () {
    return this.config.path + this.config.name;
  }

  checkDB (database) {
    return database === ':memory:' || fileSystem.existsSync(database);
  }

  isNewRow (localObj) {
    return localObj.isFromServer === 0 && localObj.isModified === 0 && localObj.isActive === 1;
  }

  async getCarsFromUser (user) {
    const db = await this.getDataBaseInstance();
    const cars = await this.getAsyncSQL(db, db.all(this.get.carsFromUser, user), {
      tag: 'Database',
      msg: `Getting cars of ${user}`
    });
    return cars;
  }

  async getValuesForSyncFrom (table, typeRow) {
    const sql = this[table].get[typeRow];
    const db = await this.getDataBaseInstance();
    const result = await this.getAsyncSQL(db, db.all(sql), {
      tag: `Database:sync:rows`,
      msg: `Getting ${typeRow} rows from ${table}`
    });
    return result;
  }

  /* ===================================================================================== */
  /* Initialitation/Instance of the data base */
  /* ===================================================================================== */

  async createTables (database) {
    try {
      await Promise.all([
        this.createTable(database, 'SyncProperties', syncProperties.table)
      ]);
      let tablePromises = [];
      const arrayTables = [tables.users, tables.cars, tables.userOwnCar];
      arrayTables.forEach(table => {
        tablePromises.push(this.createTable(database, `${table.name}`, table.tables.normal));
        tablePromises.push(this.createTable(database, `Local${table.name}`, table.tables.local));
        tablePromises.push(this.createTable(database, `Conflict${table.name}`, table.tables.conflict));
      });
      await Promise.all(tablePromises);
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  createTable (database, tableName, sql) {
    debug('Database:instance', `Creating ${tableName} table...`);
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
    if (!this.checkDB(databasePath)) {
      debug('Database:instance', 'The database does not exist. Creating it.');
      db = await this.initialize(databasePath);
    } else {
      debug('Database:instance', 'getting db instance');
      db = await sqlite.open(databasePath);
    }
    return db;
  }

  /* ===================================================================================== */
  /* User Table */
  /* ===================================================================================== */

  async getUser (username) {
    debug('Database:user', `Getting the user ${username}...`);
    const db = await this.getDataBaseInstance();
    let user;
    await Promise.all([
      user = db.get(this.users.get.user, username)
    ])
      .catch(error => console.error(error))
      .finally(() => db.close())
      .then(() => debug('Database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
    return user;
  }

  async addUser (username, password) {
    const db = await this.getDataBaseInstance();
    const time = new Date().getTime();
    await this.execAsyncSQL(
      db,
      [
        db.run(this.users.insert.normal, [username, password, time, 1]),
        db.run(this.users.insert.local, [username, password, 0, 0, 1])
      ],
      {
        tag: 'Database:user',
        msg: `Creating the user ${username}...`
      }
    );
  }

  async deleteUser (username) {
    const carsToDelete = await this.getCarsFromUser(username);
    const db = await this.getDataBaseInstance();
    const listOfPromisesToDetele = [];
    carsToDelete.forEach(car => {
      debug('Database:user:car', `Preparing promises to delete the car ${car.model}:${car.value}:${car.uuid}`);
      listOfPromisesToDetele.push(db.run(this.cars.delete(''), [car.uuid]));
    });
    listOfPromisesToDetele.push(db.run(this.userOwnCar.deleteAll(''), [username]));
    listOfPromisesToDetele.push(db.run(this.users.delete(''), [username]));
    await this.execAsyncSQL(db, listOfPromisesToDetele, {
      tag: 'Database:user',
      msg: `Deleting the user ${username} and all the cars.`
    });
  }

  /* ===================================================================================== */
  /* Car Table */
  /* ===================================================================================== */

  async getCar (uuid, prefix) {
    const db = await this.getDataBaseInstance();
    const sql = this.cars.get.car(prefix);
    const car = await this.getAsyncSQL(db, db.all(sql, uuid), {
      tag: 'Database:car',
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
    const time = new Date().getTime();
    car.uuid = uuidGenerator();
    const promises = [
      db.run(this.cars.insert.normal, [car.uuid, car.model, car.value, time, 1]),
      db.run(this.cars.insert.local, [car.uuid, car.model, car.value, 0, 0, 1]),

      db.run(this.userOwnCar.insert.normal, [user, car.uuid, time, 1]),
      db.run(this.userOwnCar.insert.local, [user, car.uuid, 0, 0, 1])
    ];
    await this.execAsyncSQL(db, promises, {
      tag: 'Database:car',
      msg: `Adding the car ${car.model}:${car.value} to ${user}.`
    });
    return car.uuid;
  }

  // This delete not consider the sync way.
  async deleteCar (carId) {
    const db = await this.getDataBaseInstance();
    debug('Database:car', `Deleting the car ${carId}.`);
    await Promise.all([
      db.run(this.userOwnCar.delete(''), [carId]),
      db.run(this.userOwnCar.delete('Local'), [carId]),

      db.run(this.cars.delete(''), [carId]),
      db.run(this.cars.delete('Local'), [carId])
    ])
      .catch(error => console.error(error))
      .finally(() => db.close())
      .then(() => debug('Database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
  }

  async updateCar (newDetails) {
    debug('Database:car', `Updating the car ${newDetails.uuid}`);
    const localCar = await this.getCar(newDetails.uuid, 'Local');
    const time = new Date().getTime();
    const db = await this.getDataBaseInstance();
    await Promise.all([
      db.run(this.cars.update.normal, [newDetails.model, newDetails.value, time, newDetails.uuid]),
      db.run(this.cars.update.local, [
        newDetails.model,
        newDetails.value,
        0,
        this.isNewRow(localCar) ? 0 : 1,
        1,
        newDetails.uuid])
    ]).catch(error => console.error(error))
      .finally(() => db.close())
      .then(() => debug('Database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
  }

  /* ===================================================================================== */
  /* Sync operations */
  /* ===================================================================================== */

  async setDateTimeFromServer (dateTimeFromServer) {
    const db = await this.getDataBaseInstance();
    await this.execAsyncSQL(db, [
      db.run(syncProperties.insert, [`${dateTimeFromServer}`])
    ], {
      tag: 'Database:sync:SyncProperties',
      msg: 'Setting the date of the server: <' + dateTimeFromServer + '> : ' + new Date(dateTimeFromServer).toUTCString()
    });
  }

  async getLastSynchronization () {
    const db = await this.getDataBaseInstance();
    const time = await this.getAsyncSQL(db, [
      db.get(syncProperties.getLast)
    ], {
      tag: 'Database:sync',
      msg: 'Getting the last time when the app was synchronize.'
    });
    if (time.length > 1) {
      throw Error('Something wrong happens.');
    } else {
      debug('Database:sync', time[0]);
      return time[0];
    }
  }

  async getConflictsFrom (table) {
    const db = await this.getDataBaseInstance();
    const result = await this.getAsyncSQL(db,
      db.all(`SELECT * FROM ${table} WHERE isActive = 1`), {
        tag: 'Database:sync:conflicts',
        msg: `Getting conflicts from ${table}`
      });
    return result;
  }

  getConflictsUsers () {
    return this.getConflictsFrom('ConflictUsers');
  }

  getConflictsCars () {
    return this.getConflictsFrom('ConflictCars');
  }

  getConflictsConflictUserOwnCar () {
    return this.getConflictsFrom('ConflictUserOwnCar');
  }

  async getAddedLocalValues (sql, table) {
    const db = await this.getDataBaseInstance();
    const result = await this.getAsyncSQL(db,
      db.all(sql), {
        tag: 'Database:sync:added',
        msg: `Getting new values from ${table}`
      });
    return result;
  }

  getAddedLocalUsers () {
    return this.getAddedLocalValues('SELECT username, password FROM LocalUsers WHERE isOnServer = 0 AND',
      'LocalUsers');
  }

  getAddedLocalCars () {
    return this.getAddedLocalValues('LocalCars');
  }

  getAddedLocalUserOwnCar () {
    return this.getAddedLocalValues('LocalUserOwnCar');
  }

  /* ===================================================================================== */
  /* Database generic SQL executers */
  /* ===================================================================================== */

  async execAsyncSQL (database, promises, debugOptions) {
    debug(debugOptions.tag, debugOptions.msg);
    await Promise.all(promises)
      .catch(error => console.error(error))
      .finally(() => database.close())
      .then(() => debug('Database:instance', 'Database closed.'))
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
      .then(() => debug('Database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
    return result;
  }
}

module.exports = Database;
