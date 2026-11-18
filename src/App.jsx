import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Chip, ChipSet, FAB, IconButton, NavigationRail, SearchBar, Snackbar, TopAppBar } from './m3/index.jsx';
import { usePersistentState } from './lib/storage.js';
import { openTextFile, saveTextFile } from './lib/files.js';
import {
  DEFAULT_SETTINGS, DEFAULT_TEMPLATES, STATUS_BY_VALUE, STORAGE_KEYS, TYPES,
  addDays, dueIn, newApplication, parseBackup, toCSV, today, withStatus,
} from './data.js';
import ApplicationDialog from './components/ApplicationDialog.jsx';
import Board from './views/Board.jsx';
import FollowUps from './views/FollowUps.jsx';
import Stats from './views/Stats.jsx';
import Settings from './views/Settings.jsx';
import './app.css';

const VIEWS = ['tableau', 'relances', 'bilan', 'reglages'];
const TITLES = { tableau: 'Mes candidatures', relances: 'Relances à faire', bilan: 'Bilan de ma recherche', reglages: 'Réglages' };
const readHash = () => {
  const h = location.hash.replace('#', '');
  return VIEWS.includes(h) ? h : 'tableau';
};

export default function App() {
  const [view, setView] = useState(readHash);
  const [apps, setApps] = usePersistentState(STORAGE_KEYS.apps, []);
  const [storedSettings, setSettings] = usePersistentState(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...storedSettings, templates: { ...DEFAULT_TEMPLATES, ...(storedSettings?.templates || {}) } }),
    [storedSettings],
  );
  const [editing, setEditing] = useState(null); // { initial } | null
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [snack, setSnack] = useState(null);

  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (v) => {
    location.hash = v;
    setView(v);
  };

  const notify = useCallback((message, undo) => setSnack({ message, undo, key: Date.now() }), []);
  const closeSnack = useCallback(() => setSnack(null), []);

  const dueCount = apps.filter((a) => {
    const n = dueIn(a, settings);
    return n != null && n <= 0;
  }).length;

  const upsert = (app) => setApps((list) => (list.some((a) => a.id === app.id) ? list.map((a) => (a.id === app.id ? app : a)) : [app, ...list]));

  const move = (app, status) => {
    const before = apps;
    upsert(withStatus(app, status));
    notify(`${app.company} → ${STATUS_BY_VALUE[status].label}`, () => setApps(before));
  };

  const markDone = (app, step) => {
    const before = apps;
    if (step.kind === 'postuler') upsert(withStatus(app, 'sent'));
    else if (app.status === 'sent') upsert(withStatus(app, 'followup', 'Relance envoyée'));
    else {
      const t = today();
      upsert({ ...app, lastActionAt: t, nextActionAt: '', history: [...(app.history || []), { date: t, status: app.status, note: 'Relance envoyée' }] });
    }
    notify(step.kind === 'postuler' ? `Candidature chez ${app.company} envoyée.` : `Relance chez ${app.company} notée.`, () => setApps(before));
  };

  const postpone = (app, days) => {
    upsert({ ...app, nextActionAt: addDays(today(), days) });
    notify(`Rappel reporté au ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(Date.now() + days * 864e5))}.`);
  };

  const remove = (app) => {
    const before = apps;
    setApps((list) => list.filter((a) => a.id !== app.id));
    setEditing(null);
    notify(`Candidature chez ${app.company || 'cette entreprise'} supprimée.`, () => setApps(before));
  };

  const exportJSON = async () => {
    const payload = JSON.stringify({ app: 'Relance', version: 1, exportedAt: new Date().toISOString(), settings: storedSettings, applications: apps }, null, 2);
    const r = await saveTextFile(`relance-sauvegarde-${today()}.json`, payload, [{ name: 'Sauvegarde Relance', extensions: ['json'] }]);
    if (r?.saved) notify('Sauvegarde enregistrée.');
  };
  const exportCSV = async () => {
    const r = await saveTextFile(`candidatures-${today()}.csv`, toCSV(apps), [{ name: 'Tableur CSV', extensions: ['csv'] }]);
    if (r?.saved) notify('Export CSV enregistré.');
  };
  const importJSON = async () => {
    try {
      const file = await openTextFile([{ name: 'Sauvegarde Relance', extensions: ['json'] }]);
      if (!file) return;
      const { apps: imported, settings: s } = parseBackup(file.content);
      const before = apps;
      setApps(imported);
      if (s) setSettings((cur) => ({ ...cur, ...s }));
      notify(`${imported.length} candidature(s) restaurée(s).`, () => setApps(before));
    } catch (e) {
      notify(e.message || 'Import impossible.');
    }
  };

  const openNew = (status = 'sent') => setEditing({ initial: newApplication({ status }) });

  return (
    <div className="m3-app">
      <NavigationRail
        value={view}
        onChange={go}
        fab={<FAB icon="add" label="Nouvelle candidature" onClick={() => openNew('sent')} />}
        items={[
          { value: 'tableau', label: 'Tableau', icon: 'view_kanban' },
          { value: 'relances', label: 'Relances', icon: 'notifications', badge: dueCount || undefined },
          { value: 'bilan', label: 'Bilan', icon: 'insights' },
          { value: 'reglages', label: 'Réglages', icon: 'settings' },
        ]}
      />
      <main className="m3-main">
        <TopAppBar
          title={
            <span className="rl-title">
              {TITLES[view]}
              {view === 'relances' && dueCount > 0 && <Badge>{dueCount}</Badge>}
            </span>
          }
          actions={
            view === 'tableau' && apps.length > 0 ? (
              <>
                <SearchBar value={query} onChange={setQuery} placeholder="Rechercher…" style={{ maxWidth: 360 }}
                  trailing={query ? <IconButton icon="close" label="Effacer la recherche" onClick={() => setQuery('')} /> : null} />
              </>
            ) : null
          }
        />
        {view === 'tableau' && apps.length > 0 && (
          <div className="rl-filters">
            <ChipSet>
              <Chip selected={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Toutes ({apps.length})</Chip>
              {TYPES.filter((t) => apps.some((a) => a.type === t.value)).map((t) => (
                <Chip key={t.value} selected={typeFilter === t.value} onClick={() => setTypeFilter(t.value)}>
                  {t.label} ({apps.filter((a) => a.type === t.value).length})
                </Chip>
              ))}
            </ChipSet>
          </div>
        )}
        <div className={`m3-content rl-content is-${view}`}>
          {view === 'tableau' && (
            <Board apps={apps} settings={settings} query={query} typeFilter={typeFilter}
              onOpen={(a) => setEditing({ initial: a })} onAdd={openNew} onMove={move} />
          )}
          {view === 'relances' && (
            <FollowUps apps={apps} settings={settings} onOpen={(a) => setEditing({ initial: a })} onMarkDone={markDone} onPostpone={postpone} notify={notify} />
          )}
          {view === 'bilan' && <Stats apps={apps} settings={settings} />}
          {view === 'reglages' && (
            <Settings settings={settings} setSettings={(fn) => setSettings((s) => fn({ ...DEFAULT_SETTINGS, ...s, templates: { ...DEFAULT_TEMPLATES, ...(s?.templates || {}) } }))}
              count={apps.length} onExportJSON={exportJSON} onExportCSV={exportCSV} onImport={importJSON} onClear={() => { setApps([]); notify('Toutes les candidatures ont été effacées.'); }} />
          )}
        </div>
      </main>

      <ApplicationDialog
        open={!!editing}
        initial={editing?.initial}
        onClose={() => setEditing(null)}
        onSave={(app) => {
          const isNew = !apps.some((a) => a.id === app.id);
          upsert(app);
          setEditing(null);
          notify(isNew ? `Candidature chez ${app.company} ajoutée.` : 'Modifications enregistrées.');
        }}
        onDelete={remove}
      />

      <Snackbar
        key={snack?.key}
        open={!!snack}
        message={snack?.message}
        actionLabel={snack?.undo ? 'Annuler' : undefined}
        onAction={() => {
          snack?.undo?.();
          setSnack(null);
        }}
        onClose={closeSnack}
      />
    </div>
  );
}
