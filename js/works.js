(function(){
  function init(){
    const list=document.getElementById('worksList');
    if(!list) return;

    const search=document.getElementById('workSearch');
    const typeFilter=document.getElementById('typeFilter');
    const regionFilter=document.getElementById('regionFilter');
    const summary=document.getElementById('filterSummary');
    const mapEl=document.getElementById('map');

    const works=window.SCIENTIFIC_WORKS || [];
    let map=null;
    let markerGroup=null;
    let visibleWorks=works.slice();
    const workMarkers=new Map();

    const typeLabel=x=>window.siteI18n.t('type_'+x);
    const regionLabel=x=>x==='digital' ? window.siteI18n.t('no_map') : (window.REGIONS?.[x]?.name || x);
    const workTitle=w=>window.siteI18n?.value(w?.displayTitle) || w?.title || '';
    const pointOf=w=>w?.location && Number.isFinite(Number(w.location.lat)) && Number.isFinite(Number(w.location.lon))
      ? [Number(w.location.lat),Number(w.location.lon)]
      : null;

    function boundsFromLocations(items){
      const points=items.map(pointOf).filter(Boolean);
      return points.length ? L.latLngBounds(points) : null;
    }

    function safeInvalidate(){
      if(!map) return;
      requestAnimationFrame(()=>map.invalidateSize({pan:false,animate:false}));
    }

    function initMap(){
      if(!mapEl || !window.L || map) return;

      map=L.map(mapEl,{
        scrollWheelZoom:false,
        zoomControl:true,
        minZoom:4,
        maxZoom:16,
        preferCanvas:false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© OpenStreetMap contributors',
        maxZoom:18
      }).addTo(map);

      markerGroup=L.layerGroup().addTo(map);
      drawWorkPoints(visibleWorks);
      resetMap(false);

      map.whenReady(()=>{
        safeInvalidate();
        setTimeout(safeInvalidate,120);
      });

      if('ResizeObserver' in window){
        const observer=new ResizeObserver(()=>safeInvalidate());
        observer.observe(mapEl);
      } else {
        window.addEventListener('resize',safeInvalidate,{passive:true});
      }
    }

    function drawWorkPoints(items){
      if(!map || !markerGroup) return;
      markerGroup.clearLayers();
      workMarkers.clear();

      items.forEach(w=>{
        const point=pointOf(w);
        if(!point) return;

        const marker=L.circleMarker(point,{
          radius:4,
          weight:1.25,
          opacity:.78,
          fillOpacity:.78,
          className:'study-point'
        });

        marker.bindTooltip(
          `<strong>${w.year}</strong> · ${escapeHtml(regionLabel(w.region))}<br>${escapeHtml(workTitle(w))}`,
          {direction:'top',sticky:true,opacity:.96}
        );
        marker.on('click',()=>focusWork(w.id));
        marker.addTo(markerGroup);
        workMarkers.set(w.id,marker);
      });
    }

    function setActiveWork(id){
      workMarkers.forEach((marker,workId)=>{
        const active=workId===id;
        marker.setRadius(active?6:4);
        marker.setStyle({
          weight:active?2:1.25,
          opacity:active?1:.78,
          fillOpacity:active?1:.78
        });
        if(active) marker.bringToFront();
      });
    }

    function resetMap(animate=true){
      if(!map) return;
      setActiveWork(null);
      document.querySelectorAll('.work-row').forEach(x=>x.classList.remove('is-active'));

      const bounds=boundsFromLocations(visibleWorks.length?visibleWorks:works);
      if(bounds && bounds.isValid()){
        safeInvalidate();
        if(bounds.getNorthEast().equals(bounds.getSouthWest())){
          map.setView(bounds.getCenter(),10,{animate});
        }else{
          map.fitBounds(bounds,{
            padding:[28,28],
            animate,
            duration:.35,
            maxZoom:10
          });
        }
      } else {
        map.setView([41.9,-8.05],7,{animate:false});
      }
      setMapCaption();
    }

    function setMapCaption(w){
      const cap=document.getElementById('mapFocus');
      if(!cap) return;
      cap.textContent=w
        ? `${w.year} · ${regionLabel(w.region)} · ${window.siteI18n.t('location_focus')}`
        : window.siteI18n.t('map_context');
    }

    function focusWork(id){
      const w=works.find(x=>x.id===id);
      if(!w || !map) return;

      document.querySelectorAll('.work-row').forEach(x=>x.classList.toggle('is-active',x.dataset.id===id));
      setActiveWork(id);

      const point=pointOf(w);
      if(!point){
        resetMap(true);
        setMapCaption(w);
        return;
      }

      safeInvalidate();
      map.flyTo(point,12,{
        animate:true,
        duration:.55
      });
      setMapCaption(w);

      // On narrower screens the map sits below the list; make the spatial feedback visible.
      if(window.matchMedia('(max-width: 960px)').matches){
        mapEl?.scrollIntoView({behavior:'smooth',block:'center'});
      }
    }

    function populateFilters(){
      const t=window.siteI18n.t;
      const curT=typeFilter.value;
      const curR=regionFilter.value;
      const types=[...new Set(works.map(w=>w.type))];

      typeFilter.innerHTML=`<option value="">${t('all_types')}</option>`+
        types.map(x=>`<option value="${x}">${typeLabel(x)}</option>`).join('');

      regionFilter.innerHTML=`<option value="">${t('all_regions')}</option>`+
        Object.entries(window.REGIONS||{})
          .filter(([id])=>works.some(w=>w.region===id))
          .map(([id,r])=>`<option value="${id}">${r.name}</option>`).join('');

      typeFilter.value=curT;
      regionFilter.value=curR;
    }

    function getFilteredWorks(){
      const q=(search.value||'').trim().toLocaleLowerCase();
      const typ=typeFilter.value;
      const reg=regionFilter.value;

      return works.filter(w=>{
        const translatedTitles=w.displayTitle && typeof w.displayTitle==='object' ? Object.values(w.displayTitle) : [];
        const hay=[w.title,...translatedTitles,w.authors,w.venue,w.year,regionLabel(w.region),...(w.topics||[])]
          .join(' ').toLocaleLowerCase();
        return (!q||hay.includes(q)) && (!typ||w.type===typ) && (!reg||w.region===reg);
      });
    }

    function render(){
      visibleWorks=getFilteredWorks();
      summary.textContent=`${visibleWorks.length} ${window.siteI18n.t('results')}`;

      list.innerHTML=visibleWorks.map(w=>`<article class="work-row" data-id="${w.id}"><div class="work-index"><span>${w.year}</span><span>${typeLabel(w.type)}</span></div><div class="work-main"><h2><a href="work.html?id=${w.id}">${escapeHtml(workTitle(w))}</a></h2><p>${escapeHtml(w.authors)}</p><p class="work-venue">${escapeHtml(w.venue)} · ${escapeHtml(regionLabel(w.region))}</p><div class="work-actions"><button class="text-action map-action" data-map="${w.id}">${window.siteI18n.t('map')}</button><a class="text-action" href="work.html?id=${w.id}">${window.siteI18n.t('details')} ↗</a>${w.url?`<a class="text-action" href="${escapeAttr(w.url)}" target="_blank" rel="noopener">${window.siteI18n.t('publication')} ↗</a>`:''}</div></div></article>`).join('');

      if(map){
        drawWorkPoints(visibleWorks);
        resetMap(false);
      }
    }

    function escapeHtml(value){
      return String(value??'').replace(/[&<>"']/g,ch=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[ch]));
    }
    function escapeAttr(value){ return escapeHtml(value); }

    list.addEventListener('click',e=>{
      const b=e.target.closest('[data-map]');
      if(!b) return;
      e.preventDefault();
      focusWork(b.dataset.map);
    });

    [search,typeFilter,regionFilter].forEach(el=>{
      el.addEventListener(el===search?'input':'change',render);
    });

    document.getElementById('resetMap')?.addEventListener('click',()=>resetMap(true));

    window.addEventListener('site-language-change',()=>{
      populateFilters();
      render();
      setMapCaption();
    });

    populateFilters();
    render();
    initMap();
  }
  window.onSiteDataReady(init);
})();
