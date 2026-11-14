'use strict';
const { identity, single } = require('./helpers.js');

module.exports = function whatsapp(url) {
  let phone = null;
  if (url.hostname === 'wa.me') {
    const match = url.pathname.match(/^\/([1-9]\d{4,14})\/?$/);
    phone = match && match[1];
  } else if (url.hostname === 'api.whatsapp.com' && /^\/send\/?$/.test(url.pathname)) {
    const value = single(url, 'phone');
    if (value && /^[1-9]\d{4,14}$/.test(value)) phone = value;
  }
  // The number is an explicit addressing target, not an inferred WhatsApp user ID.
  return phone ? identity('whatsapp', 'profile', null, null, `whatsapp:phone:${phone}`) : null;
};
