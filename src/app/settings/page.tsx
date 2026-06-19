"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lightbulb, History, X } from "lucide-react"; 

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface UserProfile {
    id: number;
    username: string;
    email: string;
    role: string;
    target_calories: number | null;
    target_carbs: number | null;
    target_protein: number | null;
    target_fat: number | null;
    birth_date: string | null;
    weight_kg: number | null;
    height_cm: number | null;
    health_info: string | null;
    bmr: number | null;
    bmi: number | null;
    goal?: string;
}

interface ProfileHistoryItem {
    id: number;
    weight_kg: number;
    height_cm: number;
    health_info: string | null;
    created_at: string;
}

interface ProfileRowProps {
    label: string;
    value: string | number;
}

function calculateAge(birthDateStr: string | null): number {
    if (!birthDateStr) return 0;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return Math.max(0, age);
}

// ----------------------------------------------------------------------
// Component ย่อย สำหรับแสดงแต่ละแถวข้อมูล
// ----------------------------------------------------------------------
function ProfileRow({ label, value }: ProfileRowProps) {
    return (
        <div className="flex items-start mb-3 last:mb-0 relative min-h-[24px]">
            <div className="font-semibold w-28 shrink-0 text-slate-800">
                {label}:
            </div>
            <div className="text-slate-700 break-words flex-1 leading-relaxed">
                {value}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [showInfoTooltip, setShowInfoTooltip] = useState(false); 
    const [showTdeeTooltip, setShowTdeeTooltip] = useState(false); 

    const [historyList, setHistoryList] = useState<ProfileHistoryItem[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [profileData, setProfileData] = useState<UserProfile | null>(null);

    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [healthInfo, setHealthInfo] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        async function fetchProfile() {
            try {
                const res = await fetch(`${API_BASE}/api/user/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data: UserProfile = await res.json();
                    setProfileData(data);
                    
                    if (data.weight_kg) setWeight(data.weight_kg.toString());
                    if (data.height_cm) setHeight(data.height_cm.toString());
                    if (data.health_info) setHealthInfo(data.health_info);

                } else if (res.status === 401) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                } else {
                    console.error("Failed to load profile, status:", res.status);
                }
            } catch (error) {
                console.error("Network error:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [router]);

    useEffect(() => {
        if (!showHistoryModal) return;

        async function fetchHistory() {
            const token = localStorage.getItem("token");
            if (!token) return;

            setLoadingHistory(true);
            try {
                const res = await fetch(`${API_BASE}/api/user/me/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setHistoryList(data);
                } else {
                    console.error("Failed to fetch history");
                }
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoadingHistory(false);
            }
        }

        fetchHistory();
    }, [showHistoryModal]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE}/api/user/me/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    weight_kg: parseFloat(weight),
                    height_cm: parseFloat(height),
                    health_info: healthInfo
                })
            });

            if (res.ok) {
                alert("บันทึกข้อมูลสำเร็จ! ระบบอัปเดตเป้าหมายแคลอรี่ใหม่ให้คุณแล้ว 🥗");
                router.push("/user/dashboard");
            } else {
                alert("เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error(error);
            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        } finally {
            setSaving(false);
        }
    };

    const calculateBMI = (weightKg: number | null, heightCm: number | null) => {
        if (!weightKg || !heightCm) return "-";
        const heightM = heightCm / 100;
        return (weightKg / (heightM * heightM)).toFixed(1);
    };

    const calculateCarbPortion = (carbsG: number | null) => {
        if (!carbsG) return "-";
        return (carbsG / 15).toFixed(1); 
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <div className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-5 font-sans relative">
            <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                <div className="flex items-center gap-3 mb-2">
                    <button 
                        onClick={() => router.back()}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">โปรไฟล์และการตั้งค่า</h1>
                </div>

                {profileData && (
                    <div className="space-y-4">
                        {/* 1. Card ข้อมูลส่วนตัว */}
                        <Card className="border-slate-100 shadow-sm rounded-2xl bg-white overflow-visible relative z-10">
                            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-lg font-bold text-slate-800">ข้อมูลส่วนตัว</CardTitle>
                                
                                {/* 🛠️ ย้ายปุ่มประวัติขึ้นมาไว้ในฝั่งขวาบนของ Header ร่วมกับหลอดไฟ */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowHistoryModal(true)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 bg-slate-100/80 hover:bg-emerald-50/80 px-2.5 py-1.5 rounded-xl transition-all border border-slate-200/40"
                                    >
                                        <History size={13} />
                                        ดูประวัติ
                                    </button>

                                    <div className="relative">
                                        <button
                                            onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                                            onBlur={() => setShowInfoTooltip(false)}
                                            className="text-amber-400 hover:text-amber-500 transition-colors focus:outline-none flex items-center p-1 rounded-full hover:bg-amber-50"
                                            type="button"
                                            aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับ BMI และ BMR"
                                        >
                                            <Lightbulb size={20} />
                                        </button>

                                        {showInfoTooltip && (
                                            <div className="absolute right-0 top-10 w-64 p-4 bg-slate-800 text-white text-xs rounded-xl shadow-xl z-20 font-normal leading-relaxed animate-in fade-in zoom-in-95">
                                                <p className="mb-2">
                                                    <strong className="text-amber-300">BMI (ดัชนีมวลกาย):</strong><br/>
                                                    ตัวชี้วัดความสมดุลระหว่างน้ำหนักและส่วนสูง เพื่อประเมินว่าร่างกายอยู่ในเกณฑ์มาตรฐาน
                                                </p>
                                                <p>
                                                    <strong className="text-amber-300">BMR:</strong><br/>
                                                    อัตราการเผาผลาญพลังงานพื้นฐาน จำนวนแคลอรีขั้นต่ำที่ร่างกายต้องใช้ในขณะพักผ่อน
                                                </p>
                                                <div className="absolute -top-1 right-3 w-3 h-3 bg-slate-800 rotate-45"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-5 pb-5 text-[15px]">
                                <ProfileRow label="ชื่อผู้ใช้" value={profileData.username || '-'} />
                                <ProfileRow label="อายุ" value={profileData.birth_date ? `${calculateAge(profileData.birth_date)} ปี` : '-'} />  
                                <ProfileRow label="วันเกิด" value={profileData.birth_date || '-'} />  
                                <ProfileRow label="ส่วนสูง" value={profileData.height_cm ? `${profileData.height_cm} ซม.` : '-'} />
                                <ProfileRow label="น้ำหนัก" value={profileData.weight_kg ? `${profileData.weight_kg} กก.` : '-'} />
                                <ProfileRow label="BMI" value={profileData.bmi ? profileData.bmi : calculateBMI(profileData.weight_kg, profileData.height_cm)} />
                                <ProfileRow label="BMR" value={profileData.bmr ? `${profileData.bmr} kcal` : '-'} />
                                <ProfileRow label="เป้าหมายด้านสุขภาพ" value={profileData.goal || '-'} />
                                <ProfileRow label="การแพ้อาหาร" value={profileData.health_info || '-'} />
                            </CardContent>
                        </Card>

                        {/* 2. Card เป้าหมายโภชนาการ */}
                        <Card className="border-emerald-200 shadow-sm rounded-2xl bg-[#f0fdf4] overflow-visible relative z-[5]">
                            <CardHeader className="pb-3 border-b border-emerald-100/60 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-lg font-bold text-emerald-800">เป้าหมายโภชนาการของคุณ</CardTitle>
                                
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTdeeTooltip(!showTdeeTooltip)}
                                        onBlur={() => setShowTdeeTooltip(false)}
                                        className="text-emerald-500 hover:text-emerald-600 transition-colors focus:outline-none flex items-center p-1 rounded-full hover:bg-emerald-100"
                                        type="button"
                                        aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับ TDEE"
                                    >
                                        <Lightbulb size={20} />
                                    </button>

                                    {showTdeeTooltip && (
                                        <div className="absolute right-0 top-10 w-72 p-4 bg-emerald-900 text-white text-xs rounded-xl shadow-xl z-20 font-normal leading-relaxed animate-in fade-in zoom-in-95">
                                            <p className="mb-2">
                                                <strong className="text-emerald-300">TDEE คืออะไร?</strong><br/>
                                                (Total Daily Energy Expenditure) คือพลังงานรวมทั้งหมดที่ร่างกายต้องใช้ในแต่ละวัน รวมการทำกิจกรรมต่างๆ และการออกกำลังกาย
                                            </p>
                                            <p>
                                                <strong className="text-emerald-300">ทำไมต้องกินมากกว่า BMR?</strong><br/>
                                                BMR คือพลังงานที่ใช้ตอนอยู่นิ่งๆ แต่ในชีวิตจริงเราต้องขยับตัวตลอดเวลา ร่างกายจึงต้องการพลังงาน (TDEE) ที่สูงกว่า BMR เพื่อให้มีแรงใช้ชีวิต หากกินน้อยกว่า BMR จะทำให้ระบบเผาผลาญพังและสูญเสียมวลกล้ามเนื้อได้
                                            </p>
                                            <div className="absolute -top-1 right-3 w-3 h-3 bg-emerald-900 rotate-45"></div>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-emerald-900">
                                <div>
                                    <p className="text-xl font-bold mt-1 text-emerald-700">TDEE (เป้าหมายแคลอรี่): {profileData.target_calories || '-'} <span className="text-base font-medium">แคลอรี่/วัน</span></p>
                                </div>
                                <div className="space-y-2 text-[15px] pt-1">
                                    <p><span className="font-medium mr-2">คาร์บ :</span> {profileData.target_carbs || '-'} กรัม/วัน <span className="text-emerald-600/80 text-sm">(ประมาณ {calculateCarbPortion(profileData.target_carbs)} ทัพพี)</span></p>
                                    <p><span className="font-medium mr-2">โปรตีน :</span> {profileData.target_protein || '-'} กรัม/วัน</p>
                                    <p><span className="font-medium mr-2">ไขมัน :</span>{profileData?.target_fat ?? '-'} กรัม/วัน</p>
                                </div>
                            </CardContent>
                        </Card> 
                    </div>
                )}

                {/* 3. Card ฟอร์มแก้ไขข้อมูล */}
                <Card className="border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden mt-6">
                    <CardHeader className="bg-emerald-50/50 border-b border-emerald-100/50 pb-5">
                        <CardTitle className="text-base font-semibold text-emerald-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            แก้ไขข้อมูลร่างกายและสุขภาพ
                        </CardTitle>
                        <CardDescription className="text-xs text-emerald-600/80">
                            หากอัปเดตข้อมูล ระบบจะคำนวณแคลอรี่เป้าหมายให้ใหม่โดยอัตโนมัติ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">ส่วนสูง (ซม.)</label>
                                    <Input
                                        type="number" step="0.1" required
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        className="bg-slate-50 border-slate-200 h-11 focus-visible:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">น้ำหนักปัจจุบัน (กก.)</label>
                                    <Input
                                        type="number" step="0.1" required
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className="bg-slate-50 border-slate-200 h-11 focus-visible:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex justify-between">
                                    <span>ข้อมูลสุขภาพ / การแพ้อาหาร</span>
                                    <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                                </label>
                                <textarea
                                    className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 resize-none transition-all"
                                    placeholder="เช่น แพ้กุ้ง, ไม่ทานเนื้อวัว, เป็นเบาหวาน, ความดันสูง..."
                                    value={healthInfo}
                                    onChange={(e) => setHealthInfo(e.target.value)}
                                ></textarea>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={saving}
                                className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm font-semibold transition-all active:scale-[0.98]"
                            >
                                {saving ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        กำลังบันทึก...
                                    </span>
                                ) : "บันทึกการเปลี่ยนแปลง"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* ---------------------------------------------------------------------- */}
            {/* 📜 Modal หน้าต่างแสดงประวัติสุขภาพ */}
            {/* ---------------------------------------------------------------------- */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 max-h-[75vh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
                        
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-slate-700" />
                                <h3 className="text-base font-bold text-slate-800">ประวัติการบันทึกร่างกาย</h3>
                            </div>
                            <button 
                                onClick={() => setShowHistoryModal(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 pr-1 scrollbar-thin">
                            {loadingHistory ? (
                                <div className="text-center py-8 text-xs text-slate-400">กำลังโหลดประวัติ...</div>
                            ) : historyList.length === 0 ? (
                                <p className="text-center text-slate-400 py-8 text-sm">ยังไม่มีประวัติการบันทึกข้อมูล</p>
                            ) : (
                                historyList.map((item) => (
                                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                        
                                        <div className="font-semibold text-emerald-600 mb-1.5">
                                            {new Date(item.created_at).toLocaleDateString('th-TH', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric' 
                                            })}
                                            {" เวลา "}
                                            {new Date(item.created_at).toLocaleTimeString('th-TH', { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })} น.
                                        </div>

                                        <div className="grid grid-cols-2 gap-1 text-slate-600">
                                            <div>⚖️ น้ำหนัก: <span className="font-bold text-slate-800">{item.weight_kg}</span> กก.</div>
                                            <div>📏 ส่วนสูง: <span className="font-bold text-slate-800">{item.height_cm}</span> ซม.</div>
                                        </div>
                                        
                                        {item.health_info && (
                                            <div className="text-[11px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60 border-dashed break-words">
                                                ℹ️ สุขภาพ: {item.health_info}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-4 pt-2 border-t border-slate-100">
                            <Button 
                                type="button"
                                variant="outline"
                                onClick={() => setShowHistoryModal(false)}
                                className="w-full h-10 border-slate-200 rounded-xl font-medium text-xs text-slate-600 hover:bg-slate-50"
                            >
                                ปิดหน้าต่าง
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}