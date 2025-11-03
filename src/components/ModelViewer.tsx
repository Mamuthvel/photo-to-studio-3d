import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Play, 
  Pause,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ModelViewerProps {
  modelUrl: string | null;
  previousModelUrl?: string | null;
  isLoading?: boolean;
}

export const ModelViewer = ({ modelUrl, previousModelUrl, isLoading = false }: ModelViewerProps) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [exposure, setExposure] = useState(1);
  const [shadowIntensity, setShadowIntensity] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentModel = modelUrl || previousModelUrl;
  const shouldBlur = isLoading && previousModelUrl;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleZoomIn = () => {
    if (viewerRef.current) {
      const currentOrbit = viewerRef.current.getCameraOrbit();
      viewerRef.current.cameraOrbit = `${currentOrbit.theta}rad ${currentOrbit.phi}rad ${Math.max(0.5, currentOrbit.radius - 0.5)}m`;
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current) {
      const currentOrbit = viewerRef.current.getCameraOrbit();
      viewerRef.current.cameraOrbit = `${currentOrbit.theta}rad ${currentOrbit.phi}rad ${Math.min(10, currentOrbit.radius + 0.5)}m`;
    }
  };

  const handleReset = () => {
    if (viewerRef.current) {
      viewerRef.current.cameraOrbit = "0deg 75deg 2.5m";
      viewerRef.current.fieldOfView = "auto";
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full rounded-xl overflow-hidden border border-border/50 bg-[hsl(var(--viewer-bg))]",
        isFullscreen && "rounded-none"
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <AnimatePresence mode="wait">
        {currentModel ? (
          <motion.div
            key={currentModel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
          >
            <model-viewer
              ref={viewerRef}
              src={currentModel}
              alt="3D Model"
              auto-rotate={autoRotate}
              camera-controls
              camera-orbit="0deg 75deg 2.5m"
              min-camera-orbit="auto 0deg auto"
              max-camera-orbit="auto 90deg auto"
              style={{ 
                width: '100%', 
                height: '100%',
                filter: shouldBlur ? 'blur(8px) brightness(0.7)' : 'none',
                transition: 'filter 0.3s ease'
              }}
              exposure={exposure.toString()}
              shadow-intensity={shadowIntensity.toString()}
            />
            
            {shouldBlur && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm"
              >
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-foreground text-sm font-medium">Generating new model...</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center space-y-2">
              <div className="text-5xl">🎨</div>
              <p className="text-muted-foreground text-sm">Drop a .glb file to view</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Overlay */}
      <AnimatePresence>
        {currentModel && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 space-y-3">
              {/* Main Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomIn}
                  className="h-9 w-9"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomOut}
                  className="h-9 w-9"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-9 w-9"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  size="icon"
                  variant={autoRotate ? "default" : "ghost"}
                  onClick={() => setAutoRotate(!autoRotate)}
                  className="h-9 w-9"
                >
                  {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="h-9 w-9"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Lighting Controls */}
              <div className="space-y-2 min-w-[240px]">
                <div className="flex items-center gap-3">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[exposure]}
                    onValueChange={(value) => setExposure(value[0])}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{exposure.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[shadowIntensity]}
                    onValueChange={(value) => setShadowIntensity(value[0])}
                    min={0}
                    max={2}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{shadowIntensity.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Add model-viewer types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}
