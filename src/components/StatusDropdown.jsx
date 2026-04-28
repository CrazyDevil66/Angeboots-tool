import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_LIST, getStatus } from '../lib/statusConfig';

export default function StatusDropdown({ status, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = getStatus(status);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold
          transition-opacity ${cfg.bg} ${cfg.text}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
        {!disabled && <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[160px]">
          {STATUS_LIST.map(s => (
            <button
              key={s.value}
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-slate-50
                ${s.value === status ? 'font-semibold bg-slate-50' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <span className={s.text}>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
