'use strict';

const Database = require('./Database');
const debug = require('./debug');

class SyncService {
  constructor (configuration) {
    this.config = configuration;
    debug('server:mock', this.config.server.mock);
    if (this.config.server.mock) {
      require('../test/mockServer');
    }
    this.database = new Database(this.config.database);
  }

  async checkConflicts () {
    debug('SyncService:checkConflicts', 'Getting conflicts...');
    const users = await this.database.getConflictsUsers();
    debug('SyncService:checkConflicts', users);
    const cars = await this.database.getConflictsCars();
    debug('SyncService:checkConflicts', cars);
    const conflictUserOwnCar = await this.database.getConflictsConflictUserOwnCar();
    debug('SyncService:checkConflicts', conflictUserOwnCar);
    return users.length > 0 && cars.length > 0 && conflictUserOwnCar.length > 0;
  }

  async synchronize () {
    if (await this.checkConflicts()) {
      console.log('Conflicts founded.');
    } else {
      console.log('No conflicts founded.');
      const dateTimeFromServer = new Date().getTime();
      await this.database.setDateTimeFromServer(dateTimeFromServer);
    }
  }
}

module.exports = SyncService;
