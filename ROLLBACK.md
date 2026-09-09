# Rollback Procedure

Restore point captured **2026-08-18** immediately before the security-hardening
work began.

> **Status: the hardening work has since been merged and pushed.** `main`,
> `security-hardening`, and `origin/main` all point at the same commit, and the
> restore point is now reachable only through the `pre-hardening` tag. An earlier
> version of this file said `main` still pointed at the restore point and that
> nothing had been pushed; both were true when written and are not true now.
> Section 1 has been corrected accordingly — the rest of this document still
> applies as written.

| What | Where |
| --- | --- |
| Git restore point | tag `pre-hardening` (commit `eac4649`) |
| Hardening work | merged into `main`, pushed to `origin/main` |
| Full backup | `backups/20260818-135834/` |
| Database dump | `backups/20260818-135834/database/sfxc_activity_request.sql` |
| Uploads archive | `backups/20260818-135834/uploads.tar.gz` |
| Source archive | `backups/20260818-135834/app-source.tar.gz` |
| Git bundle (all refs) | `backups/20260818-135834/repo.bundle` |
| `.env` copy | `backups/20260818-135834/env/.env` |
| Generated passwords | `initial-passwords.txt` (created during this work, gitignored) |

Nothing has been deployed, so no production system is affected either way.

---

## 1. Roll back the code only

Use this when the database is fine and you only want the old code back. This is
the common case, because every schema change in this work is additive.

To inspect what changed before deciding:

```bash
git diff pre-hardening main --stat
```

To look at the old code without changing any branch:

```bash
git checkout pre-hardening      # detached HEAD; `git checkout main` returns
```

To actually undo the work on `main`, revert it as a new commit. This keeps the
history intact and is safe to push, unlike rewriting a branch that is already on
GitHub:

```bash
git revert --no-commit pre-hardening..main
git commit -m "Revert security-hardening work"
```

If nobody else has pulled and you would rather erase it outright:

```bash
git reset --hard pre-hardening
git push --force-with-lease origin main
```

Read the **Passwords** section below before doing either — a code-only rollback
locks several accounts out.

---

## 2. Roll back the database

The schema changes are **additive only** — new columns with defaults and new
indexes. Old code ignores them, so rolling back the code does *not* require
rolling back the database. Only do this if a migration itself misbehaved.

Drop the added columns and indexes by hand:

```sql
ALTER TABLE `User`
  DROP COLUMN `isActive`,
  DROP COLUMN `tokenVersion`,
  DROP COLUMN `failedLoginCount`,
  DROP COLUMN `lockedUntil`;
DROP INDEX `ActivityRequest_status_date_idx` ON `ActivityRequest`;
DROP INDEX `ActivityRequest_status_idx` ON `ActivityRequest`;
DROP INDEX `ActivityRequest_createdAt_idx` ON `ActivityRequest`;
DROP INDEX `FundLedgerEntry_fundSourceId_createdAt_idx` ON `FundLedgerEntry`;
DROP INDEX `AuditLog_createdAt_idx` ON `AuditLog`;
```

Then remove the corresponding folders under `prisma/migrations/` and run
`npx prisma generate`.

---

## 3. Full restore from the backup

The nuclear option — puts code, database, and uploads back exactly as they were.

**Database:**

```bash
/c/xampp/mysql/bin/mysql.exe -u root -p sfxc_activity_request \
  < backups/20260818-135834/database/sfxc_activity_request.sql
```

The dump contains `DROP TABLE IF EXISTS` for every table, so it overwrites
cleanly without a manual drop first.

**Uploads:**

```bash
rm -rf public/uploads && tar -xzf backups/20260818-135834/uploads.tar.gz -C public
```

Note: the hardening work moves uploads to `private/uploads/`. After a full
restore you also want `rm -rf private/uploads`, or old code and new files will
disagree about where attachments live.

**Source:**

```bash
tar -xzf backups/20260818-135834/app-source.tar.gz -C /some/empty/dir
```

**Git history**, if the repository itself is damaged:

```bash
git clone backups/20260818-135834/repo.bundle recovered-repo
```

---

## 4. Verify the backup before relying on it

```bash
cd backups/20260818-135834 && sha256sum -c manifest.sha256
```

Every line must report `OK`.

---

## Passwords — read this before rolling back

Eight accounts, including `admin@sfxc.edu`, had **no password hash at all**.
They worked only because the old code let any such account sign in with the
literal string `password`. That fallback is gone, so those accounts were given
real generated passwords — see `initial-passwords.txt` (gitignored).

**This is the one place where a code-only rollback is not enough.** The new
passwords are stored as `scrypt$...`, and the old `lib/password.ts` only
understands the `sha256$` format — it returns false for anything else. So after
rolling the code back, those eight accounts cannot sign in at all.

If you roll back, pick one:

- **Restore the database dump as well** (section 3). That brings back the null
  hashes, and with them the old `password` fallback — so you are back to the
  original behaviour, backdoor included.
- **Or set sha256-format passwords** for those accounts before rolling back.

Accounts that already had a real `sha256$` hash are unaffected either way, and
so is any account whose password is changed through the app after a rollback.

Sessions survive a rollback in both directions. Old tokens parse as version 0
under the new code, and the new code's extra `ver` field is ignored by the old
code, so nobody is signed out either way.

## After rolling back

Restart the dev server. Nothing else is required.

## Taking a fresh restore point later

```bash
bash scripts/backup-local.sh
```

Each run creates a new timestamped folder and never overwrites a previous one.
