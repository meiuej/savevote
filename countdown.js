(() => {
  const timer = document.querySelector('.countdown__timer');
  if (!timer) return;

  const deadline = Date.parse(timer.dataset.deadline);
  if (!Number.isFinite(deadline)) return;

  const title = document.getElementById('countdown-title');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const units = [
    { name: 'days', seconds: 86400, forms: ['день', 'дня', 'дней'] },
    { name: 'hours', seconds: 3600, forms: ['час', 'часа', 'часов'] },
    { name: 'minutes', seconds: 60, forms: ['минута', 'минуты', 'минут'] },
    { name: 'seconds', seconds: 1, forms: ['секунда', 'секунды', 'секунд'] },
  ].map((unit) => ({
    ...unit,
    value: timer.querySelector(`[data-value="${unit.name}"]`),
    label: timer.querySelector(`[data-label="${unit.name}"]`),
  }));

  function setDigits(unit, digits) {
    if (unit.digits === digits) return;
    const previous = unit.digits;
    unit.clearAnimation?.();
    unit.digits = digits;
    unit.value.textContent = digits;

    if (previous === undefined || reducedMotion.matches || document.hidden || !unit.value.animate) return;

    const outgoing = document.createElement('span');
    outgoing.className = 'countdown__digit countdown__digit--outgoing';
    outgoing.textContent = previous;
    outgoing.setAttribute('aria-hidden', 'true');
    const incoming = document.createElement('span');
    incoming.className = 'countdown__digit';
    incoming.textContent = digits;
    unit.value.replaceChildren(incoming, outgoing);

    const options = { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' };
    const animations = [
      outgoing.animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(-85%)', opacity: 0 },
      ], options),
      incoming.animate([
        { transform: 'translateY(85%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ], options),
    ];
    const clear = () => {
      animations.forEach((animation) => animation.cancel());
      unit.value.textContent = digits;
      unit.clearAnimation = null;
    };
    unit.clearAnimation = clear;
    animations[1].onfinish = clear;
  }

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) units.forEach((unit) => unit.clearAnimation?.());
  });

  function update() {
    // Recalculate from the clock so background tabs never accumulate drift.
    let remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const finished = remaining === 0;
    units.forEach((unit) => {
      const value = Math.floor(remaining / unit.seconds);
      remaining %= unit.seconds;
      const lastTwo = value % 100;
      const last = value % 10;
      const form = lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
      const digits = String(value).padStart(2, '0');
      setDigits(unit, digits);
      if (unit.label.textContent !== unit.forms[form]) unit.label.textContent = unit.forms[form];
    });
    timer.hidden = false;
    if (finished) {
      title.textContent = 'Время голосовать';
      timer.setAttribute('aria-label', '20 сентября 2026 года, 08:00 по Москве — отсчёт завершён');
      return;
    }
    window.setTimeout(update, 1000);
  }

  update();
})();
