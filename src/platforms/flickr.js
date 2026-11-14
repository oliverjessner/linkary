'use strict';
const { identity, profile, resource, single } = require('./helpers.js');
const reserved = new Set(['me', 'recent', 'friends', 'faves', 'tags', 'galleries', 'albums', 'explore', 'following', 'contacts', 'upload', 'search', 'groups', 'map', 'favorites', 'commons', 'creativecommons', 'cameras', 'institutions', 'licenses', 'welcome', 'help']);
const nsid = /^[1-9]\d*@N\d{2}$/;

module.exports = function flickr(url) {
  if (url.hostname !== 'flickr.com' && url.hostname !== 'www.flickr.com') return null;
  if (url.pathname === '/photo.gne') {
    const id = single(url, 'id');
    return id && /^[1-9]\d*$/.test(id) ? resource('flickr', 'image', id, null, 'photo') : null;
  }
  const match = url.pathname.match(/^\/(people|photos)\/([A-Za-z0-9_-]+|[1-9]\d*@N\d{2})(?:\/(?:(albums)\/)?([1-9]\d*))?\/?$/);
  if (!match || reserved.has(match[2].toLowerCase()) || (match[1] === 'people' && match[4])) return null;
  if (match[4]) return resource('flickr', match[3] ? 'album' : 'image', match[4], null, match[3] ? 'album' : 'photo');
  return nsid.test(match[2]) ? identity('flickr', 'profile', match[2], null, `flickr:nsid:${match[2]}`)
    : profile('flickr', match[2], 'profile', false);
};
