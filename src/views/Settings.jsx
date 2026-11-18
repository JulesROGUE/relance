import { useState } from 'react';
import { Button, Card, Dialog, Icon, SegmentedButton, Slider, TextField } from '../m3/index.jsx';
import { DEFAULT_TEMPLATES } from '../data.js';
import { getThemeMode, setThemeMode } from '../lib/theme.js';

export default function Settings({ settings, setSettings, count, onExportJSON, onExportCSV, onImport, onClear }) {
  const [theme, setTheme] = useState(getThemeMode());
  const [confirm, setConfirm] = useState(false);
  const set = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));
  const setTemplate = (key) => (value) => setSettings((s) => ({ ...s, templates: { ...s.templates, [key]: value } }));

  return (
    <div className="rl-settings">
      <div className="m3-stack">
        <Card variant="outlined" className="m3-stack">
          <div className="rl-card-title"><span className="title-medium">Rappels</span></div>
          <div className="rl-setting">
            <div>
              <div className="body-large">Relancer après</div>
              <div className="body-small m3-muted">Délai sans réponse avant de proposer une relance.</div>
            </div>
            <div className="rl-setting__control">
              <Slider value={settings.followupDays} min={3} max={21} onChange={set('followupDays')} label="Délai de relance en jours" />
              <span className="label-large rl-setting__value">{settings.followupDays} j</span>
            </div>
          </div>
          <div className="rl-setting">
            <div>
              <div className="body-large">Objectif hebdomadaire</div>
              <div className="body-small m3-muted">Nombre de candidatures à envoyer par semaine.</div>
            </div>
            <div className="rl-setting__control">
              <Slider value={settings.weeklyGoal} min={0} max={20} onChange={set('weeklyGoal')} label="Objectif hebdomadaire" />
              <span className="label-large rl-setting__value">{settings.weeklyGoal || '—'}</span>
            </div>
          </div>
          <TextField label="Signature des messages" value={settings.signature} onChange={set('signature')} supportingText="Remplace {signature} dans les modèles." />
        </Card>

        <Card variant="outlined" className="m3-stack">
          <div className="rl-card-title"><span className="title-medium">Apparence</span></div>
          <SegmentedButton
            value={theme}
            onChange={(v) => {
              setTheme(v);
              setThemeMode(v);
            }}
            options={[
              { value: 'system', label: 'Système', icon: 'computer' },
              { value: 'light', label: 'Clair', icon: 'light_mode' },
              { value: 'dark', label: 'Sombre', icon: 'dark_mode' },
            ]}
          />
        </Card>

        <Card variant="outlined" className="m3-stack">
          <div className="rl-card-title">
            <span className="title-medium">Vos données</span>
            <span className="body-small m3-muted">{count} candidature(s), stockées uniquement sur cet ordinateur</span>
          </div>
          <div className="m3-row">
            <Button variant="tonal" icon="download" onClick={onExportJSON}>Sauvegarder (.json)</Button>
            <Button variant="outlined" icon="upload" onClick={onImport}>Restaurer</Button>
            <Button variant="outlined" icon="table_view" onClick={onExportCSV}>Exporter en CSV</Button>
          </div>
          <div>
            <Button variant="text" icon="delete_forever" onClick={() => setConfirm(true)} disabled={!count} style={{ color: count ? 'var(--md-sys-color-error)' : undefined }}>
              Tout effacer
            </Button>
          </div>
        </Card>
      </div>

      <Card variant="outlined" className="m3-stack">
        <div className="rl-card-title">
          <span className="title-medium">Modèles de messages</span>
          <Button variant="text" icon="restart_alt" onClick={() => set('templates')(DEFAULT_TEMPLATES)}>Rétablir</Button>
        </div>
        <div className="rl-hint body-small">
          <Icon name="data_object" size={18} />
          Variables : {'{entreprise}'} {'{poste}'} {'{contact}'} {'{date}'} {'{signature}'}
        </div>
        <TextField label="Relance après candidature" multiline value={settings.templates.relance} onChange={setTemplate('relance')} className="rl-template" />
        <TextField label="Relance après entretien" multiline value={settings.templates.entretien} onChange={setTemplate('entretien')} className="rl-template" />
      </Card>

      <Dialog
        open={confirm}
        icon="warning"
        headline="Effacer toutes les candidatures ?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Button variant="text" onClick={() => setConfirm(false)}>Annuler</Button>
            <Button variant="danger" onClick={() => { onClear(); setConfirm(false); }}>Tout effacer</Button>
          </>
        }
      >
        Les {count} candidatures et leur historique seront supprimés de cet ordinateur. Pensez à faire une sauvegarde avant.
      </Dialog>
    </div>
  );
}
