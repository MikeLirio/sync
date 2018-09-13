'use strict';

const Database = require('./Database');
const debug = require('./debug');
const http = require('http');

class SyncService {
  constructor (configuration) {
    this.config = configuration;
    this.server = configuration.server;
    this.baseURL = `${this.server.protocol}//${this.server.host}:${this.server.port}`;
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
    return (users.length + cars.length + conflictUserOwnCar.length) !== 0;
  }

  async synchronize () {
    if (await this.checkConflicts()) {
      console.log('Conflicts founded.');
      console.error('Error: The synchronization is not allowed until the conflicts are been resolved.');
    } else {
      console.log('No conflicts founded.');
      const dateTimeFromServer = await this.getDateTimeFromServer();
      await this.database.setDateTimeFromServer(dateTimeFromServer);
    }
  }

  async getDateTimeFromServer () {
    const url = `${this.baseURL}/getDateTimeUTC`;
    const time = await this.makeGetRequest(url);
    debug('server:response:dateTime', new Date(time.serverTime).toUTCString());
    return time.serverTime;
  }

  async makeGetRequest (url) {
    return new Promise(function (resolve, reject) {
      http.get(url, response => {
        const { statusCode } = response;

        if (statusCode !== 200) {
          debug(`http:get:error:${statusCode}`, response.statusCode);
          response.consume();
          reject(response);
        } else {
          let rawData = '';
          response.on('data', chunk => {
            rawData += chunk;
          });
          response.on('end', () => {
            const parsedData = JSON.parse(rawData);
            debug(`http:get:${statusCode}`, parsedData);
            resolve(parsedData);
          });
        }
      }).on('error', error => {
        console.error(error);
      });
    });
  }
}

module.exports = SyncService;
