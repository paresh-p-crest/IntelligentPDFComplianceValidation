import PageHeader from '../components/layout/PageHeader.jsx';
import DocumentsTable from '../components/layout/DocumentsTable.jsx';
import { IconTrash } from '../components/icons.jsx';

export default function DocumentsPage({
  historyItems,
  historyLoading,
  activeS3Key,
  onSelectDocument,
  onDeleteDocument,
  onClearAll,
}) {
  return (
    <>
      <PageHeader
        subtitle="All uploaded Daily Quality Reports and their audit status."
        actions={
          historyItems.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <IconTrash />
              Clear all
            </button>
          ) : null
        }
      />

      <DocumentsTable
        items={historyItems}
        activeS3Key={activeS3Key}
        loading={historyLoading}
        title="All Documents"
        subtitle="Uploaded Daily Quality Reports and audit status"
        onSelect={onSelectDocument}
        onDelete={onDeleteDocument}
      />
    </>
  );
}
