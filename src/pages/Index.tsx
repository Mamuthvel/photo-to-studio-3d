import { useEffect, useState } from "react";
import { ModelViewer } from "@/components/ModelViewer";
import { DropZone } from "@/components/DropZone";
import { Box, Cloud } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [previousModelUrl, setPreviousModelUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load last generated model when page opens
  useEffect(() => {
    const saved = localStorage.getItem("lastModelUrl");
    if (saved) setModelUrl(saved);

    // Listen to custom event (optional) if other pages dispatch it
    const onModelUpdated = () => {
      const fresh = localStorage.getItem("lastModelUrl");
      if (fresh) setModelUrl(fresh);
    };
    window.addEventListener("model-updated", onModelUpdated);
    return () => window.removeEventListener("model-updated", onModelUpdated);
  }, []);

  const handleFileLoaded = (url: string, name: string) => {
    setIsLoading(true);
    if (modelUrl) setPreviousModelUrl(modelUrl);

    setTimeout(() => {
      if (modelUrl && modelUrl !== url) URL.revokeObjectURL(modelUrl);
      setModelUrl(url);
      setFilename(name);
      setIsLoading(false);
    }, 300);
  };

  const handleClear = () => {
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    if (previousModelUrl) URL.revokeObjectURL(previousModelUrl);
    setModelUrl(null);
    setPreviousModelUrl(null);
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
                <p className="text-sm text-muted-foreground">Local Photogrammetry</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/multi-image-to-3d">
                <Button variant="outline" size="sm">
                  <Box className="w-4 h-4 mr-2" />
                  Multi-Image 3D
                </Button>
              </Link>
              <Link to="/cloud">
                <Button variant="outline" size="sm">
                  <Cloud className="w-4 h-4 mr-2" />
                  Kiri Image Generation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-[600px]">
            <ModelViewer
              modelUrl={modelUrl}
              previousModelUrl={previousModelUrl}
              isLoading={isLoading}
            />
          </div>

          <DropZone
            onFileLoaded={handleFileLoaded}
            currentFile={filename}
            onClear={handleClear}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Meshy and Model-viewer</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
