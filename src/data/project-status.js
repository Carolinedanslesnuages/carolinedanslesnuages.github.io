/**
 * The status of a project as shown to visitors (in French): « essai », « en cours de
 * développement », or its latest version. A project marked « en-cours » in site.config.json says
 * so even when it already has a version.
 */
export function statusLabel(project, { trialLabel = 'essai' } = {}) {
  if (project.status === 'trial') return trialLabel;
  if (project.status === 'in-progress' || !project.version) return 'en cours de développement';
  return project.version;
}
