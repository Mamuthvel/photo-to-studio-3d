import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import { ModelLoader } from './ModelLoader';

interface ModelViewerProps {
  modelUrl: string | null;
}

export const ModelViewer = ({ modelUrl }: ModelViewerProps) => {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50 bg-[hsl(var(--viewer-bg))]">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        shadows
      >
        <color attach="background" args={['hsl(var(--viewer-bg))']} />
        
        <Suspense fallback={null}>
          <Stage
            intensity={0.5}
            environment="city"
            shadows={{ type: 'contact', opacity: 0.4, blur: 2 }}
            adjustCamera={1.2}
          >
            {modelUrl ? (
              <ModelLoader url={modelUrl} />
            ) : (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial 
                  color="hsl(var(--primary))" 
                  metalness={0.7}
                  roughness={0.2}
                />
              </mesh>
            )}
          </Stage>
          
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="hsl(var(--grid-line))"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="hsl(var(--glow))"
            fadeDistance={25}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />
          
          <Environment preset="city" />
        </Suspense>
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={20}
          makeDefault
        />
      </Canvas>
      
      {!modelUrl && (
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
