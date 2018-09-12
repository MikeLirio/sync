'use strict';

const Database = require('./Database');
const SyncService = require('./SyncService');
const debug = require('./debug');
const settings = require('../conf/settings');

class CarMarket {
  constructor (configuration) {
    if (configuration) {
      debug('CarMarket:constructor:custom', configuration);
      this.load(configuration);
    } else {
      debug('CarMarket:constructor', 'Loading the default configuration.', settings);
      this.load(settings);
    }
  }

  load (configuration) {
    if (configuration) {
      this.config = configuration;
      this.database = new Database(this.config.database);
      this.sync = new SyncService(this.config);
    } else {
      throw Error('Error. No configuration founded.');
    }
  }

  async checkUser (usr) {
    const user = await this.database.getUser(usr);
    return !!user;
  }

  async checkCar (carId) {
    const car = await this.database.getCar(carId);
    return !!car;
  }

  async register (usr, password) {
    console.log(`Registering the user <${usr}>...`);
    if (await this.checkUser(usr)) {
      console.log(`The user <${usr}> already exists.`);
    } else {
      await this.database.addUser(usr, password);
      console.log(`The user <${usr}> has been registered.`);
    }
  }

  async addCar (usr, car) {
    console.log(`Adding to user <${usr}> the car <${car.model}:${car.value}>.`);
    if (await this.checkUser(usr)) {
      const carId = await this.database.addCar(usr, car);
      console.log(`Car added. Id <${carId}>.`);
    } else {
      console.log(`The user <${usr}> is not registered.`);
    }
  }

  async getCars (usr) {
    if (await this.checkUser(usr)) {
      console.log(`Obtaining the cars of <${usr}>...`);
      const cars = await this.database.getCarsFromUser(usr);
      if (cars && cars.length > 0) {
        let result = 'Cars founded:';
        cars.forEach(car => {
          result += `\n - ${car.model} : ${car.value} : ${car.uuid}`;
        });
        console.log(result);
      } else {
        console.log('No cars founded.');
      }
    } else {
      console.log(`The user <${usr}> is not registered.`);
    }
  }

  async editCar (newDetails) {
    const carId = newDetails.uuid;
    if (await this.checkCar(carId)) {
      const car = await this.database.getCar(carId);
      await this.database.updateCar(newDetails);
      const updatedCar = await this.database.getCar(carId);
      debug('CarMarket:editCar:OldCar', car);
      debug('CarMarket:editCar:UpdatedCar', updatedCar);
      console.log(`Old car details: \n - ${car.model}:${car.value}\nNew details:\n - ${updatedCar.model}:${updatedCar.value}`);
    } else {
      console.log(`The car with the ID <${carId}> does not exist.`);
    }
  }

  async deleteCar (carId) {
    const car = await this.database.getCar(carId);
    if (car) {
      await this.database.deleteCar(carId);
      console.log(`The car <${carId}> has been deleted.`);
    } else {
      console.log(`The car with the ID <${carId}> does not exist.`);
    }
  }

  async deleteUser (usr) {
    if (await this.checkUser(usr)) {
      await this.database.deleteUser(usr);
      console.log(`The user <${usr}> has been deleted.`);
    } else {
      console.log(`The user <${usr}> does not exist.`);
    }
  }

  async synchronize () {
    debug('CarMarket:sync', 'Begining the synchronization...');
    await this.sync.synchronize();
    await this.lastSynchronization();
  }

  async lastSynchronization () {
    const time = await this.database.getLastSynchronization();
    if (time) {
      console.log(`Last Sync: ${new Date(time.lastSync).toUTCString()}`);
    } else {
      console.log('This APP has not been synchronize yet.');
    }
  }
}

module.exports = CarMarket;
