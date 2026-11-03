import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** From README.md ("Live at coach.ziaa.me"). Override with `login --url`. */
export const DEFAULT_URL = "https://coach.ziaa.me";

export type Config = { token: string; url: string };

/** Where the token and URL are kept. */
export function configPath(home: string = homedir()): string {
  return join(home, ".session-coach", "config.json");
}

/** A CLI token from /setup starts with `sc_`. Returns an error message, or null when it looks right. */
export function validateToken(token: string): string | null {
  if (!token.startsWith("sc_") || token.length <= 3) {
    return "That doesn't look like a CLI token. Copy one from the app's /setup page; it starts with sc_.";
  }
  return null;
}

/** Hosts where plain http is allowed, so a token never crosses the network unencrypted. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const TRAILING_SLASHES = /\/+$/;

/**
 * Normalises a site URL: https, or http for a local host only; no trailing slash.
 *
 * @returns The cleaned URL, or null when it isn't allowed.
 */
export function normalizeUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname))) {
    return null;
  }
  return `${url.origin}${url.pathname.replace(TRAILING_SLASHES, "")}`;
}

/** Writes the config readable by its owner only, even when the file already existed with looser permissions. */
export async function saveConfig(path: string, config: Config): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
}

/** Reads the saved config, or null when there is none or it isn't usable. */
export async function loadConfig(path: string): Promise<Config | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
  const { token, url } = (parsed ?? {}) as { token?: unknown; url?: unknown };
  if (typeof token !== "string" || typeof url !== "string") return null;
  // Same rules as on save, so a hand-edited file can't add a trailing slash or downgrade to http.
  const cleaned = normalizeUrl(url);
  return cleaned ? { token, url: cleaned } : null;
}
