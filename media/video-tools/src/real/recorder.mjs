// Records a real app session (Gemini, NotebookLM, Forms, Canva) from the
// dedicated Chrome profile started with --remote-debugging-port.
//
// Frames come from the CDP screencast (one JPEG per visual change, with its
// timestamp). `mark(name)` logs the moments the narration anchors to. Before
// anything is captured the page hides every personal element (account, avatar,
// chat history, recent files) with the app's privacy CSS, so nothing private
// reaches the frames on disk.
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CDP_URL = process.env.ILIA_CDP_URL ?? 'http://localhost:9333';
export const VIEWPORT = { width: 1024, height: 576 }; // CSS px; captured at 1.25x = 1280x720
const SCALE = 1.25;

function installCursor() {
  if (document.getElementById('ilia-cursor')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const c = document.createElement('div');
  c.id = 'ilia-cursor';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '26'); svg.setAttribute('height', '26');
  const arrow = document.createElementNS(NS, 'path');
  arrow.setAttribute('d', 'M4 2l15 11-6.5 1 3.8 7.2-2.6 1.3-3.8-7.2L5 20z');
  arrow.setAttribute('fill', '#1b1b17'); arrow.setAttribute('stroke', '#fff'); arrow.setAttribute('stroke-width', '1.6'); arrow.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(arrow);
  c.appendChild(svg);
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.3))' });
  const ring = document.createElement('div');
  Object.assign(ring.style, { position: 'absolute', left: '-11px', top: '-11px', width: '26px', height: '26px', borderRadius: '50%', border: '3px solid #1b70fe', opacity: '0' });
  c.appendChild(ring);
  document.documentElement.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
  addEventListener('mousedown', () => { ring.style.opacity = '.85'; }, true);
  addEventListener('mouseup', () => { setTimeout(() => { ring.style.opacity = '0'; }, 250); }, true);
}

// Hides any small banner whose text matches (account storage, emails...).
function hideByText({ banners, inline }) {
  const run = () => {
    const walker = document.createTreeWalker(document.body ?? document.documentElement, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent;
      if (inline.some((p) => text.includes(p))) {
        // An email or name: hide only the element that holds it.
        node.parentElement?.style.setProperty('visibility', 'hidden', 'important');
        continue;
      }
      if (!banners.some((p) => text.includes(p))) continue;
      // A notice about the account (storage...): hide the whole banner row.
      let el = node.parentElement;
      for (let up = el; up && up !== document.body; up = up.parentElement) {
        const r = up.getBoundingClientRect();
        if (r.width > 500 && r.height > 24 && r.height < 160) { el = up; break; }
      }
      el.style.setProperty('visibility', 'hidden', 'important');
    }
  };
  run();
  if (!window.__iliaHideTimer) window.__iliaHideTimer = setInterval(run, 300);
}

export const HIDE_TEXT = { banners: ['Se usó un', 'almacenamiento', 'límite de la capacidad', 'capacidad de uso'], inline: ['@gmail.com'] };

// Blurred patches over fixed screen spots that hold personal data (avatars).
function addMasks(rects) {
  if (document.getElementById('ilia-masks')) return;
  const box = document.createElement('div');
  box.id = 'ilia-masks';
  for (const r of rects) {
    const m = document.createElement('div');
    Object.assign(m.style, { position: 'fixed', left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: '50%', zIndex: '2147483646', pointerEvents: 'none', backdropFilter: 'blur(9px)', background: 'rgba(240,238,246,.85)' });
    box.appendChild(m);
  }
  document.documentElement.appendChild(box);
}

export async function startSession({ outDir, url, privacyCss, masks = [], viewport = VIEWPORT, scale = SCALE }) {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const framesDir = path.join(outDir, 'frames');
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const frames = [];
  const events = [];
  const opened = [];
  let t0 = null;
  let recording = false;
  let pausedAt = null;
  let pausedTotal = 0;
  const now = () => (t0 === null ? 0 : (pausedAt ?? Date.now() / 1000) - t0 - pausedTotal);
  let page;
  let cdp;

  // Points the camera at a tab: privacy CSS, cursor, 1.25x metrics, screencast.
  const attach = async (target, css) => {
    if (cdp) await cdp.send('Page.stopScreencast').catch(() => {});
    page = target;
    opened.push(target);
    const guards = async () => {
      await target.evaluate((rules) => {
        let style = document.getElementById('ilia-privacy');
        if (!style) {
          style = document.createElement('style');
          style.id = 'ilia-privacy';
          document.documentElement.appendChild(style);
        }
        style.textContent = rules;
      }, css).catch(() => {});
      await target.evaluate(installCursor).catch((error) => console.warn('cursor:', error.message));
      await target.evaluate(hideByText, HIDE_TEXT).catch(() => {});
      if (masks.length) await target.evaluate(addMasks, masks).catch(() => {});
    };
    target.on('load', guards);
    target.on('framenavigated', (frame) => { if (frame === target.mainFrame()) guards(); });
    cdp = await context.newCDPSession(target);
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: scale, mobile: false });
    await target.bringToFront();
    cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      if (!recording || page !== target) return;
      const file = `f${String(frames.length).padStart(5, '0')}.jpg`;
      frames.push({ t: now(), file });
      await writeFile(path.join(framesDir, file), Buffer.from(data, 'base64'));
    });
    await guards();
    return { guards, cdp };
  };
  const startCast = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });

  const first = await attach(await context.newPage(), privacyCss);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await first.guards();
  await page.waitForTimeout(2500);
  await first.guards();

  let mouse = { x: viewport.width - 200, y: viewport.height - 120 };

  const session = {
    get page() { return page; },
    context,
    async begin() {
      await page.mouse.move(mouse.x, mouse.y);
      t0 = Date.now() / 1000;
      recording = true;
      await startCast();
      await page.waitForTimeout(600);
    },
    // Stop the clock (tab switches, loading screens) until follow() resumes it.
    hold() { recording = false; pausedAt = Date.now() / 1000; },
    async resume() {
      if (pausedAt === null) return;
      pausedTotal += Date.now() / 1000 - pausedAt;
      pausedAt = null;
      recording = true;
      // After a long wait Chrome may stop sending frames: restart the cast.
      await cdp.send('Page.stopScreencast').catch(() => {});
      await page.bringToFront();
      await startCast();
      await page.waitForTimeout(500);
    },
    // Keep recording in a tab the app just opened (e.g. Exportar a Documentos).
    async follow(target, css, { settleMs = 4000 } = {}) {
      if (pausedAt === null) this.hold();
      const { guards } = await attach(target, css);
      await target.waitForLoadState('domcontentloaded').catch(() => {});
      await guards();
      await target.waitForTimeout(settleMs);
      await guards();
      await target.mouse.move(mouse.x, mouse.y);
      pausedTotal += Date.now() / 1000 - pausedAt;
      pausedAt = null;
      recording = true;
      await startCast();
      await target.waitForTimeout(400);
    },
    mark(name) { events.push({ name, t: now() }); console.log(`· ${name} @ ${now().toFixed(1)}s`); },
    async moveTo(target) {
      const loc = page.locator(target).filter({ visible: true }).first();
      await loc.waitFor({ state: 'visible', timeout: 20000 });
      const box = await loc.boundingBox();
      if (!box) throw new Error(`Not visible: ${target}`);
      const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.mouse.move(to.x, to.y, { steps: 28 });
      mouse = to;
      await page.waitForTimeout(250);
    },
    async click(target, mark) {
      await this.moveTo(target);
      if (mark) this.mark(mark);
      await page.mouse.down();
      await page.waitForTimeout(90);
      await page.mouse.up();
      await page.waitForTimeout(500);
    },
    async clickAt(x, y, mark) {
      await page.mouse.move(x, y, { steps: 28 });
      mouse = { x, y };
      await page.waitForTimeout(250);
      if (mark) this.mark(mark);
      await page.mouse.down();
      await page.waitForTimeout(90);
      await page.mouse.up();
      await page.waitForTimeout(500);
    },
    // Clicks the on-screen leaf element whose text matches `pattern` (after
    // centring it), for apps whose labels are spans inside hidden duplicates.
    async clickText(pattern, mark, { nth = 0 } = {}) {
      const c = await page.evaluate(({ src, n }) => {
        const rx = new RegExp(src);
        const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && e.closest('[aria-hidden=true]') === null; };
        let found = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && rx.test(e.textContent.trim()) && shown(e));
        if (!found.length) {
          // Fallback: deepest element whose own text matches, ignoring aria-hidden wrappers.
          found = [...document.querySelectorAll('body *')].filter((e) => rx.test(e.textContent.trim()) && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 80 && ![...e.children].some((c) => rx.test(c.textContent.trim())));
        }
        const el = n < 0 ? found.at(n) : found[n];
        if (!el) return null;
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect();
        return { x: r.x + Math.min(r.width / 2, 120), y: r.y + r.height / 2 };
      }, { src: pattern, n: nth });
      if (!c) throw new Error(`No on-screen text: ${pattern}`);
      await page.waitForTimeout(300);
      await this.clickAt(c.x, c.y, mark);
    },
    async scrollBy(selector, total, { steps = 16, gap = 180 } = {}) {
      for (let i = 0; i < steps; i += 1) {
        await page.evaluate(({ sel, dy }) => {
          // The visible scroll container: the requested one if it scrolls, else the tallest scrollable element.
          const scrollable = (el) => el && el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY);
          let el = document.querySelector(sel);
          if (!scrollable(el)) {
            el = [...document.querySelectorAll('*')].filter(scrollable).sort((a, b) => b.clientHeight - a.clientHeight)[0];
          }
          el?.scrollBy(0, dy);
        }, { sel: selector, dy: total / steps });
        await page.waitForTimeout(gap);
      }
    },
    // Smoothly scrolls until the first element matching `pattern` (inside the
    // reply `which`) sits near the top of the screen.
    async scrollToText(pattern, { which = 'last', offset = 90, steps = 20, gap = 160 } = {}) {
      const distance = await page.evaluate(({ src, w, off }) => {
        const re = new RegExp(src);
        const replies = [...document.querySelectorAll('model-response')];
        const root = (w === 'first' ? replies[0] : replies.at(-1)) ?? document.body;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (re.test(n.textContent)) return n.parentElement.getBoundingClientRect().top - off;
        }
        return null;
      }, { src: pattern, w: which, off: offset });
      if (distance === null) throw new Error(`Text not found: ${pattern}`);
      await this.scrollBy('infinite-scroller', distance, { steps, gap });
    },
    async upload(target, file, mark) {
      const chooser = page.waitForEvent('filechooser', { timeout: 20000 });
      await this.click(target, mark);
      await (await chooser).setFiles(file);
    },
    async paste(text) { await page.keyboard.insertText(text); await page.waitForTimeout(400); },
    async type(text, { delay = 28 } = {}) { await page.keyboard.type(text, { delay }); },
    async press(keys) { await page.keyboard.press(keys); await page.waitForTimeout(250); },
    async pause(ms) { await page.waitForTimeout(ms); },
    async end({ keepOpen = false } = {}) {
      await page.waitForTimeout(800);
      recording = false;
      await cdp.send('Page.stopScreencast').catch(() => {});
      frames.push({ t: now(), file: frames.at(-1)?.file });
      await writeFile(path.join(outDir, 'recording.json'), JSON.stringify({ frames, events }, null, 1));
      console.log(`${frames.length} frames, ${now().toFixed(1)} s → ${outDir}`);
      if (!keepOpen) for (const tab of opened) await tab.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
  return session;
}

export const PRIVACY = {
  // Account chip, avatar, chat history and the "search chats" entry.
  gemini: `
    a[aria-label^="Cuenta de Google"], a[aria-label^="Google Account"], img[src*="googleusercontent.com/a/"],
    conversations-list, [data-test-id="chats-expandable-section"], [data-test-id="all-conversations"],
    [data-test-id="conversation"], .conversations-container, side-nav-recent-conversations { visibility: hidden !important; }
  `,
  // Account chip and the teacher's own notebooks on the home page.
  notebook: `
    a[aria-label^="Cuenta de Google"], a[aria-label^="Google Account"], img[src*="googleusercontent.com/a"],
    .my-projects-container project-button, .my-projects-container mat-card, .my-projects-container table,
    .my-projects-container [role="row"] { visibility: hidden !important; }
  `,
  // Account chip and the teacher's own forms on the Forms home page.
  forms: `
    a[aria-label^="Cuenta de Google"], a[aria-label^="Google Account"], img[src*="googleusercontent.com/a"],
    .docs-homescreen-grid-item, .docs-homescreen-list-item, .docs-homescreen-list-header,
    .docs-homescreen-grid, .docs-homescreen-list { visibility: hidden !important; }
  `,
  // Canva: account avatar/initial and the menu that shows the name.
  canva: `
    button[aria-label^="Más opciones para la cuenta"], button[aria-label^="More account"],
    [aria-label^="Más opciones para la cuenta"] *, img[src*="avatar"], [data-testid*="avatar" i] { visibility: hidden !important; }
  `,
  // Account chip and avatar, plus anything labelled with an email address.
  docs: `
    a[aria-label^="Cuenta de Google"], a[aria-label^="Google Account"], img[src*="googleusercontent.com/a"],
    [aria-label*="@gmail.com"], [aria-label*="@"][role="button"] img, .docs-presence-plus-widget,
    #docs-titlebar-share-client-button + div, .gb_A, .gb_B { visibility: hidden !important; }
  `,
};
