import { existsSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) {
  console.log(".env already exists; leaving it unchanged.");
} else {
  const password = randomBytes(24).toString("hex");
  writeFileSync(
    ".env",
    [
      `DATABASE_URL="postgresql://movie_memory:${password}@127.0.0.1:55432/movie_memory"`,
      'AUTH_URL="http://localhost:3000"',
      `AUTH_SECRET="${randomBytes(32).toString("base64")}"`,
      'AUTH_GOOGLE_ID=""',
      'AUTH_GOOGLE_SECRET=""',
      'OPENAI_API_KEY=""',
      'OPENAI_MODEL="gpt-4.1-mini"',
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  chmodSync(".env", 0o600);
  console.log(
    "Created private .env with local database credentials and an authentication secret.",
  );
  console.log("Add your Google OAuth credentials and OpenAI key to .env.");
}
