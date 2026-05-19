# Colonist Leaderboard Proxy

Small Express API proxy for Colonist leaderboard endpoints that are blocked by browser CORS.

## Install

```sh
npm install
```

## Run

```sh
npm start
```

The API listens on `http://localhost:3000` by default.

For local-only binding, run with `HOST=127.0.0.1 npm start`. Container
deployments should keep the default `0.0.0.0` bind address so platform health
checks can reach the app.

## Endpoints

### Leaderboard Data

```http
GET /leaderboard?mode=Classic4P&start=1&limit=100
```

Optional query params:

- `mode`: `Classic4P`, `Classic1v1`, `CitiesAndKnights4P`, or `Rush4P`
- `leaderboardUrl`: region/category path such as `Country/US`; omit for global
- `start`: first rank to fetch, default `1`
- `end`: last rank to fetch; defaults from `limit`
- `limit`: number of rows, capped at `100`
- `search`: forwarded to Colonist's leaderboard data endpoint

### Tabs

```http
GET /leaderboard/tabs
GET /leaderboard/tabs?leaderboardUrl=Country/US
```

### Username Search

```http
GET /leaderboard/search?mode=Classic4P&q=trayel
```
