#!/usr/bin/env node
// Dump the configured MySQL database without exposing its password in argv.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/backup-database.js /path/to/backup.sql');

const envLine = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
  .split(/\r?\n/).find((line) => line.startsWith('DATABASE_URL='));
if (!envLine) throw new Error('DATABASE_URL is missing from .env');
const rawUrl = envLine.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
const database = new URL(rawUrl);
if (!['mysql:', 'mariadb:'].includes(database.protocol)) throw new Error('Only MySQL backups are supported');

const output = fs.openSync(target, 'wx', 0o600);
try {
  const result = spawnSync('mysqldump', [
    '--single-transaction', '--routines', '--triggers', '--default-character-set=utf8mb4',
    '--host', database.hostname, '--port', database.port || '3306',
    '--user', decodeURIComponent(database.username), database.pathname.slice(1)
  ], {
    env: { ...process.env, MYSQL_PWD: decodeURIComponent(database.password) },
    stdio: ['ignore', output, 'pipe'],
    encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'mysqldump failed');
  console.log(`Database backup saved to ${target}`);
} catch (error) {
  fs.closeSync(output);
  fs.unlinkSync(target);
  throw error;
}
fs.closeSync(output);
