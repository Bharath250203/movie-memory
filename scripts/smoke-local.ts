import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateAndSaveFact } from "../src/lib/fact-service";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(
  url.hostname,
  "127.0.0.1",
  "Smoke tests only run against the isolated local DB.",
);
assert.equal(url.port, "55432");
assert.equal(url.pathname, "/movie_memory");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString() }),
});
const origin = "http://localhost:3000";
const prefix = `smoke-${randomUUID()}`;
const ids: string[] = [];
const token = randomUUID();
let count = 0;
function pass(label: string) {
  count++;
  console.log(`PASS ${label}`);
}
async function request(path: string, signedIn = true, init: RequestInit = {}) {
  return fetch(origin + path, {
    ...init,
    redirect: "manual",
    headers: {
      ...(signedIn ? { Cookie: `authjs.session-token=${token}` } : {}),
      ...init.headers,
    },
  });
}
function decode(s: string) {
  return s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
function formFrom(html: string, contains: string) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .map((m) => m[0])
    .find((s) => s.includes(contains));
  assert.ok(form, `Missing form: ${contains}`);
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]*)"/)?.[1];
    const value = match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? "";
    if (name) data.append(decode(name), decode(value));
  }
  return data;
}
try {
  const landing = await request("/", false);
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /Sign in with Google/);
  pass("public landing page");
  const protectedPage = await request("/dashboard", false);
  const protectedHtml = await protectedPage.text();
  assert.ok(
    protectedPage.headers.get("location") === "/" ||
      protectedHtml.includes("NEXT_REDIRECT;replace;/;307;"),
  );
  pass("logged-out dashboard redirects to login");
  const owner = await db.user.create({
    data: { email: `${prefix}-a@example.invalid` },
  });
  ids.push(owner.id);
  const other = await db.user.create({
    data: {
      email: `${prefix}-b@example.invalid`,
      favoriteMovie: "Other user's private movie",
    },
  });
  ids.push(other.id);
  await db.session.create({
    data: {
      sessionToken: token,
      userId: owner.id,
      expires: new Date(Date.now() + 300_000),
    },
  });
  const incomplete = await request("/dashboard");
  const incompleteHtml = await incomplete.text();
  assert.ok(
    incomplete.headers.get("location") === "/onboarding" ||
      incompleteHtml.includes("NEXT_REDIRECT;replace;/onboarding;307;"),
  );
  pass("unfinished onboarding redirects correctly");
  const setup = await request("/onboarding");
  const setupHtml = await setup.text();
  assert.match(setupHtml, /Welcome, <!-- -->movie lover/);
  pass("missing Google name uses fallback");
  const invalid = formFrom(setupHtml, 'name="movie"');
  invalid.set("movie", "   ");
  const invalidResponse = await request("/onboarding", true, {
    method: "POST",
    body: invalid,
    headers: { Origin: origin },
  });
  assert.match(await invalidResponse.text(), /Enter a movie title/);
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: owner.id } }))
      .favoriteMovie,
    null,
  );
  pass("server rejects whitespace without writing");
  const valid = formFrom(setupHtml, 'name="movie"');
  valid.set("movie", "  Arrival (2016)  ");
  valid.set("userId", other.id);
  const save = await request("/onboarding", true, {
    method: "POST",
    body: valid,
    headers: { Origin: origin },
  });
  await save.text();
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: owner.id } }))
      .favoriteMovie,
    "Arrival (2016)",
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: other.id } }))
      .favoriteMovie,
    "Other user's private movie",
  );
  pass("movie trimmed and saved only for session owner despite forged userId");
  valid.set("movie", "Overwrite attempt");
  const duplicate = await request("/onboarding", true, {
    method: "POST",
    body: valid,
    headers: { Origin: origin },
  });
  await duplicate.text();
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: owner.id } }))
      .favoriteMovie,
    "Arrival (2016)",
  );
  pass("onboarding cannot overwrite an existing movie");
  const fact = await generateAndSaveFact(
    { id: owner.id, favoriteMovie: "Arrival (2016)" },
    {
      latest: (key) =>
        db.fact.findFirst({
          where: key,
          orderBy: { createdAt: "desc" },
          select: { text: true, movie: true, createdAt: true },
        }),
      generate: async () =>
        "Deterministic test fact; provider substituted for this test.",
      save: (data) =>
        db.fact.create({
          data: { ...data, generationVersion: 1 },
          select: { text: true, movie: true, createdAt: true },
        }),
    },
  );
  assert.equal(fact.ok, true);
  assert.equal(await db.fact.count({ where: { userId: owner.id } }), 1);
  assert.equal(await db.fact.count({ where: { userId: other.id } }), 0);
  pass(
    "fact service persists user + movie association in real Postgres (provider substituted)",
  );
  const dashboard = await request("/dashboard");
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, /Arrival \(2016\)/);
  assert.ok(dashboardHtml.includes(owner.email));
  assert.ok(!dashboardHtml.includes(other.email));
  assert.ok(!dashboardHtml.includes("Other user's private movie"));
  pass("dashboard shows only the signed-in user's profile and movie");
  assert.match(dashboardHtml, /Deterministic test fact/);
  assert.equal(await db.fact.count({ where: { userId: owner.id } }), 1);
  pass("dashboard reuses fresh persisted fact without a duplicate write");
  await db.fact.create({
    data: {
      userId: other.id,
      movie: "Arrival (2016)",
      text: "PRIVATE_OTHER_USER_FACT",
    },
  });
  const burst = await Promise.all(
    Array.from({ length: 5 }, () =>
      request("/dashboard?userId=" + other.id).then((r) => r.text()),
    ),
  );
  for (const html of burst) {
    assert.ok(html.includes("Deterministic test fact"));
    assert.ok(!html.includes("PRIVATE_OTHER_USER_FACT"));
  }
  assert.equal(await db.fact.count({ where: { userId: owner.id } }), 1);
  pass(
    "concurrent HTTP requests and forged userId cannot access another user's cached fact",
  );
  const legacy = await db.fact.create({
    data: {
      userId: owner.id,
      movie: "Arrival (2016)",
      text: "UNSOURCED_LEGACY_FACT",
    },
  });
  const upgraded = await request("/dashboard").then((r) => r.text());
  assert.ok(upgraded.includes("Deterministic test fact"));
  assert.ok(!upgraded.includes("UNSOURCED_LEGACY_FACT"));
  await db.fact.delete({ where: { id: legacy.id } });
  pass("newer legacy unsourced facts are excluded from the upgraded cache");
  // Real Postgres cache expiry, cold concurrent generation, and stale fallback.
  await db.fact.updateMany({
    where: { userId: owner.id },
    data: { createdAt: new Date(Date.now() - 61_000) },
  });
  let providerCalls = 0;
  const testDeps = {
    latest: (key: { userId: string; movie: string }) =>
      db.fact.findFirst({
        where: key,
        orderBy: { createdAt: "desc" as const },
        select: { text: true, movie: true, createdAt: true },
      }),
    generate: async () => {
      providerCalls++;
      return "Refreshed deterministic fact";
    },
    save: (data: { userId: string; movie: string; text: string }) =>
      db.fact.create({
        data: { ...data, generationVersion: 1 },
        select: { text: true, movie: true, createdAt: true },
      }),
  };
  const testUser = { id: owner.id, favoriteMovie: "Arrival (2016)" };
  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () => generateAndSaveFact(testUser, testDeps)),
  );
  assert.equal(providerCalls, 1);
  assert.equal(await db.fact.count({ where: { userId: owner.id } }), 2);
  assert.ok(
    concurrent.every((result) => result.ok && result.source === "generated"),
  );
  pass(
    "expired Postgres cache plus ten concurrent requests generates and saves once",
  );
  await db.fact.updateMany({
    where: { userId: owner.id },
    data: { createdAt: new Date(Date.now() - 61_000) },
  });
  const fallback = await generateAndSaveFact(testUser, {
    ...testDeps,
    generate: async () => {
      throw new Error("Simulated provider timeout");
    },
  });
  assert.ok(fallback.ok && fallback.source === "stale");
  assert.equal(await db.fact.count({ where: { userId: owner.id } }), 2);
  pass("provider timeout returns saved fact without a new database write");
  const previous = await testDeps.latest({
    userId: owner.id,
    movie: testUser.favoriteMovie,
  });
  assert.ok(previous);
  const unchanged = await generateAndSaveFact(testUser, {
    ...testDeps,
    generate: async (_movie, previousText) => {
      assert.equal(previousText, previous.text);
      return previousText!;
    },
  });
  assert.ok(unchanged.ok && unchanged.source === "unchanged");
  assert.equal(await db.fact.count({ where: { userId: owner.id } }), 2);
  if (unchanged.ok)
    assert.equal(
      unchanged.fact.createdAt.getTime(),
      previous.createdAt.getTime(),
    );
  pass("duplicate generation keeps the prior timestamp and inserts no new row");
  const returning = await request("/");
  const returningHtml = await returning.text();
  assert.ok(
    returning.headers.get("location") === "/dashboard" ||
      returningHtml.includes("NEXT_REDIRECT;replace;/dashboard;307;"),
  );
  pass("returning user goes to dashboard");
  const csrf = formFrom(setupHtml, 'name="movie"');
  csrf.set("movie", "Forged request");
  const rejected = await request("/onboarding", true, {
    method: "POST",
    body: csrf,
    headers: { Origin: "https://untrusted.example" },
  });
  assert.ok(rejected.status >= 400);
  pass("cross-origin Server Action rejected");
  const signoutForm = formFrom(dashboardHtml, "Logout");
  const signout = await request("/dashboard", true, {
    method: "POST",
    body: signoutForm,
    headers: { Origin: origin },
  });
  await signout.text();
  assert.equal(
    await db.session.findUnique({ where: { sessionToken: token } }),
    null,
  );
  pass("logout revokes the database session");
  console.log(
    `${count} integration checks passed. Temporary test records will be removed.`,
  );
} finally {
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
