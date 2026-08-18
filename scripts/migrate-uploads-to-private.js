#!/usr/bin/env node
/**
 * Moves uploaded files out of public/uploads into private/uploads.
 *
 * Files under public/ are served as static assets by Next, so anyone with the
 * URL could read an attachment without signing in. Storage now lives outside
 * the web root and is served only through routes that check the session.
 *
 * The `fileUrl` column keeps its `/uploads/...` value — it is a storage key, not
 * a URL — so no database changes are needed and this script only moves files.
 * Safe to run more than once. Run with --dry to preview.
 *
 *   node scripts/migrate-uploads-to-private.js [--dry] [--copy]
 *
 * --copy leaves the originals in place. Use it if you want to verify the app
 * first; remember to delete public/uploads afterwards, or the files stay
 * publicly readable and the whole exercise is pointless.
 */

const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry');
const copyOnly = process.argv.includes('--copy');

const projectRoot = path.join(__dirname, '..');
const source = path.join(projectRoot, 'public', 'uploads');
const destination = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(projectRoot, 'private', 'uploads');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function main() {
  if (!fs.existsSync(source)) {
    console.log(`Nothing to do — ${path.relative(projectRoot, source)} does not exist.`);
    return;
  }

  const files = walk(source);

  if (files.length === 0) {
    console.log('Nothing to do — no files under public/uploads.');
    return;
  }

  console.log(`${files.length} file(s) to ${copyOnly ? 'copy' : 'move'}`);
  console.log(`  from ${source}`);
  console.log(`    to ${destination}`);
  if (dryRun) console.log('  (dry run — nothing will be written)\n');

  let moved = 0;
  let skipped = 0;

  for (const file of files) {
    const relative = path.relative(source, file);
    const target = path.join(destination, relative);

    if (fs.existsSync(target)) {
      console.log(`  skip   ${relative} (already present)`);
      skipped += 1;
      continue;
    }

    console.log(`  ${copyOnly ? 'copy' : 'move'}   ${relative}`);

    if (!dryRun) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
      // 0600: readable only by the account the app runs as.
      fs.chmodSync(target, 0o600);

      if (!copyOnly) {
        fs.unlinkSync(file);
      }
    }

    moved += 1;
  }

  console.log(`\n${copyOnly ? 'Copied' : 'Moved'} ${moved}, skipped ${skipped}.`);

  if (!dryRun && !copyOnly) {
    // Clear out the directories left behind, so nothing suggests files are
    // still served from there.
    for (const dir of walkDirs(source).reverse()) {
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    }

    if (fs.existsSync(source) && fs.readdirSync(source).length === 0) {
      fs.rmdirSync(source);
    }
  }

  if (dryRun) {
    console.log('\nDry run only. Re-run without --dry to apply.');
  }
}

function walkDirs(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return [full, ...walkDirs(full)];
    });
}

main();
