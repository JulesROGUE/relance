import { useEffect, useState } from 'react';
import { Button, Dialog, TextField, Icon } from '../m3/index.jsx';
import { STATUSES, STATUS_BY_VALUE, TYPES, SOURCES, formatDate, newApplication, withStatus } from '../data.js';

/** Create or edit one application. */
export default function ApplicationDialog({ open, initial, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => initial || newApplication());
  const [errors, setErrors] = useState({});
  const isNew = !initial?.company && !initial?.role && !(initial?.history || []).length;

  useEffect(() => {
    if (open) {
      setDraft(initial || newApplication());
      setErrors({});
    }
  }, [open, initial]);

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  function submit(e) {
    e?.preventDefault();
    const next = {};
    if (!draft.company.trim()) next.company = "Indiquez le nom de l'entreprise.";
    if (!draft.role.trim()) next.role = 'Indiquez le poste visé.';
    if (draft.url && !/^https?:\/\//i.test(draft.url.trim())) next.url = 'Le lien doit commencer par https://';
    setErrors(next);
    if (Object.keys(next).length) return;
    let result = { ...draft, company: draft.company.trim(), role: draft.role.trim(), url: draft.url.trim() };
    if (isNew) {
      result.history = [{ date: result.appliedAt || result.createdAt, status: result.status, note: '' }];
      if (result.status === 'wish') result.appliedAt = '';
      else result.lastActionAt = result.appliedAt || result.lastActionAt;
    } else if (initial.status !== draft.status) {
      result = { ...withStatus({ ...result, status: initial.status }, draft.status), nextActionAt: draft.nextActionAt };
    }
    onSave(result);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      headline={isNew ? 'Nouvelle candidature' : 'Modifier la candidature'}
      actions={
        <>
          {!isNew && onDelete && (
            <Button variant="text" icon="delete" onClick={() => onDelete(draft)} style={{ marginRight: 'auto', color: 'var(--md-sys-color-error)' }}>
              Supprimer
            </Button>
          )}
          <Button variant="text" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} icon="check">Enregistrer</Button>
        </>
      }
    >
      <form className="rl-form" onSubmit={submit}>
        <TextField label="Entreprise *" value={draft.company} onChange={set('company')} error={errors.company} autoFocus />
        <TextField label="Poste *" value={draft.role} onChange={set('role')} error={errors.role} />
        <TextField label="Type de contrat" value={draft.type} onChange={set('type')} options={TYPES} />
        <TextField label="Statut" value={draft.status} onChange={set('status')} options={STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        <TextField label="Source" value={draft.source} onChange={set('source')} options={SOURCES.map((s) => ({ value: s, label: s }))} />
        <TextField label="Lieu" value={draft.location} onChange={set('location')} />
        <TextField label="Date de candidature" type="date" value={draft.appliedAt || ''} onChange={set('appliedAt')} />
        <TextField
          label="Prochaine action (facultatif)"
          type="date"
          value={draft.nextActionAt || ''}
          onChange={set('nextActionAt')}
        />
        <TextField label="Contact" value={draft.contact} onChange={set('contact')} />
        <TextField label="E-mail du contact" value={draft.contactEmail} onChange={set('contactEmail')} />
        <TextField className="rl-span" label="Lien de l'offre" value={draft.url} onChange={set('url')} error={errors.url} placeholder="https://" />
        <TextField className="rl-span" label="Notes" multiline value={draft.notes} onChange={set('notes')} />
        <button type="submit" hidden aria-hidden="true" />
      </form>
      {!isNew && (draft.history || []).length > 0 && (
        <div className="rl-history">
          <div className="label-large">Historique</div>
          <ol>
            {[...draft.history].reverse().map((h, i) => (
              <li key={`${h.date}-${i}`}>
                <Icon name={STATUS_BY_VALUE[h.status]?.icon || 'radio_button_checked'} size={18} />
                <span className="body-medium">{STATUS_BY_VALUE[h.status]?.label || h.status}</span>
                <span className="body-small m3-muted">{formatDate(h.date)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Dialog>
  );
}
