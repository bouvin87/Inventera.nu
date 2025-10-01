import * as XLSX from "xlsx";
import type { Article, OrderLine } from "@shared/schema";

export function downloadArticlesAsExcel(articles: Article[], filename: string = "inventory_report.xlsx") {
  const data = articles.map(article => ({
    "Artikelnummer": article.articleNumber,
    "Beskrivning": article.description,
    "Längd": article.length,
    "Lagerplats": article.location,
    "Inventerat antal": article.inventoryCount ?? "",
    "Status": article.isInventoried ? "Inventerad" : "Ej inventerad",
    "Anteckningar": article.notes ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Artiklar");
  XLSX.writeFile(wb, filename);
}

export function downloadOrderLinesAsExcel(orderLines: OrderLine[], filename: string = "order_report.xlsx") {
  const data = orderLines.map(line => ({
    "Ordernummer": line.orderNumber,
    "Artikelnummer": line.articleNumber,
    "Beskrivning": line.description,
    "Längd": line.length,
    "Antal": line.quantity,
    "Plockstatus": line.pickStatus,
    "Inventerad": line.isInventoried ? "Ja" : "Nej",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orderrader");
  XLSX.writeFile(wb, filename);
}

export function downloadDiscrepanciesAsExcel(articles: Article[], filename: string = "discrepancies_report.xlsx") {
  const discrepancies = articles.filter(a => a.notes && a.notes.length > 0);
  
  const data = discrepancies.map(article => ({
    "Artikelnummer": article.articleNumber,
    "Beskrivning": article.description,
    "Lagerplats": article.location,
    "Inventerat antal": article.inventoryCount ?? "",
    "Anteckningar": article.notes,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Avvikelser");
  XLSX.writeFile(wb, filename);
}
