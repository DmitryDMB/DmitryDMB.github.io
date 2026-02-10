
// Simple reveal-on-scroll animation
const items = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  for(const e of entries){
    if(e.isIntersecting){
      e.target.classList.add('on');
      io.unobserve(e.target);
    }
  }
}, {threshold: 0.12});
items.forEach(i=>io.observe(i));

// Active link helper (fallback if no server-side)
(function(){
  const path = location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('[data-nav]');
  // remove any hardcoded active states and set correct one by current filename
  links.forEach(a=>a.classList.remove('active'));
  links.forEach(a=>{
    const href = (a.getAttribute('href') || '').trim();
    if(!href) return;
    // ignore hashes/query params when matching
    const clean = href.split('#')[0].split('?')[0];
    if(clean === path) a.classList.add('active');
  });
})();

// Mobile burger menu
(function(){
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('site-nav');
  const header = document.querySelector('header');
  if(!burger || !nav || !header) return;

  const setState = (open)=>{
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };

  burger.addEventListener('click', (e)=>{
    e.preventDefault();
    setState(!document.body.classList.contains('nav-open'));
  });

  // close when clicking a link
  nav.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=>setState(false));
  });

  // close on outside click
  document.addEventListener('click', (e)=>{
    if(!document.body.classList.contains('nav-open')) return;
    if(header.contains(e.target)) return;
    setState(false);
  });

  // close on Escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') setState(false);
  });

  // close when leaving mobile breakpoint
  const mq = window.matchMedia('(max-width: 720px)');
  const onChange = ()=>{ if(!mq.matches) setState(false); };
  if(mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);
})();


// Reviews form -> send to Telegram + save locally for preview
(function(){
  const form = document.getElementById('review-form');
  const list = document.getElementById('review-list');
  if(!form && !list) return;

  const STORAGE_KEY = 'dmb_reviews_v1';
  const tgUser = 'Dmitry_DMB';

  // --- Реальные отзывы через Google Form/Sheets ---
  // 1) Создай Google Form -> привяжи ответы к Google Sheet.
  // 2) В Google Sheet: File -> Share -> Publish to web -> CSV.
  // 3) Вставь сюда ссылку на CSV опубликованной таблицы:
  const SHEET_CSV_URL = '';
  // (опционально) ссылка на Google Form для кнопки "Оставить отзыв":
  const GOOGLE_FORM_URL = '';


  const publicBox = document.getElementById('review-public');
  const PUBLIC_URL = 'reviews.json'; // публичные отзывы (лежит в корне репозитория)

  
  function parseCsv(text){
    // простой CSV парсер (подходит для Google Sheets CSV)
    const rows = text.trim().split(/\r?\n/).map(r=>r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/));
    if(rows.length<2) return [];
    const headers = rows[0].map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
    const idx = (name)=>headers.indexOf(name);
    const iName = idx('name')>-1?idx('name'):idx('имя');
    const iCity = idx('city')>-1?idx('city'):idx('город');
    const iRating = idx('rating')>-1?idx('rating'):idx('оценка');
    const iText = idx('text')>-1?idx('text'):idx('текст');
    const iDate = idx('date')>-1?idx('date'):idx('дата');
    return rows.slice(1).filter(r=>r.length>1).map(r=>{
      const clean=(v)=>String(v||'').replace(/^"|"$/g,'').replace(/""/g,'"').trim();
      return {
        name: clean(r[iName]) || 'Аноним',
        city: clean(r[iCity]) || '',
        rating: Math.max(1, Math.min(5, parseInt(clean(r[iRating])||'5',10) || 5)),
        text: clean(r[iText]) || '',
        date: clean(r[iDate]) || ''
      };
    }).filter(x=>x.text);
  }

  function wireGoogleFormButton(){
    const btn = document.getElementById('google-form-btn');
    if(!btn) return;
    if(GOOGLE_FORM_URL){
      btn.href = GOOGLE_FORM_URL;
      btn.style.display = '';
    }else{
      btn.style.display = 'none';
    }
  }

function renderPublic(items){
    if(!publicBox) return;
    if(!Array.isArray(items) || items.length===0){
      publicBox.innerHTML = '<div class="card"><p class="sub" style="margin:0">Публичных отзывов пока нет. Будь первым 🙂</p></div>';
      return;
    }
    publicBox.innerHTML = items.map(it=>{
      const stars = '★★★★★'.slice(0, Math.max(1, Math.min(5, Number(it.rating)||5)));
      const when = it.date ? new Date(it.date).toLocaleDateString('ru-RU') : '';
      return `
        <div class="review-item">
          <div class="meta">
            <strong>${escapeHtml(it.name||'Аноним')}</strong>
            <span class="stars">${stars}</span>
            <span>${escapeHtml(it.city||'')}</span>
            <span>${when}</span>
          </div>
          <div class="text">${escapeHtml(it.message||'')}</div>
        </div>
      `;
    }).join('');
    // animate in
    requestAnimationFrame(()=>{
      [...publicBox.querySelectorAll('.review-item')].forEach((el,i)=>{
        el.style.animationDelay = `${i*80}ms`;
        el.classList.add('in');
      });
    });
  }

  async function loadPublic(){
    if(!publicBox) return;
    try{
      const res = await fetch(PUBLIC_URL, { cache: 'no-store' });
      if(!res.ok) throw new Error('bad status');
      const data = await res.json();
      renderPublic(data);
    }catch(e){
      // если файл пока не добавлен/не доступен
      publicBox.innerHTML = '<div class="card"><p class="sub" style="margin:0">Не удалось загрузить публичные отзывы. Попробуй обновить страницу позже.</p></div>';
    }
  }


  function escapeHtml(s){
    return (s||'').replace(/[&<>"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function save(arr){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0,20))); }catch(e){}
  }
  function render(){
    if(!list) return;
    const items = load();
    if(items.length === 0){
      list.innerHTML = '<div class="card reveal on"><p class="sub" style="margin:0">Пока тут пусто. Оставь первый отзыв 🙂</p></div>';
      return;
    }
    list.innerHTML = items.map(it=>{
      const stars = '★★★★★'.slice(0, Math.max(1, Math.min(5, Number(it.rating)||5)));
      const when = new Date(it.ts||Date.now()).toLocaleDateString('ru-RU');
      return `
        <div class="review-item">
          <div class="meta">
            <strong>${escapeHtml(it.name||'Аноним')}</strong>
            <span class="stars">${stars}</span>
            <span>${escapeHtml(it.city||'')}</span>
            <span>${when}</span>
          </div>
          <div class="text">${escapeHtml(it.message||'')}</div>
        </div>
      `;
    }).join('');
  }

  render();
  loadPublic();

  if(!form) return;

  function buildText(data){
    const lines = [
      'Отзыв для Dmitry Black',
      `Имя: ${data.name}`,
      data.city ? `Город/часовой пояс: ${data.city}` : null,
      `Оценка: ${data.rating}/5`,
      '---',
      data.message
    ].filter(Boolean);
    return lines.join('\n');
  }

  const copyBtn = document.getElementById('review-copy');
  if(copyBtn){
    copyBtn.addEventListener('click', async ()=>{
      const fd = new FormData(form);
      const data = {
        name: (fd.get('name')||'').toString().trim(),
        city: (fd.get('city')||'').toString().trim(),
        rating: (fd.get('rating')||'5').toString(),
        message: (fd.get('message')||'').toString().trim(),
      };
      const text = buildText(data);
      try{
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Скопировано ✓';
        setTimeout(()=>copyBtn.textContent='Скопировать текст', 1400);
      }catch(e){
        // fallback
        prompt('Скопируй текст:', text);
      }
    });
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      name: (fd.get('name')||'').toString().trim(),
      city: (fd.get('city')||'').toString().trim(),
      rating: (fd.get('rating')||'5').toString(),
      message: (fd.get('message')||'').toString().trim(),
      ts: Date.now()
    };
    if(!data.name || !data.message) return;

    // Save locally
    const arr = load();
    arr.unshift(data);
    save(arr);
    render();

    // Open Telegram with prefilled text
    const text = buildText(data);
    const url = `https://t.me/${tgUser}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');

    // small UX
    const btn = form.querySelector('button[type="submit"]');
    if(btn){
      const prev = btn.textContent;
      btn.textContent = 'Открываю Telegram…';
      setTimeout(()=>btn.textContent = prev, 1200);
    }
  });
})();


// Gallery: hover/autoplay previews + lightbox
(function(){
  const box = document.getElementById('lightbox');
  const inner = document.getElementById('lbInner');
  const closeBtn = document.getElementById('lbClose');
  const triggers = document.querySelectorAll('.media-open[data-kind][data-src]');
  if(!box || !inner || !closeBtn || !triggers.length) return;

  // Убираем значок «плей» на превью видео в галерее.
  // Работает и для новых карточек, если их добавят с таким же классом.
  document.querySelectorAll('.gallery-grid .play-ico').forEach(el => el.remove());

  const open = (kind, src)=>{
    inner.innerHTML = '';
    let el;
    if(kind === 'video'){
      el = document.createElement('video');
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.preload = 'auto';
      el.loop = false;

      const s = document.createElement('source');
      s.src = src;
      const ext = (src.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
      s.type = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      el.appendChild(s);

      // iOS/Safari sometimes doesn't dispatch 'ended' reliably; add a small near-end guard.
      const NEAR_END = 0.35; // seconds
      let watchdog = null;
      let lastT = -1;
      const stopHard = ()=>{
        try{ el.pause(); }catch(e){}
        try{
          const d = el.duration;
          if(Number.isFinite(d) && d > 0) el.currentTime = Math.max(0, d - 0.02);
        }catch(e){}
        if(watchdog){ clearInterval(watchdog); watchdog = null; }
      };

      el.addEventListener('ended', stopHard, { once: true });
      el.addEventListener('error', stopHard);

      el.addEventListener('loadedmetadata', ()=>{
        if(watchdog) return;
        watchdog = setInterval(()=>{
          if(!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
          const t = el.currentTime || 0;
          const d = el.duration || 0;

          // if we're close to the end and time isn't moving, force-stop
          if(d - t <= NEAR_END){
            if(lastT >= 0 && Math.abs(t - lastT) < 0.001){
              stopHard();
            }
          }
          lastT = t;
        }, 250);
      }, { once: true });

      // Ensure cleanup if user closes the lightbox while playing
      el.__stopHard = stopHard;
    } else {
      el = document.createElement('img');
      el.src = src;
      el.alt = '';
      el.loading = 'eager';
    }
    inner.appendChild(el);
    box.classList.add('on');
    box.setAttribute('aria-hidden','false');
    // lock scroll
    document.body.style.overflow = 'hidden';

    // best-effort play for iOS
    if(kind === 'video'){
      const p = el.play();
      if(p && p.catch) p.catch(()=>{});
    }
  };

  const close = ()=>{
    // stop and unload any video to prevent iOS audio continuing in background
    const v = inner.querySelector('video');
    if(v){
      try{ if(v.__stopHard) v.__stopHard(); }catch(e){}
      try{ v.removeAttribute('src'); }catch(e){}
      try{ v.load(); }catch(e){}
    }

    box.classList.remove('on');
    box.setAttribute('aria-hidden','true');
    inner.innerHTML = '';
    document.body.style.overflow = '';
  };

  triggers.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      open(btn.dataset.kind, btn.dataset.src);
    });
  });

  closeBtn.addEventListener('click', close);
  box.addEventListener('click', (e)=>{
    if(e.target === box) close();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') close();
  });

  // Autoplay muted previews when visible (best-effort)
  const previews = document.querySelectorAll('video.media-preview');
  if(previews.length){
    const vio = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        const v = en.target;
        if(en.isIntersecting){
          const p = v.play();
          if(p && p.catch) p.catch(()=>{});
        } else {
          v.pause();
        }
      });
    }, {threshold: 0.25});
    previews.forEach(v=>vio.observe(v));
  }
})();


/* gallery-video-thumb-fix */
document.addEventListener('DOMContentLoaded', () => {
  const vids = document.querySelectorAll('video.gallery-video');
  vids.forEach(v => {
    const trySeek = () => {
      try {
        const t = 0.1;
// disabled preview trim
// disabled preview trim
      } catch (e) {}
    };

    v.addEventListener('loadedmetadata', trySeek, { once: true });

    if (v.readyState >= 1) {
      trySeek();
    } else {
      try { v.load(); } catch (e) {}
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(ent => {
          if (ent.isIntersecting) trySeek();
        });
      }, { threshold: 0.25 });
      io.observe(v);
    }
  });
});
