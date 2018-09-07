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

  async userRegistered(username) {
    const user = await this.database.getUser(username);
    debug('Users founded:', user);
    return !user || user.length === 0;
  }

  async logUser(username, password) {
    // TODO check password, in a future
    return await this.userRegistered(username);
  }

  async register(name, password) {
    const isUserAvaliable = await this.userRegistered(name); 
    if (isUserAvaliable) {
      await this.database.addUser(name, password);
      console.log(`The user ${name} has been registered.`);
    } else {
      console.log(`The user ${name} already exists.`);
    }
  }

  async addCar(credentials, car) {
    // TODO check password. 
    const isLogged = await this.database.getUser(credentials.username);
    if (isLogged) {
      await this.database.addCar(credentials.username, car);
      console.log(`Car added.`);
    } else {
      console.log(`The user ${credentials.username} is not regstered.`);
    }
  }

  async getCars(user) {
    const cars = await this.database.getCarsFromUser(user); 
    if (cars && cars.length > 0) {
      console.log('Cars founded:\n', cars);
    } else {
      console.log('No cars founded.');
    }
  }

  async editCar(newDetails) {
    const car = await this.database.getCar(newDetails.uuid);
    await this.database.updateCar(newDetails);
    const updatedCar = await this.database.getCar(newDetails.uuid);
    console.log('Old car details');
    console.log(car);
    console.log('New details');
    console.log(updatedCar);
  }
}

module.exports = CarMarketSync;