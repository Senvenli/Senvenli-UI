#!/bin/sh
# After a publish: the registry's tarballs must hold exactly what this checkout builds. Run on the clean `main` that
# was published, with the version: `sh scripts/verify-published.sh 0.3.4`. It packs each package here (prepack
# builds it) and compares every file under dist/ with the published tarball, so a stale local build that went out
# (0.3.1 to 0.3.3 did) fails loudly. The registry can lag for a few minutes after a publish; it retries.
set -eu
version=${1:?usage: verify-published.sh <version>}
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
status=0
for p in tokens react cli mcp; do
  mkdir -p "$work/$p/local" "$work/$p/remote"
  (cd "$root/packages/$p" && pnpm pack --pack-destination "$work/$p" >/dev/null)
  tar -xzf "$work/$p"/*.tgz -C "$work/$p/local"
  tries=0
  until (cd "$work/$p" && npm pack "@senvenli/$p@$version" --silent >/dev/null 2>&1); do
    tries=$((tries + 1))
    if [ "$tries" -ge 20 ]; then echo "@senvenli/$p@$version: not on the registry after 10 minutes"; exit 1; fi
    sleep 30
  done
  tar -xzf "$(ls "$work/$p"/senvenli-"$p"-"$version".tgz)" -C "$work/$p/remote"
  if diff -rq "$work/$p/local/package/dist" "$work/$p/remote/package/dist" >"$work/$p/diff" 2>&1; then
    echo "@senvenli/$p@$version: dist matches this checkout"
  else
    echo "@senvenli/$p@$version: published dist DIFFERS from this checkout:"
    head -20 "$work/$p/diff"
    status=1
  fi
done
exit $status
