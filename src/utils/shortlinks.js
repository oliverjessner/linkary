'use strict';
const { parseUrl, optionsObject, stringList, LinkaryError } = require('./validation.js');
// Exact hosts, never substring matches or path-length guesses.
const SHORTLINK_HOSTS = new Set([
  'bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'buff.ly', 'is.gd', 'cutt.ly',
  'youtu.be', 'vm.tiktok.com', 'vt.tiktok.com', 'redd.it', 'trib.al',
  'rb.gy', 'rebrand.ly', 'shorturl.at', 'lnkd.in', 'amzn.to', 'goo.gl',
]);

function isShortUrl(input, options = {}) {
  optionsObject(options);
  const custom = stringList(options.shortlinkDomains, 'shortlinkDomains').map(host => {
    let url;
    try { url = new URL(`https://${host}`); } catch { /* validated below */ }
    if (!url || url.hostname !== url.host || url.pathname !== '/' || url.search || url.hash ||
      url.username || url.password || /[\s/\\?#@]/.test(host) || host.includes(':') || !host) {
      throw new LinkaryError('ERR_INVALID_OPTIONS', 'shortlinkDomains must contain hostnames without ports or URL components.');
    }
    return url.hostname;
  });
  const hostname = parseUrl(input).hostname;
  return SHORTLINK_HOSTS.has(hostname) || custom.includes(hostname);
}

module.exports = { isShortUrl };
