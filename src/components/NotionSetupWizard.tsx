import React, { useState } from 'react';

type WizardStep = 'intro' | 'api-key' | 'database';

interface NotionSetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function NotionSetupWizard({ onComplete, onCancel }: NotionSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('intro');
  const [apiKey, setApiKey] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestAndConnect = async () => {
    setError(null);
    setTesting(true);

    try {
      await window.notionAPI.configure(apiKey.trim(), databaseId.trim(), userEmail.trim());
      await window.notionAPI.testConnection();
      onComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      // Disconnect on failure so we don't leave partial config
      await window.notionAPI.disconnect();
    } finally {
      setTesting(false);
    }
  };

  const isApiKeyValid = apiKey.trim().startsWith('secret_') || apiKey.trim().startsWith('ntn_');
  const isDatabaseIdValid = databaseId.trim().length >= 20;
  const isEmailValid = userEmail.trim().includes('@');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-macos-gray-800 rounded-xl shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto border border-macos-gray-200 dark:border-macos-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-macos-gray-200 dark:border-macos-gray-700">
          <div className="text-[14px] font-semibold text-macos-gray-100 dark:text-macos-gray-200">
            Connect Notion Tasks
          </div>
          <button
            onClick={onCancel}
            className="text-macos-gray-400 hover:text-macos-gray-200 text-[16px] w-6 h-6 flex items-center justify-center rounded hover:bg-macos-gray-700/30 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {/* Step: Intro */}
          {step === 'intro' && (
            <div className="space-y-4">
              <div className="text-[12px] text-macos-gray-300 leading-relaxed">
                Connect a Notion database to see your tasks due today right in the sidebar.
              </div>
              <div className="text-[12px] font-medium text-macos-gray-200">
                You'll need:
              </div>
              <ul className="text-[11px] text-macos-gray-400 space-y-2 ml-1">
                <li className="flex gap-2">
                  <span className="text-macos-blue">1.</span>
                  A Notion integration API key
                </li>
                <li className="flex gap-2">
                  <span className="text-macos-blue">2.</span>
                  A tasks database shared with that integration
                </li>
                <li className="flex gap-2">
                  <span className="text-macos-blue">3.</span>
                  Your email (for filtering assigned tasks)
                </li>
              </ul>
              <div className="bg-macos-blue/10 rounded-lg p-3 border border-macos-blue/20">
                <div className="text-[11px] text-macos-gray-300 leading-relaxed">
                  Your database should have these properties: <span className="font-medium">Name</span> (title), <span className="font-medium">Priority</span> (select: High/Medium/Low), <span className="font-medium">Due Date</span> (date), <span className="font-medium">Assigned To</span> (people), <span className="font-medium">Status</span> (status).
                </div>
              </div>
              <button
                onClick={() => setStep('api-key')}
                className="w-full bg-macos-blue hover:bg-macos-blue/90 text-white text-[12px] py-2.5 px-4 rounded-lg transition-colors font-medium"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Step: API Key */}
          {step === 'api-key' && (
            <div className="space-y-4">
              <div className="text-[12px] text-macos-gray-300 leading-relaxed">
                Create an internal integration at Notion to get an API key.
              </div>
              <button
                onClick={() => window.electronAPI.openExternal('https://www.notion.so/my-integrations')}
                className="text-[11px] text-macos-blue hover:underline"
              >
                Open notion.so/my-integrations
              </button>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-macos-gray-300">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="secret_..."
                  className="w-full bg-macos-gray-900/30 dark:bg-macos-gray-900/60 border border-macos-gray-200 dark:border-macos-gray-700 rounded-lg px-3 py-2 text-[12px] text-macos-gray-200 placeholder-macos-gray-500 focus:outline-none focus:ring-1 focus:ring-macos-blue focus:border-macos-blue"
                />
                {apiKey.length > 0 && !isApiKeyValid && (
                  <div className="text-[10px] text-red-400">
                    API key should start with "secret_" or "ntn_"
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('intro')}
                  className="flex-1 bg-macos-gray-700/30 hover:bg-macos-gray-700/50 text-macos-gray-300 text-[12px] py-2.5 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('database')}
                  disabled={!isApiKeyValid}
                  className="flex-1 bg-macos-blue hover:bg-macos-blue/90 text-white text-[12px] py-2.5 px-4 rounded-lg transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step: Database ID + Email */}
          {step === 'database' && (
            <div className="space-y-4">
              <div className="text-[12px] text-macos-gray-300 leading-relaxed">
                Share your tasks database with the integration, then paste the database ID below.
              </div>
              <div className="bg-macos-gray-900/20 dark:bg-macos-gray-900/40 rounded-lg p-3 border border-macos-gray-200 dark:border-macos-gray-700/50">
                <div className="text-[10px] text-macos-gray-400 leading-relaxed">
                  Find the database ID in the URL when viewing your database:
                  <br />
                  <span className="font-mono text-macos-gray-300">notion.so/{'<'}workspace{'>'}/{'<'}database_id{'>'}?v=...</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-macos-gray-300">Database ID</label>
                <input
                  type="text"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  placeholder="abc123def456..."
                  className="w-full bg-macos-gray-900/30 dark:bg-macos-gray-900/60 border border-macos-gray-200 dark:border-macos-gray-700 rounded-lg px-3 py-2 text-[12px] text-macos-gray-200 placeholder-macos-gray-500 focus:outline-none focus:ring-1 focus:ring-macos-blue focus:border-macos-blue font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-macos-gray-300">Your Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-macos-gray-900/30 dark:bg-macos-gray-900/60 border border-macos-gray-200 dark:border-macos-gray-700 rounded-lg px-3 py-2 text-[12px] text-macos-gray-200 placeholder-macos-gray-500 focus:outline-none focus:ring-1 focus:ring-macos-blue focus:border-macos-blue"
                />
                <div className="text-[10px] text-macos-gray-500">
                  Used to filter tasks assigned to you
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                  <div className="text-[11px] text-red-400">{error}</div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setError(null); setStep('api-key'); }}
                  className="flex-1 bg-macos-gray-700/30 hover:bg-macos-gray-700/50 text-macos-gray-300 text-[12px] py-2.5 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleTestAndConnect}
                  disabled={!isDatabaseIdValid || !isEmailValid || testing}
                  className="flex-1 bg-macos-blue hover:bg-macos-blue/90 text-white text-[12px] py-2.5 px-4 rounded-lg transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {testing ? 'Testing...' : 'Connect'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
