(function(){
  const root=document.documentElement;
  const supported=['pt','es','en','de','fr','it','no','zh'];
  const saved=localStorage.getItem('site-language');
  const initial=supported.includes(saved)?saved:'pt';

  function t(key){
    const active=window.I18N?.[root.lang]||{};
    const en=window.I18N?.en||{};
    const pt=window.I18N?.pt||{};
    return active[key] || en[key] || pt[key] || key;
  }

  function value(input, lang=root.lang){
    if(input===null || input===undefined) return '';
    if(typeof input==='string' || typeof input==='number') return String(input);
    if(Array.isArray(input)) return input;
    if(typeof input==='object'){
      const preferred=input[lang];
      if(preferred!==undefined && preferred!==null && preferred!=='' && (!Array.isArray(preferred) || preferred.length)) return preferred;
      for(const fallback of ['en','pt','es','fr','de','it','no','zh']){
        const v=input[fallback];
        if(v!==undefined && v!==null && v!=='' && (!Array.isArray(v) || v.length)) return v;
      }
    }
    return '';
  }

  function list(input, lang=root.lang){
    const v=value(input,lang);
    if(Array.isArray(v)) return v;
    return v ? [v] : [];
  }


  const SEO_LOCALES={pt:'pt_PT',es:'es_ES',en:'en_GB',de:'de_DE',fr:'fr_FR',it:'it_IT',no:'nb_NO',zh:'zh_CN'};

  function absoluteSiteUrl(path=''){
    const configured=window.SITE_CONFIG?.seo?.siteUrl;
    const fallback=`${window.location.origin}/portfolio/`;
    const base=typeof configured==='string' && configured.trim()?configured.trim():fallback;
    try{return new URL(path,base.endsWith('/')?base:base+'/').href}catch{return path}
  }

  function setMeta(selector,attribute,value){
    if(!value) return;
    let el=document.querySelector(selector);
    if(!el){
      el=document.createElement('meta');
      const match=selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
      if(match) el.setAttribute(match[1],match[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attribute,value);
  }

  function setCanonical(url){
    if(!url) return;
    let el=document.querySelector('link[rel="canonical"]');
    if(!el){
      el=document.createElement('link');
      el.rel='canonical';
      el.dataset.seoCanonical='1';
      document.head.appendChild(el);
    }
    el.href=url;
  }

  function setStructuredData(id,data){
    const existing=document.getElementById(id);
    if(window.SITE_CONFIG?.seo?.structuredData===false || !data){
      existing?.remove();
      return;
    }
    const script=existing||document.createElement('script');
    script.id=id;
    script.type='application/ld+json';
    script.textContent=JSON.stringify(data);
    if(!existing) document.head.appendChild(script);
  }

  function defaultSeoImage(){
    const configured=window.SITE_CONFIG?.seo?.defaultImage || window.SITE_CONFIG?.homepage?.profileImage;
    return configured?absoluteSiteUrl(String(configured).replace(/^\//,'')):'';
  }

  function syncSeoMetadata(){
    const title=document.title.trim();
    const description=document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()||'';
    const canonicalEl=document.querySelector('link[rel="canonical"]');
    const canonical=canonicalEl?.href || window.location.href.split('#')[0];
    const siteName=window.SITE_CONFIG?.seo?.siteName || window.SITE_CONFIG?.profile?.name || 'Edgar Figueira';
    const image=defaultSeoImage();

    setMeta('meta[property="og:site_name"]','content',siteName);
    setMeta('meta[property="og:title"]','content',title);
    setMeta('meta[property="og:description"]','content',description);
    setMeta('meta[property="og:url"]','content',canonical);
    setMeta('meta[property="og:locale"]','content',SEO_LOCALES[root.lang]||'pt_PT');
    if(image){
      setMeta('meta[property="og:image"]','content',image);
      setMeta('meta[name="twitter:image"]','content',image);
    }
    setMeta('meta[name="twitter:title"]','content',title);
    setMeta('meta[name="twitter:description"]','content',description);
  }

  function buildHomepageStructuredData(){
    const cfg=window.SITE_CONFIG||{};
    const profile=cfg.profile||{};
    const seo=cfg.seo||{};
    const siteUrl=absoluteSiteUrl('');
    const image=defaultSeoImage();
    const sameAs=['orcid','researchgate','googleScholar','linkedin','github','cegot']
      .map(key=>profile[key]).filter(Boolean);
    const graph=[
      {
        '@type':'WebSite',
        '@id':siteUrl+'#website',
        url:siteUrl,
        name:seo.siteName||`${profile.name||'Edgar Figueira'} · Scientific Portfolio`,
        inLanguage:root.lang
      },
      {
        '@type':'Person',
        '@id':siteUrl+'#person',
        name:profile.name||'Edgar Figueira',
        url:siteUrl,
        image:image||undefined,
        sameAs,
        knowsAbout:['Glacial geomorphology','Palaeoglacial reconstruction','GIS','LiDAR']
      }
    ];
    setStructuredData('site-structured-data',{'@context':'https://schema.org','@graph':graph});
  }

  function isHomepage(){
    const path=window.location.pathname.replace(/\/+$/,'');
    return path.endsWith('/portfolio') || path.endsWith('/portfolio/index.html') || path==='';
  }

  function trimDescription(text,max=190){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(clean.length<=max) return clean;
    return clean.slice(0,max-1).replace(/\s+\S*$/,'')+'…';
  }

  function setWorkSeo(work){
    if(!work) return;
    const profileName=window.SITE_CONFIG?.profile?.name||'Edgar Figueira';
    const title=value(work.displayTitle)||work.title||profileName;
    const description=trimDescription(value(work.abstract)||value(work.sourceNote)||work.citation||'');
    const canonical=absoluteSiteUrl(`work.html?id=${encodeURIComponent(work.id)}`);
    const image=work.image?absoluteSiteUrl(String(work.image).replace(/^\//,'')):defaultSeoImage();
    const regionName=window.REGIONS?.[work.region]?.name||'';
    const authors=String(work.authors||'').split(';').map(name=>name.trim()).filter(Boolean).map(name=>({'@type':'Person',name}));
    const type=work.type==='article'?'ScholarlyArticle':'CreativeWork';

    setCanonical(canonical);
    document.title=`${title} · ${profileName}`;
    const descriptionMeta=document.querySelector('meta[name="description"]');
    if(descriptionMeta && description) descriptionMeta.setAttribute('content',description);
    setMeta('meta[property="og:type"]','content',work.type==='article'?'article':'website');
    setMeta('meta[property="og:site_name"]','content',window.SITE_CONFIG?.seo?.siteName||profileName);
    setMeta('meta[property="og:title"]','content',document.title);
    if(description) setMeta('meta[property="og:description"]','content',description);
    setMeta('meta[property="og:url"]','content',canonical);
    setMeta('meta[property="og:locale"]','content',SEO_LOCALES[root.lang]||'pt_PT');
    if(image){
      setMeta('meta[property="og:image"]','content',image);
      setMeta('meta[name="twitter:image"]','content',image);
    }
    setMeta('meta[property="og:image:alt"]','content',value(work.imageCaption)||title);
    setMeta('meta[name="twitter:title"]','content',document.title);
    if(description) setMeta('meta[name="twitter:description"]','content',description);

    const structured={
      '@context':'https://schema.org',
      '@type':type,
      '@id':canonical+'#work',
      name:title,
      url:canonical,
      inLanguage:root.lang,
      author:authors.length?authors:undefined,
      datePublished:work.year?String(work.year):undefined,
      description:description||undefined,
      image:image||undefined,
      keywords:Array.isArray(work.topics)?work.topics:undefined,
      spatialCoverage:regionName||undefined,
      identifier:work.doi?`https://doi.org/${work.doi}`:undefined,
      sameAs:work.url||undefined,
      citation:work.citation||undefined,
      isPartOf:{'@id':absoluteSiteUrl('')+'#website'}
    };
    if(type==='ScholarlyArticle') structured.headline=title;
    setStructuredData('work-structured-data',structured);
  }

  function applyLanguage(lang){
    if(!supported.includes(lang)) lang='pt';
    root.lang=lang;
    localStorage.setItem('site-language',lang);
    document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
    document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-content]').forEach(el=>el.setAttribute('content',t(el.dataset.i18nContent)));
    document.querySelectorAll('[data-i18n-alt]').forEach(el=>el.setAttribute('alt',t(el.dataset.i18nAlt)));
    const sel=document.getElementById('languageSelect');
    if(sel) sel.value=lang;
    syncSeoMetadata();
    if(isHomepage()) buildHomepageStructuredData();
    window.dispatchEvent(new CustomEvent('site-language-change',{detail:{lang}}));
  }

  function derivedMetrics(){
    const works=window.SCIENTIFIC_WORKS || [];
    const regions=new Set(works.map(work=>work?.region).filter(region=>region && region!=='digital'));
    return {
      publications: works.length,
      studyAreas: regions.size
    };
  }

  function loadWebAnalytics(){
    const cloudflare=window.SITE_CONFIG?.analytics?.cloudflare||{};
    const enabled=cloudflare.enabled===true;
    const token=typeof cloudflare.token==='string'?cloudflare.token.trim():'';
    const hostname=typeof cloudflare.hostname==='string'?cloudflare.hostname.trim():'';

    if(!enabled || !token) return;
    if(hostname && window.location.hostname!==hostname) return;
    if(document.querySelector('script[data-site-analytics="cloudflare"]')) return;

    const script=document.createElement('script');
    script.type='module';
    script.src='https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon',JSON.stringify({token}));
    script.setAttribute('data-site-analytics','cloudflare');
    document.body.appendChild(script);
  }

  function applySiteConfig(){
    const cfg=window.SITE_CONFIG||{};
    const profile=cfg.profile||{};
    document.querySelectorAll('[data-profile-link]').forEach(el=>{
      const key=el.dataset.profileLink;
      if(Object.prototype.hasOwnProperty.call(profile,key)){
        if(profile[key]){
          el.hidden=false;
          el.setAttribute('href',profile[key]);
        }else{
          el.hidden=true;
          el.removeAttribute('href');
        }
      }
    });
    document.querySelectorAll('[data-profile-email],[data-contact-email]').forEach(el=>{
      if(profile.email){
        el.textContent=profile.email;
        el.setAttribute('href','mailto:'+profile.email);
      }
    });
    document.querySelectorAll('[data-profile-name]').forEach(el=>{
      if(profile.name) el.textContent=profile.name;
    });
    document.querySelectorAll('[data-profile-mark]').forEach(el=>{
      if(profile.brandMark) el.textContent=profile.brandMark;
    });
    const image=cfg.homepage?.profileImage;
    if(image) document.querySelectorAll('[data-profile-image]').forEach(el=>el.setAttribute('src',image));
    const favicon=cfg.site?.favicon;
    if(favicon) document.querySelectorAll('[data-site-favicon]').forEach(el=>el.setAttribute('href',favicon));

    const metrics={...(cfg.metrics||{}),...derivedMetrics()};
    document.querySelectorAll('[data-metric-value]').forEach(el=>{
      const key=el.dataset.metricValue;
      if(metrics[key]!==undefined) el.textContent=metrics[key];
    });
  }

  window.siteSeo={sync:syncSeoMetadata,setCanonical,setStructuredData,setWork:setWorkSeo,absoluteUrl:absoluteSiteUrl};
  window.siteI18n={t,value,list,applyLanguage,get lang(){return root.lang}};
  root.lang=initial;
  const theme=localStorage.getItem('site-theme') || (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  root.dataset.theme=theme;

  window.onSiteDataReady(()=>{
    applySiteConfig();
    loadWebAnalytics();
    applyLanguage(initial);
    document.querySelectorAll('[data-current-year]').forEach(el=>el.textContent=new Date().getFullYear());
    document.getElementById('languageSelect')?.addEventListener('change',e=>applyLanguage(e.target.value));
    document.getElementById('themeToggle')?.addEventListener('click',()=>{
      const next=root.dataset.theme==='dark'?'light':'dark';
      root.dataset.theme=next;
      localStorage.setItem('site-theme',next);
    });

    const btn=document.getElementById('menuToggle'), nav=document.getElementById('navLinks');
    if(btn && nav){
      const mobileMq=window.matchMedia('(max-width:1100px)');
      const drawerRoot=document.createElement('div');
      drawerRoot.className='mobile-nav-root';
      drawerRoot.id='mobileNavigation';
      drawerRoot.setAttribute('aria-hidden','true');

      const backdrop=document.createElement('div');
      backdrop.className='mobile-nav-backdrop';
      backdrop.setAttribute('data-nav-backdrop','');
      backdrop.setAttribute('aria-hidden','true');

      const drawer=document.createElement('aside');
      drawer.className='mobile-nav-drawer';
      drawer.setAttribute('role','dialog');
      drawer.setAttribute('aria-modal','true');
      drawer.setAttribute('aria-label',t('mobile_navigation_dialog'));

      const head=document.createElement('div');
      head.className='mobile-nav-head';
      const profile=window.SITE_CONFIG?.profile||{};
      const mark=profile.brandMark||'EF';
      const name=profile.name||'Edgar Figueira';
      head.innerHTML=`<a class="mobile-nav-brand" href="index.html"><span class="brand-mark">${String(mark).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</span><span>${String(name).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</span></a>`;

      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='mobile-nav-close';
      closeBtn.textContent='×';
      closeBtn.setAttribute('aria-label',t('menu_close'));
      head.appendChild(closeBtn);

      const mobileLinks=document.createElement('nav');
      mobileLinks.className='mobile-nav-links';
      mobileLinks.setAttribute('aria-label',t('mobile_navigation_links'));
      nav.querySelectorAll('a').forEach(link=>mobileLinks.appendChild(link.cloneNode(true)));

      drawer.append(head,mobileLinks);
      drawerRoot.append(backdrop,drawer);
      document.body.appendChild(drawerRoot);

      let open=false;
      let lastViewportWidth=window.innerWidth;

      const setMenuState=(nextOpen,{restoreFocus=false}={})=>{
        nextOpen=Boolean(nextOpen && mobileMq.matches);
        open=nextOpen;
        drawerRoot.classList.toggle('is-open',open);
        drawerRoot.setAttribute('aria-hidden',String(!open));
        document.body.classList.toggle('nav-open',open);
        btn.setAttribute('aria-expanded',String(open));
        btn.textContent=open?'×':'☰';
        btn.setAttribute('aria-label',open?t('menu_close'):t('menu'));
        closeBtn.setAttribute('aria-label',t('menu_close'));
        if(open){
          requestAnimationFrame(()=>closeBtn.focus({preventScroll:true}));
        }else if(restoreFocus){
          requestAnimationFrame(()=>btn.focus({preventScroll:true}));
        }
      };
      const closeMenu=(restoreFocus=false)=>setMenuState(false,{restoreFocus});

      btn.addEventListener('click',()=>setMenuState(!open));
      closeBtn.addEventListener('click',()=>closeMenu(true));
      backdrop.addEventListener('click',()=>closeMenu(true));
      mobileLinks.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu(false)));

      document.addEventListener('keydown',event=>{
        if(!open) return;
        if(event.key==='Escape'){
          event.preventDefault();
          closeMenu(true);
          return;
        }
        if(event.key==='Tab'){
          const focusables=[...drawer.querySelectorAll('a[href],button:not([disabled])')]
            .filter(el=>el.getClientRects().length>0);
          if(!focusables.length) return;
          const first=focusables[0], last=focusables[focusables.length-1];
          if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
      });

      const handleBreakpoint=()=>{
        if(!mobileMq.matches && open) closeMenu(false);
      };
      if(typeof mobileMq.addEventListener==='function') mobileMq.addEventListener('change',handleBreakpoint);
      else mobileMq.addListener(handleBreakpoint);

      window.addEventListener('resize',()=>{
        const width=window.innerWidth;
        if(open && Math.abs(width-lastViewportWidth)>24) closeMenu(false);
        lastViewportWidth=width;
      },{passive:true});
      window.addEventListener('orientationchange',()=>closeMenu(false),{passive:true});
      window.addEventListener('pageshow',()=>closeMenu(false));
      window.addEventListener('site-language-change',()=>{
        btn.setAttribute('aria-label',open?t('menu_close'):t('menu'));
        closeBtn.setAttribute('aria-label',t('menu_close'));
        drawer.setAttribute('aria-label',t('mobile_navigation_dialog'));
        mobileLinks.setAttribute('aria-label',t('mobile_navigation_links'));
      });
    }
  });
})();
