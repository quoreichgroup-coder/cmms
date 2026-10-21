import { createContext, FC, ReactNode, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { addFiles } from '../slices/file';
import { useDispatch, useSelector } from '../store';
import { FileType } from '../models/file';
import { getUsersMini } from '../slices/user';
import { IField } from '../models/form';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { getWOBaseFields } from '../utils/woBase';
import moment from 'moment-timezone';
import { findVisibleFieldConfiguration } from '../utils/visibleFieldConfiguration';
import { formatCompanyCurrency } from '../utils/formatCurrency';

type CompanySettingsContext = {
  getFormattedDate: (dateString: string | Date, hideTime?: boolean) => string;
  uploadFiles: (
    files: { uri: string; name: string; type: string }[],
    images: { uri: string; name: string; type: string }[],
    hidden?: boolean
  ) => Promise<{ id: number; type: FileType }[]>;
  getUserNameById: (id: number) => string | null;
  getWOFieldsAndShapes: (
    defaultFields: Array<IField>,
    defaultShape: { [key: string]: any }
  ) => [Array<IField>, { [key: string]: any }];
  getRequestFieldsAndShapes: () => [Array<IField>, { [key: string]: any }];
  getFormattedCurrency: (amount: number | string) => string;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CompanySettingsContext = createContext<CompanySettingsContext>(
  {} as CompanySettingsContext
);

export const CompanySettingsProvider: FC<{ children: ReactNode }> = (props) => {
  const { companySettings, getFilteredFields, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const generalPreferences = companySettings?.generalPreferences ?? {
    dateFormat: 'DDMMYY',
    currency: { code: '' },
    timeZone: moment.tz.guess()
  };
  const workOrderRequestConfiguration =
    companySettings?.workOrderRequestConfiguration;
  const { allUsersMini } = useSelector((state) => state.users);
  const { workOrderConfiguration } = companySettings ?? {
    workOrderFieldConfigurations: []
  };
  const { children } = props;
  const { t, i18n }: { t: any; i18n: { language: string } } = useTranslation();

  const getFormattedDate = (dateString: string | Date, hideTime?: boolean) => {
    if (!dateString) return '';

    const tz = generalPreferences.timeZone;
    const date = moment.tz(dateString, tz);
    const month = date.format('MM');
    const day = date.format('DD');
    const year = date.format('YY');
    const time = hideTime ? '' : date.format('HH:mm');

    if (generalPreferences.dateFormat === 'MMDDYY') {
      return `${month}/${day}/${year} ${time}`.trim();
    } else {
      return `${day}/${month}/${year} ${time}`.trim();
    }
  };
  const getFormattedCurrency = (amount: number | string): string => {
    return formatCompanyCurrency(
      amount,
      generalPreferences.currency?.code,
      i18n.language
    );
  };
  const uploadFiles = async (
    files: { uri: string; name: string; type: string }[],
    images: { uri: string; name: string; type: string }[],
    hidden?: boolean
  ): Promise<{ id: number; type: FileType }[]> => {
    let result: { id: number; type: FileType }[] = [];
    if (files?.length) {
      await dispatch(addFiles(files, 'OTHER', undefined, `${hidden}`)).then(
        (fileIds) => {
          if (Array.isArray(fileIds))
            result = [
              ...fileIds.map((id) => {
                return { id, type: 'OTHER' as const };
              })
            ];
        }
      );
    }
    if (images?.length) {
      await dispatch(addFiles(images, 'IMAGE', undefined, `${hidden}`)).then(
        (images) => {
          if (Array.isArray(images))
            result = [
              ...result,
              ...images.map((imageId) => {
                return { id: imageId, type: 'IMAGE' as const };
              })
            ];
        }
      );
    }
    return result;
  };

  const getUserNameById = (id: number) => {
    const user = allUsersMini.find((user) => user.id === id);
    return user ? `${user.firstName} ${user.lastName}` : null;
  };
  const getWOFieldsAndShapes = (
    defaultFields: Array<IField>,
    defaultShape
  ): [Array<IField>, { [key: string]: any }] => {
    let fields = [...getFilteredFields(defaultFields)];
    let shape = { ...defaultShape };
    const fieldsToConfigure = [
      'asset',
      'description',
      'priority',
      'images',
      'primaryUser',
      'assignedTo',
      'team',
      'location',
      'dueDate',
      'category',
      'purchaseOrder',
      'files',
      'signature'
    ];
    const fieldMap = { images: 'image' };
    fieldsToConfigure.forEach((name) => {
      const trueFieldName = fieldMap[name] || name;
      const visibleConfiguration = findVisibleFieldConfiguration(
        fields,
        trueFieldName,
        workOrderConfiguration?.workOrderFieldConfigurations,
        name
      );
      if (visibleConfiguration) {
        const { fieldIndex: fieldIndexInFields, configuration: fieldConfig } =
          visibleConfiguration;
        if (fieldConfig.fieldType === 'REQUIRED') {
          fields[fieldIndexInFields] = {
            ...fields[fieldIndexInFields],
            required: true
          };
          const requiredMessage = t('required_field');
          let yupSchema;
          switch (fields[fieldIndexInFields].type) {
            case 'text':
              yupSchema = Yup.string().required(requiredMessage).nullable();
              break;
            case 'date':
              yupSchema = Yup.string().required(requiredMessage).nullable();
              break;
            case 'file':
              yupSchema = Yup.array().required(requiredMessage);
              break;
            case 'number':
              yupSchema = Yup.number().required(requiredMessage).nullable();
              break;
            case 'select':
              if (fields[fieldIndexInFields].type2 === 'priority')
                yupSchema = Yup.string().required(requiredMessage);
              else if (fields[fieldIndexInFields].multiple) {
                yupSchema = Yup.array().required(requiredMessage);
              } else {
                yupSchema = Yup.object().required(requiredMessage).nullable();
              }
              break;
            default:
              yupSchema = Yup.object().required(requiredMessage).nullable();
              break;
          }
          shape[trueFieldName] = yupSchema;
        } else if (fieldConfig.fieldType === 'HIDDEN') {
          fields.splice(fieldIndexInFields, 1);
        }
      }
    });
    return [fields, shape];
  };

  const getRequestFieldsAndShapes = (): [
    Array<IField>,
    { [key: string]: any }
  ] => {
    const defaultFields: Array<IField> = [...getWOBaseFields(t)];
    const defaultShape = {
      title: Yup.string().required(t('required_request_name'))
    };
    let fields = [...getFilteredFields(defaultFields)];
    let shape = { ...defaultShape };
    const fieldsToConfigure = [
      'asset',
      'location',
      'primaryUser',
      'category',
      'dueDate',
      'team'
    ];
    fieldsToConfigure.forEach((name) => {
      const visibleConfiguration = findVisibleFieldConfiguration(
        fields,
        name,
        workOrderRequestConfiguration?.fieldConfigurations
      );
      if (visibleConfiguration) {
        const { fieldIndex: fieldIndexInFields, configuration: fieldConfig } =
          visibleConfiguration;
        if (fieldConfig.fieldType === 'REQUIRED') {
          fields[fieldIndexInFields] = {
            ...fields[fieldIndexInFields],
            required: true
          };
          const requiredMessage = t('required_field');
          let yupSchema;
          switch (fields[fieldIndexInFields].type) {
            case 'text':
              yupSchema = Yup.string().required(requiredMessage);
              break;
            case 'date':
              yupSchema = Yup.string().required(requiredMessage);
              break;
            case 'number':
              yupSchema = Yup.number().required(requiredMessage);
              break;
            default:
              yupSchema = Yup.object().required(requiredMessage).nullable();
              break;
          }
          shape[name] = yupSchema;
        } else if (fieldConfig.fieldType === 'HIDDEN') {
          fields.splice(fieldIndexInFields, 1);
        }
      }
    });

    return [fields, shape];
  };
  useEffect(() => {
    if (isAuthenticated) dispatch(getUsersMini(true));
  }, [isAuthenticated]);
  return (
    <CompanySettingsContext.Provider
      value={{
        getFormattedDate,
        uploadFiles,
        getUserNameById,
        getWOFieldsAndShapes,
        getRequestFieldsAndShapes,
        getFormattedCurrency
      }}
    >
      {children}
    </CompanySettingsContext.Provider>
  );
};
