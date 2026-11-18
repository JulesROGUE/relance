// Relance: data model, dates and computed indicators (no UI here).

export const STORAGE_KEYS = { apps: 'relance.apps', settings: 'relance.settings' };

/** Pipeline stages, in board order. */
export const STATUSES = [
  { value: 'wish', label: 'À postuler', short: 'À postuler', icon: 'bookmark' },
  { value: 'sent', label: 'Envoyée', short: 'Envoyée', icon: 'send' },
  { value: 'followup', label: 'Relancée', short: 'Relancée', icon: 'forward_to_inbox' },
  { value: 'interview', label: 'Entretien', short: 'Entretien', icon: 'groups' },
  { value: 'offer', label: 'Offre', short: 'Offre', icon: 'workspace_premium' },
  { value: 'rejected', label: 'Refusée', short: 'Refus', icon: 'block' },
];
export const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map((s) => [s.value, s]));
export const ACTIVE_STATUSES = ['sent', 'followup', 'interview'];
export const RESPONSE_STATUSES = ['interview', 'offer', 'rejected'];

export const TYPES = [
  { value: 'alternance', label: 'Alternance' },
  { value: 'stage', label: 'Stage' },
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'freelance', label: 'Mission freelance' },
];
export const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

export const SOURCES = [
  'Site carrière',
  'Job board',
  'Candidature spontanée',
  'Réseau / recommandation',
  'Forum ou salon',
  'École',
  'Autre',
];

export const DEFAULT_TEMPLATES = {
  relance:
    'Objet : Ma candidature au poste de {poste}\n\nBonjour {contact},\n\nJe me permets de revenir vers vous au sujet de ma candidature au poste de {poste}, envoyée le {date}. Ce poste chez {entreprise} m\'intéresse toujours beaucoup et je serais ravi d\'échanger avec vous sur mon profil.\n\nJe reste disponible pour un entretien à votre convenance.\n\nBien cordialement,\n{signature}',
  entretien:
    'Objet : Suite à notre entretien pour le poste de {poste}\n\nBonjour {contact},\n\nMerci encore pour notre échange au sujet du poste de {poste}. Il a renforcé mon envie de rejoindre {entreprise}.\n\nAuriez-vous des nouvelles concernant la suite du processus ? Je reste à votre disposition pour tout complément.\n\nBien cordialement,\n{signature}',
};

export const DEFAULT_SETTINGS = {
  followupDays: 7,
  weeklyGoal: 5,
  signature: '',
  templates: DEFAULT_TEMPLATES,
};

// ---------- Dates (local calendar days, stored as YYYY-MM-DD) ----------
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export function parseISO(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso, n) {
  const d = parseISO(iso) || new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a, b) {
  const da = parseISO(a);
  const db = parseISO(b);
  if (!da || !db) return 0;
  return Math.round((da - db) / 86400000);
}
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
export const formatDate = (iso) => (parseISO(iso) ? dateFmt.format(parseISO(iso)) : '');
export const formatShort = (iso) => (parseISO(iso) ? shortFmt.format(parseISO(iso)) : '');

/** "aujourd'hui", "hier", "il y a 5 j", "dans 3 j" */
export function relative(iso, ref = today()) {
  const n = diffDays(iso, ref);
  if (n === 0) return "aujourd'hui";
  if (n === -1) return 'hier';
  if (n === 1) return 'demain';
  return n < 0 ? `il y a ${-n} j` : `dans ${n} j`;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function newApplication(partial = {}) {
  const t = today();
  return {
    id: uid(),
    company: '',
    role: '',
    type: 'alternance',
    location: '',
    source: SOURCES[0],
    url: '',
    contact: '',
    contactEmail: '',
    status: 'sent',
    appliedAt: t,
    lastActionAt: t,
    nextActionAt: '',
    notes: '',
    history: [],
    createdAt: t,
    ...partial,
  };
}

// ---------- Follow-ups ----------
/** What to do next for an application, or null when nothing is expected. */
export function nextStep(app, settings, ref = today()) {
  const delay = Math.max(1, Number(settings.followupDays) || 7);
  if (app.status === 'wish') {
    if (!app.nextActionAt) return null;
    return { kind: 'postuler', label: 'Postuler', due: app.nextActionAt, template: null };
  }
  if (app.status === 'sent' || app.status === 'followup') {
    const due = app.nextActionAt || addDays(app.lastActionAt || app.appliedAt || ref, delay);
    return { kind: 'relance', label: app.status === 'followup' ? 'Nouvelle relance' : 'Relancer', due, template: 'relance' };
  }
  if (app.status === 'interview') {
    const due = app.nextActionAt || addDays(app.lastActionAt || ref, Math.min(delay, 5));
    return { kind: 'entretien', label: "Relancer après l'entretien", due, template: 'entretien' };
  }
  return null;
}

/** Days until the next step (negative = late). */
export function dueIn(app, settings, ref = today()) {
  const step = nextStep(app, settings, ref);
  return step ? diffDays(step.due, ref) : null;
}

export function fillTemplate(text, app, settings) {
  const values = {
    entreprise: app.company || "l'entreprise",
    poste: app.role || 'proposé',
    contact: app.contact ? app.contact.trim() : 'Madame, Monsieur',
    date: formatDate(app.appliedAt) || 'récemment',
    signature: settings.signature?.trim() || '[Votre nom]',
  };
  return String(text || '').replace(/\{(entreprise|poste|contact|date|signature)\}/g, (_, k) => values[k]);
}

/** Apply a status change and keep the history. */
export function withStatus(app, status, note = '') {
  if (app.status === status) return app;
  const t = today();
  return {
    ...app,
    status,
    appliedAt: status !== 'wish' && !app.appliedAt ? t : app.appliedAt,
    lastActionAt: t,
    nextActionAt: '',
    history: [...(app.history || []), { date: t, status, note }],
  };
}

// ---------- Stats ----------
function firstResponseDate(app) {
  const h = (app.history || []).find((e) => RESPONSE_STATUSES.includes(e.status));
  return h ? h.date : null;
}
const reachedInterview = (app) =>
  ['interview', 'offer'].includes(app.status) || (app.history || []).some((e) => e.status === 'interview' || e.status === 'offer');

/** Monday of the week containing iso. */
export function weekStart(iso) {
  const d = parseISO(iso) || new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toISO(d);
}

export function computeStats(apps, ref = today()) {
  const sent = apps.filter((a) => a.status !== 'wish' && a.appliedAt);
  const responded = sent.filter((a) => RESPONSE_STATUSES.includes(a.status) || firstResponseDate(a));
  const interviews = sent.filter(reachedInterview);
  const offers = sent.filter((a) => a.status === 'offer');
  const delays = responded
    .map((a) => {
      const r = firstResponseDate(a);
      return r ? diffDays(r, a.appliedAt) : null;
    })
    .filter((n) => n != null && n >= 0);
  const avgDelay = delays.length ? Math.round(delays.reduce((s, n) => s + n, 0) / delays.length) : null;

  const thisWeek = weekStart(ref);
  const weeks = [];
  for (let i = 7; i >= 0; i -= 1) {
    const start = addDays(thisWeek, -7 * i);
    const end = addDays(start, 7);
    weeks.push({
      start,
      count: sent.filter((a) => a.appliedAt >= start && a.appliedAt < end).length,
      current: i === 0,
    });
  }

  const bySource = SOURCES.map((source) => {
    const list = sent.filter((a) => a.source === source);
    const inter = list.filter(reachedInterview).length;
    return { source, sent: list.length, interviews: inter, rate: list.length ? inter / list.length : 0 };
  })
    .filter((s) => s.sent > 0)
    .sort((a, b) => b.rate - a.rate || b.sent - a.sent);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s.value, apps.filter((a) => a.status === s.value).length]));

  return {
    total: apps.length,
    sent: sent.length,
    responded: responded.length,
    interviews: interviews.length,
    offers: offers.length,
    responseRate: sent.length ? responded.length / sent.length : 0,
    interviewRate: sent.length ? interviews.length / sent.length : 0,
    avgDelay,
    weeks,
    thisWeekCount: weeks[weeks.length - 1].count,
    bySource,
    byStatus,
  };
}

// ---------- Export / import ----------
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCSV(apps) {
  const head = ['Entreprise', 'Poste', 'Type', 'Lieu', 'Source', 'Statut', 'Date de candidature', 'Dernière action', 'Contact', 'E-mail', 'Lien', 'Notes'];
  const rows = apps.map((a) => [
    a.company, a.role, TYPE_LABEL[a.type] || a.type, a.location, a.source, STATUS_BY_VALUE[a.status]?.label || a.status,
    a.appliedAt, a.lastActionAt, a.contact, a.contactEmail, a.url, a.notes,
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }
  const list = Array.isArray(data) ? data : data?.applications;
  if (!Array.isArray(list)) throw new Error('Aucune candidature trouvée dans ce fichier.');
  const valid = new Set(STATUSES.map((s) => s.value));
  const apps = list
    .filter((a) => a && typeof a === 'object' && (a.company || a.role))
    .map((a) => newApplication({
      ...a,
      id: typeof a.id === 'string' && a.id ? a.id : uid(),
      status: valid.has(a.status) ? a.status : 'sent',
      history: Array.isArray(a.history) ? a.history.filter((h) => h && h.date && h.status) : [],
    }));
  return { apps, settings: data && typeof data.settings === 'object' && !Array.isArray(data) ? data.settings : null };
}
