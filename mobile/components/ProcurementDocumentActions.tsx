import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Dialog, Divider, Portal, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../utils/api';
import { openPdfResponse } from '../utils/fileDownload';
import AsyncStateFeedback from './AsyncStateFeedback';
import { useAppTheme } from '../custom-theme';

type Kind = 'purchase-orders' | 'purchase-requisitions';
interface Template { id: number; name: string; versionNumber: number; isDefault: boolean }
interface Doc { id: number; fileName: string; issuedAt: string; sha256: string }
interface Props { kind: Kind; sourceId: number; disabled?: boolean; issueDisabled?: boolean }

export default function ProcurementDocumentActions({ kind, sourceId, disabled = false, issueDisabled = false }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError('');
    setDocuments([]); setTemplates([]); setSelectedId(null);
    try {
      const [docs, options] = await Promise.all([
        api.get<Doc[]>(`${kind}/${sourceId}/documents`),
        api.get<Template[]>(`${kind}/${sourceId}/document-templates`)
      ]);
      if (current !== request.current) return;
      setDocuments(docs); setTemplates(options);
      setSelectedId((old) => options.some((template) => template.id === old) ? old : options.find((template) => template.isDefault)?.id ?? options[0]?.id ?? null);
    } catch (e) { if (current === request.current) setError(getErrorMessage(e, t('issued_documents_load_error'))); }
    finally { if (current === request.current) setLoading(false); }
  }, [kind, sourceId, t]);
  useEffect(() => { if (visible) void load(); return () => { request.current += 1; }; }, [visible, load]);

  const preview = async () => {
    if (!selectedId || busy) return;
    setBusy(true); setError('');
    try {
      const response = await api.post<Response>(`${kind}/${sourceId}/documents/preview/${selectedId}`, null, { raw: true });
      await openPdfResponse(response, `${kind}-${sourceId}-preview.pdf`);
    } catch (e) { setError(getErrorMessage(e, t('work_order_report_preview_error'))); }
    finally { setBusy(false); }
  };
  const issue = async () => {
    if (!selectedId || busy) return;
    setBusy(true); setError('');
    let created: Doc;
    try {
      created = await api.post<Doc>(`${kind}/${sourceId}/documents/issue/${selectedId}`, null);
    } catch (e) { setError(getErrorMessage(e, t('issued_document_issue_error'))); setBusy(false); return; }
    // The document is issued and archived at this point: a failed download must not invite a second issue.
    try {
      await load();
      const response = await api.get<Response>(`documents/${created.id}/download`, { raw: true });
      await openPdfResponse(response, created.fileName);
    } catch (e) { setError(getErrorMessage(e, t('issued_document_download_error'))); }
    finally { setBusy(false); }
  };
  const download = async (doc: Doc) => {
    if (busy) return;
    setBusy(true); setError('');
    try { const response = await api.get<Response>(`documents/${doc.id}/download`, { raw: true }); await openPdfResponse(response, doc.fileName); }
    catch (e) { setError(getErrorMessage(e, t('issued_document_download_error'))); }
    finally { setBusy(false); }
  };

  return <>
    <Button mode="outlined" compact icon="printer" disabled={disabled} onPress={() => setVisible(true)}>{t('procurement_print', 'Print / PDF')}</Button>
    <Portal><Dialog visible={visible} onDismiss={() => !busy && setVisible(false)}>
      <Dialog.Title>{kind === 'purchase-orders' ? t('purchase_order', 'Purchase order') : t('purchase_requisition', 'Purchase requisition')} · {t('procurement_print', 'Print / PDF')}</Dialog.Title>
      <Dialog.ScrollArea><ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
        <Text variant="bodySmall">{t('procurement_print_help', 'Preview a published template, then issue a traceable PDF. Reprints remain available below.')}</Text>
        {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.error, marginTop: 12 }}>{error}</Text> : null}
        {issueDisabled ? <Text style={{ marginTop: 8 }}>{t('procurement_issue_requires_approval', 'You can preview this document. Official PO issue requires final approval and the appropriate edit permission.')}</Text> : null}
        <View style={{ gap: 8, marginTop: 16 }}>
          {loading ? <AsyncStateFeedback mode="loading" message={t('loading')} /> : templates.length ? templates.map((item) => <Button key={item.id} mode={selectedId === item.id ? 'contained-tonal' : 'outlined'} disabled={busy} onPress={() => setSelectedId(item.id)}>{item.name} · v{item.versionNumber}{item.isDefault ? ` · ${t('default')}` : ''}</Button>) : <Text>{t('procurement_print_no_template', 'No published template is available. Configure one in Settings → Documents.')}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button icon="eye-outline" disabled={busy || loading || selectedId === null} onPress={() => void preview()}>{t('preview')}</Button>
            <Button mode="contained" icon="printer" loading={busy} disabled={issueDisabled || busy || loading || selectedId === null} onPress={() => void issue()}>{t('procurement_issue_pdf', 'Issue and print PDF')}</Button>
          </View>
        </View>
        <Divider style={{ marginVertical: 16 }} />
        <Text variant="titleSmall">{t('issued_documents', 'Issued documents')}</Text>
        {documents.length ? documents.map((doc) => <View key={doc.id} style={{ paddingVertical: 8 }}>
          <Text variant="bodyMedium">{doc.fileName}</Text>
          <Text variant="bodySmall">{new Date(doc.issuedAt).toLocaleString()}</Text>
          <Button icon="download" compact disabled={busy} onPress={() => void download(doc)}>{t('download')}</Button>
          <Divider />
        </View>) : <Text style={{ marginTop: 8 }}>{t('issued_documents_empty', 'No PDF has been issued yet.')}</Text>}
      </ScrollView></Dialog.ScrollArea>
      <Dialog.Actions><Button disabled={busy} onPress={() => setVisible(false)}>{t('close')}</Button></Dialog.Actions>
    </Dialog></Portal>
  </>;
}
