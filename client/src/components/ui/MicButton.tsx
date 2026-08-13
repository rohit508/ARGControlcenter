interface Props {
  listening: boolean;
  supported: boolean;
  onClick: () => void;
  label: string;
}

// Small toggle button dropped inline next to a text field's label. Pulses red while listening so
// it's obvious dictation is live; renders nothing if the browser has no SpeechRecognition support
// rather than showing a mic that would silently fail on click.
export default function MicButton({ listening, supported, onClick, label }: Props) {
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? `Stop dictating ${label}` : `Dictate ${label} by voice`}
      aria-pressed={listening}
      title={listening ? "Listening… click to stop" : `Dictate ${label} by voice`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
        listening
          ? "bg-danger-500 text-white animate-pulse"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/20 dark:hover:text-brand-300"
      }`}
    >
      <span aria-hidden className="text-xs">🎤</span>
    </button>
  );
}
