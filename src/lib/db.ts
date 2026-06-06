import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // ใส่ user ของ XAMPP ปกติคือ root
  password: '', // ถ้าไม่ได้ตั้งพาสเวิร์ดใน XAMPP ปล่อยว่างไว้
  database: 'dietai', // ชื่อ Database ตามภาพของคุณ
  waitForConnections: true,
  connectionLimit: 10,
});