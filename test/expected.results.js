'use strict';

function registerUsers (now) {
  return {
    normal: [
      {
        username: 'Jhon',
        password: '456',
        ModifiedOn: `${now + 1000}`,
        isActive: 1
      }, {
        username: 'Mike',
        password: '123',
        ModifiedOn: `${now}`,
        isActive: 1
      }, {
        username: 'Sarah',
        password: '987',
        ModifiedOn: `${now}`,
        isActive: 1
      }
    ],
    local: [
      {
        username: 'Jhon',
        password: '456',
        isFromServer: 0,
        isModified: 0,
        isActive: 1
      }, {
        username: 'Mike',
        password: '123',
        isFromServer: 0,
        isModified: 0,
        isActive: 1
      }, {
        username: 'Sarah',
        password: '987',
        isFromServer: 0,
        isModified: 0,
        isActive: 1
      }
    ]
  };
}

const elementsToSync = {
  news: {
    users: [
      { username: 'Jhon', password: '456' },
      { username: 'Mike', password: '123' },
      { username: 'Sarah', password: '987' }
    ],
    cars: [],
    userOwnCar: []
  },
  modified: {
    users: [],
    cars: [],
    userOwnCar: []
  },
  deleted: {
    users: [],
    cars: [],
    userOwnCar: []
  }
};

function usersAfterFirstSync (now) {
  return {
    normal: [
      {
        username: 'Lane',
        password: '456',
        ModifiedOn: `${now + 1000}`,
        isActive: 1
      }, {
        username: 'Mike',
        password: '951',
        ModifiedOn: `${now + 2000}`,
        isActive: 1
      }, {
        username: 'Sarah',
        password: '987',
        ModifiedOn: `${now + 2000}`,
        isActive: 1
      }
    ],
    local: [
      {
        username: 'Lane',
        password: '456',
        isFromServer: 1,
        isModified: 0,
        isActive: 1
      }, {
        username: 'Mike',
        password: '951',
        isFromServer: 1,
        isModified: 1,
        isActive: 1
      }, {
        username: 'Sarah',
        password: '987',
        isFromServer: 1,
        isModified: 0,
        isActive: 1
      }
    ]
  };
}

module.exports = {
  registerUsers,
  elementsToSync,
  usersAfterFirstSync
};
