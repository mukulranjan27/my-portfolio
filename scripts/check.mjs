import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { defaultProfile } from '../assets/js/site-defaults.js';

const root = process.cwd();
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

let failures = 0;
function check(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// 1. JS syntax checks
const jsFiles = [
  'assets/js/config.js',
  'assets/js/preload.js',
  'assets/js/site-defaults.js',
  'assets/js/supabase.js',
  'assets/js/main.js',
  'admin/admin.js',
  'scripts/build-config.mjs',
  'scripts/check.mjs'
];

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', resolve(root, file)], { stdio: 'pipe' });
    check(true, `Syntax OK: ${file}`);
  } catch (err) {
    check(false, `Syntax error in ${file}: ${err.stderr?.toString() || err.message}`);
  }
}

// 2. JSON validity
for (const jsonFile of ['package.json', 'vercel.json', 'manifest.webmanifest']) {
  try {
    JSON.parse(read(jsonFile));
    check(true, `Valid JSON: ${jsonFile}`);
  } catch (err) {
    check(false, `Invalid JSON in ${jsonFile}: ${err.message}`);
  }
}

// 3. CSS has no blocking @import
for (const cssFile of ['assets/css/style.css', 'assets/css/admin.css']) {
  const css = read(cssFile);
  check(!/@import\b/i.test(css), `No render-blocking @import in ${cssFile}`);
}

// 4. Security scan on JS files
for (const file of ['assets/js/preload.js', 'assets/js/main.js', 'admin/admin.js', 'assets/js/supabase.js']) {
  const src = read(file);
  check(!/\binnerHTML\s*=/.test(src), `No innerHTML assignment in ${file}`);
  check(!/\beval\s*\(/.test(src), `No eval() in ${file}`);
  check(!/document\.write\s*\(/.test(src), `No document.write() in ${file}`);
}

// 5. Profile key parity across index.html, admin/dashboard.html, site-defaults.js, and supabase/schema.sql
const profileKeys = new Set(Object.keys(defaultProfile));
const indexHtml = read('index.html');
const dashHtml = read('admin/dashboard.html');
const schemaSql = read('supabase/schema.sql');

const indexDataAttrs = [...indexHtml.matchAll(/data-profile(?:-link)?="([^"]+)"/g)].map((m) => m[1]);
for (const key of indexDataAttrs) {
  check(profileKeys.has(key), `index.html binding "${key}" exists in defaultProfile`);
}

const profileFormMatch = dashHtml.match(/<form id="profile-form"[\s\S]*?<\/form>/);
check(Boolean(profileFormMatch), 'admin/dashboard.html has #profile-form');
if (profileFormMatch) {
  const formNames = [...profileFormMatch[0].matchAll(/\bname="([^"]+)"/g)].map((m) => m[1]);
  for (const key of formNames) {
    check(profileKeys.has(key), `dashboard #profile-form field "${key}" exists in defaultProfile`);
  }
}

for (const key of profileKeys) {
  const regex = new RegExp(`\\b${key}\\b`);
  check(regex.test(schemaSql), `defaultProfile key "${key}" present in supabase/schema.sql`);
}

// 6. Strict RLS check in schema.sql
check(/create table if not exists public\.admin_users/i.test(schemaSql), 'schema.sql defines admin_users table');
check(/create or replace function public\.is_admin\(\)/i.test(schemaSql), 'schema.sql defines is_admin()');
check(!/for all to authenticated using \(true\)/i.test(schemaSql), 'schema.sql does NOT allow any authenticated user with using (true)');

// 7. Local HTML href/src references exist on disk
for (const page of ['index.html', 'admin/login.html', 'admin/dashboard.html']) {
  const html = read(page);
  const pageDir = dirname(resolve(root, page));
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(https?:|#|mailto:|data:)/.test(ref)) continue;
    check(existsSync(resolve(pageDir, ref)), `${page} reference "${ref}" exists on disk`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
