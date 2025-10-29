import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface DropZoneProps {
  onFileLoaded: (url: string, filename: string) => void;
  currentFile: string | null;
  onClear: () => void;
}

export const DropZone = ({ onFileLoaded, currentFile, onClear }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      toast.error('Please upload a .glb file');
      return;
    }
    
    const url = URL.createObjectURL(file);
    onFileLoaded(url, file.name);
    toast.success(`Loaded ${file.name}`);
  }, [onFileLoaded]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);
  
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
        isDragging 
          ? 'border-primary bg-primary/5 scale-[1.02]' 
          : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
      }`}
    >
      <input
        type="file"
        accept=".glb"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`p-4 rounded-full transition-all duration-300 ${
          isDragging ? 'bg-primary/20' : 'bg-muted'
        }`}>
          <Upload className={`w-8 h-8 transition-colors duration-300 ${
            isDragging ? 'text-primary' : 'text-muted-foreground'
          }`} />
        </div>
        
        {currentFile ? (
          <div className="space-y-3 w-full">
            <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium truncate">{currentFile}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Drop a new file to replace
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Drop your .glb model here</p>
              <p className="text-sm text-muted-foreground">
                Or click to browse files
              </p>
            </div>
            
            <label htmlFor="file-upload">
              <Button variant="default" className="cursor-pointer" asChild>
                <span>Choose File</span>
              </Button>
            </label>
          </>
        )}
      </div>
    </div>
  );
};
