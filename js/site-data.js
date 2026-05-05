/* ═══════════════════════════════════════════════════════════════
   PUCON HYGGE STAYS — Capa de datos dinámica
   Conecta el Admin (tablas API) con el sitio público.
   Se carga en index.html y reemplaza contenido estático por
   datos reales almacenados en la base de datos.
   ═══════════════════════════════════════════════════════════════ */

const SiteData = (() => {

  /* ── Config Supabase (lee window.SUPABASE_CONFIG, <meta>, o fallback) ── */
  const _SB = (() => {
    let url, key;
    if (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
      url = window.SUPABASE_CONFIG.url;
      key = window.SUPABASE_CONFIG.anonKey;
    } else {
      const mu = document.querySelector('meta[name="supabase-url"]')?.content;
      const mk = document.querySelector('meta[name="supabase-anon-key"]')?.content;
      if (mu && mk) { url = mu; key = mk; }
      else {
        url = 'https://vpoutrwyrtcwsvwhumwz.supabase.co/rest/v1/';
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb3V0cnd5cnRjd3N2d2h1bXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTg1NDUsImV4cCI6MjA5MjUzNDU0NX0.fO0eDhVcOntA0muHFGNG8K3kwgahRVyBTMv_p7rLvDY';
      }
    }
    return { url: url.replace(/\/?$/, '/'), key };
  })();

  /* ── helpers ── */
  async function apiFetch(table, params = '') {
    try {
      // Construir URL Supabase: select=* obligatorio + traducir params legacy
      const u = new URL(`${_SB.url}${encodeURIComponent(table)}`);
      u.searchParams.set('select', '*');
      u.searchParams.set('limit', '200');
      // Traducir '&sort=campo' o '&sort=-campo' a 'order=campo.asc/desc'
      if (params) {
        const cleaned = params.replace(/^[?&]/, '');
        cleaned.split('&').filter(Boolean).forEach(pair => {
          const [k, ...rest] = pair.split('=');
          const v = rest.join('=');
          if (!k) return;
          if (k === 'sort' || k === 'order') {
            u.searchParams.set('order', v.startsWith('-') ? `${v.slice(1)}.desc` : `${v}.asc`);
          } else {
            u.searchParams.set(k, v);
          }
        });
      }
      const res = await fetch(u.toString(), {
        headers: {
          'apikey': _SB.key,
          'Authorization': `Bearer ${_SB.key}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return [];
      const json = await res.json();
      // Supabase devuelve array directo; mantener compatibilidad con formato {data:[]}
      if (Array.isArray(json)) return json;
      return json.data || [];
    } catch (e) {
      console.warn(`[SiteData] No se pudo cargar ${table}:`, e.message);
      return [];
    }
  }

  function el(id) { return document.getElementById(id); }
  function qs(sel, ctx = document) { return ctx.querySelector(sel); }
  function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

  /* ══════════════════════════════════════
     1. CMS — Textos dinámicos
  ══════════════════════════════════════ */
  async function applyCMS() {
    const rows = await apiFetch('cms_textos');
    if (!rows.length) return;

    const map = {};
    rows.forEach(r => { if (r.campo && r.valor !== undefined) map[r.campo] = r.valor; });

    const set = (id, val) => { const e = el(id); if (e && val) e.textContent = val; };
    const setHTML = (id, val) => { const e = el(id); if (e && val) e.innerHTML = val; };
    const setAttr = (id, attr, val) => { const e = el(id); if (e && val) e.setAttribute(attr, val); };

    /* Hero */
    if (map.hero_eyebrow)      set('cms-hero-eyebrow', map.hero_eyebrow);
    if (map.hero_titulo)       set('cms-hero-title', map.hero_titulo);
    if (map.hero_subtitulo)    set('cms-hero-subtitle', map.hero_subtitulo);
    if (map.hero_cta)          set('cms-hero-cta', map.hero_cta);
    if (map.hero_cta2)         set('cms-hero-cta2', map.hero_cta2);
    if (map.hero_stat1)        set('cms-stat1-val', map.hero_stat1);
    if (map.hero_stat1_label)  set('cms-stat1-label', map.hero_stat1_label);
    if (map.hero_stat2)        set('cms-stat2-val', map.hero_stat2);
    if (map.hero_stat2_label)  set('cms-stat2-label', map.hero_stat2_label);

    /* Nosotros */
    if (map.nosotros_eyebrow)  set('cms-nosotros-eyebrow', map.nosotros_eyebrow);
    if (map.nosotros_titulo)   setHTML('cms-nosotros-title', map.nosotros_titulo);
    if (map.nosotros_p1)       set('cms-nosotros-p1', map.nosotros_p1);
    if (map.nosotros_p2)       set('cms-nosotros-p2', map.nosotros_p2);
    if (map.nosotros_badge)    set('cms-nosotros-badge', map.nosotros_badge);
    if (map.nosotros_cta)      set('cms-nosotros-cta', map.nosotros_cta);

    /* Departamentos */
    if (map.deptos_eyebrow)    set('cms-deptos-eyebrow', map.deptos_eyebrow);
    if (map.deptos_titulo)     setHTML('cms-deptos-title', map.deptos_titulo);
    if (map.deptos_subtitulo)  set('cms-deptos-subtitle', map.deptos_subtitulo);

    /* Amenities */
    if (map.amenities_eyebrow)  set('cms-amenities-eyebrow', map.amenities_eyebrow);
    if (map.amenities_titulo)   setHTML('cms-amenities-title', map.amenities_titulo);
    if (map.amenities_subtitulo) set('cms-amenities-subtitle', map.amenities_subtitulo);

    /* Áreas comunes – amenities individuales */
    for (let i = 1; i <= 8; i++) {
      if (map[`amenity_${i}`]) set(`cms-amenity-${i}`, map[`amenity_${i}`]);
    }

    /* Vive Pucón */
    if (map.pucon_eyebrow)    set('cms-pucon-eyebrow', map.pucon_eyebrow);
    if (map.pucon_titulo)     setHTML('cms-pucon-title', map.pucon_titulo);
    if (map.pucon_subtitulo)  set('cms-pucon-subtitle', map.pucon_subtitulo);

    /* Playa */
    if (map.playa_eyebrow)    set('cms-playa-eyebrow', map.playa_eyebrow);
    if (map.playa_titulo)     setHTML('cms-playa-title', map.playa_titulo);
    if (map.playa_subtitulo)  set('cms-playa-subtitle', map.playa_subtitulo);
    if (map.playa_badge)      set('cms-playa-badge', map.playa_badge);

    /* Galería */
    if (map.galeria_eyebrow)  set('cms-galeria-eyebrow', map.galeria_eyebrow);
    if (map.galeria_titulo)   setHTML('cms-galeria-title', map.galeria_titulo);

    /* Testimonios */
    if (map.testimonios_eyebrow)  set('cms-testimonios-eyebrow', map.testimonios_eyebrow);
    if (map.testimonios_titulo)   setHTML('cms-testimonios-title', map.testimonios_titulo);
    if (map.testimonios_subtitulo) set('cms-testimonios-subtitle', map.testimonios_subtitulo);

    /* Reserva */
    if (map.reserva_eyebrow)     set('cms-reserva-eyebrow', map.reserva_eyebrow);
    if (map.reserva_titulo)      setHTML('cms-reserva-title', map.reserva_titulo);
    if (map.reserva_subtitulo)   set('cms-reserva-subtitle', map.reserva_subtitulo);
    if (map.reserva_highlight1)  set('cms-reserva-h1', map.reserva_highlight1);
    if (map.reserva_highlight2)  set('cms-reserva-h2', map.reserva_highlight2);
    if (map.reserva_highlight3)  set('cms-reserva-h3', map.reserva_highlight3);
    if (map.reserva_highlight4)  set('cms-reserva-h4', map.reserva_highlight4);

    /* FAQ */
    if (map.faq_eyebrow)  set('cms-faq-eyebrow', map.faq_eyebrow);
    if (map.faq_titulo)   setHTML('cms-faq-title', map.faq_titulo);
    for (let i = 1; i <= 3; i++) {
      if (map[`faq_${i}_q`]) set(`cms-faq-${i}-q`, map[`faq_${i}_q`]);
      if (map[`faq_${i}_a`]) set(`cms-faq-${i}-a`, map[`faq_${i}_a`]);
    }

    /* Contacto */
    if (map.contacto_eyebrow)  set('cms-contacto-eyebrow', map.contacto_eyebrow);
    if (map.contacto_titulo)   setHTML('cms-contacto-title', map.contacto_titulo);
    if (map.whatsapp) {
      qsa('[data-cms="whatsapp"]').forEach(e => {
        e.textContent = map.whatsapp;
        const link = e.closest('a');
        if (link) link.href = 'https://wa.me/' + map.whatsapp.replace(/\D/g,'');
      });
    }
    if (map.instagram) {
      qsa('[data-cms="instagram"]').forEach(e => e.textContent = map.instagram);
    }
    if (map.email) {
      qsa('[data-cms="email"]').forEach(e => {
        e.textContent = map.email;
        const link = e.closest('a');
        if (link) link.href = 'mailto:' + map.email;
      });
    }
    if (map.direccion) {
      qsa('[data-cms="direccion"]').forEach(e => e.textContent = map.direccion);
    }
    if (map.tiktok) {
      qsa('[data-cms="tiktok"]').forEach(e => e.textContent = map.tiktok);
    }

    /* Footer */
    if (map.footer_tagline)   set('cms-footer-tagline', map.footer_tagline);
    if (map.footer_copyright) set('cms-footer-copyright', map.footer_copyright);

    /* Valor strip */
    for (let i = 1; i <= 6; i++) {
      if (map[`valor_${i}`]) set(`cms-valor-${i}`, map[`valor_${i}`]);
    }

    /* WhatsApp flotante */
    if (map.whatsapp) {
      const waFloat = qs('.whatsapp-float');
      if (waFloat) waFloat.href = 'https://wa.me/' + map.whatsapp.replace(/\D/g,'') + '?text=Hola%2C%20me%20interesa%20una%20reserva';
    }
  }

  /* ══════════════════════════════════════
     2. HERO CAROUSEL
  ══════════════════════════════════════ */
  async function applyHero() {
    const imgs = await apiFetch('hero_carousel');
    const active = imgs.filter(i => i.activo !== false).sort((a, b) => (a.orden || 99) - (b.orden || 99));
    if (!active.length) return;

    const heroBg = qs('.hero-bg');
    if (!heroBg) return;

    if (active.length === 1) {
      /* Un solo slide — simplemente reemplazamos la imagen */
      const img = qs('.hero-img', heroBg);
      if (img) {
        img.src = active[0].imagen_url;
        img.alt = active[0].titulo || 'Pucon Hygge Stays';
      }
      /* Textos del slide */
      _applyHeroSlideText(active[0]);
    } else {
      /* Múltiples slides — construimos carrusel */
      _buildHeroCarousel(active, heroBg);
    }
  }

  function _applyHeroSlideText(slide) {
    if (slide.titulo) {
      const h1 = qs('.hero-title');
      /* Solo reemplazamos si el campo está lleno */
      if (h1 && slide.titulo) h1.innerHTML = slide.titulo.replace(/\n/g, '<br/>');
    }
    if (slide.subtitulo) {
      const sub = qs('.hero-subtitle');
      if (sub) sub.textContent = slide.subtitulo;
    }
  }

  function _buildHeroCarousel(slides, heroBg) {
    /* Limpiar contenido previo */
    const oldImg = qs('.hero-img', heroBg);
    if (oldImg) oldImg.remove();

    /* Crear wrapper de slides */
    const track = document.createElement('div');
    track.className = 'hero-carousel-track';
    track.style.cssText = 'position:absolute;inset:0;display:flex;transition:transform 0.8s cubic-bezier(0.4,0,0.2,1);width:' + (slides.length * 100) + '%;';

    slides.forEach((slide, i) => {
      const div = document.createElement('div');
      div.style.cssText = `position:relative;width:${100/slides.length}%;flex-shrink:0;`;
      const img = document.createElement('img');
      img.src = slide.imagen_url;
      img.alt = slide.titulo || 'Pucon Hygge Stays';
      img.className = 'hero-img';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';
      div.appendChild(img);
      track.appendChild(div);
    });

    heroBg.insertBefore(track, heroBg.firstChild);

    /* Dots */
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'hero-carousel-dots';
    dotsWrap.style.cssText = 'position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);display:flex;gap:0.5rem;z-index:10;';

    let current = 0;

    function goTo(idx) {
      current = ((idx % slides.length) + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * (100 / slides.length)}%)`;
      dotsWrap.querySelectorAll('.hc-dot').forEach((d, i) => d.classList.toggle('active', i === current));
      _applyHeroSlideText(slides[current]);
    }

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'hc-dot' + (i === 0 ? ' active' : '');
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,${i===0?'1':'0.4'});border:none;cursor:pointer;padding:0;transition:all 0.3s ease;`;
      dot.addEventListener('click', () => goTo(i));
      dot.classList.toggle('active', i === 0);
      dotsWrap.appendChild(dot);
    });

    /* Estilo dot activo via JS */
    dotsWrap.addEventListener('click', () => {
      dotsWrap.querySelectorAll('.hc-dot').forEach((d, i) => {
        d.style.background = i === current ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)';
        d.style.transform = i === current ? 'scale(1.3)' : 'scale(1)';
      });
    });

    /* Flechas */
    ['prev','next'].forEach(dir => {
      const btn = document.createElement('button');
      btn.className = `hero-carousel-${dir}`;
      btn.innerHTML = `<i class="fa-solid fa-chevron-${dir === 'prev' ? 'left' : 'right'}"></i>`;
      btn.style.cssText = `position:absolute;top:50%;transform:translateY(-50%);${dir==='prev'?'left:1.5rem':'right:1.5rem'};z-index:10;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:1rem;backdrop-filter:blur(4px);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;`;
      btn.addEventListener('click', () => goTo(current + (dir === 'next' ? 1 : -1)));
      btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.3)');
      btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.15)');
      heroBg.appendChild(btn);
    });

    /* Touch swipe */
    let touchX = 0;
    heroBg.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    heroBg.addEventListener('touchend', e => {
      const diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
    });

    heroBg.appendChild(dotsWrap);
    _applyHeroSlideText(slides[0]);

    /* Auto-avance */
    setInterval(() => goTo(current + 1), 5500);
  }

  /* ══════════════════════════════════════
     3. DEPARTAMENTOS dinámicos
  ══════════════════════════════════════ */
  async function applyDepartamentos() {
    const [deptos, fotos] = await Promise.all([
      apiFetch('departamentos'),
      apiFetch('depto_fotos')
    ]);
    if (!deptos.length) return;

    /* Ordenar y filtrar solo activos */
    const active = deptos
      .filter(d => d.activo !== false)
      .sort((a, b) => (a.orden || 99) - (b.orden || 99))
      .slice(0, 3);

    if (!active.length) return;

    const grid = qs('.apartments-grid');
    if (!grid) return;

    grid.innerHTML = active.map((d, idx) => {
      const dFotos = fotos
        .filter(f => f.depto_id === d.id && f.activo !== false)
        .sort((a, b) => (a.orden || 99) - (b.orden || 99));

      const isFeatured = idx === 1 || (d.precio_noche && active.reduce((m, x) => Math.max(m, x.precio_noche || 0), 0) === d.precio_noche);
      const sliderId = `slider-dyn-${d.id}`;
      const dotsId  = `dots-dyn-${d.id}`;
      const slug = d.slug || _slug(d.nombre);
      const price = (d.precio_noche || 0).toLocaleString('es-CL');
      const amenList = Array.isArray(d.amenidades) ? d.amenidades : (d.amenidades ? d.amenidades.split('\n') : []);

      let imagesHTML = '';
      if (dFotos.length > 0) {
        imagesHTML = dFotos.map(f => `<img src="${f.imagen_url}" alt="${f.titulo || d.nombre}" loading="lazy" />`).join('');
      } else {
        /* Fallback: imagen principal del depto */
        const fallback = d.imagen_principal || `images/201/01-living-sala.jpg`;
        imagesHTML = `<img src="${fallback}" alt="${d.nombre}" />`;
      }

      const hasSlider = dFotos.length > 1;
      const badgeText = d.badge || (isFeatured ? 'Premium · Más grande' : `${d.capacidad || '?'} personas`);
      const tagText = d.tag || `${d.dormitorios || '?'} dorm · Hasta ${d.capacidad || '?'} personas`;
      const aptName = d.nombre || 'Departamento';
      const aptNum  = d.numero || '';
      const aptDesc = d.descripcion || d.descripcion_corta || '';

      return `
      <article class="apt-card ${isFeatured ? 'apt-card-featured' : ''}">
        <div class="apt-card-image">
          ${hasSlider ? `
          <div class="apt-slider" id="${sliderId}">
            <div class="apt-slides">${imagesHTML}</div>
            <button class="apt-slide-btn apt-slide-prev" onclick="aptSlide('${sliderId}',-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="apt-slide-btn apt-slide-next" onclick="aptSlide('${sliderId}',1)"><i class="fa-solid fa-chevron-right"></i></button>
            <div class="apt-slide-dots" id="${dotsId}"></div>
          </div>` : `<div class="apt-slider" id="${sliderId}"><div class="apt-slides">${imagesHTML}</div><div class="apt-slide-dots" id="${dotsId}"></div></div>`}
          <div class="apt-badge ${isFeatured ? 'badge-featured' : ''}">${badgeText}</div>
          <div class="apt-tag">${tagText}</div>
        </div>
        <div class="apt-card-body">
          <h3 class="apt-name">Departamento <em>${aptName}</em>${aptNum ? ` <span style="font-size:0.75rem;color:${isFeatured?'rgba(255,255,255,0.55)':'var(--mid)'};font-family:var(--font-body);font-weight:500;">${aptNum}</span>` : ''}</h3>
          <p class="apt-desc">${aptDesc}</p>
          <ul class="apt-amenities">
            ${amenList.slice(0, 5).map(a => `<li><i class="fa-solid fa-check"></i> ${a}</li>`).join('')}
          </ul>
          <div class="apt-price">
            <div class="price-block">
              <span class="price-label">Desde</span>
              <span class="price-amount">$${price}</span>
              <span class="price-per">/ noche</span>
            </div>
            <a href="#reserva" class="btn btn-primary btn-sm" data-apt="${aptName}">Reservar</a>
          </div>
        </div>
      </article>`;
    }).join('');

    /* Reinicializar sliders para los nuevos elementos */
    _initDynSliders();
  }

  function _initDynSliders() {
    const sliders = {};

    function buildDots(sliderId, count) {
      const dotsId = sliderId.replace('slider-', 'dots-');
      const dotsEl = el(dotsId);
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('button');
        dot.className = 'apt-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Foto ' + (i+1));
        dot.addEventListener('click', () => goTo(sliderId, i));
        dotsEl.appendChild(dot);
      }
    }

    function updateDots(sliderId, index) {
      const dotsId = sliderId.replace('slider-', 'dots-');
      const dotsEl = el(dotsId);
      if (!dotsEl) return;
      dotsEl.querySelectorAll('.apt-dot').forEach((d, i) => d.classList.toggle('active', i === index));
    }

    function goTo(sliderId, index) {
      const s = sliders[sliderId];
      if (!s) return;
      s.current = ((index % s.count) + s.count) % s.count;
      s.track.style.transform = `translateX(-${s.current * 100}%)`;
      updateDots(sliderId, s.current);
    }

    /* Exponer aptSlide para botones inline */
    const origAptSlide = window.aptSlide;
    window.aptSlide = function(sliderId, dir) {
      if (sliders[sliderId]) {
        goTo(sliderId, sliders[sliderId].current + dir);
      } else if (origAptSlide) {
        origAptSlide(sliderId, dir);
      }
    };

    document.querySelectorAll('.apt-slider').forEach(elSlider => {
      const id = elSlider.id;
      if (sliders[id]) return; /* ya inicializado */
      const track = elSlider.querySelector('.apt-slides');
      const imgs = track ? track.querySelectorAll('img') : [];
      const count = imgs.length;
      if (!count) return;
      sliders[id] = { track, count, current: 0 };
      buildDots(id, count);

      let startX = 0;
      elSlider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      elSlider.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) window.aptSlide(id, diff > 0 ? 1 : -1);
      });

      if (count > 1) setInterval(() => window.aptSlide(id, 1), 5000);
    });
  }

  /* ══════════════════════════════════════
     4. VIVE PUCÓN — Actividades
  ══════════════════════════════════════ */
  async function applyActividades() {
    const acts = await apiFetch('actividades_pucon');
    const active = acts.filter(a => a.activo !== false).sort((a, b) => (a.orden || 99) - (b.orden || 99));
    if (!active.length) return;

    const grid = qs('.exp-grid');
    if (!grid) return;

    const iconMap = {
      0: 'fa-water', 1: 'fa-mountain', 2: 'fa-hot-tub-person',
      3: 'fa-person-hiking', 4: 'fa-fork-knife', 5: 'fa-person-skiing'
    };

    grid.innerHTML = active.map((a, i) => `
      <div class="exp-card">
        <div class="exp-img">
          <img src="${a.imagen_url || 'images/207/07-terraza.jpg'}" alt="${a.titulo || ''}" loading="lazy" onerror="this.src='images/207/07-terraza.jpg'" />
        </div>
        <div class="exp-body">
          <div class="exp-icon"><i class="fa-solid ${iconMap[i] || 'fa-star'}"></i></div>
          <h3>${a.titulo || ''}</h3>
          <p>${a.descripcion || ''}</p>
        </div>
      </div>`).join('');
  }

  /* ══════════════════════════════════════
     5. ÁREAS COMUNES — Galería
  ══════════════════════════════════════ */
  async function applyAreasComunes() {
    const fotos = await apiFetch('areas_comunes_fotos');
    const active = fotos.filter(f => f.activo !== false).sort((a, b) => (a.orden || 99) - (b.orden || 99));
    if (!active.length) return;

    const galeria = qs('.comunes-gallery');
    if (!galeria) return;

    galeria.innerHTML = active.map(f => `
      <div class="comunes-gallery-item">
        <img src="${f.imagen_url}" alt="${f.titulo || 'Área común'}" loading="lazy" onerror="this.parentElement.style.display='none'" />
        <div class="gal-overlay"><span>${f.titulo || ''}</span></div>
      </div>`).join('');
  }

  /* ══════════════════════════════════════
     6. PLAYA / MARINA — Galería
  ══════════════════════════════════════ */
  async function applyPlayaFotos() {
    const fotos = await apiFetch('playa_fotos');
    const active = fotos.filter(f => f.activo !== false).sort((a, b) => (a.orden || 99) - (b.orden || 99));
    if (!active.length) return;

    /* Galería visual de la sección marina */
    const marinaGal = qs('.marina-gallery');
    if (marinaGal) {
      const [main, ...thumbs] = active;

      /* Imagen principal */
      const mainDiv = qs('.marina-main', marinaGal);
      if (mainDiv && main) {
        const img = qs('img', mainDiv);
        if (img) { img.src = main.imagen_url; img.alt = main.titulo || 'Playa privada'; }
      }

      /* Thumbnails */
      const thumbDivs = qsa('.marina-thumb', marinaGal);
      thumbs.slice(0, thumbDivs.length).forEach((foto, i) => {
        const img = qs('img', thumbDivs[i]);
        if (img) { img.src = foto.imagen_url; img.alt = foto.titulo || 'Playa'; }
      });

      /* Si hay más thumbs que divs, añadir nuevos */
      if (thumbs.length > thumbDivs.length) {
        thumbs.slice(thumbDivs.length).forEach(foto => {
          const div = document.createElement('div');
          div.className = 'marina-thumb';
          div.innerHTML = `<img src="${foto.imagen_url}" alt="${foto.titulo || 'Playa'}" loading="lazy" /><div class="marina-overlay"></div>`;
          marinaGal.appendChild(div);
        });
      }
    }

    /* Textos de amenidades de playa desde el CMS ya se maneja en applyCMS */
  }

  /* ══════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════ */
  function _slug(str) {
    if (!str) return 'depto';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  /* ══════════════════════════════════════
     INIT — carga todo en paralelo
  ══════════════════════════════════════ */
  async function init() {
    /* CMS primero (sincrónico-ish, rápido) */
    await applyCMS();

    /* Resto en paralelo */
    await Promise.all([
      applyHero(),
      applyDepartamentos(),
      applyActividades(),
      applyAreasComunes(),
      applyPlayaFotos()
    ]);

    console.log('[SiteData] ✅ Todos los datos dinámicos aplicados');
  }

  return { init };
})();

/* Ejecutar cuando el DOM esté listo */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', SiteData.init);
} else {
  SiteData.init();
}
