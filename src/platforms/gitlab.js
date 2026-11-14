'use strict';
const { resource } = require('./helpers.js');
const reserved = new Set(['404.html', '422.html', '500.html', '502.html', '503.html', 'admin', 'api', 'apple-touch-icon.png', 'assets', 'dashboard', 'deploy.html', 'explore', 'favicon.ico', 'favicon.png', 'files', 'groups', 'health_check', 'help', 'import', 'jwt', 'login', 'oauth', 'profile', 'projects', 'public', 'robots.txt', 's', 'search', 'sitemap', 'sitemap.xml', 'sitemap.xml.gz', 'slash-command-logo.png', 'snippets', 'unsubscribes', 'uploads', 'users', 'v2']);
const projectRoutes = new Set(['badges', 'blame', 'blob', 'builds', 'commits', 'create', 'create_dir', 'edit', 'files', 'find_file', 'new', 'preview', 'raw', 'refs', 'tree', 'update', 'wikis']);
const slug = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?$/;

function projectPath(value) {
  const parts = value.split('/');
  if (parts.length < 2 || parts.some(part => !slug.test(part) || /[_.-]{2}|\.(?:git|atom)$/i.test(part))) return null;
  if (reserved.has(parts[0].toLowerCase()) || /^(?:admin|dashboard|explore|groups|health_check|help|projects|public|search)\./i.test(parts[0])) return null;
  if (parts.slice(1).some(part => projectRoutes.has(part.toLowerCase()))) return null;
  return parts.join('/').toLowerCase();
}

module.exports = function gitlab(url) {
  if (url.hostname !== 'gitlab.com') return null;
  const path = url.pathname.replace(/\/$/, '');
  // A plain /group/name can be a subgroup or project. Require a project marker.
  const clone = path.match(/^\/(.+)\.git$/);
  if (clone) {
    const project = projectPath(clone[1]);
    return project ? resource('gitlab', 'repository', project) : null;
  }
  const match = path.match(/^\/(.+)\/-\/(issues|merge_requests)\/([1-9]\d*)$/);
  if (match) {
    const project = projectPath(match[1]);
    return project ? resource('gitlab', 'post', `${project}/${match[2]}/${match[3]}`, null, match[2]) : null;
  }
  const tree = path.match(/^\/(.+)\/-\/(tree|blob)\/([A-Za-z0-9_][A-Za-z0-9_.~/-]*)$/);
  if (!tree || (tree[2] === 'blob' && !tree[3].includes('/'))) return null;
  const project = projectPath(tree[1]);
  return project ? resource('gitlab', 'repository', project) : null;
};
