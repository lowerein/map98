// components/AddPlaceForm.tsx
interface AddPlaceFormProps {
  placeName: string;
  setPlaceName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  googleMapsUrl?: string; // 🚀 新增接收 URL
}

export default function AddPlaceForm({ placeName, setPlaceName, onSubmit, onCancel, isEditing, googleMapsUrl }: AddPlaceFormProps) {
  return (
    <div className="w-56 sm:w-64 p-1"> 
      <h3 className="font-bold text-base mb-2 text-gray-800">
        {isEditing ? "📝 編輯地點" : "📍 新增地點"}
      </h3>
      
      {/* 🚀 如果有 Link，就顯示出黎 */}
      {googleMapsUrl && (
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-blue-500 hover:text-blue-700 hover:underline mb-3 block"
        >
          🔗 在 Google Maps 尋找此地點
        </a>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="輸入地點名稱"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            required
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-md font-medium hover:bg-blue-700 transition">
            {isEditing ? "更新" : "儲存"}
          </button>
          <button type="button" onClick={onCancel} className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}