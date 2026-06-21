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
    id: string; // ✅ เพิ่ม unique ID เพื่อป้องกัน duplicates
    name: string;
    calories: number;
    category: string;
    image_url: string;
}

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

interface BackendRecommendationResponse {
    success?: boolean;
    bmi?: number;
    category?: string;
    advice?: string;
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

// ✅ จัดกลุ่มหมวดหมู่ให้ตรงกับ Tab ใน Frontend
const normalizeCategory = (rawCategory: string): string => {
    if (rawCategory.includes("ผลไม้")) return "ผลไม้";
    if (rawCategory.includes("เครื่องดื่ม") || rawCategory.includes("Beverage")) return "เครื่องดื่ม";
    return "อาหารคาว";
};

// ✅ แปลงข้อมูลอาหารคาว/ผลไม้ (recommended_dishes)
const formatDishData = (item: ApiFoodItem, index: number): FoodFromDB => {
    const menuId = item.MenuID || item.menu_id || item.id || index;
    return {
        id: `dish-${menuId}`, // ✅ สร้าง unique ID
        name: item.ThaiName || item.name || item.food_thai || "ไม่มีชื่อเมนู",
        calories: item.Calories || item.calories || 0,
        category: normalizeCategory(item.Category || item.category || "อาหารคาว"),
        image_url: item.image_url || "/foods/default-food.jpg"
    };
};

// ✅ แปลงข้อมูลเครื่องดื่ม (beverages)
const formatBeverageData = (item: ApiFoodItem, index: number): FoodFromDB => {
    const menuId = item.MenuID || item.menu_id || item.id || index;
    return {
        id: `beverage-${menuId}`, // ✅ สร้าง unique ID
        name: item.ThaiName || item.name || item.food_thai || "ไม่มีชื่อเมนู",
        calories: item.Calories || item.calories || 0,
        category: "เครื่องดื่ม",
        image_url: item.image_url || "/foods/default-food.jpg"
    };
};

// ❌ รายชื่อเครื่องดื่มแปลกๆ ที่ต้องลบออก
const BEVERAGE_BLACKLIST = [
    'มะม่วงพิมเสนนิน',
    'แนนม',
    'ระดับโรงงาน',
    'นนป',
    'คิบ',
    'สกุ',
    'น้ำม',
];

// ❌ รายชื่ออาหารที่ไม่ต้องการให้แนะนำ (ทุกหมวด)
const FOOD_BLACKLIST = [
    'ราดหน้า',
    'ขนมจีน',
];

// ✅ ฟังก์ชันตรวจสอบว่าชื่ออาหารดีหรือไม่
const isValidFoodName = (name: string, category?: string): boolean => {
    if (!name || name.trim().length === 0) return false;
    
    const trimmed = name.trim().toLowerCase();

    // ❌ ตรวจสอบ Blacklist อาหารทุกหมวด (ตัดเมนูที่ไม่ต้องการ เช่น ราดหน้า ขนมจีน)
    for (const badName of FOOD_BLACKLIST) {
        if (trimmed.includes(badName.toLowerCase())) {
            return false;
        }
    }
    
    // ❌ ตรวจสอบ Blacklist เครื่องดื่ม
    if (category === 'เครื่องดื่ม') {
        for (const badName of BEVERAGE_BLACKLIST) {
            if (trimmed.includes(badName.toLowerCase())) {
                return false;
            }
        }
    }
    
    // ❌ ลบชื่อที่เหมือน "มะม่วงพิมเสนนิน" - ตัวอักษรซ้ำบ้าง หรือไม่เป็นคำจริง
    const suspiciousPatterns = [
        /^\d+/, // เริ่มด้วยตัวเลข
        /[,،]/g.test(trimmed) && /[,،]{2,}/.test(trimmed), // เครื่องหมายจุลภาคซ้ำ
        /ระดับโรงงาน/, // ชื่อไม่เกี่ยวกับอาหาร
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern instanceof RegExp && pattern.test(trimmed)) {
            return false;
        }
    }
    
    // ❌ ลบคำที่ดูเหมือนจะ corrupted (ตัวอักษรนอนไทยไม่สมบูรณ์)
    const thaiCharCount = (trimmed.match(/[\u0E00-\u0E7F]/g) || []).length;
    const totalLen = trimmed.replace(/\s|[,،]/g, '').length;
    
    // ถ้าตัวอักษรไทยน้อยกว่า 40% อาจเป็นชื่อแปลก
    if (thaiCharCount > 0 && totalLen > 0 && (thaiCharCount / totalLen) < 0.4) {
        return false;
    }
    
    return true;
};

// ✅ ฟังก์ชันตรวจสอบว่าคุณค่าอาหารสมเหตุสมผลหรือไม่
const isValidCalories = (calories: number): boolean => {
    return calories > 0 && calories <= 2000; // kcal ต่อหนึ่งสิ่ง ควรอยู่ 0-2000
};

// ✅ ฟังก์ชันลบ Duplicates และ Invalid Data
const removeDuplicates = (foods: FoodFromDB[]): FoodFromDB[] => {
    const seen = new Set<string>();
    const unique: FoodFromDB[] = [];
    let invalidCount = 0;
    const invalidReasons: { name: string; category: string; reason: string }[] = [];
    
    for (const food of foods) {
        // ✅ ตรวจสอบความสมเหตุสมผลของข้อมูล (ส่ง category ด้วย)
        if (!isValidFoodName(food.name, food.category)) {
            invalidCount++;
            invalidReasons.push({ name: food.name, category: food.category, reason: "ชื่อแปลกๆ/ตัวอักษรเสีย/blacklist" });
            console.warn(`⚠️ Invalid food name: "${food.name}" (${food.category}) - skipped`);
            continue;
        }
        
        if (!isValidCalories(food.calories)) {
            invalidCount++;
            invalidReasons.push({ name: food.name, category: food.category, reason: `kcal ไม่สมเหตุสมผล (${food.calories})` });
            console.warn(`⚠️ Invalid calories: "${food.name}" (${food.calories} kcal) - skipped`);
            continue;
        }
        
        const key = `${food.name.toLowerCase()}-${food.category}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(food);
        }
    }
    
    console.log(`📊 Cleanup: ${foods.length} → ${unique.length} (removed ${invalidCount})`);
    
    if (invalidReasons.length > 0) {
        console.group("🚫 Removed items:");
        invalidReasons.forEach(item => {
            console.log(`   • [${item.category}] ${item.name}: ${item.reason}`);
        });
        console.groupEnd();
    }
    
    return unique;
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
                console.log("⏳ Waiting for user data...");
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                console.log("🔵 Fetching recommendations...");

                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

                const response = await fetch(`${API_BASE}/api/foods/recommendations`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
                console.log(`📊 Response status: ${response.status}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ HTTP Error ${response.status}: ${errorText}`);
                    setFoods([]);
                    setLoading(false);
                    return;
                }

                const result: BackendRecommendationResponse = await response.json();
                console.log("✅ Recommendations loaded:", result);

                let allFoods: FoodFromDB[] = [];

                // ✅ รูปแบบหลัก: Backend ส่ง { recommended_dishes, beverages }
                if (result.recommended_dishes || result.beverages) {
                    const dishes = Array.isArray(result.recommended_dishes)
                        ? result.recommended_dishes.map((item, idx) => formatDishData(item, idx))
                        : [];
                    const drinks = Array.isArray(result.beverages)
                        ? result.beverages.map((item, idx) => formatBeverageData(item, idx))
                        : [];
                    
                    allFoods = [...dishes, ...drinks];
                    console.log(`✅ Dishes: ${dishes.length}, Drinks: ${drinks.length}`);
                }
                // ✅ รูปแบบสำรอง: ส่งมาเป็น { data: [...] }
                else if (Array.isArray(result.data)) {
                    allFoods = result.data.map((item, idx) => formatDishData(item, idx));
                }
                // ✅ รูปแบบสำรอง: ส่งมาเป็น Array ตรง ๆ
                else if (Array.isArray(result)) {
                    allFoods = (result as unknown as ApiFoodItem[]).map((item, idx) => formatDishData(item, idx));
                }

                // ✅ ลบ Duplicates และ Invalid Data
                const uniqueFoods = removeDuplicates(allFoods);

                if (uniqueFoods.length > 0) {
                    setFoods(uniqueFoods);
                    console.log(`✅ Total foods loaded: ${uniqueFoods.length}`);
                    
                    // ✅ Log category breakdown
                    const breakdown = {
                        อาหารคาว: uniqueFoods.filter(f => f.category === "อาหารคาว").length,
                        ผลไม้: uniqueFoods.filter(f => f.category === "ผลไม้").length,
                        เครื่องดื่ม: uniqueFoods.filter(f => f.category === "เครื่องดื่ม").length,
                    };
                    console.log("📋 Category breakdown:", breakdown);
                    console.log("✅ Valid foods ready for display");
                } else {
                    console.warn("⚠️ No valid food data found after cleanup");
                    setFoods([]);
                }

            } catch (error) {
                console.error("❌ Error fetching recommended foods:", error);
                if (error instanceof TypeError) {
                    console.error("   Error type: Network/CORS Error");
                } else if (error instanceof Error) {
                    console.error("   Error message:", error.message);
                }
                setFoods([]);
            } finally {
                setLoading(false);
            }
        };

        if (bmi > 0) {
            fetchRecommendedFoods();
        } else {
            console.log("⏳ Waiting for BMI data...");
            setLoading(false);
        }
    }, [bmi, user?.id]);

    // ✅ Filter by activeCategory
    let filteredFoods: FoodFromDB[] = foods.filter(food => food.category === activeCategory);

    // ✅ Filter by allergies
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

                {/* BMI Remark Box */}
                {remark && (
                    <div className={`mt-4 p-3 rounded-xl border border-white/50 shadow-sm flex gap-3 items-start text-sm leading-relaxed ${remark.bgColor} ${remark.textColor}`}>
                        <span className="text-lg">{remark.icon}</span>
                        <p>
                            <span className="font-bold">{remark.title}:</span> {remark.desc}
                        </p>
                    </div>
                )}

                {/* Allergy Warning Box */}
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

                <p className="text-[10px] text-gray-400 font-normal mt-2.5 italic pl-1">
                    *หมายเหตุ: C = Carbohydrates (คาร์โบไฮเดรต) • P = Protein (โปรตีน) • F = Fat (ไขมัน)
                </p>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col gap-6">
                {/* Food List */}
                <div>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400 text-sm animate-pulse">
                            กำลังดึงเมนูแนะนำที่มีคุณค่าโภชนาการจากฐานข้อมูล...
                        </div>
                    ) : filteredFoods.length > 0 ? (
                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-2 gap-3 overflow-x-auto pb-2 md:pb-0 md:overflow-visible">
                            {filteredFoods.map((food) => (
                                <div
                                    key={food.id} // ✅ ใช้ unique ID แทน index
                                    className="min-w-[260px] md:min-w-0 bg-white border border-gray-100 rounded-xl p-3 flex gap-3 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-emerald-50 relative flex items-center justify-center text-2xl font-bold">
                                        <img
                                            src={food.image_url || "/foods/default-food.jpg"}
                                            alt={food.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform absolute inset-0 z-10"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                        <span className="select-none">
                                            {food.category === "อาหารคาว" ? "🍱" : food.category === "ผลไม้" ? "🍎" : "🥤"}
                                        </span>
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

                {/* Medical References */}
                <div className="mt-2 pt-4 border-t border-gray-100">
                    <h5 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                        🩺 แหล่งอ้างอิงข้อมูลโภชนาการทางการแพทย์
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div className="bg-gray-50/60 rounded-xl p-2.5 border border-gray-100">
                            <span className="font-bold text-blue-600 block mb-1">เคล็ดลับเลือกกินแป้งและน้ำตาลเพื่อสุขภาพดี</span>
                            <a
                                href="https://n9.cl/eqfpd"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-emerald-600 font-medium line-clamp-1 hover:underline"
                            >
                                🔗 &quot;คาร์บดี&quot; เคล็ดลับเลือกกินแป้งและน้ำตาลเพื่อสุขภาพดี
                            </a>
                        </div>

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