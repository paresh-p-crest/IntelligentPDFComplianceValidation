import { getAwsConfigAlertMessage } from '../awsConfigUtils.js';
import { IconSettings } from './icons.jsx';

export default function AwsConfigAlert({ status, checking = false, onOpenAwsConfig }) {
  if (checking) {
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        Checking AWS credentials...
      </div>
    );
  }

  if (!status || status.valid) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <p className="font-medium">{getAwsConfigAlertMessage(status)}</p>
      <button
        type="button"
        onClick={onOpenAwsConfig}
        className="mt-2 inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:text-indigo-600"
      >
        <IconSettings className="h-3.5 w-3.5" />
        Open AWS Config in Settings
      </button>
    </div>
  );
}
