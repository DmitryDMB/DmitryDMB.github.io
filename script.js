
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

  // Try to enter fullscreen for video when user clicks a thumbnail.
  // Works in most modern browsers; on iOS Safari falls back to webkitEnterFullscreen.
  const tryFullscreen = (videoEl)=>{
    if(!videoEl) return;
    const req = videoEl.requestFullscreen
      || videoEl.webkitRequestFullscreen
      || videoEl.mozRequestFullScreen
      || videoEl.msRequestFullscreen;
    try{
      if(req) return req.call(videoEl);
      if(typeof videoEl.webkitEnterFullscreen === 'function') return videoEl.webkitEnterFullscreen();
    }catch(e){}
  };

  // Убираем значок «плей» на превью видео в галерее.
  // Работает и для новых карточек, если их добавят с таким же классом.
  document.querySelectorAll('.gallery-grid .play-ico').forEach(el => el.remove());

  const open = (kind, src, partsCsv)=>{
    const parts = (partsCsv||'').split(',').map(s=>s.trim()).filter(Boolean);
    let partIndex = 0;
    inner.innerHTML = '';
    let el;
    if(kind === 'video'){
      // If a video is split into multiple files (to fit GitHub's web upload limit),
      // hint the browser to start fetching the next parts early to avoid "sticking".
      if(parts.length > 1){
        try{
          parts.slice(1).forEach(p=>{
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'video';
            link.href = p;
            const ext = (p.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
            link.type = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
            document.head.appendChild(link);
          });
        }catch(e){}
      }

      el = document.createElement('video');
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.preload = 'auto';
      el.loop = false;
      el.muted = false;
      el.volume = 1;

      const s = document.createElement('source');
      s.src = (parts.length ? parts[0] : src);
      const ext = ((parts.length ? parts[0] : src).split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
      s.type = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      el.appendChild(s);
      // If the video is split into parts (<25MB each for GitHub web upload),
      // play them with a "double-buffer" approach to avoid black gaps between files.
      // (We keep two <video> elements and cross-switch when the next part is ready.)
      if(parts.length > 1){
        el.controls = false; // we'll show controls on the wrapper's active video only
        el.style.display = 'none';

        const wrap = document.createElement('div');
        wrap.className = 'lightbox-video-wrap';
        wrap.style.position = 'relative';
        wrap.style.width = 'min(92vw, 1000px)';
        wrap.style.maxHeight = '80vh';

        const mk = () => {
          const v = document.createElement('video');
          v.controls = true;
          v.autoplay = false;
          v.playsInline = true;
          v.preload = 'auto';
          v.loop = false;
          v.muted = false;
          v.volume = 1;
          v.style.width = '100%';
          v.style.height = 'auto';
          v.style.maxHeight = '80vh';
          v.style.display = 'block';
          v.style.position = 'absolute';
          v.style.left = '0';
          v.style.top = '0';
          v.style.transition = 'opacity 120ms linear';
          v.style.opacity = '0';
          return v;
        };

        const vA = mk();
        const vB = mk();
        vA.style.opacity = '1';
        vA.style.position = 'relative'; // first video defines layout height
        vB.style.position = 'absolute';

        wrap.appendChild(vA);
        wrap.appendChild(vB);
        inner.appendChild(wrap);

        const extType = (u)=>{
          const ext = (u.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
          return ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        };

        const loadSrc = (v, url)=>{
          // Use <source> for type hints (helps Safari)
          while(v.firstChild) v.removeChild(v.firstChild);
          const s = document.createElement('source');
          s.src = url;
          s.type = extType(url);
          v.appendChild(s);
          try{ v.load(); }catch(e){}
        };

        let idx = 0;             // currently playing part index
        let active = vA;
        let standby = vB;
        let switching = false;
        let standbyReady = false;

        const primeStandby = ()=>{
          standbyReady = false;
          const next = parts[idx+1];
          if(!next) return;
          loadSrc(standby, next);

          const onReady = ()=>{
            standbyReady = true;
            standby.removeEventListener('canplaythrough', onReady);
            standby.removeEventListener('canplay', onReady);
          };
          standby.addEventListener('canplaythrough', onReady, { once:true });
          standby.addEventListener('canplay', onReady, { once:true });
        };

        const swapToStandby = ()=>{
          if(!standbyReady || switching) return;
          switching = true;

          // Start the next part slightly before the current ends, so the user never sees black.
          try{
            standby.currentTime = 0;
          }catch(e){}
          const p = standby.play();
          if(p && p.catch) p.catch(()=>{});

          // Visual swap
          standby.style.opacity = '1';
          active.style.opacity = '0';

          // After a short moment, pause the old one and reuse it as the next standby
          window.setTimeout(()=>{
            try{ active.pause(); }catch(e){}
            // Move layout anchor to the now-active video
            active.style.position = 'absolute';
            standby.style.position = 'relative';

            const tmp = active;
            active = standby;
            standby = tmp;

            idx += 1;
            switching = false;
            primeStandby();
          }, 140);
        };

        const maybeSwapSoon = ()=>{
          if(!parts[idx+1]) return;
          const d = active.duration;
          if(!isFinite(d) || d <= 0) return;
          const remaining = d - active.currentTime;
          // Start the next segment a bit early (tuned to reduce visible gaps).
          if(remaining < 0.35) swapToStandby();
        };

        // Start first part
        loadSrc(active, parts[0]);
        const startFirst = ()=>{
          const p = active.play();
          if(p && p.catch) p.catch(()=>{});
        };

        active.addEventListener('timeupdate', maybeSwapSoon);
        active.addEventListener('ended', ()=>{
          // Fallback: if we didn't swap early, swap at end (still avoids black if standby is ready).
          if(parts[idx+1]) swapToStandby();
        });

        // Whenever we switch active/standby, we need listeners on the *current* active.
        const rebindActiveListeners = ()=>{
          // Remove from both then add to active
          [vA, vB].forEach(v=>{
            v.removeEventListener('timeupdate', maybeSwapSoon);
          });
          active.addEventListener('timeupdate', maybeSwapSoon);
          active.addEventListener('ended', ()=>{
            if(parts[idx+1]) swapToStandby();
          });
        };

        // Patch swap to also rebind listeners
        const originalSwap = swapToStandby;
        // We can't reassign const; so hook rebind inside timeout above by calling here
        const _swap = ()=>{
          originalSwap();
          rebindActiveListeners();
        };
        // Replace references used by events
        // (events call swapToStandby directly; keep as-is because rebind runs after switch)
        // Prime next and start
        primeStandby();
        // Ensure the first video starts after it can play (Safari)
        active.addEventListener('canplay', ()=>{ startFirst(); }, { once:true });
        // In case canplay already fired
        startFirst();

        // We've already appended wrap to inner; stop default append below
        return;
      }

      // Playback in lightbox should be full-length with sound.
      // (No extra watchdog timers that could stop playback early.)
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

      // Fullscreen + sound on click (user gesture)
      tryFullscreen(el);
    }
  };

  const close = ()=>{
    // exit fullscreen if the video requested it
    try{
      if(document.fullscreenElement) document.exitFullscreen();
      // Safari
      if(document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    }catch(e){}

    // stop and unload any video to prevent iOS audio continuing in background
    const v = inner.querySelector('video');
    if(v){
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
      open(btn.dataset.kind, btn.dataset.src, btn.dataset.parts);
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
