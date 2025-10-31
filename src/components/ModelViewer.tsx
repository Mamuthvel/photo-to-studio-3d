interface ModelViewerProps {
  modelUrl: string | null;
}

export const ModelViewer = ({ modelUrl }: ModelViewerProps) => {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50 bg-[hsl(var(--viewer-bg))]">
      {modelUrl ? (
        <model-viewer
          src={modelUrl}
          alt="3D Model"
          auto-rotate
          camera-controls
          camera-orbit="0deg 75deg 2.5m"
          min-camera-orbit="auto 60deg auto"
          max-camera-orbit="auto 90deg auto"
          style={{ width: '100%', height: '100%' }}
          exposure="1"
          shadow-intensity="1"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <div className="text-5xl">🎨</div>
            <p className="text-muted-foreground text-sm">Drop a .glb file to view</p>
          </div>
        </div>
      )}
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
