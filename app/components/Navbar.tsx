import { auth, signIn, signOut } from "@/auth";

export default async function Navbar() {
  // 喺 Server Side 獲取目前登入狀態
  const session = await auth();

  return (
    <nav className="flex items-center justify-between p-4 border-b bg-white">
      <div className="text-2xl font-bold text-blue-600 tracking-tight">
        98Map 📍
      </div>

      <div>
        {session?.user ? (
          // 已經登入嘅狀態：顯示名 + 登出按鈕
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{session.user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100"
              >
                登出
              </button>
            </form>
          </div>
        ) : (
          // 未登入嘅狀態：顯示 Google 登入按鈕
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Google 登入
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}