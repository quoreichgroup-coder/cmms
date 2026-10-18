import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  Link,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { phoneRegExp, websiteRegExp } from '../../../utils/validators';
import CustomDialog from '../components/CustomDialog';
import { Company } from '../../../models/owns/company';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { getSafeHttpUrl } from '../../../utils/safeWindow';

interface CompanyDetailsProps {
  company: Company;
}
function CompanyDetails(props: CompanyDetailsProps) {
  const { company } = props;
  const { patchCompany, user } = useAuth();
  const canEdit =
    user.ownsCompany ||
    (user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS) &&
      user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS));
  const { t }: { t: any } = useTranslation();
  const [openEditModal, setOpenEditModal] = useState<boolean>(false);
  const handleOpenEditModal = () => setOpenEditModal(true);
  const handleCloseEditModal = () => setOpenEditModal(false);

  const companyDetails = {
    name: { value: company.name, title: t('name') },
    address: { value: company.address, title: t('address') },
    email: { value: company.email, title: t('email') },
    city: { value: company.city, title: t('city') },
    state: { value: company.state, title: t('state') },
    zipCode: { value: company.zipCode, title: t('zip_code') },
    website: { value: company.website, title: t('website'), isLink: true },
    phone: { value: company.phone, title: t('phone') }
  };
  const companyWebsite = getSafeHttpUrl(company.website, { assumeHttps: true });

  const KeyAndValue = ({
    label,
    value,
    isLink
  }: {
    label: string;
    value: string;
    isLink: boolean;
  }) => {
    return (
      <>
        <Grid item xs={12} sm={4} md={3} textAlign={{ sm: 'right' }}>
          <Box pr={3} pb={2}>
            {t(label)}:
          </Box>
        </Grid>
        <Grid item xs={12} sm={8} md={9}>
          {isLink && value && companyWebsite ? (
            <Link
              href={companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
            >
              {value}
            </Link>
          ) : (
            <Typography color="text.primary">
              <b>{value ?? 'N/A'}</b>
            </Typography>
          )}
        </Grid>
      </>
    );
  };

  const renderEditModal = () => (
    <CustomDialog
      onClose={handleCloseEditModal}
      open={openEditModal}
      title={t('edit_company')}
      subtitle={t('fill_fields_below')}
    >
      <Formik
        initialValues={{
          name: companyDetails.name.value,
          address: companyDetails.address.value,
          email: companyDetails.email.value,
          city: companyDetails.city.value,
          state: companyDetails.state.value,
          zipCode: companyDetails.zipCode.value,
          phone: companyDetails.phone.value,
          website: companyDetails.website.value
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().max(100).required(t('required_name')),
          address: Yup.string().max(100).nullable(),
          email: Yup.string().email(t('invalid_email')).nullable(),
          city: Yup.string().max(100).nullable(),
          state: Yup.string().max(100).nullable(),
          zipCode: Yup.string().max(30).nullable(),
          phone: Yup.string()
            .matches(phoneRegExp, t('invalid_phone'))
            .nullable(),
          website: Yup.string()
            .matches(websiteRegExp, t('invalid_website'))
            .nullable()
        })}
        onSubmit={async (
          _values,
          { resetForm, setErrors, setStatus, setSubmitting }
        ) => {
          setSubmitting(true);
          return patchCompany(_values)
            .then(handleCloseEditModal)
            .finally(() => setSubmitting(false));
        }}
      >
        {({
          errors,
          handleBlur,
          handleChange,
          handleSubmit,
          isSubmitting,
          touched,
          values
        }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent
              dividers
              sx={{
                p: 3
              }}
            >
              <Grid container spacing={3}>
                <Grid item xs={12} lg={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        error={Boolean(touched.email && errors.email)}
                        fullWidth
                        helperText={touched.email && errors.email}
                        label={t('email')}
                        name="email"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.email ?? ''}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={t('city')}
                        name="city"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.city ?? ''}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={t('state')}
                        name="state"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.state ?? ''}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={t('zip_code')}
                        name="zipCode"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.zipCode ?? ''}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        error={Boolean(touched.name && errors.name)}
                        fullWidth
                        helperText={touched.name && errors.name}
                        label={t('name')}
                        name="name"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.name}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        error={Boolean(touched.address && errors.address)}
                        fullWidth
                        helperText={touched.address && errors.address}
                        label={t('address')}
                        name="address"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.address}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        error={Boolean(touched.phone && errors.phone)}
                        fullWidth
                        helperText={touched.phone && errors.phone}
                        label={t('phone')}
                        name="phone"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.phone}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        error={Boolean(touched.website && errors.website)}
                        fullWidth
                        helperText={touched.website && errors.website}
                        label={t('website')}
                        name="website"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        value={values.website}
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions
              sx={{
                p: 3
              }}
            >
              <Button color="secondary" onClick={handleCloseEditModal}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                startIcon={
                  isSubmitting ? <CircularProgress size="1rem" /> : null
                }
                disabled={isSubmitting}
                variant="contained"
              >
                {t('save')}
              </Button>
            </DialogActions>
          </form>
        )}
      </Formik>
    </CustomDialog>
  );
  return (
    <Grid container spacing={2}>
      {renderEditModal()}
      <Grid item xs={12}>
        <Card>
          <Box
            p={3}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                {t('company_details')}
              </Typography>
              <Typography variant="subtitle2">
                {t('company_details_description')}
              </Typography>
            </Box>
            {canEdit && (
              <Box>
                <Button
                  onClick={handleOpenEditModal}
                  variant="text"
                  startIcon={<EditOutlinedIcon />}
                >
                  {t('edit')}
                </Button>
              </Box>
            )}
          </Box>
          <Divider />
          <CardContent
            sx={{
              p: 4
            }}
          >
            <Typography variant="subtitle2">
              <Grid container spacing={0}>
                {Object.keys(companyDetails).map((key) => {
                  if (key !== 'settings')
                    return (
                      <KeyAndValue
                        label={companyDetails[key].title}
                        value={companyDetails[key].value}
                        isLink={companyDetails[key].isLink}
                      />
                    );
                })}
              </Grid>
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default CompanyDetails;
