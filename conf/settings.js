'use strict';

const env = process.env.NODE_ENV || 'develop';

const develop = {
  app: {},
  database: {
    path: '',
    name: 'car.db'
  }
};

const test = {
  app: {},
  database: {
    path: '',
    name: ':memory:,'
  }
};

const production = {};

const config = {
  develop,
  test,
  production
};

module.exports = config[env];
