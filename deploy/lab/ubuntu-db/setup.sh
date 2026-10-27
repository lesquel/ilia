#!/usr/bin/env bash
# PostgreSQL node for the lab, on Ubuntu Server (native or VM). Run with sudo:
#   sudo ./setup.sh [--env-file /path/to/lab.env]
# Without --env-file it looks for ./lab.env and ../lab.env, then falls back to
# variables already exported in the shell. Safe to run again: every step checks
# the current state first.
#
# PostgreSQL comes from apt, deliberately not Docker: the assignment needs a
# database service installed and managed on Ubuntu itself.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) env_file="${2:?--env-file needs a path}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done
if [[ -z "$env_file" ]]; then
  for candidate in "$PWD/lab.env" "$script_dir/lab.env" "$script_dir/../lab.env"; do
    [[ -f "$candidate" ]] && { env_file="$candidate"; break; }
  done
fi
if [[ -n "$env_file" ]]; then
  echo ">> Loading $env_file"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
fi

db_user="${POSTGRES_USER:?POSTGRES_USER is not set}"
db_pass="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is not set}"
db_name="${POSTGRES_DB:?POSTGRES_DB is not set}"
subnet="${LAB_SUBNET:?LAB_SUBNET is not set}"

# The names go into SQL identifiers and a pg_hba line, so keep them boring.
ident='^[A-Za-z_][A-Za-z0-9_]*$'
[[ "$db_user" =~ $ident ]] || { echo "POSTGRES_USER must match $ident" >&2; exit 1; }
[[ "$db_name" =~ $ident ]] || { echo "POSTGRES_DB must match $ident" >&2; exit 1; }
[[ "$subnet" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}/[0-9]{1,2}$ ]] \
  || { echo "LAB_SUBNET must look like 192.168.1.0/24" >&2; exit 1; }

echo ">> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y postgresql openssh-server ufw

# Ubuntu ships whatever major version its release carries (not necessarily 17),
# so discover it instead of hard-coding a path.
pg_conf_dir="$(find /etc/postgresql -mindepth 2 -maxdepth 2 -type d -name main | sort -V | tail -n1)"
[[ -n "$pg_conf_dir" ]] || { echo "No PostgreSQL cluster found in /etc/postgresql" >&2; exit 1; }
pg_ver="$(basename "$(dirname "$pg_conf_dir")")"
echo ">> PostgreSQL major version: $pg_ver ($pg_conf_dir)"

# A conf.d drop-in survives package upgrades and never edits the stock file, so
# re-running cannot stack duplicate `listen_addresses` lines.
mkdir -p "$pg_conf_dir/conf.d"
cat > "$pg_conf_dir/conf.d/90-ilia-lab.conf" <<CONF
# Managed by deploy/lab/ubuntu-db/setup.sh
listen_addresses = '*'
CONF

# Auth is scoped to the lab subnet and to this one role/database; ufw narrows
# it again at the network layer.
hba_line="host    $db_name    $db_user    $subnet    scram-sha-256"
if ! grep -Fxq "$hba_line" "$pg_conf_dir/pg_hba.conf"; then
  printf '%s\n' "$hba_line" >> "$pg_conf_dir/pg_hba.conf"
  echo ">> pg_hba.conf: added rule for $subnet"
else
  echo ">> pg_hba.conf: rule already present"
fi

systemctl enable postgresql ssh
systemctl restart postgresql ssh

# Run from / so `sudo -u postgres` does not warn about an unreadable cwd.
psql_admin() { (cd / && sudo -u postgres psql -v ON_ERROR_STOP=1 "$@"); }

# The password travels as a psql variable on stdin (:'pw'), never spliced into
# the SQL text, so quotes in it cannot break or inject anything.
role_exists="$(psql_admin -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$db_user'")"
if [[ "$role_exists" != "1" ]]; then
  echo ">> Creating role $db_user"
  psql_admin -v pw="$db_pass" -v u="$db_user" <<< "CREATE ROLE :\"u\" LOGIN PASSWORD :'pw';"
else
  echo ">> Role $db_user exists; syncing password"
  psql_admin -v pw="$db_pass" -v u="$db_user" <<< "ALTER ROLE :\"u\" LOGIN PASSWORD :'pw';"
fi

db_exists="$(psql_admin -tAc "SELECT 1 FROM pg_database WHERE datname = '$db_name'")"
if [[ "$db_exists" != "1" ]]; then
  echo ">> Creating database $db_name"
  psql_admin -v d="$db_name" -v u="$db_user" <<< "CREATE DATABASE :\"d\" OWNER :\"u\";"
else
  echo ">> Database $db_name already exists"
fi

# Allow SSH first: enabling ufw with no SSH rule would lock out a remote session.
ufw allow OpenSSH
ufw allow from "$subnet" to any port 5432 proto tcp
ufw --force enable

echo ">> Checking the login over TCP with the configured password"
if PGPASSWORD="$db_pass" psql -h 127.0.0.1 -U "$db_user" -d "$db_name" -tAc "SELECT version();"; then
  echo ">> Login OK"
else
  echo "!! Login over TCP failed; review pg_hba.conf and the password" >&2
fi

cat <<EVIDENCE

=================== Evidence commands (take screenshots) ===================
hostname; lsb_release -a
hostname -I
ip addr
systemctl status postgresql --no-pager
systemctl status ssh --no-pager
ss -tlnp | grep 5432
sudo ufw status verbose
sudo -u postgres psql -c 'SELECT version();'
=============================================================================
EVIDENCE
