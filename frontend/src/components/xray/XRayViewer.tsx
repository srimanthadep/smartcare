import React, { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  ZoomIn, ZoomOut, RotateCw, Maximize2, Sun, Contrast,
  Download, Printer, X, CheckCircle, Clock, RotateCcw,
  Sparkles, AlertCircle, BrainCircuit, ScanLine,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { XRay } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface XRayViewerProps {
  xray: XRay | null;
  open: boolean;
  onClose: () => void;
  onReview?: (id: string, reviewed: boolean) => void;
  onDownload?: (xray: XRay) => void;
  onUpdate?: (updated: XRay) => void;
}

const XRayViewer: React.FC<XRayViewerProps> = ({ xray, open, onClose, onReview, onDownload, onUpdate }) => {
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!xray) return null;

  const isPdf = xray.fileUrl?.endsWith(".pdf") || xray.fileUrl?.includes("/raw/");

  const resetAdjustments = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setIsAnalyzing(false);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html><head><title>X-Ray ${xray.id}</title>
        <style>
          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          @media print { body { background: white; } }
        </style></head>
        <body><img src="${xray.fileUrl}" onload="window.print();window.close();" /></body></html>
      `);
    }
  };

  const handleAIAnalyze = async () => {
    if (!xray) return;
    
    setIsAnalyzing(true);
    toast.loading("Gemini is analyzing the X-ray...", { id: "ai-analysis" });
    
    try {
      const updated = await api.analyzeXray(xray.id);
      if (onUpdate) onUpdate(updated);
      toast.success("AI Analysis complete", { id: "ai-analysis" });
    } catch (err) {
      toast.error("AI Analysis failed. Check API key.", { id: "ai-analysis" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const aiResults = xray.annotations as any;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetAdjustments(); } }}>
      <DialogContent className="max-w-[98vw] w-full h-[98vh] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background" hideCloseButton>
        <DialogTitle className="sr-only">X-Ray Viewer - {xray.id}</DialogTitle>
        <DialogDescription className="sr-only">Detailed view and AI analysis of patient X-ray</DialogDescription>
        
        <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden">
          {/* Main viewer area */}
          <div className="relative flex-1 flex flex-col bg-black/95 overflow-hidden min-h-0 min-w-0">
            {/* Top toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-white/90 border-white/20 bg-white/5 px-2 py-0.5 text-xs font-medium">
                  {xray.type}
                </Badge>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 leading-none mb-1 uppercase tracking-tighter">ID REFERENCE</span>
                  <span className="text-xs text-white/80 font-mono leading-none">{xray.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onDownload && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => onDownload(xray)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
                <div className="mx-2 h-4 w-px bg-white/10" />
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-all"
                  onClick={() => { onClose(); resetAdjustments(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black overflow-hidden">
              <div className="absolute inset-0">
                {isPdf ? (
                  <iframe
                    src={xray.fileUrl}
                    className="w-full h-full border-0"
                    title="X-Ray PDF"
                  />
                ) : (
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={8}
                    centerOnInit
                    centerOnMount
                    wheel={{ step: 0.1 }}
                  >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                      <>
                        <TransformComponent 
                          wrapperStyle={{ width: "100%", height: "100%" }}
                          contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <img
                            src={xray.fileUrl}
                            alt={`${xray.type} X-Ray`}
                            className="max-w-[95%] max-h-[95%] object-contain shadow-[0_0_60px_rgba(0,0,0,0.7)] border border-white/5 transition-all"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease",
                            }}
                            draggable={false}
                          />
                        </TransformComponent>

                        {/* Floating Control Bar */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 border border-white/10 shadow-2xl z-30 opacity-60 hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => zoomIn()}>
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => zoomOut()}>
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <div className="mx-2 h-6 w-px bg-white/20" />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => setRotation((r) => (r + 90) % 360)}>
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => { resetTransform(); resetAdjustments(); }}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <div className="mx-2 h-6 w-px bg-white/20" />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => {
                              const el = document.querySelector('[data-viewer-fullscreen]');
                              if (el) el.requestFullscreen?.();
                            }}>
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </TransformWrapper>
                )}
              </div>
            </div>
          </div>

          {/* Right panel — metadata */}
          <div className="w-full lg:w-[380px] h-full flex flex-col border-l border-border bg-background shrink-0 overflow-hidden" data-viewer-fullscreen>
            <div className="p-5 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-primary" />
                  Image Adjustments
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sun className="h-3.5 w-3.5" />
                      <span>Brightness: {brightness}%</span>
                    </div>
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => setBrightness(v)}
                      min={20}
                      max={200}
                      step={5}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Contrast className="h-3.5 w-3.5" />
                      <span>Contrast: {contrast}%</span>
                    </div>
                    <Slider
                      value={[contrast]}
                      onValueChange={([v]) => setContrast(v)}
                      min={20}
                      max={200}
                      step={5}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* AI Analysis Button */}
              <div className="space-y-2">
                <Button 
                  onClick={handleAIAnalyze} 
                  disabled={isAnalyzing || isPdf}
                  variant="secondary" 
                  className="w-full gap-2 border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-300"
                >
                  <Sparkles className={`h-4 w-4 ${isAnalyzing ? "animate-pulse" : ""}`} />
                  {isAnalyzing ? "Gemini is Analyzing..." : "AI Clinical Review"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Powered by Gemini 3.1 Flash Vision
                </p>
              </div>

              {/* AI Results */}
              {aiResults && aiResults.findings && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <BrainCircuit className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">AI Analysis Results</span>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Findings</p>
                    <ul className="text-xs space-y-1">
                      {aiResults.findings.map((f: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {aiResults.recommendations && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Recommendations</p>
                      <ul className="text-xs space-y-1">
                        {aiResults.recommendations.map((r: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <CheckCircle className="h-3 w-3 mt-0.5 text-green-500" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        Confidence: {(aiResults.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground italic">
                      Reviewed by Gemini AI
                    </span>
                  </div>
                </motion.div>
              )}

              <div className="h-px bg-border" />

              {/* Review */}
              {onReview && (
                <div>
                  <Button
                    variant={xray.reviewed ? "outline" : "default"}
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => onReview(xray.id, !xray.reviewed)}
                  >
                    {xray.reviewed ? (
                      <><Clock className="h-4 w-4" /> Mark as Pending</>
                    ) : (
                      <><CheckCircle className="h-4 w-4" /> Mark as Reviewed</>
                    )}
                  </Button>
                  {xray.reviewed && xray.reviewedBy && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Reviewed by {xray.reviewedBy} on {xray.reviewedAt ? new Date(xray.reviewedAt).toLocaleDateString() : ""}
                    </p>
                  )}
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Metadata */}
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline">{xray.type}</Badge>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Date Taken</p>
                  <p className="text-sm">{xray.takenDate}</p>
                </div>

                {xray.toothNumbers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Teeth</p>
                    <div className="flex flex-wrap gap-1">
                      {xray.toothNumbers.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {xray.diagnosis && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Diagnosis</p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{xray.diagnosis}</p>
                  </div>
                )}

                {xray.notes && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{xray.notes}</p>
                  </div>
                )}

                {xray.tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {xray.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Uploaded By</p>
                  <p className="text-sm">{xray.uploadedBy}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Upload Date</p>
                  <p className="text-sm">{xray.createdAt ? new Date(xray.createdAt).toLocaleDateString() : ""}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default XRayViewer;
