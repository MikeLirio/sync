'use strict';

const debug = require('../src/debug');
const fileSystem = require('fs');
const { useFakeTimers } = require('sinon');
const { describe, before, it } = require('mocha');
require('chai').should();
require('./mockServer');

process.env.NODE_ENV = 'test';
const CarMarket = require('../src/CarMarket');

const now = new Date().getTime();

const usersExpected = {
  normal: [
    {
      username: 'Jhon',
      password: '123',
      ModifiedOn: `${now + 1000}`,
      isActive: 1
    }, {
      username: 'Mike',
      password: '123',
      ModifiedOn: `${now}`,
      isActive: 1
    }, {
      username: 'Sarah',
      password: '123',
      ModifiedOn: `${now}`,
      isActive: 1
    }
  ],
  local: [
    {
      username: 'Jhon',
      password: '123',
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
      password: '123',
      isFromServer: 0,
      isModified: 0,
      isActive: 1
    }
  ]
};

describe('CarMarket test Demo', function () {
  const app = new CarMarket();

  before(function () {
    if (fileSystem.existsSync('./test.car.db')) {
      fileSystem.unlinkSync('./test.car.db');
      debug('Test:before', `'./test.car.db' deleted.`);
      this.clock = useFakeTimers(now);
    }
  });

  describe('Flow', function () {
    it('Register users', async function () {
      await app.register('Mike', 123);
      await app.register('Sarah', 123);

      this.clock.tick(1000);

      await app.register('Jhon', 123);

      const users = await app.database.getAllUsers();
      debug('Test:register:users', users);

      const localUsers = await app.database.getAllUsers('Local');
      debug('Test:register:localUsers', localUsers);

      users.should.deep.equal(usersExpected.normal);
      localUsers.should.deep.equal(usersExpected.local);
    });
  });
});
