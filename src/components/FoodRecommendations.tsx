"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
    id: number;
    username: string;
    email: string;
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

interface FoodRecommendationsProps {
    user: User | null;
}

interface FoodFromDB {
    MenuID: number;
    menuid?: number;
    id?: number;
    ThaiName: string;
    EnglishName: string;
    Calories: number;
    Nutrition: string; 
    Category: string;  
    bmi_group: string;
}

const getBmiRemark = (bmi: number) => {
    if (!bmi || bmi <= 0) return null;

    if (bmi < 18.5) {
        return {
            title: "ค่า BMI ต่ำกว่าเกณฑ์ (under)",
            desc: "เพิ่มพลังงานทีละน้อยแต่สม่ำเสมอ คัดสรรเมนูที่มีโปรตีนและคาร์โบไฮเดรตที่มีคุณภาพเพื่อสร้างมวลกล้ามเนื้อและรักษาสมดุลร่างกาย",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            icon: "🥣"
        };
    } else if (bmi >= 18.5 && bmi < 23.0) {
        return {
            title: "ค่า BMI ปกติ (normal)",
            desc: "สารอาหารและพลังงานอยู่ในเกณฑ์สมดุล แนะนำให้เลือกรับประทานอาหารให้ครบหมู่ในปริมาณที่พอเหมาะเพื่อรักษาสุขภาพและน้ำหนักตัวในระยะยาว",
            bgColor: "bg-emerald-50",
            textColor: "text-emerald-700",
            icon: "⚖️"
        };
    } else if (bmi >= 23.0 && bmi < 25.0) {
        return {
            title: "ค่า BMI เริ่มอ้วน / ท้วม (over)",
            desc: "เน้นการควบคุมพลังงาน เลือกเมนูย่อยง่าย คาร์โบไฮเดรตต่ำ และลดไขมันอิ่มตัว เพื่อช่วยปรับระดับน้ำหนักให้เข้าสู่เกณฑ์ปกติ",
            bgColor: "bg-orange-50",
            textColor: "text-orange-700",
            icon: "🥗"
        };
    } else {
        return {
            title: "ค่า BMI อ้วนมาก (severe-over)",
            desc: "เน้นอาหารพลังงานต่ำมาก หลีกเลี่ยงอาหารที่มีไขมันส่วนเกิน คุมสัดส่วนคาร์บและน้ำตาลอย่างเคร่งครัด พร้อมเน้นเมนูเพิ่มกากใยเพื่อช่วยในการลดน้ำหนัก",
            bgColor: "bg-rose-50",
            textColor: "text-rose-700",
            icon: "⚠️"
        };
    }
};

export default function FoodRecommendations({ user }: FoodRecommendationsProps) {
    const [activeCategory, setActiveCategory] = useState<"อาหารคาว" | "ผลไม้" | "เครื่องดื่ม">("อาหารคาว");
    const [foods, setFoods] = useState<FoodFromDB[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const bmi = Number(user?.bmi ?? 0);

    const categories = [
        { id: "อาหารคาว", name: "🍱 อาหารแนะนำ" },
        { id: "ผลไม้", name: "🍎 ผลไม้" },
        { id: "เครื่องดื่ม", name: "🥤 เครื่องดื่ม" },
    ] as const;

    const getCurrentType = (): "under" | "normal" | "over" | "severe-over" => {
        if (!bmi || bmi <= 0) return "normal";
        if (bmi < 18.5) return "under";
        if (bmi >= 18.5 && bmi < 23.0) return "normal";
        if (bmi >= 23.0 && bmi < 25.0) return "over";
        return "severe-over";
    };

    useEffect(() => {
        const fetchRecommendedFoods = async () => {
            setLoading(true);
            try {
                const status = getCurrentType();
                const response = await fetch(`/api/foods/recommendations?bmiStatus=${status}`);
                const result = await response.json();

                if (result.success && Array.isArray(result.data)) {
                    setFoods(result.data);
                } else {
                    setFoods([]);
                }
            } catch (error) {
                console.error("Error fetching recommended foods:", error);
                setFoods([]);
            } finally {
                setLoading(false);
            }
        };

        if (bmi > 0) {
            fetchRecommendedFoods();
        }
    }, [bmi]);

    const filteredFoods = foods.filter(food => food.Category === activeCategory);

    const getBmiStatusLabel = () => {
        if (!bmi || bmi <= 0) return "รอข้อมูล BMI";
        if (bmi < 18.5) return "น้ำหนักต่ำกว่าเกณฑ์ (under)";
        if (bmi >= 18.5 && bmi < 23.0) return "สุขภาพดี เกณฑ์ปกติ (normal)";
        if (bmi >= 23.0 && bmi < 25.0) return "น้ำหนักเริ่มเกินเกณฑ์ (over)";
        return "อ้วนระดับอันตราย (severe-over)";
    };

    const getBmiNumber = () => {
        if (!bmi || bmi <= 0) return "-";
        return bmi.toFixed(2);
    };

    const remark = getBmiRemark(bmi);

    return (
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
            <CardHeader className="pb-3 border-b border-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                            💡 แนะนำอาหาร (คัดกรองที่มีข้อมูลโภชนาการ)
                        </CardTitle>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            BMI: {getBmiNumber()} • Status: {getBmiStatusLabel()}
                        </p>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`text-[10px] px-2.5 py-1 rounded-full transition-all border ${
                                    activeCategory === cat.id
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                                        : "bg-white text-gray-500 border-transparent hover:bg-gray-50"
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* กล่องแจ้งเตือนคำแนะนำตามกลุ่ม BMI */}
                {remark && (
                    <div className={`mt-4 p-3 rounded-xl border border-white/50 shadow-sm flex gap-3 items-start text-sm leading-relaxed ${remark.bgColor} ${remark.textColor}`}>
                        <span className="text-lg">{remark.icon}</span>
                        <p>
                            <span className="font-bold">{remark.title}:</span> {remark.desc}
                        </p>
                    </div>
                )}

                <p className="text-[10px] text-gray-400 font-normal mt-2.5 italic pl-1">
                    *หมายเหตุ: C = Carbohydrates (คาร์โบไฮเดรต) • P = Protein (โปรตีน) • F = Fat (ไขมัน)
                </p>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col gap-6">
                {/* 1. ส่วนแสดงผลรายการอาหารแนะนำ */}
                <div>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400 text-sm animate-pulse">
                            กำลังดึงเมนูแนะนำที่มีคุณค่าโภชนาการจากฐานข้อมูล...
                        </div>
                    ) : filteredFoods.length > 0 ? (
                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-2 gap-3 overflow-x-auto pb-2 md:pb-0 md:overflow-visible">
                            {filteredFoods.map((food, index) => {
                                const currentMenuId = food.MenuID ?? food.menuid ?? food.id;

                                let parsedNutrition = { protein: 0, carbohydrates: 0, fat: 0 };
                                try {
                                    if (food.Nutrition) {
                                        const cleaned = typeof food.Nutrition === "string" 
                                            ? JSON.parse(food.Nutrition) 
                                            : food.Nutrition;
                                        
                                        parsedNutrition = {
                                            protein: cleaned.protein ?? cleaned.Protein ?? 0,
                                            carbohydrates: cleaned.carbohydrates ?? cleaned.Carbohydrates ?? 0,
                                            fat: cleaned.fat ?? cleaned.Fat ?? 0
                                        };
                                    }
                                } catch (e) {
                                    console.error("Error parsing nutrition for menu item:", currentMenuId);
                                }

                                return (
                                    <div
                                        key={`${currentMenuId}-${index}`}
                                        className="min-w-[260px] md:min-w-0 bg-white border border-gray-100 rounded-xl p-3 flex gap-3 hover:shadow-md transition-all group cursor-pointer"
                                    >
                                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-emerald-50 relative flex items-center justify-center text-2xl font-bold">
                                            {currentMenuId ? (
                                                <img
                                                    src={`/foods/${currentMenuId}.jpg`} 
                                                    alt={food.ThaiName}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform absolute inset-0 z-10"
                                                    onError={(e) => {
                                                        console.log(`❌ ไม่พบไฟล์ภาพของเมนูไอดีที่: ${currentMenuId} ในพาธ /foods/${currentMenuId}.jpg`);
                                                    }}
                                                />
                                            ) : null}
                                            
                                            <span className="select-none">
                                                {food.Category === "อาหารคาว" ? "🍱" : food.Category === "ผลไม้" ? "🍎" : "🥤"}
                                            </span>
                                        </div>

                                        <div className="flex flex-col justify-center flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 text-sm truncate">{food.ThaiName}</h4>
                                            <p className="text-gray-400 text-[10px] truncate mb-0.5">{food.EnglishName || "-"}</p>
                                            <p className="text-emerald-600 text-xs font-semibold mb-1.5">
                                                {food.Calories} kcal
                                            </p>
                                            <div className="flex gap-1.5 text-[10px] text-gray-400 flex-wrap">
                                                <span className="bg-gray-50 px-1.5 py-0.5 rounded">C: {parsedNutrition.carbohydrates}g</span>
                                                <span className="bg-gray-50 px-1.5 py-0.5 rounded">P: {parsedNutrition.protein}g</span>
                                                <span className="bg-gray-50 px-1.5 py-0.5 rounded">F: {parsedNutrition.fat}g</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            ไม่มีรายการในหมวดหมู่นี้ตามข้อจำกัดโภชนาการของคุณ
                        </div>
                    )}
                </div>

                {/* 2. ส่วนแสดงผลลิงก์อ้างอิงแหล่งข้อมูลทางการแพทย์ (อยู่ใต้เมนูอาหาร) */}
                <div className="mt-2 pt-4 border-t border-gray-100">
                    <h5 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                        🩺 แหล่งอ้างอิงข้อมูลโภชนาการทางการแพทย์
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        {/* กลุ่ม BMI ต่ำกว่าเกณฑ์ */}
                        <div className="bg-gray-50/60 rounded-xl p-2.5 border border-gray-100">
                            <span className="font-bold text-blue-600 block mb-1">คล็ดลับเลือกกินแป้งและน้ำตาลเพื่อสุขภาพดี</span>
                            <a 
                                href="https://n9.cl/eqfpd" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-emerald-600 font-medium line-clamp-1 hover:underline"
                            >
                                🔗 “คาร์บดี” เคล็ดลับเลือกกินแป้งและน้ำตาลเพื่อสุขภาพดี
                            </a>
                        </div>


                        {/* เกณฑ์มาตรฐานทั่วไป */}
                        <div className="md:col-span-2 bg-gray-50/60 rounded-xl p-2.5 border border-gray-100">
                            <span className="font-bold text-emerald-600 block mb-1">เกณฑ์มาตรฐาน BMI และการดูแลสุขภาพทั่วไป</span>
                            <a 
                                href="https://ddc.moph.go.th/uploads/publish/1064820201022081932.pdf" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-emerald-600 font-medium line-clamp-1 hover:underline"
                            >
                                🔗 รู้ตัวเลขรู้ความเสี่ยงสุขภาพ
                            </a>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}