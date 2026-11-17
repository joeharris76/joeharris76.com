import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { DIST } from "./content.ts";
import { resolvePagesPath } from "./pages.ts";

const PORT = Number(process.env.PORT ?? 4330);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const resolution = resolvePagesPath(DIST, url.pathname);
  if (resolution.status === 301) {
    response.writeHead(301, { location: `${resolution.location}${url.search}` }).end();
    return;
  }
  const file = resolution.status === 200 ? resolution.file : path.join(DIST, "404.html");
  response.writeHead(resolution.status, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(PORT, "127.0.0.1", () => console.log(`serving ${DIST} at http://127.0.0.1:${PORT}/`));
