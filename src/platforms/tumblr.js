'use strict';
const { profile, resource } = require('./helpers.js');
const reservedHosts = new Set(['www', 'api', 'assets', 'static', 'help', 'support', 'developers',
  'secure', 'embed', 'media', 'login', 'oauth', 'status', 'schema', 'www2']);
const reservedRoutes = new Set(['blog', 'blog_auth', 'customize', 'dashboard', 'explore', 'following',
  'inbox', 'likes', 'login', 'logout', 'new', 'register', 'search', 'settings', 'tagged', 'tag',
  'communities', 'community', 'about', 'apps', 'privacy', 'policy', 'terms', 'support', 'help',
  'developers', 'api', 'oauth', 'widgets']);
const blogPattern = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,30}[A-Za-z0-9])?';
const centralPost = new RegExp(`^/(${blogPattern})/([1-9]\\d*)(?:/[^/]+)?/?$`);
const centralProfile = new RegExp(`^/@?(${blogPattern})/?$`);

function hostedBlog(hostname) {
  const match = hostname.match(/^([a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?)\.tumblr\.com$/);
  return match && !reservedHosts.has(match[1]) ? match[1] : null;
}

function tumblr(url) {
  const blog = hostedBlog(url.hostname);
  if (blog) {
    if (url.pathname === '/') return profile('tumblr', blog);
    const match = url.pathname.match(/^\/post\/([1-9]\d*)(?:\/[^/]+)?\/?$/);
    return match ? resource('tumblr', 'post', match[1], blog, `post@${blog}`) : null;
  }
  if (!['tumblr.com', 'www.tumblr.com'].includes(url.hostname)) return null;
  let match = url.pathname.match(centralPost);
  if (match && !reservedRoutes.has(match[1].toLowerCase())) {
    return resource('tumblr', 'post', match[2], match[1], `post@${match[1].toLowerCase()}`);
  }
  match = url.pathname.match(centralProfile);
  return match && !reservedRoutes.has(match[1].toLowerCase()) ? profile('tumblr', match[1]) : null;
}

tumblr.matchesHost = hostname => hostedBlog(hostname) !== null;
module.exports = tumblr;
