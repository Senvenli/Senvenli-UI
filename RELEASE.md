# Releasing Senvenli UI

All four packages share one version and are published together: `@senvenli/tokens`, `@senvenli/react`,
`@senvenli/cli`, `@senvenli/mcp`. The docs site and the hosted MCP endpoint live on design.senvenli.com.

## Publishing (owner)

The packages are published under the `senvenli` npm org from the owner's account. The account uses 2FA with browser
authentication, so `pnpm publish` must run in an interactive terminal; it asks to confirm each package in the browser.
Right after a publish the registry and its CDN can answer 404 for a few minutes; check with
`npm view @senvenli/react@<version> version --prefer-online`.

## Every release

1. Set the version in the four `packages/*/package.json` and date the `CHANGELOG.md` entry, in a PR.
2. After it merges, on a clean `main`:

   ```sh
   pnpm install --frozen-lockfile
   pnpm release:check        # build, all tests, site tests, then pack + install + use the tarballs
   pnpm -r --filter './packages/**' publish --access public --dry-run   # read the file lists
   pnpm -r --filter './packages/**' publish --access public
   sh scripts/verify-published.sh <version>   # the registry's dist/ must match this checkout's build
   ```

   `pnpm publish` turns `workspace:^` into `^<version>` and publishes in dependency order (tokens first). Every
   package also clears and rebuilds its `dist/` before it is packed (`prepack`), so a publish never ships a stale one: 0.3.1 to
   0.3.3 went out from a `dist/` built before their changes because the build step was skipped.
3. Tag it: `git tag v<version> && git push origin v<version>`.

`scripts/smoke-pack.sh` (part of `release:check`, and of CI) is the check that matters most: it installs the packed
tarballs into an empty project and renders a component in Node, imports every subpath, runs the CLI and the MCP
server, and typechecks an app file.

## design.senvenli.com

`<host>` below is the docs server, as named in the maintainer's SSH config. It serves other sites too: add only this site's
files, and run `nginx -t` before every reload.

**Site** (static, no server process):

```sh
pnpm --filter site build
rsync -a --delete site/build/client/ <host>:/var/www/senvenli-design/
```

**nginx**: `deploy/design.senvenli.com.conf` → `/etc/nginx/sites-available/`, symlink into `sites-enabled`,
`nginx -t`, reload, then `certbot --nginx -d design.senvenli.com`. After a reload, retry the checks for a few seconds:
old workers answer briefly. Check the content types too (`curl -sI`), not only the status: the site's `types` block
adds to `mime.types`, and without that include every file goes out as `application/octet-stream`.

**Hosted MCP** (after the npm release):

```sh
mkdir -p /opt/senvenli-mcp && cd /opt/senvenli-mcp && npm i @senvenli/mcp@<version>
cp deploy/senvenli-mcp.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable --now senvenli-mcp
```

It listens on 127.0.0.1:8787 only; nginx exposes `POST /mcp` with a 64 KB body cap and a rate limit.

**Verify**

```sh
curl -sI https://design.senvenli.com/docs/getting-started | head -1          # 200
curl -s https://design.senvenli.com/docs/components/button.md | head -1       # # Button
curl -s https://design.senvenli.com/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 200            # the 7 tools
```

