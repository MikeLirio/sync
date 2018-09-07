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

  async isUsernameAvaliable(username) {
    const user = await this.database.getUser(username);
    debug('Users founded:', user);
    return !user || user.length === 0;
  }

  async register(name, password) {
    const isUserAvaliable = await this.isUsernameAvaliable(name); 
    if (isUserAvaliable) {
      await this.database.register(name, password);
    } else {
      console.log(`The user ${name} already exists.`);
    }
  }
}

module.exports = CarMarketSync;