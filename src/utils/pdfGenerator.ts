import jsPDF from "jspdf";
import { PrintOptions } from "@/components/OptionsPanel";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker - v3 compatibility
const pdfjsVersion = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const PAGE_FORMATS = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
};

const getCellCode = (col: number, row: number): string => {
  const colLetter = String.fromCharCode(65 + col); // A, B, C, ...
  return `${colLetter}${row + 1}`;
};

const addCropMarks = (pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number = 10) => {
  const markLength = 5;
  const markOffset = 3;
  
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.1);
  
  // Top-left corner
  pdf.line(margin - markOffset - markLength, margin, margin - markOffset, margin);
  pdf.line(margin, margin - markOffset - markLength, margin, margin - markOffset);
  
  // Top-right corner
  pdf.line(pageWidth - margin + markOffset, margin, pageWidth - margin + markOffset + markLength, margin);
  pdf.line(pageWidth - margin, margin - markOffset - markLength, pageWidth - margin, margin - markOffset);
  
  // Bottom-left corner
  pdf.line(margin - markOffset - markLength, pageHeight - margin, margin - markOffset, pageHeight - margin);
  pdf.line(margin, pageHeight - margin + markOffset, margin, pageHeight - margin + markOffset + markLength);
  
  // Bottom-right corner
  pdf.line(pageWidth - margin + markOffset, pageHeight - margin, pageWidth - margin + markOffset + markLength, pageHeight - margin);
  pdf.line(pageWidth - margin, pageHeight - margin + markOffset, pageWidth - margin, pageHeight - margin + markOffset + markLength);
};

const addSummaryPage = (pdf: jsPDF, imgData: string, options: PrintOptions) => {
  pdf.addPage();
  const { pageWidth, pageHeight } = getPageDimensions(options);
  const margin = 20;
  
  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Guida al Montaggio", pageWidth / 2, margin, { align: "center" });
  
  // Calculate image dimensions to fit on page
  const availableWidth = pageWidth - (margin * 2);
  const availableHeight = pageHeight - (margin * 4) - 30;
  
  const img = new Image();
  img.src = imgData;
  const imgAspect = img.width / img.height;
  
  let summaryWidth = availableWidth;
  let summaryHeight = availableWidth / imgAspect;
  
  if (summaryHeight > availableHeight) {
    summaryHeight = availableHeight;
    summaryWidth = availableHeight * imgAspect;
  }
  
  const xPos = (pageWidth - summaryWidth) / 2;
  const yPos = margin + 20;
  
  // Draw the full image
  pdf.addImage(imgData, "JPEG", xPos, yPos, summaryWidth, summaryHeight);
  
  // Draw grid overlay
  pdf.setDrawColor(255, 0, 0);
  pdf.setLineWidth(0.5);
  
  const cellWidth = summaryWidth / options.columns;
  const cellHeight = summaryHeight / options.rows;
  
  // Vertical lines
  for (let i = 0; i <= options.columns; i++) {
    const x = xPos + (i * cellWidth);
    pdf.line(x, yPos, x, yPos + summaryHeight);
  }
  
  // Horizontal lines
  for (let i = 0; i <= options.rows; i++) {
    const y = yPos + (i * cellHeight);
    pdf.line(xPos, y, xPos + summaryWidth, y);
  }
  
  // Add cell codes
  pdf.setFontSize(10);
  pdf.setTextColor(255, 0, 0);
  
  for (let row = 0; row < options.rows; row++) {
    for (let col = 0; col < options.columns; col++) {
      const cellCode = getCellCode(col, row);
      const x = xPos + (col * cellWidth) + (cellWidth / 2);
      const y = yPos + (row * cellHeight) + (cellHeight / 2);
      pdf.text(cellCode, x, y, { align: "center" });
    }
  }
  
  // Instructions
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const instructionsY = yPos + summaryHeight + 15;
  pdf.text(
    `Stampa tutte le ${options.columns * options.rows} pagine e assembla seguendo i codici mostrati.`,
    pageWidth / 2,
    instructionsY,
    { align: "center" }
  );
};

export const generatePosterPDF = async (
  file: File,
  options: PrintOptions
): Promise<Blob> => {
  const isPDF = file.type === "application/pdf";
  
  if (isPDF) {
    return generateFromPDF(file, options);
  } else {
    return generateFromImage(file, options);
  }
};

const generateFromImage = async (
  file: File,
  options: PrintOptions
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      try {
        const pdf = createPDFDocument(options);
        const { pageWidth, pageHeight } = getPageDimensions(options);

        const imgWidth = img.width;
        const imgHeight = img.height;

        const cellWidth = imgWidth / options.columns;
        const cellHeight = imgHeight / options.rows;

        // Create canvas for cropping
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        let pageIndex = 0;
        for (let row = 0; row < options.rows; row++) {
          for (let col = 0; col < options.columns; col++) {
            if (pageIndex > 0) {
              pdf.addPage();
            }

            const x = col * cellWidth;
            const y = row * cellHeight;

            canvas.width = cellWidth;
            canvas.height = cellHeight;

            // Draw the cropped portion
            ctx.drawImage(
              img,
              x, y, cellWidth, cellHeight,
              0, 0, cellWidth, cellHeight
            );

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            
            // Calculate dimensions to fit within printable area (with margins)
            const margin = 10;
            const printableWidth = pageWidth - (margin * 2);
            const printableHeight = pageHeight - (margin * 2) - 15;
            
            const imgAspect = cellWidth / cellHeight;
            const printableAspect = printableWidth / printableHeight;
            
            let finalWidth = printableWidth;
            let finalHeight = printableWidth / imgAspect;
            
            if (finalHeight > printableHeight) {
              finalHeight = printableHeight;
              finalWidth = printableHeight * imgAspect;
            }

            const xOffset = margin + (printableWidth - finalWidth) / 2;
            const yOffset = margin + (printableHeight - finalHeight) / 2;

            pdf.addImage(imgData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);

            // Add crop marks
            addCropMarks(pdf, pageWidth, pageHeight, margin);

            // Add cell code (large and prominent)
            const cellCode = getCellCode(col, row);
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            pdf.text(cellCode, pageWidth / 2, pageHeight - 5, { align: "center" });
            
            // Add page info
            pdf.setFontSize(8);
            pdf.setTextColor(100);
            pdf.text(
              `Pagina ${pageIndex + 1}/${options.columns * options.rows}`,
              margin,
              pageHeight - 5
            );

            pageIndex++;
          }
        }

        // Add summary page at the end
        addSummaryPage(pdf, img.src, options);

        resolve(pdf.output("blob"));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const generateFromPDF = async (
  file: File,
  options: PrintOptions
): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  // Convert canvas to image and use the same logic as images
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imgData;
    
    img.onload = () => {
      const pdf = createPDFDocument(options);
      const { pageWidth, pageHeight } = getPageDimensions(options);

      const imgWidth = img.width;
      const imgHeight = img.height;

      const cellWidth = imgWidth / options.columns;
      const cellHeight = imgHeight / options.rows;

      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d")!;

      let pageIndex = 0;
      for (let row = 0; row < options.rows; row++) {
        for (let col = 0; col < options.columns; col++) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          const x = col * cellWidth;
          const y = row * cellHeight;

          cropCanvas.width = cellWidth;
          cropCanvas.height = cellHeight;

          cropCtx.drawImage(
            img,
            x, y, cellWidth, cellHeight,
            0, 0, cellWidth, cellHeight
          );

          const croppedData = cropCanvas.toDataURL("image/jpeg", 0.95);
          
          // Calculate dimensions to fit within printable area (with margins)
          const margin = 10;
          const printableWidth = pageWidth - (margin * 2);
          const printableHeight = pageHeight - (margin * 2) - 15;
          
          const imgAspect = cellWidth / cellHeight;
          const printableAspect = printableWidth / printableHeight;
          
          let finalWidth = printableWidth;
          let finalHeight = printableWidth / imgAspect;
          
          if (finalHeight > printableHeight) {
            finalHeight = printableHeight;
            finalWidth = printableHeight * imgAspect;
          }

          const xOffset = margin + (printableWidth - finalWidth) / 2;
          const yOffset = margin + (printableHeight - finalHeight) / 2;

          pdf.addImage(croppedData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);

          // Add crop marks
          addCropMarks(pdf, pageWidth, pageHeight, margin);

          // Add cell code (large and prominent)
          const cellCode = getCellCode(col, row);
          pdf.setFontSize(16);
          pdf.setTextColor(0, 0, 0);
          pdf.text(cellCode, pageWidth / 2, pageHeight - 5, { align: "center" });
          
          // Add page info
          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.text(
            `Pagina ${pageIndex + 1}/${options.columns * options.rows}`,
            margin,
            pageHeight - 5
          );

          pageIndex++;
        }
      }

      // Add summary page at the end
      addSummaryPage(pdf, imgData, options);

      resolve(pdf.output("blob"));
    };
    
    img.onerror = reject;
  });
};

const createPDFDocument = (options: PrintOptions): jsPDF => {
  const { pageWidth, pageHeight } = getPageDimensions(options);
  
  return new jsPDF({
    orientation: options.orientation,
    unit: "mm",
    format: [pageWidth, pageHeight],
  });
};

const getPageDimensions = (options: PrintOptions) => {
  const format = PAGE_FORMATS[options.pageFormat];
  const isPortrait = options.orientation === "portrait";
  
  return {
    pageWidth: isPortrait ? format.width : format.height,
    pageHeight: isPortrait ? format.height : format.width,
  };
};
