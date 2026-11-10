import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/movie_memory"
) {
  throw new Error(
    "db:local is only for the isolated local movie_memory database on 127.0.0.1:55432.",
  );
}
const dir = resolve(".local/postgres");
mkdirSync(".local", { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: 55432,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(resolve(dir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'movie_memory'",
);
await client.end();
if (!result.rowCount) await pg.createDatabase("movie_memory");
console.log(
  "Local Postgres ready on 127.0.0.1:55432. Data persists in .local/postgres.",
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60_000);
