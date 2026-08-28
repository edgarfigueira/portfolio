(function(){
  const CACHE_VERSION=4;
  const CACHE_KEY='edgar-figueira-citation-metrics-v4';
  const DEFAULT_CACHE_HOURS=12;
  const REQUEST_TIMEOUT_MS=12000;
  const DEBUG_QUERY='metricsDebug';
  let debugPanel=null;
  let lastSnapshot=null;

  function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

  function normaliseDoi(value){
    return String(value || '')
      .trim()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'')
      .replace(/^doi:\s*/i,'')
      .toLowerCase();
  }

  function doisFromPortfolio(){
    const seen=new Set();
    return (window.SCIENTIFIC_WORKS || [])
      .map(work => normaliseDoi(work?.doi || work?.url))
      .filter(doi => /^10\.\d{4,9}\/.+/.test(doi))
      .filter(doi => !seen.has(doi) && seen.add(doi))
      .sort();
  }

  function fingerprint(dois){ return dois.join('|'); }

  function cacheHours(){
    const value=Number(window.SITE_CONFIG?.metrics?.citationCacheHours);
    return Number.isFinite(value) && value>0 ? Math.min(168,value) : DEFAULT_CACHE_HOURS;
  }

  function sourceEnabled(source){
    const cfg=window.SITE_CONFIG?.metrics?.citationSources;
    if(!cfg || typeof cfg!=='object') return true;
    return cfg[source] !== false;
  }

  function readCache(fp){
    try{
      const parsed=JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if(!parsed || parsed.version!==CACHE_VERSION || parsed.fingerprint!==fp) return null;
      return parsed;
    }catch(_){ return null; }
  }

  function writeCache(snapshot){
    try{ localStorage.setItem(CACHE_KEY,JSON.stringify(snapshot)); }catch(_){ }
  }

  function clearCache(){
    try{ localStorage.removeItem(CACHE_KEY); }catch(_){ }
  }

  function setStatus(key){
    const el=document.getElementById('metricsLiveStatus');
    if(!el) return;
    el.dataset.metricsStatus=key;
    el.textContent=window.siteI18n?.t(key) || key;
  }

  function refreshStatusLanguage(){
    const el=document.getElementById('metricsLiveStatus');
    if(!el) return;
    const key=el.dataset.metricsStatus;
    if(key) el.textContent=window.siteI18n?.t(key) || key;
  }

  function setLiveMetric(source,value){
    if(!Number.isFinite(Number(value))) return false;
    const el=document.querySelector(`[data-live-citation="${source}"]`);
    if(!el) return false;
    el.textContent=String(Math.max(0,Math.round(Number(value))));
    delete el.dataset.counted;
    delete el.dataset.countOriginal;
    window.dispatchEvent(new CustomEvent('scientific-metric-value',{detail:{source,value:Number(value)}}));
    return true;
  }

  function setSourceDiagnostics(source,entry){
    const card=document.querySelector(`[data-live-source="${source}"]`);
    if(!card || !entry) return;
    card.dataset.requested=String(entry.requested ?? 0);
    card.dataset.covered=String(entry.covered ?? 0);
    card.dataset.notFound=String(entry.notFound ?? 0);
    card.dataset.failed=String(entry.failed ?? 0);
    const tr=key=>window.siteI18n?.t(key)||key;
    card.title=`${entry.requested ?? 0} ${tr('metric_diag_queried')} · ${entry.covered ?? 0} ${tr('metric_diag_covered')} · ${entry.notFound ?? 0} ${tr('metric_diag_not_indexed')} · ${entry.failed ?? 0} ${tr('metric_diag_failed')}`;
  }

  async function getJSON(url,{retries=2}={}){
    let lastError=null;
    for(let attempt=0;attempt<=retries;attempt++){
      const controller='AbortController' in window ? new AbortController() : null;
      const timer=controller ? setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS) : null;
      try{
        const response=await fetch(url,{
          cache:'no-store',
          signal:controller?.signal,
          headers:{'Accept':'application/json'}
        });
        if(response.status===404) return {notFound:true,data:null,httpStatus:404};
        if((response.status===429 || response.status>=500) && attempt<retries){
          const retryAfter=Number(response.headers.get('Retry-After'));
          await sleep(Number.isFinite(retryAfter) ? retryAfter*1000 : 900*(attempt+1));
          continue;
        }
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        return {notFound:false,data:await response.json(),httpStatus:response.status};
      }catch(error){
        lastError=error;
        if(attempt>=retries) throw error;
        await sleep(700*(attempt+1));
      }finally{
        if(timer) clearTimeout(timer);
      }
    }
    throw lastError || new Error('Request failed');
  }

  function crossrefMailto(){
    return String(window.SITE_CONFIG?.profile?.email || '').trim();
  }

  async function crossrefCount(doi){
    // Crossref public REST API. A mailto query parameter places the request in
    // the polite pool when available; browser code cannot set its User-Agent.
    const endpoint=new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    const mailto=crossrefMailto();
    if(mailto) endpoint.searchParams.set('mailto',mailto);
    const result=await getJSON(endpoint.href);
    if(result.notFound) return {covered:false,count:0,status:'not-found'};
    const count=Number(result.data?.message?.['is-referenced-by-count']);
    if(!Number.isFinite(count)) return {covered:false,count:0,status:'not-found'};
    return {covered:true,count:Math.max(0,count),status:'covered'};
  }

  function encodeDoiForOpenCitations(doi){
    // OpenCitations v2 expects doi:10.xxxx/suffix. Preserve DOI slashes while
    // safely encoding each path component.
    return doi.split('/').map(part=>encodeURIComponent(part)).join('/');
  }

  async function openCitationsCount(doi){
    const safeDoi=encodeDoiForOpenCitations(doi);
    const endpoint=`https://api.opencitations.net/index/v2/citation-count/doi:${safeDoi}`;
    const result=await getJSON(endpoint);
    if(result.notFound) return {covered:false,count:0,status:'not-found'};
    const row=Array.isArray(result.data) ? result.data[0] : null;
    const count=Number(row?.count);
    if(!row || !Number.isFinite(count)) return {covered:false,count:0,status:'not-found'};
    return {covered:true,count:Math.max(0,count),status:'covered'};
  }

  async function aggregateSequential(dois,fetcher,sourceName,{delayMs=0}={}){
    const perDoi=[];
    for(let index=0;index<dois.length;index++){
      const doi=dois[index];
      try{
        const result=await fetcher(doi);
        perDoi.push({doi,...result,error:null});
      }catch(error){
        perDoi.push({
          doi,
          status:'failed',
          covered:false,
          count:0,
          error:String(error?.message || error || 'request failed')
        });
      }
      updateDebugProgress(sourceName,perDoi,dois.length);
      if(delayMs>0 && index<dois.length-1) await sleep(delayMs);
    }

    const summary={
      total:perDoi.reduce((sum,item)=>sum+(item.status==='covered' ? Number(item.count || 0) : 0),0),
      covered:perDoi.filter(item=>item.status==='covered').length,
      notFound:perDoi.filter(item=>item.status==='not-found').length,
      failed:perDoi.filter(item=>item.status==='failed').length,
      requested:dois.length,
      perDoi
    };
    summary.partial=summary.failed>0 && summary.failed<summary.requested;
    summary.allFailed=summary.requested>0 && summary.failed===summary.requested;

    console.log(`[Citation metrics] ${sourceName}: ${summary.total} citations · ${summary.covered}/${summary.requested} DOI covered · ${summary.notFound} not indexed · ${summary.failed} failed`);
    try{ console.table(perDoi.map(item=>({doi:item.doi,status:item.status,count:item.count,error:item.error || ''}))); }catch(_){ }
    return summary;
  }

  function renderEntry(source,entry){
    if(!entry) return false;
    setSourceDiagnostics(source,entry);
    return setLiveMetric(source,entry.total);
  }

  function renderSnapshot(snapshot){
    let rendered=0;
    if(snapshot?.crossref && sourceEnabled('crossref')) rendered+=renderEntry('crossref',snapshot.crossref)?1:0;
    if(snapshot?.opencitations && sourceEnabled('opencitations')) rendered+=renderEntry('opencitations',snapshot.opencitations)?1:0;
    updateDebugPanel(snapshot);
    return rendered;
  }

  function isUsableResult(result){
    // Never replace a previous valid cache with a result where every network request failed.
    return Boolean(result && !result.allFailed);
  }

  function debugEnabled(){
    try{return new URLSearchParams(location.search).get(DEBUG_QUERY)==='1';}catch(_){return false;}
  }

  function ensureDebugPanel(){
    if(!debugEnabled()) return null;
    if(debugPanel?.isConnected) return debugPanel;
    const anchor=document.querySelector('.metrics-note') || document.getElementById('homeMetrics');
    if(!anchor) return null;
    const details=document.createElement('details');
    details.open=true;
    details.id='citationMetricsDiagnostics';
    details.style.cssText='margin-top:18px;padding-top:14px;border-top:1px solid currentColor;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.82';
    details.innerHTML=`<summary style="cursor:pointer;font-family:inherit">${window.siteI18n?.t('metric_diag_title')||'Citation metrics diagnostics'}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0"></pre>`;
    anchor.insertAdjacentElement('afterend',details);
    debugPanel=details;
    return details;
  }

  function updateDebugProgress(sourceName,perDoi,total){
    const panel=ensureDebugPanel();
    if(!panel) return;
    panel.querySelector('pre').textContent=`Loading ${sourceName}: ${perDoi.length}/${total} DOI\n\n` + perDoi.map(x=>`${x.doi}  ${x.status}  ${x.count ?? 0}${x.error ? `  (${x.error})` : ''}`).join('\n');
  }

  function updateDebugPanel(snapshot){
    const panel=ensureDebugPanel();
    if(!panel) return;
    const dois=doisFromPortfolio();
    panel.querySelector('pre').textContent=JSON.stringify({
      version:'7.5.0',
      dois,
      cacheKey:CACHE_KEY,
      snapshot:snapshot || lastSnapshot
    },null,2);
  }

  async function updateMetrics({force=false}={}){
    const dois=doisFromPortfolio();
    console.log(`[Citation metrics] v7.5.0 initialised · ${dois.length} DOI found`,dois);
    if(!dois.length){ setStatus('metric_live_unavailable'); return null; }

    const fp=fingerprint(dois);
    if(force) clearCache();
    const cached=readCache(fp) || {
      version:CACHE_VERSION,
      fingerprint:fp,
      crossref:null,
      opencitations:null
    };
    const ttl=cacheHours()*60*60*1000;
    const now=Date.now();
    const isFresh=entry => Boolean(entry && Number.isFinite(Number(entry.updatedAt)) && now-Number(entry.updatedAt)<ttl);

    lastSnapshot=cached;
    renderSnapshot(cached);

    const jobs=[];
    // Crossref documents a concurrency limit for public/polite API pools. Run
    // DOI requests sequentially rather than firing all DOI requests at once.
    if(sourceEnabled('crossref') && !isFresh(cached.crossref)){
      jobs.push(['crossref',aggregateSequential(dois,crossrefCount,'Crossref',{delayMs:250})]);
    }
    // OpenCitations has an unauthenticated rate limit of 180 requests/minute.
    // Sequential requests with a short delay stay comfortably below it.
    if(sourceEnabled('opencitations') && !isFresh(cached.opencitations)){
      jobs.push(['opencitations',aggregateSequential(dois,openCitationsCount,'OpenCitations',{delayMs:400})]);
    }

    if(!jobs.length){
      const entries=[];
      if(sourceEnabled('crossref')) entries.push(cached.crossref);
      if(sourceEnabled('opencitations')) entries.push(cached.opencitations);
      setStatus(entries.some(entry=>entry?.failed>0) ? 'metric_live_partial' : 'metric_live_updated');
      console.log('[Citation metrics] using fresh local cache',cached);
      updateDebugPanel(cached);
      return cached;
    }

    setStatus('metric_live_loading');

    const results=await Promise.all(jobs.map(async ([name,promise])=>{
      try{return [name,await promise,null];}
      catch(error){
        console.warn(`[Citation metrics] ${name} unavailable:`,error);
        return [name,null,error];
      }
    }));

    let changed=false;
    let partial=false;
    results.forEach(([name,value,error])=>{
      if(error || !isUsableResult(value)){
        if(error || value?.allFailed) partial=true;
        return;
      }
      cached[name]={...value,updatedAt:Date.now()};
      renderEntry(name,cached[name]);
      changed=true;
      if(value.failed>0) partial=true;
    });

    if(changed) writeCache(cached);
    lastSnapshot=cached;
    updateDebugPanel(cached);

    const enabledEntries=[];
    if(sourceEnabled('crossref')) enabledEntries.push(cached.crossref);
    if(sourceEnabled('opencitations')) enabledEntries.push(cached.opencitations);
    const available=enabledEntries.filter(Boolean).length;
    const fresh=enabledEntries.filter(isFresh).length;
    const anyPartial=partial || enabledEntries.some(entry=>entry?.failed>0);

    if(enabledEntries.length && fresh===enabledEntries.length){
      setStatus(anyPartial ? 'metric_live_partial' : 'metric_live_updated');
    }else if(available){
      setStatus(anyPartial ? 'metric_live_partial' : 'metric_live_cached');
    }else{
      setStatus('metric_live_unavailable');
    }

    console.log('[Citation metrics] final snapshot',cached);
    return cached;
  }

  function exposeDebugApi(){
    window.CITATION_METRICS_DEBUG={
      version:'7.5.0',
      cacheKey:CACHE_KEY,
      help(){
        console.log('Citation metrics debug commands:');
        console.log('CITATION_METRICS_DEBUG.dois()       → DOI used by the homepage');
        console.log('CITATION_METRICS_DEBUG.cache()      → current cached metrics');
        console.log('CITATION_METRICS_DEBUG.clear()      → clear citation cache');
        console.log('CITATION_METRICS_DEBUG.refresh()    → clear cache and query both APIs again');
        console.log('Add ?metricsDebug=1 to index.html for an on-page diagnostic panel.');
      },
      dois(){ const d=doisFromPortfolio(); console.table(d.map(doi=>({doi}))); return d; },
      cache(){ const d=doisFromPortfolio(); const c=readCache(fingerprint(d)); console.log(c); return c; },
      clear(){ clearCache(); console.log(`[Citation metrics] cache cleared (${CACHE_KEY})`); },
      refresh(){ return updateMetrics({force:true}); },
      snapshot(){ console.log(lastSnapshot); return lastSnapshot; }
    };
    console.log('[Citation metrics] metrics.js v7.5.0 loaded. Type CITATION_METRICS_DEBUG.help() for diagnostics.');
  }

  function init(){
    window.addEventListener('site-language-change',refreshStatusLanguage);
    ensureDebugPanel();
    updateMetrics().catch(error=>{
      console.warn('[Citation metrics] update failed:',error);
      setStatus('metric_live_unavailable');
      updateDebugPanel(lastSnapshot);
    });
  }

  exposeDebugApi();
  window.onSiteDataReady(init);
})();
