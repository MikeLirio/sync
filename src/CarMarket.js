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
    let result = '';
    result = `Registering the user <${usr}>...`;
    if (await this.checkUser(usr)) {
      result += `\nThe user <${usr}> already exists.`;
    } else {
      await this.database.addUser(usr, password);
      result += `\nThe user <${usr}> has been registered.`;
    }
    return result;
  }

  async changePassword (usr, oldPassword, newPassword) {
    let result = '';
    const user = await this.database.getUser(usr);
    if (user) {
      if (user.password === oldPassword) {
        await this.database.updatePassword(usr, newPassword);
        result += `\nThe password has been changed.`;
      } else {
        result += `\nThe old password does not match. Unable to update it.`;
      }
    } else {
      result += `\nThe user <${usr}> does not exist.`;
    }
    return result;
  }

  async addCar (usr, car) {
    let result = `\nAdding to user <${usr}> the car <${car.model}:${car.value}>.`;
    if (await this.checkUser(usr)) {
      const carId = await this.database.addCar(usr, car);
      result += `\nCar added. Id <${carId}>.`;
    } else {
      result += `\nThe user <${usr}> is not registered.`;
    }
    return result;
  }

  async getCars (usr) {
    let result = '';
    if (await this.checkUser(usr)) {
      result += `\nObtaining the cars of <${usr}>...`;
      const cars = await this.database.getCarsFromUser(usr);
      if (cars && cars.length > 0) {
        result += '\nCars founded:';
        cars.forEach(car => {
          result += `\n - ${car.model} : ${car.value} : ${car.uuid}`;
        });
      } else {
        result += '\nNo cars founded.';
      }
    } else {
      result += `\nThe user <${usr}> is not registered.`;
    }
    return result;
  }

  async editCar (newDetails) {
    const carId = newDetails.uuid;
    if (await this.checkCar(carId)) {
      const car = await this.database.getCar(carId);
      await this.database.updateCar(newDetails);
      const updatedCar = await this.database.getCar(carId);
      debug('CarMarket:editCar:OldCar', car);
      debug('CarMarket:editCar:UpdatedCar', updatedCar);
      return `Old car details: \n - ${car.model}:${car.value}\nNew details:\n - ${updatedCar.model}:${updatedCar.value}`;
    } else {
      return `The car with the ID <${carId}> does not exist.`;
    }
  }

  async deleteCar (carId) {
    const car = await this.database.getCar(carId);
    if (car) {
      await this.database.desactivateOrDeleteCar(carId);
      return `The car <${carId}> has been deleted.`;
    } else {
      return `The car with the ID <${carId}> does not exist.`;
    }
  }

  async deleteUser (usr) {
    if (await this.checkUser(usr)) {
      await this.database.desactivateOrDeleteUser(usr);
      return `The user <${usr}> has been deleted.`;
    } else {
      return `The user <${usr}> does not exist.`;
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
      return `Last Sync: ${new Date(parseInt(time.lastSync)).toUTCString()}`;
    } else {
      return 'This APP has not been synchronize yet.';
    }
  }
}

module.exports = CarMarket;
