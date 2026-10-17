'use strict';
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'ttclid',
  'mc_cid', 'mc_eid', 'igsh', 'igshid',
]);
function isTrackingParameter(name) {
  const lower = name.toLowerCase();
  return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower);
}
module.exports = { isTrackingParameter };
