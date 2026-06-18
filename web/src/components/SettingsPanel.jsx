import { useEffect, useRef, useState } from 'react';
import { fetchSettings, updateSettings, validateAwsConfig } from '../api.js';
import { createBlankRule, DEFAULT_SETTINGS, mergeSettings } from '../defaultSettings.js';
import PageHeader from './layout/PageHeader.jsx';
import Loader from './Loader.jsx';
import RuleEditModal from './RuleEditModal.jsx';
import {
  IconCloud,
  IconPlus,
  IconReset,
  IconSave,
  IconSettings,
} from './icons.jsx';

const SETTINGS_TABS = [
  { id: 'rules', label: 'Compliance Rules' },
  { id: 'aws', label: 'AWS Config' },
];

export default function SettingsPanel({
  onSettingsSaved,
  onAwsConfigValidated,
  focusAwsConfig = false,
  onFocusAwsConfigHandled,
}) {
  const [settings, setSettings] = useState(() => structuredClone(DEFAULT_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('rules');
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [draftRule, setDraftRule] = useState(null);
  const awsConfigRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchSettings();
        if (!cancelled) setSettings(mergeSettings(data));
      } catch (err) {
        if (!cancelled) {
          setSettings(structuredClone(DEFAULT_SETTINGS));
          setError(err.message || 'Could not load settings from API');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!focusAwsConfig || loading) return;
    setActiveTab('aws');
    onFocusAwsConfigHandled?.();
    requestAnimationFrame(() => {
      awsConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [focusAwsConfig, loading, onFocusAwsConfigHandled]);

  async function validateSavedAwsConfig() {
    try {
      const status = await validateAwsConfig();
      onAwsConfigValidated?.(status);
      if (!status.valid) {
        setError(status.message || 'AWS credentials need attention.');
      }
      return status;
    } catch {
      return null;
    }
  }

  function updateRule(index, patch) {
    setSettings((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    }));
  }

  function updateAwsConfig(key, value) {
    setSettings((current) => ({
      ...current,
      awsConfig: { ...current.awsConfig, [key]: value },
    }));
  }

  function closeRuleModal() {
    setEditingRuleIndex(null);
    setDraftRule(null);
  }

  async function persistSettings(nextSettings, successMessage) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const saved = await updateSettings(nextSettings);
      const merged = mergeSettings(saved);
      setSettings(merged);
      setMessage(successMessage);
      onSettingsSaved?.(merged);
      await validateSavedAwsConfig();
      return true;
    } catch (err) {
      setError(err.message || 'Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persistSettings(settings, 'Settings saved. New uploads will use the updated rules.');
  }

  function handleResetDefaults() {
    setSettings(structuredClone(DEFAULT_SETTINGS));
    setMessage('Defaults restored locally. Click Save settings to persist.');
  }

  function handleAddRule() {
    setDraftRule(createBlankRule());
    setEditingRuleIndex('new');
  }

  function handleRemoveRule(index) {
    setSettings((current) => ({
      ...current,
      rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  }

  async function handleRuleSaved(updatedRule) {
    const isNew = editingRuleIndex === 'new';
    const nextRules = isNew
      ? [...settings.rules, updatedRule]
      : settings.rules.map((rule, index) =>
          index === editingRuleIndex ? updatedRule : rule,
        );

    const nextSettings = { ...settings, rules: nextRules };
    setSettings(nextSettings);
    closeRuleModal();

    await persistSettings(
      nextSettings,
      isNew ? 'Rule added and saved.' : 'Rule updated and saved.',
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Loader label="Loading settings..." />
      </div>
    );
  }

  const editingRule =
    editingRuleIndex === 'new'
      ? draftRule
      : editingRuleIndex != null
        ? settings.rules[editingRuleIndex]
        : null;

  return (
    <div className="space-y-4">
      <PageHeader
        subtitle={`Manage compliance rules and AWS credentials · v${settings.rulesVersion || '1.0.0'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <IconReset />
              Reset defaults
            </button>
            {activeTab === 'rules' && (
              <button
                type="button"
                onClick={handleAddRule}
                className="inline-flex items-center gap-2 rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-lime-100"
              >
                <IconPlus />
                Add rule
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-cp-lime px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-400 disabled:opacity-50"
            >
              <IconSave />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        }
      />

      <div className="flex gap-1 border-b border-slate-200">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'border-cp-lime text-cp-lime-dark'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {tab.id === 'aws' ? <IconCloud className="h-4 w-4" /> : <IconSettings className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}

      {activeTab === 'rules' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Rule</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.rules.map((rule, index) => (
                  <tr key={rule.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3 font-medium text-slate-900">{rule.name}</td>
                    <td className="max-w-xs px-3 py-3 text-slate-600">
                      <span className="line-clamp-2">{rule.detail || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          rule.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRuleIndex(index)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRule(index, { enabled: !rule.enabled })}
                          className="rounded-lg border border-lime-200 bg-lime-50 px-2.5 py-1 text-xs font-semibold text-cp-lime-dark hover:bg-lime-100"
                        >
                          {rule.enabled ? 'Deactivate' : 'Activate'}
                        </button>
                        {rule.id.startsWith('custom-rule-') && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(index)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'aws' && (
        <section
          ref={awsConfigRef}
          id="aws-config-section"
          className={`rounded-xl border bg-white p-5 shadow-sm ${
            focusAwsConfig ? 'border-cp-lime ring-2 ring-lime-100' : 'border-slate-200'
          }`}
        >
          <p className="text-sm text-slate-500">
            Optional credentials for local or cross-account access. Prefer IAM roles in production.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">AWS Access Key ID</span>
              <input
                type="text"
                autoComplete="off"
                value={settings.awsConfig.accessKeyId || ''}
                onChange={(event) => updateAwsConfig('accessKeyId', event.target.value)}
                placeholder="AKIA..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">AWS Secret Access Key</span>
              <input
                type="password"
                autoComplete="new-password"
                value={settings.awsConfig.secretAccessKey || ''}
                onChange={(event) => updateAwsConfig('secretAccessKey', event.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">AWS Session Token</span>
              <input
                type="password"
                autoComplete="new-password"
                value={settings.awsConfig.sessionToken || ''}
                onChange={(event) => updateAwsConfig('sessionToken', event.target.value)}
                placeholder="Optional — for temporary credentials"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>
        </section>
      )}

      {editingRule && (
        <RuleEditModal
          rule={editingRule}
          isNew={editingRuleIndex === 'new'}
          onSave={handleRuleSaved}
          onClose={closeRuleModal}
        />
      )}
    </div>
  );
}
