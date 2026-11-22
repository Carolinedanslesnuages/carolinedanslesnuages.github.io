/**
 * Loads the collected files of a project only when it is needed: each project is a separate chunk,
 * so the desktop shows up without downloading every repository. Loaded projects are kept.
 */
const fileModules = import.meta.glob('./files/*.json', { import: 'default' });
const loadedProjects = new Map();

export function loadProjectFiles(folder) {
  const loader = fileModules[`./files/${folder}.json`];
  if (!loader) return Promise.resolve({});
  if (!loadedProjects.has(folder)) loadedProjects.set(folder, loader());
  return loadedProjects.get(folder);
}

/** Every project at once: the terminal searches across all of them. */
export async function loadAllFiles() {
  const folders = Object.keys(fileModules).map((path) => path.slice('./files/'.length, -'.json'.length));
  const allFiles = await Promise.all(folders.map(loadProjectFiles));
  return Object.assign({}, ...allFiles);
}
