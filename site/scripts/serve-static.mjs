// A stand-in for the production nginx rules, for local checks only (no nginx on this machine):
//
//   root .../build/client;
//   location / { try_files $uri $uri/index.html =404; }
//   error_page 404 /404.html;
//   rewrite ^/(.+)/$ /$1 permanent;     # one canonical URL: no trailing slash
//
// No SPA fallback: every route is a file, and an unknown URL is a real 404.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "build/client");
const port = Number(process.argv[3] ?? 5181);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".md": "text/markdown; charset=utf-8", ".data": "text/x-script", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
const isFile = (path) => existsSync(path) && statSync(path).isFile();

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.length > 1 && pathname.endsWith("/")) {
    res.writeHead(301, { Location: pathname.slice(0, -1) + url.search }).end();
    return;
  }
  const base = join(root, normalize(pathname));
  if (!base.startsWith(root)) return void res.writeHead(403).end();
  const file = [base, join(base, "index.html")].find(isFile);
  const served = file ?? join(root, "404.html");
  res.writeHead(file ? 200 : 404, { "Content-Type": TYPES[extname(served)] ?? "application/octet-stream" });
  // A rebuild may remove the file between the check and the read: end the response, keep serving.
  createReadStream(served).on("error", () => res.end()).pipe(res);
  console.log(file ? 200 : 404, req.url);
}).listen(port, "127.0.0.1", () => console.log(`static: ${root} on http://localhost:${port}`));
