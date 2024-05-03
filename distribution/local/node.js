const http = require('http');
const services = require('./local');
const {serialize, deserialize} = require('../util/util');

const start = function(started) {
  const server = http.createServer((req, res) => {
    /* Your server will be listening for PUT requests. */

    if (req.method === 'PUT') {
      const urlArr = req.url.split('/').filter((item) => item !== '');
      const serviceName = urlArr[0];
      const methodName = urlArr[1];
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString(); // Convert Buffer to string
      });

      const serviceCallback = (e, v) => {
        res.end(serialize([e, v]));
      };

      req.on('end', () => {
        try {
          const parsedBody = deserialize(body);
          // deal with rpc call
          if (serviceName === 'rpc') {
            const rpcFuncMap = global.toLocal;
            if (rpcFuncMap === undefined) {
              serviceCallback(new Error('ToLocal not found'), null);
              return;
            }
            const rpcFunc = rpcFuncMap.get(methodName);
            if (rpcFunc === undefined) {
              serviceCallback(new Error('Rpc func not registered'), null);
              return;
            }
            rpcFunc(...parsedBody, (e, v) => {
              serviceCallback(e, v);
            });
            return;
          }
          services.routes.get(serviceName, (err, service) => {
            if (err) {
              serviceCallback(new Error('Service not found'), null);
              return;
            }
            if (
              !service ||
              !service[methodName] ||
              typeof service[methodName] != 'function'
            ) {
              serviceCallback(new Error('Service invalid'), null);
              return;
            }
            service[methodName](...parsedBody, (e, v) => {
              serviceCallback(e, v);
            });
          });
        } catch (err) {
          res.statusCode = 400;
          serviceCallback(new Error('Parsing JSON error'), null);
        }
      });
    }
  });
  server.listen(global.config.port, global.config.ip, () => {
    started(server);
  });
};

module.exports = {
  start: start,
};
