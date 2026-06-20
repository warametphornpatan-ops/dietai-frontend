"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FoodUploadModal from "@/components/ui/FoodUploadModal";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Wheat,
  Clock,
  CheckCircle2,
  Utensils,
  PlusCircle,
  BarChart3,
  Calendar as CalendarIcon,
  LogOut
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from "recharts";

interface FoodEntry {
  id: string;
  food_name?: string;
  calories?: number;
  carbs?: number;
  image_url?: string;
  created_at?: string;

  menu?: string;
  cal?: number;
  carb?: number;
  imageUrl?: string;
  date?: string;
  timestamp?: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


const getImageUrl = (url?: string): string => {
  if (!url) return "";
  
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      try {
        const urlParts = new URL(url);
        return `${API_BASE}${urlParts.pathname}`;
      } catch (error) {
        return url;
      }
    }
    return url; 
  }
  
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

const getFoodEmoji = (foodName?: string): string => {
  if (!foodName) return "🍱";
  const name = foodName.toLowerCase();
  if (name.includes("ข้าว")) return "🍚";
  if (name.includes("ก๋วยเตี๋ยว") || name.includes("เส้น")) return "🍜";
  if (name.includes("ผลไม้") || name.includes("กล้วย") || name.includes("แอปเปิ้ล")) return "🍎";
  if (name.includes("เครื่องดื่ม") || name.includes("น้ำ") || name.includes("ชา") || name.includes("กาแฟ")) return "🥤";
  if (name.includes("ขนม")) return "🍰";
  if (name.includes("ไก่")) return "🍗";
  if (name.includes("หมู")) return "🥩";
  return "🍱";
};

export default function DiaryPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const loadFoodEntries = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem("token")?.replace(/"/g, "");

      if (!token) {
        setFoodEntries([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/foods/log`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let allEntries: FoodEntry[] = [];

      if (res.ok) {
        const data = await res.json();
        allEntries = Array.isArray(data) ? data : (data.data || []);
      } else {
        console.warn("API fetch failed, checking status:", res.status);
      }

      const filtered = allEntries.filter((entry) => {
        const dateString = entry.created_at || entry.date || "";
        const entryDate = new Date(dateString);

        return (
          entryDate.getDate() === selectedDate.getDate() &&
          entryDate.getMonth() === selectedDate.getMonth() &&
          entryDate.getFullYear() === selectedDate.getFullYear()
        );
      });

      setFoodEntries(filtered.sort((a, b) => {
        const tA = new Date(a.created_at || a.date || 0).getTime();
        const tB = new Date(b.created_at || b.date || 0).getTime();
        return tB - tA;
      }));

    } catch (error) {
      console.error("Error loading food entries:", error);
      setFoodEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadFoodEntries();

    const handleRefresh = () => {
      loadFoodEntries();
    };

    window.addEventListener("nutritionUpdated", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener("nutritionUpdated", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [loadFoodEntries]);

  const getWeekDays = () => {
    const week = [];
    const current = new Date(selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day;
    for (let i = 0; i < 7; i++) {
      const date = new Date(current);
      date.setDate(diff + i);
      week.push(date);
    }
    return week;
  };

  const weekDays = getWeekDays();
  const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const formatThaiDate = (date: Date) => {
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  const totalCalories = foodEntries.reduce((sum, e) => sum + (e.calories ?? e.cal ?? 0), 0);
  const totalCarbs = Math.ceil(foodEntries.reduce((sum, e) => sum + (e.carbs ?? e.carb ?? 0), 0));

  const chartData = useMemo(() => {
    const groupedData = {
      morning: { name: 'เช้า', calories: 0, carbs: 0 },
      noon: { name: 'เที่ยง', calories: 0, carbs: 0 },
      evening: { name: 'เย็น', calories: 0, carbs: 0 },
      snack: { name: 'ดึก/ว่าง', calories: 0, carbs: 0 },
    };

    foodEntries.forEach((entry) => {
      const timeValue = entry.created_at || entry.date || entry.timestamp;
      if (!timeValue) return;

      const entryDate = new Date(timeValue);
      const hour = entryDate.getHours();

      const cals = entry.calories ?? entry.cal ?? 0;
      const carbs = entry.carbs ?? entry.carb ?? 0;

      if (hour >= 5 && hour < 11) {
        groupedData.morning.calories += cals;
        groupedData.morning.carbs += carbs;
      } else if (hour >= 11 && hour < 16) {
        groupedData.noon.calories += cals;
        groupedData.noon.carbs += carbs;
      } else if (hour >= 16 && hour < 21) {
        groupedData.evening.calories += cals;
        groupedData.evening.carbs += carbs;
      } else {
        groupedData.snack.calories += cals;
        groupedData.snack.carbs += carbs;
      }
    });

    return [
      { ...groupedData.morning, carbs: Math.ceil(groupedData.morning.carbs) },
      { ...groupedData.noon, carbs: Math.ceil(groupedData.noon.carbs) },
      { ...groupedData.evening, carbs: Math.ceil(groupedData.evening.carbs) },
      { ...groupedData.snack, carbs: Math.ceil(groupedData.snack.carbs) }
    ];
  }, [foodEntries]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-10 font-sans text-slate-900">

      {/* Header */}
      <header className="hidden md:flex bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-emerald-600">
          <CalendarIcon size={24} />
          <h1 className="text-xl font-bold text-gray-800">ประวัติการกิน</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/user/dashboard")} className="text-gray-500 hover:text-emerald-600">หน้าหลัก</Button>
          <Button variant="ghost" className="text-emerald-600 bg-emerald-50 font-medium">ประวัติ</Button>
          <Button variant="ghost" onClick={() => {
            localStorage.removeItem("token");
            router.push("/login");
          }} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut size={18} className="mr-2" /> ออกจากระบบ
          </Button>
        </div>
      </header>

      {/* Mobile Header */}
      <div className="md:hidden relative bg-emerald-600 text-white pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-lg shadow-emerald-600/20 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-emerald-100" /> ประวัติการกิน
          </h1>
          <Button onClick={() => setSelectedDate(new Date())} variant="ghost" size="sm" className="bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-full px-4">
            วันนี้
          </Button>
        </div>
        <p className="text-emerald-100 text-sm font-medium opacity-90 ml-1">{formatThaiDate(selectedDate)}</p>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-6 md:mt-8 space-y-6">

        {/* Calendar */}
        <div className="-mt-16 md:mt-0 relative z-10">
          <Card className="border-0 shadow-lg shadow-slate-200/60 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4 px-2">
                <Button variant="ghost" size="icon" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d); }}>
                  <ChevronLeft size={20} />
                </Button>
                <span className="text-sm font-semibold text-gray-600 hidden md:block">เลือกวันที่</span>
                <Button variant="ghost" size="icon" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d); }}>
                  <ChevronRight size={20} />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {weekDays.map((date, index) => {
                  const active = isSelected(date);
                  const today = isToday(date);
                  return (
                    <button key={index} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-200 ${active ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105" : today ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-100" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                      <span className={`text-[10px] md:text-xs font-medium mb-1 ${active ? "text-emerald-100" : ""}`}>{dayNames[date.getDay()]}</span>
                      <span className="text-lg md:text-xl font-bold">{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Utensils className="text-emerald-500" size={20} /> รายการอาหาร</h2>
              <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-100 shadow-sm">{foodEntries.length} มื้อ</span>
            </div>

            {loading ? (
              <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-400 text-sm">กำลังโหลดข้อมูล...</p>
              </div>
            ) : foodEntries.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><Utensils size={32} /></div>
                <p className="text-gray-500 font-medium mb-2">ยังไม่มีรายการอาหารของวันที่ {selectedDate.getDate()}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {foodEntries.map((entry, idx) => (
                  <Card key={entry.id || idx} className="group border-0 shadow-sm ring-1 ring-gray-100 bg-white hover:shadow-md transition-all duration-200 overflow-hidden">
                    <CardContent className="p-3 flex gap-4 items-center">
                      {/* รูปภาพ + emoji fallback */}
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 bg-emerald-50 relative flex items-center justify-center text-4xl">
                        <span className="select-none">
                          {getFoodEmoji(entry.food_name || entry.menu)}
                        </span>
                        {getImageUrl(entry.image_url || entry.imageUrl) && (
                          <img
                            src={getImageUrl(entry.image_url || entry.imageUrl)}
                            alt={entry.food_name || entry.menu || "รูปอาหาร"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0 z-10"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-gray-800 text-base truncate pr-2">{entry.food_name || entry.menu}</h3>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                            <Clock size={12} />
                            {formatTime(entry.created_at || entry.date)}
                          </div>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded bg-orange-50 text-orange-500"><Flame size={14} /></div>
                            <div><span className="block text-sm font-bold text-gray-700">{entry.calories ?? entry.cal}</span><span className="block text-[10px] text-gray-400 -mt-0.5">kcal</span></div>
                          </div>
                          <div className="w-px h-8 bg-gray-100"></div>
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded bg-amber-50 text-amber-500"><Wheat size={14} /></div>
                            <div><span className="block text-sm font-bold text-gray-700">{Math.ceil(entry.carbs ?? entry.carb ?? 0)}</span><span className="block text-[10px] text-gray-400 -mt-0.5">carb</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex text-emerald-500 pr-2"><CheckCircle2 size={20} /></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right: Summary & Chart */}
          <div className="md:col-span-4 space-y-4">
            <div className="sticky top-24 space-y-4">
              {foodEntries.length > 0 && (
                <>
                  <Card className="border-0 shadow-lg shadow-emerald-100 bg-emerald-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    <CardHeader className="pb-2 relative z-10"><CardTitle className="text-lg flex items-center gap-2 text-white"><BarChart3 size={20} /> สรุปรวมวันนี้</CardTitle></CardHeader>
                    <CardContent className="relative z-10 space-y-3">
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex justify-between items-center border border-white/20">
                        <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Flame size={18} /></div><span className="text-sm font-medium text-emerald-50">แคลอรี่</span></div>
                        <span className="text-2xl font-bold">{totalCalories}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex justify-between items-center border border-white/20">
                        <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Wheat size={18} /></div><span className="text-sm font-medium text-emerald-50">คาร์โบไฮเดรต</span></div>
                        <div className="text-right"><span className="text-2xl font-bold">{totalCarbs}</span><span className="text-xs text-emerald-100 ml-1">g</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md shadow-slate-200/60 bg-white">
                    <CardHeader className="pb-0 pt-5 px-5 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg font-bold text-gray-800">คาร์โบไฮเดรตตามมื้อ</CardTitle>
                      <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-1 rounded-md">g</span>
                    </CardHeader>
                    <CardContent className="h-64 pt-6 px-2 pb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            dy={10}
                          />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                            formatter={(value: number | string | readonly (number | string)[] | undefined) => [`${String(value ?? 0)} g`, 'คาร์โบไฮเดรต']}
                          />
                          <Bar dataKey="carbs" fill="#f59e0b" radius={[6, 6, 6, 6]} barSize={36}>
                            <LabelList
                              dataKey="carbs"
                              position="top"
                              fill="#64748b"
                              fontSize={12}
                              fontWeight={600}
                              offset={8}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 pb-safe">
        <div className="grid grid-cols-4 h-16 items-center max-w-md mx-auto px-2">
          <NavItem icon="🏠" label="หน้าหลัก" onClick={() => router.push("/user/dashboard")} />
          <NavItem icon="📅" label="ประวัติ" active onClick={() => router.push("/history")} />
          <NavItem icon="📷" label="บันทึกอาหาร" onClick={() => setShowUpload(true)} />
          <NavItem icon="⚙️" label="ตั้งค่า" onClick={() => router.push("/settings")} />
        </div>
      </nav>
      {showUpload && (
         <FoodUploadModal 
             open={showUpload} 
             onClose={() => {
                setShowUpload(false);
                loadFoodEntries(); 
             }} 
         />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 h-full w-full active:scale-95 transition-transform">
      <div 
        className={`flex items-center justify-center w-7 h-7 text-2xl transition-all duration-200 ${
          active 
            ? "-translate-y-1 scale-110" 
            : "opacity-60 grayscale-[50%]"
        }`}
      >
        {icon}
      </div>
      <span className={`text-[10px] font-medium ${active ? "text-emerald-600" : "text-gray-500"}`}>
        {label}
      </span>
    </button>
  );
}