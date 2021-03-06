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
      tag: 'Database:get',
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

  async deleteAllLocals () {
    const db = await this.getDataBaseInstance();
    const promisesArray = [
      db.run(this.users.deleteAllLocal),
      db.run(this.cars.deleteAllLocal),
      db.run(this.userOwnCar.deleteAllLocal)
    ];
    await this.execAsyncSQL(db, promisesArray, {
      tag: 'Database:sync:deleteLocals',
      msg: 'Deleting all the local tables...'
    });
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

  async getAllActiveUsers (prefix) {
    debug('Database:user', `Getting all users...`);
    const db = await this.getDataBaseInstance();
    const user = await this.getAsyncSQL(db,
      db.all(this.users.get.users(prefix)), {
        tag: 'Database:user',
        msg: `Getting all users...`
      });
    return user;
  }

  async getUser (username, prefix) {
    const db = await this.getDataBaseInstance();
    const user = await this.getAsyncSQL(db,
      db.get(this.users.get.user(prefix), username), {
        tag: 'Database:user',
        msg: `Getting the user ${username}...`
      });
    return user;
  }

  async addUser (username, password) {
    const db = await this.getDataBaseInstance();
    const time = new Date().getTime();
    await this.execAsyncSQL(
      db,
      [
        db.run(this.users.insert.normal, [username, password, `${time}`, 1]),
        db.run(this.users.insert.local, [username, password, 0, 0, 1])
      ],
      {
        tag: 'Database:user',
        msg: `Creating the user ${username}...`
      }
    );
  }

  async updatePassword (username, newPassword, isFromServer) {
    const localUsers = await this.getUser(username, 'Local');
    const time = new Date().getTime();
    const db = await this.getDataBaseInstance();
    await this.execAsyncSQL(
      db,
      [
        db.run(this.users.update.normal, [newPassword, `${time}`, username]),
        db.run(this.users.update.local, [
          newPassword,
          isFromServer,
          this.isNewRow(localUsers) ? 0 : 1,
          username])
      ],
      {
        tag: 'Database:user',
        msg: `Updating the password...`
      }
    );
  }

  async desactivateOrDeleteUser (username) {
    const localUser = await this.getUser(username, 'Local');
    if (await this.isNewRow(localUser)) {
      await this.deleteUser(username);
    } else {
      await this.desactivateUser(username);
    }
  }

  async desactivateUser (username) {
    const carsToDesactivate = await this.getCarsFromUser(username);
    const time = new Date().getTime();
    const db = await this.getDataBaseInstance();
    const listOfPromisesToDesactivate = [];
    carsToDesactivate.forEach(car => {
      debug('Database:user:car', `Preparing promises to desactivate the car ${car.model}:${car.value}:${car.uuid}`);
      listOfPromisesToDesactivate.push(db.run(this.cars.desactivate.normal, [`${time}`, car.uuid]));
      listOfPromisesToDesactivate.push(db.run(this.cars.desactivate.local, [car.uuid]));
    });

    listOfPromisesToDesactivate.push(db.run(this.userOwnCar.desactivateAll.normal, [`${time}`, username]));
    listOfPromisesToDesactivate.push(db.run(this.userOwnCar.desactivateAll.local, [username]));

    listOfPromisesToDesactivate.push(db.run(this.users.desactivate.normal, [`${time}`, username]));
    listOfPromisesToDesactivate.push(db.run(this.users.desactivate.local, [username]));
    await this.execAsyncSQL(db, listOfPromisesToDesactivate, {
      tag: 'Database:user',
      msg: `Desactivating the user ${username} and all the cars they own.`
    });
  }

  async deleteUser (username) {
    const carsToDelete = await this.getCarsFromUser(username);
    const db = await this.getDataBaseInstance();
    const listOfPromisesToDetele = [];
    carsToDelete.forEach(car => {
      debug('Database:user:car', `Preparing promises to delete the car ${car.model}:${car.value}:${car.uuid}`);
      listOfPromisesToDetele.push(db.run(this.cars.delete(''), [car.uuid]));
      listOfPromisesToDetele.push(db.run(this.cars.delete('Local'), [car.uuid]));
    });

    listOfPromisesToDetele.push(db.run(this.userOwnCar.deleteAll(''), [username]));
    listOfPromisesToDetele.push(db.run(this.userOwnCar.deleteAll('Local'), [username]));

    listOfPromisesToDetele.push(db.run(this.users.delete(''), [username]));
    listOfPromisesToDetele.push(db.run(this.users.delete('Local'), [username]));
    return this.execAsyncSQL(db, listOfPromisesToDetele, {
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
      db.run(this.cars.insert.normal, [car.uuid, car.model, car.value, `${time}`, 1]),
      db.run(this.cars.insert.local, [car.uuid, car.model, car.value, 0, 0, 1]),

      db.run(this.userOwnCar.insert.normal, [user, car.uuid, `${time}`, 1]),
      db.run(this.userOwnCar.insert.local, [user, car.uuid, 0, 0, 1])
    ];
    await this.execAsyncSQL(db, promises, {
      tag: 'Database:car',
      msg: `Adding the car ${car.model}:${car.value} to ${user}.`
    });
    return car.uuid;
  }

  async desactivateOrDeleteCar (carId) {
    const localCar = await this.getCar(carId, 'Local');
    if (await this.isNewRow(localCar)) {
      await this.deleteCar(carId);
    } else {
      await this.desactivateCar(carId);
    }
  }

  async desactivateCar (carId) {
    const db = await this.getDataBaseInstance();
    const time = new Date().getTime();
    const arrayPromises = [
      db.run(this.userOwnCar.desactivate.normal, [`${time}`, carId]),
      db.run(this.userOwnCar.desactivate.local, [carId]),

      db.run(this.cars.desactivate.normal, [`${time}`, carId]),
      db.run(this.cars.desactivate.local, [carId])
    ];
    await this.execAsyncSQL(db, arrayPromises, {
      tag: 'Database:car',
      msg: `Desactivating the car ${carId}.`
    });
  }

  async deleteCar (carId) {
    const db = await this.getDataBaseInstance();
    const arrayPromises = [
      db.run(this.userOwnCar.delete(''), [carId]),
      db.run(this.userOwnCar.delete('Local'), [carId]),

      db.run(this.cars.delete(''), [carId]),
      db.run(this.cars.delete('Local'), [carId])
    ];
    await this.execAsyncSQL(db, arrayPromises, {
      tag: 'Database:car',
      msg: `Deleting the car ${carId}.`
    });
  }

  async updateCar (newDetails) {
    debug('Database:car', `Updating the car ${newDetails.uuid}`);
    const localCar = await this.getCar(newDetails.uuid, 'Local');
    const time = new Date().getTime();
    const db = await this.getDataBaseInstance();
    const arrayPromises = [
      db.run(this.cars.update.normal, [newDetails.model, newDetails.value, `${time}`, newDetails.uuid]),
      db.run(this.cars.update.local, [
        newDetails.model,
        newDetails.value,
        0,
        this.isNewRow(localCar) ? 0 : 1,
        1,
        newDetails.uuid])
    ];
    await this.execAsyncSQL(db, arrayPromises, {
      tag: 'Database:car',
      msg: `Updating the car ${newDetails.uuid}`
    });
  }

  /* ===================================================================================== */
  /* Sync operations */
  /* ===================================================================================== */

  async setDateTimeFromServer (dateTimeFromServer) {
    debug('Database:setDateTimeFromServer', dateTimeFromServer);
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

  async checkChangesBetweenServerAndLocal (syncResponse, serverTime) {
    const { users, cars, userOwnCar } = await this.getAll();

    await this.checkChangesBetweenServerAndLocalUser(syncResponse.updated.Users, users, serverTime);
    // await this.checkChangesBetweenServerAndLocalCars(syncResponse.updated.Cars, cars);
    // await this.checkChangesBetweenServerAndLocalUserOwnCars(syncResponse.updated.UserOwnCar, userOwnCar);
  }

  async checkChangesBetweenServerAndLocalUser (syncResponse, usersRows, serverTime) {
    debug('Database:sync:syncResponse', syncResponse);
    debug('Database:sync:tableRows', usersRows);
    const isFromServer = 1;
    const isModified = 1;
    const isActive = 1;
    const isNotModified = 0;

    const rowsToAdd = syncResponse.filter(function (responseRow) {
      return usersRows.filter(function (userRow) {
        return userRow.username === responseRow.username;
      }).length === 0;
    });
    debug('Database:sync:rowsToAdd', rowsToAdd);

    const rowsToModify = syncResponse.filter(function (responseRow) {
      return usersRows.filter(function (userRow) {
        return userRow.username === responseRow.username && userRow.password !== responseRow.password;
      }).length !== 0;
    });
    debug('Database:sync:rowsToModify', rowsToModify);

    const rowsToDelete = usersRows.filter(function (userRow) {
      return syncResponse.filter(function (responseRow) {
        return responseRow.username === userRow.username;
      }).length === 0;
    });
    debug('Database:sync:rowsToDelete', rowsToDelete);

    const rowsWithoutChanges = syncResponse.filter(function (responseRow) {
      return usersRows.filter(function (userRow) {
        return userRow.username === responseRow.username && userRow.password === responseRow.password;
      }).length !== 0;
    });
    debug('Database:sync:rowsWithoutChanges', rowsWithoutChanges);

    const db = await this.getDataBaseInstance();
    const arrayPromises = [];
    rowsToAdd.forEach(row => {
      arrayPromises.push(db.run(this.users.insert.normal, [
        row.username,
        row.password,
        `${serverTime}`,
        1
      ]));
      arrayPromises.push(db.run(this.users.insert.local, [
        row.username,
        row.password,
        isFromServer,
        isNotModified,
        isActive
      ]));
    });
    rowsToModify.forEach(row => {
      arrayPromises.push(db.run(this.users.update.normal, [row.password, `${serverTime}`, row.username]));
      arrayPromises.push(db.run(this.users.insert.local, [
        row.username,
        row.password,
        isFromServer,
        isModified,
        isActive
      ]));
    });
    rowsWithoutChanges.forEach(row => {
      arrayPromises.push(db.run(this.users.insert.local, [
        row.username,
        row.password,
        isFromServer,
        isNotModified,
        isActive
      ]));
    });

    await this.execAsyncSQL(db, arrayPromises, {
      tag: 'Database:sync:users',
      msg: 'Making the synchronization of Users table.'
    });

    const deletePromises = [];
    rowsToDelete.forEach(row => deletePromises.push(this.deleteUser(row.username)));
    await Promise.all(deletePromises);
  }

  async getAll () {
    debug('Database:sync:getAll', 'Getting all rows Users - Cars - UserOwnCar');
    const db = await this.getDataBaseInstance();
    let result;
    await Promise.all([
      db.all(this.users.get.all),
      db.all(this.cars.get.all),
      db.all(this.userOwnCar.get.all)
    ])
      .then(results => {
        result = {
          users: results[0],
          cars: results[1],
          userOwnCar: results[2]
        };
      })
      .catch(error => {
        console.error(error);
        throw new Error(error);
      })
      .finally(() => db.close())
      .then(() => debug('Database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
    return result;
  }

  /* ===================================================================================== */
  /* Database generic SQL executers */
  /* ===================================================================================== */

  async execAsyncSQL (database, promises, debugOptions) {
    debug(debugOptions.tag, debugOptions.msg);
    await Promise.all(promises)
      .then(() => debug('Database:instance', 'Executed'))
      .catch(error => {
        console.error(error);
        throw new Error(error);
      })
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
      .catch(error => {
        console.error(error);
        throw new Error(error);
      })
      .finally(() => database.close())
      .then(() => debug('Database:instance', 'Database closed.'))
      .catch(errorToClose => console.error(errorToClose));
    return result;
  }
}

module.exports = Database;
