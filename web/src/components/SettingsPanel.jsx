import { useEffect, useRef, useState } from 'react';
import { fetchSettings, updateSettings, validateAwsConfig } from '../api.js';
import { createBlankRule, DEFAULT_SETTINGS, mergeSettings } from '../defaultSettings.js';
import Loader from './Loader.jsx';
import RuleEditModal from './RuleEditModal.jsx';
import { IconSettings } from './icons.jsx';

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
    if (!focusAwsConfig || loading || !awsConfigRef.current) return;

    awsConfigRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onFocusAwsConfigHandled?.();
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
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <IconSettings />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Compliance Settings</h3>
              <p className="mt-1 text-sm text-slate-500">
                Manage validation rules and AWS credentials. Version{' '}
                {settings.rulesVersion || '1.0.0'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset defaults
            </button>
            <button
              type="button"
              onClick={handleAddRule}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Add rule
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Compliance Rules
        </h4>
        <div className="mt-4 overflow-x-auto">
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
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
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

      <section
        ref={awsConfigRef}
        id="aws-config-section"
        className={`rounded-xl border bg-white p-5 shadow-sm ${
          focusAwsConfig ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
        }`}
      >
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          AWS Config
        </h4>
        <p className="mt-2 text-sm text-slate-500">
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
