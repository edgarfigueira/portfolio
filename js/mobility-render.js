(function(){
  function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function t(k){return window.siteI18n?.t(k) ?? k;}
  function safeUrl(value){
    if(!value) return '';
    try{
      const url=new URL(String(value), window.location.href);
      return /^(https?:)$/.test(url.protocol) ? url.href : '';
    }catch(_){return '';}
  }
  function externalLink(item){
    const href=safeUrl(item.link);
    if(!href) return '';
    const label=t(item.linkLabelKey || 'mob_open_link');
    return `<p class="mobility-link-row"><a class="mobility-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}</span><span aria-hidden="true">↗</span></a></p>`;
  }
  function renderList(id,items){
    const host=document.getElementById(id); if(!host) return;
    host.innerHTML=(items||[]).map((item)=>`<article class="mobility-entry"><div class="mobility-meta"><span>${esc(item.year)}</span><span>${esc(t(item.typeKey))}</span></div><div class="mobility-main"><div class="mobility-title-line"><h2>${esc(item.title)}</h2><span class="mobility-status">${esc(t(item.statusKey))}</span></div><p class="mobility-place">${esc(item.institution)} · ${esc(item.place)}</p><p>${esc(window.siteI18n?.value(item.description)||'')}</p>${externalLink(item)}</div></article>`).join('');
  }
  function render(){const d=window.MOBILITY_DATA||{};renderList('fundingList',d.funding);renderList('abroadList',d.abroad);}
  window.onSiteDataReady(render);
  window.addEventListener('site-language-change',render);
})();
