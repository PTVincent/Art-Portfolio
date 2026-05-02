/* ============================================================
 * TALES FROM THE ETHER
 * Journal entries live in entries.json — not in this file.
 *
 * TO ADD A NEW JOURNAL ENTRY:
 * 1. Drop your image file into the /art/ folder (e.g. art/my-piece.jpg)
 * 2. Open entries.json and add a new object to the array:
 * {
 * "title":   "Title of the piece",
 * "tags":    ["Characters"],            // or "Creatures", "Environments"
 * "byline":  "Short subtitle line",
 * "plate":   "Plate I",                 // page label under the art
 * "image":   "art/my-piece.jpg",
 * "featured": true,                     // optional — pins to Home page
 * "story":   "First paragraph.\n\nSecond paragraph."
 * }
 * 3. Commit + push (or refresh if running locally via web server).
 *
 * NOTE: this page loads entries via fetch(). It must be served over HTTP,
 * not opened via file://. Use `python3 -m http.server` locally, or deploy
 * to GitHub Pages / Netlify.
 * ============================================================ */

let entries = [];
let entriesLoaded = false;

/* ============ LORE DEEP-LINK SLUGS ============
   Each lore entry gets a URL-friendly slug derived from its title,
   so a reader on "The Crimson Company" can copy a real shareable link:
   https://talesfromtheether.com/#tome/the-crimson-company
   The hash router below recognizes this pattern and jumps the tome
   page to that exact entry. Title and OG meta also update so a link
   pasted into Discord shows the right preview card. */
function entrySlug(entry) {
  if (!entry || !entry.title) return '';
  return entry.title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip punctuation
    .trim()
    .replace(/\s+/g, '-')           // spaces → dashes
    .replace(/-+/g, '-');           // collapse repeats
}

function findEntryBySlug(slug) {
  return entries.find(e => entrySlug(e) === slug);
}

const SITE_TITLE = 'Tales From The Ether: Dark Fantasy & D&D Commission Art by Parker Vincent';
function setMetaForEntry(entry) {
  if (!entry) {
    document.title = SITE_TITLE;
    return;
  }
  const title = `${entry.title} — Tales From The Ether`;
  document.title = title;
  // Update OG / Twitter so Discord/Bluesky/Reddit previews land on the entry
  const updateMeta = (selector, content) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', content);
  };
  updateMeta('meta[property="og:title"]', title);
  updateMeta('meta[name="twitter:title"]', title);
  if (entry.byline) {
    updateMeta('meta[property="og:description"]', entry.byline);
    updateMeta('meta[name="twitter:description"]', entry.byline);
  }
  if (entry.image) {
    const absoluteImage = `https://talesfromtheether.com/${entry.image}`;
    updateMeta('meta[property="og:image"]', absoluteImage);
    updateMeta('meta[name="twitter:image"]', absoluteImage);
  }
}

/* ============ ROUTER ============ */
const routes = ['home', 'gallery', 'tome', 'contact', 'terms'];

function goto(route, opts) {
  opts = opts || {};
  // Support deep-route forms like 'tome/the-crimson-company'
  let slug = '';
  if (route && route.includes('/')) {
    [route, slug] = route.split('/');
  }
  if (!routes.includes(route)) route = 'home';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + route).classList.add('active');
  document.querySelectorAll('nav.main ul a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lore deep link — jump the journal to the right plate, update meta
  if (route === 'tome' && slug) {
    const entry = findEntryBySlug(slug);
    if (entry) {
      currentFilter = 'all';
      document.querySelectorAll('#tag-filter button').forEach(b => {
        b.classList.toggle('active', b.dataset.tag === 'all');
      });
      const list = filteredEntries();
      currentIndex = Math.max(0, list.indexOf(entry));
      renderEntry();
      setMetaForEntry(entry);
      history.replaceState(null, '', '#tome/' + slug);
      setTimeout(triggerRevealsInView, 100);
      return;
    }
  }

  // Reset meta when leaving a specific lore plate
  if (route !== 'tome') setMetaForEntry(null);

  history.replaceState(null, '', '#' + route);
  setTimeout(triggerRevealsInView, 100);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-route]');
  if (el) {
    e.preventDefault();
    goto(el.dataset.route);
  }
});

/* ============ SCROLL-TO-SECTION (data-scroll="section-id") ============ */
/* Handles links that should jump to a section on the home page from anywhere
   in the site. If we're not already on Home, switch to it first, then scroll. */
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  // Account for the fixed nav (~6rem tall)
  const navOffset = 96;
  const top = target.getBoundingClientRect().top + window.pageYOffset - navOffset;
  window.scrollTo({ top, behavior: 'smooth' });
  setTimeout(triggerRevealsInView, 200);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-scroll]');
  if (!el) return;
  e.preventDefault();
  const id = el.dataset.scroll;
  const onHome = document.getElementById('page-home').classList.contains('active');
  if (!onHome) {
    goto('home');
    // Wait for the page transition before scrolling
    setTimeout(() => scrollToSection(id), 350);
  } else {
    scrollToSection(id);
  }
});

/* ============ MOBILE NAV TOGGLE ============ */
/* Hamburger opens a full-screen overlay menu. Items inside use the same
   data-route / data-scroll attributes as the desktop nav, so existing
   delegation handles routing — we only need to close the menu on click. */
(function setupMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-menu-close');
  if (!toggle || !menu) return;

  function open() {
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    menu.classList.contains('open') ? close() : open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);

  // Close after any nav action inside the menu
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-route], [data-scroll]')) close();
  });

  // Escape closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) close();
  });

  // If the viewport widens past the breakpoint while open, close it
  matchMedia('(min-width: 721px)').addEventListener('change', (m) => {
    if (m.matches && menu.classList.contains('open')) close();
  });
})();

/* ============ STICKY MOBILE CTA ============ */
/* Show the floating "Commission →" button only on:
   - mobile (CSS handles this — hidden via media query above 720px)
   - the home page
   - when the user has scrolled past the hero AND the form isn't on screen
   The IntersectionObserver hides the CTA whenever the form comes into
   view, so the floating button never competes with the form's own button. */
(function setupStickyCTA() {
  const cta = document.getElementById('sticky-cta');
  if (!cta) return;
  const form = document.getElementById('commission-form');
  const hero = document.querySelector('.hero');

  let pastHero = false;
  let formVisible = false;

  function updateVisibility() {
    const onHome = document.getElementById('page-home').classList.contains('active');
    const shouldShow = onHome && pastHero && !formVisible;
    cta.classList.toggle('visible', shouldShow);
  }

  if ('IntersectionObserver' in window) {
    if (hero) {
      const heroObs = new IntersectionObserver((entries) => {
        // pastHero is true once the hero is mostly off-screen
        pastHero = !entries[0].isIntersecting;
        updateVisibility();
      }, { threshold: 0.15 });
      heroObs.observe(hero);
    }
    if (form) {
      const formObs = new IntersectionObserver((entries) => {
        formVisible = entries[0].isIntersecting;
        updateVisibility();
      }, { threshold: 0.2 });
      formObs.observe(form);
    }
  } else {
    // Fallback for old browsers — just show after any scroll
    pastHero = true;
    updateVisibility();
  }

  // Re-check whenever the page route changes (custom event would be cleaner,
  // but the existing goto() doesn't dispatch one — poll on click instead)
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-route]')) {
      // Wait for goto() to run + the page-fade animation to start
      setTimeout(updateVisibility, 50);
    }
  });
})();

/* ============ COMMISSION FORM ============ */
/* Submits the form via Formspree AJAX. Keeps the user on the page,
   shows status in #cf-status, and resets the form on success. The
   form's action attribute (https://formspree.io/f/maqakjag) remains
   in place as a graceful no-JS fallback. */
(function setupCommissionForm() {
  const form = document.getElementById('commission-inquiry-form');
  if (!form) return;
  const status = document.getElementById('cf-status');
  const submitBtn = form.querySelector('.form-submit-row .btn');
  const ENDPOINT = 'https://formspree.io/f/maqakjag';

  function setStatus(msg, kind) {
    status.textContent = msg || '';
    status.classList.remove('error', 'success');
    if (kind) status.classList.add(kind);
  }

  function getField(name) {
    const el = form.elements.namedItem(name);
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    const name = getField('name');
    const email = getField('email');
    const brief = getField('brief');

    // Required-field validation (only the three visible required fields)
    const missing = [];
    if (!name)  missing.push('your name');
    if (!email) missing.push('your email');
    if (!brief) missing.push('the character brief');
    if (missing.length) {
      setStatus('Please fill in: ' + missing.join(', ') + '.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('That email address looks off — could you double-check it?', 'error');
      return;
    }

    // Build the payload from the live form. FormData captures multiple
    // checkbox values for "addon" automatically when we read them as a list.
    const fd = new FormData(form);
    const payload = {};
    for (const [key, value] of fd.entries()) {
      if (key === 'addon') {
        if (!payload.addons) payload.addons = [];
        payload.addons.push(value);
      } else {
        payload[key] = value;
      }
    }
    // Friendly subject line that lands well in Parker's inbox
    const tierShort = (payload.tier || '').split(' — ')[0] || 'Inquiry';
    payload._subject = `Commission Inquiry — ${tierShort} — ${name}`;

    // Optimistic UI
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    setStatus('Sending your inquiry…');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus("Sent! I'll reply within a day or two with a quote.", 'success');
        form.reset();
        // Restore the "Not sure yet" default after reset
        const fallback = form.querySelector('input[name="tier"][value^="Not sure"]');
        if (fallback) fallback.checked = true;
      } else {
        let msg = "Something went wrong sending that. Please try again, or email me directly at ptvincentptv@gmail.com.";
        try {
          const data = await res.json();
          if (data && Array.isArray(data.errors) && data.errors.length) {
            msg = data.errors.map(err => err.message).join(' ');
          }
        } catch { /* fall through to default message */ }
        setStatus(msg, 'error');
      }
    } catch {
      setStatus("Couldn't reach the server. Check your connection and try again, or email me at ptvincentptv@gmail.com.", 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();

/* ============ JOURNAL LOGIC ============ */
let currentFilter = 'all';
let currentIndex = 0;
let isFlipping = false;

function filteredEntries() {
  // Entries without a story are gallery-only — hide them from the Journal
  const withStory = entries.filter(e => e.story && e.story.trim());
  if (currentFilter === 'all') return withStory;
  return withStory.filter(e => (e.tags || []).includes(currentFilter));
}

const romanMap = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
function roman(n) { return romanMap[n] || String(n + 1); }

function renderArt(entry) {
  return entry.image
    ? `<img src="${entry.image}" alt="${entry.title}">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--parchment-dark);font-style:italic;font-family:'IM Fell English',serif;">Image not found</div>`;
}

function renderStoryHTML(entry) {
  const tagLine = (entry.tags || []).join(' · ');
  const paragraphs = (entry.story || '').split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
  const slug = entrySlug(entry);
  return `
    <div class="tag-mark">${tagLine}</div>
    <h2>${entry.title || ''}</h2>
    <div class="byline">${entry.byline || ''}</div>
    <div class="story-body">${paragraphs}</div>
    <div class="story-cta">
      <div class="story-cta-divider" aria-hidden="true">✦</div>
      <p class="story-cta-text">Many figures pass through these tales unrecorded. If you have one of your own — a knight, a hunter, a horror — I'll set them down in ink.</p>
      <div class="story-cta-row">
        <a class="btn ghost story-cta-btn" data-scroll="commissions">See the tiers →</a>
        <a class="btn ghost story-cta-btn" data-scroll="commission-form">Begin a commission</a>
      </div>
      <div class="story-share">
        <button class="story-share-btn" type="button" data-share-slug="${slug}" aria-label="Copy link to this plate">Copy link to this plate</button>
      </div>
    </div>
  `;
}

function renderEntry() {
  const list = filteredEntries();
  if (list.length === 0) {
    document.getElementById('art-frame').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--parchment-dark);font-style:italic;font-family:'IM Fell English',serif;text-align:center;padding:2rem;">${entriesLoaded ? 'No entries yet.' : 'Loading...'}</div>`;
    document.getElementById('story').innerHTML = `<p style="font-style:italic;color:var(--parchment-dark);text-align:center;margin-top:2rem;">${entriesLoaded ? 'This journal is waiting for its first entry.' : ''}</p>`;
    document.getElementById('page-count').textContent = '·';
    document.getElementById('art-caption').textContent = '';
    document.getElementById('prev-btn').disabled = true;
    document.getElementById('next-btn').disabled = true;
    return;
  }
  if (currentIndex >= list.length) currentIndex = 0;
  if (currentIndex < 0) currentIndex = list.length - 1;

  const entry = list[currentIndex];
  document.getElementById('art-frame').innerHTML = renderArt(entry);
  document.getElementById('art-caption').textContent = entry.plate ? entry.plate : '';
  document.getElementById('story').innerHTML = renderStoryHTML(entry);
  document.getElementById('page-count').textContent = `${roman(currentIndex)} / ${roman(list.length - 1)}`;
  document.getElementById('prev-btn').disabled = list.length <= 1;
  document.getElementById('next-btn').disabled = list.length <= 1;

  // Keep URL + meta tags synced to the visible plate so links remain shareable
  // and back/forward navigation stays sensible.
  const onTome = document.getElementById('page-tome').classList.contains('active');
  if (onTome) {
    const slug = entrySlug(entry);
    if (slug) {
      history.replaceState(null, '', '#tome/' + slug);
      setMetaForEntry(entry);
    }
  }
}

/* ---- 3D page flip ---- */
function turnPage(dir) {
  const list = filteredEntries();
  if (list.length === 0 || isFlipping) return;
  if (list.length <= 1) return;

  isFlipping = true;
  const book = document.getElementById('book');
  const stage = document.querySelector('.book-stage');
  stage.classList.add('flipping');

  const outClass = dir > 0 ? 'flip-out-right' : 'flip-out-left';
  const inFromClass = dir > 0 ? 'flip-in-from-left' : 'flip-in-from-right';

  book.classList.add(outClass);

  setTimeout(() => {
    currentIndex = (currentIndex + dir + list.length) % list.length;
    renderEntry();

    book.classList.remove(outClass);
    book.classList.add(inFromClass);
    book.offsetWidth; // force reflow
    book.classList.remove(inFromClass);
    book.classList.add('flip-settle');

    setTimeout(() => {
      book.classList.remove('flip-settle');
      stage.classList.remove('flipping');
      isFlipping = false;
    }, 460);
  }, 450);
}

document.getElementById('prev-btn').addEventListener('click', () => turnPage(-1));
document.getElementById('next-btn').addEventListener('click', () => turnPage(1));

document.querySelectorAll('#tag-filter button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tag-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.tag;
    currentIndex = 0;
    renderEntry();
  });
});

/* ---- Keyboard navigation ---- */
document.addEventListener('keydown', (e) => {
  const tomeActive = document.getElementById('page-tome').classList.contains('active');
  if (!tomeActive) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); turnPage(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); turnPage(1); }
});

/* ============ FEATURED GRID ============ */
function renderFeatured() {
  const section = document.getElementById('featured-section');
  const grid = document.getElementById('featured-grid');
  if (entries.length === 0) {
    section.style.display = 'none';
    return;
  }
  const flagged = entries.filter(e => e.featured);
  const picks = (flagged.length > 0 ? flagged : entries).slice(0, 3);
  section.style.display = 'block';
  grid.innerHTML = picks.map(e => `
    <div class="featured-card" data-route="tome">
      ${e.image ? `<img src="${e.image}" alt="${e.title}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : ''}
      <div class="overlay">
        <div class="tag">${(e.tags && e.tags[0]) || ''}</div>
        <h4>${e.title}</h4>
        <div class="excerpt">${(e.story || '').split('\n\n')[0].slice(0, 130)}…</div>
      </div>
    </div>
  `).join('');
}

/* ============ GALLERY ============ */
/* Optional: set this if you want to force a specific GitHub repo for the
   art-folder auto-listing (useful for custom domains or non-GitHub hosts
   mirrored from a GitHub repo). Format: 'owner/repo'. If left null, the
   site tries to auto-detect from the URL when on GitHub Pages. */
const GITHUB_REPO = 'PTVincent/Art-Portfolio';

let galleryFilter = 'all';
let galleryImages = []; // [{ image, entry|null, title, tags }]

function prettyFilename(path) {
  const base = path.split('/').pop().replace(/\.[^/.]+$/, '');
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function autoDetectGitHubRepo() {
  const host = location.hostname;
  const m = host.match(/^([^.]+)\.github\.io$/);
  if (!m) return null;
  const user = m[1];
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length > 0) return `${user}/${parts[0]}`;      // project page
  return `${user}/${user}.github.io`;                      // user page
}

async function fetchGalleryManifest() {
  try {
    const res = await fetch('gallery.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data.filter(Boolean) : null;
  } catch {
    return null;
  }
}

async function fetchGitHubArtList(repo) {
  const url = `https://api.github.com/repos/${repo}/contents/art`;
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('unexpected GitHub API shape');
  const imgExt = /\.(jpe?g|png|webp|gif|avif)$/i;
  return data
    .filter(item => item.type === 'file' && imgExt.test(item.name) && !item.name.startsWith('_'))
    .map(item => item.path)
    .sort();
}

async function loadGalleryImages() {
  let paths = null;

  // Priority 1: gallery.json manifest
  paths = await fetchGalleryManifest();

  // Priority 2: GitHub API
  if (!paths || paths.length === 0) {
    const repo = GITHUB_REPO || autoDetectGitHubRepo();
    if (repo) {
      try {
        paths = await fetchGitHubArtList(repo);
      } catch (err) {
        console.info('[Gallery] GitHub API unavailable:', err.message);
      }
    }
  }

  // Priority 3: fall back to whatever is referenced in entries.json
  if (!paths || paths.length === 0) {
    paths = entries.map(e => e.image).filter(Boolean);
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.info(
        '[Gallery] Running locally. Showing only images referenced in entries.json. ' +
        'To preview all images from the art/ folder locally, run `python3 build.py` ' +
        'in this folder to generate a gallery.json manifest.'
      );
    }
  }

  // De-dupe while preserving order
  paths = Array.from(new Set(paths));

  // Build the galleryImages data model — each path paired with its entry (if any)
  galleryImages = paths.map(path => {
    const entry = entries.find(e => e.image === path) || null;
    return {
      image: path,
      entry: entry,
      title: entry ? entry.title : prettyFilename(path),
      tags: entry ? (entry.tags || []) : []
    };
  });
}

function filteredGalleryImages() {
  if (galleryFilter === 'all') return galleryImages;
  return galleryImages.filter(g => g.tags.includes(galleryFilter));
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const list = filteredGalleryImages();

  if (list.length === 0) {
    const msg = !entriesLoaded
      ? 'Loading…'
      : galleryFilter === 'all'
        ? 'No pieces yet.'
        : 'No pieces to show under this tag.';
    grid.innerHTML = `<div class="gallery-empty">${msg}</div>`;
    return;
  }

  grid.innerHTML = list.map(g => {
    const idx = galleryImages.indexOf(g);
    return `
      <div class="gallery-item" data-img-idx="${idx}">
        <img src="${g.image}" alt="${g.title}" loading="lazy">
        <div class="g-overlay">
          ${g.tags[0] ? `<div class="g-tag">${g.tags[0]}</div>` : ''}
          <div class="g-title">${g.title}</div>
        </div>
      </div>
    `;
  }).join('');
}

document.querySelectorAll('#gallery-filter button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#gallery-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    galleryFilter = btn.dataset.tag;
    renderGallery();
  });
});

document.getElementById('gallery-grid').addEventListener('click', (e) => {
  const item = e.target.closest('.gallery-item');
  if (!item) return;
  const idx = parseInt(item.dataset.imgIdx, 10);
  openLightbox(idx);
});

/* ============ LIGHTBOX ============ */
function openLightbox(galleryIdx) {
  const g = galleryImages[galleryIdx];
  if (!g) return;

  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = g.image;
  document.getElementById('lightbox-img').alt = g.title || '';
  document.getElementById('lightbox-title').textContent = g.title || '';
  document.getElementById('lightbox-tag').textContent = g.tags.join(' · ');

  const journalBtn = document.getElementById('lightbox-journal');
  if (g.entry && g.entry.story && g.entry.story.trim()) {
    journalBtn.classList.add('has-story');
    journalBtn.dataset.entryImage = g.entry.image;
  } else {
    journalBtn.classList.remove('has-story');
    delete journalBtn.dataset.entryImage;
  }

  lb.classList.add('active');
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('active');
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('lightbox').classList.contains('active')) {
    closeLightbox();
  }
});

document.getElementById('lightbox-journal').addEventListener('click', () => {
  const btn = document.getElementById('lightbox-journal');
  const imgPath = btn.dataset.entryImage;
  if (!imgPath) return;
  const entry = entries.find(e => e.image === imgPath);
  if (!entry) return;

  // reset journal filter to 'all' so the entry is definitely in view
  currentFilter = 'all';
  document.querySelectorAll('#tag-filter button').forEach(b => {
    b.classList.toggle('active', b.dataset.tag === 'all');
  });
  const filtered = filteredEntries();
  currentIndex = Math.max(0, filtered.indexOf(entry));
  renderEntry();
  closeLightbox();
  goto('tome');
});


let revealObserver;
function setupReveals() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
    return;
  }
  revealObserver = new IntersectionObserver((observed) => {
    observed.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}
function triggerRevealsInView() {
  document.querySelectorAll('.reveal:not(.revealed)').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('revealed');
    }
  });
}

/* ============ CURSOR GLOW ============ */
function setupCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  let rafId = null;
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;

  if (matchMedia('(hover: none)').matches) {
    glow.style.display = 'none';
    return;
  }

  document.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!glow.classList.contains('active')) glow.classList.add('active');
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      glow.style.left = tx + 'px';
      glow.style.top = ty + 'px';
      rafId = null;
    });
  });
  document.addEventListener('mouseleave', () => glow.classList.remove('active'));
}

/* ============ EMBERS (gold + blue mix) ============ */
function spawnEmbers() {
  const host = document.getElementById('embers');
  // Fewer particles on mobile for performance — box-shadowed animations are heavy on small GPUs
  const count = window.innerWidth <= 720 ? 8 : 24;
  for (let i = 0; i < count; i++) {
    const e = document.createElement('div');
    e.className = 'ember' + (Math.random() < 0.35 ? ' blue' : '');
    e.style.left = Math.random() * 100 + '%';
    e.style.animationDuration = (10 + Math.random() * 14) + 's';
    e.style.animationDelay = (Math.random() * 12) + 's';
    e.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
    const size = (1 + Math.random() * 2);
    e.style.width = e.style.height = size + 'px';
    host.appendChild(e);
  }
}

/* ============ TESTIMONIALS ============ */
async function loadTestimonials() {
  const section = document.getElementById('testimonials-section');
  const grid = document.getElementById('testimonials-grid');
  let items = [];
  try {
    const res = await fetch('testimonials.json', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      items = Array.isArray(data) ? data.filter(t => t && t.quote) : [];
    }
  } catch {
    // file missing or invalid — fine, just leave the section hidden
  }

  if (items.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = items.map(t => `
    <div class="testimonial-card">
      <div class="testimonial-quote">${t.quote}</div>
      <div class="testimonial-author">
        <span class="testimonial-name">${t.name || ''}</span>
        ${t.handle ? `<span class="testimonial-handle">${t.handle}</span>` : ''}
      </div>
    </div>
  `).join('');
}


async function loadEntries() {
  try {
    const res = await fetch('entries.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    const data = await res.json();
    entries = Array.isArray(data) ? data : (data.entries || []);
  } catch (err) {
    if (location.protocol === 'file:') {
      console.warn(
        '[Tales From The Ether] Cannot load entries.json over file:// protocol. ' +
        'Run `python3 -m http.server` in this folder and open http://localhost:8000, ' +
        'or deploy to GitHub Pages / Netlify.'
      );
    } else {
      console.warn('[Tales From The Ether] Could not load entries.json:', err);
    }
    entries = [];
  } finally {
    entriesLoaded = true;
    await loadGalleryImages();
    renderFeatured();
    renderGallery();
    renderEntry();
    loadTestimonials();
  }
}

/* ============ INIT ============ */
setupReveals();
setupCursorGlow();
spawnEmbers();
loadEntries();

/* ============ INITIAL HASH ROUTING ============
   Supports three URL shapes:
     #home, #gallery, #tome, #contact         → simple route
     #tome/the-crimson-company                → lore deep link
     #commissions, #commission-form, #ether-list → home-page anchor */
function handleInitialHash() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;

  // Deep-route form: route/slug — handled inside goto()
  if (hash.includes('/')) {
    // We need entries loaded before slug-routing; loadEntries() chains a render,
    // so wait briefly. If entries are already loaded, this still resolves.
    const tryRoute = () => {
      if (entriesLoaded) {
        goto(hash);
      } else {
        setTimeout(tryRoute, 80);
      }
    };
    tryRoute();
    return;
  }

  if (routes.includes(hash)) {
    goto(hash);
  } else if (document.getElementById(hash)) {
    setTimeout(() => scrollToSection(hash), 250);
  }
}
handleInitialHash();

/* ============ LORE PLATE — COPY SHARE LINK ============
   Click handler for the .story-share-btn rendered inside each plate.
   Copies the canonical deep link to the clipboard. Falls back to a
   text-prompt-style copy if the Clipboard API isn't available. */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.story-share-btn');
  if (!btn) return;
  e.preventDefault();
  const slug = btn.dataset.shareSlug;
  if (!slug) return;
  const url = `https://talesfromtheether.com/#tome/${slug}`;
  const originalText = btn.textContent;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      // Legacy fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    btn.textContent = 'Link copied ✦';
    btn.classList.add('copied');
  } catch {
    btn.textContent = 'Press ⌘C to copy: ' + url;
  }
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('copied');
  }, 2400);
});
