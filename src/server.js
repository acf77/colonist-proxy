import cors from "cors";
import express from "express";

const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";
const COLONIST_ORIGIN = "https://colonist.io";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const VALID_MODES = new Set([
  "Classic4P",
  "Classic1v1",
  "CitiesAndKnights4P",
  "Rush4P",
]);

app.disable("x-powered-by");
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/leaderboard", async (req, res) => {
  const mode = getMode(req.query.mode);
  const leaderboardUrl = parseLeaderboardUrl(req, res);
  if (leaderboardUrl === null) return;
  const start = getInteger(req.query.start, 1, 1);
  const limit = getInteger(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const end = getInteger(req.query.end, start + limit - 1, start, start + MAX_LIMIT - 1);
  const search = getString(req.query.search, "");

  if (!mode) {
    return res.status(400).json({
      error: `Invalid mode. Use one of: ${Array.from(VALID_MODES).join(", ")}`,
    });
  }

  const upstreamUrl = buildColonistUrl(
    `/api/leaderboards/${encodeURIComponent(mode)}/${leaderboardUrl}`,
    { start, end, search },
  );

  await proxyGet(upstreamUrl, res);
});

app.get("/leaderboard/tabs", async (req, res) => {
  const leaderboardUrl = parseLeaderboardUrl(req, res);
  if (leaderboardUrl === null) return;
  const upstreamUrl = buildColonistUrl(`/api/leaderboards-tabs/${leaderboardUrl}`);

  await proxyGet(upstreamUrl, res);
});

app.get("/leaderboard/search", async (req, res) => {
  const mode = getMode(req.query.mode);
  const leaderboardUrl = parseLeaderboardUrl(req, res);
  if (leaderboardUrl === null) return;
  const usernameSearchInput = getString(req.query.q ?? req.query.usernameSearchInput, "");

  if (!mode) {
    return res.status(400).json({
      error: `Invalid mode. Use one of: ${Array.from(VALID_MODES).join(", ")}`,
    });
  }

  if (!usernameSearchInput) {
    return res.status(400).json({ error: "Missing q query parameter." });
  }

  const upstreamUrl = buildColonistUrl(
    `/api/leaderboards-username-search/${encodeURIComponent(mode)}/${leaderboardUrl}`,
    { usernameSearchInput },
  );

  await proxyGet(upstreamUrl, res);
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, HOST, () => {
  console.log(`Colonist leaderboard proxy listening on http://${HOST}:${PORT}`);
});

function buildColonistUrl(path, query = {}) {
  const url = new URL(path, COLONIST_ORIGIN);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  return url;
}

async function proxyGet(upstreamUrl, res) {
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: "application/json",
        "accept-language": "en",
        referer: `${COLONIST_ORIGIN}/leaderboards`,
        "user-agent": "colonist-leaderboard-proxy/1.0",
      },
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    res
      .status(upstream.status)
      .set("content-type", contentType)
      .set("cache-control", "no-store")
      .send(body);
  } catch (error) {
    res.status(502).json({
      error: "Failed to fetch Colonist leaderboard data.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function getMode(value) {
  const mode = getString(value, "Classic4P");
  return VALID_MODES.has(mode) ? mode : null;
}

function getString(value, fallback) {
  if (Array.isArray(value)) return getString(value[0], fallback);
  return typeof value === "string" ? value : fallback;
}

function getInteger(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(getString(value, String(fallback)), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function getLeaderboardUrl(value) {
  const leaderboardUrl = getString(value, "");

  if (leaderboardUrl === "") return "";
  if (!/^[A-Za-z0-9/_-]+$/.test(leaderboardUrl)) {
    throw new Error("Invalid leaderboardUrl.");
  }

  return leaderboardUrl
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function parseLeaderboardUrl(req, res) {
  try {
    return getLeaderboardUrl(req.query.leaderboardUrl);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid leaderboardUrl.",
    });
    return null;
  }
}
