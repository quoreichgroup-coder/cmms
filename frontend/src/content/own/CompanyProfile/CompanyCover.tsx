import { ChangeEvent, FC, useContext, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  styled
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import useAuth from '../../../hooks/useAuth';
import { Company } from '../../../models/owns/company';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { getErrorMessage } from '../../../utils/api';

const Input = styled('input')({
  display: 'none'
});

const CardCover = styled(Card)(
  ({ theme }) => `
    position: relative;

    .MuiCardMedia-root {
      height: ${theme.spacing(26)};
    }
`
);

const CardCoverAction = styled(Box)(
  ({ theme }) => `
    position: absolute;
    right: ${theme.spacing(2)};
    bottom: ${theme.spacing(2)};
`
);

interface CompanyCoverProps {
  image: string;
  canEdit: boolean;
}

const CompanyCover: FC<CompanyCoverProps> = ({ image, canEdit }) => {
  const { t }: { t: any } = useTranslation();
  const [changingPicture, setChangingPicture] = useState<boolean>(false);
  const { uploadFiles } = useContext(CompanySettingsContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { patchCompany } = useAuth();
  const onChangePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (!input.files?.length) return;
    setChangingPicture(true);
    try {
      const files = await uploadFiles([], Array.from(input.files));
      if (!files?.[0]?.id) throw new Error('company_logo_upload_error');
      await patchCompany({ logo: { id: files[0].id } } as Partial<Company>);
      showSnackBar(t('company_logo_saved'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('company_logo_upload_error')), 'error');
    } finally {
      input.value = '';
      setChangingPicture(false);
    }
  };
  return (
    <>
      <CardCover>
        <CardMedia image={image} />
        {canEdit && <CardCoverAction>
          <Input
            accept="image/*"
            id="change-cover"
            disabled={changingPicture}
            onChange={onChangePicture}
            multiple
            type="file"
          />
          <label htmlFor="change-cover">
            <Button
              startIcon={
                changingPicture ? (
                  <CircularProgress size="1rem" />
                ) : (
                  <UploadOutlinedIcon />
                )
              }
              variant="contained"
              disabled={changingPicture}
              component="span"
            >
              {t('change_cover')}
            </Button>
          </label>
        </CardCoverAction>}
      </CardCover>
    </>
  );
};

export default CompanyCover;
