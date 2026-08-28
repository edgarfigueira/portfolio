(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s){
    return String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function renderHighlights(){
    const host=document.getElementById('highlightsList');
    if(!host) return;
    const items=window.SITE_CONFIG?.homepage?.highlights || [];
    const works=window.SCIENTIFIC_WORKS || [];
    host.innerHTML=items.map(item=>{
      const w=works.find(x=>x.id===item.id); if(!w) return '';
      const region=window.REGIONS?.[w.region]?.name || '';
      return `<a class="selected-item" href="work.html?id=${encodeURIComponent(w.id)}"><span>${esc(item.label||w.year)}</span><strong>${esc(w.title)}</strong><em>${esc(region)}</em></a>`;
    }).join('');
  }

  function shuffled(items){
    const a=[...items];
    for(let i=a.length-1;i>0;i--){
      let r;
      if(window.crypto?.getRandomValues){
        const v=new Uint32Array(1); window.crypto.getRandomValues(v); r=v[0]/4294967296;
      } else r=Math.random();
      const j=Math.floor(r*(i+1)); [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function captionOf(item){ return window.siteI18n?.value(item?.caption) || ''; }

  function validGallery(){
    return (window.GALLERY_SLOTS || []).filter(x=>x && x.src);
  }

  function renderHomepageGallery(){
    const section=document.getElementById('homeAtlasPreview');
    const host=document.getElementById('homePhotoMosaic');
    const hero=document.getElementById('homeHeroField');
    const heroImg=document.getElementById('homeHeroFieldImage');
    const heroCaption=document.getElementById('homeHeroFieldCaption');
    const photos=shuffled(validGallery());

    const requested=Math.max(1,Math.min(6,Number(window.SITE_CONFIG?.homepage?.atlasPreviewCount || 4)));
    const preview=photos.slice(0,requested);

    // Keep the hero field image different from the homepage mosaic whenever possible.
    // It only appears once there are more photos than the preview needs.
    if(hero && heroImg && photos.length>requested){
      const p=photos[requested];
      hero.hidden=false;
      heroImg.src=p.src;
      const cap=captionOf(p);
      heroImg.alt=cap;
      heroCaption.textContent=cap;
    }

    if(!section || !host || preview.length===0) return;
    section.hidden=false;
    host.dataset.count=String(preview.length);
    host.innerHTML=preview.map((p,i)=>{
      const ratio=p.ratio && p.ratio!=='auto' ? p.ratio : (i===1 ? 'portrait' : 'landscape');
      const cap=captionOf(p);
      return `<a class="home-photo ${esc(ratio)} home-photo-${i+1}" href="atlas.html" aria-label="${esc(cap || (window.siteI18n?.t('atlas_title') || 'Field atlas'))}"><img src="${esc(p.src)}" alt="${esc(cap)}"><span>${esc(cap)}</span></a>`;
    }).join('');
  }

  function parseMetric(text){
    const raw=String(text||'').trim();
    const digits=raw.replace(/[^0-9.-]/g,'');
    const value=Number(digits);
    return Number.isFinite(value) ? value : null;
  }

  function metricFormat(el,value){
    const original=el.dataset.countOriginal || el.textContent || '';
    const hasComma=/,/.test(original);
    const locales={pt:'pt-PT',es:'es-ES',en:'en-GB',de:'de-DE',fr:'fr-FR',it:'it-IT',no:'nb-NO',zh:'zh-CN'};
    return Math.round(value).toLocaleString(locales[document.documentElement.lang]||'en-GB', {useGrouping:hasComma || value>=1000});
  }

  function animateMetric(el){
    if(el.dataset.counted==='1') return;
    const target=parseMetric(el.textContent);
    if(target===null) return;
    el.dataset.countOriginal=el.textContent;
    if(reduceMotion){ el.dataset.counted='1'; return; }
    const duration=Math.min(1450,700+Math.log10(Math.max(10,target))*190);
    const start=performance.now();
    el.textContent='0';
    function frame(now){
      const p=Math.min(1,(now-start)/duration);
      const eased=1-Math.pow(1-p,4);
      el.textContent=metricFormat(el,target*eased);
      if(p<1) requestAnimationFrame(frame);
      else { el.textContent=metricFormat(el,target); el.dataset.counted='1'; }
    }
    requestAnimationFrame(frame);
  }

  function setupMetricCounter(){
    const box=document.getElementById('homeMetrics');
    if(!box) return;
    const metrics=()=>[...box.querySelectorAll('[data-count-metric]')];
    let activated=false;

    const run=()=>{
      activated=true;
      metrics().forEach(animateMetric);
    };

    if(!('IntersectionObserver' in window) || reduceMotion){
      run();
    }else{
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){ run(); observer.disconnect(); }
        });
      },{threshold:.35});
      observer.observe(box);
    }

    window.addEventListener('scientific-metric-value',event=>{
      const source=event.detail?.source;
      if(!source) return;
      const el=box.querySelector(`[data-live-citation="${source}"]`);
      if(!el) return;
      delete el.dataset.counted;
      delete el.dataset.countOriginal;
      if(activated) animateMetric(el);
    });
  }

  function setupReveal(){
    const nodes=[...document.querySelectorAll('[data-reveal]')];
    if(!nodes.length) return;
    if(reduceMotion || !('IntersectionObserver' in window)){
      nodes.forEach(n=>n.classList.add('is-visible')); return;
    }
    nodes.forEach(n=>n.classList.add('reveal-ready'));
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    },{threshold:.08,rootMargin:'0px 0px -7% 0px'});
    nodes.forEach(n=>obs.observe(n));
  }

  function setupParallax(){
    const el=document.querySelector('[data-home-parallax]');
    if(!el || reduceMotion) return;
    let ticking=false;
    function update(){
      const rect=el.getBoundingClientRect();
      const viewport=window.innerHeight || 800;
      const progress=Math.max(-1,Math.min(1,(viewport*.48-rect.top)/viewport));
      el.style.setProperty('--home-photo-shift', `${Math.max(-8,Math.min(15,progress*12))}px`);
      ticking=false;
    }
    function onScroll(){ if(!ticking){ requestAnimationFrame(update); ticking=true; } }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll,{passive:true});
    update();
  }

  function init(){
    renderHighlights();
    renderHomepageGallery();
    setupMetricCounter();
    setupReveal();
    setupParallax();
  }

  window.onSiteDataReady(init);
})();
