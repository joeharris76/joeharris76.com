import { existsSync, statSync } from "node:fs";
import path from "node:path";

export type Resolution = { status: 200; file: string } | { status: 301; location: string } | { status: 404 };

const isFile = (file: string): boolean => existsSync(file) && statSync(file).isFile();

export function resolvePagesPath(root: string, urlPath: string): Resolution {
  const decoded = decodeURIComponent(urlPath);
  const file = path.join(root, ...decoded.split("/"));
  if (!file.startsWith(root)) return { status: 404 };
  if (decoded.endsWith("/")) return isFile(path.join(file, "index.html")) ? { status: 200, file: path.join(file, "index.html") } : { status: 404 };
  if (isFile(file)) return { status: 200, file };
  if (isFile(`${file}.html`)) return { status: 200, file: `${file}.html` };
  if (isFile(path.join(file, "index.html"))) return { status: 301, location: `${urlPath}/` };
  return { status: 404 };
}

export function servesPath(root: string, urlPath: string): boolean {
  const first = resolvePagesPath(root, urlPath);
  return first.status === 200 || (first.status === 301 && resolvePagesPath(root, first.location).status === 200);
}
