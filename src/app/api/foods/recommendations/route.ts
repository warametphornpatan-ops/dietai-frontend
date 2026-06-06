import { NextResponse } from 'next/server';
import {pool} from '@/lib/db'; 

export async function GET(request: Request) {
  try {
    // 1. ดึงค่า bmiStatus จาก Query Parameters เช่น /api/foods/recommendations?bmiStatus=normal
    const { searchParams } = new URL(request.url);
    const bmiStatus = searchParams.get('bmiStatus');

    if (!bmiStatus) {
      return NextResponse.json(
        { error: 'กรุณาระบุ bmiStatus (under, normal, over, severe-over)' }, 
        { status: 400 }
      );
    }

    // 2. ใช้คำสั่ง SQL INNER JOIN ดึงข้อมูลอาหารจากตารางหลัก โดยกรองตามเกณฑ์ BMI ของตารางใหม่
    // บรรทัดนี้จะหายแดงและเรียกใช้งาน pool ได้อย่างสมบูรณ์ครับ
    const [rows] = await pool.execute(
      `SELECT m.MenuID, m.ThaiName, m.EnglishName, m.Calories, m.Nutrition, m.Category, r.bmi_group 
       FROM thai_foodmenu m
       INNER JOIN food_bmi_recommendations r ON m.MenuID = r.menu_id
       WHERE r.bmi_group = ?`,
      [bmiStatus]
    );

    // 3. ส่งข้อมูลกลับไปให้หน้าบ้านในรูปแบบ JSON
    return NextResponse.json({ success: true, data: rows });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}