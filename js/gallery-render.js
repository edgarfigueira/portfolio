(function(){
  const el=document.getElementById('fieldAtlas'); if(!el) return;
  const modal=document.getElementById('photoModal'), modalMedia=document.getElementById('photoModalMedia'), modalCaption=document.getElementById('photoModalCaption');
  const items=()=>window.GALLERY_SLOTS||[];
  const caption=s=>window.siteI18n?.value(s?.caption)||'';
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function render(){
    const t=window.siteI18n.t;
    el.innerHTML=items().map((s,i)=>{
      const ratio=s.ratio||'auto';
      const media=s.src
        ? `<img src="${esc(s.src)}" alt="${esc(caption(s))}" data-auto-ratio="${ratio==='auto'?'1':'0'}">`
        : `<div class="photo-placeholder"><span>${String(i+1).padStart(2,'0')}</span><strong>${t('photo_slot')}</strong><em>${t(ratio==='portrait'?'portrait':'landscape')}</em></div>`;
      return `<figure class="atlas-item ${ratio==='auto'?'landscape':ratio}" tabindex="0" data-slot="${i}">${media}<figcaption>${esc(caption(s))}</figcaption></figure>`;
    }).join('');
    el.querySelectorAll('img[data-auto-ratio="1"]').forEach(img=>{
      const apply=()=>{
        const figure=img.closest('.atlas-item'); if(!figure) return;
        const portrait=img.naturalHeight>img.naturalWidth*1.08;
        figure.classList.toggle('portrait',portrait);
        figure.classList.toggle('landscape',!portrait);
      };
      if(img.complete) apply(); else img.addEventListener('load',apply,{once:true});
    });
  }
  function openSlot(i){ const s=items()[i]; if(!s?.src) return; modalMedia.innerHTML=`<img src="${esc(s.src)}" alt="${esc(caption(s))}">`; modalCaption.textContent=caption(s); modal.showModal(); }
  el.addEventListener('click',e=>{ const f=e.target.closest('[data-slot]'); if(f) openSlot(+f.dataset.slot); });
  el.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-slot]')){e.preventDefault();openSlot(+e.target.dataset.slot)}});
  document.getElementById('photoModalClose')?.addEventListener('click',()=>modal.close());
  modal?.addEventListener('click',e=>{ if(e.target===modal) modal.close(); });
  window.addEventListener('site-language-change',render); window.onSiteDataReady(render);
})();
