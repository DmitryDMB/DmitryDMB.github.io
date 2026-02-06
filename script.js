
// Telegram deep-link helper (better on iOS)
function openTelegramLink(href){
  try{
    const u = new URL(href, window.location.href);
    const domain = u.pathname.replace(/^\//,'').split('/')[0];
    const text = u.searchParams.get('text');
    let deep = 'tg://resolve?domain=' + encodeURIComponent(domain);
    if(text){ deep += '&text=' + encodeURIComponent(text); }
    // try app
    window.location.href = deep;
    // fallback to web
    setTimeout(function(){ window.open(href, '_blank', 'noopener'); }, 600);
  }catch(e){
    window.open(href, '_blank', 'noopener');
  }
}

document.addEventListener('click', function(e){
  const a = e.target && e.target.closest ? e.target.closest('a[data-tg]') : null;
  if(!a) return;
  const href = a.getAttribute('href');
  if(!href) return;
  e.preventDefault();
  openTelegramLink(href);
});


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
  document.querySelectorAll('[data-nav]').forEach(a=>{
    if(a.getAttribute('href') === path) a.classList.add('active');
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
      'Отзыв для DMITRY_BLACK',
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
