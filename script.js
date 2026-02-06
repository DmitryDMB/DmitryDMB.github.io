
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
