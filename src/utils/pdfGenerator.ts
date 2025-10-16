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

const addOverlapCropMarks = (
  pdf: jsPDF,
  imgX: number,
  imgY: number,
  imgWidth: number,
  imgHeight: number,
  overlapX: number,
  overlapY: number,
  hasLeft: boolean,
  hasRight: boolean,
  hasTop: boolean,
  hasBottom: boolean
) => {
  const markLength = 3;
  pdf.setDrawColor(200, 0, 0);
  pdf.setLineWidth(0.3);

  // Calculate inner rectangle (main area without overlap)
  const innerX = imgX + (hasLeft ? overlapX : 0);
  const innerY = imgY + (hasTop ? overlapY : 0);
  const innerWidth = imgWidth - (hasLeft ? overlapX : 0) - (hasRight ? overlapX : 0);
  const innerHeight = imgHeight - (hasTop ? overlapY : 0) - (hasBottom ? overlapY : 0);

  // Left edge marks (if has left overlap)
  if (hasLeft) {
    // Top mark on left edge
    pdf.line(imgX, innerY, imgX - markLength, innerY);
    pdf.line(imgX, innerY - markLength, imgX, innerY + markLength);
    
    // Bottom mark on left edge
    const y = innerY + innerHeight;
    pdf.line(imgX, y, imgX - markLength, y);
    pdf.line(imgX, y - markLength, imgX, y + markLength);
  }

  // Right edge marks (if has right overlap)
  if (hasRight) {
    const x = imgX + imgWidth;
    // Top mark on right edge
    pdf.line(x, innerY, x + markLength, innerY);
    pdf.line(x, innerY - markLength, x, innerY + markLength);
    
    // Bottom mark on right edge
    const y = innerY + innerHeight;
    pdf.line(x, y, x + markLength, y);
    pdf.line(x, y - markLength, x, y + markLength);
  }

  // Top edge marks (if has top overlap)
  if (hasTop) {
    // Left mark on top edge
    pdf.line(innerX, imgY, innerX, imgY - markLength);
    pdf.line(innerX - markLength, imgY, innerX + markLength, imgY);
    
    // Right mark on top edge
    const x = innerX + innerWidth;
    pdf.line(x, imgY, x, imgY - markLength);
    pdf.line(x - markLength, imgY, x + markLength, imgY);
  }

  // Bottom edge marks (if has bottom overlap)
  if (hasBottom) {
    const y = imgY + imgHeight;
    // Left mark on bottom edge
    pdf.line(innerX, y, innerX, y + markLength);
    pdf.line(innerX - markLength, y, innerX + markLength, y);
    
    // Right mark on bottom edge
    const x = innerX + innerWidth;
    pdf.line(x, y, x, y + markLength);
    pdf.line(x - markLength, y, x + markLength, y);
  }
};

const addDashedBorder = (
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  
  const dashLength = 2;
  const gapLength = 2;
  
  // Draw dashed lines manually
  const drawDashedLine = (x1: number, y1: number, x2: number, y2: number) => {
    const totalLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const numSegments = Math.floor(totalLength / (dashLength + gapLength));
    const dx = (x2 - x1) / totalLength;
    const dy = (y2 - y1) / totalLength;
    
    for (let i = 0; i < numSegments; i++) {
      const startX = x1 + dx * i * (dashLength + gapLength);
      const startY = y1 + dy * i * (dashLength + gapLength);
      const endX = startX + dx * dashLength;
      const endY = startY + dy * dashLength;
      pdf.line(startX, startY, endX, endY);
    }
  };
  
  // Top line
  drawDashedLine(x, y, x + width, y);
  // Right line
  drawDashedLine(x + width, y, x + width, y + height);
  // Bottom line
  drawDashedLine(x + width, y + height, x, y + height);
  // Left line
  drawDashedLine(x, y + height, x, y);
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

        const baseCellWidth = imgWidth / options.columns;
        const baseCellHeight = imgHeight / options.rows;

        // Create canvas for cropping
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        let pageIndex = 0;
        for (let row = 0; row < options.rows; row++) {
          for (let col = 0; col < options.columns; col++) {
            if (pageIndex > 0) {
              pdf.addPage();
            }

            // Calculate base cell position
            const baseX = col * baseCellWidth;
            const baseY = row * baseCellHeight;

            // Calculate dimensions to fit within printable area
            const margin = 10;
            const printableWidth = pageWidth - (margin * 2);
            const printableHeight = pageHeight - (margin * 2) - 15;
            
            const imgAspect = baseCellWidth / baseCellHeight;
            
            let finalWidth = printableWidth;
            let finalHeight = printableWidth / imgAspect;
            
            if (finalHeight > printableHeight) {
              finalHeight = printableHeight;
              finalWidth = printableHeight * imgAspect;
            }

            // Calculate overlap in pixels (relative to printed size)
            const overlapPixelsX = (options.overlap * baseCellWidth) / finalWidth;
            const overlapPixelsY = (options.overlap * baseCellHeight) / finalHeight;

            // Determine which sides have adjacent cells (for overlap)
            const hasLeft = col > 0;
            const hasRight = col < options.columns - 1;
            const hasTop = row > 0;
            const hasBottom = row < options.rows - 1;

            // Calculate actual crop area with overlap
            const cropX = Math.max(0, baseX - (hasLeft ? overlapPixelsX : 0));
            const cropY = Math.max(0, baseY - (hasTop ? overlapPixelsY : 0));
            const cropWidth = Math.min(
              baseCellWidth + (hasLeft ? overlapPixelsX : 0) + (hasRight ? overlapPixelsX : 0),
              imgWidth - cropX
            );
            const cropHeight = Math.min(
              baseCellHeight + (hasTop ? overlapPixelsY : 0) + (hasBottom ? overlapPixelsY : 0),
              imgHeight - cropY
            );

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            // Draw the cropped portion with overlap
            ctx.drawImage(
              img,
              cropX, cropY, cropWidth, cropHeight,
              0, 0, cropWidth, cropHeight
            );

            const imgData = canvas.toDataURL("image/jpeg", 0.95);

            // Calculate final dimensions maintaining aspect ratio of cropped area
            const cropAspect = cropWidth / cropHeight;
            let finalCropWidth = printableWidth;
            let finalCropHeight = printableWidth / cropAspect;
            
            if (finalCropHeight > printableHeight) {
              finalCropHeight = printableHeight;
              finalCropWidth = printableHeight * cropAspect;
            }

            const xOffset = margin + (printableWidth - finalCropWidth) / 2;
            const yOffset = margin + (printableHeight - finalCropHeight) / 2;

            pdf.addImage(imgData, "JPEG", xOffset, yOffset, finalCropWidth, finalCropHeight);

            // Add dashed border around image
            addDashedBorder(pdf, xOffset, yOffset, finalCropWidth, finalCropHeight);

            // Calculate overlap dimensions in mm on printed page
            const overlapMmX = (overlapPixelsX / cropWidth) * finalCropWidth;
            const overlapMmY = (overlapPixelsY / cropHeight) * finalCropHeight;

            // Add overlap crop marks
            if (options.overlap > 0) {
              addOverlapCropMarks(
                pdf,
                xOffset, yOffset,
                finalCropWidth, finalCropHeight,
                overlapMmX, overlapMmY,
                hasLeft, hasRight, hasTop, hasBottom
              );
            }

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

      const baseCellWidth = imgWidth / options.columns;
      const baseCellHeight = imgHeight / options.rows;

      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d")!;

      let pageIndex = 0;
      for (let row = 0; row < options.rows; row++) {
        for (let col = 0; col < options.columns; col++) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          // Calculate base cell position
          const baseX = col * baseCellWidth;
          const baseY = row * baseCellHeight;

          // Calculate dimensions to fit within printable area
          const margin = 10;
          const printableWidth = pageWidth - (margin * 2);
          const printableHeight = pageHeight - (margin * 2) - 15;
          
          const imgAspect = baseCellWidth / baseCellHeight;
          
          let finalWidth = printableWidth;
          let finalHeight = printableWidth / imgAspect;
          
          if (finalHeight > printableHeight) {
            finalHeight = printableHeight;
            finalWidth = printableHeight * imgAspect;
          }

          // Calculate overlap in pixels (relative to printed size)
          const overlapPixelsX = (options.overlap * baseCellWidth) / finalWidth;
          const overlapPixelsY = (options.overlap * baseCellHeight) / finalHeight;

          // Determine which sides have adjacent cells (for overlap)
          const hasLeft = col > 0;
          const hasRight = col < options.columns - 1;
          const hasTop = row > 0;
          const hasBottom = row < options.rows - 1;

          // Calculate actual crop area with overlap
          const cropX = Math.max(0, baseX - (hasLeft ? overlapPixelsX : 0));
          const cropY = Math.max(0, baseY - (hasTop ? overlapPixelsY : 0));
          const cropWidth = Math.min(
            baseCellWidth + (hasLeft ? overlapPixelsX : 0) + (hasRight ? overlapPixelsX : 0),
            imgWidth - cropX
          );
          const cropHeight = Math.min(
            baseCellHeight + (hasTop ? overlapPixelsY : 0) + (hasBottom ? overlapPixelsY : 0),
            imgHeight - cropY
          );

          cropCanvas.width = cropWidth;
          cropCanvas.height = cropHeight;

          cropCtx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );

          const croppedData = cropCanvas.toDataURL("image/jpeg", 0.95);
          
          // Calculate final dimensions maintaining aspect ratio of cropped area
          const cropAspect = cropWidth / cropHeight;
          let finalCropWidth = printableWidth;
          let finalCropHeight = printableWidth / cropAspect;
          
          if (finalCropHeight > printableHeight) {
            finalCropHeight = printableHeight;
            finalCropWidth = printableHeight * cropAspect;
          }

          const xOffset = margin + (printableWidth - finalCropWidth) / 2;
          const yOffset = margin + (printableHeight - finalCropHeight) / 2;

          pdf.addImage(croppedData, "JPEG", xOffset, yOffset, finalCropWidth, finalCropHeight);

          // Add dashed border around image
          addDashedBorder(pdf, xOffset, yOffset, finalCropWidth, finalCropHeight);

          // Calculate overlap dimensions in mm on printed page
          const overlapMmX = (overlapPixelsX / cropWidth) * finalCropWidth;
          const overlapMmY = (overlapPixelsY / cropHeight) * finalCropHeight;

          // Add overlap crop marks
          if (options.overlap > 0) {
            addOverlapCropMarks(
              pdf,
              xOffset, yOffset,
              finalCropWidth, finalCropHeight,
              overlapMmX, overlapMmY,
              hasLeft, hasRight, hasTop, hasBottom
            );
          }

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
