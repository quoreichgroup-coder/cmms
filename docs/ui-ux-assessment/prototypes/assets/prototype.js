(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const stateSelect = $('[data-state-switch]');
  const liveData = $('[data-live-data]');
  const stateSlot = $('[data-state-slot]');
  const toastRegion = $('[data-toast-area]') || (() => { const n=document.createElement('div'); n.className='toast'; n.setAttribute('role','status'); document.body.appendChild(n); return n; })();
  let toastTimer;
  const stateContent = {
    loading: ['Chargement des données…', 'Les informations sont en cours de récupération. Cet état est une simulation visuelle.', 'loading'],
    empty: ['Aucun élément à afficher', 'Aucun résultat ne correspond à cette vue. Modifiez la recherche ou actualisez les données.', 'empty'],
    error: ['Impossible de charger les données', 'Une erreur de service a été simulée. Réessayez pour revenir aux exemples.', 'error'],
    denied: ['Accès non autorisé', 'État illustratif uniquement. Les droits réels sont définis par QPM et ne sont pas testés ici.', 'denied'],
    success: ['Action réalisée', 'Confirmation simulée localement. Aucune donnée n’a été envoyée ni persistée.', 'success']
  };
  function toast(message) {
    toastRegion.textContent = message;
    toastRegion.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastRegion.classList.remove('visible'), 3000);
  }
  function applyState(value) {
    document.body.dataset.state = value;
    if (liveData) liveData.classList.toggle('hidden', value !== 'live');
    if (!stateSlot) return;
    if (value === 'live') { stateSlot.hidden = true; stateSlot.innerHTML = ''; return; }
    stateSlot.hidden = false;
    if (value === 'loading') {
      stateSlot.innerHTML = '<div class="state-card" role="status"><div class="state-icon">…</div><div><h3>Chargement des données…</h3><p>État de chargement simulé.</p><div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div></div></div>';
      return;
    }
    const [title, message, kind] = stateContent[value] || stateContent.empty;
    stateSlot.innerHTML = `<div class="state-card" data-kind="${kind}" role="status"><div class="state-icon" aria-hidden="true">${kind === 'error' ? '!' : kind === 'denied' ? '⊘' : kind === 'success' ? '✓' : '⌕'}</div><div><h3>${title}</h3><p>${message}</p>${kind === 'error' ? '<button class="button secondary small" data-retry>Réessayer</button>' : ''}</div></div>`;
  }
  if (stateSelect) { stateSelect.addEventListener('change', () => applyState(stateSelect.value)); applyState(stateSelect.value || 'live'); }
  if (['#orders','#detail','#create','#more'].includes(location.hash)) {
    const initialPanel = location.hash === '#create' ? 'create' : location.hash === '#more' ? 'more' : 'workorders';
    $$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===initialPanel));
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===initialPanel));
    const mobilePanel = initialPanel === 'workorders' ? 'mywork' : initialPanel;
    $$('[data-mobile-panel]').forEach(p=>p.classList.toggle('active',p.dataset.mobilePanel===mobilePanel));
    $$('[data-mobile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mobileTab===(mobilePanel==='detail'?'mywork':mobilePanel)));
    const mobileTitle=$('[data-mobile-title]');
    if(mobileTitle) mobileTitle.textContent=({mywork:'Mes ordres',create:'Nouvel ordre',more:'Accès rapide'})[mobilePanel]||mobileTitle.textContent;
    const mobileScreenId=$('[data-mobile-screen-id]');
    if(mobileScreenId) mobileScreenId.textContent=({mywork:'MOB-073',create:'MOB-005',more:'MOB-001'})[mobilePanel]||mobileScreenId.textContent;
    if(location.hash==='#detail') { const drawer=$('[data-wo-drawer]'); if(drawer) drawer.hidden=false; }
  }
  const prefilledAsset = (() => { try { return sessionStorage.getItem('qpm-prototype-prefill-asset'); } catch (_) { return null; } })();
  const assetSelect = $('[data-asset-select]');
  if (prefilledAsset && assetSelect) {
    assetSelect.value = prefilledAsset;
    try { sessionStorage.removeItem('qpm-prototype-prefill-asset'); } catch (_) { /* storage may be unavailable in private contexts */ }
    toast(`Équipement prérempli : ${prefilledAsset} (simulation)`);
  }

  function openModal(name) { const modal = $(`[data-modal="${name}"]`); if (modal) { modal.hidden=false; const focus=$('input,select,textarea,button',modal); if(focus) focus.focus(); } }
  function closeModal(modal) { if(modal) modal.hidden=true; }
  function setMobileView(name) {
    $$('[data-mobile-panel]').forEach(p=>p.classList.toggle('active', p.dataset.mobilePanel===name));
    const activeTab = name === 'detail' ? 'mywork' : name === 'pmDetail' ? 'plans' : name;
    $$('[data-mobile-tab]').forEach(b=>b.classList.toggle('active', b.dataset.mobileTab===activeTab));
    const title=$('[data-mobile-title]');
    if(title) title.textContent=({home:'Mon poste',mywork:'Mes ordres',detail:'Détail WO',create:'Nouvel ordre',requests:'Demandes',more:'Accès rapide',plans:'Plans de maintenance',pmDetail:'Détail du plan'})[name]||'QPM';
    const screenId=$('[data-mobile-screen-id]');
    if(screenId) screenId.textContent=({home:'MOB-001',mywork:'MOB-073',detail:'MOB-002 / 003',create:'MOB-005',more:'MOB-001',plans:'MOB-015',pmDetail:'MOB-016'})[name]||'';
    const app=$('.phone-app'); if(app) app.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  document.addEventListener('click', e => {
    const view=e.target.closest('[data-view]');
    if(view) {
      const name=view.dataset.view;
      $$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));
      $$('[data-view]').forEach(b=>b.classList.toggle('active',b===view));
    }
    const mobile=e.target.closest('[data-mobile-tab]'); if(mobile) setMobileView(mobile.dataset.mobileTab);
    const mobileWo=e.target.closest('[data-mobile-open-wo]'); if(mobileWo) setMobileView('detail');
    const detail=e.target.closest('[data-open-detail]'); if(detail) { const workorders=$('[data-panel=\"workorders\"]'); if(workorders) { $$('[data-panel]').forEach(p=>p.classList.toggle('active',p===workorders)); $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='workorders')); } const card=$('[data-detail-card]'); if(card) { card.classList.add('visible'); card.scrollIntoView({behavior:'smooth',block:'nearest'}); } }
    if(e.target.closest('[data-detail-close]')) { const card=$('[data-detail-card]'); if(card) card.classList.remove('visible'); }
    const assetTab=e.target.closest('[data-asset-tab]');
    if(assetTab) { $$('[data-asset-tab]').forEach(b=>{b.classList.toggle('selected',b===assetTab);b.setAttribute('aria-selected',b===assetTab?'true':'false');}); $$('[data-asset-panel]').forEach(p=>p.classList.toggle('active',p.dataset.assetPanel===assetTab.dataset.assetTab)); }
    const openDetail=e.target.closest('[data-open-detail]');
    if(openDetail) { const drawer=$('[data-wo-drawer]'); if(drawer) drawer.hidden=false; }
    if(e.target.closest('[data-drawer-close]')) { const drawer=$('[data-wo-drawer]'); if(drawer) drawer.hidden=true; }
    if(e.target.matches('[data-wo-drawer]')) e.target.hidden=true;
    const scheduleView=e.target.closest('[data-schedule-view]');
    if(scheduleView) { $$('[data-schedule-view]').forEach(b=>b.setAttribute('aria-pressed',b===scheduleView?'true':'false')); const mode=scheduleView.dataset.scheduleView; const calendar=$('[data-calendar-view]'); const list=$('[data-list-view]'); if(calendar) calendar.hidden=mode==='list'; if(list) list.hidden=mode!=='list'; document.body.classList.toggle('schedule-week-focus',mode==='week'); }
    const drawerTab=e.target.closest('[data-drawer-tab]');
    if(drawerTab) { const drawer=drawerTab.closest('.wo-drawer'); $$('[data-drawer-tab]',drawer).forEach(b=>b.classList.toggle('selected',b===drawerTab)); $$('[data-drawer-panel]',drawer).forEach(p=>p.classList.toggle('active',p.dataset.drawerPanel===drawerTab.dataset.drawerTab)); }
    const open=e.target.closest('[data-modal-open]'); if(open) openModal(open.dataset.modalOpen);
    const close=e.target.closest('[data-modal-close]'); if(close) closeModal(close.closest('.modal-backdrop'));
    const prefill=e.target.closest('[data-prefill-asset]');
    if(prefill) {
      try { sessionStorage.setItem('qpm-prototype-prefill-asset', prefill.dataset.prefillAsset); } catch (_) { /* navigation still works without storage */ }
      location.href = `mobile-technician.html#create`;
    }
    const toastButton=e.target.closest('[data-toast]'); if(toastButton) toast(toastButton.dataset.toast);
    const filter=e.target.closest('[data-filter]'); if(filter) {
      const group=filter.closest('.filter-group,.mobile-filter-strip');
      if(group) $$('.filter-chip',group).forEach(b=>{b.classList.toggle('selected',b===filter);if(b.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed',b===filter?'true':'false');});
      const value=filter.dataset.filter;
      $$('[data-search-row],[data-status]').forEach(row=>{const status=row.dataset.status; row.classList.toggle('filtered-out', value!=='all' && status!==value);});
    }
    if(e.target.closest('[data-retry]')) { if(stateSelect) {stateSelect.value='live';applyState('live');} toast('Réessai simulé.'); }
    if(e.target.closest('[data-complete-wo]')) openModal('complete-wo');
    if(e.target.closest('[data-confirm-complete]')) { closeModal(e.target.closest('.modal-backdrop')); setMobileView('mywork'); toast('Clôture d’intervention simulée.'); }
  });
  document.addEventListener('input', e=>{
    if(e.target.matches('[data-search]')) {
      const q=e.target.value.toLocaleLowerCase();
      $$('[data-search-row]').forEach(row=>row.classList.toggle('search-hidden',!row.textContent.toLocaleLowerCase().includes(q)));
    }
    if(e.target.matches('[data-tree-search]')) {
      const q=e.target.value.toLocaleLowerCase();
      $$('[data-tree-node]').forEach(row=>row.classList.toggle('search-hidden',!row.textContent.toLocaleLowerCase().includes(q)));
    }
    if(e.target.matches('[data-task]')) {
      const tasks=$$('[data-task]'); const done=tasks.filter(t=>t.checked).length;
      const count=$('[data-task-count]'); if(count) count.textContent=`${done} sur ${tasks.length}`;
      const bar=$('[data-task-progress]'); if(bar) bar.style.width=`${tasks.length?100*done/tasks.length:0}%`;
    }
  });
  document.addEventListener('submit', e=>{
    if(e.target.matches('[data-demo-form]')) { e.preventDefault(); if(!e.target.reportValidity()) return; const message=e.target.dataset.success||'Action locale simulée.'; const modal=e.target.closest('.modal-backdrop'); if(modal) closeModal(modal); e.target.reset(); toast(message); }
  });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') $$('.modal-backdrop:not([hidden])').forEach(closeModal); });
})();
