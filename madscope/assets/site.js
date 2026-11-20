/* MADSCOPE — shared behaviour (home + bio) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu (hamburger only below 900px) ---------- */
  const header = $('.site-header');
  const menuBtn = $('.bar__menu');
  const scrim = $('.scrim');
  const setMenu = open => {
    header.classList.toggle('open', open);
    scrim.classList.toggle('on', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('.menu').toggleAttribute('inert', !open);
  };
  if (menuBtn) {
    $('.menu').setAttribute('inert', '');
    menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('open')));
    scrim.addEventListener('click', () => setMenu(false));
    $$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* ---------- Play / stop music ---------- */
  const playBtn = $('.play');
  if (playBtn) {
    const tip = $('.play__tip');
    const audio = new Audio(playBtn.dataset.src);
    audio.preload = 'none';
    const set = on => {
      playBtn.setAttribute('aria-pressed', on);
      playBtn.setAttribute('aria-label', on ? 'Stop music' : 'Play music');
      if (tip) tip.textContent = on ? 'Now playing. Tap to stop' : 'Play music';
    };
    playBtn.addEventListener('click', () => {
      if (audio.paused) { audio.play().then(() => set(true)).catch(() => set(false)); }
      else { audio.pause(); set(false); }
    });
    audio.addEventListener('ended', () => { audio.currentTime = 0; set(false); });
  }

  /* ---------- Hero video: play N times, then hold the last frame ---------- */
  $$('video[data-loops]').forEach(v => {
    const max = +v.dataset.loops || 1;
    let plays = 1;
    if (reduced) { v.removeAttribute('autoplay'); v.pause(); return; }
    v.addEventListener('ended', () => {
      if (plays < max) { plays++; v.currentTime = 0; v.play().catch(() => {}); }
    });
    v.play().catch(() => {});
  });

  /* ---------- Slide-in reveals ---------- */
  // (IntersectionObserver ignores fully clipped elements, so check positions directly)
  let pending = $$('.slide, .slide-x'), ticking = false;
  const reveal = () => {
    ticking = false;
    pending = pending.filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight - 30 && r.bottom > 0) { el.classList.add('in'); return false; }
      return true;
    });
    if (!pending.length) removeEventListener('scroll', onRevealScroll);
  };
  const onRevealScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(reveal); } };
  addEventListener('scroll', onRevealScroll, { passive: true });
  addEventListener('resize', onRevealScroll);
  reveal();

  /* ---------- Music: pinned scroll through releases ---------- */
  const music = $('#music');
  if (music) {
    const releases = [
      { title: 'Stack Paper',   meta: 'Single from 1 Charge Productions', cover: 'media/covers/stack-paper.jpg' },
      { title: "Til a Mawnin'", meta: 'Single from 1 Charge Productions', cover: 'media/covers/til-a-mawnin.jpg' },
      { title: 'Wine Up',       meta: 'Moroccan Riddim, produced by Cornelius Daley, 2024', cover: 'media/covers/wine-up.jpg' },
    ];
    releases.forEach(r => { const i = new Image(); i.src = r.cover; }); // preload covers
    const vinyl = $('#vinyl'), grid = $('#music-grid'), art = $('#sleeve-art'), label = $('.record__label');
    const tTitle = $('#track-title'), tMeta = $('#track-meta'), cur = $('#count-cur'), bars = $('#progress');
    music.style.setProperty('--count', releases.length);
    $('#count-total').textContent = releases.length;
    releases.forEach(() => bars.appendChild(document.createElement('i')));

    let active = -1, timer;
    const apply = i => {
      const r = releases[i];
      art.src = r.cover; art.alt = `${r.title} cover art`;
      label.style.backgroundImage = `url("${r.cover}")`;
      tTitle.textContent = r.title; tMeta.textContent = r.meta;
      cur.textContent = i + 1;
      [...bars.children].forEach((b, k) => b.classList.toggle('on', k === i));
    };
    const show = (i, animate) => {
      if (i === active) return;
      active = i;
      if (!animate || reduced) return apply(i);
      clearTimeout(timer);
      vinyl.classList.add('swap'); grid.classList.add('swapping');
      timer = setTimeout(() => { apply(i); vinyl.classList.remove('swap'); grid.classList.remove('swapping'); }, 560);
    };
    const onScroll = () => {
      const total = music.offsetHeight - innerHeight;
      const p = Math.min(Math.max(-music.getBoundingClientRect().top / total, 0), .9999);
      show(Math.floor(p * releases.length), true);
    };
    show(0, false);
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Contact: pick what it's about ---------- */
  const reasons = $$('.reason');
  if (reasons.length) {
    const EMAIL = '1chargeproductions@gmail.com';
    const topics = {
      live:   { topic: 'Live show or event',       subject: 'Booking enquiry: live show / event', tip: 'Share the date, city, venue and expected crowd size.' },
      collab: { topic: 'Feature or collaboration', subject: 'Feature / collaboration enquiry',     tip: 'Send a link to the riddim or record, plus your timeline.' },
      dubs:   { topic: 'Dubplate or DJ drop',      subject: 'Dubplate / DJ drop request',          tip: 'Tell us the sound or DJ name, the occasion and how many drops you need.' },
      press:  { topic: 'Press or promotion',       subject: 'Press / promotion enquiry',           tip: 'Include your outlet or brand, the angle and your deadline.' },
    };
    const card = $('#card');
    const pick = btn => {
      reasons.forEach(b => { b.setAttribute('aria-checked', b === btn); b.tabIndex = b === btn ? 0 : -1; });
      const t = topics[btn.dataset.key];
      $('#c-topic').textContent = t.topic;
      $('#c-tip').textContent = t.tip;
      $('#c-send').href = `mailto:${EMAIL}?subject=${encodeURIComponent(t.subject)}`;
      card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    };
    reasons.forEach((b, i) => {
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = reasons[(i + d + reasons.length) % reasons.length];
        n.focus(); pick(n);
      });
    });
    const copy = $('#copy');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(EMAIL); }
      catch { const t = document.createElement('textarea'); t.value = EMAIL; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
      copy.textContent = 'Copied'; copy.classList.add('done');
      setTimeout(() => { copy.textContent = 'Copy'; copy.classList.remove('done'); }, 2200);
    });
  }
})();
