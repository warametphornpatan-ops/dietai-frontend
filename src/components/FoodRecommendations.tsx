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
    health_info?: string;
}

interface FoodRecommendationsProps {
    user: User | null;
}

interface FoodFromDB {
    name: string;
    calories: number;
    category: string;
    image_url: string;
}

// ✅ สร้าง Interface กลางเพื่อหลีกเลี่ยงการใช้ 'any' ครอบคลุมฟิลด์ทั้งหมดที่ Backend อาจจะส่งมา
interface ApiFoodItem {
    MenuID?: number;
    menu_id?: number;
    id?: number;
    ThaiName?: string;
    name?: string;
    food_thai?: string;
    Calories?: number;
    calories?: number;
    protein?: number;
    fat?: number;
    Category?: string;
    category?: string;
    image_url?: string;
}

// ✅ Interface สำหรับรับ Response จาก Next.js API
interface ApiResponse {
    success?: boolean;
    data?: ApiFoodItem[];
    recommended_dishes?: ApiFoodItem[];
    beverages?: ApiFoodItem[];
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

// ✅ ฟังก์ชันแปลงข้อมูล โดยใช้ Interface ที่กำหนดไว้ (ไม่มีการใช้ any)
const formatFoodData = (item: ApiFoodItem): FoodFromDB => {
    // พยายามดึงชื่อจากหลายๆ ฟิลด์ที่อาจจะเป็นไปได้
    const foodName = item.ThaiName || item.name || item.food_thai || "ไม่มีชื่อเมนู";
    const foodCalories = item.Calories || item.calories || 0;
    let foodCategory = item.Category || item.category || "อาหารคาว";

    // จัดกลุ่มหมวดหมู่ให้ตรงกับ Tab ใน Frontend เผื่อ Backend ส่งมาผิด
    if (foodCategory.includes("ผลไม้")) foodCategory = "ผลไม้";
    else if (foodCategory.includes("เครื่องดื่ม")) foodCategory = "เครื่องดื่ม";
    else foodCategory = "อาหารคาว";

    return {
        name: foodName,
        calories: foodCalories,
        category: foodCategory,
        image_url: item.image_url || "/foods/default-food.jpg"
    };
};

export default function FoodRecommendations({ user }: FoodRecommendationsProps) {
    const [activeCategory, setActiveCategory] = useState<"อาหารคาว" | "ผลไม้" | "เครื่องดื่ม">("อาหารคาว");
    const [foods, setFoods] = useState<FoodFromDB[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const bmi = Number(user?.bmi ?? 0);

    const categories = [
        { id: "อาหารคาว" as const, name: "🍱 อาหารแนะนำ" },
        { id: "ผลไม้" as const, name: "🍎 ผลไม้" },
        { id: "เครื่องดื่ม" as const, name: "🥤 เครื่องดื่ม" },
    ];

    useEffect(() => {
        const fetchRecommendedFoods = async (): Promise<void> => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // ส่งค่า bmiStatus ไปด้วยเพื่อให้ API คัดกรองเมนูให้
                let bmiStatus = "normal";
                if (bmi < 18.5) bmiStatus = "under";
                else if (bmi >= 18.5 && bmi < 23.0) bmiStatus = "normal";
                else if (bmi >= 23.0 && bmi < 25.0) bmiStatus = "over";
                else if (bmi >= 25.0) bmiStatus = "severe-over";

                const response = await fetch(`/api/foods/recommendations?bmiStatus=${bmiStatus}`);
                
                if (!response.ok) {
                    setFoods([]);
                    setLoading(false);
                    return;
                }

                // รับ Response และใช้ Interface ที่เรากำหนดไว้
                const result = (await response.json()) as ApiResponse;
                
                let rawFoods: ApiFoodItem[] = [];

                // ✅ เช็คทุกกรณี ไม่ว่า API จะส่งมาแบบไหน ข้อมูลก็ไม่พัง
                if (Array.isArray(result.data)) {
                    // กรณีส่งมาเป็น { success: true, data: [...] } แบบ API ล่าสุดของเรา
                    rawFoods = result.data;
                } else if (result.recommended_dishes || result.beverages) {
                    // กรณีส่งมาแบบเก่าแยกก้อนกัน
                    const dishes = Array.isArray(result.recommended_dishes) ? result.recommended_dishes : [];
                    const drinks = Array.isArray(result.beverages) ? result.beverages : [];
                    rawFoods = [...dishes, ...drinks];
                } else if (Array.isArray(result)) {
                    // กรณียิงมาเป็น Array ตรงๆ
                    rawFoods = result as ApiFoodItem[];
                }

                // แปลงข้อมูลและเก็บลง State
                if (rawFoods.length > 0) {
                    const allFoods: FoodFromDB[] = rawFoods.map(formatFoodData);
                    setFoods(allFoods);
                } else {
                    setFoods([]);
                }
            } catch (error) {
                console.error("❌ Error fetching foods:", error);
                setFoods([]);
            } finally {
                setLoading(false);
            }
        };

        if (bmi > 0) {
            fetchRecommendedFoods();
        } else {
            setLoading(false);
        }
    }, [bmi, user?.id]);

    let filteredFoods: FoodFromDB[] = foods.filter(food => food.category === activeCategory);

    if (user?.health_info && user.health_info.trim() !== "") {
        const allergicKeywords: string[] = user.health_info
            .toLowerCase()
            .split(/[,、，\s+]/)
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0);

        filteredFoods = filteredFoods.filter(food => {
            const foodNameText = `${food.name || ""}`.toLowerCase();
            return !allergicKeywords.some(keyword => foodNameText.includes(keyword));
        });
    }

    const getBmiStatusLabel = (): string => {
        if (!bmi || bmi <= 0) return "รอข้อมูล BMI";
        if (bmi < 18.5) return "น้ำหนักต่ำกว่าเกณฑ์ (under)";
        if (bmi >= 18.5 && bmi < 23.0) return "สุขภาพดี เกณฑ์ปกติ (normal)";
        if (bmi >= 23.0 && bmi < 25.0) return "น้ำหนักเริ่มเกินเกณฑ์ (over)";
        return "อ้วนระดับอันตราย (severe-over)";
    };

    const getBmiNumber = (): string => {
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
                            💡 แนะนำอาหาร (คัดกรองตามเกณฑ์ BMI)
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

                {remark && (
                    <div className={`mt-4 p-3 rounded-xl border border-white/50 shadow-sm flex gap-3 items-start text-sm leading-relaxed ${remark.bgColor} ${remark.textColor}`}>
                        <span className="text-lg">{remark.icon}</span>
                        <p>
                            <span className="font-bold">{remark.title}:</span> {remark.desc}
                        </p>
                    </div>
                )}

                {user?.health_info && user.health_info.trim() !== "" && (
                    <div className="mt-3 p-3 rounded-xl border border-rose-100 bg-rose-50/70 text-rose-700 shadow-sm flex gap-3 items-start text-sm leading-relaxed">
                        <span className="text-lg">🚫</span>
                        <div>
                            <p className="font-bold mb-0.5">
                                ⚠️ การแพ้อาหารของคุณ: <span className="font-extrabold text-rose-800">{user.health_info}</span>
                            </p>
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent className="pt-4 flex flex-col gap-6">
                <div>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400 text-sm animate-pulse">
                            กำลังดึงเมนูแนะนำที่มีคุณค่าโภชนาการจากฐานข้อมูล...
                        </div>
                    ) : filteredFoods.length > 0 ? (
                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-2 gap-3 overflow-x-auto pb-2 md:pb-0 md:overflow-visible">
                            {filteredFoods.map((food, index) => (
                                <div
                                    key={`${food.name}-${index}`}
                                    className="min-w-[260px] md:min-w-0 bg-white border border-gray-100 rounded-xl p-3 flex gap-3 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-emerald-50 relative flex items-center justify-center text-2xl font-bold">
                                        <img
                                            src={food.image_url || "/foods/default-food.jpg"}
                                            alt={food.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform absolute inset-0 z-10"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/foods/default-food.jpg";
                                            }}
                                        />
                                    </div>

                                    <div className="flex flex-col justify-center flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{food.name}</h4>
                                        <p className="text-emerald-600 text-xs font-semibold mb-1.5">
                                            {food.calories} kcal
                                        </p>
                                        <p className="text-gray-500 text-[10px]">{food.category}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            ไม่มีรายการในหมวดหมู่นี้ตามข้อจำกัดโภชนาการของคุณ
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}