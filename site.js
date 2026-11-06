(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  // ---- Starry skies (seeded, so the sky looks the same on every visit) ----
  const rand = (seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)(7);
  // [x%, y%, size, kind]: s = four-point sparkle, a = asterisk, o = small ring
  const SPARKS = {
    hero: [[5, 14, 1.3, 's'], [27, 47, 1.0, 's'], [8, 60, 1.2, 'a'], [86, 31, 1.3, 's'], [79, 41, 1.1, 'a'], [80, 60, 1.1, 's'], [93, 58, 0.7, 'o'], [64, 9, 0.6, 's'], [38, 19, 0.5, 'a'], [55, 30, 0.45, 's']],
    band: [[8, 20, 1.0, 's'], [90, 26, 1.1, 'a'], [16, 74, 0.7, 'a'], [84, 72, 0.9, 's']],
    finale: [[12, 18, 1.1, 's'], [86, 24, 1.2, 'a'], [22, 52, 0.7, 'a'], [76, 50, 0.9, 's'], [60, 12, 0.6, 'o']],
  };
  document.querySelectorAll('.sky').forEach(sky => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const n = Number(sky.dataset.stars) || 80;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(NS, 'ellipse');
      const r = 0.06 + rand() * 0.13;
      c.setAttribute('cx', (rand() * 100).toFixed(2));
      c.setAttribute('cy', (Math.pow(rand(), 1.35) * 72).toFixed(2));
      c.setAttribute('rx', (r * 0.55).toFixed(3));
      c.setAttribute('ry', r.toFixed(3));
      c.setAttribute('fill', rand() > 0.85 ? '#f4d995' : '#ece9ff');
      c.setAttribute('opacity', (0.3 + rand() * 0.6).toFixed(2));
      svg.appendChild(c);
    }
    sky.appendChild(svg);

    // Sparkles live in their own unstretched SVGs so they keep their shape.
    const narrow = innerWidth < 760;
    (SPARKS[sky.dataset.sparks] || []).forEach(([x, y, s, kind], i) => {
      if (narrow && x > 12 && x < 88) return; // keep sparkles off the text on phones
      const el = document.createElementNS(NS, 'svg');
      el.setAttribute('viewBox', '-1 -1 2 2');
      el.setAttribute('aria-hidden', 'true');
      const size = Math.round(16 + s * 18);
      Object.assign(el.style, {
        position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`,
        color: i % 4 === 1 ? '#f4d995' : '#fdf3dc', overflow: 'visible',
        filter: 'drop-shadow(0 0 5px rgba(253,243,220,.9)) drop-shadow(0 0 14px rgba(253,243,220,.45))',
      });
      let shape;
      if (kind === 'o') {
        shape = document.createElementNS(NS, 'circle');
        shape.setAttribute('r', '.55');
        shape.setAttribute('fill', 'none');
        shape.setAttribute('stroke', 'currentColor');
        shape.setAttribute('stroke-width', '.2');
      } else {
        shape = document.createElementNS(NS, 'use');
        shape.setAttribute('href', kind === 'a' ? '#i-aster' : '#i-spark');
      }
      shape.classList.add('twinkle');
      shape.style.animationDelay = `${(i * 0.8) % 4.5}s`;
      el.appendChild(shape);
      sky.appendChild(el);
    });
  });

  // ---- Menu: dark glass over the night panels, light glass over the lavender page ----
  const nav = document.getElementById('nav');
  const nights = [...document.querySelectorAll('.night')];
  const onScroll = () => {
    const r = nav.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    const overNight = nights.some(n => { const b = n.getBoundingClientRect(); return b.top <= mid && b.bottom >= mid; });
    nav.classList.toggle('solid', !overNight);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  if (document.getElementById('compare')) {
    // ---- Before / after comparison ----
    const compare = document.getElementById('compare');
    const range = document.getElementById('compare-range');
    let userMoved = false;
    const setPos = p => {
      p = Math.max(0, Math.min(100, p));
      compare.style.setProperty('--pos', `${p}%`);
      range.value = Math.round(p);
      compare.querySelector('.tag.l').style.opacity = p < 18 ? 0 : 1;
      compare.querySelector('.tag.r').style.opacity = p > 82 ? 0 : 1;
    };
    const fromEvent = e => {
      const r = compare.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    };
    let dragging = false;
    compare.addEventListener('dragstart', e => e.preventDefault());
    compare.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); // stops the browser from picking up the photo as a drag
      dragging = true; userMoved = true;
      compare.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    compare.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
    const stop = () => { dragging = false; };
    compare.addEventListener('pointerup', stop);
    compare.addEventListener('pointercancel', stop);
    range.addEventListener('input', () => { userMoved = true; setPos(Number(range.value)); });
    setPos(50);

    // A gentle sweep the first time the demo comes into view, to show it can be dragged.
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const keys = [[0, 50], [900, 72], [1900, 30], [2700, 50]];
        const t0 = performance.now() + 400;
        const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const tick = now => {
          if (userMoved) return;
          const t = now - t0;
          if (t < 0) return requestAnimationFrame(tick);
          let i = keys.findIndex(k => k[0] > t);
          if (i === -1) return setPos(50);
          const [ta, pa] = keys[i - 1], [tb, pb] = keys[i];
          setPos(pa + (pb - pa) * ease((t - ta) / (tb - ta)));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.5 });
      io.observe(compare);
    }
  }

  if (document.getElementById('popup')) {
    // ---- Popup mock ----
    const popup = document.getElementById('popup');
    const status = document.getElementById('popup-status');
    const hint = document.getElementById('popup-hint');
    const sw = popup.querySelector('.switch');
    const MODES = {
      auto: ['Darkened by Dimlight', 'Auto uses the site’s own dark theme when it has one.'],
      force: ['Always dark on this site', 'Dimlight darkens this site every time you visit.'],
      off: ['Off on this site', 'This site keeps its normal colors. Other sites stay dark.'],
    };
    let mode = 'auto';
    const render = () => {
      const on = sw.getAttribute('aria-checked') === 'true';
      popup.classList.toggle('off', !on);
      status.textContent = on ? MODES[mode][0] : 'Dimlight is off on every website';
      hint.textContent = MODES[mode][1];
    };
    popup.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      popup.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render();
    }));
    sw.addEventListener('click', () => {
      sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
      render();
    });
  }

  if (document.querySelector('[role="tab"]')) {
    // ---- Setup tabs ----
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const select = tab => tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next); next.focus();
      });
    });
    if (/Macintosh/.test(navigator.userAgent) && !('ontouchend' in document)) select(tabs[1]);
  }

  // ---- Reveal on scroll ----
  const items = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
  } else {
    const ro = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => ro.observe(el));
  }
})();
