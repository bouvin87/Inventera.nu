import * as XLSX from "xlsx";
import type { Article, OrderLine, InventoryCount } from "@shared/schema";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export function downloadArticlesAsExcel(
  articles: Article[], 
  inventoryCounts: InventoryCount[], 
  filename: string = "inventory_report.xlsx"
) {
  // Create article lookup map
  const articleMap = new Map(articles.map(a => [a.id, a]));
  
  // Create data rows - one per inventory count
  const data = inventoryCounts.map(count => {
    const article = articleMap.get(count.articleId);
    return {
      "Artikelnummer": article?.articleNumber ?? "",
      "Beskrivning": article?.description ?? "",
      "Längd": article?.length ?? "",
      "Lagerplats": article?.location ?? "",
      "Inventerat antal": count.count,
      "Användare": count.userId,
      "Datum": count.createdAt ? format(new Date(count.createdAt), "yyyy-MM-dd HH:mm", { locale: sv }) : "",
      "Anteckningar": count.notes ?? "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventeringar");
  XLSX.writeFile(wb, filename);
}

export function downloadOrderLinesAsExcel(orderLines: OrderLine[], filename: string = "order_report.xlsx") {
  const data = orderLines.map(line => ({
    "Ordernummer": line.orderNumber,
    "Pos": line.position || "",
    "art.nr": line.articleNumber,
    "Besk": line.description,
    "Längd": line.length,
    "Antal": line.quantity,
    "Plockstatt": line.pickStatus,
    "Inventerad": line.isInventoried ? "Ja" : "Nej",
    "Inventerat antal": line.inventoriedQuantity ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orderrader");
  XLSX.writeFile(wb, filename);
}

export function downloadDiscrepanciesAsExcel(
  articles: Article[], 
  inventoryCounts: InventoryCount[], 
  filename: string = "discrepancies_report.xlsx"
) {
  // Create article lookup map
  const articleMap = new Map(articles.map(a => [a.id, a]));
  
  // Filter inventory counts with notes (discrepancies)
  const discrepancies = inventoryCounts.filter(count => count.notes && count.notes.length > 0);
  
  const data = discrepancies.map(count => {
    const article = articleMap.get(count.articleId);
    return {
      "Artikelnummer": article?.articleNumber ?? "",
      "Beskrivning": article?.description ?? "",
      "Lagerplats": article?.location ?? "",
      "Inventerat antal": count.count,
      "Användare": count.userId,
      "Datum": count.createdAt ? format(new Date(count.createdAt), "yyyy-MM-dd HH:mm", { locale: sv }) : "",
      "Anteckningar": count.notes,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Avvikelser");
  XLSX.writeFile(wb, filename);
}
