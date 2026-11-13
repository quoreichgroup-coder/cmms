import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch } from '../../../store';
import { restockPart } from '../../../slices/part';
import Form from '../components/form';
import * as Yup from 'yup';
import { useContext, useState } from 'react';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../../../utils/api';
import Part from '../../../models/owns/part';
import useCompactDialog from '../../../hooks/useCompactDialog';
import ConfirmDialog from '../components/ConfirmDialog';

interface RestockPartModalProps {
  open: boolean;
  onClose: () => void;
  part: Part;
}

export default function RestockPartModal({
  open,
  onClose,
  part
}: RestockPartModalProps) {
  const isCompactDialog = useCompactDialog();
  const { t }: { t: any } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const requestClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  return (
    <>
    <Dialog fullScreen={isCompactDialog} fullWidth maxWidth="sm" open={open} onClose={requestClose}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('restock_part')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Form
          key={`${part.id}-${formVersion}`}
          onDirtyChange={setIsDirty}
          fields={[
            {
              name: 'quantity',
              type: 'number',
              label: t('quantity'),
              required: true
            },
            {
              name: 'description',
              type: 'text',
              label: t('description'),
              multiple: true
            }
          ]}
          validation={Yup.object().shape({
            quantity: Yup.number()
              .moreThan(0, t('quantity_must_be_positive'))
              .required(t('required_field'))
          })}
          submitText={t('restock')}
          values={{}}
          onChange={({ field, e }) => {}}
          onSubmit={async (values) => {
            return dispatch(
              restockPart(part.id, {
                quantity: Number(values.quantity),
                description: values.description
              })
            )
              .then(() => {
                showSnackBar(t('operation_success'), 'success');
                setIsDirty(false);
                setFormVersion((version) => version + 1);
                onClose();
              })
              .catch((err) => showSnackBar(getErrorMessage(err), 'error'));
          }}
        />
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmDiscard}
      onCancel={() => setConfirmDiscard(false)}
      onConfirm={() => {
        setConfirmDiscard(false);
        setIsDirty(false);
        setFormVersion((version) => version + 1);
        onClose();
      }}
      confirmText={t('discard_changes')}
      question={t('discard_changes_question')}
    />
    </>
  );
}
