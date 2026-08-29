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
    const label=t(item.linkLabelKey || 'training_open_link');
    return `<p class="mobility-link-row"><a class="mobility-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}</span><span aria-hidden="true">↗</span></a></p>`;
  }
  function render(){
    const host=document.getElementById('trainingList');
    if(!host) return;
    const items=window.TRAINING_DATA?.activities || [];
    host.innerHTML=items.map(item=>{
      const meta=[item.year, item.typeKey ? t(item.typeKey) : '', item.duration || ''].filter(Boolean);
      const place=[item.institution,item.place].filter(Boolean).join(' · ');
      return `<article class="mobility-entry training-entry"><div class="mobility-meta">${meta.map(v=>`<span>${esc(v)}</span>`).join('')}</div><div class="mobility-main"><div class="mobility-title-line"><h2>${esc(window.siteI18n?.value(item.displayTitle)||item.title)}</h2><span class="mobility-status">${esc(t(item.roleKey))}</span></div><p class="mobility-place">${esc(place)}</p><p>${esc(window.siteI18n?.value(item.description)||'')}</p>${externalLink(item)}</div></article>`;
    }).join('');
  }
  window.onSiteDataReady(render);
  window.addEventListener('site-language-change',render);
})();
