# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Stephen's freelance portfolio: a single dark, monochrome page in the spirit of an old terminal, hosted on GitHub Pages at https://steojo.github.io/portfolio/. It is hand-written HTML, CSS and vanilla JS: three files and nothing else. There is no package.json, build step, framework, linter or test suite, so don't add any unless asked.

To preview, serve the directory and open `http://localhost:8000`. Use this no-cache server rather than plain `python3 -m http.server`. That one sends no `Cache-Control`, so Chrome keeps running a stale `script.js` across ordinary reloads:

```sh
python3 -c "
import http.server as s
class NoCache(s.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
s.test(HandlerClass=NoCache, port=8000, bind='localhost')
"
```

The page has three sections, each linked from the status bar: home (greeting, intro and portrait), work (one case study per product) and contact.

## Deploying

Every push to `main` runs `.github/workflows/pages.yml`, which copies `index.html`, `styles.css`, `script.js` and `work/` into `_site` and deploys that to GitHub Pages. It can also be run by hand from the Actions tab. Nothing else in the repo is published. The site is served from `/portfolio/`, so keep asset paths relative (`work/x.webp`, not `/work/x.webp`).

## How the pieces fit together

**Boot before paint (`index.html` `<head>`).** An inline script runs before CSS paints. It adds `.js` to `<html>` and, on the first visit of a session (`sessionStorage.booted`, skipped under reduced motion), adds `.booting`. While `.booting` is set, CSS hides every `.hero [data-seq]` until JS adds `.is-on` to it. `boot()` in `script.js` types the first greeting line into `.name__typed`, then reveals the remaining steps. Any key, pointer or wheel event skips to the end, and a 4s timeout in the head script clears `.booting` in case JS fails. Later visits in the same session show everything at once.

**Greeting loop.** After the boot, on every visit, `greet()` cycles through `LINES` forever ("Hey, I'm Stephen", "Hey, let's build", "Hey, let's talk"). It holds each line, backspaces only to the prefix it shares with the next line, then types the rest. The underscore stays solid while `.is-typing` is set and blinks while a line is held. `hold()` pauses the loop while the greeting is off-screen or the tab is hidden. Under reduced motion there is no loop and no blink; the HTML's "Hey, I'm Stephen" just stays.

**`script.js`** is one IIFE split into commented sections: status bar, greeting, portrait and contact. The first `renderPortrait()` call sits at the end of the portrait section on purpose. It reads `const`/`let` bindings declared there, so calling it earlier would throw.

**Colours.** The site is dark only. Colours are CSS custom properties in `:root`: black, white and a short grey ramp. `--dim` is for decoration only and should not be used for readable text.

**Work.** A short list, one `details.project` per product. Its `summary.project__row` shows the app icon (`work/<slug>-icon.webp`), the name, a one-line summary, the platform and a `[+]`/`[-]` toggle. Opening it reveals `.project__detail`: a `.project__stage` with real visuals, then the text. Rows start closed, and several can be open at once. The open/close animation uses `::details-content` with `interpolate-size`; browsers without them just snap open. Postverse (`.project--web`) shows two plain screenshots side by side, the landing page and the campaign dashboard, which stack on phones. Stephen disliked a fake browser frame around them, so keep the screenshots bare. Muna and Foldr show four App Store screenshots in `.shots`, which scroll sideways on phones. The images live in `work/`. The landing page is a 2x headless Chrome capture of postverse.io at 1440×818. The dashboard is a frame from Stephen's YouTube demo with the webcam bubble cleaned out, so a fresh full-resolution screenshot would be sharper.

**Status bar.** An `IntersectionObserver` watches elements with `data-nav="<key>"` and sets `aria-current` on the `.status a[data-key="<key>"]` link with the same key.

**Portrait.** `#portrait` is a `<pre>` filled with half-block characters (two pixels per character) using a 4×4 Bayer ordered dither. With no image it draws a procedural lit bust. Setting `data-src="photo.jpg"` on it makes the same pipeline dither that photo instead. It sits beside the intro in `.hero__side`, a fixed `24rem` grid column. `renderPortrait` sizes the grid from that parent's width, so the column must never shrink to fit its content (an `auto` track would lock the portrait at its minimum size). On narrow screens the grid shrinks rather than the glyphs. `ASPECT` (0.6 / 1.3) assumes Geist Mono's cell metrics.

## Things that must stay in sync

- **Adding or renaming a project.** Copy a `details.project`, put its icon and screenshots in `work/`, and keep its one-line summary in the row short enough to fit on one line on desktop.
- **Name.** Publicly Stephen is "Stephen O." (page title, meta description, the `.sr-only` greeting). Keep the surname out of the page, the README and this file. It only appears inside the email address.
- **Availability.** "Taking on new projects now" appears only in the contact section.
- **Contact details.** The email is in the `EMAIL` constant in `script.js` and hard-coded in `index.html` only in the hero's envelope icon. The contact section deliberately doesn't show the address. The X handle (@steojodev) is only in the hero's X icon. Both icons are `.btn--icon` links with an `aria-label` and a `title`. There is no footer.
- **What Stephen offers.** Only the hero lede lists the kinds of work. There is no separate services section, and the contact form no longer asks what the visitor needs.
- **Hero greeting.** The first entry in `LINES` is read from the HTML in `.name__typed`, and an `.sr-only` copy ("Hey, I'm Stephen O.") stands in for it for screen readers and search engines, so the animation is hidden from them. Every line in `LINES` must be 16 characters or fewer. The greeting and lede are sized in `cqi` from the `.hero__intro` column. `.name__text` (`min(9.5cqi, 5.5rem)`) keeps 17 characters, including the underscore, on one line, and the lede stays about half that size. Recheck both if a line gets longer.
- **Published files.** A new top-level file or folder the page loads (a photo for the portrait, a favicon, a font) must be added to the `cp` line in `.github/workflows/pages.yml`, or it will 404 on the live site.
- **README.** It repeats the hero lede and the project names and links, so update it when any of those change. Keep it short. `.github/hero.png` is a 2x screenshot of the hero at 1440×820. Retake it with headless Chrome (`--force-prefers-reduced-motion` so the greeting holds still) if the hero changes. The deploy workflow doesn't publish it.
- **ASCII art in `<pre>` blocks.** It is intentionally flush-left in the source, since indentation would render. Escape `>` as `&gt;`. Mark it `aria-hidden` and give it a text equivalent (`.sr-only`) when it carries meaning.

## Conventions

- Monochrome, Geist Mono everywhere, square corners, 1px hairlines. The work stages are the one exception: screenshots keep their own colours and rounded corners so the products look like themselves. Animations use `steps()` timing to feel like a terminal redraw. Gate motion behind `@media (prefers-reduced-motion: no-preference)` in CSS.
- Keep it lean. Stephen has cut gimmicks on purpose: the interactive terminal, the invert toggle, the ASCII name art, the services section, the toolbox list and the footer. Don't bring back novelty widgets or extra sections.
- CSS classes are BEM-ish (`block__element`, `btn--solid`), and state classes use `is-*` (`is-active`, `is-on`, `is-typing`).
- Mobile: put hover styles that change a background or border inside `@media (hover: hover)` so they don't stick after a tap. Keep form inputs at 16px or more, or iOS Safari zooms in on focus. The viewport uses `viewport-fit=cover`, so anything that touches a screen edge needs `env(safe-area-inset-*)` padding, as `.screen` and `.status` have. Phone layouts live in the `40rem` and `30rem` media queries at the end of `styles.css`.
- Copy voice: plain, short sentences, British spelling ("colours"), and no em dashes.
- All copy describes Stephen's real work. Don't invent clients, testimonials, metrics or results. Don't mention years of experience or link to Upwork; Stephen asked to leave both out.

## Contact form

GitHub Pages has no backend. After validating, the form opens the visitor's email app with a `mailto:` link that has the subject and message filled in. To receive submissions directly, replace that in the submit handler in `script.js` with a call to a form service such as Formspree.
