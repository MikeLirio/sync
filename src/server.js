'use strict';

const debug = require('debug')('server');
const http  = require('http');
const https = require('https');
const URL   = require('url');

function buildProfilesString (profiles) {
  if (!profiles) {
    return 'default'
  }
  if (Array.isArray(profiles)) {
    return profiles.join(',')
  }
  return profiles
}

function getPath (path, name, profiles, label) {
  const profilesStr = buildProfilesString(profiles)

  return (path.endsWith('/') ? path : path + '/') +
        encodeURIComponent(name) + '/' +
        encodeURIComponent(profilesStr) +
        (label ? '/' + encodeURIComponent(label) : '')
}

function requestWithCallback (options, callback) {
  const endpoint = options.endpoint ? URL.parse(options.endpoint) : DEFAULT_URL
  const name = options.name || options.application
  const client = endpoint.protocol === 'https:' ? https : http

  const requestOptions = {
    rejectUnauthorized: false,
    protocol: endpoint.protocol,
    hostname: endpoint.hostname,
    port: endpoint.port,
    path: getPath(endpoint.path, name, options.profiles, options.label),
  };

  debug(requestOptions);

  client.request(requestOptions, (res) => {
    if (res.statusCode !== 200) { // OK
      res.resume() // it consumes response
      return callback(new Error('Invalid response: ' + res.statusCode))
    }
    let response = ''
    res.setEncoding('utf8')
    res.on('data', (data) => {
      response += data
    })
    res.on('end', () => {
      try {
        const body = JSON.parse(response)
        callback(null, body)
      } catch (e) {
        callback(e)
      }
    })
  }).on('error', callback).end()
}

function requestWithPromise (options) {
  return new Promise((resolve, reject) => {
    requestWithCallback(options, (error, config) => {
      if (error) {
        reject(error)
      } else {
        resolve(config)
      }
    })
  })
}

const request = function(options, callback) {
  return typeof callback === 'function'
  ? requestWithCallback(options, callback)
  : requestWithPromise(options)
}

module.exports = {
  request,
};