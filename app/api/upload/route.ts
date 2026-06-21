// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "無搵到檔案" }, { status: 400 });
    }

    // 🚀 核心修復：加入 addRandomSuffix: true
    const blob = await put(file.name, file, {
      access: 'public', 
      addRandomSuffix: true, // 自動加隨機字尾，防止同名檔案互相衝突報錯
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("Server Upload Error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}