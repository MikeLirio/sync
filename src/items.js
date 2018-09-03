'use strict';

const debug   = require('debug')('item')
const server  = require('./server');

const getAll = function(ctx) {
  const usr = ctx.usr;
  if (usr) {
    debug(`ctx:usr - ${usr}`)
  } else {
    console.log('User can not be undefined.');
  }
}

const getLocal = function() {

}

const saveData = function(data) {

}

const sync = async function(data) {
  const options = {
    endpoint: 'https://www.mocky.io/v2/5b894dab300000d7213383ed',
    usr: data.usr,
  };

  debug(options);
  const items = await server.request(options);
  console.log(items);
}

module.exports = {
  sync,
};