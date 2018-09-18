'use strict';

const Database = require('./Database');
const util = require('util');
const debug = require('./debug');
const http = require('http');

class SyncService {
  constructor (configuration) {
    this.config = configuration;
    this.server = configuration.server;
    this.baseURL = `${this.server.options.protocol}//${this.server.options.host}:${this.server.options.port}`;
    debug('SyncService:server:mock', this.config.server.mock);
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
    try {
      if (await this.checkConflicts()) {
        console.error('Error: The synchronization is not allowed until the conflicts are been resolved.');
        return 'Conflicts founded.';
      } else {
        debug('SyncService:sync', 'No conflicts founded.');
        const dateTimeFromServer = await this.getDateTimeFromServer();
        const rowsToSync = await this.getRowsToSync();
        const rowsToSyncStringify = JSON.stringify(rowsToSync);
        const optionRequest = {
          rejectUnauthorized: this.server.options.rejectUnauthorized,
          protocol: this.server.options.protocol,
          hostname: this.server.options.host,
          port: this.server.options.port,
          method: this.server.endpoints['synchronization'].method,
          path: this.server.endpoints['synchronization'].path,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(rowsToSyncStringify)
          }
        };
        const syncResponse = await this.postRequest(optionRequest, rowsToSyncStringify);
        await this.synchronizeLocalData(syncResponse, dateTimeFromServer);
        if (await this.checkConflicts()) {
          debug('SyncService:sync', 'Conflicts appear.');
          this.handleConflicts();
        } else {
          debug('SyncService:sync', 'No conflicts generated.');
        }
        await this.database.setDateTimeFromServer(dateTimeFromServer);
      }
    } catch (error) {
      throw new Error('Unable to synchronize: ', error);
    }
  }

  async synchronizeLocalData (syncResponse, dateTimeFromServer) {
    await this.database.deleteAllLocals();
    await this.database.checkChangesBetweenServerAndLocal(syncResponse, dateTimeFromServer);
  }

  handleConflicts () {
    // TODO finish it
    debug('SyncService:sync:conflicts', 'work in progress');
  }

  async getRowsToSync () {
    const news = await this.getRows('newRows');
    debug('SyncService:rows:new', news);
    const modified = await this.getRows('modifiedRows');
    debug('SyncService:rows:modified', modified);
    const deleted = await this.getRows('deletedRows');
    debug('SyncService:rows:deleted', deleted);
    return {
      news,
      modified,
      deleted
    };
  }

  async getRows (type) {
    const users = await this.database.getValuesForSyncFrom('users', type);
    const cars = await this.database.getValuesForSyncFrom('cars', type);
    const userOwnCar = await this.database.getValuesForSyncFrom('userOwnCar', type);
    return {
      users,
      cars,
      userOwnCar
    };
  }

  async getDateTimeFromServer () {
    const url = `${this.baseURL}/${this.server.endpoints.getServerTime.path}`;
    const time = await this.getRequest(url);
    debug('SyncService:server:response:dateTime', new Date(time.serverTime).toUTCString());
    if (!time || !time.serverTime) {
      throw new Error('Something happens with the request to the server.');
    }
    return time.serverTime;
  }

  async postRequest (options, data) {
    return new Promise(function (resolve, reject) {
      const postRequest = http.request(options, function (response) {
        response.setEncoding('utf8');
        const { statusCode } = response;
        if (statusCode !== 200) {
          debug(`SyncService:http:post:error:${statusCode}`, response.statusCode);
          response.consume();
          reject(response);
        } else {
          let rawData = '';
          response.on('data', chunk => {
            rawData += chunk;
          });
          response.on('end', () => {
            const parsedData = JSON.parse(rawData);
            debug(`SyncService:http:post:${statusCode}`, util.inspect(parsedData, false, null, true));
            resolve(parsedData);
          });
        }
      })
        .on('error', error => {
          console.error(error);
          reject(error);
        });

      postRequest.write(data);
      postRequest.end();
    });
  }

  async getRequest (url) {
    return new Promise(function (resolve, reject) {
      http.get(url, response => {
        const { statusCode } = response;
        if (statusCode !== 200) {
          debug(`SyncService:http:get:error:${statusCode}`, response.statusCode);
          response.consume();
          reject(response);
        } else {
          let rawData = '';
          response.on('data', chunk => {
            rawData += chunk;
          });
          response.on('end', () => {
            const parsedData = JSON.parse(rawData);
            debug(`SyncService:http:get:${statusCode}`, util.inspect(parsedData, false, null, true));
            resolve(parsedData);
          });
        }
      }).on('error', error => {
        console.error(error);
        reject(error);
      });
    });
  }
}

module.exports = SyncService;
