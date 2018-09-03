'use strict';

const debug = require('debug')('app');
const items = require('./src/items');
let program = require('commander');

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

program.parse(process.argv);