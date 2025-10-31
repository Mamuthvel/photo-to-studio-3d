import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const MESHY_API_KEY = 'msy_BvyXLyq5Qg12HJF4RCdx7Fqs3yPKRBSZ2s8w'; // TODO: Move to backend
const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v1';

type ProcessingStep = 'idle' | 'uploading' | 'sending' | 'processing' | 'downloading' | 'complete' | 'failed';

export default function Generate3DImage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error("Please select a JPG or PNG image");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

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
    
    const maxAttempts = 120; // Poll for up to 20 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${MESHY_BASE_URL}/image-to-3d/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${MESHY_API_KEY}`,
          },
        });

        const result = await response.json();
        
        if (result.status === 'SUCCEEDED') {
          setProgress(90);
          await downloadModel(result.model_urls.glb);
          return;
        } else if (result.status === 'FAILED') {
          setCurrentStep('failed');
          setFailureReason(result.error || "Model generation failed");
          throw new Error(result.error || "Generation failed");
        }

        // Update progress based on status
        if (result.status === 'IN_PROGRESS') {
          const progressPercent = Math.min(50 + (attempts * 0.5), 85);
          setProgress(progressPercent);
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
      setProgress(95);

      setModelUrl(glbUrl);
      setProgress(100);
      setCurrentStep('complete');
      setEstimatedTime('');
      
      toast.success("Your 3D model is ready to view!");
    } catch (error) {
      throw error;
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('uploading');
    setFailureReason(null);
    setEstimatedTime('Preparing image...');

    try {
      // Convert image to base64
      const base64Image = await convertToBase64(selectedImage);
      setProgress(20);

      setCurrentStep('sending');
      setEstimatedTime('Sending to Meshy AI...');

      // Create Image to 3D task
      const response = await fetch(`${MESHY_BASE_URL}/image-to-3d`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MESHY_API_KEY}`,
        },
        body: JSON.stringify({
          image_url: base64Image,
          ai_model: 'meshy-5',
          topology: 'triangle',
          target_polycount: 30000,
          enable_pbr: true,
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

  const getStepStatus = (step: ProcessingStep): 'pending' | 'active' | 'complete' | 'failed' => {
    const steps: ProcessingStep[] = ['uploading', 'sending', 'processing', 'downloading', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (currentStep === 'failed') return step === currentStep ? 'failed' : 'pending';
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const ProcessingStep = ({ 
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
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-glow to-primary bg-clip-text text-transparent">
            Generate 3D from Image
          </h1>
          <p className="text-muted-foreground">Transform a single image into a complete 3D model using Meshy AI</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Upload & Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Image</CardTitle>
                <CardDescription>
                  Select a JPG or PNG image to generate a 3D model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to select an image
                        </p>
                      </>
                    )}
                  </label>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={!selectedImage || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Generate 3D Model'
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
                    <ProcessingStep step="uploading" label="Preparing Image" icon={Upload} />
                    <ProcessingStep step="sending" label="Sending to Meshy AI" icon={Upload} />
                    <ProcessingStep step="processing" label="Generating 3D Model" icon={Loader2} />
                    <ProcessingStep step="downloading" label="Finalizing Model" icon={CheckCircle2} />
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
                      <p className="text-sm text-center text-muted-foreground">
                        {Math.round(progress)}% complete
                      </p>
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
                  <li>• High-quality 3D model generation</li>
                  <li>• PBR materials and textures</li>
                  <li>• Optimized 30K polygon count</li>
                  <li>• Processing time: 5-10 minutes</li>
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
                        Upload an image to generate a 3D model
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
