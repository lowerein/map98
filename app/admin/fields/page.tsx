// app/admin/fields/page.tsx
"use client";
import { useState, useEffect } from "react";
import { getAllFields, saveFields, type FieldDTO } from "@/app/lib/actions/fields";

export default function FieldsSetting() {
  const [fields, setFields] = useState<FieldDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<FieldDTO["type"]>("text");
  const [newRequired, setNewRequired] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllFields()
      .then(setFields)
      .catch((err) => console.error("載入欄位失敗:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newKey) return;
    const key = newKey.toLowerCase().replace(/\s+/g, "_");
    if (fields.some((f) => f.key === key)) {
      setSaveMessage("⚠️ 此系統代碼已存在");
      setTimeout(() => setSaveMessage(""), 2500);
      return;
    }
    const newField: FieldDTO = {
      id: `new_${Date.now()}`,
      key,
      label: newLabel,
      type: newType,
      isRequired: newRequired,
      isActive: true,
      isSystemDefault: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
    setNewLabel(""); setNewKey(""); setNewType("text"); setNewRequired(false);
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const toggleFieldProp = (id: string, prop: "isActive" | "isRequired") => {
    setFields(fields.map((f) => (f.id === id ? { ...f, [prop]: !f[prop] } : f)));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage("⏳ 正在儲存欄位配置...");
    try {
      const updated = await saveFields(fields);
      setFields(updated);
      setSaveMessage("✅ 全域景點預設欄位已成功套用！前端表單已同步更新。");
    } catch (err) {
      console.error(err);
      setSaveMessage("❌ 儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-wide flex items-center gap-2">
          <span>📋</span> 景點預設欄位設定
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          自訂全系統景點（Places）的通用輸入欄位。在此修改並發布後，前台的「新增景點表單」將自動調整。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">🗂️ 現有通用欄位 ({fields.length})</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-400">載入中... ⏳</div>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl bg-gray-100 dark:bg-gray-800 p-2 rounded-xl shrink-0 mt-0.5 shadow-inner">
                        {field.type === "text" && "📝"}
                        {/* 🚀 加入 textarea 的 icon */}
                        {field.type === "textarea" && "📃"}
                        {field.type === "number" && "🔢"}
                        {field.type === "checkbox" && "☑️"}
                        {field.type === "file" && "📎"}
                        {field.type === "image" && "🖼️"}
                        {field.type === "date" && "📅"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{field.label}</span>
                          {field.isSystemDefault && (
                            <span className="text-[9px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-100 dark:border-blue-900/50">系統內建</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">Key: {field.key} | 形態: {field.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 sm:gap-6 ml-auto sm:ml-0">
                      <button
                        type="button"
                        onClick={() => toggleFieldProp(field.id, "isRequired")}
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border transition-all ${
                          field.isRequired
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                            : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-400"
                        }`}
                      >
                        {field.isRequired ? "★ 必填" : "選填"}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">{field.isActive ? "已啟用" : "隱藏"}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={field.isActive} onChange={() => toggleFieldProp(field.id, "isActive")} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                        </label>
                      </div>

                      {!field.isSystemDefault ? (
                        <button type="button" onClick={() => handleDeleteField(field.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 rounded-lg transition-colors text-sm" title="刪除自訂欄位">
                          🗑️
                        </button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-1.5 border-b dark:border-gray-800 pb-2">
            <span>➕</span> 擴充新自訂欄位
          </h3>

          <form onSubmit={handleAddField} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">欄位名稱 (Label)</label>
              <input required type="text" placeholder="例如：門票價格 🎫" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold outline-none text-gray-800 dark:text-gray-100" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">系統代碼 (Database Key)</label>
              <input required type="text" placeholder="例如：ticket_price" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono outline-none text-gray-800 dark:text-gray-100" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">資料輸入形態 (Input Type)</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as FieldDTO["type"])} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold outline-none cursor-pointer">
                <option value="text">📝 單行文字 (Text)</option>
                {/* 🚀 加入 多行文字選項 */}
                <option value="textarea">📃 多行文字 (Multi-line Text)</option>
                <option value="number">🔢 數字計量 (Number)</option>
                <option value="checkbox">☑️ 勾選方塊 (Checkbox)</option>
                <option value="file">📎 檔案附件 (File)</option>
                <option value="image">🖼️ 相片上傳 (Image)</option>
                <option value="date">📅 日期 (Date)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
              <span className="font-bold text-gray-600 dark:text-gray-400">是否設定為必填？</span>
              <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="w-4 h-4 cursor-pointer" />
            </div>

            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow transition">
              ⚡ 載入至上方清單
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 p-4 rounded-2xl flex items-center justify-between shadow-sm mt-auto">
        <div className="text-xs font-bold text-green-600 dark:text-green-400 min-h-[16px]">{saveMessage}</div>
        <button onClick={handleSaveAll} disabled={saving} className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow transition-all disabled:opacity-50">
          💾 發布並更新全域欄位
        </button>
      </div>
    </div>
  );
}