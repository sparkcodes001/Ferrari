// Always start at the top (the hero) after a reload.
// Imported FIRST in main.jsx so it runs before anything reads the scroll position.
if (typeof window !== "undefined") {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  // a leftover #hash would make the browser jump to a section on reload
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);

  // park the page at the top just before it unloads, so even browsers that
  // ignore scrollRestoration have nothing to restore
  const top = () => window.scrollTo(0, 0);
  window.addEventListener("beforeunload", top);
  window.addEventListener("pagehide", top);
}
