"use client";

import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  CupSoda,
  UtensilsCrossed,
  Egg,
} from "lucide-react";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface NutritionData {
  protein: number;
  fat: number;
  carbohydrates: number;
}

interface ThaiFoodMenu {
  MenuID: number;
  ThaiName: string;
  EnglishName: string;
  Nutrition: NutritionData | null;
  Calories: number | null;
  Category: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "menu" | "preview";

type DetectStatus = "idle" | "matched" | "failed";

type FoodPrediction = {
  class: string;
  confidence: number;
};

type DetectResponse = {
  predictions?: FoodPrediction[];
};

interface FoodEntry {
  id: string;
  date: string;
  imageUrl: string;
  menu: string;
  cal: number;
  carb: number;
  timestamp: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const FOOD_MENU_IDS = [
  54, 56, 57, 59, 58,
  85, 86, 87, 88, 89, 90, 92,
  62, 68, 63, 82, 72, 69, 83,
  66, 71, 80, 2, 76, 78, 74,
];

// ----------------------------------------------------------------------
// LocalStorage helpers
// ----------------------------------------------------------------------
function getCurrentUserNutrition() {
  if (typeof window === "undefined") return { cal: 0, carb: 0 };
  const stored = localStorage.getItem("userNutrition");
  const today = new Date().toDateString();
  if (!stored) return { cal: 0, carb: 0 };
  try {
    const parsed = JSON.parse(stored);
    if (parsed.date !== today) return { cal: 0, carb: 0 };
    return parsed as { cal: number; carb: number };
  } catch {
    return { cal: 0, carb: 0 };
  }
}

function setCurrentUserNutrition(cal: number, carb: number) {
  if (typeof window !== "undefined") {
    const today = new Date().toDateString();
    localStorage.setItem(
      "userNutrition",
      JSON.stringify({ cal, carb, date: today })
    );
  }
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------
export default function FoodUploadModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [imageURL, setImageURL] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [detectedFood, setDetectedFood] = useState<ThaiFoodMenu | null>(null);
  const [detectStatus, setDetectStatus] = useState<DetectStatus>("idle");
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectLoading, setDetectLoading] = useState<boolean>(false);

  const [foodMenus, setFoodMenus] = useState<ThaiFoodMenu[]>([]);
  const [selectedFood, setSelectedFood] = useState<string>("none");

  const [beverages, setBeverages] = useState<ThaiFoodMenu[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string>("none");
  const [drinkVolume, setDrinkVolume] = useState<number>(200);

  // ✅ เพิ่ม state สำหรับไข่ (fetch จากฐานข้อมูล)
  const [eggs, setEggs] = useState<ThaiFoodMenu[]>([]);
  const [selectedEgg, setSelectedEgg] = useState<string>("none");

  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ─── fetch ข้อมูลเมื่อ modal เปิด ───
  useEffect(() => {
    if (!open) return;

    if (beverages.length === 0) {
      fetch("/api/foods?category=เครื่องดื่ม")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: ThaiFoodMenu[]) => setBeverages(data))
        .catch(console.error);
    }

    // ✅ Fetch ข้อมูลไข่จากฐานข้อมูล (โดย MenuID)
    if (eggs.length === 0) {
      const eggMenuIds = [68, 113, 114]; // MenuID ของไข่ 3 แบบ
      Promise.all(
        eggMenuIds.map((id) =>
          fetch(`/api/foods?menuId=${id}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        )
      )
        .then((results) => {
          const allEggs = results.flat().filter((e: ThaiFoodMenu) => e?.MenuID);
          setEggs(allEggs);
        })
        .catch(console.error);
    }

    if (foodMenus.length === 0) {
      Promise.all([
        fetch("/api/foods?category=ผลไม้").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/foods?category=ของหวาน").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/foods?category=อาหารคาว").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([fruits, desserts, mains]: [ThaiFoodMenu[], ThaiFoodMenu[], ThaiFoodMenu[]]) => {
          const all = [...fruits, ...desserts, ...mains];
          const ordered = FOOD_MENU_IDS
            .map((id) => all.find((f) => f.MenuID === id))
            .filter((f): f is ThaiFoodMenu => !!f);
          setFoodMenus(ordered);
        })
        .catch(console.error);
    }
  }, [open, beverages.length, foodMenus.length, eggs.length]);

  // ─── reset เมื่อปิด ───
  useEffect(() => {
    if (!open) {
      setMode("menu");
      setImageURL("");
      setImageFile(null);
      setDetectedFood(null);
      setDetectStatus("idle");
      setDetectError(null);
      setSelectedFood("none");
      setSelectedDrink("none");
      setDrinkVolume(200);
      setSelectedEgg("none");
      setSaveLoading(false);
    }
  }, [open]);

  const onPickFromGallery = () => fileInputRef.current?.click();
  const onOpenCamera = () => cameraInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setDetectStatus("idle");
    setDetectError(null);
    setDetectedFood(null);
    setSelectedFood("none");
    setSelectedDrink("none");
    setDrinkVolume(200);
    setSelectedEgg("none");
    setMode("preview");

    try {
      const isHeic =
        file.type === "image/heic" ||
        file.name.toLowerCase().endsWith(".heic");

      if (isHeic) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8,
        });
        const validBlob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
        file = new File(
          [validBlob],
          file.name.replace(/\.heic$/i, ".jpg"),
          { type: "image/jpeg" }
        );
      }

      setImageFile(file);
      setImageURL(URL.createObjectURL(file));
    } catch {
      setDetectError("เกิดข้อผิดพลาดในการแปลงไฟล์รูปภาพ");
    }
  };

  // ─── วิเคราะห์รูป ───
  const detectFoodFromImageURL = async (url: string) => {
    try {
      setDetectLoading(true);
      setDetectError(null);
      setDetectedFood(null);
      setDetectStatus("idle");
      setSelectedFood("none");

      const res = await fetch(url);
      const blob = await res.blob();
      const form = new FormData();
      form.append("file", blob, "food.jpg");

      const resp = await fetch(`${API_BASE}/food/detect`, {
        method: "POST",
        body: form,
      });

      const contentType = resp.headers.get("content-type") || "";
      let json: DetectResponse | { detail?: string } = {};
      if (contentType.includes("application/json")) json = await resp.json();

      if (!resp.ok) {
        const err = json as { detail?: string };
        setDetectError(err.detail || `เรียก API ไม่สำเร็จ (${resp.status})`);
        setDetectStatus("failed");
        return;
      }

      const preds = (json as DetectResponse).predictions ?? [];
      if (preds.length === 0) {
        setDetectError("ไม่พบอาหารในรูป กรุณาเลือกเมนูด้วยตนเอง");
        setDetectStatus("failed");
        return;
      }

      const best = [...preds].sort((a, b) => b.confidence - a.confidence)[0];
      const targetName = (best.class ?? "").toString().trim();

      const dbRes = await fetch(
        `/api/foods?aiName=${encodeURIComponent(targetName)}`
      );
      if (!dbRes.ok) {
        setDetectError("ไม่พบข้อมูลอาหาร กรุณาเลือกเมนูด้วยตนเอง");
        setDetectStatus("failed");
        return;
      }

      const dbData: ThaiFoodMenu[] = await dbRes.json();
      const matchedFood = dbData.length > 0 ? dbData[0] : null;

      if (!matchedFood?.Nutrition) {
        setDetectError(
          "ไม่พบอาหารในรูป กรุณาเลือกเมนูด้วยตนเอง"
        );
        setDetectStatus("failed");
        return;
      }

      setDetectedFood(matchedFood);
      setDetectStatus("matched");
    } catch (error: unknown) {
      setDetectError(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
      );
      setDetectStatus("failed");
    } finally {
      setDetectLoading(false);
    }
  };

  async function uploadImageToServer(file: File) {
    const form = new FormData();
    form.append("file", file, "food.jpg");
    const token = localStorage.getItem("token")?.replace(/"/g, "");
    const uploadRes = await fetch(`${API_BASE}/food-images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      body: form,
    });
    const contentType = uploadRes.headers.get("content-type") || "";
    let data: unknown = {};
    if (contentType.includes("application/json")) data = await uploadRes.json();
    if (!uploadRes.ok) {
      const err = data as { detail?: string; error?: string };
      throw new Error(err.detail || err.error || "อัปโหลดรูปไม่สำเร็จ");
    }
    return data as { url?: string };
  }

  async function saveNutrition(
    file: File | null,
    nutToAdd: { menu: string; cal: number; carb: number; protein: number; fat: number }
  ) {
    try {
      setSaveLoading(true);
      let imageUrl = "";

      if (file) {
        try {
          const uploadResult = await uploadImageToServer(file);
          if (uploadResult?.url) imageUrl = uploadResult.url;
        } catch (e) {
          console.warn("upload image failed:", e);
        }
      }

      const token = localStorage.getItem("token")?.replace(/"/g, "");
      const saveRes = await fetch(`${API_BASE}/foods/add`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          food_name: nutToAdd.menu,
          calories: nutToAdd.cal,
          carbs: nutToAdd.carb,
          protein: nutToAdd.protein,
          fat: nutToAdd.fat,
          image_url: imageUrl,
        }),
      });

      const contentType = saveRes.headers.get("content-type") || "";
      let data: unknown = {};
      if (contentType.includes("application/json")) data = await saveRes.json();
      if (!saveRes.ok) {
        const err = data as { detail?: string; error?: string };
        throw new Error(err.detail || err.error || "บันทึกลงฐานข้อมูลไม่สำเร็จ");
      }

      if (typeof window !== "undefined") {
        const storedHistory = localStorage.getItem("foodHistory");
        const history: FoodEntry[] = storedHistory ? JSON.parse(storedHistory) : [];
        history.push({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          imageUrl,
          menu: nutToAdd.menu,
          cal: nutToAdd.cal,
          carb: nutToAdd.carb,
          timestamp: Date.now(),
        });
        localStorage.setItem("foodHistory", JSON.stringify(history));
      }

      const current = getCurrentUserNutrition();
      setCurrentUserNutrition(current.cal + nutToAdd.cal, current.carb + nutToAdd.carb);
      window.dispatchEvent(
        new CustomEvent("nutritionUpdated", {
          detail: { cal: nutToAdd.cal, carb: nutToAdd.carb, protein: nutToAdd.protein, fat: nutToAdd.fat },
        })
      );

      return true;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      return false;
    } finally {
      setSaveLoading(false);
    }
  }

  // ✅ คำนวณ nutrition รวมทั้งไข่
  const activeFoodData: ThaiFoodMenu | null =
    selectedFood !== "none"
      ? foodMenus.find((f) => f.MenuID.toString() === selectedFood) ?? null
      : detectStatus === "matched"
      ? detectedFood
      : null;

  const foodNut = activeFoodData?.Nutrition ?? { carbohydrates: 0, protein: 0, fat: 0 };
  const foodBaseCal = activeFoodData?.Calories ?? 0;

  const drinkData = beverages.find((b) => b.MenuID.toString() === selectedDrink) ?? null;
  const drinkNut = drinkData?.Nutrition ?? { carbohydrates: 0, protein: 0, fat: 0 };
  const drinkBaseCal = drinkData?.Calories ?? 0;
  const drinkMul = selectedDrink === "none" ? 0 : drinkVolume / 100;

  // ✅ คำนวณ nutrition จากไข่
  const eggData = eggs.find((e) => e.MenuID.toString() === selectedEgg) ?? null;
  const eggNut = eggData?.Nutrition ?? { carbohydrates: 0, protein: 0, fat: 0 };
  const eggBaseCal = eggData?.Calories ?? 0;

  // ✅ รวม nutrition ทั้งหมด
  const totalCal =
    activeFoodData ? Math.round(foodBaseCal + drinkBaseCal * drinkMul + (selectedEgg !== "none" ? eggBaseCal : 0)) : 0;
  const totalCarb = activeFoodData
    ? Number(
        (
          foodNut.carbohydrates +
          drinkNut.carbohydrates * drinkMul +
          (selectedEgg !== "none" ? eggNut.carbohydrates : 0)
        ).toFixed(1)
      )
    : 0;
  const totalProtein = activeFoodData
    ? Number(
        (
          foodNut.protein +
          drinkNut.protein * drinkMul +
          (selectedEgg !== "none" ? eggNut.protein : 0)
        ).toFixed(1)
      )
    : 0;
  const totalFat = activeFoodData
    ? Number(
        (
          foodNut.fat +
          drinkNut.fat * drinkMul +
          (selectedEgg !== "none" ? eggNut.fat : 0)
        ).toFixed(1)
      )
    : 0;

  // ✅ สร้างชื่อเมนูรวมทั้งไข่
  const finalMenuName = activeFoodData
    ? [
        activeFoodData.ThaiName,
        selectedDrink !== "none" ? `${drinkData?.ThaiName} (${drinkVolume}ml)` : null,
        selectedEgg !== "none" ? eggData?.ThaiName : null,
      ]
        .filter(Boolean)
        .join(" + ")
    : "";

  const showResult = detectStatus === "matched" || detectStatus === "failed";
  const canSave = activeFoodData !== null;

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader className="p-6 pb-1 bg-white">
          <DialogTitle className="text-xl font-bold text-slate-800">
            {mode === "menu" ? "บันทึกอาหาร" : "วิเคราะห์อาหาร"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {mode === "menu"
              ? "เลือกวิธีที่คุณต้องการเพื่อเพิ่มข้อมูลอาหาร"
              : "ตรวจสอบความถูกต้องก่อนบันทึก"}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">

          {/* ─── หน้าแรก ─── */}
          {mode === "menu" && (
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={onPickFromGallery}
                variant="outline"
                className="h-20 flex flex-col gap-1 border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-2xl"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="font-semibold text-xs uppercase tracking-wider">คลังรูปภาพ</span>
              </Button>
              <Button
                onClick={onOpenCamera}
                className="h-20 flex flex-col gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 rounded-2xl transition-all"
              >
                <Camera className="w-6 h-6" />
                <span className="font-semibold text-xs uppercase tracking-wider">ถ่ายรูปอาหาร</span>
              </Button>
            </div>
          )}

          {/* ─── หน้า preview ─── */}
          {mode === "preview" && (
            <div className="space-y-3">

              {/* รูปภาพ */}
              <Card className="border-0 bg-slate-50 overflow-hidden rounded-2xl shadow-inner ring-1 ring-slate-100">
                <CardContent className="p-0 relative">
                  {imageURL && (
                    <img src={imageURL} alt="preview" className="w-full h-32 object-cover" />
                  )}
                  {detectLoading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                      <span className="text-sm font-bold text-emerald-800">กำลังวิเคราะห์...</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Error */}
              {detectError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-medium border border-rose-100 animate-in slide-in-from-top-2">
                  <AlertCircle size={16} />
                  {detectError}
                </div>
              )}

              {/* ─── ผลวิเคราะห์ + dropdown ─── */}
              {showResult && (
                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 space-y-2 animate-in fade-in slide-in-from-bottom-2">

                  {detectStatus === "matched" && detectedFood && (
                    <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-emerald-700 font-semibold">
                        ชื่อเมนูอาหาร: {detectedFood.ThaiName}
                      </span>
                    </div>
                  )}

                  {/* Dropdown เลือกเมนูอาหาร */}
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={16} className="text-slate-400 shrink-0" />
                    <Select value={selectedFood} onValueChange={setSelectedFood}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200 rounded-lg flex-1">
                        <SelectValue placeholder="เลือกเมนูอาหาร" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-72">
                        <SelectItem value="none" className="text-xs text-slate-500">
                          -- เลือกเมนูอาหาร --
                        </SelectItem>
                        {(["ผลไม้", "ของหวาน", "อาหารคาว"] as const).map((cat) => {
                          const items = foodMenus.filter((f) => f.Category === cat);
                          if (!items.length) return null;
                          return (
                            <div key={cat}>
                              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {cat}
                              </div>
                              {items.map((item) => (
                                <SelectItem
                                  key={item.MenuID}
                                  value={item.MenuID.toString()}
                                  className="text-xs"
                                >
                                  {item.ThaiName}
                                  {item.Calories !== null && (
                                    <span className="ml-1 text-slate-400">
                                      ({item.Calories} kcal)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </div>
                          );
                        })}
                        {foodMenus.length === 0 && (
                          <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            กำลังโหลด...
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dropdown เลือกไข่ */}
                  {activeFoodData && (
                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-100">
                      <Egg size={16} className="text-slate-400 shrink-0" />
                      <Select value={selectedEgg} onValueChange={setSelectedEgg}>
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200 rounded-lg flex-1">
                          <SelectValue placeholder="เลือกไข่ (ไม่บังคับ)" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                          <SelectItem value="none" className="text-xs text-slate-500">
                            -- ไม่เลือกเมนูเพิ่มเติม --
                          </SelectItem>
                          {eggs.length > 0 ? (
                            eggs.map((egg) => (
                              <SelectItem
                                key={egg.MenuID}
                                value={egg.MenuID.toString()}
                                className="text-xs"
                              >
                                {egg.ThaiName}
                                {egg.Calories !== null && (
                                  <span className="ml-1 text-slate-400">
                                    ({egg.Calories} kcal)
                                  </span>
                                )}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-400">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              กำลังโหลด...
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Dropdown เลือกเครื่องดื่ม */}
                  {activeFoodData && (
                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-100">
                      <CupSoda size={16} className="text-slate-400 shrink-0" />
                      <div className={`flex-1 grid gap-2 ${selectedDrink !== "none" ? "grid-cols-[1fr_80px]" : "grid-cols-1"}`}>
                        <Select
                          value={selectedDrink}
                          onValueChange={(val) => {
                            setSelectedDrink(val);
                            setDrinkVolume(val === "none" ? 0 : 200);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200 rounded-lg truncate">
                            <SelectValue placeholder="เลือกเครื่องดื่ม" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-60">
                            <SelectItem value="none" className="text-xs text-slate-500">
                              -- ไม่รับเครื่องดื่ม --
                            </SelectItem>
                            {beverages.map((drink) => (
                              <SelectItem
                                key={drink.MenuID}
                                value={drink.MenuID.toString()}
                                className="text-xs"
                              >
                                {drink.ThaiName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedDrink !== "none" && (
                          <div className="relative">
                            <input
                              type="number"
                              value={drinkVolume || ""}
                              onChange={(e) => setDrinkVolume(Number(e.target.value))}
                              placeholder="ปริมาณ"
                              min="0"
                              className="w-full h-8 pl-2 pr-6 text-xs text-right bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                              ml
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ตารางโภชนาการ */}
                  {activeFoodData && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100">
                      {[
                        { label: "พลังงาน", value: totalCal, unit: "kcal" },
                        { label: "คาร์บ", value: totalCarb, unit: "g" },
                        { label: "โปรตีน", value: totalProtein, unit: "g" },
                        { label: "ไขมัน", value: totalFat, unit: "g" },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="text-center bg-white p-2 rounded-xl border border-emerald-50">
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">{label}</span>
                          <span className="text-lg font-bold text-emerald-600">{value}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-medium">{unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ปุ่มวิเคราะห์ */}
              {!detectLoading && !showResult && (
                <Button
                  onClick={() => void detectFoodFromImageURL(imageURL)}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                  disabled={!imageURL}
                >
                  เริ่มวิเคราะห์รูปภาพ
                </Button>
              )}

              {/* ปุ่มบันทึก */}
              <Button
                onClick={async () => {
                  const res = await saveNutrition(imageFile, {
                    menu: finalMenuName,
                    cal: totalCal,
                    carb: totalCarb,
                    protein: totalProtein,
                    fat: totalFat,
                  });
                  if (res) onClose();
                }}
                disabled={saveLoading || !canSave}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 font-bold disabled:opacity-40"
              >
                {saveLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 w-5 h-5" />
                    บันทึกข้อมูลอาหาร
                  </>
                )}
              </Button>

              {/* ปุ่มย้อนกลับ */}
              <Button
                variant="ghost"
                onClick={() => {
                  setMode("menu");
                  setImageURL("");
                  setImageFile(null);
                  setDetectedFood(null);
                  setDetectStatus("idle");
                  setDetectError(null);
                  setSelectedFood("none");
                  setSelectedDrink("none");
                  setSelectedEgg("none");
                }}
                className="w-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl text-xs h-10"
                disabled={saveLoading}
              >
                <RefreshCcw size={14} className="mr-2" />
                เลือกรูปภาพใหม่
              </Button>
            </div>
          )}
        </div>

        <input type="file" accept="image/*, .heic" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <input type="file" accept="image/*, .heic" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}