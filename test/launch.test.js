'use strict';

const util = require('util');
const debug = require('../src/debug');
const fileSystem = require('fs');
const nock = require('nock');
const { useFakeTimers } = require('sinon');
const { describe, before, it } = require('mocha');
require('chai').should();

process.env.NODE_ENV = 'test';
const CarMarket = require('../src/CarMarket');
const results = require('./expected.results');

describe('CarMarket test Demo', function () {
  const app = new CarMarket();

  before(function () {
    if (fileSystem.existsSync('./test.car.db')) {
      fileSystem.unlinkSync('./test.car.db');
      debug('Test:before', `'./test.car.db' deleted.`);
    }
    this.clock = useFakeTimers(1000);
    this.clock.runAll();
  });

  describe('Flow with no conflicts.', function () {
    it('Flow : Test 1 : Register users', async function () {
      nock('http://server.mock:8080')
        .get('/getDateTimeUTC')
        .reply(200, {
          serverTime: 1000
        });

      await app.register('Mike', '123');
      await app.register('Jhon', '123');
      await app.register('Sarah', '123');
      await app.changePassword('Sarah', '123', '987');

      this.clock.tick(1000);

      await app.changePassword('Jhon', '123', '456');
      await app.register('Jane', '123');
      await app.deleteUser('Jane');

      const users = await app.database.getAllActiveUsers();
      debug('Test:register:users', users);

      const localUsers = await app.database.getAllActiveUsers('Local');
      debug('Test:register:localUsers', localUsers);

      const registerUsers = results.registerUsers;
      users.should.deep.equal(registerUsers.normal);
      localUsers.should.deep.equal(registerUsers.local);
      nock.cleanAll();
    }).timeout(5000);

    it('Flow : Test 2 : Checking correct array of element when it synchronize', async function () {
      const elementsToSync = await app.syncService.getRowsToSync();
      debug('Test:elementsToSync', util.inspect(elementsToSync, false, null, true));
      elementsToSync.should.deep.equal(results.elementsToSync);
    });

    it('Flow : Test 3 : Make Synchronization', async function () {
      nock('http://server.mock:8080')
        .get('/getDateTimeUTC')
        .reply(200, {
          serverTime: 3000
        });

      nock('http://server.mock:8080')
        .post('/synchronize', function (body) {
          debug('nocked:server:synchronize:received', body);
          return body.news && body.modified && body.deleted;
        })
        .reply(200, {
          updated: {
            Users: [{
              username: 'Mike',
              password: '951'
            }, {
              username: 'Sarah',
              password: '987'
            }, {
              username: 'Lane',
              password: '456'
            }],
            Cars: [],
            UserOwnCar: []
          },
          conflicts: []
        });

      const thereAreConflics = await app.syncService.checkConflicts();
      debug('Test:sync:thereAreConflics', thereAreConflics);
      thereAreConflics.should.equal(false);

      this.clock.tick(1000);

      await app.syncService.synchronize();

      const users = await app.database.getAllActiveUsers();
      debug('Test:after:sync:users', users);

      const localUsers = await app.database.getAllActiveUsers('Local');
      debug('Test:after:sync:localUsers', localUsers);

      const usersAfterFirstSync = results.usersAfterFirstSync;
      users.should.deep.equal(usersAfterFirstSync.normal);
      localUsers.should.deep.equal(usersAfterFirstSync.local);

      nock.cleanAll();
    });
  });
});
