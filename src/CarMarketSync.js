'use strict';

const Database = require('./database');
const debug = require('./debug')
const defaultConfiguration = require('../conf/default.json');

class CarMarketSync {

  constructor(configuration) {
    if (configuration) {
      debug('CarMarketSync:constructor', configuration);
      this.load(configuration);
    } else {
      debug('CarMarketSync:constructor', 'Loading the default configuration.');
      this.load(defaultConfiguration);
    }
  }
  
  load(configuration) {
    this.conf = configuration;
    this.database = new Database(this.conf.database);
  }

  async userRegistered(username) {
    const user = await this.database.getUser(username);
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
    const username = credentials.username;
    console.log(`Adding to user ${username} the car ${car.model}:${car.value}`);
    // TODO check password. 
    const isLogged = await this.database.getUser(username);
    if (isLogged) {
      await this.database.addCar(username, car);
      console.log(`Car added.`);
    } else {
      console.log(`The user ${username} is not regstered.`);
    }
  }

  async getCars(username) {
    const user = await this.database.getUser(username);
    if (user) {
      console.log(`Obtaining the cars of ${username}...`);
      const cars = await this.database.getCarsFromUser(username); 
      if (cars && cars.length > 0) {
        let result = 'Cars founded:';
        cars.forEach(car => result += `\n - ${car.model} : ${car.value} : ${car.uuid}`);
        console.log(result);
      } else {
        console.log('No cars founded.');
      }
    } else {
      console.log(`The user ${username} is not registered.`);
    }
  }

  async editCar(newDetails) {
    const car = await this.database.getCar(newDetails.uuid);
    await this.database.updateCar(newDetails);
    const updatedCar = await this.database.getCar(newDetails.uuid);
    console.log(`Old car details: \n - ${car.model}:${car.value}\nNew details:\n - ${updatedCar.model}:${updatedCar.value}`);
    debug('CarMarketSync:editCar:OldCar', car);
    debug('CarMarketSync:editCar:UpdatedCar', updatedCar);
  }

  async deleteCar(carId) {
    const car = await this.database.getCar(carId);
    if (car) {
      await this.database.deleteCar(carId);
      console.log(`The car ${carId} has been deleted.`)
    } else {
      console.log(`The car with the ID ${carId} does not exist.`);
    }
  }
  
  async deleteUser(username) {
    const user = await this.database.getUser(username);
    if (user) {
      await this.database.deleteUser(username);
      console.log(`The user ${username} has been deleted.`);
    } else {
      console.log(`The user ${username} does not exist.`);
    }
  }
}

module.exports = CarMarketSync;