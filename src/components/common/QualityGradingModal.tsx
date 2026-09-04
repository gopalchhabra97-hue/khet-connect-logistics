import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
  Sparkles,
  Upload,
  Camera,
} from "lucide-react";
import { qualityApi } from "@/services/api";
import type { CropQualityResult, Product } from "@/types";

interface QualityGradingModalProps {
  product: Product;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  canUpload?: boolean;
  onQualityUpdated?: (result: CropQualityResult) => void;
}

const FACTOR_MAX_SCORES = {
  freshness: 20,
  colorAppearance: 15,
  physicalDamage: 15,
  diseaseSpots: 15,
  pestDamage: 10,
  sizeUniformity: 10,
  rotDecay: 10,
  cleanliness: 5,
};

const FACTOR_LABELS: Record<keyof typeof FACTOR_MAX_SCORES, string> = {
  freshness: "Freshness & Hydration",
  colorAppearance: "Color & Visual Luster",
  physicalDamage: "Physical Damage / Cuts",
  diseaseSpots: "Disease / Surface Spots",
  pestDamage: "Pest Damage & Borer Marks",
  sizeUniformity: "Size & Dimensional Uniformity",
  rotDecay: "Rot & Tissue Decay",
  cleanliness: "Surface Cleanliness",
};

export function getGradeColor(grade: string) {
  switch (grade?.toUpperCase()) {
    case "A+":
      return "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "A":
      return "border-green-500 bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-300";
    case "B":
      return "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "C":
      return "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300";
    default:
      return "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
  }
}

export function QualityGradingModal({
  product,
  isOpen,
  onOpenChange,
  canUpload = false,
  onQualityUpdated,
}: QualityGradingModalProps) {
  const [quality, setQuality] = useState<CropQualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load existing quality on modal open
  useEffect(() => {
    if (!isOpen || !product?.id) return;

    let isMounted = true;
    setLoading(true);

    qualityApi
      .getByProductId(product.id)
      .then((res) => {
        if (isMounted) setQuality(res);
      })
      .catch((err) => {
        console.error("Failed to load crop quality:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, product?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, or WEBP)");
      return;
    }

    // Validate size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please choose a crop image to analyze");
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("product_id", product.id);
      formData.append("crop", product.name);

      const result = await qualityApi.analyze(formData);
      setQuality(result);
      if (onQualityUpdated) {
        onQualityUpdated(result);
      }
      toast.success(`Quality Assessment Complete: Grade ${result.grade} (${result.totalScore}/100)`);
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze crop quality");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Camera className="size-5 text-primary" />
                Visual Crop Quality Assessment
              </DialogTitle>
              <DialogDescription className="mt-1">
                Produce: <strong className="text-foreground">{product.name}</strong> • Seller: {product.seller}
              </DialogDescription>
            </div>
            {quality && (
              <Badge
                variant="outline"
                className={`text-sm font-bold px-3 py-1 border-2 ${getGradeColor(quality.grade)}`}
              >
                Grade {quality.grade}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Loading visual quality data...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Overall Score Header Card */}
            {quality ? (
              <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/10 shadow-inner">
                      <span className="text-3xl font-black text-primary">{quality.totalScore}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        / 100 Marks
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-foreground">
                          Grade {quality.grade} Quality
                        </h4>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 text-[11px] font-medium"
                        >
                          {quality.analysisMode === "ai" ? (
                            <>
                              <Sparkles className="size-3 text-amber-500" /> AI Vision Model
                            </>
                          ) : (
                            <>
                              <Bot className="size-3 text-blue-500" /> Demo Assessment
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Certified surface visual inspection recorded on{" "}
                        {new Date(quality.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Visual Image Thumbnail if available */}
                  {(previewUrl || quality.imageUrl) && (
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      <img
                        src={previewUrl || quality.imageUrl || ""}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Hide broken demo image gracefully
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Recommendation */}
                {quality.recommendation && (
                  <div className="mt-4 rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-foreground/90">
                    <span className="font-semibold text-primary">Inspection Advice: </span>
                    {quality.recommendation}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Info className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">No Quality Assessment Recorded Yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a clear crop photo to generate a certified 100-mark quality assessment.
                </p>
              </div>
            )}

            {/* 8 Factor Breakdown */}
            {quality && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  Visual Factors Score Breakdown (100 Marks Total)
                </h4>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(Object.keys(FACTOR_MAX_SCORES) as Array<keyof typeof FACTOR_MAX_SCORES>).map((factorKey) => {
                    const score = quality.factorScores[factorKey] ?? 0;
                    const max = FACTOR_MAX_SCORES[factorKey];
                    const percent = Math.min(100, Math.round((score / max) * 100));

                    return (
                      <div
                        key={factorKey}
                        className="rounded-lg border border-border bg-card/60 p-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-foreground">{FACTOR_LABELS[factorKey]}</span>
                          <span className="font-bold text-primary">
                            {score} <span className="text-muted-foreground font-normal">/ {max}</span>
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detected Visible Issues */}
            {quality && quality.detectedIssues && quality.detectedIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Detected Visible Surface Observations
                </h4>
                <div className="space-y-1 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  {quality.detectedIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Farmer Upload Zone (Authorized Farmers only) */}
            {canUpload && (
              <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Upload className="size-4 text-primary" />
                    {quality ? "Re-evaluate / Upload Fresh Crop Photo" : "Upload Crop Photo for Analysis"}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Max 5MB (JPEG, PNG, WEBP)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    id="crop-image-upload"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={analyzing}
                  />
                  <label
                    htmlFor="crop-image-upload"
                    className="flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-xs font-medium text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <Camera className="size-3.5" />
                    {selectedFile ? selectedFile.name : "Select Crop Image"}
                  </label>

                  <Button
                    onClick={handleAnalyze}
                    disabled={!selectedFile || analyzing}
                    size="sm"
                    className="w-full sm:w-auto gap-2"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Analyzing Visual Quality...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" />
                        Run Quality Analysis
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground italic">
                  Note: Quality scores are computed objectively by the visual assessment engine and cannot be manually edited.
                </p>
              </div>
            )}

            {/* Scientific Transparency Disclaimer */}
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
              <ShieldAlert className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p>
                <strong>Visual Quality Assessment Notice:</strong> Evaluation is conducted strictly on external visual criteria (surface discoloration, shape, bruising, fungal marks, size uniformity, and physical blemishes). Image analysis does not evaluate internal moisture content, chemical pesticide residue, or nutritional density.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
