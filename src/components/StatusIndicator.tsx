type StatusIndicatorProps = {
  status: 'green' | 'yellow' | 'red' | 'none';
};

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const getStatusEmoji = () => {
    switch (status) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'red':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <span className="inline-flex items-center justify-center w-6 h-6">
      {getStatusEmoji()}
    </span>
  );
}