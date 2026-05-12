/**
 * cms-loader.js — Pucon Hygge Stays
 * Carga datos dinámicos desde Supabase REST API y actualiza el DOM del front-end.
 * Conecta el panel Admin con la página pública.
 */

'use strict';

/* ═══════════════════════════════════════════
   CONFIGURACIÓN SUPABASE
   ═══════════════════════════════════════════
   Las credenciales se leen, en orden de prioridad:
     1. window.SUPABASE_CONFIG  (definido por <script> previo en el HTML)
     2. <meta name="supabase-url"> y <meta name="supabase-anon-key">
     3. Fallback hardcodeado (NO recomendado para producción)

   Para inyectar las credenciales sin tocar este archivo, agregá en index.html
   ANTES de <script src="js/cms-loader.js" defer>:

     <script>
       window.SUPABASE_CONFIG = {
         url: 'https://vpoutrwyrtcwsvwhumwz.supabase.co/rest/v1/',
         anonKey: 'eyJhbGciOi...'
       };
     </script>
═══════════════════════════════════════════ */
const SUPABASE_CONFIG = (() => {
  // 1) Variable global (recomendado)
  if (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
    return {
      url: window.SUPABASE_CONFIG.url.replace(/\/?$/, '/'), // asegurar slash final
      anonKey: window.SUPABASE_CONFIG.anonKey
    };
  }
  // 2) Meta tags
  const metaUrl = document.querySelector('meta[name="supabase-url"]')?.content;
  const metaKey = document.querySelector('meta[name="supabase-anon-key"]')?.content;
  if (metaUrl && metaKey) {
    return { url: metaUrl.replace(/\/?$/, '/'), anonKey: metaKey };
  }
  // 3) Fallback hardcodeado
  return {
    url: 'https://vpoutrwyrtcwsvwhumwz.supabase.co/rest/v1/',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb3V0cnd5cnRjd3N2d2h1bXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTg1NDUsImV4cCI6MjA5MjUzNDU0NX0.fO0eDhVcOntA0muHFGNG8K3kwgahRVyBTMv_p7rLvDY'
  };
})();

/* ─── Helper API (Supabase REST) ───
   Mantiene la firma original cmsApi(table, params) para no romper el resto del archivo.
   Traduce el formato antiguo ('&sort=orden', '&limit=100') al formato de Supabase
   (?select=*&order=orden.asc&limit=100). */
async function cmsApi(table, params = '') {
  try {
    const url = buildSupabaseUrl(table, params);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      // Loguear pero no romper el sitio: degradación elegante
      console.warn(`[CMS] ${table} → HTTP ${res.status} ${res.statusText}`);
      return [];
    }

    const json = await res.json();
    // Supabase devuelve un array directo; el formato antiguo devolvía { data: [...] }
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  } catch (err) {
    console.warn(`[CMS] Error consultando "${table}":`, err.message || err);
    return [];
  }
}

/* Construye la URL de Supabase aplicando defaults + traduciendo el formato legacy. */
function buildSupabaseUrl(table, legacyParams = '') {
  const u = new URL(`${SUPABASE_CONFIG.url}${encodeURIComponent(table)}`);
  const sp = u.searchParams;

  // SELECT por defecto (Supabase requiere select explícito o devuelve todo)
  sp.set('select', '*');

  // Parsear params legacy del estilo "&sort=orden&limit=100&filter=col:eq:val"
  // y traducirlos a la sintaxis de Supabase (PostgREST).
  if (legacyParams) {
    // Normalizar: aceptar tanto "&a=b&c=d" como "a=b&c=d"
    const cleaned = legacyParams.replace(/^[?&]/, '');
    cleaned.split('&').filter(Boolean).forEach(pair => {
      const [rawKey, ...rest] = pair.split('=');
      const key = rawKey.trim();
      const value = rest.join('=').trim();
      if (!key) return;

      switch (key) {
        case 'sort':
        case 'order':
          // 'orden' → 'orden.asc'  |  '-orden' → 'orden.desc'
          if (value.startsWith('-')) {
            sp.set('order', `${value.slice(1)}.desc`);
          } else {
            sp.set('order', `${value}.asc`);
          }
          break;
        case 'limit':
          sp.set('limit', value);
          break;
        case 'offset':
          sp.set('offset', value);
          break;
        default:
          // Pasar tal cual (útil para filtros tipo 'activo=eq.true')
          sp.set(key, value);
      }
    });
  }

  // Default de límite si nadie lo seteó (matchea el comportamiento original "limit=100")
  if (!sp.has('limit')) sp.set('limit', '100');

  return u.toString();
}

/* ─── Helper: set text safely ─── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null && val !== '') el.textContent = val;
}
function setAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (el && val) el[attr] = val;
}

/* ═══════════════════════════════════════════
   1. CMS TEXTOS — actualiza todos los textos del sitio
═══════════════════════════════════════════ */
async function loadCMSTextos() {
  const rows = await cmsApi('cms_textos');
  if (!rows.length) return;
  const data = {};
  rows.forEach(r => { data[r.campo] = r.valor; });

  // Hero
  setText('cms-hero-eyebrow', data.hero_eyebrow);
  setText('cms-hero-title', data.hero_titulo);
  setText('cms-hero-subtitle', data.hero_subtitulo);
  setText('cms-hero-cta', data.hero_cta);
  setText('cms-hero-cta2', data.hero_cta2);
  setText('cms-stat1-val', data.hero_stat1);
  setText('cms-stat1-label', data.hero_stat1_label);
  setText('cms-stat2-val', data.hero_stat2);
  setText('cms-stat2-label', data.hero_stat2_label);

  // Valor strip
  setText('cms-valor-1', data.valor_1);
  setText('cms-valor-2', data.valor_2);
  setText('cms-valor-3', data.valor_3);
  setText('cms-valor-4', data.valor_4);
  setText('cms-valor-5', data.valor_5);
  setText('cms-valor-6', data.valor_6);

  // Nosotros
  setText('cms-nosotros-eyebrow', data.nosotros_eyebrow);
  setText('cms-nosotros-title', data.nosotros_titulo);
  setText('cms-nosotros-p1', data.nosotros_p1);
  setText('cms-nosotros-p2', data.nosotros_p2);
  setText('cms-nosotros-badge', data.nosotros_badge);
  setText('cms-nosotros-cta', data.nosotros_cta);

  // Departamentos
  setText('cms-deptos-eyebrow', data.deptos_eyebrow);
  setText('cms-deptos-title', data.deptos_titulo);
  setText('cms-deptos-subtitle', data.deptos_subtitulo);

  // Playa
  setText('cms-playa-eyebrow', data.playa_eyebrow);
  setText('cms-playa-title', data.playa_titulo);
  setText('cms-playa-subtitle', data.playa_subtitulo);
  setText('cms-playa-badge', data.playa_badge);

  // Amenities
  setText('cms-amenities-eyebrow', data.amenities_eyebrow);
  setText('cms-amenities-title', data.amenities_titulo);
  setText('cms-amenities-subtitle', data.amenities_subtitulo);

  // Vive Pucón
  setText('cms-pucon-eyebrow', data.pucon_eyebrow);
  setText('cms-pucon-title', data.pucon_titulo);
  setText('cms-pucon-subtitle', data.pucon_subtitulo);

  // Galería
  setText('cms-galeria-eyebrow', data.galeria_eyebrow);
  setText('cms-galeria-title', data.galeria_titulo);

  // Testimonios
  setText('cms-testimonios-eyebrow', data.testimonios_eyebrow);
  setText('cms-testimonios-title', data.testimonios_titulo);

  // Footer
  const tagline = document.querySelector('.footer-tagline');
  if (tagline && data.footer_tagline) tagline.textContent = data.footer_tagline;
  const copyright = document.querySelector('.footer-bottom p');
  if (copyright && data.footer_copyright) copyright.textContent = data.footer_copyright;

  // Contacto / redes sociales
  if (data.whatsapp) {
    document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
      const num = data.whatsapp.replace(/\D/g,'');
      const oldHref = a.getAttribute('href');
      // preserve message param
      const msgMatch = oldHref.match(/\?text=(.+)/);
      a.href = `https://wa.me/${num}${msgMatch ? '?text=' + msgMatch[1] : ''}`;
    });
    document.querySelectorAll('.cc-info span').forEach(span => {
      if (span.closest('.whatsapp') && span.textContent.startsWith('+')) {
        span.textContent = data.whatsapp;
      }
    });
  }
  if (data.instagram) {
    document.querySelectorAll('a[href*="instagram.com"]').forEach(a => {
      const handle = data.instagram.replace('@','');
      a.href = `https://www.instagram.com/${handle}/`;
    });
    document.querySelectorAll('.cc-info span').forEach(span => {
      if (span.closest('.instagram') && span.textContent.startsWith('@')) {
        span.textContent = data.instagram;
      }
    });
  }
}

/* ═══════════════════════════════════════════
   2. HERO CARRUSEL — reemplaza imagen estática
═══════════════════════════════════════════ */
async function loadHeroCarousel() {
  const imgs = await cmsApi('hero_carousel', '&sort=orden');
  const active = imgs.filter(i => i.activo !== false);
  if (!active.length) return; // mantener imagen estática por defecto

  const heroSection = document.getElementById('inicio');
  if (!heroSection) return;

  const heroBg = heroSection.querySelector('.hero-bg');
  if (!heroBg) return;

  if (active.length === 1) {
    // Solo una imagen: reemplazar sin carrusel
    const img = heroBg.querySelector('.hero-img');
    if (img) {
      img.src = active[0].imagen_url;
      img.alt = active[0].titulo || 'Pucon Hygge Stays';
    }
    // Actualizar textos de la imagen si tiene
    if (active[0].titulo) setText('cms-hero-title', active[0].titulo);
    if (active[0].subtitulo) setText('cms-hero-subtitle', active[0].subtitulo);
    return;
  }

  // Múltiples imágenes: construir carrusel
  heroBg.innerHTML = `
    <div class="hero-carousel-track">
      ${active.map((img, i) => `
        <div class="hero-slide ${i === 0 ? 'active' : ''}">
          <img src="${img.imagen_url}" alt="${img.titulo || 'Pucon Hygge Stays'}" class="hero-img" loading="${i === 0 ? 'eager' : 'lazy'}" />
          <div class="hero-overlay"></div>
        </div>
      `).join('')}
    </div>
    <div class="hero-carousel-dots">
      ${active.map((_, i) => `<button class="hc-dot ${i === 0 ? 'active' : ''}" aria-label="Slide ${i+1}" data-idx="${i}"></button>`).join('')}
    </div>
    <button class="hc-prev" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
    <button class="hc-next" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>
  `;

  // Inyectar CSS del carrusel si no existe
  if (!document.getElementById('hero-carousel-css')) {
    const style = document.createElement('style');
    style.id = 'hero-carousel-css';
    style.textContent = `
      .hero-carousel-track { position:absolute; inset:0; }
      .hero-slide { position:absolute; inset:0; opacity:0; transition:opacity 1s ease; }
      .hero-slide.active { opacity:1; }
      .hero-slide img { width:100%; height:100%; object-fit:cover; }
      .hero-carousel-dots { position:absolute; bottom:1.5rem; left:50%; transform:translateX(-50%); display:flex; gap:0.5rem; z-index:5; }
      .hc-dot { width:10px; height:10px; border-radius:50%; border:2px solid rgba(255,255,255,0.7); background:transparent; cursor:pointer; transition:all 0.3s; }
      .hc-dot.active { background:white; border-color:white; }
      .hc-prev, .hc-next { position:absolute; top:50%; transform:translateY(-50%); z-index:5; background:rgba(0,0,0,0.3); color:white; border:none; width:44px; height:44px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem; transition:background 0.2s; }
      .hc-prev:hover, .hc-next:hover { background:rgba(0,0,0,0.6); }
      .hc-prev { left:1.5rem; }
      .hc-next { right:1.5rem; }
    `;
    document.head.appendChild(style);
  }

  // Lógica del carrusel
  const slides = heroBg.querySelectorAll('.hero-slide');
  const dots = heroBg.querySelectorAll('.hc-dot');
  let current = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + active.length) % active.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    // Update hero text if slide has custom title
    const slide = active[current];
    if (slide.titulo) setText('cms-hero-title', slide.titulo);
    if (slide.subtitulo) setText('cms-hero-subtitle', slide.subtitulo);
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  heroBg.querySelector('.hc-prev').addEventListener('click', () => goTo(current - 1));
  heroBg.querySelector('.hc-next').addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
  resetTimer();
}

/* ═══════════════════════════════════════════
   3. FOTOS DE DEPARTAMENTOS — reemplaza sliders
═══════════════════════════════════════════ */
async function loadDepartamentosFotos() {
  const [deptos, fotos] = await Promise.all([
    cmsApi('departamentos', '&sort=orden'),
    cmsApi('depto_fotos', '&sort=orden')
  ]);
  if (!deptos.length) return;

  // Agrupar fotos por depto_id
  const fotosMap = {};
  fotos.filter(f => f.activo !== false).forEach(f => {
    if (!fotosMap[f.depto_id]) fotosMap[f.depto_id] = [];
    fotosMap[f.depto_id].push(f);
  });

  // Mapear nombre → slider DOM
  const sorted = [...deptos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const slugMap = {
    'volcan': 'slider-201',
    'lago': 'slider-207',
    'bosque': 'slider-bosque'
  };

  sorted.forEach(d => {
    const slug = aptSlugLocal(d.nombre);
    const sliderId = slugMap[slug];

    // NOTA: la visibilidad del depto (mostrar/ocultar la card)
    // la gestiona loadDepartamentosVisibility() — no la duplicamos aquí.

    if (!sliderId) return;
    const fotos = fotosMap[d.id] || [];
    if (!fotos.length) return;

    const sliderEl = document.getElementById(sliderId);
    if (!sliderEl) return;
    const track = sliderEl.querySelector('.apt-slides');
    if (!track) return;

    // Reemplazar slides con fotos de la API
    track.innerHTML = fotos.map(f =>
      `<img src="${f.imagen_url}" alt="${f.titulo || d.nombre}" loading="lazy" onerror="this.src='images/201/01-living-sala.jpg'" />`
    ).join('');

    // Reset transform
    track.style.transform = 'translateX(0)';

    // Reinicializar dots
    const dotsId = sliderId.replace('slider-', 'dots-');
    const dotsEl = document.getElementById(dotsId);
    if (dotsEl) {
      dotsEl.innerHTML = '';
      fotos.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'apt-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Foto ' + (i + 1));
        dotsEl.appendChild(dot);
      });
    }

    // Re-init slider using global aptSlide system
    if (window._cmsReinitSlider) window._cmsReinitSlider(sliderId, track, fotos.length, dotsEl);
  });
}

function aptSlugLocal(nombre) {
  if (!nombre) return 'volcan';
  const n = nombre.toLowerCase();
  if (n.includes('lago')) return 'lago';
  if (n.includes('bosque')) return 'bosque';
  return 'volcan';
}

/* ═══════════════════════════════════════════
   4. VIVE PUCÓN — actividades dinámicas
═══════════════════════════════════════════ */
async function loadActividades() {
  const acts = await cmsApi('actividades_pucon', '&sort=orden');
  const active = acts.filter(a => a.activo !== false);
  if (!active.length) return;

  const grid = document.querySelector('.exp-grid');
  if (!grid) return;

  const iconMap = {
    'lago': 'fa-water', 'volcan': 'fa-mountain', 'termas': 'fa-hot-tub-person',
    'senderismo': 'fa-person-hiking', 'parque': 'fa-person-hiking', 'gastronomia': 'fa-fork-knife',
    'gastronom': 'fa-fork-knife', 'ski': 'fa-person-skiing', 'snow': 'fa-person-skiing',
    'kayak': 'fa-water', 'aventura': 'fa-compass', 'bici': 'fa-bicycle',
    'default': 'fa-map-location-dot'
  };

  function getIcon(titulo) {
    const t = (titulo || '').toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (key !== 'default' && t.includes(key)) return icon;
    }
    return iconMap.default;
  }

  grid.innerHTML = active.map(a => `
    <div class="exp-card reveal">
      <div class="exp-img">
        <img src="${a.imagen_url || 'images/207/07-terraza.jpg'}" alt="${a.titulo || ''}" loading="lazy"
          onerror="this.src='images/207/07-terraza.jpg'" />
      </div>
      <div class="exp-body">
        <div class="exp-icon"><i class="fa-solid ${getIcon(a.titulo)}"></i></div>
        <h3>${a.titulo || ''}</h3>
        <p>${a.descripcion || ''}</p>
      </div>
    </div>
  `).join('');

  // Re-apply scroll reveal observer
  grid.querySelectorAll('.exp-card').forEach((el, i) => {
    el.dataset.delay = i * 80;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    obs.observe(el);
  });
}

/* ═══════════════════════════════════════════
   5. ÁREAS COMUNES — galería dinámica
═══════════════════════════════════════════ */
async function loadAreasComunesFotos() {
  const fotos = await cmsApi('areas_comunes_fotos', '&sort=orden');
  const active = fotos.filter(f => f.activo !== false);
  if (!active.length) return;

  const gallery = document.querySelector('.comunes-gallery');
  if (!gallery) return;

  gallery.innerHTML = active.map(f => `
    <div class="comunes-gallery-item">
      <img src="${f.imagen_url}" alt="${f.titulo || 'Área común'}" loading="lazy"
        onerror="this.src='images/comunes/piscina-exterior.jpg'" />
      <div class="gal-overlay"><span>${f.titulo || ''}</span></div>
    </div>
  `).join('');

  // Re-apply reveal animation
  gallery.querySelectorAll('.comunes-gallery-item').forEach((el, i) => {
    el.classList.add('reveal');
    el.dataset.delay = i * 80;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    obs.observe(el);
  });
}

/* ═══════════════════════════════════════════
   6. PLAYA PRIVADA — galería dinámica
═══════════════════════════════════════════ */
async function loadPlayaFotos() {
  const fotos = await cmsApi('playa_fotos', '&sort=orden');
  const active = fotos.filter(f => f.activo !== false);
  if (!active.length) return;

  const marinaGallery = document.querySelector('.marina-gallery');
  if (!marinaGallery) return;

  // El layout espera: 1 main + N thumbs (preservar clases reveal-left etc.)
  const [main, ...thumbs] = active;
  marinaGallery.innerHTML = `
    <div class="marina-main">
      <img src="${main.imagen_url}" alt="${main.titulo || 'Playa privada Lago Villarrica'}" loading="eager"
        onerror="this.src='images/marina/01-lago-playa.jpg'" />
      <div class="marina-overlay"></div>
    </div>
    ${thumbs.slice(0, 4).map(f => `
      <div class="marina-thumb">
        <img src="${f.imagen_url}" alt="${f.titulo || 'Marina'}" loading="lazy"
          onerror="this.src='images/marina/02-muelle.jpg'" />
        <div class="marina-overlay"></div>
      </div>
    `).join('')}
  `;
  // Preservar clase visible si ya se aplicó reveal
  marinaGallery.classList.add('visible');
}

/* ═══════════════════════════════════════════
   7. VISIBILIDAD DE DEPARTAMENTOS (activo/oculto)
   Oculta TODOS los elementos del front que mencionan
   un departamento marcado como inactivo en el admin.
   Cualquier elemento del HTML con [data-depto="slug"]
   se oculta cuando ese depto.activo === false.
═══════════════════════════════════════════ */
async function loadDepartamentosVisibility() {
  const deptos = await cmsApi('departamentos', '&sort=orden');
  if (!deptos.length) return;

  // Mapa { slug: activo } — default true si el campo no existe
  const estado = {};
  deptos.forEach(d => {
    const slug = aptSlugLocal(d.nombre);
    estado[slug] = d.activo !== false;
  });

  // Mostrar / ocultar TODOS los elementos con data-depto
  document.querySelectorAll('[data-depto]').forEach(el => {
    const slug = el.getAttribute('data-depto');
    if (!(slug in estado)) return; // depto desconocido, no tocar
    if (estado[slug] === false) {
      el.setAttribute('hidden', '');
      el.style.display = 'none';
    } else {
      el.removeAttribute('hidden');
      el.style.display = '';
    }
  });

  // Recalcular contador del hero ("X Departamentos")
  const counter = document.querySelector('[data-auto-count-deptos="true"]');
  if (counter) {
    const activos = Object.values(estado).filter(Boolean).length;
    counter.textContent = activos;
  }

  // Si el botón activo del calendario quedó oculto, seleccionar el primero visible
  const calBtns = document.querySelectorAll('.av-apt-btn[data-depto]');
  const activeBtn = document.querySelector('.av-apt-btn.active[data-depto]');
  const activeSlug = activeBtn?.getAttribute('data-depto');
  if (activeSlug && estado[activeSlug] === false) {
    const firstVisible = Array.from(calBtns).find(b => {
      const s = b.getAttribute('data-depto');
      return estado[s] !== false;
    });
    if (firstVisible && typeof window.avCalChangeApt === 'function') {
      window.avCalChangeApt(firstVisible.getAttribute('data-depto'));
    }
  }
}

/* ═══════════════════════════════════════════
   INIT — ejecutar todo al cargar la página
═══════════════════════════════════════════ */
async function initCMSLoader() {
  // Cargar en paralelo para máxima velocidad
  await Promise.allSettled([
    loadCMSTextos(),
    loadHeroCarousel(),
    loadActividades(),
    loadAreasComunesFotos(),
    loadPlayaFotos(),
    loadDepartamentosVisibility()
  ]);

  // Fotos de departamentos después (depende de que el DOM de sliders esté listo)
  await loadDepartamentosFotos();
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCMSLoader);
} else {
  initCMSLoader();
}

console.log('✦ CMS Loader — Pucon Hygge Stays initialized (Supabase)');
