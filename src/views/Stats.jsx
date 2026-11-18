import { Card, EmptyState, Icon, LinearProgress } from '../m3/index.jsx';
import { computeStats, dueIn, formatShort } from '../data.js';

const pct = (x) => `${Math.round(x * 100)} %`;

function Kpi({ icon, label, value, hint, tone = 'primary' }) {
  return (
    <Card variant="filled" className={`rl-kpi is-${tone}`}>
      <div className="rl-kpi__icon"><Icon name={icon} /></div>
      <div className="rl-kpi__value">{value}</div>
      <div className="label-large">{label}</div>
      {hint && <div className="body-small m3-muted">{hint}</div>}
    </Card>
  );
}

function WeeklyChart({ weeks, goal }) {
  const W = 620;
  const H = 200;
  const pad = { l: 28, r: 8, t: 12, b: 28 };
  const max = Math.max(goal || 0, ...weeks.map((w) => w.count), 4);
  const top = Math.ceil(max / 2) * 2;
  const bw = (W - pad.l - pad.r) / weeks.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const ticks = [0, top / 2, top];
  return (
    <svg className="rl-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Candidatures envoyées par semaine">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="rl-chart__grid" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="rl-chart__tick">{t}</text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const x = pad.l + i * bw + bw * 0.2;
        const h = y(0) - y(w.count);
        return (
          <g key={w.start}>
            <rect x={x} y={y(w.count)} width={bw * 0.6} height={Math.max(h, 0)} rx="6" className={w.current ? 'rl-chart__bar is-current' : 'rl-chart__bar'} />
            {w.count > 0 && <text x={x + bw * 0.3} y={y(w.count) - 6} textAnchor="middle" className="rl-chart__value">{w.count}</text>}
            <text x={x + bw * 0.3} y={H - 8} textAnchor="middle" className="rl-chart__tick">{formatShort(w.start)}</text>
          </g>
        );
      })}
      {goal > 0 && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} className="rl-chart__goal" />
          <text x={W - pad.r} y={y(goal) - 6} textAnchor="end" className="rl-chart__goal-label">objectif {goal}</text>
        </g>
      )}
    </svg>
  );
}

export default function Stats({ apps, settings }) {
  const s = computeStats(apps);
  if (!s.sent) {
    return (
      <EmptyState icon="query_stats" title="Pas encore de statistiques">
        Votre bilan (taux de réponse, entretiens, sources qui marchent le mieux) apparaîtra dès votre première candidature envoyée.
      </EmptyState>
    );
  }
  const goal = Number(settings.weeklyGoal) || 0;
  const best = s.bySource.find((r) => r.interviews > 0);
  const pending = apps.filter((a) => {
    const n = dueIn(a, settings);
    return n != null && n <= 0;
  }).length;
  const insights = [
    best && { icon: 'star', text: `Meilleure source : ${best.source} (${pct(best.rate)} d'entretiens).` },
    { icon: 'notifications', text: pending ? `${pending} action(s) à faire aujourd'hui ou en retard.` : 'Aucune action en retard : tout est à jour.' },
    goal > 0 && {
      icon: 'flag',
      text: s.thisWeekCount >= goal ? 'Objectif de la semaine atteint, bravo !' : `Encore ${goal - s.thisWeekCount} candidature(s) pour atteindre l'objectif de la semaine.`,
    },
  ].filter(Boolean);
  const funnel = [
    { label: 'Envoyées', value: s.sent, tone: 'primary' },
    { label: 'Réponses', value: s.responded, tone: 'secondary' },
    { label: 'Entretiens', value: s.interviews, tone: 'tertiary' },
    { label: 'Offres', value: s.offers, tone: 'ok' },
  ];

  return (
    <div className="m3-stack rl-stats">
      <div className="rl-kpis">
        <Kpi icon="send" label="Candidatures envoyées" value={s.sent} hint={`${s.byStatus.wish} offre(s) en attente d'envoi`} />
        <Kpi icon="mark_email_unread" label="Taux de réponse" value={pct(s.responseRate)} hint={`${s.responded} réponse(s), positives ou non`} tone="secondary" />
        <Kpi icon="groups" label="Entretiens obtenus" value={s.interviews} hint={`${pct(s.interviewRate)} des candidatures`} tone="tertiary" />
        <Kpi icon="timer" label="Délai moyen de réponse" value={s.avgDelay == null ? '—' : `${s.avgDelay} j`} hint="entre l'envoi et la 1re réponse" tone="ok" />
      </div>

      <div className="rl-stats__grid">
        <Card variant="outlined">
          <div className="rl-card-title">
            <span className="title-medium">Rythme hebdomadaire</span>
            <span className="body-small m3-muted">
              Cette semaine : {s.thisWeekCount}{goal ? ` / ${goal}` : ''}
            </span>
          </div>
          {goal > 0 && <LinearProgress value={Math.min(1, s.thisWeekCount / goal)} className="rl-goal-bar" />}
          <WeeklyChart weeks={s.weeks} goal={goal} />
        </Card>

        <Card variant="outlined">
          <div className="rl-card-title"><span className="title-medium">Entonnoir</span></div>
          <div className="rl-funnel">
            {funnel.map((f) => (
              <div key={f.label} className="rl-funnel__row">
                <span className="body-medium">{f.label}</span>
                <div className="rl-funnel__track">
                  <div className={`rl-funnel__bar is-${f.tone}`} style={{ width: `${Math.max(4, (f.value / s.sent) * 100)}%` }} />
                </div>
                <span className="label-large rl-funnel__num">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="rl-insights">
            {insights.map((t) => (
              <div key={t.text} className="rl-insight body-medium"><Icon name={t.icon} size={20} />{t.text}</div>
            ))}
          </div>
        </Card>
      </div>

      <Card variant="outlined">
        <div className="rl-card-title">
          <span className="title-medium">Sources qui mènent à un entretien</span>
          <span className="body-small m3-muted">Concentrez vos efforts sur ce qui fonctionne</span>
        </div>
        <table className="rl-table">
          <thead>
            <tr><th>Source</th><th>Envoyées</th><th>Entretiens</th><th style={{ width: '40%' }}>Taux</th></tr>
          </thead>
          <tbody>
            {s.bySource.map((r) => (
              <tr key={r.source}>
                <td>{r.source}</td>
                <td>{r.sent}</td>
                <td>{r.interviews}</td>
                <td>
                  <div className="rl-rate">
                    <div className="rl-funnel__track"><div className="rl-funnel__bar is-tertiary" style={{ width: `${Math.max(2, r.rate * 100)}%` }} /></div>
                    <span className="label-large">{pct(r.rate)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
