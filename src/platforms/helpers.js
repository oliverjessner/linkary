'use strict';
function single(url, name) {
  const values = url.searchParams.getAll(name);
  return values.length === 1 ? values[0] : null;
}
function identity(platform, resourceType, resourceId, profileHandle, key) {
  return { platform, resourceType, resourceId, profileHandle, identityKey: key };
}
function resource(platform, type, id, handle = null, namespace = type) {
  return identity(platform, type, id, handle, `${platform}:${namespace}:${id}`);
}
function profile(platform, handle, type = 'profile', caseInsensitive = true) {
  return identity(platform, type, null, handle, `${platform}:handle:${caseInsensitive ? handle.toLowerCase() : handle}`);
}
module.exports = { single, identity, resource, profile };
