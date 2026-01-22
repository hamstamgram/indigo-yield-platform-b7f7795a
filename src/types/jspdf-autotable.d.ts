/**
 * Type declarations for jspdf-autotable plugin
 * Augments jsPDF with autoTable functionality
 */

import "jspdf";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
    lastAutoTable?: { finalY: number };
  }
}

export interface AutoTableOptions {
  startY?: number;
  head?: (string | number)[][];
  body?: (string | number | null | undefined)[][];
  theme?: "plain" | "grid" | "striped";
  styles?: AutoTableStyles;
  headStyles?: AutoTableStyles;
  bodyStyles?: AutoTableStyles;
  columnStyles?: Record<number | string, AutoTableColumnStyles>;
  margin?: { left?: number; right?: number; top?: number; bottom?: number };
  tableWidth?: "auto" | "wrap" | number;
  showHead?: "everyPage" | "firstPage" | "never";
  showFoot?: "everyPage" | "lastPage" | "never";
  didDrawCell?: (data: AutoTableCellHookData) => void;
  didDrawPage?: (data: AutoTablePageHookData) => void;
  willDrawCell?: (data: AutoTableCellHookData) => void;
  didParseCell?: (data: AutoTableCellHookData) => void;
}

export interface AutoTableStyles {
  fontSize?: number;
  fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
  font?: string;
  cellPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  lineColor?: string | number[];
  lineWidth?: number;
  cellWidth?: number | "auto" | "wrap";
  minCellHeight?: number;
  minCellWidth?: number;
  halign?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  fillColor?: string | number[] | false;
  textColor?: string | number[];
  overflow?: "linebreak" | "ellipsize" | "visible" | "hidden";
}

export interface AutoTableColumnStyles extends AutoTableStyles {
  cellWidth?: number | "auto" | "wrap";
}

export interface AutoTableCellHookData {
  cell: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string | string[];
    styles: AutoTableStyles;
    section: "head" | "body" | "foot";
    raw: string | number | null | undefined;
  };
  row: {
    index: number;
    raw: (string | number | null | undefined)[];
    height: number;
  };
  column: {
    index: number;
    dataKey: string | number;
    width: number;
  };
  section: "head" | "body" | "foot";
  table: unknown;
  doc: jsPDF;
  cursor: { x: number; y: number } | null;
}

export interface AutoTablePageHookData {
  pageNumber: number;
  pageCount: number;
  settings: AutoTableOptions;
  table: unknown;
  doc: jsPDF;
  cursor: { x: number; y: number } | null;
}
