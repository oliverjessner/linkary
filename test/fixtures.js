'use strict';
const http = require('node:http');

async function server(t, handler) {
  const requests = [];
  const instance = http.createServer((req, res) => {
    requests.push({ method: req.method, path: req.url, headers: req.headers });
    handler(req, res);
  });
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { instance.closeAllConnections(); instance.close(resolve); }));
  return { url: `http://127.0.0.1:${instance.address().port}`, requests, instance };
}
module.exports = { server };
