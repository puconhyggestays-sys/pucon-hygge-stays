/* ═══════════════════════════════════════════════
   PUCON HYGGE STAYS — Main JavaScript
   ═══════════════════════════════════════════════ */

'use strict';

/* ─── UTILITY ─── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════
   SUPABASE REST API — config + helpers
   ═══════════════════════════════════════════════
   Lee credenciales en este orden:
     1. window.SUPABASE_CONFIG (recomendado, definido en el HTML)
     2. <meta name="supabase-url"> y <meta name="supabase-anon-key">
     3. Fallback hardcodeado
═══════════════════════════════════════════════ */
const SUPABASE = (() => {
  let url, anonKey;

  if (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
    url = window.SUPABASE_CONFIG.url;
    anonKey = window.SUPABASE_CONFIG.anonKey;
  } else {
    const metaUrl = document.querySelector('meta[name="supabase-url"]')?.content;
    const metaKey = document.querySelector('meta[name="supabase-anon-key"]')?.content;
    if (metaUrl && metaKey) {
      url = metaUrl;
      anonKey = metaKey;
    } else {
      url = 'https://vpoutrwyrtcwsvwhumwz.supabase.co/rest/v1/';
      anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb3V0cnd5cnRjd3N2d2h1bXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTg1NDUsImV4cCI6MjA5MjUzNDU0NX0.fO0eDhVcOntA0muHFGNG8K3kwgahRVyBTMv_p7rLvDY';
    }
  }

  // Asegurar slash final en la URL base
  url = url.replace(/\/?$/, '/');

  // Headers base reusables
  const baseHeaders = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  /**
   * INSERT en una tabla (POST).
   * @param {string} table - nombre de la tabla
   * @param {object} payload - registro a insertar
   * @returns {Promise<Response>}
   */
  async function insert(table, payload) {
    return fetch(`${url}${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        // 'minimal' = no devuelve el row insertado; más rápido y evita lecturas no permitidas por RLS
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  }

  /**
   * SELECT con paginación opcional (GET).
   * @param {string} table - nombre de la tabla
   * @param {object} opts - { page, limit, order, filters }
   *   - page (1-indexed, default 1)
   *   - limit (default 100)
   *   - order: string ('created_at' asc, '-created_at' desc) o array
   *   - filters: { columna: 'eq.valor' } pasado tal cual a PostgREST
   * @returns {Promise<{data: any[], total: number, ok: boolean}>}
   */
  async function select(table, opts = {}) {
    const { page = 1, limit = 100, order, filters = {} } = opts;
    const u = new URL(`${url}${encodeURIComponent(table)}`);
    u.searchParams.set('select', '*');

    // Orden: 'created_at' → 'created_at.asc' | '-created_at' → 'created_at.desc'
    if (order) {
      const orders = Array.isArray(order) ? order : [order];
      const formatted = orders.map(o =>
        o.startsWith('-') ? `${o.slice(1)}.desc` : `${o}.asc`
      ).join(',');
      u.searchParams.set('order', formatted);
    }

    // Filtros adicionales (ej: { publicado: 'eq.true' })
    Object.entries(filters).forEach(([k, v]) => u.searchParams.set(k, v));

    // Paginación con offset (Supabase no usa "page")
    const offset = (page - 1) * limit;
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('offset', String(offset));

    const res = await fetch(u.toString(), {
      method: 'GET',
      headers: {
        ...baseHeaders,
        // Pedir el conteo total en el header Content-Range
        'Prefer': 'count=exact'
      }
    });

    if (!res.ok) {
      return { data: [], total: 0, ok: false };
    }

    const data = await res.json();

    // Content-Range: "0-9/142"  → total = 142
    let total = Array.isArray(data) ? data.length : 0;
    const range = res.headers.get('Content-Range');
    if (range) {
      const parsed = parseInt(range.split('/')[1], 10);
      if (!Number.isNaN(parsed)) total = parsed;
    }

    return { data: Array.isArray(data) ? data : [], total, ok: true };
  }

  return { url, anonKey, insert, select };
})();

/* ═══════════════════════════════════════════════
   1. NAVIGATION
   ═══════════════════════════════════════════════ */
(function initNav() {
  const header = $('#header');
  const hamburger = $('#navHamburger');
  const menu = $('#navMenu');

  // Sticky header on scroll
  const onScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Initial check

  // Mobile hamburger
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu on link click
  $$('.nav-link, .nav-cta', menu).forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Active nav link on scroll
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link');

  const observerNav = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active-link', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observerNav.observe(s));
})();

/* ═══════════════════════════════════════════════
   2. SCROLL REVEAL
   ═══════════════════════════════════════════════ */
(function initScrollReveal() {
  const revealEls = $$('.reveal, .reveal-left, .reveal-right');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stagger children if delay data attr
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  revealEls.forEach(el => observer.observe(el));

  // Auto-add reveal to key sections
  const autoReveal = [
    '.apt-card',
    '.exp-card',
    '.am-item',
    '.testi-card',
    '.bh-item',
    '.contact-channel',
    '.faq-item',
    '.valor-item',
  ];

  autoReveal.forEach(sel => {
    $$(sel).forEach((el, i) => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
        el.dataset.delay = i * 80;
        observer.observe(el);
      }
    });
  });
})();

/* ═══════════════════════════════════════════════
   3. TESTIMONIALS SLIDER
   ═══════════════════════════════════════════════ */
(function initTestimonials() {
  const track = $('#testimonialsTrack');
  const cards = $$('.testi-card', track);
  const dotsWrap = $('#testiDots');
  const prevBtn = $('#testiPrev');
  const nextBtn = $('#testiNext');

  if (!track || !cards.length) return;

  let current = 0;
  let autoTimer;

  // Create dots
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  function goTo(idx) {
    current = (idx + cards.length) % cards.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    $$('.testi-dot', dotsWrap).forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Touch/swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) goTo(dx < 0 ? current + 1 : current - 1);
  });

  resetAuto();
})();

/* ═══════════════════════════════════════════════
   4. GALLERY LIGHTBOX
   ═══════════════════════════════════════════════ */
(function initGallery() {
  const items = $$('.gal-item');
  const lightbox = $('#lightbox');
  const overlay = $('#lightboxOverlay');
  const lbImg = $('#lbImg');
  const lbCaption = $('#lbCaption');
  const lbClose = $('#lbClose');
  const lbPrev = $('#lbPrev');
  const lbNext = $('#lbNext');

  if (!items.length || !lightbox) return;

  let currentIdx = 0;
  const images = items.map(item => ({
    src: $('img', item)?.src || '',
    caption: $('span', item)?.textContent || ''
  }));

  function openLightbox(idx) {
    currentIdx = idx;
    showImage(idx);
    lightbox.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showImage(idx) {
    currentIdx = (idx + images.length) % images.length;
    lbImg.src = images[currentIdx].src;
    lbImg.alt = images[currentIdx].caption;
    lbCaption.textContent = images[currentIdx].caption;
  }

  items.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
  });

  lbClose.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => showImage(currentIdx - 1));
  lbNext.addEventListener('click', () => showImage(currentIdx + 1));

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentIdx - 1);
    if (e.key === 'ArrowRight') showImage(currentIdx + 1);
  });

  // Touch swipe lightbox
  let txStart = 0;
  lbImg.addEventListener('touchstart', e => { txStart = e.changedTouches[0].clientX; }, { passive: true });
  lbImg.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - txStart;
    if (Math.abs(dx) > 50) showImage(dx < 0 ? currentIdx + 1 : currentIdx - 1);
  });
})();

/* ═══════════════════════════════════════════════
   5. FAQ ACCORDION
   ═══════════════════════════════════════════════ */
(function initFAQ() {
  const questions = $$('.faq-question');

  questions.forEach(q => {
    q.addEventListener('click', () => {
      const isOpen = q.getAttribute('aria-expanded') === 'true';
      const answer = q.nextElementSibling;

      // Close all
      questions.forEach(other => {
        other.setAttribute('aria-expanded', 'false');
        other.nextElementSibling?.classList.remove('open');
      });

      // Open clicked (unless was already open)
      if (!isOpen) {
        q.setAttribute('aria-expanded', 'true');
        answer.classList.add('open');
      }
    });
  });
})();

/* ═══════════════════════════════════════════════
   6. BOOKING FORM — eliminado.
   La reserva ahora se hace 100% por WhatsApp desde los botones del sitio.
   Se mantiene la sección "Disponibilidad" como referencia visual de fechas
   libres por departamento.
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   7. CONTACT FORM
   ═══════════════════════════════════════════════ */
(function initContactForm() {
  const form = $('#contactForm');
  const success = $('#contactSuccess');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject?.value || '',
      message: form.message.value.trim(),
      created_at_local: new Date().toLocaleString('es-CL'),
    };

    try {
      const res = await SUPABASE.insert('mensajes', data);
      if (!res.ok) {
        console.warn('Mensaje save failed:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.warn('Mensaje save error:', err);
    }

    setTimeout(() => {
      form.style.display = 'none';
      success.style.display = 'block';
    }, 600);
  });
})();

/* ═══════════════════════════════════════════════
   8. SMOOTH SCROLL for CTAs
   ═══════════════════════════════════════════════ */
(function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ═══════════════════════════════════════════════
   9. HERO PARALLAX (subtle)
   ═══════════════════════════════════════════════ */
(function initParallax() {
  const heroImg = $('.hero-img');
  if (!heroImg) return;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        if (scrolled < window.innerHeight) {
          heroImg.style.transform = `scale(1) translateY(${scrolled * 0.25}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════
   10. WHATSAPP FLOAT VISIBILITY
   ═══════════════════════════════════════════════ */
(function initWAFloat() {
  const wa = $('#waFloat');
  if (!wa) return;

  // Show after slight scroll
  window.addEventListener('scroll', () => {
    wa.style.opacity = window.scrollY > 200 ? '1' : '0';
    wa.style.pointerEvents = window.scrollY > 200 ? 'all' : 'none';
  }, { passive: true });

  // Initial
  wa.style.opacity = '0';
  wa.style.transition = 'opacity 0.4s ease';
})();

/* ═══════════════════════════════════════════════
   11. YEAR FOOTER
   ═══════════════════════════════════════════════ */
(function updateYear() {
  const els = $$('[data-year]');
  els.forEach(el => { el.textContent = new Date().getFullYear(); });
})();

/* ═══════════════════════════════════════════════
   12. NAV ACTIVE LINK STYLE
   ═══════════════════════════════════════════════ */
(function initActiveLinkStyle() {
  // Add CSS for active link
  const style = document.createElement('style');
  style.textContent = `
    .header.scrolled .nav-link.active-link {
      color: var(--earth);
      background: var(--cream-dark);
    }
  `;
  document.head.appendChild(style);
})();

/* ═══════════════════════════════════════════════
   13. COUNTER ANIMATION
   ═══════════════════════════════════════════════ */
(function initCounters() {
  const counters = $$('.stat strong');
  const seen = new Set();

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !seen.has(entry.target)) {
        seen.add(entry.target);
        const el = entry.target;
        const text = el.textContent;
        const suffix = text.replace(/[0-9.]/g, '');
        const value = parseFloat(text);
        if (isNaN(value)) return;

        let start = 0;
        const duration = 1200;
        const startTime = performance.now();

        const tick = now => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = value * eased;
          el.textContent = (Number.isInteger(value) ? Math.round(current) : current.toFixed(0)) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();

/* ═══════════════════════════════════════════════
   14. FORM VALIDATION VISUAL FEEDBACK
   ═══════════════════════════════════════════════ */
(function initFormValidation() {
  $$('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.hasAttribute('required') && !field.value.trim()) {
        field.style.borderColor = '#E05252';
      } else {
        field.style.borderColor = '';
      }
    });

    field.addEventListener('input', () => {
      if (field.value.trim()) {
        field.style.borderColor = '';
      }
    });
  });
})();

/* ═══════════════════════════════════════════════
   15. PAGE LOAD ANIMATION
   ═══════════════════════════════════════════════ */
(function initPageLoad() {
  document.body.classList.add('loaded');

  const style = document.createElement('style');
  style.textContent = `
    body:not(.loaded) { opacity: 0; }
    body { transition: opacity 0.4s ease; }
    body.loaded { opacity: 1; }
  `;
  document.head.appendChild(style);
})();

/* ═══════════════════════════════════════════════
   16. NOTICIAS / BLOG
   ═══════════════════════════════════════════════ */
(function initNews() {
  const grid = $('#newsGrid');
  const loadingEl = $('#newsLoading');
  const footerEl = $('#newsFooter');
  const loadMoreBtn = $('#newsLoadMore');
  if (!grid) return;

  const PAGE_SIZE = 3;
  let page = 1;
  let totalPosts = 0;

  const categoryMap = {
    'actividades': { icon: 'fa-person-hiking', color: '#5B8C5A' },
    'gastronomia': { icon: 'fa-utensils', color: '#C17F3A' },
    'novedades': { icon: 'fa-star', color: '#4A7C8E' },
    'consejos': { icon: 'fa-lightbulb', color: '#8E6B4A' },
    'temporada': { icon: 'fa-calendar', color: '#6B5A8E' },
    'default': { icon: 'fa-newspaper', color: '#4A5568' }
  };

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(typeof ts === 'number' ? ts : ts);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function truncate(text, max = 120) {
    if (!text) return '';
    const stripped = text.replace(/<[^>]+>/g, '');
    return stripped.length > max ? stripped.slice(0, max).trim() + '…' : stripped;
  }

  function buildCard(post) {
    const cat = post.categoria || 'default';
    const catInfo = categoryMap[cat] || categoryMap['default'];
    const imgHtml = post.imagen_portada
      ? `<div class="news-card-img"><img src="${post.imagen_portada}" alt="${post.titulo || 'Noticia'}" loading="lazy" /></div>`
      : `<div class="news-card-img news-card-img--placeholder" style="background:${catInfo.color}20"><i class="fa-solid ${catInfo.icon}" style="color:${catInfo.color};font-size:2.5rem;"></i></div>`;

    return `
      <article class="news-card">
        ${imgHtml}
        <div class="news-card-body">
          <div class="news-card-meta">
            <span class="news-cat" style="background:${catInfo.color}20;color:${catInfo.color}">
              <i class="fa-solid ${catInfo.icon}"></i> ${cat.charAt(0).toUpperCase() + cat.slice(1)}
            </span>
            <span class="news-date"><i class="fa-regular fa-calendar"></i> ${formatDate(post.created_at || post.updated_at)}</span>
          </div>
          <h3 class="news-card-title">${post.titulo || 'Sin título'}</h3>
          <p class="news-card-excerpt">${truncate(post.resumen || post.cuerpo_html, 130)}</p>
          <div class="news-card-author">
            <div class="news-author-avatar">${(post.autor || 'H').charAt(0).toUpperCase()}</div>
            <span>${post.autor || 'Hygge Team'}</span>
          </div>
        </div>
      </article>
    `;
  }

  async function loadNews(pg = 1) {
    try {
      // Más reciente primero ('-created_at' = orden DESC)
      const { data, total, ok } = await SUPABASE.select('noticias', {
        page: pg,
        limit: PAGE_SIZE,
        order: '-created_at'
      });
      if (!ok) throw new Error('API error');
      totalPosts = total || 0;

      const posts = data.filter(p => p.publicado !== false && p.publicado !== 'false');

      if (pg === 1) {
        loadingEl.style.display = 'none';
        if (posts.length === 0) {
          grid.innerHTML = `<div class="news-empty"><i class="fa-solid fa-newspaper"></i><p>No hay publicaciones aún. ¡Pronto novedades!</p></div>`;
          return;
        }
      }

      posts.forEach(post => {
        const div = document.createElement('div');
        div.innerHTML = buildCard(post).trim();
        grid.appendChild(div.firstChild);
      });

      const loaded = PAGE_SIZE * pg;
      if (loaded < totalPosts) {
        footerEl.style.display = 'block';
      } else {
        footerEl.style.display = 'none';
      }
    } catch (err) {
      loadingEl.style.display = 'none';
      grid.innerHTML = `<div class="news-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>No se pudieron cargar las noticias.</p></div>`;
    }
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', e => {
      e.preventDefault();
      page++;
      loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando…';
      loadNews(page).then(() => {
        loadMoreBtn.innerHTML = 'Ver más artículos';
      });
    });
  }

  loadNews(1);
})();

/* ═══════════════════════════════════════════════
   INIT COMPLETE
   ═══════════════════════════════════════════════ */
console.log('✦ Pucon Hygge Stays — Web Experience Ready');
