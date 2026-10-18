import ContentState from './ContentState';

export default function NoRowsMessage({
  message,
  action
}: {
  message: string;
  action: string;
}) {
  return (
    <ContentState variant="empty" message={message} description={action} />
  );
}
