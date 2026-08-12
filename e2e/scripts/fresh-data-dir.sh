#!/usr/bin/env bash
#
# The throwaway DEKAF_DATA_DIR used when DEKAF_FRESH_DATA=1 (see run-dekaf.sh).
#
# It lives here, in one script with two verbs, because two different scripts need to agree on it and
# they never run together: run-dekaf.sh creates it and then `exec`s the server, so the process that
# made the directory is replaced by one that has no idea it is temporary. CI later kills that whole
# process tree, so nothing the server could have registered - a trap, an atexit - ever runs either.
# The path was `mktemp -d`, i.e. a fresh unguessable name per run, which made the tree impossible to
# find afterwards and left one behind on the self-hosted runner every single build.
#
# A DETERMINISTIC path fixes both halves: the run before it can be cleared away up front, and the
# teardown step (stack-down.sh, which CI runs with `if: always()`) knows exactly what to remove
# without having been told.
#
# Deterministic is not enough on its own, though, and the first version of this script stopped
# there: ONE path shared by every stack on the box, `rm -rf`'d at startup by run-dekaf.sh and again
# at teardown by stack-down.sh. Two stacks running side by side - a second Dekaf on its own port,
# with or without a Pulsar container of its own, which is how you run two - would therefore delete
# each other's LIVE data dir. So the path also carries a STACK IDENTITY.
#
# That identity is derived, not configured: it is exactly the pair of variables that already
# distinguishes one stack from another and is already in the environment of BOTH ends - the Dekaf
# port run-dekaf.sh serves on, and the Pulsar container name stack-down.sh removes. Nothing has to
# be passed along or remembered; each end computes the same answer from what it was given anyway.
#
#   fresh-data-dir.sh path    print the directory (no side effects)
#   fresh-data-dir.sh clean   remove it if it exists
#
# NOTE for teardown: `clean` removes THIS stack's tree only, so it has to run with the same
# DEKAF_PORT / PULSAR_CONTAINER_NAME the stack was brought up with (CI sets DEKAF_PORT at job level,
# so every step of the job agrees). Getting that wrong now leaks a tree instead of destroying a live
# one, and `clean` names the trees it left behind so the leak is visible rather than silent.
#
# $RUNNER_TEMP is the GitHub-runner-scoped temp dir - already per-job and wiped by the runner - so it
# is the right home on CI; locally it falls back to $TMPDIR.
set -euo pipefail

fresh_data_base() {
  local base="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
  echo "${base%/}/dekaf-e2e-fresh-data"
}

# Which stack this is. Sanitized to [A-Za-z0-9._-] so a container name containing a slash cannot
# push the tree outside the base dir, and so an identity cannot collide with a different one that
# literally lacks the offending character: `tr -c` REPLACES each disallowed character with `_`
# rather than dropping it, so the character still leaves a mark (`a/b` -> `a_b`, not `ab`).
stack_id() {
  printf '%s-%s' "${DEKAF_PORT:-8090}" "${PULSAR_CONTAINER_NAME:-dekaf-e2e-pulsar}" | tr -c 'A-Za-z0-9._-' '_'
}

fresh_data_dir() {
  echo "$(fresh_data_base)-$(stack_id)"
}

case "${1:-path}" in
  path)
    fresh_data_dir
    ;;
  clean)
    dir="$(fresh_data_dir)"
    if [ -d "$dir" ]; then
      rm -rf "$dir"
      echo "Removed the e2e fresh data dir: $dir"
    else
      echo "No e2e fresh data dir to remove ($dir)."
    fi
    # Anything left belongs to a DIFFERENT stack identity and is deliberately not touched. Naming
    # it is the whole mitigation for the one hazard per-stack paths introduce: a teardown run
    # without the DEKAF_PORT / PULSAR_CONTAINER_NAME its stack used now leaks a tree, which is the
    # failure mode the deterministic path was introduced to end. Better loud than invisible.
    # The bare `$prefix` (no identity) is matched too: it is where the pre-identity version of this
    # script put ITS tree, and a checkout old enough to have created one would otherwise leave it
    # orphaned and invisible. Listing is all that happens to it - deleting a path that every stack
    # once shared is the bug this identity exists to fix.
    prefix="$(fresh_data_base)"
    shopt -s nullglob
    others=("$prefix"*)
    shopt -u nullglob
    if [ "${#others[@]}" -gt 0 ]; then
      echo "Other stacks' e2e data dirs left untouched (each is removed by its own stack's teardown):"
      printf '  %s\n' "${others[@]}"
    fi
    ;;
  *)
    echo "usage: $(basename "$0") [path|clean]" >&2
    exit 2
    ;;
esac
