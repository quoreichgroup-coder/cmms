import { InputAdornment, TextField } from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

interface OwnProps {
  onChange: (event) => void;
}

export default function SearchInput({ onChange }: OwnProps) {
  const { t }: { t: any } = useTranslation();
  return (
    <TextField
      sx={{
        m: 0
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchOutlinedIcon color="primary" />
          </InputAdornment>
        )
      }}
      placeholder={t('search')}
      variant="outlined"
      onChange={onChange}
    />
  );
}
