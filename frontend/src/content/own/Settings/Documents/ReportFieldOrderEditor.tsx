import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult
} from 'react-beautiful-dnd';

interface ReportFieldOrderEditorProps {
  fields: string[];
  labelFor: (field: string) => string;
  title: string;
  hint: string;
  labelOverrides: Record<string, string>;
  onLabelOverrideChange: (field: string, value: string) => void;
  companyHeaderLabel: string;
  documentTitle: string;
  fieldBlockLabel: string;
  tableBlockLabel: string;
  customLabelLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  onChange: (fields: string[]) => void;
}

const tableFields = new Set([
  'workOrder.executionTasks',
  'workOrder.laborTimeEntries',
  'workOrder.materialsUsed'
]);

export default function ReportFieldOrderEditor({
  fields,
  labelFor,
  labelOverrides,
  onLabelOverrideChange,
  title,
  hint,
  companyHeaderLabel,
  documentTitle,
  fieldBlockLabel,
  tableBlockLabel,
  customLabelLabel,
  moveUpLabel,
  moveDownLabel,
  onChange
}: ReportFieldOrderEditorProps) {
  const moveField = (index: number, offset: -1 | 1) => {
    const destination = index + offset;
    if (destination < 0 || destination >= fields.length) return;
    const next = [...fields];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  };

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    const next = [...fields];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    onChange(next);
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={650}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          mt: 1.5,
          mx: 'auto',
          p: { xs: 1.5, sm: 2.5 },
          width: '100%',
          maxWidth: 760,
          minHeight: 360,
          bgcolor: 'common.white',
          color: 'grey.900',
          borderColor: 'grey.300',
          borderRadius: 1.5,
          boxShadow: 2
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            pb: 1.5,
            borderBottom: '2px solid',
            borderColor: 'primary.main'
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0
            }}
          >
            QPM
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'grey.700',
                display: 'block',
                overflowWrap: 'anywhere'
              }}
            >
              {companyHeaderLabel}
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: 'grey.900', fontWeight: 700, lineHeight: 1.25 }}
            >
              {documentTitle}
            </Typography>
          </Box>
        </Stack>
        {fields.length ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="report-field-order">
              {(dropProvided, dropSnapshot) => (
                <Stack
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  spacing={1}
                  sx={{
                    mt: 2,
                    minHeight: 260,
                    borderRadius: 1,
                    bgcolor: dropSnapshot.isDraggingOver
                      ? 'grey.100'
                      : 'transparent',
                    transition: 'background-color 150ms ease'
                  }}
                >
                  {fields.map((field, index) => {
                    const isTable = tableFields.has(field);
                    return (
                      <Draggable key={field} draggableId={field} index={index}>
                        {(dragProvided, snapshot) => (
                          <Paper
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            variant="outlined"
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              borderColor: snapshot.isDragging
                                ? 'primary.main'
                                : 'grey.300',
                              bgcolor: snapshot.isDragging
                                ? 'grey.100'
                                : 'common.white',
                              boxShadow: snapshot.isDragging ? 3 : 0,
                              transition:
                                'box-shadow 120ms ease, border-color 120ms ease'
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="flex-start"
                              spacing={1}
                            >
                              <Stack spacing={0} sx={{ flexShrink: 0 }}>
                                <Tooltip title={moveUpLabel}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      aria-label={`${moveUpLabel}: ${labelFor(
                                        field
                                      )}`}
                                      disabled={index === 0}
                                      onClick={() => moveField(index, -1)}
                                      sx={{ color: 'grey.600' }}
                                    >
                                      <KeyboardArrowUpOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title={moveDownLabel}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      aria-label={`${moveDownLabel}: ${labelFor(
                                        field
                                      )}`}
                                      disabled={index === fields.length - 1}
                                      onClick={() => moveField(index, 1)}
                                      sx={{ color: 'grey.600' }}
                                    >
                                      <KeyboardArrowDownOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                              <Tooltip title={hint}>
                                <IconButton
                                  size="small"
                                  aria-label={labelFor(field)}
                                  {...dragProvided.dragHandleProps}
                                  sx={{
                                    mt: 0.25,
                                    color: 'grey.600',
                                    cursor: 'grab',
                                    touchAction: 'none'
                                  }}
                                >
                                  <DragIndicatorOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                  sx={{ mb: 1, minWidth: 0 }}
                                >
                                  {isTable && (
                                    <TableRowsOutlinedIcon
                                      fontSize="small"
                                      color="primary"
                                    />
                                  )}
                                  <Typography
                                    variant="body2"
                                    fontWeight={650}
                                    sx={{
                                      minWidth: 0,
                                      overflowWrap: 'anywhere',
                                      flex: 1
                                    }}
                                  >
                                    {labelOverrides[field] || labelFor(field)}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={
                                      isTable
                                        ? tableBlockLabel
                                        : fieldBlockLabel
                                    }
                                    sx={{
                                      color: 'grey.800',
                                      borderColor: 'grey.400'
                                    }}
                                  />
                                </Stack>
                                {isTable ? (
                                  <Stack
                                    direction="row"
                                    spacing={0.75}
                                    aria-hidden="true"
                                  >
                                    {[0, 1, 2, 3].map((column) => (
                                      <Box
                                        key={column}
                                        sx={{
                                          height: 18,
                                          flex: column === 1 ? 2 : 1,
                                          borderRadius: 0.5,
                                          bgcolor: 'grey.200'
                                        }}
                                      />
                                    ))}
                                  </Stack>
                                ) : (
                                  <Box
                                    sx={{
                                      height: 8,
                                      width: '72%',
                                      borderRadius: 0.5,
                                      bgcolor: 'grey.200'
                                    }}
                                    aria-hidden="true"
                                  />
                                )}
                                <TextField
                                  fullWidth
                                  size="small"
                                  variant="standard"
                                  label={customLabelLabel}
                                  value={labelOverrides[field] || ''}
                                  placeholder={labelFor(field)}
                                  inputProps={{
                                    maxLength: 100,
                                    'aria-label': `${customLabelLabel}: ${labelFor(
                                      field
                                    )}`
                                  }}
                                  onChange={(event) =>
                                    onLabelOverrideChange(
                                      field,
                                      event.target.value
                                    )
                                  }
                                  sx={{ mt: 1, maxWidth: 420 }}
                                />
                              </Box>
                            </Stack>
                          </Paper>
                        )}
                      </Draggable>
                    );
                  })}
                  {dropProvided.placeholder}
                  {!fields.length && (
                    <Typography
                      variant="body2"
                      color="grey.700"
                      sx={{ py: 4, textAlign: 'center' }}
                    >
                      {hint}
                    </Typography>
                  )}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <Typography
            variant="body2"
            color="grey.700"
            sx={{ mt: 4, textAlign: 'center' }}
          >
            {hint}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
