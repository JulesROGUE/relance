import { useState } from 'react';
import { Button, EmptyState, Icon, IconButton } from '../m3/index.jsx';
import { STATUSES, TYPE_LABEL, diffDays, dueIn, nextStep, today } from '../data.js';

const NEXT = { wish: 'sent', sent: 'followup', followup: 'interview', interview: 'offer' };

function DueChip({ app, settings }) {
  const n = dueIn(app, settings);
  if (n == null) return null;
  const verb = nextStep(app, settings).kind === 'postuler' ? 'Postuler' : 'Relancer';
  if (n < 0) return <span className="rl-due is-late"><Icon name="schedule" size={14} />{verb === 'Postuler' ? 'Date dépassée' : `En retard · ${-n} j`}</span>;
  if (n === 0) return <span className="rl-due is-today"><Icon name="notifications_active" size={14} />{verb} aujourd'hui</span>;
  if (n <= 2) return <span className="rl-due"><Icon name="event" size={14} />{verb} {n === 1 ? 'demain' : `dans ${n} j`}</span>;
  return null;
}

const ago = (iso) => {
  const n = -diffDays(iso, today());
  return n <= 0 ? ['auj.', "aujourd'hui"] : [`${n} j`, n === 1 ? 'hier' : `il y a ${n} jours`];
};

function AppCard({ app, settings, onOpen, onAdvance, onDragStart }) {
  const [sinceLabel, sinceLong] = ago(app.status === 'wish' ? app.createdAt : app.lastActionAt || app.appliedAt);
  return (
    <article
      className={`rl-card is-${app.status}`}
      draggable
      onDragStart={(e) => onDragStart(e, app)}
      onClick={() => onOpen(app)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(app)}
      tabIndex={0}
      aria-label={`${app.company}, ${app.role}`}
      title={app.location ? `${app.company} · ${app.location}` : app.company}
    >
      <div className="rl-card__company">{app.company}</div>
      <div className="rl-card__role">{app.role}</div>
      <div className="rl-card__meta">
        <span className="rl-tag">{TYPE_LABEL[app.type] || app.type}</span>
        <span className="rl-card__since" title={`Dernière action : ${sinceLong}`}><Icon name="history" size={14} />{sinceLabel}</span>
        {NEXT[app.status] && (
          <IconButton
            icon="arrow_forward"
            label={`Passer à « ${STATUSES.find((s) => s.value === NEXT[app.status]).label} »`}
            className="rl-card__advance"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(app, NEXT[app.status]);
            }}
          />
        )}
      </div>
      <DueChip app={app} settings={settings} />
    </article>
  );
}

export default function Board({ apps, settings, query, typeFilter, onOpen, onAdd, onMove }) {
  const [dragOver, setDragOver] = useState(null);
  const q = query.trim().toLowerCase();
  const visible = apps.filter(
    (a) =>
      (typeFilter === 'all' || a.type === typeFilter) &&
      (!q || [a.company, a.role, a.location, a.contact, a.notes].some((v) => (v || '').toLowerCase().includes(q))),
  );

  if (!apps.length) {
    return (
      <div className="rl-empty-board">
        <EmptyState
          icon="work_history"
          title="Aucune candidature pour l'instant"
          action={<Button icon="add" onClick={() => onAdd('sent')}>Ajouter ma première candidature</Button>}
        >
          Notez chaque offre visée ou candidature envoyée : Relance vous rappelle quand relancer et garde l'historique de chaque échange.
          <br />Tout reste sur cet ordinateur.
        </EmptyState>
      </div>
    );
  }

  const onDragStart = (e, app) => {
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="rl-board">
      {STATUSES.map((col) => {
        const items = visible
          .filter((a) => a.status === col.value)
          .sort((a, b) => (dueIn(a, settings) ?? 999) - (dueIn(b, settings) ?? 999) || (b.lastActionAt || '').localeCompare(a.lastActionAt || ''));
        return (
          <section
            key={col.value}
            className={`rl-col is-${col.value}${dragOver === col.value ? ' is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.value);
            }}
            onDragLeave={() => setDragOver((v) => (v === col.value ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData('text/plain');
              const app = apps.find((a) => a.id === id);
              if (app && app.status !== col.value) onMove(app, col.value);
            }}
            aria-label={col.label}
          >
            <header className="rl-col__head">
              <Icon name={col.icon} size={18} />
              <span className="title-small">{col.label}</span>
              <span className="rl-col__count">{items.length}</span>
            </header>
            <div className="rl-col__list">
              {items.map((a) => (
                <AppCard key={a.id} app={a} settings={settings} onOpen={onOpen} onAdvance={onMove} onDragStart={onDragStart} />
              ))}
              {!items.length && (
                <div className="rl-col__empty body-small">
                  {q || typeFilter !== 'all' ? 'Aucun résultat' : col.value === 'wish' ? 'Les offres repérées' : 'Glissez une carte ici'}
                </div>
              )}
              {(col.value === 'wish' || col.value === 'sent') && (
                <button type="button" className="rl-col__add m3-sl" onClick={() => onAdd(col.value)}>
                  <Icon name="add" size={18} />Ajouter
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
