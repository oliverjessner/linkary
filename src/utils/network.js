'use strict';
const dns = require('node:dns').promises;
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const { LinkaryError, throwIfAborted } = require('./validation.js');

// Conservative special-use exclusions. IPv6 must be ordinary global unicast;
// translated, mapped and transition ranges are intentionally not accepted.
function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || address === '168.63.129.16' ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (family === 6) {
    if (address.includes('%')) return false;
    const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const [a, b] = canonical.split(':').map(s => parseInt(s || '0', 16));
    return a >= 0x2000 && a <= 0x3fff &&
      !(a === 0x2001 && (b < 0x200 || b === 0xdb8)) && a !== 0x2002 &&
      !(a === 0x3fff && b <= 0x0fff);
  }
  return false;
}

function raceSignal(promise, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason instanceof LinkaryError ? signal.reason
      : new LinkaryError('ERR_ABORTED', 'Operation aborted.', { cause: signal.reason }));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

async function validatedAddress(url, unsafeAllowPrivate, signal) {
  throwIfAborted(signal);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const name = hostname.toLowerCase().replace(/\.$/, '');
  if (!unsafeAllowPrivate && (name === 'localhost' || name.endsWith('.localhost') ||
    name.endsWith('.local') || name.endsWith('.internal') || !name.includes('.') && !net.isIP(name) ||
    name === 'metadata.google.internal' || name === 'instance-data.ec2.internal')) {
    throw new LinkaryError('ERR_UNSAFE_ADDRESS', 'Local, internal and metadata hostnames are blocked.');
  }
  let addresses;
  try {
    addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }]
      : await raceSignal(dns.lookup(hostname, { all: true, verbatim: true }), signal);
  } catch (cause) {
    if (cause instanceof LinkaryError) throw cause;
    throw new LinkaryError('ERR_DNS', 'Hostname resolution failed.', { cause });
  }
  if (!addresses.length || addresses.some(item => !net.isIP(item.address) ||
    item.family !== net.isIP(item.address) || (!unsafeAllowPrivate && !isPublicAddress(item.address)))) {
    throw new LinkaryError('ERR_UNSAFE_ADDRESS', 'Destination resolves to a forbidden or invalid IP address.');
  }
  // Reject mixed public/private answers. Pin a validated address directly into
  // the socket lookup; no second DNS lookup, global agent or proxy is involved.
  return addresses[0];
}

async function requestHeaders(url, method, options, signal) {
  const pinned = await validatedAddress(url, options.unsafeAllowPrivate, signal);
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, {
      method,
      agent: false,
      signal,
      autoSelectFamily: false,
      family: pinned.family,
      lookup: (_hostname, lookupOptions, callback) => {
        if (lookupOptions.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
      // No caller-supplied headers: credentials/cookies cannot cross origins.
      headers: method === 'GET' ? { Range: 'bytes=0-0', 'Accept-Encoding': 'identity' } : {},
      maxHeaderSize: 16384,
    });
    request.once('error', cause => {
      if (signal.aborted) reject(signal.reason instanceof LinkaryError ? signal.reason
        : new LinkaryError('ERR_ABORTED', 'Operation aborted.', { cause: signal.reason }));
      else reject(new LinkaryError('ERR_NETWORK', 'HTTP connection failed.', { cause }));
    });
    request.once('upgrade', (_response, socket) => {
      socket.destroy();
      reject(new LinkaryError('ERR_HTTP_STATUS', 'Protocol upgrades are not supported.'));
    });
    request.once('response', response => {
      resolve({ status: response.statusCode, location: response.headers.location });
      // Headers suffice even if a server ignores Range and streams forever.
      response.on('error', () => {});
      response.destroy();
      request.destroy();
    });
    request.end();
  });
}

module.exports = { isPublicAddress, validatedAddress, requestHeaders };
