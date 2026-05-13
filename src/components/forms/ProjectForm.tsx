"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Palette, Zap, Video, Printer,
  Plus, X, Loader2, Check, ChevronRight, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isRedirectError } from "next/dist/client/components/redirect";
import {
  ProjectFormSchema,
  type ProjectFormData,
} from "@/lib/schemas/projects";
import { createProject, updateProject } from "@/lib/actions/projects";

// ─── Tipi ─────────────────────────────────────────────────────

interface ProjectFormProps {
  mode:           "create" | "edit";
  projectId?:     string;
  defaultValues?: Partial<ProjectFormData>;
}

// ─── Koraki wizarda ───────────────────────────────────────────

const STEPS = [
  { id: "general",  label: "Splošno",  icon: Settings },
  { id: "branding", label: "Branding", icon: Palette  },
  { id: "features", label: "Funkcije", icon: Zap      },
  { id: "ai",       label: "AI Video", icon: Video    },
  { id: "print",    label: "Tisk",     icon: Printer  },
] as const;

// Polja za validacijo po korakih
const STEP_FIELDS: Record<number, (keyof ProjectFormData | `${keyof ProjectFormData}.${string}`)[]> = {
  0: ["general.naziv", "general.slug", "general.narocnik", "general.opis"],
  1: ["branding.primaryColor", "branding.logoUrl", "branding.font"],
  2: [],
  3: ["ai.aiModel", "ai.maxGenSeconds", "ai.emotionalStyles"],
  4: ["print.dpi", "print.format", "print.headerText", "print.footerText"],
};

// ─── Konstante ────────────────────────────────────────────────

const AI_MODELS = [
  { value: "RUNWAY_GEN3", label: "Runway Gen-3",       desc: "Najboljša kvaliteta" },
  { value: "KLING_V2",    label: "Kling v2",           desc: "Hiter & poceni" },
  { value: "KLING_V1",    label: "Kling v1",           desc: "Stabilna verzija" },
  { value: "LUMA_DREAM",  label: "Luma Dream Machine", desc: "Realistično gibanje" },
  { value: "PIKA_V2",     label: "Pika v2",            desc: "Kreativni efekti" },
] as const;

const FONTS = [
  { value: "geist",    label: "Geist Sans"       },
  { value: "playfair", label: "Playfair Display" },
  { value: "syne",     label: "Syne"             },
] as const;

const DEFAULT_STYLES = ["Dramatično", "Igriva", "Elegantno", "Nostalgično", "Energično"];

const DEFAULT_FORM: ProjectFormData = {
  general:  { naziv: "", slug: "", narocnik: "", opis: "" },
  branding: { primaryColor: "#FFB020", logoUrl: "", logoPublicId: "", font: "geist" },
  features: { enablePhoto: true, enableVideo: true, enablePrint: false, enableQR: false },
  ai:       { aiModel: "RUNWAY_GEN3", maxGenSeconds: 60, emotionalStyles: ["Dramatično"] },
  print:    { dpi: "300", format: "4x6", headerText: "", footerText: "" },
};

// ─── Komponenta ───────────────────────────────────────────────

export function ProjectForm({ mode, projectId, defaultValues }: ProjectFormProps) {
  const router = useRouter();
  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [customStyle, setCustomStyle] = useState("");
  const [emotionalStyles, setEmotional] = useState<string[]>(
    defaultValues?.ai?.emotionalStyles ?? ["Dramatično"]
  );

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: { ...DEFAULT_FORM, ...defaultValues },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const isLastStep = step === STEPS.length - 1;

  // Auto-slug iz naziva
  const generateSlug = (val: string) =>
    val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);

  const nazivValue = watch("general.naziv");
  useEffect(() => {
    setValue("general.slug", generateSlug(nazivValue ?? ""));
  }, [nazivValue]);

  // ─── Korak naprej — validira samo trenutni korak ──────────────

  const nextStep = async () => {
    const fields = STEP_FIELDS[step] as Parameters<typeof trigger>[0];
    const valid = fields && fields.length > 0 ? await trigger(fields) : true;
    if (valid) setStep((s) => s + 1);
  };

  // ─── Submit ──────────────────────────────────────────────────

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    try {
      const payload = { ...data, ai: { ...data.ai, emotionalStyles } };
      if (mode === "create") {
        await createProject(payload);
      } else if (projectId) {
        await updateProject(projectId, payload);
      }
    } catch (error) {
      if (isRedirectError(error)) throw error;
      setLoading(false);
    }
  };

  // ─── Emotional styles helpers ────────────────────────────────

  const toggleStyle = (style: string) => {
    setEmotional((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const addCustomStyle = () => {
    const trimmed = customStyle.trim();
    if (trimmed && !emotionalStyles.includes(trimmed)) {
      setEmotional((prev) => [...prev, trimmed]);
      setCustomStyle("");
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* ── Progress indikator ──────────────────────────────── */}
      <div className="flex items-center gap-0">
        {STEPS.map(({ id, label, icon: Icon }, i) => (
          <div key={id} className="flex items-center flex-1 last:flex-none">
            {/* Korak */}
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex flex-col items-center gap-1.5 group",
                i < step ? "cursor-pointer" : "cursor-default pointer-events-none"
              )}
            >
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all",
                i < step  && "bg-gold border-gold text-black",
                i === step && "bg-gold/10 border-gold text-gold",
                i > step  && "bg-background-elevated border-ink-ghost text-ink-faint"
              )}>
                {i < step
                  ? <Check className="h-4 w-4" />
                  : <Icon className="h-4 w-4" />
                }
              </div>
              <span className={cn(
                "text-[11px] font-medium whitespace-nowrap",
                i === step ? "text-gold" : i < step ? "text-ink-muted" : "text-ink-faint"
              )}>
                {label}
              </span>
            </button>

            {/* Linija med koraki */}
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 mt-[-14px] rounded-full transition-all",
                i < step ? "bg-gold" : "bg-ink-ghost"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* ── Vsebina koraka ──────────────────────────────────── */}
      <div className="min-h-[320px]">

        {/* KORAK 1: Splošno */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="naziv">Naziv projekta <span className="text-destructive">*</span></Label>
              <Input
                id="naziv"
                {...register("general.naziv")}
                placeholder="npr. Pepsi Summer Campaign"
                className="bg-background-elevated border-ink-ghost"
              />
              {errors.general?.naziv && (
                <p className="text-xs text-destructive">{errors.general.naziv.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (URL)</Label>
              <div className="flex items-center">
                <span className="px-3 h-9 flex items-center text-sm text-ink-muted bg-background-elevated border border-r-0 border-ink-ghost rounded-l-lg shrink-0">
                  /kiosk/
                </span>
                <Input
                  id="slug"
                  {...register("general.slug")}
                  className="bg-background-elevated border-ink-ghost rounded-l-none font-mono text-sm"
                />
              </div>
              {errors.general?.slug && (
                <p className="text-xs text-destructive">{errors.general.slug.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="narocnik">Naročnik <span className="text-destructive">*</span></Label>
              <Input
                id="narocnik"
                {...register("general.narocnik")}
                placeholder="npr. Pepsi Co"
                className="bg-background-elevated border-ink-ghost"
              />
              {errors.general?.narocnik && (
                <p className="text-xs text-destructive">{errors.general.narocnik.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="opis">Opis (neobvezno)</Label>
              <Textarea
                id="opis"
                {...register("general.opis")}
                placeholder="Kratek opis projekta..."
                rows={3}
                className="bg-background-elevated border-ink-ghost resize-none"
              />
            </div>
          </div>
        )}

        {/* KORAK 2: Branding */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Primarna barva</Label>
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-lg border border-ink-ghost cursor-pointer overflow-hidden shrink-0"
                  style={{ backgroundColor: watch("branding.primaryColor") }}
                >
                  <input
                    type="color"
                    value={watch("branding.primaryColor")}
                    onChange={(e) => setValue("branding.primaryColor", e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <Input
                  {...register("branding.primaryColor")}
                  placeholder="#FFB020"
                  className="bg-background-elevated border-ink-ghost font-mono w-36"
                />
                <span className="text-xs text-ink-muted">Klikni kvadrat za barvni izbirnik</span>
              </div>
              {errors.branding?.primaryColor && (
                <p className="text-xs text-destructive">{errors.branding.primaryColor.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Logo URL (Cloudinary)</Label>
              <Input
                {...register("branding.logoUrl")}
                placeholder="https://res.cloudinary.com/..."
                className="bg-background-elevated border-ink-ghost"
              />
              <p className="text-xs text-ink-muted">Naloži logo v Cloudinary in prilepi URL</p>
              {errors.branding?.logoUrl && (
                <p className="text-xs text-destructive">{errors.branding.logoUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Pisava</Label>
              <div className="grid grid-cols-3 gap-3">
                {FONTS.map(({ value, label }) => {
                  const selected = watch("branding.font") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue("branding.font", value as "geist" | "playfair" | "syne")}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        selected
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-ink-ghost bg-background-elevated text-ink-muted hover:border-ink-faint"
                      )}
                    >
                      <div className="text-2xl mb-1 font-bold">Aa</div>
                      <div className="text-xs">{label}</div>
                      {selected && <Check className="h-3 w-3 mt-1 text-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* KORAK 3: Funkcije */}
        {step === 2 && (
          <div className="space-y-3">
            {[
              { field: "enablePhoto" as const, label: "Fotografiranje",  desc: "Omogoči zajem fotografij na kiosku" },
              { field: "enableVideo" as const, label: "AI Video",        desc: "Generiranje personaliziranih videov z AI" },
              { field: "enablePrint" as const, label: "Tiskanje",        desc: "Neposredno tiskanje fotografij na kiosku" },
              { field: "enableQR"    as const, label: "QR distribucija", desc: "Deljenje videa z QR kodo" },
            ].map(({ field, label, desc }) => (
              <div
                key={field}
                className="flex items-center justify-between p-4 rounded-xl bg-background-elevated border border-ink-ghost"
              >
                <div>
                  <div className="text-sm font-medium text-ink">{label}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{desc}</div>
                </div>
                <Switch
                  checked={watch(`features.${field}`)}
                  onCheckedChange={(v) => setValue(`features.${field}`, v)}
                  className="data-[state=checked]:bg-gold"
                />
              </div>
            ))}
          </div>
        )}

        {/* KORAK 4: AI Video */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>AI Model</Label>
              <div className="grid gap-2">
                {AI_MODELS.map(({ value, label, desc }) => {
                  const selected = watch("ai.aiModel") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue("ai.aiModel", value)}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl border text-left transition-all",
                        selected
                          ? "border-gold bg-gold/10"
                          : "border-ink-ghost bg-background-elevated hover:border-ink-faint"
                      )}
                    >
                      <div>
                        <span className={cn("text-sm font-medium", selected ? "text-gold" : "text-ink")}>
                          {label}
                        </span>
                        <span className="text-xs text-ink-muted ml-2">{desc}</span>
                      </div>
                      {selected && <Check className="h-4 w-4 text-gold shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Max čas generiranja (sekunde)</Label>
              <Input
                type="number"
                {...register("ai.maxGenSeconds", { valueAsNumber: true })}
                min={10} max={300}
                className="bg-background-elevated border-ink-ghost w-32"
              />
              {errors.ai?.maxGenSeconds && (
                <p className="text-xs text-destructive">{errors.ai.maxGenSeconds.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Emocionalni stili videov</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DEFAULT_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-all",
                      emotionalStyles.includes(style)
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-ink-ghost text-ink-muted hover:border-ink-faint"
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {emotionalStyles
                  .filter((s) => !DEFAULT_STYLES.includes(s))
                  .map((style) => (
                    <Badge key={style} variant="outline" className="border-primary/30 text-primary gap-1.5">
                      {style}
                      <button type="button" onClick={() => toggleStyle(style)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomStyle())}
                  placeholder="Dodaj lasten stil..."
                  className="bg-background-elevated border-ink-ghost text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomStyle}
                  className="border-ink-ghost gap-1 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Dodaj
                </Button>
              </div>
              {emotionalStyles.length === 0 && (
                <p className="text-xs text-destructive">Izberi vsaj en stil</p>
              )}
            </div>
          </div>
        )}

        {/* KORAK 5: Tisk */}
        {step === 4 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>DPI resolucija</Label>
              <Select
                defaultValue={defaultValues?.print?.dpi ?? "300"}
                onValueChange={(v) => setValue("print.dpi", v as "150" | "300" | "600")}
              >
                <SelectTrigger className="bg-background-elevated border-ink-ghost">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-ink-ghost">
                  <SelectItem value="150">150 DPI — Osnutek</SelectItem>
                  <SelectItem value="300">300 DPI — Standardno</SelectItem>
                  <SelectItem value="600">600 DPI — Visoka kakovost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Format papirja</Label>
              <Select
                defaultValue={defaultValues?.print?.format ?? "4x6"}
                onValueChange={(v) => setValue("print.format", v as "4x6" | "5x7")}
              >
                <SelectTrigger className="bg-background-elevated border-ink-ghost">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-ink-ghost">
                  <SelectItem value="4x6">4×6 palcev (10×15 cm)</SelectItem>
                  <SelectItem value="5x7">5×7 palcev (13×18 cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Besedilo v glavi</Label>
              <Input
                {...register("print.headerText")}
                placeholder="npr. Pepsi Summer 2026"
                className="bg-background-elevated border-ink-ghost"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Besedilo v nogi</Label>
              <Input
                {...register("print.footerText")}
                placeholder="npr. magicflow.app"
                className="bg-background-elevated border-ink-ghost"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigacijski gumbi ───────────────────────────────── */}
      <div className="flex items-center justify-between pt-6 border-t border-ink-ghost">
        <Button
          type="button"
          variant="ghost"
          onClick={() => step === 0 ? router.push("/admin") : setStep((s) => s - 1)}
          className="text-ink-muted hover:text-ink gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? "Prekliči" : "Nazaj"}
        </Button>

        {isLastStep ? (
          <Button
            type="submit"
            disabled={loading}
            className="bg-gold hover:bg-gold-500 text-black font-medium gap-2 min-w-[160px]"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Shranjujem...</>
              : <><Check className="h-4 w-4" /> {mode === "create" ? "Ustvari projekt" : "Shrani spremembe"}</>
            }
          </Button>
        ) : (
          <Button
            type="button"
            onClick={nextStep}
            className="bg-gold hover:bg-gold-500 text-black font-medium gap-2"
          >
            Naprej
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
