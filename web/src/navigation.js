import {
  IconApprovals,
  IconAudit,
  IconFile,
  IconFolder,
  IconOverview,
  IconSettings,
  IconUpload,
} from './components/icons.jsx';

export const NAV_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Operations overview',
    Icon: IconOverview,
  },
  {
    id: 'upload',
    label: 'Upload',
    description: 'Submit a new DQR PDF',
    Icon: IconUpload,
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'All audited files',
    Icon: IconFolder,
  },
  {
    id: 'audit',
    label: 'Audit',
    description: 'Findings and compliance results',
    Icon: IconAudit,
  },
  {
    id: 'approvals',
    label: 'Approvals',
    description: 'Exception review queue',
    Icon: IconApprovals,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Rules and AWS configuration',
    Icon: IconSettings,
  },
];

export function getSectionMeta(sectionId) {
  return NAV_SECTIONS.find((item) => item.id === sectionId) || NAV_SECTIONS[0];
}
