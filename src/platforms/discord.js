'use strict';
const { resource } = require('./helpers.js');

const snowflake = '[1-9]\\d{16,19}';
const channel = new RegExp(`^/channels/(?:${snowflake}|@me)/(${snowflake})(?:/(${snowflake}))?/?$`);

module.exports = function discord(url) {
  if (url.hostname === 'discord.gg') {
    const invite = url.pathname.match(/^\/([A-Za-z0-9-]+)\/?$/);
    return invite ? resource('discord', 'invite', invite[1]) : null;
  }
  let match = url.pathname.match(/^\/invite\/([A-Za-z0-9-]+)\/?$/);
  if (match) return resource('discord', 'invite', match[1]);
  match = url.pathname.match(channel);
  if (!match) return null;
  // Discord snowflakes are global IDs. Never convert them to JavaScript numbers.
  return match[2] ? resource('discord', 'message', match[2]) : resource('discord', 'channel', match[1]);
};
