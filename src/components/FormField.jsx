export default function FormField({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800
        bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all
        placeholder:text-slate-300 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800
        bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all
        placeholder:text-slate-300 resize-none ${className}`}
      rows={3}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800
        bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
