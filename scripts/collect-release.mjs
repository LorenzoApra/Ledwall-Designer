import { readdir, copyFile, mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

const [target, format, platform] = process.argv.slice(2);
if (!target || !['dmg', 'exe'].includes(format) || !['macos-arm64', 'macos-x64', 'windows-x64'].includes(platform)) {
  throw new Error('Usage: node scripts/collect-release.mjs <target> <dmg|exe> <platform>');
}
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const directory = join('src-tauri', 'target', target, 'release', 'bundle', format === 'exe' ? 'nsis' : 'dmg');
const files = (await readdir(directory)).filter(name => name.endsWith('.' + format));
if (files.length !== 1 || !files[0].includes(version)) throw new Error(`Expected exactly one ${version} package in ${directory}; found: ${files}`);
const output = join('artifacts', `v${version}`);
await mkdir(output, { recursive: true });
const filename = `Ledwall-Designer-${version}-${platform}${format === 'exe' ? '-setup' : ''}.${format}`;
await copyFile(join(directory, files[0]), join(output, filename));
const digest = createHash('sha256').update(await readFile(join(output, filename))).digest('hex');
await writeFile(join(output, `${platform}.sha256`), `${digest}  ${basename(filename)}\n`);
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `directory=${output}\n`);
}
console.log(join(output, filename));
