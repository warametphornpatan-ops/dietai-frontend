// src/data/foodIdeas.ts

export type FoodCategory = "main" | "fruit" | "drink";
export type FoodType = "under" | "normal" | "over" | "all";

export interface FoodIdea {
  id: number;
  category: FoodCategory;
  type: FoodType;
  name: string;
  cal: number;
  carb: number;
  pro: number;
  fat: number;
  img: string;
}

export const foodIdeas: FoodIdea[] = [
  // --- อาหารหลัก: BMI ต่ำ ---
  { id: 1, category: "main", type: "under", name: "ข้าวกะเพราไก่ + ไข่ดาว", cal: 450, carb: 55, pro: 25, fat: 8, img: "/Pad Krapow Gai.jpg" },
  { id: 2, category: "main", type: "under", name: "ข้าวกล้อง + อกไก่ย่าง", cal: 420, carb: 40, pro: 24, fat: 12, img: "/Grilled Chicken Breast with Brown Rice.jpg" },
  { id: 3, category: "main", type: "under", name: "ก๋วยเตี๋ยว", cal: 420, carb: 40, pro: 24, fat: 12, img: "/noodles.jpg" },
  { id: 4, category: "main", type: "under", name: "ข้าวเหนียว + ไก่ย่าง", cal: 420, carb: 40, pro: 24, fat: 12, img: "/Sticky rice and grilled chicken.jpg" },

  // --- อาหารหลัก: BMI ปกติ ---
  { id: 5, category: "main", type: "normal", name: "ข้าวเหนียว + ไก่ย่าง", cal: 320, carb: 35, pro: 20, fat: 6, img: "/Sticky rice and grilled chicken.jpg" },
  { id: 6, category: "main", type: "normal", name: "ข้าวกล้อง + อกไก่ย่าง", cal: 220, carb: 28.2, pro: 21, fat: 1.6, img: "/Grilled Chicken Breast with Brown Rice.jpg" },
  { id: 7, category: "main", type: "normal", name: "ก๋วยเตี๋ยว", cal: 220, carb: 28.2, pro: 21, fat: 1.6, img: "/noodles.jpg" },
  { id: 8, category: "main", type: "normal", name: "ข้าวกะเพราไก่ + ไข่ดาว", cal: 220, carb: 28.2, pro: 21, fat: 1.6, img: "/Pad Krapow Gai.jpg" },

  // --- อาหารหลัก: BMI สูง ---
  { id: 9, category: "main", type: "over", name: "ข้าวผัดแบบน้ำมันน้อย", cal: 180, carb: 12, pro: 18, fat: 3, img: "/file rice.jpg" },
  { id: 10, category: "main", type: "over", name: "ยำอกไก่", cal: 120, carb: 15, pro: 8, fat: 2, img: "/Chicken breast salad.jpg" },
  { id: 11, category: "main", type: "over", name: "ยำทูน่า", cal: 120, carb: 15, pro: 8, fat: 2, img: "/Tuna Salad.jpg" },
  { id: 12, category: "main", type: "over", name: "สุกี้น้ำ(เน้นผัก)", cal: 120, carb: 15, pro: 8, fat: 2, img: "/Sukiyaki.jpg" },

  // ผลไม้ BMI ต่ำ
  { id: 13, category: "fruit", type: "under", name: "กล้วย", cal: 120, carb: 27, pro: 1.3, fat: 0.3, img: "/banana.jpg" },
  { id: 14, category: "fruit", type: "under", name: "องุ่น", cal: 98, carb: 25, pro: 0.8, fat: 0.4, img: "/grape.jpg" },
  { id: 15, category: "fruit", type: "under", name: "ลำไย", cal: 98, carb: 25, pro: 0.8, fat: 0.4, img: "/longan.jpg" },
  { id: 16, category: "fruit", type: "under", name: "อะโวคาโด", cal: 98, carb: 25, pro: 0.8, fat: 0.4, img: "/avocado.jpg" },
  { id: 17, category: "fruit", type: "under", name: "แก้วมังกร", cal: 98, carb: 25, pro: 0.8, fat: 0.4, img: "/Dragon Fruit.jpg" },

  // ผลไม้ BMI ปกติ
  { id: 18, category: "fruit", type: "normal", name: "กล้วย", cal: 50, carb: 12, pro: 1.4, fat: 0.5, img: "/banana.jpg" },
  { id: 19, category: "fruit", type: "normal", name: "องุ่น", cal: 50, carb: 13, pro: 0.5, fat: 0.1, img: "/grape.jpg" },
  { id: 20, category: "fruit", type: "normal", name: "ลำไย", cal: 50, carb: 13, pro: 0.5, fat: 0.1, img: "/longan.jpg" },
  { id: 21, category: "fruit", type: "normal", name: "อะโวคาโด", cal: 50, carb: 13, pro: 0.5, fat: 0.1, img: "/avocado.jpg" },
  { id: 22, category: "fruit", type: "normal", name: "แก้วมังกร", cal: 98, carb: 25, pro: 0.8, fat: 0.4, img: "/Dragon Fruit.jpg" },
  

  // ผลไม้ BMI สูง
  { id: 23, category: "fruit", type: "over",name: "ฝรั่ง", cal: 50, carb: 12, pro: 1.4, fat: 0.5, img: "/foreigner.jpg" },
  { id: 24, category: "fruit", type: "over", name: "แอปเปิ้ล", cal: 50, carb: 13, pro: 0.5, fat: 0.1, img: "/apple.jpg" },
  { id: 25, category: "fruit", type: "over", name: "ส้ม", cal: 50, carb: 13, pro: 0.5, fat: 0.1, img: "/orange.jpg" },
  { id: 26, category: "fruit", type: "over", name: "อะโวคาโด", cal: 50, carb: 13, pro: 0.5, fat: 0.1, img: "/avocado.jpg" },
  { id: 27, category: "fruit", type: "over", name: "แก้วมังกร", cal: 98, carb: 25, pro: 0.8, fat: 0.4, img: "/Dragon Fruit.jpg" },
  
  // เครื่องดื่ม BMI ต่ำ
  { id: 28, category: "drink", type: "under", name: "นมจืด", cal: 150, carb: 12, pro: 8, fat: 8, img: "/fresh Milk.jpg" },
  { id: 29, category: "drink", type: "under", name: "นมถั่วเหลือง", cal: 130, carb: 10, pro: 9, fat: 5, img: "/Soy Milk.jpg" },
  { id: 30, category: "drink", type: "under", name: "สมูทตี้ผลไม้", cal: 130, carb: 10, pro: 9, fat: 5, img: "/fuit smoothie.jpg" },
  { id: 31, category: "drink", type: "under", name: "เวย์โปรตีน", cal: 130, carb: 10, pro: 9, fat: 5, img: "/whey protein.jpg" },

  // เครื่องดื่ม BMI ปกติ
  { id: 32, category: "drink", type: "normal", name: "นมจืด", cal: 150, carb: 12, pro: 8, fat: 8, img: "/fresh Milk.jpg" },
  { id: 33, category: "drink", type: "normal", name: "นมถั่วเหลือง", cal: 130, carb: 10, pro: 9, fat: 5, img: "/Soy Milk.jpg" },
  { id: 34, category: "drink", type: "normal", name: "สมูทตี้ผลไม้", cal: 130, carb: 10, pro: 9, fat: 5, img: "/fuit smoothie.jpg" },
  { id: 35, category: "drink", type: "normal", name: "เวย์โปรตีน", cal: 130, carb: 10, pro: 9, fat: 5, img: "/whey protein.jpg" },

  // เครื่องดื่ม BMI สูง
  { id: 36, category: "drink", type: "over", name: "นมถั่วเหลืองไม่หวาน(ไม่หวาน)", cal: 30, carb: 1, pro: 1, fat: 2.5, img: "/Soy Milk.jpg" },
  { id: 37, category: "drink", type: "over", name: "นมจืด", cal: 30, carb: 1, pro: 1, fat: 2.5, img: "/fresh Milk.jpg" },
];