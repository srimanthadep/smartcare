import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { XRay } from "@/types";

interface XRayCompareViewerProps {
  xrays: XRay[];
  open: boolean;
  onClose: () => void;
}

const XRayCompareViewer: React.FC<XRayCompareViewerProps> = ({ xrays, open, onClose }) => {
  const [leftIndex] = useState(0);
  const [rightIndex] = useState(1);

  if (xrays.length < 2) return null;

  const leftXray = xrays[leftIndex];
  const rightXray = xrays[rightIndex];

  const renderPanel = (xray: XRay, label: string) => (
    <div className="flex-1 flex flex-col min-w-0 border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{label}</Badge>
          <Badge variant="outline" className="text-[10px]">{xray.type}</Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">{xray.takenDate}</span>
      </div>
      <div className="flex-1 bg-black/95 flex items-center justify-center min-h-[300px]">
        <TransformWrapper initialScale={1} minScale={0.3} maxScale={6} centerOnInit>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full !flex !items-center !justify-center">
                <img
                  src={xray.fileUrl}
                  alt={`${xray.type} X-Ray`}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </TransformComponent>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1 border border-white/10">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => zoomIn()}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => zoomOut()}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => resetTransform()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
      {xray.diagnosis && (
        <div className="px-3 py-2 bg-secondary/10 border-t border-border/50">
          <p className="text-xs text-muted-foreground truncate">{xray.diagnosis}</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle>Compare X-Rays</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 h-[70vh]">
          {renderPanel(leftXray, "Before")}
          {renderPanel(rightXray, "After")}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default XRayCompareViewer;
