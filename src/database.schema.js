'use strict';

// check how ID is created. (you can call it with rowid oid _rowid_)
const SyncProperties = {
  name: 'SyncProperties',
  sql: 'CREATE TABLE if not exists SyncProperties (lastSync INT)'
};

const users = {
  name: 'Users',
  conflict: 'CREATE TABLE if not exists ConflictUsers ' +
          '(username TEXT PRIMARY KEY,' +
          'password TEXT,' +
          'isActive INT) WITHOUT ROWID',
  local: 'CREATE TABLE if not exists LocalUsers ' +
          '(username TEXT PRIMARY KEY,' +
          'password TEXT,' +
          'isOnServer INT,' +
          'isModified INT,' +
          'isActive INT) WITHOUT ROWID'
};

const cars = {
  name: 'Cars',
  conflict: 'CREATE TABLE if not exists ConflictCars ' +
            '(uuid TEXT PRIMARY KEY,' +
            'isActive INT) WITHOUT ROWID',
  local: 'CREATE TABLE if not exists LocalCars ' +
          '(uuid TEXT PRIMARY KEY,' +
          'model TEXT,' +
          'value TEXT,' +
          'isOnServer INT,' +
          'isModified INT,' +
          'isActive INT) WITHOUT ROWID'
};

const userOwnCar = {
  name: 'UserOwnCar',
  conflict: 'CREATE TABLE if not exists ConflictUserOwnCar (' +
            'user TEXT,' +
            'carId TEXT,' +
            'isActive INT,' +
            'PRIMARY KEY(user, carId),' +
            'FOREIGN KEY(user) REFERENCES LocalUsers(username),' +
            'FOREIGN KEY(carId) REFERENCES LocalCars(uuid))',
  local: 'CREATE TABLE if not exists LocalUserOwnCar (' +
          'user TEXT,' +
          'carId TEXT,' +
          'isOnServer INT,' +
          'isModified INT,' +
          'isActive INT,' +
          'FOREIGN KEY(user) REFERENCES LocalUsers(username),' +
          'FOREIGN KEY(carId) REFERENCES LocalCars(uuid))'
};

const tables = [
  users,
  cars,
  userOwnCar
];

module.exports = {
  SyncProperties,
  tables
};
