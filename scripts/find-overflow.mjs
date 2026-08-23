/**
 * Finds what makes a page scroll horizontally.
 *
 *   node scripts/find-overflow.mjs [url] [width]
 *
 * Loads the page in headless Chrome at a phone width and reports every element
 * whose box extends past the document's client width, innermost first, with the
 * offending edge and the computed properties that usually explain it.
 *
 * Guessing from source is unreliable here: a wide decorative element is only a bug
 * if no ancestor clips it, and that depends on the whole containing chain. This
 * asks the layout engine instead.
 *
 * Same CDP-over-WebSocket approach as `screenshot-routes.mjs` — Node 22 ships a
 * global WebSocket, so no Playwright and no install.
 */
import { spawn } from "node:child_process";

const URL_ARG = process.argv[2] ?? "http://127.0.0.1:3210/";
const WIDTH = Number(process.argv[3] ?? 390);
const HEIGHT = 844;
const PORT = 9344;

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", () => resolve());
      this.socket.addEventListener("error", reject);
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) =>
      this.pending.set(id, { resolve, reject })
    );
  }
}

/** Runs in the page. Returns a description of every horizontally overflowing box. */
const PROBE = `(() => {
  const doc = document.documentElement;
  const limit = doc.clientWidth;
  const out = [];

  for (const el of document.querySelectorAll("*")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const overRight = Math.round(rect.right - limit);
    const overLeft = Math.round(-rect.left);
    if (overRight <= 0 && overLeft <= 0) continue;

    const style = getComputedStyle(el);
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute("class") || "").slice(0, 150),
      overRight,
      overLeft,
      width: Math.round(rect.width),
      left: Math.round(rect.left),
      position: style.position,
      transform: style.transform === "none" ? "" : "yes",
      // Whether any ancestor would clip it. If one does, this element is a
      // red herring and the real culprit is elsewhere.
      clippedByAncestor: (() => {
        let p = el.parentElement;
        while (p) {
          const s = getComputedStyle(p);
          if (s.overflowX !== "visible") return true;
          p = p.parentElement;
        }
        return false;
      })(),
      depth: (() => { let d = 0, p = el.parentElement; while (p) { d++; p = p.parentElement; } return d; })(),
    });
  }

  return JSON.stringify({
    clientWidth: limit,
    scrollWidth: doc.scrollWidth,
    overflow: doc.scrollWidth - limit,
    // Deepest first: the innermost overflowing element is usually the cause, and
    // its ancestors merely inherit the symptom.
    elements: out.sort((a, b) => b.depth - a.depth).slice(0, 25),
  });
})()`;

const chrome = spawn(
  CHROME_CANDIDATES.find(Boolean),
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + process.env.TEMP + "/overflow-probe",
    `--window-size=${WIDTH},${HEIGHT}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

process.on("exit", () => chrome.kill());

let targets = null;
for (let i = 0; i < 40 && !targets; i++) {
  await sleep(250);
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const list = await res.json();
    targets = list.find((t) => t.type === "page");
  } catch {
    /* not up yet */
  }
}
if (!targets) {
  console.error("Could not reach Chrome's debugging port.");
  process.exit(1);
}

const cdp = new Cdp(targets.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 2,
  mobile: true,
});

await cdp.send("Page.navigate", { url: URL_ARG });
await sleep(4000);

const { result } = await cdp.send("Runtime.evaluate", {
  expression: PROBE,
  returnByValue: true,
});

const report = JSON.parse(result.value);

console.log(`\n  ${URL_ARG}  @ ${WIDTH}px`);
console.log(
  `  clientWidth ${report.clientWidth}  scrollWidth ${report.scrollWidth}  overflow ${report.overflow}px\n`
);

if (report.elements.length === 0) {
  console.log("  No horizontally overflowing elements.\n");
} else {
  for (const el of report.elements) {
    const edge =
      el.overRight > 0 ? `right +${el.overRight}px` : `left +${el.overLeft}px`;
    console.log(
      `  ${el.clippedByAncestor ? "clipped " : "LEAKS   "} ${edge.padEnd(16)} ` +
        `w=${String(el.width).padEnd(5)} pos=${el.position.padEnd(8)} <${el.tag}> ${el.cls}`
    );
  }
  console.log(
    "\n  'LEAKS' = no ancestor clips it, so it can grow the document.\n"
  );
}

chrome.kill();
process.exit(0);
