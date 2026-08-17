// handlers.js — Paged.js hooks. Injected after the polyfill, before preview().
//
// Chromium's native print repeats <thead> when a table breaks across pages.
// Paged.js replaces Chromium's fragmentation with its own, and loses that
// behaviour — a table that splits shows up headerless on continuation pages.
// This handler is the community-standard workaround: after each page is laid
// out, find any table fragment that was split from a previous page and clone
// the original table's <thead> onto it.

class RepeatingTableHeaders extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
  }

  afterPageLayout(pageElement, page, breakToken, chunker) {
    const tables = pageElement.querySelectorAll("table[data-split-from]");
    tables.forEach((table) => {
      const ref = table.getAttribute("data-ref");
      const sourceTable = chunker.source.querySelector(`[data-ref='${ref}']`);
      const header = sourceTable && sourceTable.querySelector("thead");
      if (header) {
        table.insertBefore(header.cloneNode(true), table.firstChild);
      }
    });
  }
}

Paged.registerHandlers(RepeatingTableHeaders);
