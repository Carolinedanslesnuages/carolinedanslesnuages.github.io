#!/usr/bin/env node
/**
 * Collects from GitHub what the site shows: for each project of site.config.json, its
 * description, latest release and file tree. The text of the files is NOT copied: a small readable
 * file gets its "raw" address, and the site reads it from GitHub when it is opened.
 *
 * Safety: only PUBLIC repositories are collected. A private, missing or renamed repository stops
 * the collection with a clear message: nothing is ever published by mistake.
 *
 * site.config.json keeps its French keys (public configuration). Writes src/data/projects.json and
 * one src/data/files/<folder>.json per project, so that a project's files load only when it is
 * opened. GITHUB_TOKEN is optional (rate limit).
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const GITHUB_API = 'https://api.github.com';
const RAW_CONTENT = 'https://raw.githubusercontent.com';
const TEXT_FILE = /\.(md|ya?ml|sh|ts|vue|js|mjs|cjs|css|html|txt|toml|json|csv)$|(^|\/)(LICENSE|Dockerfile)$/i;
const MAX_FILE_BYTES = 40000;
const IGNORED_FOLDERS = /(^|\/)(node_modules|dist)(\/|$)/;
/** Files written in English (RGAA 8.7: the change of language is marked). */
const ENGLISH_FILE = /(^|\/)LICEN[CS]E(\.md|\.txt)?$/i;
/** Status values of site.config.json ("etat", French) → internal status. */
const STATUSES = { essai: 'trial', 'en-ligne': 'released', 'en-cours': 'in-progress' };

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'site-cyberdeck' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function fetchGithub(path) {
  const response = await fetch(GITHUB_API + path, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${path} : ${response.status} ${await response.text()}`);
  return response.json();
}

/** Path kept on the site: no hidden tooling folder (except .github), no dependencies. */
export function keepPath(path) {
  if (IGNORED_FOLDERS.test(path) || /(^|\/)package-lock\.json$/.test(path)) return false;
  const topLevel = path.split('/')[0];
  return !topLevel.startsWith('.') || topLevel === '.github';
}

async function checkedRepository(account, repoName) {
  const repository = await fetchGithub(`/repos/${account}/${repoName}`);
  if (!repository) throw new Error(`Dépôt introuvable : ${account}/${repoName}. Vérifiez son nom exact (majuscules comprises) dans site.config.json.`);
  if (repository.private || repository.visibility !== 'public') throw new Error(`${account}/${repoName} n'est pas public : il ne sera jamais publié sur le site.`);
  if (repository.name !== repoName) throw new Error(`${account}/${repoName} a été renommé en « ${repository.name} » : mettez à jour site.config.json.`);
  return repository;
}

/**
 * Why the project has this name: the README paragraph that starts with "Le nom", as plain text
 * (Markdown emphasis, links and code marks removed). Empty when the README has none.
 */
export function namesakeOf(readme) {
  const paragraphs = String(readme || '').split(/\n\s*\n/);
  const paragraph = paragraphs.find((candidate) => /^Le nom\b/.test(candidate.trim()));
  if (!paragraph) return '';
  return paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readReadme(account, repository) {
  const response = await fetch(`${RAW_CONTENT}/${account}/${repository.name}/${repository.default_branch}/README.md`);
  return response.ok ? response.text() : '';
}

async function collectFiles(account, repository, folder) {
  const branch = repository.default_branch;
  const tree = await fetchGithub(`/repos/${account}/${repository.name}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const files = {};
  for (const item of tree.tree) {
    if (!keepPath(item.path)) continue;
    const sitePath = `projets/${folder}/${item.path}`;
    if (item.type === 'tree') {
      files[sitePath] = { folder: true };
      continue;
    }
    const file = { url: `${repository.html_url}/blob/${branch}/${item.path}` };
    if (ENGLISH_FILE.test(item.path)) file.lang = 'en';
    if (TEXT_FILE.test(item.path) && item.size <= MAX_FILE_BYTES) {
      const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
      file.raw = `${RAW_CONTENT}/${account}/${repository.name}/${branch}/${encodedPath}`;
    }
    files[sitePath] = file;
  }
  return files;
}

async function collectProject(account, configured) {
  const repository = await checkedRepository(account, configured.depot);
  const release = await fetchGithub(`/repos/${account}/${configured.depot}/releases/latest`);
  // Latest commits, for the "log" command (title only).
  const latest = (await fetchGithub(`/repos/${account}/${configured.depot}/commits?per_page=20`)) || [];
  const commits = latest.map((commit) => ({ sha: commit.sha.slice(0, 7), title: commit.commit.message.split('\n')[0], date: commit.commit.author.date, url: commit.html_url }));
  const folder = configured.dossier || configured.depot.toLowerCase();
  return {
    project: {
      name: configured.nom || repository.name.charAt(0).toUpperCase() + repository.name.slice(1),
      command: folder.normalize('NFD').replace(/\p{Diacritic}/gu, ''),
      folder,
      tagline: configured.accroche || repository.description || '',
      namesake: namesakeOf(await readReadme(account, repository)),
      description: repository.description || '',
      version: release ? release.tag_name : null,
      status: STATUSES[configured.etat] || (release ? 'released' : 'in-progress'),
      url: repository.html_url,
      commits,
    },
    files: await collectFiles(account, repository, folder),
  };
}

/**
 * The desktop folders of site.config.json ("dossiers"), with the folder names of their projects.
 * A project in no folder stays alone on the desktop; an unknown repository stops the collection.
 */
export function desktopFolders(configuredFolders = [], projects = [], configuredProjects = []) {
  const folderOfRepository = new Map(configuredProjects.map((configured, index) => [configured.depot, projects[index] && projects[index].folder]));
  return configuredFolders.map((configuredFolder) => ({
    name: configuredFolder.nom,
    tagline: configuredFolder.accroche || '',
    projects: (configuredFolder.projets || []).map((repository) => {
      const folder = folderOfRepository.get(repository);
      if (!folder) throw new Error(`Le dossier « ${configuredFolder.nom} » cite « ${repository} », absent de « projets » dans site.config.json.`);
      return folder;
    }),
  }));
}

async function main() {
  const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
  const projects = [];
  const filesByFolder = {};
  for (const configured of config.projets) {
    const collected = await collectProject(config.compte, configured);
    projects.push(collected.project);
    filesByFolder[collected.project.folder] = collected.files;
    const fileCount = Object.values(collected.files).filter((file) => !file.folder).length;
    console.log(`${collected.project.name} : ${fileCount} fichiers${collected.project.version ? `, ${collected.project.version}` : ''}`);
  }
  const siteData = {
    account: config.compte,
    nickname: config.pseudo,
    tagline: config.accroche,
    words: config.mots || [],
    presentation: config.presentation || [],
    projects,
    folders: desktopFolders(config.dossiers, projects, config.projets),
    upcoming: (config.bientot || []).map((upcoming) => ({ name: upcoming.nom, tagline: upcoming.accroche })),
  };
  const filesFolder = new URL('../src/data/files/', import.meta.url);
  // Starting from an empty folder: a project removed from the configuration leaves no file behind.
  await rm(filesFolder, { recursive: true, force: true });
  await mkdir(filesFolder, { recursive: true });
  await writeFile(new URL('../src/data/projects.json', import.meta.url), JSON.stringify(siteData, null, 2));
  for (const [folder, files] of Object.entries(filesByFolder)) {
    await writeFile(new URL(`${folder}.json`, filesFolder), JSON.stringify(files));
  }
  console.log(`Collecte terminée : ${projects.length} projets.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`collecte : ${error.message}`);
    process.exit(1);
  });
}
