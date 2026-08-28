(function(){
  function init(){
  const host=document.getElementById('workDetail'); if(!host) return;
  let map;
  const params=new URLSearchParams(location.search), id=params.get('id')||window.SCIENTIFIC_WORKS[0].id;
  const w=window.SCIENTIFIC_WORKS.find(x=>x.id===id)||window.SCIENTIFIC_WORKS[0];
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  const centerFromExtent=e=>e?[(e[0]+e[2])/2,(e[1]+e[3])/2]:null;
  function photoHTML(t){
    const cap=window.siteI18n.value(w.imageCaption)||w.title;
    if(w.image) return `<figure class="detail-photo detail-photo-image"><img src="${esc(w.image)}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`;
    return `<div class="photo-slot detail-photo"><div><span>01</span><strong>${t('photo_slot')}</strong><em>${t('landscape')}</em></div></div>`;
  }
  function render(){
    const t=window.siteI18n.t;
    document.title=`${w.title} · Edgar Figueira`;
    const related=window.SCIENTIFIC_WORKS.filter(x=>x.id!==w.id && x.region===w.region).slice(0,4);
    host.innerHTML=`<a class="back-link" href="works.html">← ${t('work_back')}</a><header class="work-detail-head"><div class="eyebrow">${w.year} · ${t('type_'+w.type)} · ${esc(window.REGIONS[w.region]?.name)}</div><h1>${esc(w.title)}</h1><p class="detail-authors">${esc(w.authors)}</p><p class="detail-venue">${esc(w.venue)}</p>${w.url?`<a class="text-action strong" href="${w.url}" target="_blank" rel="noopener">${t('open_doi')} ↗</a>`:''}</header><div class="detail-grid"><article class="detail-copy"><section><h2>${t('work_abstract')}</h2><p>${esc(window.siteI18n.value(w.abstract))}</p></section><section><h2>${t('work_area')}</h2><p>${esc(window.siteI18n.value(w.studyArea))}</p></section><section><h2>${t('work_methods')}</h2><ul>${window.siteI18n.list(w.methods).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section><h2>${t('work_findings')}</h2><ul>${window.siteI18n.list(w.findings).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section><h2>${t('work_citation')}</h2><p class="citation">${esc(w.citation)}</p></section><section><h2>${t('work_source')}</h2><p class="source-note">${esc(window.siteI18n.value(w.sourceNote))}</p></section></article><aside class="detail-side"><div id="detailMap" class="detail-map"></div><p class="map-focus">${w.extent?t('bbox_focus'):t('no_map')}</p>${photoHTML(t)}</aside></div><section class="related"><h2>${t('work_related')}</h2>${related.map(x=>`<a href="work.html?id=${x.id}"><span>${x.year}</span><strong>${esc(x.title)}</strong></a>`).join('')||'<p>—</p>'}</section>`;
    initMap();
  }
  function initMap(){
    const el=document.getElementById('detailMap'); if(!el||!window.L) return;
    if(map){map.remove(); map=null}
    map=L.map(el,{scrollWheelZoom:false,zoomControl:false,attributionControl:true,dragging:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);
    if(w.extent){
      const b=[[w.extent[0],w.extent[1]],[w.extent[2],w.extent[3]]];
      L.circleMarker(centerFromExtent(w.extent),{radius:5,weight:1.6,opacity:1,fillOpacity:.9,className:'study-centroid'}).addTo(map).bindTooltip(window.REGIONS[w.region]?.name||w.title,{direction:'top'});
      map.fitBounds(b,{padding:[22,22],animate:false,maxZoom:13});
    } else map.setView([41.7,-8.0],6);
  }
  window.addEventListener('site-language-change',render); render();

  }
  window.onSiteDataReady(init);
})();
