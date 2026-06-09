import { IconPlus } from "@/icons";

/**
 * DynamicAttributeField — renders a single attribute field based on fieldType
 * 
 * Props:
 * - attribute: { id, attributeKey, labelTh, labelEn, fieldType, options, isRequired }
 * - value: current value (string | number | null)
 * - onChange: (value) => void
 * - onAddOption: (attributeId) => void — opens AddOptionModal
 */
export default function DynamicAttributeField({ attribute, value, onChange, onAddOption }) {
  const label = attribute.labelTh || attribute.labelEn;

  if (attribute.fieldType === "text") {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <input
          type="text"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none transition-all"
          placeholder={attribute.labelEn}
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    );
  }

  if (attribute.fieldType === "number") {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <input
          type="number"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none transition-all"
          placeholder={attribute.labelEn}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
    );
  }

  // Default: dropdown
  const options = attribute.options || [];

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex gap-1">
        <select
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none transition-all bg-white appearance-none"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">— เลือก{label} —</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.labelTh || opt.value}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onAddOption(attribute.id)}
          className="px-2 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="เพิ่มตัวเลือกใหม่"
        >
          <IconPlus size={16} />
        </button>
      </div>
    </div>
  );
}
