import jsPDF from "jspdf";
import { PrintOptions } from "@/components/OptionsPanel";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PAGE_FORMATS = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
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
            
            // Calculate dimensions to fit the page
            const imgAspect = cellWidth / cellHeight;
            const pageAspect = pageWidth / pageHeight;
            
            let finalWidth = pageWidth;
            let finalHeight = pageHeight;
            
            if (imgAspect > pageAspect) {
              finalHeight = pageWidth / imgAspect;
            } else {
              finalWidth = pageHeight * imgAspect;
            }

            const xOffset = (pageWidth - finalWidth) / 2;
            const yOffset = (pageHeight - finalHeight) / 2;

            pdf.addImage(imgData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);

            // Add page number
            pdf.setFontSize(10);
            pdf.setTextColor(150);
            pdf.text(
              `Pagina ${pageIndex + 1}/${options.columns * options.rows} (Riga ${row + 1}, Col ${col + 1})`,
              pageWidth / 2,
              pageHeight - 5,
              { align: "center" }
            );

            pageIndex++;
          }
        }

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
          
          const imgAspect = cellWidth / cellHeight;
          const pageAspect = pageWidth / pageHeight;
          
          let finalWidth = pageWidth;
          let finalHeight = pageHeight;
          
          if (imgAspect > pageAspect) {
            finalHeight = pageWidth / imgAspect;
          } else {
            finalWidth = pageHeight * imgAspect;
          }

          const xOffset = (pageWidth - finalWidth) / 2;
          const yOffset = (pageHeight - finalHeight) / 2;

          pdf.addImage(croppedData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);

          pdf.setFontSize(10);
          pdf.setTextColor(150);
          pdf.text(
            `Pagina ${pageIndex + 1}/${options.columns * options.rows} (Riga ${row + 1}, Col ${col + 1})`,
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
          );

          pageIndex++;
        }
      }

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
