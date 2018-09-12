'use strict';

const CarMarket = require('./src/CarMarket');
const program = require('commander');

/** Commands ------------------------------------------------------------------------
 * sync|s                                     | Synchronize the database.
 * register|r <name> <password>               | Create a new user in the system.
 * addCar|ac <usr> <carModel> <carValue>      | Add a Car to an User
 * getCars|gc <usr>                           | Get the cars of an user.
 * updateCar|uc <carModel> <carValue> <uuid>  | Modify details of a car
 * deleteCar|dc <carId>                       | Deleting a car
 * deleteUser|du <usr>                        | Deleting an user with all their cars
 -------------------------------------------------------------------------------- **/

program
  .version('0.1.0', '-v, --version');

program
  .command('sync')
  .alias('s')
  .description('Synchronize the database.')
  .action(function () {
    new CarMarket().synchronize();
  });

program
  .command('lastSync')
  .alias('ls')
  .description('Last time when the application was synchronize with the server.')
  .action(function () {
    new CarMarket().lastSynchronization();
  });

program
  .command('register <name> <password>')
  .alias('r')
  .description('Create a new user in the system.')
  .action(function (name, password) {
    new CarMarket().register(name, password);
  });

program
  .command('addCar <usr> <carModel> <carValue>')
  .alias('ac')
  .description('Add a Car to an User.')
  .action(function (usr, carModel, carValue) {
    new CarMarket().addCar(usr, {
      model: carModel,
      value: carValue
    });
  });

program
  .command('getCars <usr>')
  .alias('gc')
  .description('Get the cars of an user.')
  .action(function (usr) {
    new CarMarket().getCars(usr);
  });

program
  .command('updateCar <model> <value> <uuid>')
  .alias('uc')
  .description('Modify details of a car.')
  .action(function (carModel, carValue, uuid) {
    new CarMarket().editCar({
      uuid,
      model: carModel,
      value: carValue
    });
  });

program
  .command('deleteCar <carId>')
  .alias('dc')
  .description('Deleting a car.')
  .action(function (carId) {
    new CarMarket().deleteCar(carId);
  });

program
  .command('deleteUser <usr>')
  .alias('du')
  .description('Deleting an user with all their cars.')
  .action(function (usr) {
    new CarMarket().deleteUser(usr);
  });

program.parse(process.argv);
