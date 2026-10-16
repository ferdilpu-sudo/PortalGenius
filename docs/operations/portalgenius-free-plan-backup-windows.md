# PortalGenius — Manual Windows backup for Supabase Free

Date: 16 October 2026. **Production export only; no database writes, no restore.**
Supabase project ref: `vpglikrkvsnoyjvluigs`.

## Why manual backup is required

The operator inspected Supabase > Database > Backups and reported **no backup**.
Supabase documents daily automatic backups for paid Pro/Team/Enterprise
projects and recommends off-site logical exports for Free projects:
https://supabase.com/docs/guides/platform/backups

Do not merge or enable production account provisioning until a backup
has been created, stored securely and a recovery rehearsal planned.

## What the backup captures

`scripts/ops/Backup-PortalGenius.ps1` is a **read-only** single-purpose
Windows script. It runs PostgreSQL **17 or newer** `pg_dump` with custom
archive format (`-Fc`) against the real project and lists the archive with
`pg_restore --list`. It explicitly selects `public`, `private`,
`auth` and `supabase_migrations` schemas.

This includes PortalGenius academic/account tables, internal login
identities and managed Auth tables such as `auth.users`, **when permissions
allow the export to complete**. The script refuses to claim success unless
the archive contains `auth.users`, `public.accounts` and
`private.login_identities` table-data entries. It calculates SHA-256
for the generated archive.

This archive is **sensitive and is not yet a complete disaster-recovery
package**. It contains account identifiers and password hashes, and
eventually may contain protected student records. PostgreSQL archive
inspection does **not** prove that a restore succeeds. Storage API files,
runtime secrets, SMTP/provider settings, custom DNS and Cloudflare
deployment secrets must be captured or documented separately.
`--no-owner --no-privileges` means the restore plan must re-apply
and verify intended grants. An archive that includes managed `auth`
objects needs a carefully rehearsed, selective restore procedure;
**never restore this raw archive over a running Supabase Production
project**.

Using `supabase db dump` by itself would ordinarily omit the managed
`auth` schema and default to a schema-only dump. That is why this
procedure explicitly creates a PostgreSQL archive of the relevant
application and Auth schemas.

## Operator prerequisites

1. Install a supported PostgreSQL 17 (or newer) **client** on Windows.
   Both `pg_dump.exe` and `pg_restore.exe` must be available in PATH
   or at the standard `C:\Program Files\PostgreSQL\17\bin` path.
   Do not run `pg_restore` against Production.
2. Prepare an existing **encrypted, access-controlled backup directory
   outside every Git checkout**, ideally on an encrypted external drive.
   The script intentionally refuses to create an unconfirmed destination.
   Maintain a second encrypted off-device copy after export.
3. Open [Supabase PortalGenius — Connect](https://supabase.com/dashboard/project/vpglikrkvsnoyjvluigs?showConnect=true)
   and choose **Session pooler** on port 5432 (preferred for networks
   without IPv6), or direct connection if supported.
   Copy just the **database hostname and database username** into the
   script prompts. Do not paste a full password-bearing connection URI.
   Use the **existing database password**, not any Auth/API service key.
4. Do not reset the database password merely to take a backup; changing
   it can break existing services. Never share the password, connection
   string, raw Auth dump or private archive in chat or GitHub.

## Windows PowerShell procedure

From the independently synced `PortalGenius-PR6-Review` branch:

```powershell
cd "$HOME\Documents\GitHub\PortalGenius-PR6-Review"
git status
git pull --ff-only
```

Make sure the backup drive is encrypted and its destination directory
already exists. Replace `E:\EncryptedPortalGeniusBackups` with your
actual secured directory:

```powershell
powershell -NoProfile -File .\scripts\ops\Backup-PortalGenius.ps1 `
  -Destination "E:\EncryptedPortalGeniusBackups" `
  -EncryptedDestinationConfirmed
```

The script asks for **database hostname, username and a hidden password**;
it does not print password material and clears its temporary
`PGPASSWORD` process environment variable on completion. TLS is
required. It only invokes `pg_dump` and `pg_restore --list`, with no
SQL writes. It rejects unrecognized host/user combinations, missing
PostgreSQL tools, repository destinations and incomplete archives.

**If you do not have an encrypted destination, do not run this yet.**
Prepare a safe encrypted location first.

## Evidence required

On success, provide only these non-secret labels and values:
`BACKUP_ARCHIVE_CREATED`, `BACKUP_ARCHIVE_BYTES`,
`BACKUP_ARCHIVE_SHA256`, `BACKUP_RESTORE_NOT_VERIFIED`.
The archive filename alone may be noted locally, but do not upload
the archive or share the path if it reveals private environment details.
Store SHA-256 separately from the encrypted backup to check later
for corruption.

A successful export changes the checklist to
**BACKUP_ARCHIVE_CREATED / RESTORE_UNVERIFIED**, not
`RECOVERY_VERIFIED`. Full recovery assurance requires isolated
restore tests, explicit Auth handling, grant/RLS parity checks and
storage/secrets recovery procedures.

## Fail-closed boundaries

- `BACKUP_BLOCKED`: environment, storage, connection or tool
  prerequisite failed. Do not try an improvised plaintext export
  into the repository.
- `BACKUP_FAILED`: `pg_dump` or listing did not complete.
  The script removes only its own newly generated incomplete local file.
- `BACKUP_INCOMPLETE`: required tables are absent from the archive.
  Do not accept it as a PortalGenius recovery backup.
- No authorization to create staff accounts, activate release flags,
  merge Draft PR #6, reset credentials or modify Production data
  follows from a backup file alone.

Reference: https://supabase.com/docs/reference/cli/supabase-db-dump
