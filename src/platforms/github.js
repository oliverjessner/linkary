'use strict';
const { resource, profile } = require('./helpers.js');
const reserved = new Set(['settings', 'login', 'join', 'signup', 'explore', 'topics', 'trending', 'marketplace', 'collections', 'events', 'features', 'enterprise', 'sponsors', 'orgs', 'organizations', 'users', 'search', 'about', 'pricing', 'security', 'site', 'apps', 'codespaces', 'notifications', 'pulls', 'issues', 'new', 'contact', 'readme', 'customer-stories', 'solutions', 'resources']);
module.exports = function github(url) {
  const match = url.pathname.match(/^\/([A-Za-z0-9-]+)(?:\/([A-Za-z0-9_.-]+)(?:\/(issues|pull)\/(\d+))?)?\/?$/);
  if (!match || reserved.has(match[1].toLowerCase())) return null;
  if (!match[2]) return profile('github', match[1]);
  if (match[2] === '.' || match[2] === '..') return null;
  const repo = `${match[1]}/${match[2]}`.toLowerCase();
  if (match[3]) return resource('github', 'post', `${repo}/${match[3]}/${match[4]}`, null, match[3]);
  return resource('github', 'repository', repo);
};
