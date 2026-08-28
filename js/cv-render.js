(function(){
  function esc(value){
    return String(value ?? '').replace(/[&<>\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  }

  function safeUrl(value){
    if(!value) return '';
    try{
      const url=new URL(String(value), window.location.href);
      return /^(https?:)$/.test(url.protocol) ? url.href : '';
    }catch(_){ return ''; }
  }

  function local(value){
    return window.siteI18n?.value(value) || '';
  }

  function organizationsHTML(organizations){
    return (organizations || []).map(org => {
      const name=esc(local(org?.name));
      const href=safeUrl(org?.url);
      return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${name}</a>` : name;
    }).filter(Boolean).join('<span aria-hidden="true"> / </span>');
  }

  function renderEducation(){
    const host=document.getElementById('cvEducationList');
    if(!host) return;
    const items=window.CV_DATA?.education || [];
    host.innerHTML=items.map(item => {
      const period=local(item.period);
      const title=local(item.title);
      const details=local(item.details);
      return `<div class="cv-entry"><div class="date">${esc(period)}</div><div><h3>${esc(title)}</h3>${details?`<p>${esc(details)}</p>`:''}</div></div>`;
    }).join('');
  }

  function renderExperience(){
    const host=document.getElementById('cvExperienceList');
    if(!host) return;
    const items=window.CV_DATA?.experience || [];
    host.innerHTML=items.map(item => {
      const role=local(item.role);
      const orgs=organizationsHTML(item.organizations);
      const description=local(item.description);
      const tech=local(item.tech);
      return `<div class="cv-entry"><div class="date">${esc(item.period || '')}</div><div><h3>${esc(role)}</h3>${orgs?`<p>${orgs}</p>`:''}${description?`<p class="cv-description">${esc(description)}</p>`:''}${tech?`<p class="cv-tech">${esc(tech)}</p>`:''}</div></div>`;
    }).join('');
  }

  function identifierUrl(item){
    const profileKey=item?.profileKey;
    const fromProfile=profileKey ? window.SITE_CONFIG?.profile?.[profileKey] : '';
    return safeUrl(fromProfile || item?.url);
  }

  function renderIdentifiers(){
    const host=document.getElementById('cvIdentifiersList');
    if(!host) return;
    const items=window.CV_DATA?.identifiers || [];
    host.innerHTML=items.map(item => {
      const label=esc(item.label || '');
      const value=local(item.linkLabel) || item.value || '';
      const href=identifierUrl(item);
      const main=href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(value)}</a>` : esc(value);
      return `<div class="cv-entry"><div class="date">${label}</div><div><h3>${main}</h3></div></div>`;
    }).join('');
  }

  function renderAside(){
    const data=window.CV_DATA?.aside || {};
    const fields=document.getElementById('cvAsideFields');
    const affiliation=document.getElementById('cvAsideAffiliation');
    if(fields) fields.textContent=local(data.fields);
    if(affiliation) affiliation.textContent=local(data.affiliation);
  }

  function render(){
    renderAside();
    renderEducation();
    renderExperience();
    renderIdentifiers();
  }

  window.onSiteDataReady(render);
  window.addEventListener('site-language-change',render);
})();
