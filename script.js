(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const EMAIL = 'stephen@example.com';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });

  /* ----------------------------------------------------------------
     Theme: black on white or white on black
  ----------------------------------------------------------------- */
  const THEMES = ['dark', 'light'];
  const themeBtn = $('#theme-toggle');

  function setTheme(name) {
    if (!THEMES.includes(name)) return false;
    root.dataset.theme = name;
    try { localStorage.setItem('theme', name); } catch {}
    const other = name === 'dark' ? 'light' : 'dark';
    themeBtn.setAttribute('aria-label', `Invert colours, switch to ${other} screen`);
    $('meta[name="theme-color"]').content = name === 'dark' ? '#000000' : '#ffffff';
    renderPortrait();
    return true;
  }

  themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

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
     Intro: type the command, print the name, then the rest
  ----------------------------------------------------------------- */
  const nameEl = $('.name');

  async function intro() {
    if (!root.classList.contains('booting')) return;
    try { sessionStorage.setItem('booted', '1'); } catch {}

    const steps = $$('.hero [data-seq]');
    const typed = $('.typed');
    const command = typed.textContent;
    let skipped = false;

    const finish = () => {
      skipped = true;
      typed.textContent = command;
      steps.forEach((s) => s.classList.add('is-on'));
      nameEl.classList.remove('is-printing');
      root.classList.remove('booting');
      removeEventListener('keydown', finish);
      removeEventListener('pointerdown', finish);
      removeEventListener('wheel', finish);
    };
    const wait = (ms) => (skipped ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

    addEventListener('keydown', finish, { once: true });
    addEventListener('pointerdown', finish, { once: true });
    addEventListener('wheel', finish, { once: true, passive: true });

    typed.textContent = '';
    steps[0].classList.add('is-on');
    await wait(300);
    for (const ch of command) {
      if (skipped) break;
      typed.textContent += ch;
      await wait(60 + Math.random() * 50);
    }
    await wait(180);
    if (!skipped) nameEl.classList.add('is-on', 'is-printing');
    await wait(560);
    for (const step of steps.slice(2)) {
      if (skipped) break;
      step.classList.add('is-on');
      await wait(110);
    }
    if (!skipped) finish();
  }

  intro();

  /* ----------------------------------------------------------------
     Terminal
  ----------------------------------------------------------------- */
  const term = $('.term');
  const out = $('#term-out');
  const form = $('#term-form');
  const input = $('#term-in');
  const mirror = $('#term-mirror');
  const history = [];
  let historyIndex = 0;
  const MAX_ENTRIES = 5;

  function renderMirror() {
    const value = input.value;
    const pos = input.selectionStart ?? value.length;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = value[pos] || ' ';
    mirror.replaceChildren(document.createTextNode(value.slice(0, pos)), cursor, document.createTextNode(value.slice(pos + 1)));
  }

  ['input', 'keyup', 'click', 'select'].forEach((type) => input.addEventListener(type, renderMirror));
  document.addEventListener('selectionchange', () => { if (document.activeElement === input) renderMirror(); });
  input.addEventListener('focus', () => { term.classList.add('is-focused'); renderMirror(); });
  input.addEventListener('blur', () => term.classList.remove('is-focused'));
  term.addEventListener('click', (e) => { if (!e.target.closest('a, button')) input.focus({ preventScroll: true }); });

  function print(command, lines) {
    const entry = document.createElement('div');
    entry.className = 'term__entry';
    entry.innerHTML = `<p class="term__echo"><span class="ps1">~ $</span> ${esc(command)}</p>` +
      lines.map((line) => (line.startsWith('<dl') ? line : `<p>${line}</p>`)).join('');
    out.append(entry);
    while (out.children.length > MAX_ENTRIES) out.firstElementChild.remove();
  }

  const rows = (pairs) => `<dl class="term__rows">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

  const PROJECTS = ['ledgerline', 'dockside', 'tidepool', 'kiln', 'fieldnote'];

  function openProject(name) {
    const tab = document.getElementById(`tab-${name}`);
    if (!tab) return false;
    selectTab(tab);
    scrollToId('work');
    return true;
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      return true;
    } catch {
      return false;
    }
  }

  const COMMANDS = {
    help: () => [
      'Commands you can try:',
      rows([
        ['about', 'who I am and how I work'],
        ['work', 'browse selected projects'],
        ['open', 'open a project, for example open kiln'],
        ['services', 'ways we can work together'],
        ['contact', 'start a project'],
        ['email', 'copy my email address'],
        ['theme', 'dark or light screen'],
        ['clear', 'clear the screen'],
      ]),
    ],
    about: () => {
      scrollToId('about');
      return ['Twelve years writing software: four at a bank, three at a startup that was acquired, five independent.'];
    },
    whoami: () => ['Stephen, freelance software engineer. Next opening: January 2027.'],
    work: () => {
      scrollToId('work');
      return ['Opening selected work. Next time try open dockside.'];
    },
    ls: () => [`${PROJECTS.map((p) => `${p}/`).join('  ')}  cv.txt  contact.txt`],
    cat: ([file]) => {
      if (!file) return ['cat: name a file, for example cat cv.txt'];
      if (file === 'cv.txt') {
        return [rows([
          ['2021-now', 'Independent engineer'],
          ['2018-2021', 'Staff engineer, Parcelwise (acquired)'],
          ['2014-2018', 'Software engineer, Northgate Bank'],
        ])];
      }
      if (file === 'contact.txt') return [`<a href="mailto:${EMAIL}">${EMAIL}</a>, or type contact to jump to the form.`];
      if (PROJECTS.includes(file.replace(/\/$/, ''))) return [`cat: ${esc(file)} is a folder. Try open ${esc(file.replace(/\/$/, ''))}`];
      return [`cat: ${esc(file)}: no such file. Type ls to see what's here.`];
    },
    open: ([name = '']) => {
      const key = name.toLowerCase().replace(/\/$/, '');
      if (openProject(key)) return [`Opening ${esc(key)}.`];
      return [`open: no project called ${esc(name) || 'that'}. Choose from ${PROJECTS.join(', ')}.`];
    },
    services: () => {
      scrollToId('services');
      return ['Build, rescue, scale or advise. Scrolling to the details.'];
    },
    contact: () => {
      scrollToId('contact');
      return [`Next opening is January 2027. Write to <a href="mailto:${EMAIL}">${EMAIL}</a> or use the form.`];
    },
    email: async () => (await copyEmail())
      ? [`Copied ${EMAIL} to your clipboard.`]
      : [`Couldn't reach your clipboard. The address is <a href="mailto:${EMAIL}">${EMAIL}</a>.`],
    theme: ([name]) => {
      if (!name) return [`The screen is ${root.dataset.theme}. Type theme dark or theme light.`];
      return setTheme(name.toLowerCase())
        ? [`Switched to the ${esc(name.toLowerCase())} screen.`]
        : [`theme: there's no ${esc(name)} here. Choose dark or light.`];
    },
    invert: () => COMMANDS.theme([root.dataset.theme === 'dark' ? 'light' : 'dark']),
    date: () => [new Date().toString()],
    echo: (args) => [esc(args.join(' '))],
    history: () => (history.length ? [rows(history.map((h, i) => [String(i + 1), esc(h)]))] : ['No history yet.']),
    sudo: () => ['stephen is not in the sudoers file. This incident will be reported.'],
    rm: () => ['rm: this screen is read-only. Nothing was deleted.'],
    exit: () => ['There is no exit, only the contact form. Type contact.'],
    vim: () => ['No editors on this machine, so you can never get stuck in one.'],
    coffee: () => ['Brewing. Back in four minutes.'],
    hello: () => ['Hello. Type help to see what this terminal can do.'],
  };
  COMMANDS.hire = COMMANDS.contact;
  COMMANDS.hi = COMMANDS.hello;
  COMMANDS.logout = COMMANDS.exit;
  COMMANDS.cd = () => ['cd: there is only one directory here, and you are in it.'];
  COMMANDS.man = () => COMMANDS.help();
  const NAVIGATES = new Set(['about', 'work', 'open', 'services', 'contact', 'hire']);

  async function run(raw) {
    const line = raw.trim();
    if (!line) { print('', []); return; }
    history.push(line);
    historyIndex = history.length;
    const [name, ...args] = line.split(/\s+/);
    const key = name.toLowerCase();
    if (key === 'clear') { out.replaceChildren(); return; }
    const command = COMMANDS[key];
    const lines = command
      ? await command(args)
      : [`${esc(name)}: command not found. Type help for the list.`];
    print(line, lines);
    if (!NAVIGATES.has(key)) form.scrollIntoView({ block: 'nearest' });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = '';
    renderMirror();
    await run(value);
  });

  $$('[data-run]').forEach((btn) => btn.addEventListener('click', () => run(btn.dataset.run)));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (e.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[historyIndex] ?? '';
      requestAnimationFrame(() => { input.setSelectionRange(input.value.length, input.value.length); renderMirror(); });
    } else if (e.key === 'Tab' && input.value.trim()) {
      const [first, second] = input.value.split(/\s+/);
      const pool = second === undefined ? Object.keys(COMMANDS) : first === 'open' ? PROJECTS : first === 'theme' ? THEMES : [];
      const stem = (second ?? first).toLowerCase();
      const matches = pool.filter((c) => c.startsWith(stem));
      if (matches.length === 1) {
        e.preventDefault();
        input.value = second === undefined ? `${matches[0]} ` : `${first} ${matches[0]}`;
        renderMirror();
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.replaceChildren();
    } else if (e.key === 'Escape') {
      input.blur();
    }
  });

  addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    input.focus({ preventScroll: true });
    term.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
  });

  renderMirror();

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
    const light = root.dataset.theme === 'light';
    const on = (x, y) => {
      const v = grid[y * cols + x];
      if (v === null) return 0;
      const t = (BAYER[y % 4][x % 4] + 0.5) / 16;
      return (light ? v < t : v > t) ? 1 : 0;
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

  setTheme(root.dataset.theme === 'light' ? 'light' : 'dark');

  /* ----------------------------------------------------------------
     Contact
  ----------------------------------------------------------------- */
  const copyBtn = $('#copy-email');
  copyBtn.addEventListener('click', async () => {
    const ok = await copyEmail();
    copyBtn.textContent = ok ? 'Copied' : 'Copy failed, select the address instead';
    setTimeout(() => { copyBtn.textContent = 'Copy address'; }, 2200);
  });

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

    // Placeholder: send the form data to your form service here (Formspree, a serverless function, etc).
    status.textContent = `Sent. I'll reply to ${email.value.trim()} within two working days.`;
    contactForm.reset();
  });
})();
