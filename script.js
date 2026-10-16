(() => {
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
     to the shared prefix and swapped for the next line, forever.
  ----------------------------------------------------------------- */
  const nameEl = $('.name');
  const typed = $('.name__typed', nameEl);
  const LINES = [typed.textContent, "Hey, let's build", "Hey, let's talk"]; // 16 characters at most, so the line never wraps
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

  async function greet() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
     Portrait: a 1-bit dithered image on a 56 x 64 canvas that CSS scales
     up without smoothing, so it is the same drawing at every size. Uses
     a photo if one is given, otherwise a lit bust.
  ----------------------------------------------------------------- */
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const ASPECT = 12 / 13; // pixel width relative to height, set by the aspect-ratio of .portrait

  const portrait = $('#portrait');
  const ctx = portrait.getContext('2d', { willReadFrequently: true });
  const { width: W, height: H } = portrait;

  // brightness 0..1 per pixel (null = background), ordered-dithered to one bit in the text colour
  function drawDithered(lum) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getComputedStyle(portrait).color;
    lum.forEach((v, i) => {
      const x = i % W, y = (i - x) / W;
      if (v !== null && v > (BAYER[y % 4][x % 4] + 0.5) / 16) ctx.fillRect(x, y, 1, 1);
    });
  }

  function placeholderBust() {
    const span = (W * ASPECT) / H; // x range so the head stays round
    const light = [-0.5, -0.6, 0.62];
    const lit = (nx, ny) => {
      const d = nx * nx + ny * ny;
      if (d > 1) return null;
      const nz = Math.sqrt(1 - d);
      return 0.1 + 0.9 * Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
    };
    const grid = [];
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const x = ((px + 0.5) / W * 2 - 1) * span;
        const y = (py + 0.5) / H * 2 - 1;
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
    return grid;
  }

  function photoBrightness(img) {
    const target = (W * ASPECT) / H;
    let sw = img.naturalWidth, sh = img.naturalHeight;
    if (sw / sh > target) sw = sh * target; else sh = sw / target;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    const lum = [];
    for (let i = 0; i < data.length; i += 4) lum.push((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255);
    const lo = Math.min(...lum), hi = Math.max(...lum);
    return lum.map((v) => (v - lo) / (hi - lo || 1));
  }

  drawDithered(placeholderBust());

  if (portrait.dataset.src) {
    const img = new Image();
    img.onload = () => drawDithered(photoBrightness(img));
    img.src = portrait.dataset.src;
  }

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
    const subject = name ? `New project from ${name}` : 'New project';
    const body = `${message.value.trim()}\n\nReply to: ${email.value.trim()}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = `Opening your email app. If nothing opens, write to ${EMAIL}.`;
  });
})();
