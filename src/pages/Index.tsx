import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { OptionsPanel, PrintOptions } from "@/components/OptionsPanel";
import { PreviewGrid } from "@/components/PreviewGrid";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { generatePosterPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker - v3 compatibility
const pdfjsVersion = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<PrintOptions>({
    columns: 2,
    rows: 2,
    pageFormat: "A4",
    orientation: "portrait",
    overlap: 10,
  });

  const calculateOptimalGrid = (imageWidth: number, imageHeight: number, pageFormat: string) => {
    const formats = {
      A4: { width: 210, height: 297 },
      A3: { width: 297, height: 420 },
      Letter: { width: 216, height: 279 },
    };
    
    // Determine optimal orientation based on image aspect ratio
    const imageAspect = imageWidth / imageHeight;
    const optimalOrientation: "portrait" | "landscape" = imageAspect > 1 ? "landscape" : "portrait";
    
    const format = formats[pageFormat as keyof typeof formats];
    const pageWidth = optimalOrientation === "portrait" ? format.width : format.height;
    const pageHeight = optimalOrientation === "portrait" ? format.height : format.width;
    
    // Calculate aspect ratios
    const pageAspect = pageWidth / pageHeight;
    
    // Calculate optimal columns and rows
    let columns = 1;
    let rows = 1;
    
    if (imageAspect > pageAspect) {
      // Image is wider, prioritize columns
      columns = Math.ceil(imageWidth / (imageHeight * pageAspect));
      rows = Math.max(1, Math.ceil(columns / imageAspect));
    } else {
      // Image is taller, prioritize rows
      rows = Math.ceil(imageHeight / (imageWidth / pageAspect));
      columns = Math.max(1, Math.ceil(rows * imageAspect));
    }
    
    // Limit to reasonable values
    columns = Math.min(10, Math.max(1, columns));
    rows = Math.min(10, Math.max(1, rows));
    
    return { columns, rows, orientation: optimalOrientation };
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    // If it's a PDF, render it to canvas first for preview
    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        
        // Render at higher scale for better quality
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        // Convert canvas to data URL for preview
        const imageUrl = canvas.toDataURL("image/jpeg", 0.95);
        setPreviewUrl(imageUrl);
        
        // Calculate optimal grid based on PDF dimensions
        const { columns, rows, orientation } = calculateOptimalGrid(
          viewport.width,
          viewport.height,
          options.pageFormat
        );
        setOptions(prev => ({ ...prev, columns, rows, orientation }));
        
        toast.success("PDF caricato e renderizzato per l'anteprima!");
      } catch (error) {
        console.error("Errore nel rendering del PDF:", error);
        toast.error("Errore nel caricamento del PDF");
      }
    } else {
      // For images, load and get dimensions
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal grid based on image dimensions
        const { columns, rows, orientation } = calculateOptimalGrid(
          img.width,
          img.height,
          options.pageFormat
        );
        setOptions(prev => ({ ...prev, columns, rows, orientation }));
        toast.success("Immagine caricata con griglia ottimale!");
      };
      
      img.src = url;
      setPreviewUrl(url);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error("Seleziona prima un file!");
      return;
    }

    setIsGenerating(true);
    try {
      const pdfBlob = await generatePosterPDF(selectedFile, options);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-${options.columns}x${options.rows}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("PDF generato con successo!");
    } catch (error) {
      console.error("Errore nella generazione:", error);
      toast.error("Errore durante la generazione del PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary to-accent">
            <Printer className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Poster Printer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trasforma immagini e PDF di grandi dimensioni in poster stampabili divisi su più pagine
          </p>
        </header>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Upload & Options */}
          <div className="space-y-6">
            <FileUpload onFileSelect={handleFileSelect} />
            {selectedFile && <OptionsPanel options={options} onChange={setOptions} />}
          </div>

          {/* Right Column - Preview */}
          <div>
            {previewUrl ? (
              <PreviewGrid
                imageUrl={previewUrl}
                columns={options.columns}
                rows={options.rows}
                pageFormat={options.pageFormat}
                orientation={options.orientation}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-card">
                <p className="text-muted-foreground text-center">
                  Carica un file per vedere l'anteprima della divisione
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        {selectedFile && (
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-[var(--shadow-strong)]"
            >
              <Download className="w-5 h-5 mr-2" />
              {isGenerating ? "Generazione in corso..." : "Genera PDF Stampabile"}
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 p-6 bg-card rounded-lg border border-border shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold mb-4 text-foreground">Come utilizzare:</h2>
          <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
            <li>Carica un'immagine (JPG, PNG, WEBP) o un PDF di grandi dimensioni</li>
            <li>Configura il numero di colonne e righe per dividere l'immagine</li>
            <li>Scegli il formato di pagina (A4, A3, Letter) e l'orientamento</li>
            <li>Imposta la sovrapposizione per facilitare l'assemblaggio delle pagine</li>
            <li>Genera e scarica il PDF pronto per la stampa</li>
            <li>Stampa tutte le pagine e assembla il poster seguendo i numeri di pagina</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Index;
