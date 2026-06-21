// app/utils/exportPdf.ts
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportItineraryToPDF(elementId: string, fileName: string): Promise<boolean> {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return false;

  // 1. 建立一個隱形嘅「完美 A4 影樓」
  const printWrapper = document.createElement("div");
  printWrapper.style.position = "absolute";
  printWrapper.style.left = "-9999px"; // 收埋唔畀用家見到
  printWrapper.style.top = "0";
  printWrapper.style.width = "800px";  // 強制 A4 完美比例闊度
  printWrapper.style.padding = "40px"; // 專業留白呼吸空間
  printWrapper.style.backgroundColor = "#ffffff"; // 強制白底
  printWrapper.style.color = "#000000";

  // 2. 複製行程表放入影樓
  const clone = originalElement.cloneNode(true) as HTMLElement;
  printWrapper.appendChild(clone);
  document.body.appendChild(printWrapper);

  // 3. 暫時抽走系統嘅 Dark Mode，確保 PDF 係最靚嘅 Light Mode
  const htmlDoc = document.documentElement;
  const isDarkMode = htmlDoc.classList.contains("dark");
  if (isDarkMode) htmlDoc.classList.remove("dark");

  try {
    // 4. 進行超高清截圖 (Scale: 2)
    const canvas = await html2canvas(printWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 1.0);

    // 5. 計算 A4 分頁
    const imgWidth = 210; // A4 闊度 mm
    const pageHeight = 297; // A4 高度 mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    const pdf = new jsPDF("p", "mm", "a4");

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 自動分頁演算
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 6. 觸發下載
    pdf.save(fileName);
    return true;

  } catch (error) {
    console.error("PDF 匯出失敗:", error);
    return false;
  } finally {
    // 7. 手尾清理：拆除影樓，還原 Dark Mode
    document.body.removeChild(printWrapper);
    if (isDarkMode) htmlDoc.classList.add("dark");
  }
}