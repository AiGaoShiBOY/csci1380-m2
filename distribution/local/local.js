const http = require("http");

const serialization = require("../util/serialization");
const id = require("../util/id");

const node = global.config;
node.counts = 0;
global.toLocal = new Map();

/*

Service  Description                           Methods
status   statusrmation about the current node  get
routes   A mapping from names to functions     get, put
comm     A message communication interface     send

*/

const statusService = {
  get: function (key, callback) {
    // init info object
    node.counts += 1;
    const info = {
      nid: id.getNID(node),
      sid: id.getSID(node),
      ip: node.ip,
      port: node.port,
      counts: node.counts,
    };
    if (info[key] !== undefined) {
      callback(null, info[key]);
    } else {
      callback(new Error("Key not found"), null);
    }
  },
};

const routesService = {
  servicesMap: new Map(),
  put: function (
    service,
    name,
    callback = (e, v) => (e ? console.error(e) : console.log(v))
  ) {
    node.counts += 1;
    if (service != null && name) {
      this.servicesMap.set(name, service);
      if (callback) {
        callback(null, this.servicesMap.get(name));
      } else {
        callback(new Error("Service info not valid"), null);
      }
    }
  },

  get: function (
    name,
    callback = (e, v) => (e ? console.error(e) : console.log(v))
  ) {
    node.counts += 1;
    if (!this.servicesMap.has(name)) {
      callback(new Error(`Service '${name}' not found`), null);
    } else {
      callback(null, this.servicesMap.get(name));
    }
  },
};

const commService = {
  send: function (
    message,
    remote,
    callback = (e, v) => (e ? console.error(e) : console.log(v))
  ) {
    node.counts += 1;
    const data = serialization.serialize(message);

    const options = {
      hostname: remote.node.ip,
      port: remote.node.port,
      path: `/${remote.service}/${remote.method}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    // construct http req
    const req = http.request(options, (res) => {
      res.setEncoding("utf8");
      let respData = "";
      res.on("data", (chunk) => (respData += chunk));
      res.on("end", () => {
        if (callback) {
          try {
            const parsedData = serialization.deserialize(respData);
            const err = parsedData[0];
            const result = parsedData[1];
            callback(err, result);
          } catch (error) {
            console.log(error);
            callback(new Error("Error parsing resp data"), null);
          }
        }
      });
      res.on("error", (err) => {
        callback(err, null);
      });
    });

    // handle send error
    req.on("error", (err) => {
      callback(err, null);
    });
    req.write(data);
    req.end();
  },
};

const services = {
  status: statusService,
  routes: routesService,
  comm: commService,
};

function dummyCallback(e, v) {}

services.routes.put(statusService, "status", dummyCallback);
services.routes.put(routesService, "routes", dummyCallback);
services.routes.put(commService, "comm", dummyCallback);
node.counts = 0;

module.exports = services;
