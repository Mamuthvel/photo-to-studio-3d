import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Loader2, CheckCircle2, XCircle, Clock, Download, Image as ImageIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const MESHY_API_KEY = 'msy_5EgIin5cwzjgz48rlA7cCtEw5MnXfRYn88pS';
const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v1';

type ProcessingStep = 'idle' | 'uploading' | 'sending' | 'processing' | 'downloading' | 'complete' | 'failed';
type AngleType = 'front' | 'side' | 'back' | 'top';

interface ImageSlot {
  angle: AngleType;
  label: string;
  file: File | null;
  preview: string | null;
}

export default function MultiImageTo3D() {
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([
    { angle: 'front', label: 'Front View', file: null, preview: null },
    { angle: 'side', label: 'Side View', file: null, preview: null },
    { angle: 'back', label: 'Back View', file: null, preview: null },
    { angle: 'top', label: 'Top View', file: null, preview: null },
  ]);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [useV6, setUseV6] = useState(true); // Default to Meshy v6

  const handleImageSelect = (angle: AngleType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error("Please select only JPG or PNG images");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSlots(prev => prev.map(slot => 
        slot.angle === angle 
          ? { ...slot, file, preview: event.target?.result as string }
          : slot
      ));
      
      const slotLabel = imageSlots.find(s => s.angle === angle)?.label;
      toast.success(`${slotLabel} image added`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (angle: AngleType) => {
    setImageSlots(prev => prev.map(slot => 
      slot.angle === angle 
        ? { ...slot, file: null, preview: null }
        : slot
    ));
  };

  const getUploadedCount = () => imageSlots.filter(slot => slot.file !== null).length;

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const pollTaskStatus = async (taskId: string) => {
    setCurrentStep('processing');
    setEstimatedTime('~5-10 minutes');
    setProgressMessage('Starting generation...');
    
    const maxAttempts = 120; // Poll for up to 20 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${MESHY_BASE_URL}/multi-image-to-3d/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${MESHY_API_KEY}`,
          },
        });

        const result = await response.json();
        
        if (result.status === 'SUCCEEDED') {
          setProgress(90);
          setProgressMessage('Generation complete!');
          await downloadModel(result.model_urls.glb);
          return;
        } else if (result.status === 'FAILED') {
          setCurrentStep('failed');
          setFailureReason(result.task_error?.message || "Model generation failed");
          throw new Error(result.task_error?.message || "Generation failed");
        }

        // Update progress based on status and progress field
        if (result.status === 'IN_PROGRESS' || result.status === 'PENDING') {
          const apiProgress = result.progress || 0;
          const baseProgress = 30;
          const progressPercent = Math.min(baseProgress + (apiProgress * 0.6), 85);
          setProgress(progressPercent);
          
          // Update progress message based on stage
          if (apiProgress < 30) {
            setProgressMessage('Remeshing model...');
          } else if (apiProgress < 70) {
            setProgressMessage('Texturing model...');
          } else {
            setProgressMessage('Finalizing details...');
          }
        }

        const remainingTime = Math.max(1, Math.ceil((maxAttempts - attempts) * 10 / 60));
        setEstimatedTime(`~${remainingTime} minutes remaining`);

        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
        attempts++;
      } catch (error) {
        console.error("Error polling status:", error);
        throw error;
      }
    }

    setCurrentStep('failed');
    setFailureReason("Processing timed out. Please try again.");
    throw new Error("Timeout");
  };

  const downloadModel = async (glbUrl: string) => {
    try {
      setCurrentStep('downloading');
      setEstimatedTime('Downloading model...');
      setProgressMessage('Model ready!');
      setProgress(95);

      setModelUrl(glbUrl);
      setProgress(100);
      setCurrentStep('complete');
      setEstimatedTime('');
      
      toast.success("Your 3D model is ready!");
    } catch (error) {
      throw error;
    }
  };

  const handleGenerate = async () => {
    const uploadedImages = imageSlots.filter(slot => slot.file !== null);
    
    if (uploadedImages.length === 0) {
      toast.error("Please upload at least 1 image (2-4 images recommended for best results)");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('uploading');
    setFailureReason(null);
    setEstimatedTime('Preparing images...');
    setProgressMessage('Converting images...');

    try {
      // Convert all uploaded images to base64
      const base64Images = await Promise.all(
        uploadedImages.map(slot => convertToBase64(slot.file!))
      );
      setProgress(20);

      setCurrentStep('sending');
      setEstimatedTime('Sending to Meshy AI...');
      setProgressMessage('Uploading to Meshy AI...');

      // Create Multi-Image to 3D task
      const response = await fetch(`${MESHY_BASE_URL}/multi-image-to-3d`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MESHY_API_KEY}`,
        },
        body: JSON.stringify({
          image_urls: base64Images,
          should_remesh: true,
          should_texture: true,
          enable_pbr: true,
          ai_model: useV6 ? 'meshy-6' : 'meshy-5',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setCurrentStep('failed');
        setFailureReason(errorData.message || "Failed to start generation");
        throw new Error(errorData.message || "Failed to create task");
      }

      const result = await response.json();
      setTaskId(result.result);
      setProgress(30);

      toast.success("Processing started! This may take 5-10 minutes.");
      
      // Start polling for status
      await pollTaskStatus(result.result);
    } catch (error) {
      console.error("Generation error:", error);
      setCurrentStep('failed');
      if (!failureReason) {
        setFailureReason(error instanceof Error ? error.message : "Unknown error occurred");
      }
      toast.error("Failed to generate 3D model");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (modelUrl) {
      window.open(modelUrl, '_blank');
    }
  };

  const getStepStatus = (step: ProcessingStep): 'pending' | 'active' | 'complete' | 'failed' => {
    const steps: ProcessingStep[] = ['uploading', 'sending', 'processing', 'downloading', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (currentStep === 'failed') return step === currentStep ? 'failed' : 'pending';
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const ProcessingStepComponent = ({ 
    step, 
    label, 
    icon: Icon 
  }: { 
    step: ProcessingStep; 
    label: string; 
    icon: any;
  }) => {
    const status = getStepStatus(step);
    
    return (
      <div className="flex items-center gap-3">
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full border-2
          ${status === 'complete' ? 'bg-primary border-primary' : ''}
          ${status === 'active' ? 'border-primary animate-pulse' : ''}
          ${status === 'failed' ? 'border-destructive' : ''}
          ${status === 'pending' ? 'border-muted' : ''}
        `}>
          {status === 'complete' && <CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
          {status === 'active' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
          {status === 'failed' && <XCircle className="w-5 h-5 text-destructive" />}
          {status === 'pending' && <Icon className="w-5 h-5 text-muted-foreground" />}
        </div>
        <span className={`
          text-sm font-medium
          ${status === 'complete' ? 'text-primary' : ''}
          ${status === 'active' ? 'text-foreground' : ''}
          ${status === 'failed' ? 'text-destructive' : ''}
          ${status === 'pending' ? 'text-muted-foreground' : ''}
        `}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-glow to-primary bg-clip-text text-transparent">
              Multi-Image to 3D
            </h1>
            <p className="text-muted-foreground">Upload 1-4 images of an object from different angles to create a 3D model</p>
          </div>
          <Link to="/">
            <Button variant="outline">
              Back to Home
            </Button>
          </Link>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Upload & Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Images</CardTitle>
                <CardDescription>
                  Upload 1-4 images of the same object from different angles for best results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Model Version Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="model-version" className="text-sm font-medium">
                      AI Model Version
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {useV6 ? 'Meshy v6 (Latest, Better Quality)' : 'Meshy v5 (Faster)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="model-version" className="text-sm text-muted-foreground">
                      v5
                    </Label>
                    <Switch
                      id="model-version"
                      checked={useV6}
                      onCheckedChange={setUseV6}
                      disabled={isProcessing}
                    />
                    <Label htmlFor="model-version" className="text-sm font-medium">
                      v6
                    </Label>
                  </div>
                </div>
                {/* Multi-view Upload Slots */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Multi-view</h3>
                    <span className="text-xs text-muted-foreground">
                      {getUploadedCount()}/4 images
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {imageSlots.map((slot) => (
                      <div key={slot.angle} className="space-y-2">
                        <label className="text-xs text-muted-foreground">{slot.label}</label>
                        <div className="relative aspect-square border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                          {slot.preview ? (
                            <>
                              <img 
                                src={slot.preview} 
                                alt={slot.label}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => handleRemoveImage(slot.angle)}
                                disabled={isProcessing}
                                className="absolute top-2 right-2 p-1 bg-background/80 hover:bg-background rounded-full transition-colors disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={(e) => handleImageSelect(slot.angle, e)}
                                className="hidden"
                                id={`upload-${slot.angle}`}
                                disabled={isProcessing}
                              />
                              <label 
                                htmlFor={`upload-${slot.angle}`}
                                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                              >
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                <span className="text-xs text-muted-foreground">Upload</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 Tip: Upload at least 2 images from different angles for better 3D reconstruction
                  </p>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={getUploadedCount() === 0 || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Generate 3D Model ({getUploadedCount()} images)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Processing Progress */}
            {(isProcessing || currentStep === 'complete' || currentStep === 'failed') && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Status</CardTitle>
                  {taskId && (
                    <CardDescription className="font-mono text-xs">
                      Task ID: {taskId}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <ProcessingStepComponent step="uploading" label="Preparing Images" icon={Upload} />
                    <ProcessingStepComponent step="sending" label="Sending to Meshy AI" icon={Upload} />
                    <ProcessingStepComponent step="processing" label="Generating 3D Model" icon={Loader2} />
                    <ProcessingStepComponent step="downloading" label="Finalizing Model" icon={CheckCircle2} />
                    {currentStep === 'complete' && (
                      <div className="flex items-center gap-3 text-primary">
                        <CheckCircle2 className="w-8 h-8" />
                        <span className="text-sm font-medium">Generation Complete!</span>
                      </div>
                    )}
                    {currentStep === 'failed' && (
                      <div className="flex items-center gap-3 text-destructive">
                        <XCircle className="w-8 h-8" />
                        <span className="text-sm font-medium">Generation Failed</span>
                      </div>
                    )}
                  </div>

                  {isProcessing && (
                    <>
                      <Progress value={progress} className="w-full" />
                      <div className="space-y-2">
                        <p className="text-sm text-center text-muted-foreground">
                          {Math.round(progress)}% complete
                        </p>
                        {progressMessage && (
                          <p className="text-sm text-center text-foreground font-medium">
                            {progressMessage}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {estimatedTime && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{estimatedTime}</span>
                    </div>
                  )}

                  {failureReason && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive font-medium mb-1">Error:</p>
                      <p className="text-sm text-destructive/80">{failureReason}</p>
                    </div>
                  )}

                  {currentStep === 'complete' && modelUrl && (
                    <Button 
                      onClick={handleDownload}
                      className="w-full"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download GLB File
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-primary">✨</span>
                  Powered by Meshy AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Multi-angle reconstruction</li>
                  <li>• High-quality PBR textures</li>
                  <li>• Automatic remeshing</li>
                  <li>• Processing time: 5-10 minutes</li>
                  <li>• Best with 2-4 images from different angles</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 3D Viewer */}
          <div className="space-y-6">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>3D Model Preview</CardTitle>
                <CardDescription>
                  Your generated model will appear here
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-5rem)]">
                {modelUrl ? (
                  <model-viewer
                    src={modelUrl}
                    alt="Generated 3D Model"
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
                  <div className="h-full flex items-center justify-center border border-border rounded-lg bg-muted/20">
                    <div className="text-center space-y-2">
                      <div className="text-5xl">🎨</div>
                      <p className="text-muted-foreground text-sm">
                        Upload 1-4 images to generate a 3D model
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add model-viewer types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}
