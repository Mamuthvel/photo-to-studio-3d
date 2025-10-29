import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Camera, Box, Eye, Terminal } from 'lucide-react';

export const Documentation = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          Local Processing Pipeline
        </CardTitle>
        <CardDescription>
          Generate 3D models from photos using Meshroom and Blender
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="meshroom">Meshroom</TabsTrigger>
            <TabsTrigger value="blender">Blender</TabsTrigger>
            <TabsTrigger value="viewer">Viewer</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Workflow Steps
              </h3>
              <ol className="space-y-2 text-sm ml-6 list-decimal">
                <li>Capture 20-50 photos of your object from different angles</li>
                <li>Run Meshroom photogrammetry to create 3D mesh (.obj)</li>
                <li>Convert .obj to optimized .glb using Blender</li>
                <li>Upload .glb here to view and share your 3D model</li>
              </ol>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Use good lighting and overlap each photo by 60-70% for best results
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="meshroom" className="space-y-4 pt-4">
            <div className="space-y-3">
              <h3 className="font-semibold">Install Meshroom</h3>
              <ol className="space-y-3 text-sm ml-6 list-decimal">
                <li>Download from <a href="https://alicevision.org/#meshroom" target="_blank" className="text-primary hover:underline">alicevision.org</a></li>
                <li>Extract to <code className="px-2 py-1 bg-muted rounded">C:\Tools\Meshroom</code></li>
                <li>Place photos in <code className="px-2 py-1 bg-muted rounded">photos\</code> folder</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Run Reconstruction</h3>
              <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                meshroom_photogrammetry.exe ^<br/>
                &nbsp;&nbsp;--input photos\ ^<br/>
                &nbsp;&nbsp;--output output\
              </div>
              <p className="text-xs text-muted-foreground">
                ⏱️ Processing takes 30 minutes to several hours depending on photo count
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="blender" className="space-y-4 pt-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Box className="w-4 h-4 text-accent" />
                Convert to GLB
              </h3>
              <ol className="space-y-3 text-sm ml-6 list-decimal">
                <li>Install Blender from <a href="https://www.blender.org/download/" target="_blank" className="text-primary hover:underline">blender.org</a></li>
                <li>Create Python script: <code className="px-2 py-1 bg-muted rounded">convert_to_glb.py</code></li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Python Script:</h4>
              <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`import bpy

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import OBJ
bpy.ops.wm.obj_import(
    filepath="output/texturedMesh.obj"
)

# Smooth shading
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# Export GLB
bpy.ops.export_scene.gltf(
    filepath="viewer/model.glb",
    export_format='GLB',
    use_draco_mesh_compression=True
)

print("✅ Conversion complete!")`}</pre>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Run Conversion:</h4>
              <div className="p-4 bg-muted rounded-lg font-mono text-xs">
                "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" ^<br/>
                &nbsp;&nbsp;--background --python convert_to_glb.py
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="viewer" className="space-y-4 pt-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                View Your Model
              </h3>
              <ol className="space-y-2 text-sm ml-6 list-decimal">
                <li>Upload your <code className="px-2 py-1 bg-muted rounded">model.glb</code> using drag & drop above</li>
                <li>Use mouse to rotate, scroll to zoom</li>
                <li>Share the model URL with others</li>
              </ol>
            </div>
            
            <div className="grid gap-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <strong>🖱️ Controls:</strong>
                <ul className="mt-2 space-y-1 ml-4 list-disc text-muted-foreground">
                  <li>Left-click + drag: Rotate</li>
                  <li>Right-click + drag: Pan</li>
                  <li>Scroll: Zoom in/out</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
