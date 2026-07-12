const $ = (id) => document.getElementById(id);
const rows = new Map();
let expected = 0,
  done = 0;
function toast(message, error = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = `show ${error ? 'error' : ''}`;
  setTimeout(() => (el.className = ''), 4500);
}
function setBusy(value) {
  $('restore').disabled = value;
  $('cancel').disabled = !value;
  $('sync').disabled = value;
  $('syncPush').disabled = value;
}
async function refresh() {
  try {
    const s = await window.osuMaps.status();
    $('total').textContent = s.total;
    $('installed').textContent = s.installed ?? 'Close osu!';
    $('missing').textContent = s.missing ?? '—';
    if (s.scanError) toast(s.scanError, true);
  } catch (e) {
    toast(String(e), true);
  }
}
async function sync(push) {
  try {
    setBusy(true);
    $('stage').textContent = 'Syncing collection…';
    const r = await window.osuMaps.sync(push);
    toast(`Synced ${r.synced}; added ${r.added}; ${r.total} total.`);
    await refresh();
  } catch (e) {
    toast(String(e), true);
  } finally {
    setBusy(false);
    $('stage').textContent = 'Ready';
  }
}
function progress(p) {
  if (p.type === 'import') {
    $('stage').textContent = `Importing ${p.index} of ${p.total}`;
    $('progress').value = Math.round((p.index / p.total) * 100);
    $('percent').textContent = `${Math.round((p.index / p.total) * 100)}%`;
    return;
  }
  let row = rows.get(p.id);
  if (!row) {
    row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div><strong></strong><small></small></div><div class="bytes"></div><div class="status"></div>`;
    $('activity').replaceChildren(...rows.values(), row);
    rows.set(p.id, row);
  }
  row.querySelector('strong').textContent = `${p.artist} — ${p.title}`;
  row.querySelector('small').textContent = `Beatmapset ${p.id}${p.error ? ' · ' + p.error : ''}`;
  row.querySelector('.status').textContent = p.state;
  row.querySelector('.bytes').textContent = p.total
    ? `${Math.round((p.received / 1048576) * 10) / 10} / ${Math.round((p.total / 1048576) * 10) / 10} MB`
    : '';
  if (['complete', 'skipped', 'failed'].includes(p.state) && !row.dataset.done) {
    row.dataset.done = '1';
    done++;
  }
  $('progress').value = expected ? Math.round((done / expected) * 100) : 0;
  $('percent').textContent = `${$('progress').value}%`;
  $('summary').textContent = `${done} of ${expected} finished`;
}
$('refresh').onclick = refresh;
$('sync').onclick = () => sync(false);
$('syncPush').onclick = () => sync(true);
$('cancel').onclick = () => window.osuMaps.cancel();
$('restore').onclick = async () => {
  rows.clear();
  done = 0;
  $('activity').innerHTML = '';
  setBusy(true);
  try {
    const status = await window.osuMaps.status();
    expected = $('onlyMissing').checked ? (status.missing ?? status.total) : status.total;
    $('queue').textContent = expected;
    $('stage').textContent = 'Downloading…';
    const r = await window.osuMaps.restore({
      provider: $('provider').value,
      concurrency: Number($('concurrency').value),
      onlyMissing: $('onlyMissing').checked,
      importAfter: $('importAfter').checked,
    });
    toast(`Restore complete: ${r.downloaded} downloaded, ${r.imported} handed to lazer.`);
    $('stage').textContent = 'Complete';
    await refresh();
  } catch (e) {
    toast(String(e), true);
    $('stage').textContent = 'Stopped';
  } finally {
    setBusy(false);
  }
};
window.osuMaps.onProgress(progress);
refresh();
