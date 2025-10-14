import { Upload, FileImage, FileText } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export const FileUpload = ({ onFileSelect, accept = "image/*,.pdf" }: FileUploadProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        validateAndSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        validateAndSelect(file);
      }
    },
    [onFileSelect]
  );

  const validateAndSelect = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato non supportato. Usa JPG, PNG, WEBP o PDF.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File troppo grande. Massimo 100MB.");
      return;
    }
    onFileSelect(file);
    toast.success("File caricato con successo!");
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-all duration-300 bg-card hover:shadow-[var(--shadow-soft)] cursor-pointer group"
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-gradient-to-br from-primary to-accent group-hover:scale-110 transition-transform duration-300">
          <Upload className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground mb-2">
            Trascina qui il file o clicca per selezionare
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <FileImage className="w-4 h-4" />
              Immagini (JPG, PNG, WEBP)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              PDF
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">Massimo 100MB</p>
        </div>
      </div>
    </div>
  );
};
