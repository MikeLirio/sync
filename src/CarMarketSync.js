'use strict';

const debug     = require('debug')('CarMarketSync');
const Database  = require('./database');

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
    this.conf = configuration;
    this.database = new Database(this.conf.database);
  }

  register(name, password) {
    const isAvaliable = this.database.isUsernameAvaliable();
    console.log(isAvaliable);
    if (isAvaliable) {
      this.database.register(name, password);
      console.log(`User ${name} has been registered.`);
    } else {
      console.log('The user already exists.');
    }
  }
}

module.exports = CarMarketSync;