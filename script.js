
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

  // --- Scroll handling (avoid iOS video render bugs) ---
  // Раньше фиксировали body (position:fixed) для блокировки скролла.
  // На iOS/Safari это может ломать отрисовку video (чёрный экран при звуке).
  // Поэтому блокируем скролл через overflow, а позицию сохраняем вручную.
  let savedScrollY = 0;
  const lockScroll = ()=>{
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  };
  const unlockScroll = ()=>{
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    // restore exact position
    window.scrollTo(0, savedScrollY);
  };

  
  const open = (kind, src, partsCsv)=>{
    const parts = (partsCsv||'').split(',').map(s=>s.trim()).filter(Boolean);
    inner.innerHTML = '';

    if(kind === 'video'){
      // Lightbox video (full / large view)
      // For split videos (<=25MB per file) we play parts seamlessly by preloading next part.
      const v = document.createElement('video');
      v.controls = true;              // в большом просмотре удобно оставить управление
      // autoplay в iOS со звуком может блокироваться, но клик пользователя считается жестом.
      // Всё равно ставим autoplay=true и дополнительно вызываем play() best-effort.
      v.autoplay = true;
      // IMPORTANT (iOS/Safari):
      // Если НЕ ставить playsinline, Safari часто уводит видео в нативный fullscreen слой.
      // При закрытии лайтбокса после такого fullscreen бывает «чёрный экран»/зависание.
      // Поэтому в лайтбоксе играем inline, но сам лайтбокс занимает весь экран (100vw/100vh).
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');

      v.preload = 'auto';
      v.loop = false;
      v.muted = false;
      v.style.width = '100%';
      v.style.height = '100%';
      v.style.maxHeight = '100%';
      v.style.display = 'block';

      const list = parts.length ? parts : [src];
      let idx = 0;

      const setSrc = (file)=>{
        // swap source safely (важно для iOS: используем src напрямую, без innerHTML)
        try{ v.pause(); }catch(e){}
        v.src = file;
        try{ v.load(); }catch(e){}
      };

      // preload helper
      const preload = (file)=>{
        try{
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'video';
          link.href = file;
          const ext = (file.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
          link.type = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
          document.head.appendChild(link);
        }catch(e){}
      };

      // initial
      setSrc(list[0]);
      if(list[1]) preload(list[1]);

      // Ensure playback starts reliably after load (Safari sometimes ignores immediate play())
      const tryPlay = ()=>{
        try{
          const p = v.play();
          if(p && p.catch) p.catch(()=>{});
        }catch(e){}
      };
      v.addEventListener('canplay', tryPlay, { once: true });

      // НЕ форсим requestFullscreen / webkitEnterFullscreen — это главный источник багов на iOS.
      // Пользователь всё равно может включить fullscreen через системную кнопку плеера.

      v.addEventListener('ended', ()=>{
        idx += 1;
        if(idx >= list.length) return;
        setSrc(list[idx]);
        // start playing next part, and preload the following
        const p = v.play();
        if(p && p.catch) p.catch(()=>{});
        if(list[idx+1]) preload(list[idx+1]);
      });

      inner.appendChild(v);

      // show lightbox
      box.classList.add('is-video');
      box.classList.add('on');
      box.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow = 'hidden';
      lockScroll();

      // start play (best-effort)
      tryPlay();
      return;
    }

    // image
    box.classList.remove('is-video');
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'eager';
    img.decoding = 'async';
    img.src = src;
    inner.appendChild(img);

    box.classList.add('on');
    box.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
    lockScroll();
  };

  const close = ()=>{
    // На iOS/Safari важно чистить всё «в любом случае», иначе можно остаться на чёрном экране.
    try{
      const vids = inner.querySelectorAll('video');
      vids.forEach(v=>{
        try{
          // если пользователь включил fullscreen кнопкой — выходим из него перед очисткой DOM
          if(typeof v.webkitExitFullscreen === 'function'){
            try{ v.webkitExitFullscreen(); }catch(e){}
          }
          v.pause();
          // сбрасываем источник, чтобы Safari освободил видеослой
          v.removeAttribute('src');
          v.load?.();
        }catch(e){}
      });
    }catch(e){}

    // сначала скрываем оверлей, потом чистим контент (меньше шансов поймать баг Safari)
    box.classList.remove('on');
    box.classList.remove('is-video');
    box.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow = '';

    // восстановление скролла делаем в rAF, чтобы браузер успел перерассчитать layout
    requestAnimationFrame(()=>{
      try{ inner.innerHTML = ''; }catch(e){}
      try{ unlockScroll(); }catch(e){}
    });
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

  // Превью видео в галерее:
  // - подгружаем источник только когда карточка близко к экрану
  // - сразу запускаем (muted + playsinline), чтобы не было нативного оверлея «Play»
  const previews = document.querySelectorAll('video.media-preview');
  const ensureLoaded = (v)=>{
    if(v.dataset.loaded === '1') return;
    const srcEl = v.querySelector('source[data-src]');
    if(!srcEl) return;
    const file = srcEl.getAttribute('data-src');
    if(!file) return;
    srcEl.setAttribute('src', file);
    v.dataset.loaded = '1';
    try{ v.load(); }catch(e){}
  };

  const startPlay = (v)=>{
    // iOS: важно выставить muted/playsinline ДО вызова play()
    v.muted = true;
    v.setAttribute('muted', '');
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.loop = true;
    v.autoplay = true;
    v.controls = false;
    try{ v.preload = 'metadata'; }catch(e){}

    const p = v.play();
    if(p && p.catch) p.catch(()=>{});
  };

  // best-effort: на некоторых Safari первый кадр может быть чёрным, пока не сделаем небольшой seek
  const warmFirstFrame = (v)=>{
    try{
      if(!isFinite(v.duration) || v.duration <= 0) return;
      const t = Math.min(0.08, Math.max(0.02, v.duration * 0.01));
      if(v.currentTime < t) v.currentTime = t;
    }catch(e){}
  };

  previews.forEach(v=>{
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.autoplay = true;
    v.controls = false;
    try{ v.preload = 'none'; }catch(e){}
    v.addEventListener('loadedmetadata', ()=>warmFirstFrame(v));
  });

  if('IntersectionObserver' in window && previews.length){
    const vio = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        const v = en.target;
        if(en.isIntersecting){
          ensureLoaded(v);
          startPlay(v);
        }else{
          try{ v.pause(); }catch(e){}
        }
      });
    }, {threshold: 0.01, rootMargin: '350px 0px 350px 0px'});

    previews.forEach(v=>vio.observe(v));
  }else{
    // fallback (очень старые браузеры): грузим и пробуем запустить все
    previews.forEach(v=>{ ensureLoaded(v); startPlay(v); });
  }
})();
