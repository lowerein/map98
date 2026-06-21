// app/components/share/ShareModal.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { Itinerary } from "../types";
import {
  listItineraryCollaborators,
  inviteToItinerary,
  removeItineraryCollaborator,
  updateItineraryShareRole,
  type CollaboratorDTO,
} from "../../lib/actions/share";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
}

const roleLabel = (role: string) =>
  role === "owner" ? "擁有者" : role === "editor" ? "編輯者" : "檢視者";

export default function ShareModal({ isOpen, onClose, itinerary }: ShareModalProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [copied, setCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isPersisted = !itinerary.id.startsWith("temp-");

  const refresh = useCallback(async () => {
    if (!isPersisted) return;
    setLoading(true);
    try {
      setCollaborators(await listItineraryCollaborators(itinerary.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [itinerary.id, isPersisted]);

  useEffect(() => {
    if (isOpen) {
      setError("");
      refresh();
    }
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/planner?itinerary=${itinerary.id}`
      : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await inviteToItinerary(itinerary.id, inviteEmail, inviteRole);
      if (!res.ok) {
        setError(res.error);
      } else {
        setCollaborators(res.collaborators);
        setInviteEmail("");
      }
    } catch (err) {
      setError("邀請失敗，請稍後再試。");
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setBusy(true);
    try {
      await removeItineraryCollaborator(itinerary.id, userId);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setBusy(true);
    try {
      await updateItineraryShareRole(itinerary.id, userId, role);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* 標題列 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="font-black text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span>🤝</span> 分享行程
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            ✖
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* 行程名稱 */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">正在分享</div>
            <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">{itinerary.name}</div>
          </div>

          {!isPersisted ? (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
              ⏳ 行程仍在儲存中，請稍候片刻再分享。
            </div>
          ) : (
            <>
              {/* 邀請表單 */}
              <form onSubmit={handleInvite} className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400">邀請協作者</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="輸入電郵地址..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-2 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="editor">可編輯</option>
                    <option value="viewer">只限檢視</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-black transition disabled:opacity-50"
                >
                  {busy ? "處理中..." : "發送邀請"}
                </button>
                {error && <div className="text-[11px] text-red-500 font-bold pt-1">{error}</div>}
              </form>

              {/* 現有協作者清單 */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-2">
                  擁有權限的用戶 {loading && <span className="text-gray-400">(載入中...)</span>}
                </label>
                <div className="space-y-3 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                  {collaborators.map((collab) => {
                    const avatar = (collab.name || collab.email || "?").charAt(0).toUpperCase();
                    return (
                      <div key={collab.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0 ${collab.role === "owner" ? "bg-orange-500" : "bg-blue-500"}`}>
                            {avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1 truncate">
                              {collab.name || collab.email}
                              {collab.role === "owner" && (
                                <span className="text-[9px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1 rounded uppercase">Owner</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">{collab.email}</div>
                          </div>
                        </div>

                        {collab.role === "owner" ? (
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">{roleLabel(collab.role)}</div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={collab.role}
                              disabled={busy}
                              onChange={(e) => handleRoleChange(collab.id, e.target.value)}
                              className="text-[11px] font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 cursor-pointer"
                            >
                              <option value="editor">編輯者</option>
                              <option value="viewer">檢視者</option>
                            </select>
                            <button
                              onClick={() => handleRemove(collab.id)}
                              disabled={busy}
                              title="移除協作者"
                              className="p-1 text-gray-400 hover:text-red-500 transition"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!loading && collaborators.length <= 1 && (
                    <div className="text-[11px] text-gray-400 italic">尚未有其他協作者。</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 複製連結區塊 */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-2">行程連結（協作者可開啟）</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-transparent border-none text-xs text-gray-500 dark:text-gray-400 px-2 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                {copied ? "✅ 已複製" : "🔗 複製連結"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
