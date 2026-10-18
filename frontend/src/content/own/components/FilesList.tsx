import File from '../../../models/owns/file';
import { IconButton, Link, List, ListItem, ListItemText } from '@mui/material';
import DoDisturbOnOutlinedIcon from '@mui/icons-material/DoDisturbOnOutlined';
import { useContext } from 'react';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { getSafeHttpUrl } from '../../../utils/safeWindow';

interface FilesListProps {
  files: File[];
  onRemove: (id: number) => void;
  confirmMessage: string;
  removeDisabled: boolean;
}
export default function FilesList({
  files,
  onRemove,
  confirmMessage,
  removeDisabled
}: FilesListProps) {
  const { getFormattedDate } = useContext(CompanySettingsContext);

  return (
    <List>
      {files.map((file) => {
        const safeUrl = getSafeHttpUrl(file.url);
        return (
          <ListItem
            key={file.id}
            secondaryAction={
              removeDisabled ? null : (
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => {
                    if (window.confirm(confirmMessage)) {
                      onRemove(file.id);
                    }
                  }}
                >
                  <DoDisturbOnOutlinedIcon color="error" />
                </IconButton>
              )
            }
          >
            <ListItemText
              primary={
                safeUrl ? (
                  <Link
                    href={safeUrl}
                    variant="h6"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file.name}
                  </Link>
                ) : (
                  file.name
                )
              }
              secondary={getFormattedDate(file.createdAt)}
            />
          </ListItem>
        );
      })}
    </List>
  );
}
