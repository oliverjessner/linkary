'use strict';
const { resource, single } = require('./helpers.js');
const bv = /^BV1[A-Za-z0-9]{9}$/;
const av = /^[1-9]\d*$/;

module.exports = function bilibili(url) {
  if (url.hostname === 'space.bilibili.com') {
    const match = url.pathname.match(/^\/([1-9]\d*)\/?$/);
    return match ? resource('bilibili', 'profile', match[1], null, 'uid') : null;
  }
  if (url.hostname === 'player.bilibili.com') {
    if (url.pathname !== '/player.html' || url.searchParams.has('episodeId') || url.searchParams.has('seasonId')) return null;
    const hasBv = url.searchParams.has('bvid');
    const hasAv = url.searchParams.has('aid');
    // Both IDs can name the same video, but their agreement needs online data.
    if (hasBv === hasAv) return null;
    const id = single(url, hasBv ? 'bvid' : 'aid');
    return id && (hasBv ? bv : av).test(id) ? resource('bilibili', 'video', id, null, hasBv ? 'bv' : 'av') : null;
  }
  if (!['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'].includes(url.hostname)) return null;
  const match = url.pathname.match(/^\/video\/(BV1[A-Za-z0-9]{9}|av[1-9]\d*)\/?$/);
  if (!match) return null;
  return match[1].startsWith('BV') ? resource('bilibili', 'video', match[1], null, 'bv')
    : resource('bilibili', 'video', match[1].slice(2), null, 'av');
};
