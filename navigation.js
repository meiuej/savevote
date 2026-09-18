(() => {
  const header = document.querySelector('.site-nav');
  const hero = document.querySelector('.hero');
  const toggle = header.querySelector('.site-nav__toggle');
  const links = header.querySelector('.site-nav__links');
  const mobile = window.matchMedia('(max-width: 1100px)');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    links.hidden = mobile.matches && !open;
  }

  setOpen(false);
  mobile.addEventListener('change', () => setOpen(false));
  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  header.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    setOpen(false);
    const href = link.getAttribute('href');
    if (!href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  const observer = new IntersectionObserver(([entry]) => {
    const visible = entry.boundingClientRect.bottom <= 0;
    header.hidden = !visible;
    if (!visible) setOpen(false);
  }, { threshold: 0 });
  observer.observe(hero);
})();
