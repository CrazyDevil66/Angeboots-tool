export const STATUS_CONFIG = {
  entwurf: {
    label: 'Entwurf',
    bg: 'bg-slate-100', text: 'text-slate-600',
    dot: 'bg-slate-400', border: 'border-slate-200',
  },
  gesendet: {
    label: 'Gesendet',
    bg: 'bg-blue-50', text: 'text-blue-700',
    dot: 'bg-blue-500', border: 'border-blue-200',
  },
  angenommen: {
    label: 'Angenommen',
    bg: 'bg-emerald-50', text: 'text-emerald-700',
    dot: 'bg-emerald-500', border: 'border-emerald-200',
  },
  abgelehnt: {
    label: 'Abgelehnt',
    bg: 'bg-red-50', text: 'text-red-600',
    dot: 'bg-red-400', border: 'border-red-200',
  },
  abgelaufen: {
    label: 'Abgelaufen',
    bg: 'bg-orange-50', text: 'text-orange-700',
    dot: 'bg-orange-400', border: 'border-orange-200',
  },
};

export const STATUS_LIST = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, ...cfg }));

export function getStatus(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.entwurf;
}
