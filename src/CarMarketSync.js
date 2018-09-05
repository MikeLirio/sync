'use strict';

const debug = require('debug')('CarMarketSync');
const db    = require('./database');

const defaultConfiguration = require('../conf/default.json');

class CarMarketSync {

  constructor(configuration) {
    if (configuration) {
      this.load(configuration);
    } else {
      debug('Loading the default configuration.');
      this.load(defaultConfiguration);
    }
  }
  
  load(configuration) {
    this.configuration = configuration;
    this.database = db.getDataBaseInstance(configuration.database);
  }

  register(name, password) {
    console.log(`${name} - ${password}`);
  }
}

module.exports = CarMarketSync;