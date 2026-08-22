/**
 * Drives Chrome over the DevTools Protocol to screenshot every route at three
 * breakpoints and collect anything the console complains about.
 *
 *   node scripts/screenshot-routes.mjs [baseUrl] [outDir]
 *
 * No Playwright and no npm install: Node 22+ ships a global `WebSocket`, and CDP
 * is reachable over plain HTTP + WS, so the installed Chrome is enough.
 *
 * For each route/viewport it records: a full-page PNG, every console error and
 * warning, every uncaught exception, every failed network request, and whether the
 * document scrolls horizontally (`scrollWidth > clientWidth`) — which is the check
 * that catches a layout overflowing its viewport on a phone.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3210";
const OUT = process.argv[3] ?? "screenshots";
const PORT = 9333;

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 820, height: 1180, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
];

const ROUTES = [
  { path: "/", name: "landing", viewports: ["mobile", "desktop"] },
  { path: "/login", name: "login", viewports: ["mobile", "desktop"] },
  { path: "/register", name: "register", viewports: ["mobile", "desktop"] },
  { path: "/dashboard", name: "dashboard" },
  { path: "/invest", name: "invest" },
  { path: "/invest/vehicle-investment", name: "invest-plan" },
  { path: "/investments", name: "investments" },
  { path: "/wallet", name: "wallet" },
  { path: "/wallet/activity", name: "wallet-activity" },
  { path: "/profile", name: "profile" },
  { path: "/notifications", name: "notifications" },
  { path: "/risk-disclosure", name: "risk-disclosure", viewports: ["desktop"] },
  { path: "/does-not-exist", name: "not-found", viewports: ["desktop"] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(path) {
  const response = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return response.json();
}

/** Minimal CDP client over the page target's WebSocket. */
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();

    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", () => resolve());
      this.socket.addEventListener("error", (event) => reject(event));
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
        return;
      }

      const handler = this.handlers.get(message.method);
      if (handler) handler(message.params);
    });
  }

  on(method, handler) {
    this.handlers.set(method, handler);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

function launchChrome() {
  for (const path of CHROME_CANDIDATES) {
    try {
      const child = spawn(
        path,
        [
          "--headless=new",
          `--remote-debugging-port=${PORT}`,
          "--remote-allow-origins=*",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          "--hide-scrollbars",
          "--force-device-scale-factor=1",
          "--user-data-dir=" + join(process.cwd(), ".next", "chrome-profile"),
          "about:blank",
        ],
        { stdio: "ignore", detached: false }
      );
      child.on("error", () => {});
      return child;
    } catch {
      continue;
    }
  }
  throw new Error("No Chrome or Edge binary found.");
}

async function waitForDevtools(attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await fetchJson("/json/version");
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("Chrome DevTools endpoint never became reachable.");
}

const chrome = launchChrome();
await waitForDevtools();

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const targets = await fetchJson("/json/list");
const page = targets.find((target) => target.type === "page");
if (!page) throw new Error("No page target available.");

const cdp = new Cdp(page.webSocketDebuggerUrl);
await cdp.ready;

let problems = [];

cdp.on("Runtime.consoleAPICalled", ({ type, args }) => {
  if (type !== "error" && type !== "warning") return;
  const text = args
    .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "")
    .join(" ");
  problems.push({ kind: `console.${type}`, text: text.slice(0, 400) });
});

cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
  problems.push({
    kind: "exception",
    text: (
      exceptionDetails.exception?.description ??
      exceptionDetails.text ??
      "unknown"
    ).slice(0, 400),
  });
});

cdp.on("Log.entryAdded", ({ entry }) => {
  if (entry.level !== "error") return;
  problems.push({
    kind: `log.${entry.source}`,
    text: `${entry.text} ${entry.url ?? ""}`.slice(0, 400),
  });
});

await cdp.send("Runtime.enable");
await cdp.send("Log.enable");
await cdp.send("Page.enable");
await cdp.send("Network.enable");

const results = [];

for (const route of ROUTES) {
  const wanted = route.viewports ?? VIEWPORTS.map((v) => v.name);

  for (const viewport of VIEWPORTS) {
    if (!wanted.includes(viewport.name)) continue;

    problems = [];

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });

    const loaded = new Promise((resolve) => {
      const timer = setTimeout(resolve, 20000);
      cdp.on("Page.loadEventFired", () => {
        clearTimeout(timer);
        resolve();
      });
    });

    await cdp.send("Page.navigate", { url: `${BASE}${route.path}` });
    await loaded;
    // Let hydration, fonts and entrance animations settle.
    await sleep(2200);

    const metrics = await cdp.send("Runtime.evaluate", {
      expression: `JSON.stringify({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        title: document.title,
        hasBottomNav: Boolean(document.querySelector('nav[aria-label="Primary"]')),
        hasSidebar: Boolean(document.querySelector('aside nav, [class*="sidebar"]')),
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        bg: getComputedStyle(document.body).backgroundColor,
        fg: getComputedStyle(document.body).color
      })`,
      returnByValue: true,
    });

    const info = JSON.parse(metrics.result.value);

    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });

    const file = join(OUT, `${route.name}-${viewport.name}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));

    results.push({
      route: route.path,
      viewport: viewport.name,
      file,
      overflow: info.scrollWidth - info.clientWidth,
      ...info,
      problems: [...problems],
    });

    const overflow = info.scrollWidth - info.clientWidth;
    const flags = [
      overflow > 0 ? `H-SCROLL +${overflow}px` : null,
      info.hasSidebar ? "SIDEBAR?" : null,
      problems.length ? `${problems.length} console issue(s)` : null,
    ].filter(Boolean);

    console.log(
      `${overflow > 0 || problems.length ? "!" : "ok"}  ${route.path.padEnd(28)} ${viewport.name.padEnd(8)} ` +
        `nav=${info.hasBottomNav ? "yes" : "no "} theme=${info.theme} bg=${info.bg}` +
        (flags.length ? `  [${flags.join(", ")}]` : "")
    );

    for (const problem of problems) {
      console.log(`      ${problem.kind}: ${problem.text}`);
    }
  }
}

writeFileSync(join(OUT, "report.json"), JSON.stringify(results, null, 2));

const failed = results.filter(
  (result) => result.overflow > 0 || result.problems.length > 0
);

console.log(
  `\n${results.length} captures. ${failed.length} with an overflow or console issue.`
);

cdp.close();
chrome.kill();
process.exit(0);
