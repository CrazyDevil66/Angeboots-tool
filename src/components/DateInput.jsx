import { Calendar } from 'lucide-react';

function deToIso(de) {
  if (!de) return '';
  const [d, m, y] = de.split('.');
  if (!d || !m || !y || y.length < 4) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isoToDe(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}.${m}.${y}`;
}

export default function DateInput({ value, onChange, className = '', ...props }) {
  return (
    <div className="relative">
      <input
        type="date"
        value={deToIso(value)}
        onChange={e => onChange(isoToDe(e.target.value))}
        className={`w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700 appearance-none ${className}`}
        {...props}
      />
      <Calendar
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}

export function add14Days(deDatum) {
  if (!deDatum) return '';
  const [d, m, y] = deDatum.split('.').map(Number);
  if (!d || !m || !y) return '';
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 14);
  return date.toLocaleDateString('de-DE');
}
