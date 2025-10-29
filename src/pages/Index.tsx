import { useState } from 'react';
import { ModelViewer } from '@/components/ModelViewer';
import { DropZone } from '@/components/DropZone';
import { Documentation } from '@/components/Documentation';
import { Box, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  
  const handleFileLoaded = (url: string, name: string) => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    setModelUrl(url);
    setFilename(name);
  };
  
  const handleClear = () => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    setModelUrl(null);
    setFilename(null);
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Box className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Photo3D Studio</h1>
                <p className="text-sm text-muted-foreground">Local Photogrammetry Pipeline</p>
              </div>
            </div>
            <Link to="/cloud">
              <Button variant="outline" size="sm">
                <Cloud className="w-4 h-4 mr-2" />
                Cloud Pipeline
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Left Column - Viewer */}
          <div className="space-y-6">
            <div className="h-[600px]">
              <ModelViewer modelUrl={modelUrl} />
            </div>
            
            <DropZone 
              onFileLoaded={handleFileLoaded}
              currentFile={filename}
              onClear={handleClear}
            />
          </div>
          
          {/* Right Column - Documentation */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Documentation />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Meshroom, Blender & Three.js</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
