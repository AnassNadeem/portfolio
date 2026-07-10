/* Screenshot rig for design-review passes.
   Usage: node scripts/shoot.mjs [mobile]  → writes to .shots/            */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = ".shots";
mkdirSync(OUT, { recursive: true });

const mobile = process.argv.includes("mobile");
const tag = mobile ? "m" : "d";
const viewport = mobile ? { width: 390, height: 844 } : { width: 1512, height: 900 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
// let the preloader finish + car drive in
await page.waitForTimeout(9000);
await page.screenshot({ path: `${OUT}/${tag}1-hero.png` });

// scroll to garage in steps so ScrollTrigger scrubs run
const step = async (px, ms = 900) => {
  await page.mouse.wheel(0, px);
  await page.waitForTimeout(ms);
};

await step(900); // into about
await page.screenshot({ path: `${OUT}/${tag}2-about.png` });

// garage — the section pins for 280vh, walk through it
const garage = await page.$("#garage");
if (garage) {
  await page.evaluate(() => document.querySelector("#garage")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${tag}3-garage-closed.png` });
  await step(1200, 1200);
  await page.screenshot({ path: `${OUT}/${tag}4-garage-mid.png` });
  await step(1600, 1200);
  await page.screenshot({ path: `${OUT}/${tag}5-garage-exploded.png` });
}

// pit wall — center the stage in the viewport
await page.evaluate(() => {
  const el = document.querySelector(".pw-wall-stage");
  if (el) {
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - (window.innerHeight - r.height) / 2);
  }
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/${tag}6-pitwall.png` });

// drag the wall left
const stage = await page.$(".pw-wall-stage canvas");
if (stage) {
  const box = await stage.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 320, cy, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${tag}7-pitwall-dragged.png` });
}

// arcade → grid run
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.keyboard.press("g").catch(() => {});
// open via navbar button if the shortcut doesn't exist
const arcadeBtn = await page.$("text=ARCADE");
if (arcadeBtn) await arcadeBtn.click();
await page.waitForTimeout(900);
const gridTab = await page.$("text=GRID RUN");
if (gridTab) {
  await gridTab.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}8-gridrun-idle.png` });
  const start = await page.$("text=Lights Out — GO");
  if (start) {
    await start.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/${tag}9-gridrun-playing.png` });
  }
}

await browser.close();
console.log("done");
