declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[] | { top?: number; bottom?: number; left?: number; right?: number };
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      logging?: boolean;
      allowTaint?: boolean;
      backgroundColor?: string;
      width?: number;
      height?: number;
    };
    jsPDF?: {
      unit?: string;
      format?: string | string[];
      orientation?: 'portrait' | 'landscape';
    };
    pagebreak?: { mode?: string[]; before?: string[]; after?: string[]; avoid?: string[] };
  }

  interface Html2Pdf {
    from(element: string | HTMLElement): {
      set(options: Html2Pdf): Html2Pdf;
      toPdf(): Promise<Blob>;
      toContainer(): Promise<HTMLElement>;
      save(filename?: string): void;
      getJson(): Promise<any>;
      img(): Promise<any>;
      outputImg(type?: string): Promise<string>;
    };
    to(container: string | HTMLElement): Html2Pdf;
    toPdf(): Promise<Blob>;
    save(filename?: string): void;
  }

  function html2pdf(): Html2Pdf;

  export default html2pdf;
}