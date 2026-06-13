type AlertBannerProps = {
  alerts: string[];
  onDismiss: () => void;
  title: string;
  dismissTxt: string;
};

export default function AlertBanner({ alerts, onDismiss, title, dismissTxt }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 shadow-sm rounded-r-lg relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="pr-4">
          <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
            ⚠️ {title}
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-amber-700 text-sm font-medium">
            {alerts.map((alert, idx) => (
              <li key={idx}>{alert}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 font-medium text-sm px-3 py-1 rounded transition-colors whitespace-nowrap"
        >
          {dismissTxt}
        </button>
      </div>
    </div>
  );
}