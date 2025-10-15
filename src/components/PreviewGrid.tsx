import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface PreviewGridProps {
  imageUrl: string;
  columns: number;
  rows: number;
  pageFormat: "A4" | "A3" | "Letter";
  orientation: "portrait" | "landscape";
}

const getPageAspectRatio = (format: "A4" | "A3" | "Letter", orientation: "portrait" | "landscape"): number => {
  const formats = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    Letter: { width: 216, height: 279 },
  };
  
  const { width, height } = formats[format];
  const ratio = orientation === "portrait" ? height / width : width / height;
  return ratio;
}

export const PreviewGrid = ({ imageUrl, columns, rows, pageFormat, orientation }: PreviewGridProps) => {
  const aspectRatio = getPageAspectRatio(pageFormat, orientation);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-card to-background border-border shadow-[var(--shadow-soft)]">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
        <Eye className="w-5 h-5 text-primary" />
        Anteprima Divisione
      </h2>

      <div 
        className="relative w-full max-h-[600px] bg-muted rounded-lg overflow-hidden border border-border"
        style={{ aspectRatio: `${1 / aspectRatio}` }}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-contain"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                hsl(var(--primary) / 0.4) 0px,
                hsl(var(--primary) / 0.4) 2px,
                transparent 2px,
                transparent calc(100% / ${rows})
              ),
              repeating-linear-gradient(
                90deg,
                hsl(var(--primary) / 0.4) 0px,
                hsl(var(--primary) / 0.4) 2px,
                transparent 2px,
                transparent calc(100% / ${columns})
              )
            `,
          }}
        />
      </div>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        La griglia mostra come verrà divisa l'immagine in <span className="font-semibold text-foreground">{columns}×{rows}</span> pagine
      </p>
    </Card>
  );
};
