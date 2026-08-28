(function(){
  function esc(value){
    return String(value ?? '').replace(/[&<>\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  }

  function local(value){
    return window.siteI18n?.value(value) || '';
  }

  function safeInternalUrl(value){
    if(!value) return '#';
    try{
      const url=new URL(String(value), window.location.href);
      if(url.origin !== window.location.origin) return '#';
      return url.pathname.split('/').pop() + url.search + url.hash;
    }catch(_){ return '#'; }
  }

  function renderLead(){
    const lead=window.RESEARCH_DATA?.lead || {};
    const label=document.getElementById('researchLeadLabel');
    const title=document.getElementById('researchLeadTitle');
    const copy=document.getElementById('researchLeadCopy');
    if(label) label.textContent=local(lead.label);
    if(title) title.textContent=local(lead.title);
    if(copy) copy.textContent=local(lead.copy);
  }

  function renderAxes(){
    const host=document.getElementById('researchAxes');
    if(!host) return;
    host.innerHTML=(window.RESEARCH_DATA?.axes || []).map((axis,index) => {
      const number=axis.number || String(index+1).padStart(2,'0');
      return `<article class="research-axis"><span>${esc(number)}</span><div><h3>${esc(local(axis.title))}</h3><p>${esc(local(axis.copy))}</p></div></article>`;
    }).join('');
  }

  function renderMethods(){
    const data=window.RESEARCH_DATA || {};
    const section=data.methodsSection || {};
    const label=document.getElementById('researchMethodsLabel');
    const title=document.getElementById('researchMethodsTitle');
    const copy=document.getElementById('researchMethodsCopy');
    const host=document.getElementById('researchMethods');
    if(label) label.textContent=local(section.label);
    if(title) title.textContent=local(section.title);
    if(copy) copy.textContent=local(section.copy);
    if(host){
      host.setAttribute('aria-label',window.siteI18n?.t('research_methods_aria') || '');
      host.innerHTML=(data.methods || []).map(item => `<span>${esc(local(item.label))}</span>`).join('');
    }
  }

  function renderLinks(){
    const host=document.getElementById('researchLinks');
    if(!host) return;
    host.innerHTML=(window.RESEARCH_DATA?.links || []).map(item => `<a href="${esc(safeInternalUrl(item.href))}"><span>${esc(local(item.intro))}</span><strong>${esc(local(item.cta))}</strong></a>`).join('');
  }

  function render(){
    renderLead();
    renderAxes();
    renderMethods();
    renderLinks();
  }

  window.onSiteDataReady(render);
  window.addEventListener('site-language-change',render);
})();
