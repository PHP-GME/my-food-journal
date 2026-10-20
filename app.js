'use strict';
const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'];
const $ = id => document.getElementById(id);
let db, entries = [], editing = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('my-food-journal', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function transaction(action) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('entries', 'readwrite');
    action(t.objectStore('entries'));
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaction aborted'));
  });
}
function allEntries() {
  return new Promise((resolve, reject) => {
    const request = db.transaction('entries', 'readonly').objectStore('entries').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localParts = (date = new Date()) => ({
  date: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
  time: `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
});
function sortedVisible() {
  return entries.filter(e =>
    (!$('dateFilter').value || e.date === $('dateFilter').value) &&
    (!$('mealFilter').value || e.meal === $('mealFilter').value) &&
    (!$('tagFilter').value || e.tags.some(t => t.toLowerCase() === $('tagFilter').value.toLowerCase()))
  ).sort((a,b) => (b.date+'T'+b.time).localeCompare(a.date+'T'+a.time) || b.id.localeCompare(a.id));
}
function dateLabel(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d));
}
function render() {
  const oldTag = $('tagFilter').value;
  const tags = [...new Set(entries.flatMap(e => e.tags || []).map(t=>t.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $('tagFilter').innerHTML = '<option value="">All tags</option>' + tags.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
  $('tagFilter').value = tags.some(t=>t.toLowerCase()===oldTag.toLowerCase()) ? tags.find(t=>t.toLowerCase()===oldTag.toLowerCase()) : '';
  const visible = sortedVisible();
  $('count').textContent = `${visible.length} ${visible.length===1?'entry':'entries'} shown`;
  let lastDate = '';
  $('entries').innerHTML = visible.length ? visible.map(e => {
    const heading = e.date !== lastDate ? `<div class="day">${escapeHTML(dateLabel(e.date))}</div>` : '';
    lastDate = e.date;
    return heading + `<button class="entry" data-id="${escapeHTML(e.id)}"><div class="entryTop"><span class="pill">${escapeHTML(e.meal)}</span><span class="muted">${escapeHTML(e.time)}</span></div><div class="entryText">${escapeHTML(e.item)}</div><div class="tags">${e.tags.map(t=>`<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div></button>`;
  }).join('') : '<div class="empty">No entries match these filters.</div>';
  document.querySelectorAll('[data-id]').forEach(button => button.onclick = () => openEditor(button.dataset.id));
}
async function refresh() { entries = await allEntries(); render(); }
function openEditor(id = null) {
  editing = id;
  const now = localParts();
  const e = entries.find(x=>x.id===id) || { item:'', date:now.date, time:now.time, meal:'Breakfast', tags:[] };
  $('item').value = e.item;
  $('date').value = e.date;
  $('time').value = e.time;
  $('meal').value = e.meal;
  $('tags').value = e.tags.join(', ');
  $('editorTitle').textContent = id ? 'Edit entry' : 'New entry';
  $('delete').hidden = !id;
  $('editor').showModal();
}
$('new').onclick = () => openEditor();
$('close').onclick = () => $('editor').close();
$('entryForm').onsubmit = async event => {
  event.preventDefault();
  const tags = [...new Map($('tags').value.split(',').map(t=>t.trim()).filter(Boolean).map(t=>[t.toLowerCase(),t])).values()];
  const entry = { id: editing || crypto.randomUUID(), item:$('item').value.trim(), date:$('date').value, time:$('time').value, meal:$('meal').value, tags };
  if (!entry.item) return alert('Please enter a food or drink.');
  try { await transaction(store => store.put(entry)); $('editor').close(); await refresh(); }
  catch(error) { alert('Could not save entry: '+error.message); }
};
$('delete').onclick = async () => {
  if (!editing || !confirm('Delete this entry?')) return;
  try { await transaction(store => store.delete(editing)); $('editor').close(); await refresh(); }
  catch(error) { alert('Could not delete entry: '+error.message); }
};
['dateFilter','mealFilter','tagFilter'].forEach(id => $(id).onchange = render);
$('today').onclick = () => { $('dateFilter').value = localParts().date; render(); };
$('allDates').onclick = () => { $('dateFilter').value = ''; render(); };
$('clearFilters').onclick = () => { $('dateFilter').value = ''; $('mealFilter').value = ''; $('tagFilter').value = ''; render(); };
function plainList(list) {
  return list.length ? list.map(e => `${e.date} ${e.time} | ${e.meal}\n${e.item}${e.tags.length?'\nTags: '+e.tags.join(', '):''}`).join('\n\n') : 'No matching entries.';
}
$('email').onclick = async () => {
  const list = sortedVisible();
  const subject = 'My Food Journal — '+( $('dateFilter').value || 'selected entries' );
  const body = plainList(list);
  // Sharing text invokes the native iPhone share sheet; choose Mail from it.
  if (navigator.share) {
    try { await navigator.share({title:subject,text:body}); return; }
    catch(error) { if (error.name === 'AbortError') return; }
  }
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (mailto.length > 1800) {
    alert('This list is too long for an email link. Use Export CSV and attach the downloaded file to an email instead.');
    return;
  }
  window.location.href = mailto;
};
function csvEscape(value) { return '"'+String(value??'').replace(/"/g,'""')+'"'; }
function download(blob, filename) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
$('csv').onclick = () => {
  const header = ['Date','Time','Meal','Food or drink','Tags'];
  const rows = sortedVisible().map(e=>[e.date,e.time,e.meal,e.item,e.tags.join(', ')]);
  const csv = '\uFEFF'+[header,...rows].map(row=>row.map(csvEscape).join(',')).join('\r\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8'}),'food-journal-'+localParts().date+'.csv');
};
$('backup').onclick = async () => {
  try {
    const archive = { app:'My Food Journal', version:1, exportedAt:new Date().toISOString(), entries:await allEntries() };
    const filename = 'food-journal-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    const blob = new Blob([JSON.stringify(archive)],{type:'application/json'});
    const file = new File([blob],filename,{type:'application/json'});
    if (navigator.canShare?.({files:[file]})) {
      try { await navigator.share({files:[file],title:'My Food Journal backup'}); return; }
      catch(error) { if (error.name==='AbortError') return; }
    }
    download(blob,filename);
    alert('Backup downloaded. Save it to Files → iCloud Drive.');
  } catch(error) { alert('Backup failed: '+error.message); }
};
$('restore').onclick = () => $('restoreFile').click();
$('restoreFile').onchange = async event => {
  const file = event.target.files[0]; event.target.value=''; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app!=='My Food Journal' || data.version!==1 || !Array.isArray(data.entries)) throw Error('Not a recognized Food Journal backup.');
    if (!data.entries.every(e => e && typeof e.id==='string' && typeof e.item==='string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && /^\d{2}:\d{2}$/.test(e.time) && meals.includes(e.meal) && Array.isArray(e.tags) && e.tags.every(t=>typeof t==='string'))) throw Error('Backup contains invalid entries.');
    if (new Set(data.entries.map(e=>e.id)).size !== data.entries.length) throw Error('Backup has duplicate entry IDs.');
    if (!confirm(`Restore ${data.entries.length} entries? This REPLACES all ${entries.length} entries on this device. Back up your current journal first.`)) return;
    await transaction(store => { store.clear(); data.entries.forEach(e=>store.put(e)); });
    await refresh();
    alert('Restore complete. Check your records.');
  } catch(error) { alert('Restore failed: '+error.message); }
};
(async()=>{
  try {
    db=await openDB();
    $('meal').innerHTML=meals.map(m=>`<option>${m}</option>`).join('');
    $('mealFilter').innerHTML='<option value="">All meals</option>'+meals.map(m=>`<option>${m}</option>`).join('');
    await refresh();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  } catch(error) { alert('Unable to open local journal storage: '+error.message); }
})();
