'use strict';
const { resource, profile } = require('./helpers.js');

const infrastructure = new Set(['www', 'api', 'help', 'support', 'status', 'cdn', 'static', 'images', 'image', 'miro', 'upload', 'uploads', 'auth', 'account', 'accounts', 'login', 'signin', 'email', 'link', 'links', 's', 'rs', 'm']);
const routes = new Set(['m', 'me', 'search', 'tag', 'topics', 'creators', 'membership', 'plans', 'partner-program', 'policy', 'signin', 'signout', 'logout', 'login', 'signup', 'register', 'help', 'settings', 'notifications', 'reading-list', 'new-story', 'drafts', 'publications', 'stories', 'stats', 'feed', 'followers', 'following', 'lists', 'list', 'collection', 'collections', 'r', 's', 'u', 'p']);
const handle = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,62}[A-Za-z0-9])?$/;

function subdomain(hostname) {
  const match = hostname.match(/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.medium\.com$/);
  return match && !infrastructure.has(match[1]) && !match[1].startsWith('xn--') ? match[1] : null;
}

function medium(url) {
  const owner = subdomain(url.hostname);
  const root = url.hostname === 'medium.com' || url.hostname === 'www.medium.com';
  if (!root && !owner) return null;
  const parts = url.pathname.replace(/\/$/, '').split('/').slice(1);
  // Subdomain homepages can belong to either profiles or publications.
  if (owner && parts.length === 1 && parts[0] === '') return null;
  if (root && parts.length === 1 && parts[0].startsWith('@') && handle.test(parts[0].slice(1))) {
    return profile('medium', parts[0].slice(1));
  }
  if (root && parts.length === 2 && parts[0] === 'p' && /^[a-f0-9]{12}$/.test(parts[1])) {
    return resource('medium', 'post', parts[1]);
  }
  const scope = root && parts.length === 2 ? parts[0] : null;
  if (root && (!scope || routes.has(scope.toLowerCase()) || !handle.test(scope.replace(/^@/, '')))) return null;
  if (owner && parts.length !== 1) return null;
  const story = parts[parts.length - 1].match(/^(?:[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*-)?([a-f0-9]{12})$/);
  return story ? resource('medium', 'post', story[1], scope?.startsWith('@') ? scope.slice(1) : owner) : null;
}

module.exports = medium;
module.exports.matchesHost = hostname => subdomain(hostname) !== null;
