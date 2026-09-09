(() => {
  const slot = document.querySelector('.voting-notice-slot');
  if (!slot) return;
  const key = 'vote-nearby-2026-dismissed';
  const deadline = Date.parse('2026-09-15T00:00:00+03:00');
  let dismissed = false;
  try { dismissed = sessionStorage.getItem(key) === '1'; } catch {}
  if (dismissed || Date.now() >= deadline) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function finishEntrance() {
    slot.classList.remove('voting-notice-slot--enter');
    slot.inert = false;
  }
  if (!reducedMotion.matches) {
    slot.inert = true;
    slot.classList.add('voting-notice-slot--enter');
    slot.addEventListener('animationend', (event) => {
      if (event.target === slot) finishEntrance();
    }, { once: true });
    // Also restore interactivity if motion is disabled during the entrance.
    window.setTimeout(finishEntrance, 950);
  }
  slot.hidden = false;

  function checkDeadline() {
    if (Date.now() >= deadline) slot.hidden = true;
  }
  window.addEventListener('pageshow', checkDeadline);
  document.addEventListener('visibilitychange', checkDeadline);
  // One deadline timeout, no polling or per-frame JavaScript.
  const remaining = deadline - Date.now();
  if (remaining > 0 && remaining <= 2147483647) window.setTimeout(checkDeadline, remaining);
  slot.querySelector('button').addEventListener('click', () => {
    slot.hidden = true;
    try { sessionStorage.setItem(key, '1'); } catch {}
  });
})();
