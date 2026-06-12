#!/usr/bin/env node
/* build.js — encrypt payload.js into index.html and print the share link.
 *
 *   node build.js
 *
 * Re-run whenever you edit payload.js. Uses a STABLE key stored in reveal.key,
 * so the share link stays the same across builds — only the ciphertext in
 * index.html changes. (Each build uses a fresh random IV, which AES-GCM requires.)
 *
 * Zero dependencies — just Node 16+ (uses the built-in Web Crypto API).
 *
 * Files it touches:
 *   reveal.key      raw AES key, base64url   (CREATED ONCE — keep private, gitignore it)
 *   index.html      patched in place (the CIPHERTEXT constant)
 *   share-link.txt  the full link to paste in the chat (also printed below)
 */

const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");
const { subtle } = webcrypto;

const DIR      = __dirname;
const KEY_FILE = path.join(DIR, "reveal.key");
const INDEX    = path.join(DIR, "index.html");
const PAYLOAD  = path.join(DIR, "payload.js");
const LINKFILE = path.join(DIR, "share-link.txt");

const b64url     = b => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = s => { let t = s.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return Buffer.from(t, "base64"); };

(async () => {
  // 1. Load the stable key, or create one on first run.
  let rawKey;
  if (fs.existsSync(KEY_FILE)) {
    rawKey = fromB64url(fs.readFileSync(KEY_FILE, "utf8").trim());
  } else {
    rawKey = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32)));
    fs.writeFileSync(KEY_FILE, b64url(rawKey));
    console.log("• Generated a new key -> reveal.key  (keep this private!)");
  }
  const key = await subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);

  // 2. Encrypt payload.js (fresh IV each build — never reuse an IV with GCM).
  delete require.cache[require.resolve(PAYLOAD)];
  const payload = require(PAYLOAD);

  // Inline the reveal photo (a spoiler) into the payload so it gets encrypted too.
  if (payload.revealImage) {
    const imgPath = path.join(DIR, payload.revealImage);
    if (!fs.existsSync(imgPath)) {
      console.error(`✗ revealImage not found: ${payload.revealImage}`);
      process.exit(1);
    }
    const mime = /\.png$/i.test(payload.revealImage) ? "image/png" : "image/jpeg";
    payload.revealImageData = `data:${mime};base64,` + fs.readFileSync(imgPath).toString("base64");
    delete payload.revealImage;   // keep only the data inside the ciphertext
  }

  const json = JSON.stringify(payload);
  const iv  = webcrypto.getRandomValues(new Uint8Array(12));
  const ct  = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(json));
  const ctB64 = Buffer.concat([Buffer.from(iv), Buffer.from(ct)]).toString("base64");

  // 3. Patch the CIPHERTEXT constant in index.html.
  let html = fs.readFileSync(INDEX, "utf8");
  const re = /const CIPHERTEXT = "[^"]*";/;
  if (!re.test(html)) {
    console.error("✗ Couldn't find the CIPHERTEXT line in index.html — did the file change?");
    process.exit(1);
  }
  html = html.replace(re, `const CIPHERTEXT = "${ctB64}";`);
  fs.writeFileSync(INDEX, html);

  // 4. Emit the share link.
  const frag = b64url(rawKey);
  const link = `https://USERNAME.github.io/REPO/#k=${frag}`;
  fs.writeFileSync(LINKFILE, link + "\n");

  console.log("\n✓ index.html updated.");
  const imgKB = payload.revealImageData ? Math.round(payload.revealImageData.length * 0.75 / 1024) : 0;
  console.log(`  word: "${payload.word}"   confetti: ${payload.confetti.length} colors   photo: ${imgKB ? imgKB + " KB (encrypted)" : "none"}\n`);
  console.log("Share link (swap in your real GitHub Pages URL, keep everything from #k=):");
  console.log("  " + link);
  console.log("  (also saved to share-link.txt)\n");
  console.log("Local test: open index.html in a browser and append  #k=" + frag);
})();
