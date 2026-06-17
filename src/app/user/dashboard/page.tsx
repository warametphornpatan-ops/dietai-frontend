"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FoodUploadModal from "../../../components/ui/FoodUploadModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import FoodRecommendations from "@/components/FoodRecommendations";


// --- Interfaces ---
interface User {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    gender?: string;
    age?: number;
    heightCm?: number;
    weightKg?: number;
    bmi?: number;
    bmr?: number;
    target_calories?: number;
    target_carbs?: number;
    target_protein?: number;
    target_fat?: number;
}


interface HealthRecord {
    id: number;
    systolic: number | null;
    diastolic: number | null;
    pulse: number | null;
    recommendation: string;
    createdAt?: string;
}

interface MacroCardProps {
    label: string;
    icon: string;
    current: number;
    max: number;
    color: string;
}

interface NavItemProps {
    label: string;
    emoji: string;
    active?: boolean;
    onClick: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// --- Helper Functions ---
function readUserNutrition() {
    if (typeof window === "undefined") {
        return { cal: 0, carb: 0, protein: 0, fat: 0 };
    }
    try {
        const raw = localStorage.getItem("userNutrition");
        const today = new Date().toDateString();
        if (!raw) return { cal: 0, carb: 0, protein: 0, fat: 0 };
        const parsed = JSON.parse(raw);
        if (parsed.date !== today) return { cal: 0, carb: 0, protein: 0, fat: 0 };
        return {
            cal: Number(parsed.cal ?? 0),
            carb: Number(parsed.carb ?? 0),
            protein: Number(parsed.protein ?? 0),
            fat: Number(parsed.fat ?? 0),
        };
    } catch {
        return { cal: 0, carb: 0, protein: 0, fat: 0 };
    }
}

// ✅ Helper function สำหรับ refetch data จาก API
async function refetchNutritionData(token: string) {
    try {
        console.log("🔄 Refetching nutrition data from /foods/summary...");
        const res = await fetch(`${API_BASE}/foods/summary`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
        });

        if (!res.ok) {
            console.error("❌ Refetch failed:", res.status);
            return null;
        }

        const data = await res.json();
        console.log("✅ Refetch success:", data);
        return {
            cal: data.total_calories || 0,
            carb: data.total_carbs || 0,
            protein: data.total_protein || 0,
            fat: data.total_fat || 0,
        };
    } catch (error) {
        console.error("❌ Refetch error:", error);
        return null;
    }
}

// --- Main Component ---
export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showHealthModal, setShowHealthModal] = useState(false);

    const [loading, setLoading] = useState(true);

    const [carbWarning, setCarbWarning] = useState({
        show: false,
        current: 0,
        target: 0,
    });

    const [calEaten, setCalEaten] = useState<number>(0);
    const [carbEaten, setCarbEaten] = useState<number>(0);
    const [targetCal, setTargetCal] = useState<number>(0);
    const [proEaten, setProEaten] = useState<number>(0);
    const [fatEaten, setFatEaten] = useState<number>(0);

    const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);

    const abortRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);

    // ✅ Initial Load: ดึงข้อมูลผู้ใช้ และ nutrition summary
    useEffect(() => {
        mountedRef.current = true;
        const token = localStorage.getItem("token");

        if (!token) {
            router.replace("/login");
            return;
        }

        const localNut = readUserNutrition();
        setCalEaten(localNut.cal);
        setCarbEaten(localNut.carb);
        setProEaten(localNut.protein);
        setFatEaten(localNut.fat);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        (async () => {
            try {
                // 1. ดึงข้อมูลผู้ใช้
                const res = await fetch(`${API_BASE}/user/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    localStorage.clear();
                    router.replace("/login");
                    return;
                }

                const data = (await res.json()) as User;

                if (mountedRef.current) {
                    setUser(data);
                    setTargetCal(data.target_calories ?? 0);

                    // 2. ✅ ดึงข้อมูล nutrition จาก /foods/summary (แทน /foods/today)
                    console.log("📊 Fetching nutrition summary...");
                    const nutritionRes = await fetch(`${API_BASE}/foods/summary`, {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: controller.signal,
                    });

                    if (nutritionRes.ok) {
                        const nutrition = await nutritionRes.json();
                        console.log("✅ Nutrition summary loaded:", nutrition);

                        setCalEaten(Number(nutrition.total_calories || 0));
                        setCarbEaten(Number(nutrition.total_carbs || 0));
                        setProEaten(Number(nutrition.total_protein || 0));
                        setFatEaten(Number(nutrition.total_fat || 0));
                    } else {
                        console.warn("⚠️ Failed to fetch nutrition summary:", nutritionRes.status);
                    }

                    // 3. ดึงข้อมูล health records
                    try {
                        const hrRes = await fetch(`${API_BASE}/user/me/health-records`, {
                            headers: { Authorization: `Bearer ${token}` },
                            signal: controller.signal,
                        });

                        if (hrRes.ok) {
                            const hrData = await hrRes.json();
                            setHealthRecords(Array.isArray(hrData) ? hrData : []);
                        }
                    } catch (hrError) {
                        console.error("Failed to load health records:", hrError);
                    }

                    setLoading(false);
                }
            } catch (e) {
                if (e instanceof Error && e.name === "AbortError") return;
                console.error("Fetch Data Error:", e);
                if (mountedRef.current) {
                    localStorage.clear();
                    router.replace("/login");
                }
            }
        })();

        return () => {
            mountedRef.current = false;
            abortRef.current?.abort();
        };
    }, [router]);

    // ✅ Event Listener: nutritionUpdated (เพิ่มอาหาร)
    useEffect(() => {
        if (!user) return;
        
        function onNutritionUpdate(e: Event) {
            const ce = (e as CustomEvent).detail ?? {};

            if (ce.cal !== undefined) setCalEaten(prev => prev + Number(ce.cal));

            if (ce.carb !== undefined) {
                setCarbEaten(prev => {
                    const newCarb = prev + Number(ce.carb);
                    const targetCarb = Number(user?.target_carbs) || 0;
                    if (targetCarb > 0 && newCarb > targetCarb) {
                        setTimeout(() => setCarbWarning({ show: true, current: newCarb, target: targetCarb }), 0);
                    }
                    return newCarb;
                });
            }

            if (ce.protein !== undefined) setProEaten(prev => prev + Number(ce.protein));
            if (ce.fat !== undefined) setFatEaten(prev => prev + Number(ce.fat));
        }

        window.addEventListener("nutritionUpdated", onNutritionUpdate as EventListener);
        return () => window.removeEventListener("nutritionUpdated", onNutritionUpdate as EventListener);
    }, [user]);

    // ✅ Event Listener: foodDataRefreshed (refetch จาก API หลังบันทึก)
    useEffect(() => {
        const handleFoodDataRefreshed = (e: Event) => {
            const data = (e as CustomEvent).detail;
            console.log("📊 Food data refreshed from API:", data);

            if (data) {
                setCalEaten(data.total_calories || 0);
                setCarbEaten(data.total_carbs || 0);
                setProEaten(data.total_protein || 0);
                setFatEaten(data.total_fat || 0);
            }
        };

        window.addEventListener("foodDataRefreshed", handleFoodDataRefreshed as EventListener);
        return () => window.removeEventListener("foodDataRefreshed", handleFoodDataRefreshed as EventListener);
    }, []);

    // ✅ Window Focus Listener: refetch เมื่อกลับมาหน้า
    useEffect(() => {
        if (!user) return;

        const handleWindowFocus = async () => {
            console.log("👁️ Window focused - refetching nutrition data...");
            const token = localStorage.getItem("token");
            if (!token) return;

            const freshData = await refetchNutritionData(token);
            if (freshData) {
                console.log("✅ Updated nutrition data:", freshData);
                setCalEaten(freshData.cal);
                setCarbEaten(freshData.carb);
                setProEaten(freshData.protein);
                setFatEaten(freshData.fat);
            }
        };

        window.addEventListener("focus", handleWindowFocus);
        return () => window.removeEventListener("focus", handleWindowFocus);
    }, [user]);

    const logout = () => {
        localStorage.clear();
        router.replace("/login");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500 font-medium text-sm">กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        );
    }

    const carbTarget = user?.target_carbs ?? 0;
    const proteinTarget = user?.target_protein ?? 0;
    const fatTarget = user?.target_fat ?? 0;
    const goal = targetCal || Math.round(carbTarget * 4 + proteinTarget * 4 + fatTarget * 9);
    const eaten = Math.max(Math.round(calEaten), 0);
    const remain = Math.max(goal - eaten, 0);
    const percent = goal > 0 ? Math.min((eaten / goal) * 100, 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-24 md:pb-10 font-sans text-slate-900">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-gray-100">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                                {user?.firstName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-xs text-gray-500 font-medium">ยินดีต้อนรับ</div>
                            <div className="text-lg font-bold text-gray-900 leading-tight">{user?.firstName ?? "ผู้ใช้"}</div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/")} className="text-emerald-600 font-medium hover:bg-emerald-50">หน้าหลัก</Button>
                        <Button variant="ghost" onClick={() => router.push("/history")} className="text-gray-500 hover:text-emerald-600">ประวัติ</Button>
                        <Button variant="ghost" onClick={() => setShowUpload(true)} className="text-gray-500 hover:text-emerald-600">บันทึกอาหาร</Button>
                        <Button variant="ghost" onClick={() => router.push("/settings")} className="text-gray-500 hover:text-emerald-600">ตั้งค่า</Button>
                        <div className="h-6 w-px bg-gray-200 mx-2"></div>
                        <Button onClick={logout} variant="outline" className="border-red-100 text-red-600 hover:bg-red-50 text-xs h-9">ออกจากระบบ</Button>
                    </div>
                    <div className="md:hidden">
                        <Button onClick={logout} variant="outline" className="border-red-100 text-red-600 hover:bg-red-50 text-xs h-9">ออกจากระบบ</Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-6 mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7 lg:col-span-8 space-y-6">
                        <Card className="border-0 shadow-sm ring-1 ring-gray-100 bg-white overflow-hidden">
                            <CardHeader className="pb-2 border-b border-gray-50">
                                <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2"><span>🔥</span> สรุปพลังงานวันนี้</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex flex-col sm:flex-row items-center gap-8">
                                    <div className="relative shrink-0">
                                        <svg width="160" height="160" className="transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="url(#gradient)" strokeWidth="12" strokeDasharray={`${(percent / 100) * 440} 440`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                            <defs><linearGradient id="gradient"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient></defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xs text-gray-400 font-medium uppercase">คงเหลือ</span>
                                            <span className="text-3xl font-bold text-emerald-600">{remain}</span>
                                            <span className="text-xs text-gray-400">kcal</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-xl"><p className="text-gray-500 text-xs mb-1">เป้าหมาย</p><p className="text-lg font-bold text-gray-800">{goal}</p></div>
                                        <div className="bg-gray-50 p-3 rounded-xl"><p className="text-gray-500 text-xs mb-1">ทานแล้ว</p><p className="text-lg font-bold text-emerald-600">{eaten}</p></div>
                                        <div className="col-span-2 mt-1">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>ความคืบหน้า</span><span>{Math.round(percent)}%</span></div>
                                            <Progress value={percent} className="h-2 bg-gray-100 [&>div]:bg-emerald-500" />
                                        </div>
                                        <div className="mt-5 pt-3 border-t border-gray-50 text-center sm:text-left">
                                            <p className="text-[11px] text-gray-400 font-normal italic flex items-center justify-center sm:justify-start gap-1">
                                                <span>
                                                    *หากต้องการปรับปรุงข้อมูลสุขภาพ สามารถแก้ไขได้ที่เมนูตั้งค่า
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-3 gap-4">
                            <MacroCardV2 label="คาร์บ" icon="🌾" current={carbEaten} max={carbTarget} color="bg-amber-400" />
                            <MacroCardV2 label="โปรตีน" icon="🥩" current={proEaten} max={proteinTarget} color="bg-rose-400" />
                            <MacroCardV2 label="ไขมัน" icon="🥑" current={fatEaten} max={fatTarget} color="bg-sky-400" />
                        </div>
                        <div>
                            <FoodRecommendations user={user} />
                        </div>
                    </div>

                    <div className="md:col-span-5 lg:col-span-4 space-y-6">
                        {/* กล่องคำแนะนำแพทย์ — คลิกเพื่อเปิด Modal */}
                        <button
                            onClick={() => setShowHealthModal(true)}
                            className="w-full text-left"
                        >
                            <Card className="border-0 shadow-sm ring-1 ring-blue-100 bg-white hover:ring-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                                <CardHeader className="pb-3 border-b border-blue-50 bg-blue-50/30">
                                    <CardTitle className="text-base text-blue-800 flex items-center justify-between">
                                        <span className="flex items-center gap-2">👨‍⚕️ คำแนะนำแพทย์</span>
                                        <span className="text-xs font-normal text-blue-400 group-hover:text-blue-600 transition-colors">
                                            {healthRecords.length > 0 ? `${healthRecords.length} รายการ · ` : ""}แตะเพื่อดู →
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {healthRecords.length > 0 ? (
                                        <div className="space-y-2">
                                            {/* แสดง preview แค่รายการแรก */}
                                            <div className="relative pl-4 border-l-2 border-blue-200">
                                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-200"></div>
                                                <p className="text-xs text-gray-400 mb-1">
                                                    {healthRecords[0].createdAt
                                                        ? new Date(healthRecords[0].createdAt).toLocaleDateString("th-TH")
                                                        : "ไม่ระบุวันที่"}
                                                </p>
                                                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 line-clamp-2">
                                                    {healthRecords[0].recommendation}
                                                </div>
                                            </div>
                                            {healthRecords.length > 1 && (
                                                <p className="text-xs text-blue-400 text-center pt-1">
                                                    + อีก {healthRecords.length - 1} รายการ
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 text-sm">ยังไม่มีคำแนะนำใหม่</div>
                                    )}
                                </CardContent>
                            </Card>
                        </button>
                    </div>
                </div>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
                <div className="grid grid-cols-4 h-16 items-center px-2">
                    <NavItemV2 emoji="🏠" label="หน้าหลัก" active onClick={() => router.push("/user/dashboard")} />
                    <NavItemV2 emoji="📅" label="ประวัติ" onClick={() => router.push("/history")} />
                    <NavItemV2 emoji="📷" label="บันทึกอาหาร" onClick={() => setShowUpload(true)} />
                    <NavItemV2 emoji="⚙️" label="ตั้งค่า" onClick={() => router.push("/settings")} />
                </div>
            </nav>

            <FoodUploadModal open={showUpload} onClose={() => setShowUpload(false)} />

            {/* Modal คำแนะนำแพทย์ทั้งหมด */}
            {showHealthModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
                    onClick={() => setShowHealthModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-50 bg-blue-50/40 rounded-t-2xl">
                            <h3 className="text-base font-bold text-blue-800 flex items-center gap-2">
                                👨‍⚕️ คำแนะนำแพทย์ทั้งหมด
                            </h3>
                            <button
                                onClick={() => setShowHealthModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-1 px-6 py-4">
                            {healthRecords.length > 0 ? (
                                <div className="space-y-4">
                                    {healthRecords.map((rec) => (
                                        <div key={rec.id} className="relative pl-4 border-l-2 border-blue-200">
                                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-400"></div>
                                            <p className="text-xs text-gray-400 mb-1">
                                                {rec.createdAt
                                                    ? new Date(rec.createdAt).toLocaleDateString("th-TH")
                                                    : "ไม่ระบุวันที่"}
                                            </p>
                                            {(rec.systolic || rec.diastolic || rec.pulse) && (
                                                <div className="flex gap-2 flex-wrap mb-2">
                                                    {rec.systolic && rec.diastolic && (
                                                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                                            🩺 {rec.systolic}/{rec.diastolic} mmHg
                                                        </span>
                                                    )}
                                                    {rec.pulse && (
                                                        <span className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-medium">
                                                            ❤️ {rec.pulse} bpm
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 leading-relaxed">
                                                {rec.recommendation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 text-sm">ยังไม่มีคำแนะนำใหม่</div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100">
                            <Button
                                onClick={() => setShowHealthModal(false)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                            >
                                ปิด
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Carb Warning Modal */}
            {carbWarning.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">ระวังคาร์บเกิน!</h3>
                        <p className="text-gray-500 mb-6 text-sm">วันนี้ทานไป <span className="font-bold text-rose-500">{Math.round(carbWarning.current)}g</span> / {carbWarning.target}g</p>
                        <Button onClick={() => setCarbWarning({ ...carbWarning, show: false })} className="w-full bg-emerald-600 text-white rounded-xl">รับทราบ</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function MacroCardV2({ label, icon, current, max, color }: MacroCardProps) {
    const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    return (
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex items-center gap-1.5 mb-2"><span className="text-lg">{icon}</span><span className="text-xs font-semibold text-gray-500">{label}</span></div>
            <div>
                <div className="flex items-baseline gap-0.5 mb-1.5"><span className="text-base font-bold text-gray-800">{Math.round(current)}</span><span className="text-[10px] text-gray-400">/{Math.round(max)} g</span></div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }}></div></div>
            </div>
        </div>
    );
}

function NavItemV2({ label, emoji, active, onClick }: NavItemProps) {
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 h-full w-full">
            <div className={`text-xl ${active ? "" : "grayscale opacity-60"}`}>{emoji}</div>
            <span className={`text-[10px] font-medium ${active ? "text-emerald-600" : "text-gray-400"}`}>{label}</span>
        </button>
    );
}