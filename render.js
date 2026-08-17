// render.js — HTML → paginated PDF with Puppeteer + Paged.js
import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, "report.html");
const OUTPUT = path.join(__dirname, "report.pdf");

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--font-render-hinting=none"],
});

try {
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("  [page]", msg.text()));
  page.on("pageerror", (err) => console.error("  [page error]", err.message));

  const t0 = Date.now();

  // 1. Load the document. `networkidle0` matters: fonts, scripts and any
  //    images must be in before we let Paged.js measure anything.
  await page.goto("file://" + INPUT, { waitUntil: "networkidle0" });

  // 2. Run any pre-pagination work the document defines (here: render the
  //    chart and freeze it to an <img> so pagination can't blank it).
  await page.evaluate(async () => {
    if (window.__prepareDocument) await window.__prepareDocument();
  });

  // 3. Inject the Paged.js polyfill. With PagedConfig.auto = false it loads
  //    without running, so we control exactly when pagination starts.
  await page.addScriptTag({
    path: path.join(__dirname, "node_modules/pagedjs/dist/paged.polyfill.js"),
  });

  // 3b. Register custom handlers (e.g. repeating table headers) before
  //     pagination starts.
  await page.addScriptTag({ path: path.join(__dirname, "handlers.js") });

  // 4. Paginate, and wait for the promise Paged.js returns. The flow object
  //    tells us how many pages it produced — useful for sanity checks.
  const total = await page.evaluate(async () => {
    const flow = await window.PagedPolyfill.preview();
    return flow.total;
  });
  console.log(`Paginated: ${total} pages in ${Date.now() - t0}ms`);

  // 5. Print. preferCSSPageSize hands control of the page size to our
  //    @page rule; printBackground keeps the cover and table shading.
  await page.pdf({
    path: OUTPUT,
    preferCSSPageSize: true,
    printBackground: true,
  });
  console.log(`Wrote ${OUTPUT} in ${Date.now() - t0}ms total`);
} finally {
  await browser.close();
}
