(function(){
  const script = document.currentScript;
  const rootUrl = new URL('../', script.src);
  const url = (path) => new URL(path, rootUrl).href;
  const LANGS = ['pt','en','es','de','fr','it','no','zh'];

  async function getJSON(path){
    const response = await fetch(url(path), { cache: 'no-cache' });
    if(!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
  }

  function normalizeAssetPath(value){
    if(typeof value !== 'string') return value;
    return value.startsWith('/assets/') ? value.slice(1) : value;
  }

  function buildI18N(rows){
    const out = Object.fromEntries(LANGS.map(lang => [lang, {}]));
    (rows || []).forEach(row => {
      if(!row || !row.key) return;
      LANGS.forEach(lang => { if(row[lang] !== undefined) out[lang][row.key] = row[lang]; });
    });
    return out;
  }

  function runtimeWork(work){
    const w = {...work};
    const point=w.location;
    if(point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))){
      w.location={lat:Number(point.lat),lon:Number(point.lon)};
    } else {
      w.location=null;
    }
    w.image = normalizeAssetPath(w.image);
    return w;
  }

  function runtimeRegion(region){
    const r={...region};
    if(r.extent && !Array.isArray(r.extent) && ['south','west','north','east'].every(k => Number.isFinite(Number(r.extent[k])))){
      r.extent=[Number(r.extent.south),Number(r.extent.west),Number(r.extent.north),Number(r.extent.east)];
    }
    if(Array.isArray(r.polygon) && r.polygon.length && !Array.isArray(r.polygon[0])){
      r.polygon=r.polygon
        .filter(point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)))
        .map(point => [Number(point.lat),Number(point.lon)]);
    }
    return r;
  }

  window.SITE_DATA_READY = Promise.all([
    getJSON('data/profile.json'),
    getJSON('data/works.json'),
    getJSON('data/regions.json'),
    getJSON('data/gallery.json'),
    getJSON('data/mobility.json'),
    getJSON('data/training.json'),
    getJSON('data/terminology.json'),
    getJSON('data/ui-translations.json'),
    getJSON('data/cv.json'),
    getJSON('data/research.json')
  ]).then(([profile, works, regions, gallery, mobility, training, terminology, translations, cv, research]) => {
    if(profile?.homepage?.profileImage) profile.homepage.profileImage = normalizeAssetPath(profile.homepage.profileImage);
    if(profile?.site?.favicon) profile.site.favicon = normalizeAssetPath(profile.site.favicon);
    (gallery || []).forEach(item => { item.src = normalizeAssetPath(item.src); });

    const runtimeRegions=(regions || []).map(runtimeRegion);
    window.SITE_CONFIG = profile || {};
    window.SCIENTIFIC_WORKS = (works || []).map(runtimeWork);
    window.REGIONS = Object.fromEntries(runtimeRegions.map(region => [region.id, region]));
    window.GALLERY_SLOTS = gallery || [];
    window.MOBILITY_DATA = mobility || {funding:[], abroad:[]};
    window.TRAINING_DATA = training || {activities:[]};
    window.GLOSSARY = terminology || [];
    window.I18N = buildI18N(translations || []);
    window.CV_DATA = cv || {aside:{},education:[],experience:[],identifiers:[]};
    window.RESEARCH_DATA = research || {lead:{},axes:[],methodsSection:{},methods:[],links:[]};
    window.dispatchEvent(new CustomEvent('site-data-ready'));
    return true;
  }).catch(error => {
    console.error('Site data loading failed:', error);
    const show = () => {
      if(document.getElementById('siteDataError')) return;
      const el=document.createElement('div');
      el.id='siteDataError';
      el.setAttribute('role','alert');
      el.style.cssText='padding:12px 18px;font:14px system-ui;border-bottom:1px solid currentColor';
      el.textContent='Site content could not be loaded. Open this project through an HTTP server (for example VS Code Live Server or python -m http.server), not file://.';
      document.body.prepend(el);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',show,{once:true}); else show();
    throw error;
  });

  window.onSiteDataReady = function(callback){
    window.SITE_DATA_READY.then(() => {
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, {once:true});
      else callback();
    }).catch(() => {});
  };
})();
