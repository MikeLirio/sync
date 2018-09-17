'use strict';

function checkTablePrefix (prefix, table) {
  if (prefix !== '' && prefix !== 'Local' && prefix !== 'Conflict') {
    throw Error(`The table ${prefix + table} does not exist.`);
  }
}

// check how ID is created. (you can call it with rowid oid _rowid_)
const syncProperties = {
  name: 'SyncProperties',
  table: 'CREATE TABLE if not exists SyncProperties (lastSync TEXT)',
  insert: 'INSERT INTO SyncProperties VALUES (?)',
  getLast: 'SELECT lastSync FROM SyncProperties ORDER BY rowid DESC LIMIT 1'
};

const users = {
  name: 'Users',
  tables: {
    normal: 'CREATE TABLE if not exists Users ' +
          '(username TEXT PRIMARY KEY,' +
          'password TEXT,' +
          'ModifiedOn TEXT,' +
          'isActive INT) WITHOUT ROWID',
    conflict: 'CREATE TABLE if not exists ConflictUsers ' +
          '(username TEXT PRIMARY KEY,' +
          'password TEXT,' +
          'isActive INT) WITHOUT ROWID',
    local: 'CREATE TABLE if not exists LocalUsers ' +
            '(username TEXT PRIMARY KEY,' +
            'password TEXT,' +
            'isFromServer INT,' +
            'isModified INT,' +
            'isActive INT) WITHOUT ROWID'
  },
  operations: {
    get: {
      user (prefix = '') {
        checkTablePrefix(prefix, 'Cars');
        return `SELECT * FROM ${prefix}Users WHERE username = ? AND isActive = 1`;
      },
      users (prefix = '') {
        checkTablePrefix(prefix, 'Cars');
        return `SELECT * FROM ${prefix}Users WHERE isActive = 1`;
      },
      newRows: 'SELECT username, password FROM LocalUsers WHERE isFromServer = 0 AND isModified = 0 AND isActive = 1',
      modifiedRows: 'SELECT username, password FROM LocalUsers WHERE isFromServer = 0 AND isModified = 1 AND isActive = 1',
      deletedRows: 'SELECT username, password FROM LocalUsers WHERE isFromServer = 0 AND isModified = 0 AND isActive = 0'
    },
    insert: {
      normal: 'INSERT INTO Users VALUES (?, ?, ?, ?)',
      conflict: 'INSERT INTO ConflictUsers VALUES (?, ?, ?)',
      local: 'INSERT INTO LocalUsers VALUES (?, ?, ?, ?, ?)'
    },
    update: {
      normal: 'UPDATE Users SET password = ?, ModifiedOn = ? WHERE username = ?',
      local: 'UPDATE LocalUsers SET password = ?, isFromServer = 0, isModified = ? WHERE username = ?'
    },
    desactivate: {
      normal: 'UPDATE Users SET ModifiedOn = ?, isActive = 0 WHERE username = ?',
      local: 'UPDATE LocalUsers SET isModified = 1, isActive = 0 WHERE username = ?',
      conflict: 'UPDATE ConflictUsers SET isActive = 0 WHERE username = ?'
    },
    delete (prefix = '') {
      checkTablePrefix(prefix, 'UserOwnCar');
      return `DELETE FROM ${prefix}Users WHERE username = ?`;
    }
  }
};

const cars = {
  name: 'Cars',
  tables: {
    normal: 'CREATE TABLE if not exists Cars ' +
            '(uuid TEXT PRIMARY KEY,' +
            'model TEXT,' +
            'value TEXT,' +
            'ModifiedOn TEXT,' +
            'isActive INT) WITHOUT ROWID',
    conflict: 'CREATE TABLE if not exists ConflictCars ' +
              '(uuid TEXT PRIMARY KEY,' +
              'isActive INT) WITHOUT ROWID',
    local: 'CREATE TABLE if not exists LocalCars ' +
            '(uuid TEXT PRIMARY KEY,' +
            'model TEXT,' +
            'value TEXT,' +
            'isFromServer INT,' +
            'isModified INT,' +
            'isActive INT) WITHOUT ROWID'
  },
  operations: {
    get: {
      car (prefix = '') {
        checkTablePrefix(prefix, 'Cars');
        return `SELECT * FROM ${prefix}Cars WHERE uuid = ? AND isActive = 1`;
      },
      cars (prefix = '') {
        checkTablePrefix(prefix, 'Cars');
        return `SELECT * FROM ${prefix}Cars WHERE isActive = 1`;
      },
      newRows: 'SELECT uuid, model, value FROM LocalCars WHERE isFromServer = 0 AND isModified = 0 AND isActive = 1',
      modifiedRows: 'SELECT uuid, model, value FROM LocalCars WHERE isFromServer = 0 AND isModified = 1 AND isActive = 1',
      deletedRows: 'SELECT uuid, model, value FROM LocalCars WHERE isFromServer = 0 AND isModified = 0 AND isActive = 0'
    },
    insert: {
      normal: 'INSERT INTO Cars VALUES (?, ?, ?, ?, ?)',
      conflict: 'INSERT INTO ConflictCars VALUES (?, ?, ?, ?)',
      local: 'INSERT INTO LocalCars VALUES (?, ?, ?, ?, ?, ?)'
    },
    update: {
      normal: 'UPDATE Cars SET model = ?, value = ?, ModifiedOn = ?, isActive = 1 WHERE uuid = ?',
      local: 'UPDATE LocalCars SET model = ?, value = ?, isFromServer = ?, isModified = ?, isActive = ? WHERE uuid = ?'
    },
    desactivate: {
      normal: 'UPDATE Cars SET ModifiedOn = ?, isActive = 0 WHERE uuid = ?',
      local: 'UPDATE LocalCars SET isModified = 1, isActive = 0 WHERE uuid = ?',
      conflict: 'UPDATE ConflictCars SET isActive = 0 WHERE uuid = ?'
    },
    delete (prefix = '') {
      checkTablePrefix(prefix, 'Cars');
      return `DELETE FROM ${prefix}Cars WHERE uuid = ?`;
    }
  }
};

const userOwnCar = {
  name: 'UserOwnCar',
  tables: {
    normal: 'CREATE TABLE if not exists UserOwnCar (' +
              'user TEXT,' +
              'carId TEXT,' +
              'ModifiedOn TEXT,' +
              'isActive INT,' +
              'FOREIGN KEY(user) REFERENCES Users(username),' +
              'FOREIGN KEY(carId) REFERENCES Cars(uuid))',
    conflict: 'CREATE TABLE if not exists ConflictUserOwnCar (' +
              'user TEXT,' +
              'carId TEXT,' +
              'isActive INT,' +
              'PRIMARY KEY(user, carId),' +
              'FOREIGN KEY(user) REFERENCES Users(username),' +
              'FOREIGN KEY(carId) REFERENCES Cars(uuid))',
    local: 'CREATE TABLE if not exists LocalUserOwnCar (' +
            'user TEXT,' +
            'carId TEXT,' +
            'isFromServer INT,' +
            'isModified INT,' +
            'isActive INT,' +
            'FOREIGN KEY(user) REFERENCES Users(username),' +
            'FOREIGN KEY(carId) REFERENCES Cars(uuid))'
  },
  operations: {
    get: {
      userOwnCar (prefix = '') {
        checkTablePrefix(prefix, 'userOwnCar');
        return `SELECT * FROM ${prefix}UserOwnCar WHERE uuid = ? AND isActive = 1`;
      },
      userOwnCars (prefix = '') {
        checkTablePrefix(prefix, 'userOwnCar');
        return `SELECT * FROM ${prefix}UserOwnCar WHERE user = ? AND isActive = 1`;
      },
      newRows: 'SELECT user, carId FROM LocalUserOwnCar WHERE isFromServer = 0 AND isModified = 0 AND isActive = 1',
      modifiedRows: 'SELECT user, carId FROM LocalUserOwnCar WHERE isFromServer = 0 AND isModified = 1 AND isActive = 1',
      deletedRows: 'SELECT user, carId FROM LocalUserOwnCar WHERE isFromServer = 0 AND isModified = 0 AND isActive = 0'
    },
    insert: {
      normal: 'INSERT INTO UserOwnCar VALUES (?, ?, ?, ?)',
      conflict: 'INSERT INTO ConflictUserOwnCar VALUES (?, ?, ?)',
      local: 'INSERT INTO LocalUserOwnCar VALUES (?, ?, ?, ?, ?)'
    },
    desactivate: {
      normal: 'UPDATE UserOwnCar SET ModifiedOn = ?, isActive = 0 WHERE carId = ?',
      local: 'UPDATE LocalUserOwnCar SET isModified = 1, isActive = 0 WHERE carId = ?',
      conflict: 'UPDATE ConflictUserOwnCar SET isActive = 0 WHERE carId = ?'
    },
    desactivateAll: {
      normal: 'UPDATE UserOwnCar SET ModifiedOn = ?, isActive = 0 WHERE user = ?',
      local: 'UPDATE LocalUserOwnCar SET isModified = 1, isActive = 0 WHERE user = ?',
      conflict: 'UPDATE ConflictUserOwnCar SET isActive = 0 WHERE user = ?'
    },
    delete (prefix = '') {
      checkTablePrefix(prefix, 'UserOwnCar');
      return `DELETE FROM ${prefix}UserOwnCar WHERE carId = ?`;
    },
    deleteAll (prefix = '') {
      checkTablePrefix(prefix, 'UserOwnCar');
      return `DELETE FROM ${prefix}UserOwnCar WHERE user = ?`;
    }
  }
};

const carsFromUser = 'SELECT LocalCars.* FROM LocalCars, LocaluserOwnCar ' +
                      'WHERE LocaluserOwnCar.user = ? AND ' +
                        'LocalUserOwnCar.carId = LocalCars.uuid AND LocalCars.isActive = 1';

const operations = {
  get: {
    carsFromUser
  }
};

const tables = {
  users,
  cars,
  userOwnCar
};

module.exports = {
  syncProperties,
  tables,
  operations
};
