import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const commit = git('rev-parse', 'HEAD');
const dirty = Boolean(git('status', '--porcelain', '--untracked-files=normal'));
const graph = JSON.parse(fs.readFileSync(path.join(dist, 'asset-manifest.json'), 'utf8'));
const files = {};
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isSymbolicLink()) throw Error('Symlink in frontend bundle: ' + file);
    if (item.isDirectory()) walk(file);
    else if (item.isFile()) {
      const name = path.relative(dist, file).split(path.sep).join('/');
      if (name === 'build-info.json') continue;
      const bytes = fs.readFileSync(file);
      files[name] = { sha256: hash(bytes), size: bytes.length };
    }
  }
}
walk(dist);
const entries = [];
for (const [key, chunk] of Object.entries(graph)) {
  for (const file of [chunk.file, ...(chunk.css || []), ...(chunk.assets || [])]) {
    if (!files[file]) throw Error('Missing asset ' + file + ' referenced by ' + key);
  }
  for (const ref of [...(chunk.imports || []), ...(chunk.dynamicImports || [])]) {
    if (!graph[ref]) throw Error('Missing module ' + ref + ' referenced by ' + key);
  }
  if (chunk.isEntry) entries.push(chunk.file);
}
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!entries.length || entries.some(file => !index.includes(file))) throw Error('Entry HTML does not match the asset graph');
for (const file of ['index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest']) {
  if (!files[file]) throw Error('Missing required frontend file: ' + file);
}
const ordered = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
const bundleSHA = hash(Object.entries(ordered).map(([name, file]) => `${name}\0${file.sha256}\0${file.size}\n`).join(''));
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify({
  schema: 1, commit, dirty, built_at: new Date().toISOString(), bundle_sha256: bundleSHA,
  entrypoints: entries.sort(), files: ordered,
}, null, 2) + '\n');
console.log(`Frontend manifest: ${commit}${dirty ? ' (dirty, not a release)' : ''}, ${Object.keys(files).length} files, sha256 ${bundleSHA}`);
