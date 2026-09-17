#!/usr/bin/env bash
set -euo pipefail

app_dir="$(cd "$(dirname "$0")/.." && pwd)"
target_commit="${1:-}"
log_file="$app_dir/.rollback.log"

exec >>"$log_file" 2>&1
cd "$app_dir"

if [[ ! "$target_commit" =~ ^[a-fA-F0-9]{40}$ ]]; then
  echo "Invalid rollback commit."
  exit 1
fi

current_commit="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$target_commit" "$current_commit"

restore_current() {
  echo "Rollback build failed; restoring $current_commit"
  git reset --hard "$current_commit"
  npm ci
  npm run build
  pm2 restart sfxc-activity --update-env
}
trap restore_current ERR

echo "Rolling back from $current_commit to $target_commit"
git reset --hard "$target_commit"
npm ci
npm run build
pm2 restart sfxc-activity --update-env
pm2 save
trap - ERR
echo "Rollback completed at $(date -Iseconds)"
