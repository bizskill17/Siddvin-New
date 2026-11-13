/* Sidvin inputs: the mouse wheel / touchpad scrolls the page and never changes a number field's value. */
(() => {
  document.addEventListener('wheel', (e) => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT' && el.type === 'number' && (e.target === el || el.contains(e.target))) el.blur();
  }, { capture: true, passive: true });
})();
