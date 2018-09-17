'use strict';

const debug = require('../src/debug');
const nock = require('nock');

nock('http://server.mock:8080')
  .get('/getDateTimeUTC')
  .reply(200, {
    serverTime: new Date().getTime()
  });

nock('http://server.mock:8080')
  .post('/synchronize', function (body) {
    debug('nocked:server:synchronize:received', body);
    return body.news && body.modified && body.deleted;
  })
  .reply(200, {
    updated: {
      Users: [{

      }],
      Cars: [],
      UserOwnCar: []
    },
    conflicts: []
  });
