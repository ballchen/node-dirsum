// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var md5File = require('md5-file')

function _summarize(method, hashes) {
  var keys = Object.keys(hashes);
  keys.sort();

  var obj = {};
  obj.files = hashes;
  var hash = crypto.createHash(method);
  for (var i = 0; i < keys.length; i++) {
    if (typeof(hashes[keys[i]]) === 'string') {
      hash.update(hashes[keys[i]]);
    } else if (typeof(hashes[keys[i]]) === 'object') {
      hash.update(hashes[keys[i]].hash);
    } else {
      console.error('Unknown type found in hash: ' + typeof(hashes[keys[i]]));
    }
  }

  obj.hash = hash.digest('hex');
  return obj;
}

function digest(root, method, ignore, callback) {
  if (!root || typeof(root) !== 'string') {
    throw new TypeError('root is required (string)');
  }
  if (method) {
    if (typeof(method) === 'string') {
      // NO-OP
    } else if (typeof(method) === 'function') {
      callback = method;
      method = 'md5';
    } else {
      throw new TypeError('hash must be a string');
    }
  } else {
    throw new TypeError('callback is required (function)');
  }
  if (!callback) {
    throw new TypeError('callback is required (function)');
  }

  var hashes = {};

  fs.readdir(root, function(err, files) {
    if (err) return callback(err);

    files = _.difference(files, ignore);

    if (files.length === 0) {
      return callback(undefined, {hash: 'd41d8cd98f00b204e9800998ecf8427e', files: {}});
    }

    var hashed = 0;

    files.forEach(function(f) {
        var path = root + '/' + f;
        fs.stat(path, function(err, stats) {
          if (err) return callback(err);

          if (stats.isDirectory()) {
            return digest(path, method, ignore, function(err, hash) {
              if (err) return hash;

              hashes[f] = hash;
              if (++hashed >= files.length) {
                return callback(undefined, _summarize(method, hashes));
              }
            });
          } else if (stats.isFile()) {
            
            var hash = md5File.sync(path);
            hashes[f] = hash;

            if (++hashed >= files.length) {
              return callback(undefined, _summarize(method, hashes));
            }
          } else {
            console.error('Skipping hash of %s', f);
            if (++hashed > files.length) {
              return callback(undefined, _summarize(method, hashes));
            }
          }
        });
    });
  });
}

module.exports = {
  digest: digest
};
