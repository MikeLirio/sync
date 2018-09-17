'use strict';

const CarMarket = require('./src/CarMarket');
const program = require('commander');

/* --------------------------------------------------------------------------------------------------------
Options: --------------------------------------------------------------------------------------------------
  -v, --version                                             | output the version number
  -h, --help                                                | output usage information
Commands: ------------------------------------------------------------------------------------------------
  sync|s                                                    | Synchronize the database.
  lastSync|ls                                               | Last time when the application was synchronize with the server.
  register|r <name> <password>                              | Create a new user in the system.
  changePassword|cp <username> <oldPassword> <newPassword>  | Create a new user in the system.
  addCar|ac <usr> <carModel> <carValue>                     | Add a Car to an User.
  getCars|gc <usr>                                          | Get the cars of an user.
  updateCar|uc <model> <value> <uuid>                       | Modify details of a car.
  deleteCar|dc <carId>                                      | Deleting a car.
  deleteUser|du <usr>                                       | Deleting an user with all their cars.
-------------------------------------------------------------------------------------------------------- */

program
  .version('0.1.0', '-v, --version');

program
  .command('sync')
  .alias('s')
  .description('Synchronize the database.')
  .action(async function () {
    const result = await new CarMarket().synchronize();
    console.log(result);
  });

program
  .command('lastSync')
  .alias('ls')
  .description('Last time when the application was synchronize with the server.')
  .action(async function () {
    const result = await new CarMarket().lastSynchronization();
    console.log(result);
  });

program
  .command('register <name> <password>')
  .alias('r')
  .description('Create a new user in the system.')
  .action(async function (name, password) {
    const result = await new CarMarket().register(name, password);
    console.log(result);
  });

program
  .command('changePassword <username> <oldPassword> <newPassword>')
  .alias('cp')
  .description('Change the password of the user.')
  .action(async function (username, oldPassword, newPassword) {
    const result = await new CarMarket().changePassword(username, oldPassword, newPassword);
    console.log(result);
  });

program
  .command('addCar <usr> <carModel> <carValue>')
  .alias('ac')
  .description('Add a Car to an User.')
  .action(async function (usr, carModel, carValue) {
    const result = await new CarMarket().addCar(usr, {
      model: carModel,
      value: carValue
    });
    console.log(result);
  });

program
  .command('getCars <usr>')
  .alias('gc')
  .description('Get the cars of an user.')
  .action(async function (usr) {
    const result = await new CarMarket().getCars(usr);
    console.log(result);
  });

program
  .command('updateCar <model> <value> <uuid>')
  .alias('uc')
  .description('Modify details of a car.')
  .action(async function (carModel, carValue, uuid) {
    const result = await new CarMarket().editCar({
      uuid,
      model: carModel,
      value: carValue
    });
    console.log(result);
  });

program
  .command('deleteCar <carId>')
  .alias('dc')
  .description('Deleting a car.')
  .action(async function (carId) {
    const result = await new CarMarket().deleteCar(carId);
    console.log(result);
  });

program
  .command('deleteUser <usr>')
  .alias('du')
  .description('Deleting an user with all their cars.')
  .action(async function (usr) {
    const result = await new CarMarket().deleteUser(usr);
    console.log(result);
  });

program.parse(process.argv);
