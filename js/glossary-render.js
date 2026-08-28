(function(){
  const host=document.getElementById('glossaryList'); if(!host) return;
  const search=document.getElementById('glossarySearch'), filter=document.getElementById('glossaryCategory'), count=document.getElementById('glossaryCount');
  const langs=[['pt','PT'],['es','ES'],['en','EN'],['de','DE'],['fr','FR'],['it','IT'],['no','NO'],['zh','中文']];
  function categoryLabel(c){return window.siteI18n.t('cat_'+c)}
  function populate(){const cur=filter.value; const cats=[...new Set(window.GLOSSARY.map(x=>x.category))]; filter.innerHTML=`<option value="">${window.siteI18n.t('all_categories')}</option>`+cats.map(c=>`<option value="${c}">${categoryLabel(c)}</option>`).join('');filter.value=cur;}
  function render(){
    const lang=window.siteI18n.lang, q=(search.value||'').trim().toLocaleLowerCase(), cat=filter.value;
    const rows=window.GLOSSARY.filter(x=>{const hay=langs.map(([k])=>x[k]).join(' ').toLocaleLowerCase();return(!q||hay.includes(q))&&(!cat||x.category===cat)});
    count.textContent=`${rows.length} ${window.siteI18n.t('glossary_count')}`;
    host.innerHTML=rows.map((x,i)=>`<details class="glossary-row"><summary><span class="glossary-no">${String(i+1).padStart(2,'0')}</span><span class="glossary-main"><strong>${x[lang]||x.en}</strong><small>${categoryLabel(x.category)} · ${x.en}</small></span><span class="glossary-expand">${window.siteI18n.t('expand_languages')}</span></summary><div class="language-grid">${langs.map(([k,label])=>`<div><span>${label}</span><strong>${x[k]}</strong></div>`).join('')}</div></details>`).join('');
  }
  [search,filter].forEach(el=>el.addEventListener(el===search?'input':'change',render));
  window.addEventListener('site-language-change',()=>{populate();render()});
  window.onSiteDataReady(()=>{populate();render()});
})();