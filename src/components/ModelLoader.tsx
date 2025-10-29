import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';

interface ModelLoaderProps {
  url: string;
}

export const ModelLoader = ({ url }: ModelLoaderProps) => {
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    // Center and normalize the model
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);
  
  return <primitive object={scene} />;
};
