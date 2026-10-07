(() => {
  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const EMAIL = 'ojogbedestephen@gmail.com';

  /* ----------------------------------------------------------------
     Status bar clock and current section
  ----------------------------------------------------------------- */
  const clock = $('#clock');
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 15000);

  const navLinks = $$('.status a[data-key]');
  const setCurrent = (key) => navLinks.forEach((a) => {
    if (a.dataset.key === key) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) setCurrent(entry.target.dataset.nav); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-nav]').forEach((s) => sectionObserver.observe(s));
  setCurrent('home');

  /* ----------------------------------------------------------------
     Greeting: "Hey, " stays put while the rest is typed, held, backspaced
     to the shared prefix and swapped for the next line, forever. The first
     visit of a session types the first line from scratch, then reveals
     the rest of the hero.
  ----------------------------------------------------------------- */
  const nameEl = $('.name');
  const typed = $('.name__typed', nameEl);
  const LINES = [typed.textContent, "Hey, let's build", "Hey, let's talk"]; // 16 characters at most, so the line never wraps
  const heroSteps = $$('.hero [data-seq]');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let heroOnScreen = true;
  new IntersectionObserver((entries) => { heroOnScreen = entries.at(-1).isIntersecting; }).observe(nameEl);

  // like sleep, but holds while the greeting is scrolled away or the tab is hidden
  async function hold(ms) {
    await sleep(ms);
    while (!heroOnScreen || document.hidden) await sleep(300);
  }

  async function typeTo(text) {
    while (typed.textContent !== text) {
      typed.textContent = text.slice(0, typed.textContent.length + 1);
      await hold(typed.textContent.endsWith(',') ? 280 : 70 + Math.random() * 60);
    }
  }

  async function eraseTo(length) {
    while (typed.textContent.length > length) {
      typed.textContent = typed.textContent.slice(0, -1);
      await hold(45);
    }
  }

  const sharedPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };

  let booted = !root.classList.contains('booting');
  const SKIP = ['keydown', 'pointerdown', 'wheel'];

  function finishBoot() {
    if (booted) return;
    booted = true;
    typed.textContent = LINES[0];
    heroSteps.forEach((s) => s.classList.add('is-on'));
    root.classList.remove('booting');
    SKIP.forEach((type) => removeEventListener(type, finishBoot));
  }

  async function boot() {
    try { sessionStorage.setItem('booted', '1'); } catch {}
    SKIP.forEach((type) => addEventListener(type, finishBoot, { once: true, passive: true }));
    typed.textContent = '';
    nameEl.classList.add('is-on', 'is-typing');
    await hold(500);
    await typeTo(LINES[0]);
    nameEl.classList.remove('is-typing');
    await hold(450);
    for (const step of heroSteps.slice(1)) {
      if (booted) break;
      step.classList.add('is-on');
      await sleep(110);
    }
    finishBoot();
  }

  async function greet() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!booted) await boot();
    for (let i = 0; ; i = (i + 1) % LINES.length) {
      await hold(i === 0 ? 3200 : 2200);
      const next = LINES[(i + 1) % LINES.length];
      nameEl.classList.add('is-typing');
      await eraseTo(sharedPrefix(typed.textContent, next));
      await hold(260);
      await typeTo(next);
      nameEl.classList.remove('is-typing');
    }
  }

  greet();

  /* ----------------------------------------------------------------
     Work browser (tabs with arrow-key navigation)
  ----------------------------------------------------------------- */
  const tabs = $$('.browser [role="tab"]');

  function selectTab(tab, focus = false) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-active', on);
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const moves = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      let next = null;
      if (e.key in moves) next = tabs[(i + moves[e.key] + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  /* ----------------------------------------------------------------
     Portrait: a 1-bit dithered image drawn with half blocks, two pixels
     per character. Uses a photo if one is given, otherwise a lit bust.
  ----------------------------------------------------------------- */
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const HALF = [' ', '▀', '▄', '█']; // index = top pixel + bottom pixel * 2
  const ASPECT = 0.6 / 1.3; // Geist Mono cell width relative to its line height

  // grid of brightness 0..1 (null = background) to text, ordered-dithered to one bit
  function toHalfBlocks(grid, cols, rows) {
    const on = (x, y) => {
      const v = grid[y * cols + x];
      if (v === null) return 0;
      const t = (BAYER[y % 4][x % 4] + 0.5) / 16;
      return v > t ? 1 : 0;
    };
    let text = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) text += HALF[on(c, r * 2) + on(c, r * 2 + 1) * 2];
      if (r < rows - 1) text += '\n';
    }
    return text;
  }

  function placeholderBust(cols, rows) {
    const height = rows * 2;
    const span = (cols * ASPECT) / rows; // x range so the head stays round
    const light = [-0.5, -0.6, 0.62];
    const lit = (nx, ny) => {
      const d = nx * nx + ny * ny;
      if (d > 1) return null;
      const nz = Math.sqrt(1 - d);
      return 0.1 + 0.9 * Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
    };
    const grid = [];
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < cols; px++) {
        const x = ((px + 0.5) / cols * 2 - 1) * span;
        const y = (py + 0.5) / height * 2 - 1;
        let v = null;
        const shoulders = lit(x / 0.72, (y - 0.92) / 0.55);
        const neck = Math.abs(x) < 0.14 && y > -0.08 && y < 0.45 ? 0.1 + 0.3 * Math.sqrt(1 - (x / 0.14) ** 2) : null;
        const hx = x / 0.31, hy = (y + 0.4) / 0.42;
        const head = lit(hx, hy);
        if (shoulders !== null) v = shoulders * 0.85;
        if (neck !== null) v = Math.max(v ?? 0, neck);
        if (head !== null) {
          v = head;
          if (hy < -0.2 - 0.5 * hx * hx) v = 0.06 + head * 0.3; // hair
        }
        grid.push(v);
      }
    }
    return toHalfBlocks(grid, cols, rows);
  }

  function photoToHalfBlocks(img, cols, rows) {
    const height = rows * 2;
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const target = (cols * ASPECT) / rows;
    let sw = img.naturalWidth, sh = img.naturalHeight;
    if (sw / sh > target) sw = sh * target; else sh = sw / target;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, height);
    const { data } = ctx.getImageData(0, 0, cols, height);
    const lum = [];
    for (let i = 0; i < data.length; i += 4) lum.push((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255);
    const lo = Math.min(...lum), hi = Math.max(...lum);
    return toHalfBlocks(lum.map((v) => (v - lo) / (hi - lo || 1)), cols, rows);
  }

  const portrait = $('#portrait');
  let portraitImg = null;

  function renderPortrait() {
    if (!portrait) return;
    const maxCols = Number(portrait.dataset.cols) || 56;
    const maxRows = Number(portrait.dataset.rows) || 32;
    // shrink the grid on narrow screens instead of the glyphs, which must stay whole-pixel
    const style = getComputedStyle(portrait);
    const room = portrait.parentElement.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
    const cols = Math.max(24, Math.min(maxCols, Math.floor(room / (parseFloat(style.fontSize) * 0.6))));
    const rowsCount = Math.round(maxRows * (cols / maxCols));
    portrait.textContent = portraitImg ? photoToHalfBlocks(portraitImg, cols, rowsCount) : placeholderBust(cols, rowsCount);
  }

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPortrait, 150);
  });

  if (portrait?.dataset.src) {
    const img = new Image();
    img.onload = () => { portraitImg = img; renderPortrait(); };
    img.src = portrait.dataset.src;
  }

  renderPortrait();

  /* ----------------------------------------------------------------
     Contact
  ----------------------------------------------------------------- */
  const contactForm = $('#contact-form');
  const status = $('#form-status');

  function setError(field, message) {
    const err = document.getElementById(`${field.id}-err`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) err.textContent = message;
  }

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#f-email');
    const message = $('#f-msg');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    const messageOk = message.value.trim().length > 0;
    setError(email, emailOk ? '' : 'Add an email address so I can reply.');
    setError(message, messageOk ? '' : 'Add a sentence or two about the project.');
    if (!emailOk) { email.focus(); status.textContent = ''; return; }
    if (!messageOk) { message.focus(); status.textContent = ''; return; }

    // GitHub Pages has no backend, so hand the message to the visitor's email app
    const name = $('#f-name').value.trim();
    const need = $('input[name="need"]:checked', contactForm)?.parentElement.textContent.trim() ?? 'Not sure yet';
    const subject = name ? `New project from ${name}` : 'New project';
    const body = `${message.value.trim()}\n\nWhat I need: ${need}\nReply to: ${email.value.trim()}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = `Opening your email app. If nothing opens, write to ${EMAIL}.`;
  });
})();
