const {comm} = require('../local/local');
const id = require('./id');
// store the func in glocal:toLocal

function createRPC(func) {
  // Write some code...
  // calcu the id of func, note as pointer
  const funcId = id.getID(func);
  // fist store the func in toLocal
  if (global.toLocal === undefined) {
    throw new Error('ToLocal not initialized');
  }
  if (!global.toLocal.has(funcId)) {
    global.toLocal.set(funcId, func);
  }
  // call rpcStub is like rpcStub(...parsedParam, cb);
  const rpcStub = function(...args) {
    const callback = args.pop();
    // last param must be func
    if (typeof callback !== 'function') {
      throw new Error(
          'Last param of service mothod must be a callback function',
      );
    }
    let remote = {node: global.config, service: 'rpc', method: funcId};
    comm.send(args, remote, callback);
  };
  return rpcStub;
}

/*
    The toAsync function converts a synchronous function that returns a value
    to one that takes a callback as its last argument and returns the value
    to the callback.
*/
function toAsync(func) {
  return function(...args) {
    const callback = args.pop() || function() {};
    try {
      const result = func(...args);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  };
}

module.exports = {
  createRPC: createRPC,
  toAsync: toAsync,
};
