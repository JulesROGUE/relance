import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Icon } from '../m3/index.jsx';
import { STATUS_BY_VALUE, TYPE_LABEL, diffDays, fillTemplate, formatDate, nextStep, relative, today } from '../data.js';

const GROUPS = [
  { id: 'late', label: 'En retard', test: (n) => n < 0 },
  { id: 'today', label: "Aujourd'hui", test: (n) => n === 0 },
  { id: 'week', label: 'Dans les 7 prochains jours', test: (n) => n > 0 && n <= 7 },
  { id: 'later', label: 'Plus tard', test: (n) => n > 7 },
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export default function FollowUps({ apps, settings, onOpen, onMarkDone, onPostpone, notify }) {
  const ref = today();
  const items = useMemo(
    () =>
      apps
        .map((app) => ({ app, step: nextStep(app, settings, ref) }))
        .filter((x) => x.step)
        .map((x) => ({ ...x, n: diffDays(x.step.due, ref) }))
        .sort((a, b) => a.n - b.n),
    [apps, settings, ref],
  );
  const [selectedId, setSelectedId] = useState(null);
  const selected = items.find((x) => x.app.id === selectedId) || items[0];

  if (!items.length) {
    return (
      <EmptyState icon="mark_email_read" title="Rien à relancer pour le moment">
        Les candidatures envoyées apparaîtront ici {settings.followupDays} jours après votre dernier échange,
        avec un message de relance prêt à copier.
      </EmptyState>
    );
  }

  const message = selected?.step.template ? fillTemplate(settings.templates?.[selected.step.template], selected.app, settings) : '';

  return (
    <div className="rl-follow">
      <div className="rl-follow__list" role="list">
        {GROUPS.map((g) => {
          const list = items.filter((x) => g.test(x.n));
          if (!list.length) return null;
          return (
            <div key={g.id} className="rl-follow__group">
              <div className={`rl-follow__group-title is-${g.id}`}>
                <span className="label-large">{g.label}</span>
                <span className="rl-col__count">{list.length}</span>
              </div>
              {list.map(({ app, step, n }) => (
                <button
                  key={app.id}
                  type="button"
                  role="listitem"
                  className={`rl-follow__item m3-sl${selected?.app.id === app.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(app.id)}
                >
                  <span className={`rl-card__logo is-${app.status}`} aria-hidden="true">{app.company.charAt(0).toUpperCase()}</span>
                  <span className="rl-follow__text">
                    <span className="rl-follow__company">{app.company}</span>
                    <span className="rl-follow__role">{step.label} · {app.role}</span>
                  </span>
                  <span className={`rl-follow__when${n < 0 ? ' is-late' : n === 0 ? ' is-today' : ''}`}>
                    {n < 0 ? `${-n} j de retard` : relative(step.due)}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {selected && (
        <Card variant="outlined" className="rl-follow__detail">
          <div className="rl-follow__head">
            <span className={`rl-card__logo is-large is-${selected.app.status}`} aria-hidden="true">
              {selected.app.company.charAt(0).toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="title-large rl-ellipsis">{selected.app.company}</div>
              <div className="body-medium m3-muted rl-ellipsis">{selected.app.role} · {TYPE_LABEL[selected.app.type]}</div>
            </div>
            <Button variant="text" icon="open_in_new" onClick={() => onOpen(selected.app)}>Fiche</Button>
          </div>

          <div className="rl-facts">
            <div><span className="label-medium m3-muted">Statut</span><span className="body-medium">{STATUS_BY_VALUE[selected.app.status].label}</span></div>
            <div><span className="label-medium m3-muted">Candidature</span><span className="body-medium">{formatDate(selected.app.appliedAt) || '—'}</span></div>
            <div><span className="label-medium m3-muted">Contact</span><span className="body-medium rl-ellipsis">{selected.app.contact || '—'}</span></div>
            <div><span className="label-medium m3-muted">Échéance</span><span className="body-medium">{formatDate(selected.step.due)}</span></div>
          </div>

          {message ? (
            <>
              <div className="rl-follow__msg-head">
                <Icon name="draft" size={20} />
                <span className="title-small">Message suggéré</span>
                <span className="body-small m3-muted">modifiable dans Réglages</span>
              </div>
              <pre className="rl-message">{message}</pre>
            </>
          ) : (
            <div className="rl-hint body-medium">
              <Icon name="info" size={20} />
              Vous aviez prévu de postuler à cette offre avant le {formatDate(selected.step.due)}.
            </div>
          )}

          <div className="m3-row rl-follow__actions">
            {message && (
              <Button
                variant="tonal"
                icon="content_copy"
                onClick={async () => notify((await copyText(message)) ? 'Message copié dans le presse-papiers.' : 'Impossible de copier le message.')}
              >
                Copier le message
              </Button>
            )}
            <Button variant="outlined" icon="snooze" onClick={() => onPostpone(selected.app, 3)}>Reporter de 3 jours</Button>
            <Button icon="done" onClick={() => onMarkDone(selected.app, selected.step)} style={{ marginLeft: 'auto' }}>
              {selected.step.kind === 'postuler' ? 'Candidature envoyée' : 'Relance faite'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
