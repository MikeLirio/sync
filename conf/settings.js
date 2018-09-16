'use strict';

const env = process.env.NODE_ENV || 'develop';

const develop = {
  app: {},
  database: {
    path: '',
    name: 'car.db'
  },
  server: {
    mock: true,
    options: {
      host: 'server.mock',
      port: '8080',
      protocol: 'http:',
      rejectUnauthorized: false
    },
    endpoints: {
      getServerTime: {
        path: 'getDateTimeUTC',
        method: 'GET'
      },
      synchronization: {
        path: '/synchronize',
        method: 'POST'
      }
    }
  }
};

const test = {
  app: {},
  database: {
    path: '',
    name: ':memory:'
  },
  server: {
    mock: true,
    options: {
      host: 'server.mock',
      port: '8080',
      protocol: 'http:',
      rejectUnauthorized: false
    },
    endpoints: {
      getServerTime: {
        path: 'getDateTimeUTC',
        method: 'GET'
      },
      synchronization: {
        path: 'synchronize',
        method: 'POST'
      }
    }
  }
};

const production = {};

const config = {
  develop,
  test,
  production
};

module.exports = config[env];
