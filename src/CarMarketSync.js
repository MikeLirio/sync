'use strict';

const Database = require('./database');
const debug = require('./debug');
const config = require('../conf/settings');

class CarMarketSync {
  constructor (configuration) {
    if (configuration) {
      debug('CarMarketSync:constructor:custom', configuration);
      this.load(configuration);
    } else {
      debug('CarMarketSync:constructor', 'Loading the default configuration.');
      this.load(config);
    }
  }

  load (configuration) {
    if (configuration) {
      this.conf = configuration;
      this.database = new Database(this.conf.database);
    } else {
      throw Error('Error. No configuration founded.');
    }
  }

  async userExists (usr) {
    const user = await this.database.getUser(usr);
    return !!user;
  }

  async carExists (carId) {
    const car = await this.database.getCar(carId);
    return !!car;
  }

  async register (usr, password) {
    console.log(`Registering the user <${usr}>...`);
    if (await this.userExists(usr)) {
      console.log(`The user <${usr}> already exists.`);
    } else {
      await this.database.addUser(usr, password);
      console.log(`The user <${usr}> has been registered.`);
    }
  }

  async addCar (usr, car) {
    console.log(`Adding to user <${usr}> the car <${car.model}:${car.value}>.`);
    if (await this.userExists(usr)) {
      const carId = await this.database.addCar(usr, car);
      console.log(`Car added. Id <${carId}>.`);
    } else {
      console.log(`The user <${usr}> is not registered.`);
    }
  }

  async getCars (usr) {
    if (await this.userExists(usr)) {
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
    if (await this.carExists(carId)) {
      const car = await this.database.getCar(carId);
      await this.database.updateCar(newDetails);
      const updatedCar = await this.database.getCar(carId);
      debug('CarMarketSync:editCar:OldCar', car);
      debug('CarMarketSync:editCar:UpdatedCar', updatedCar);
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
    if (await this.userExists(usr)) {
      await this.database.deleteUser(usr);
      console.log(`The user <${usr}> has been deleted.`);
    } else {
      console.log(`The user <${usr}> does not exist.`);
    }
  }

  async synchronize () {
    const dateTimeFromServer = new Date().getTime();
    this.database.setDateTimeFromServer(dateTimeFromServer);
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

module.exports = CarMarketSync;
