import { useState } from "react";
import { IconX } from "@/icons";

/**
 * AddOptionModal — modal to add a new option to a dropdown attribute
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - attributeId: number
 * - attributeLabel: string
 * - onSubmit: (data: { attributeId, value, labelTh, labelEn }) => Promise<void>
 */
export default function AddOptionModal({ isOpen, onClose, attributeId, attributeLabel, onSubmit }) {
  const [value, setValue] = useState("");
  const [labelTh, setLabelTh] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        attributeId,
        value: value.trim(),
        labelTh: labelTh.trim() || value.trim(),
        labelEn: labelEn.trim() || value.trim(),
      });
      setValue("");
      setLabelTh("");
      setLabelEn("");
      onClose();
    } catch (err) {
      console.error("Failed to add option:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">
            เพิ่มตัวเลือก — {attributeLabel}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">ค่า (Value) *</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
              placeholder="เช่น ceremonial, A+, japan"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">ชื่อไทย</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
              placeholder="ชื่อแสดงภาษาไทย"
              value={labelTh}
              onChange={(e) => setLabelTh(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">ชื่ออังกฤษ</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
              placeholder="English label"
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!value.trim() || loading}
              className="flex-1 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "กำลังบันทึก..." : "เพิ่ม"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
