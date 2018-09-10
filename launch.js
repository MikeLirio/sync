'use strict';

const debug         = require('./src/debug')
const fileSystem    = require('fs');
const CarMarketSync = require('./src/CarMarketSync');
let program         = require('commander');

/** Commands ------------------------------------
 * Add      - Add an Item. [name] [value].
 * Register - Add new user.
 * Sync     - Synchronize the dayabase.
 * Get      - Get Items.
 * GetLocal - Get Items from the local database.
 **/

program
  .version('0.1.0', '-v, --version')

program
  .command('sync <user>')
  .alias('s')
  .description('Synchronize the dayabase of a user.')
  .action(function(user) {
    debug(`Synchronising the data of ${user}.`);
    console.log(items)
    const result = items.sync({
      usr: user,
    });
    console.log(result);
  });

program
  .command('register <name> <password>')
  .alias('r')
  .description('Create a new user in the system.')
  .option('-c, --config [pathConf]', 'Path of the personalize configuration.')
  .action(function(name, password, options) {
    debug(`Creating the user ${name}...`);
    let app;
    if (options.pathConf) {
      debug(`register ${name}`, `Loading personalize configuration from ${options.pathConf}`);
      const configuration = fileSystem.readFileSync(options.pathConf);
      app = new CarMarketSync(configuration);
    } else {
      app = new CarMarketSync();
    }
    app.register(name, password);
  });

program
  .command('addCar <usr> <carModel> <value>') // TODO add password
  .alias('ac')
  .description('Add a Car to an User')
  .action(function(usr, carModel, value) {
    const credentials = {
      username: usr,
      password: '',
    };

    const car = {
      model: carModel,
      value,
    };
    const app = new CarMarketSync();
    app.addCar(credentials, car);
  });

program
  .command('getCars <usr>')
  .alias('gc')
  .description('Get the cars of an user.')
  .action(function(usr) {
    new CarMarketSync().getCars(usr);
  });

program
  .command('updateCar <model> <value> <uuid>')
  .alias('uc')
  .description('Modify details of a car')
  .action(function(model, value, uuid) {
    const newDetails = {
      uuid,
      model,
      value
    };
    new CarMarketSync().editCar(newDetails);
  });

program
  .command('deleteCar <carId>')
  .alias('dc')
  .description('Deleting a car')
  .action(function(carId) {
    new CarMarketSync().deleteCar(carId);
  });

program
  .command('deleteUser <username>')
  .alias('du')
  .description('Deleting an user with all their cars')
  .action(function(username) {
    new CarMarketSync().deleteUser(username);
  });

program.parse(process.argv);