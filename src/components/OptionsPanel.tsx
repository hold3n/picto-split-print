import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid, Maximize, Ruler, RotateCcw } from "lucide-react";

export interface PrintOptions {
  columns: number;
  rows: number;
  pageFormat: "A4" | "A3" | "Letter";
  orientation: "portrait" | "landscape";
  overlap: number;
}

interface OptionsPanelProps {
  options: PrintOptions;
  onChange: (options: PrintOptions) => void;
  defaultOptions: PrintOptions | null;
  onResetToDefault: () => void;
}

export const OptionsPanel = ({ options, onChange, defaultOptions, onResetToDefault }: OptionsPanelProps) => {
  const hasChanges = defaultOptions && (
    options.columns !== defaultOptions.columns ||
    options.rows !== defaultOptions.rows ||
    options.orientation !== defaultOptions.orientation ||
    options.pageFormat !== defaultOptions.pageFormat
  );

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-background border-border shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Grid className="w-5 h-5 text-primary" />
          Opzioni di Stampa
        </h2>
        {hasChanges && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetToDefault}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Default
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="columns" className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="w-4 h-4 text-accent" />
              Colonne
            </Label>
            <Input
              id="columns"
              type="number"
              min="1"
              max="10"
              value={options.columns}
              onChange={(e) => onChange({ ...options, columns: parseInt(e.target.value) || 1 })}
              className="bg-background border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rows" className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="w-4 h-4 text-accent" />
              Righe
            </Label>
            <Input
              id="rows"
              type="number"
              min="1"
              max="10"
              value={options.rows}
              onChange={(e) => onChange({ ...options, rows: parseInt(e.target.value) || 1 })}
              className="bg-background border-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="format" className="flex items-center gap-2 text-sm font-medium">
            <Maximize className="w-4 h-4 text-accent" />
            Formato Pagina
          </Label>
          <Select value={options.pageFormat} onValueChange={(value: any) => onChange({ ...options, pageFormat: value })}>
            <SelectTrigger id="format" className="bg-background border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
              <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
              <SelectItem value="Letter">Letter (216 × 279 mm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orientation" className="text-sm font-medium">
            Orientamento
          </Label>
          <Select value={options.orientation} onValueChange={(value: any) => onChange({ ...options, orientation: value })}>
            <SelectTrigger id="orientation" className="bg-background border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Verticale</SelectItem>
              <SelectItem value="landscape">Orizzontale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="overlap" className="text-sm font-medium">
            Sovrapposizione (mm) - per assemblaggio
          </Label>
          <Input
            id="overlap"
            type="number"
            min="0"
            max="50"
            step="5"
            value={options.overlap}
            onChange={(e) => onChange({ ...options, overlap: parseInt(e.target.value) || 0 })}
            className="bg-background border-input"
          />
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pagine totali:</span>
            <span className="font-bold text-lg text-primary">{options.columns * options.rows}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
