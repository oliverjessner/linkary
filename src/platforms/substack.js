'use strict';
const { identity, profile } = require('./helpers.js');

const infrastructure = new Set(['www', 'api', 'help', 'support', 'status', 'cdn', 'static', 'assets', 'auth', 'account', 'accounts', 'login', 'signup', 'email', 'email1', 'email2', 'link', 'links', 'app', 'apps', 'open', 'read', 'reader', 'on']);

function publication(hostname) {
  const match = hostname.match(/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.substack\.com$/);
  return match && !infrastructure.has(match[1]) && !match[1].startsWith('xn--') ? match[1] : null;
}

function substack(url) {
  const owner = publication(url.hostname);
  const path = url.pathname;
  if (owner) {
    if (path === '/') return identity('substack', 'channel', null, owner, `substack:publication:${owner}`);
    const post = path.match(/^\/p\/([a-z0-9][a-z0-9-]{0,198}[a-z0-9])\/?$/);
    // A permalink slug is not the post's numeric ID and may change.
    return post ? identity('substack', 'post', `${owner}/${post[1]}`, owner, null) : null;
  }
  if (url.hostname !== 'substack.com' && url.hostname !== 'www.substack.com') return null;
  const match = path.match(/^\/@([A-Za-z0-9_]{1,63})(?:\/note\/(c-[1-9]\d*))?\/?$/);
  if (!match) return null;
  return match[2] ? identity('substack', 'post', match[2], match[1], null) : profile('substack', match[1]);
}

module.exports = substack;
module.exports.matchesHost = hostname => publication(hostname) !== null;
