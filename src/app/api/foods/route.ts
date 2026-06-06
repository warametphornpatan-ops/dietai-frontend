import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

// --- กำหนด Type ให้ชัดเจนที่สุด ---
export interface NutritionData {
  Protein: number;
  Fat: number;
  Carbohydrates: number;
}

export interface ThaiFoodMenu {
  MenuID: number;
  ThaiName: string;
  EnglishName: string;
  Ingredients: string[] | null;
  Nutrition: NutritionData | null;
  Calories: number | null;
  Category: string;
}

// ขยาย Type เพื่อรับข้อมูลดิบจาก MySQL
interface DBRowResult extends RowDataPacket {
  MenuID: number;
  ThaiName: string;
  EnglishName: string;
  Ingredients: string | null;
  Nutrition: string | null;
  Calories: number | null;
  Category: string;
}

export async function GET(request: NextRequest) {
  // รับ Parameter จาก URL เช่น /api/foods?category=เครื่องดื่ม หรือ /api/foods?aiName=banana
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const aiName = searchParams.get('aiName');

  try {
    let query = 'SELECT * FROM thai_foodmenu';
    const queryParams: string[] = [];

    // เช็คเงื่อนไขว่าอยากดึงข้อมูลแบบไหน
    if (category) {
      query += ' WHERE Category = ?';
      queryParams.push(category);
    } else if (aiName) {
      query += ' WHERE EnglishName = ? LIMIT 1';
      queryParams.push(aiName);
    }

    const [rows] = await pool.query<DBRowResult[]>(query, queryParams);

    // แปลงข้อมูลและ JSON ให้เป็น Object ที่ตรงกับ Type ที่กำหนด
    const foodsData: ThaiFoodMenu[] = rows.map((row) => {
      let parsedNutrition: NutritionData | null = null;
      if (row.Nutrition) {
        parsedNutrition = JSON.parse(row.Nutrition) as NutritionData;
      }

      return {
        MenuID: row.MenuID,
        ThaiName: row.ThaiName,
        EnglishName: row.EnglishName,
        Ingredients: row.Ingredients ? JSON.parse(row.Ingredients) as string[] : null,
        Nutrition: parsedNutrition,
        Calories: row.Calories,
        Category: row.Category,
      };
    });

    return NextResponse.json(foodsData);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}