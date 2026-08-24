import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.argv[2] || 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://localhost");
    const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
    const target = resolve(join(root, "." + pathname));
    const insideRoot = target === root || target.startsWith(root + "\\") || target.startsWith(root + "/");
    if (!insideRoot) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const content = await readFile(target);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[extname(target).toLowerCase()] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Senses Car running at http://127.0.0.1:" + port);
});
