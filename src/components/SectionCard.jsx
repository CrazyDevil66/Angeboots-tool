export default function SectionCard({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-indigo-500" />}
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
