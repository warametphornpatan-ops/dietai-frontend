"use client";

import React from 'react';
import { 
  Page, 
  Text, 
  View, 
  Document, 
  StyleSheet, 
  Font,
  PDFDownloadLink
} from '@react-pdf/renderer';

// --- แก้ปัญหา TypeScript Error (ts:2352) ---
const PdfDocument = Document as unknown as React.ElementType;
const PdfPage = Page as unknown as React.ElementType;
const PdfView = View as unknown as React.ElementType;
const PdfText = Text as unknown as React.ElementType;

// --- ส่วนจัดการฟอนต์ภาษาไทย ---
Font.register({
  family: 'Sarabun',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/sarabun@4.5.0/files/sarabun-thai-400-normal.woff'
});

// --- การจัดหน้ากระดาษและสไตล์แบบเป็นระเบียบ ---
const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Sarabun',
    backgroundColor: '#ffffff'
  },
  headerContainer: {
    borderBottomStyle: 'solid',
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
    paddingBottom: 12,
    marginBottom: 20,
  },
  hospitalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1e293b',
    marginBottom: 4
  },
  reportSubtitle: {
    fontSize: 11,
    color: '#64748b'
  },
  metaInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    fontSize: 10,
    color: '#475569'
  },
  patientCard: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 8, 
    padding: 14, 
    marginBottom: 20, 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  patientTitle: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: '#0f172a',
    marginBottom: 8,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 4
  },
  patientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  patientInfoText: { 
    fontSize: 10, 
    color: '#334155',
    minWidth: '45%'
  },
  // ส่วนแสดงผล BMR, BMI, TDEE
  metricsCard: {
    backgroundColor: '#fdf2f8',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#fbcfe8'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4
  },
  metricItem: {
    fontSize: 10,
    color: '#831843',
    fontWeight: 'bold',
    minWidth: '45%'
  },
  // ส่วนแสดงผลข้อมูลบันทึกปัจจุบันของแพทย์
  vitalsCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8, 
    padding: 14, 
    marginBottom: 20, 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#bbf7d0' 
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4
  },
  vitalsItem: {
    fontSize: 11,
    color: '#166534',
    fontWeight: 'bold'
  },
  recommendationText: {
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 8 
  },
  // ตารางข้อมูล
  table: { 
    width: "100%", 
    borderStyle: "solid", 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  tableRow: { 
    flexDirection: "row",
    alignItems: "center",
    minHeight: 26
  },
  tableHeaderRow: {
    backgroundColor: '#f1f5f9',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  tableDataRow: {
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  // Column sizes สำหรับตาราง nutrition
  colDate: { width: "40%", paddingLeft: 12 },
  colCal: { width: "30%", paddingRight: 16, textAlign: 'right' },
  colCarb: { width: "30%", paddingRight: 16, textAlign: 'right' },
  
  // Column sizes สำหรับตาราง weight history
  colWeightDate: { width: "35%", paddingLeft: 12 },
  colWeight: { width: "32%", paddingRight: 16, textAlign: 'right' },
  colWeightChange: { width: "33%", paddingRight: 16, textAlign: 'right' },
  
  cellHeader: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
  cellData: { fontSize: 9, color: '#334155' }
});

// --- Type Definitions ---
type DailyNutrition = { 
  date: string; 
  totalCal: number; 
  totalCarb: number; 
};

type WeightHistory = {
  date: string;
  weightKg: number;
};

type Patient = { 
  firstName: string; 
  lastName: string; 
  heightCm: number; 
  weightKg: number; 
  targetWeightKg?: number;
  bmi: number;
  bmr?: number;
  dailyNutrition: DailyNutrition[];
  weightHistory?: WeightHistory[];
  allergies?: string[];
};

type DoctorProfile = {
  hospitalName: string;
  firstName: string;
  lastName: string;
  doctorId: string;
  orgCode: string;
};

type CurrentMedicalRecord = {
  sys: string;
  dia: string;
  pulse: string;
  recommendation: string;
};

interface PatientReportPDFProps {
  patientData: Patient;
  doctorData: DoctorProfile | null;
  currentRecord: CurrentMedicalRecord;
  targetCalories?: number; 
}

// ฟังก์ชันคำนวณ TDEE
const calculateTDEE = (bmr: number, activityLevel: string = "moderate"): number => {
  const factors: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };
  return Math.round(bmr * (factors[activityLevel] || 1.55));
};

// คอมโพเนนต์วาดโครงสร้างหน้ากระดาษเอกสาร PDF
const ReportDocument = ({ 
  patientData, 
  doctorData, 
  currentRecord,
  targetCalories
}: Omit<PatientReportPDFProps, 'targetCarbs' | 'targetProtein' | 'targetFat'>) => {
  const tdee = targetCalories || (patientData.bmr ? calculateTDEE(patientData.bmr) : 0);
  
  return (
    <PdfDocument>
      <PdfPage size="A4" style={styles.page}>
        
        {/* 1. ส่วนหัวของรายงาน */}
        <PdfView style={styles.headerContainer}>
          <PdfText style={styles.hospitalTitle}>{doctorData?.hospitalName || "โรงพยาบาลส่งเสริมสุขภาพตำบล"}</PdfText>
          <PdfText style={styles.reportSubtitle}>รายงานสรุปผลการตรวจรักษาและประวัติบันทึกโภชนาการผู้ป่วย</PdfText>
        </PdfView>

        {/* 2. ข้อมูลกำกับเอกสาร */}
        <PdfView style={styles.metaInfoBox}>
          <PdfView>
            <PdfText>แพทย์ผู้ตรวจ: {doctorData ? `${doctorData.firstName} ${doctorData.lastName}` : "—"}</PdfText>
          </PdfView>
          <PdfView style={{ textAlign: 'right' }}>
            <PdfText>วันที่พิมพ์เอกสาร: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</PdfText>
          </PdfView>
        </PdfView>

        {/* 3. ข้อมูลทั่วไปของผู้ป่วย */}
        <PdfView style={styles.patientCard}>
          <PdfText style={styles.patientTitle}>ข้อมูลทั่วไปของผู้ป่วย</PdfText>
          <PdfView style={styles.patientGrid}>
            <PdfText style={styles.patientInfoText}>ชื่อ-นามสกุล: {patientData.firstName} {patientData.lastName}</PdfText>
            <PdfText style={styles.patientInfoText}>ส่วนสูง: {patientData.heightCm || "—"} ซม.</PdfText>
            <PdfText style={styles.patientInfoText}>น้ำหนัก: {patientData.weightKg || "—"} กก.</PdfText>
            <PdfText style={styles.patientInfoText}>เป้าหมายน้ำหนัก: {patientData.targetWeightKg || "—"} กก.</PdfText>
            <PdfText style={[styles.patientInfoText, { minWidth: '100%', marginTop: 4, color: '#dc2626' }]}>
              ประวัติการแพ้อาหาร: {patientData.allergies && patientData.allergies.length > 0 ? patientData.allergies.join(', ') : "ไม่มีประวัติการแพ้อาหาร"}
            </PdfText>
          </PdfView>
        </PdfView>

        {/* 4. ข้อมูลดัชนีสุขภาพ */}
        <PdfView style={styles.metricsCard}>
          <PdfText style={[styles.patientTitle, { color: '#831843', borderBottomColor: '#fbcfe8' }]}>ดัชนีสุขภาพ</PdfText>
          <PdfView style={styles.metricsGrid}>
            <PdfText style={styles.metricItem}>BMI (ดัชนีมวลกาย): {patientData.bmi?.toFixed(1) || "—"}</PdfText>
            <PdfText style={styles.metricItem}>BMR (ปริมาณแคลอรี่พื้นฐาน): {patientData.bmr?.toFixed(0) || "—"} kcal/วัน</PdfText>
            <PdfText style={styles.metricItem}>TDEE (พลังงานทั้งหมด): {tdee || "—"} kcal/วัน</PdfText>
          </PdfView>
        </PdfView>

        {/* 5. ผลบันทึกการตรวจและคำแนะนำล่าสุด */}
        <PdfView style={styles.vitalsCard}>
          <PdfText style={[styles.patientTitle, { color: '#166534', borderBottomColor: '#bbf7d0' }]}>ผลการตรวจร่างกายและคำแนะนำล่าสุด (วันที่ {new Date().toLocaleDateString('th-TH')})</PdfText>
          <PdfView style={styles.vitalsGrid}>
            <PdfText style={styles.vitalsItem}>ความดันโลหิต: {currentRecord.sys || "—"} / {currentRecord.dia || "—"} mmHg</PdfText>
            <PdfText style={styles.vitalsItem}>ชีพจร: {currentRecord.pulse || "—"} BPM</PdfText>
          </PdfView>
          <PdfText style={{ fontSize: 10, fontWeight: 'bold', color: '#14532d', marginTop: 4 }}>คำแนะนำการดูแลสุขภาพโดยแพทย์:</PdfText>
          <PdfText style={styles.recommendationText}>
            {currentRecord.recommendation.trim() || "ไม่มีบันทึกคำแนะนำเพิ่มเติมในครั้งนี้"}
          </PdfText>
        </PdfView>

        {/* 6. ตารางประวัติการเปลี่ยนแปลงน้ำหนัก */}
        {patientData.weightHistory && patientData.weightHistory.length > 0 && (
          <>
            <PdfText style={styles.sectionTitle}>ประวัติการเปลี่ยนแปลงน้ำหนัก</PdfText>
            <PdfView style={styles.table}>
              <PdfView style={[styles.tableRow, styles.tableHeaderRow]}>
                <PdfView style={styles.colWeightDate}><PdfText style={styles.cellHeader}>วันที่บันทึก</PdfText></PdfView>
                <PdfView style={styles.colWeight}><PdfText style={[styles.cellHeader, { textAlign: 'right' }]}>น้ำหนัก (กก.)</PdfText></PdfView>
                <PdfView style={styles.colWeightChange}><PdfText style={[styles.cellHeader, { textAlign: 'right' }]}>การเปลี่ยนแปลง</PdfText></PdfView>
              </PdfView>
              
              {patientData.weightHistory.map((w, i) => {
                const dateObj = new Date(w.date);
                const formattedDate = isNaN(dateObj.getTime())
                  ? w.date
                  : dateObj.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

                const prevWeight = i > 0 ? patientData.weightHistory![i - 1].weightKg : null;
                const change = prevWeight ? (w.weightKg - prevWeight).toFixed(1) : "—";
                const changeSign = prevWeight ? (parseFloat(change as string) >= 0 ? '+' : '') : '';

                return (
                  <PdfView key={i} style={[styles.tableRow, styles.tableDataRow]}>
                    <PdfView style={styles.colWeightDate}><PdfText style={styles.cellData}>{formattedDate}</PdfText></PdfView>
                    <PdfView style={styles.colWeight}><PdfText style={styles.cellData}>{w.weightKg.toFixed(1)}</PdfText></PdfView>
                    <PdfView style={styles.colWeightChange}>
                      <PdfText style={[styles.cellData, { color: change === "—" ? '#94a3b8' : (parseFloat(change as string) < 0 ? '#16a34a' : '#dc2626') }]}>
                        {change === "—" ? "—" : `${changeSign}${change} กก.`}
                      </PdfText>
                    </PdfView>
                  </PdfView>
                );
              })}
            </PdfView>
          </>
        )}

        {/* 7. ตารางบันทึกโภชนาการรายวัน */}
        <PdfText style={[styles.sectionTitle, { marginTop: 20 }]}>ประวัติการบันทึกโภชนาการรายวันย้อนหลัง</PdfText>
        <PdfView style={styles.table}>
          <PdfView style={[styles.tableRow, styles.tableHeaderRow]}>
             <PdfView style={styles.colDate}><PdfText style={styles.cellHeader}>วันที่ตรวจบันทึก</PdfText></PdfView>
             <PdfView style={styles.colCal}><PdfText style={[styles.cellHeader, { textAlign: 'right' }]}>พลังงาน (kcal)</PdfText></PdfView>
             <PdfView style={styles.colCarb}><PdfText style={[styles.cellHeader, { textAlign: 'right' }]}>คาร์โบไฮเดรต (g)</PdfText></PdfView>
          </PdfView>
          
          {!patientData.dailyNutrition || patientData.dailyNutrition.length === 0 ? (
            <PdfView style={styles.tableRow}>
              <PdfView style={{ width: "100%", padding: 12 }}>
                <PdfText style={{ fontSize: 9, textAlign: 'center', color: '#94a3b8' }}>ไม่พบข้อมูลการบันทึกโภชนาการ</PdfText>
              </PdfView>
            </PdfView>
          ) : (
            patientData.dailyNutrition.map((d, i) => {
              const dateObj = new Date(d.date);
              const formattedDate = isNaN(dateObj.getTime())
                ? d.date
                : dateObj.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

              return (
                <PdfView key={i} style={[styles.tableRow, styles.tableDataRow]}>
                  <PdfView style={styles.colDate}><PdfText style={styles.cellData}>{formattedDate}</PdfText></PdfView>
                  <PdfView style={styles.colCal}><PdfText style={styles.cellData}>{d.totalCal.toLocaleString()}</PdfText></PdfView>
                  <PdfView style={styles.colCarb}><PdfText style={styles.cellData}>{d.totalCarb.toLocaleString()}</PdfText></PdfView>
                </PdfView>
              );
            })
          )}
        </PdfView>

      </PdfPage>
    </PdfDocument>
  );
};

// ปุ่มหลักสำหรับดึงข้อมูลและดาวน์โหลด PDF
export default function PatientReportPDF({ 
  patientData, 
  doctorData, 
  currentRecord,
  targetCalories
}: PatientReportPDFProps) {
  const fileName = `รายงานการตรวจ_${patientData.firstName}_${new Date().toISOString().slice(0,10)}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ReportDocument 
          patientData={patientData} 
          doctorData={doctorData} 
          currentRecord={currentRecord}
          targetCalories={targetCalories}
        />
      }
      fileName={fileName}
      style={{
        inlineSize: "max-content",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "9px",
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#2563eb",
        fontSize: "13px",
        fontWeight: 600,
        textDecoration: "none",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {({ loading }) => (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {loading ? "กำลังบันทึกข้อมูลลง PDF..." : "ออกรายงาน PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}