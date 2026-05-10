import type { Position, ShiftType, Employee, ScheduleEntry } from '../types/index';

export const POSITIONS: Position[] = [
  { id: '1', code: 'BSM', name: 'Branch Store Manager', minRequired: 1 },
  { id: '2', code: 'ABSM', name: 'Asst. Branch Store Manager', minRequired: 1 },
  { id: '3', code: 'Cashier', name: 'Cashier', minRequired: 2 },
  { id: '4', code: 'Trainer', name: 'Trainer', minRequired: 1 },
  { id: '5', code: 'PIS', name: 'Product Information Specialist', minRequired: 2 },
];

export const SHIFT_TYPES: ShiftType[] = [
  { id: 'm1', code: 'M1', name: 'Morning 1', startTime: '09:45', endTime: '18:45', color: '#3B82F6', requiresApproval: false, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 3, category: 'morning' },
  { id: 'm2', code: 'M2', name: 'Morning 2', startTime: '11:00', endTime: '20:00', color: '#60A5FA', requiresApproval: false, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 2, category: 'morning' },
  { id: 'a1', code: 'A1', name: 'Afternoon 1', startTime: '12:00', endTime: '21:00', color: '#818CF8', requiresApproval: false, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 3, category: 'afternoon' },
  { id: 'a2', code: 'A2', name: 'Afternoon 2', startTime: '13:00', endTime: '22:00', color: '#A78BFA', requiresApproval: false, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 2, category: 'afternoon' },
  { id: 'o', code: 'O', name: 'Office', startTime: '09:00', endTime: '18:00', color: '#94A3B8', requiresApproval: false, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 1, category: 'other' },
  { id: 'xc', code: 'XC', name: 'Day Off', startTime: '-', endTime: '-', color: '#F87171', requiresApproval: true, requiresReason: true, requiresEvidence: true, isVisible: true, targetStaff: 0 },
  { id: 'ev', code: 'EV', name: 'Event', startTime: '10:00', endTime: '22:00', color: '#FBBF24', requiresApproval: true, requiresReason: true, requiresEvidence: false, isVisible: true, targetStaff: 0 },
  { id: 'at2', code: 'AT2', name: 'Training 2', startTime: '14:00', endTime: '21:00', color: '#10B981', requiresApproval: true, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 0 },
  { id: 'at3', code: 'AT3', name: 'Training 3', startTime: '13:00', endTime: '22:00', color: '#059669', requiresApproval: true, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 0 },
  { id: 'ba2', code: 'B-A2', name: 'Big Cleaning', startTime: '14:00', endTime: '23:00', color: '#EC4899', requiresApproval: true, requiresReason: false, requiresEvidence: false, isVisible: true, targetStaff: 0 },
  { id: 'v', code: 'V', name: 'Vacation', startTime: '-', endTime: '-', color: '#6366F1', requiresApproval: true, requiresReason: true, requiresEvidence: false, isVisible: true, targetStaff: 0 },
  { id: 'sick', code: 'ป่วย', name: 'Sick Leave', startTime: '-', endTime: '-', color: '#EF4444', requiresApproval: true, requiresReason: true, requiresEvidence: true, isVisible: true, targetStaff: 0 },
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    "id": "e7",
    "employeeCode": "3653",
    "fullName": "ฐปนรรฆ์ ศิรสิทธิวงศ์",
    "positionId": "1",
    "role": "manager",
    "email": "user7@example.com"
  },
  {
    "id": "e8",
    "employeeCode": "7479",
    "fullName": "บดินทร์ บรมพิชัยชาติกุล",
    "positionId": "1",
    "role": "manager",
    "email": "user8@example.com"
  },
  {
    "id": "e9",
    "employeeCode": "23510",
    "fullName": "วรัทยา สิงห์ตั้น",
    "positionId": "3",
    "role": "employee",
    "email": "user9@example.com"
  },
  {
    "id": "e11",
    "employeeCode": "12448",
    "fullName": "ณัฐทิณี เนตรจันทร์",
    "positionId": "4",
    "role": "employee",
    "email": "user11@example.com"
  },
  {
    "id": "e12",
    "employeeCode": "23648",
    "fullName": "ปรารถนา อิสรานุวงษา",
    "positionId": "3",
    "role": "employee",
    "email": "user12@example.com"
  },
  {
    "id": "e13",
    "employeeCode": "25622",
    "fullName": "กิตติ นิพิทชยานันท์",
    "positionId": "5",
    "role": "employee",
    "email": "user13@example.com"
  },
  {
    "id": "e14",
    "employeeCode": "20618",
    "fullName": "มินตรา ศรีทองคำ",
    "positionId": "5",
    "role": "employee",
    "email": "user14@example.com"
  },
  {
    "id": "e15",
    "employeeCode": "26022",
    "fullName": "โชคชัย บุญรอด",
    "positionId": "3",
    "role": "employee",
    "email": "user15@example.com"
  },
  {
    "id": "e16",
    "employeeCode": "26698",
    "fullName": "ปาภาวริน  วีระบรรณ",
    "positionId": "3",
    "role": "employee",
    "email": "user16@example.com"
  },
  {
    "id": "e18",
    "employeeCode": "7934",
    "fullName": "ฉมาภรณ์ สุทธิชา",
    "positionId": "3",
    "role": "employee",
    "email": "user18@example.com"
  },
  {
    "id": "e19",
    "employeeCode": "20258",
    "fullName": "ธันยพร อนุศรี",
    "positionId": "3",
    "role": "employee",
    "email": "user19@example.com"
  },
  {
    "id": "e20",
    "employeeCode": "21410",
    "fullName": "วรรณภา โพธาราม",
    "positionId": "3",
    "role": "employee",
    "email": "user20@example.com"
  },
  {
    "id": "e21",
    "employeeCode": "11384",
    "fullName": "กัญญภัทร ชุมประยูร",
    "positionId": "3",
    "role": "employee",
    "email": "user21@example.com"
  },
  {
    "id": "e23",
    "employeeCode": "18674",
    "fullName": "ธีรพงษ์ ไพรราม",
    "positionId": "3",
    "role": "employee",
    "email": "user23@example.com"
  },
  {
    "id": "e24",
    "employeeCode": "13995",
    "fullName": "สถิตคุณ รณชัยธนะ",
    "positionId": "3",
    "role": "employee",
    "email": "user24@example.com"
  },
  {
    "id": "e25",
    "employeeCode": "18042",
    "fullName": "ต่อศักดิ์ แก้วพลอย",
    "positionId": "3",
    "role": "employee",
    "email": "user25@example.com"
  },
  {
    "id": "e26",
    "employeeCode": "25580",
    "fullName": "ศรัณญู วาราวาสน์",
    "positionId": "3",
    "role": "employee",
    "email": "user26@example.com"
  },
  {
    "id": "e29",
    "employeeCode": "12569",
    "fullName": "ทศพล เจริญอำนวยสุข",
    "positionId": "3",
    "role": "employee",
    "email": "user29@example.com"
  },
  {
    "id": "e30",
    "employeeCode": "6917",
    "fullName": "ณฐนน นฤพลตระกูล",
    "positionId": "3",
    "role": "employee",
    "email": "user30@example.com"
  },
  {
    "id": "e31",
    "employeeCode": "13549",
    "fullName": "บรรเจิด ทองเกิด",
    "positionId": "3",
    "role": "employee",
    "email": "user31@example.com"
  },
  {
    "id": "e32",
    "employeeCode": "23133",
    "fullName": "พิเศษ หุ่นไธสง",
    "positionId": "3",
    "role": "employee",
    "email": "user32@example.com"
  },
  {
    "id": "e34",
    "employeeCode": "เบล",
    "fullName": "พงศกร ไชยวาน (เบล)",
    "positionId": "3",
    "role": "employee",
    "email": "user34@example.com"
  },
  {
    "id": "e35",
    "employeeCode": "ติ๊ก",
    "fullName": "มธุรศ จันโอทาน (ติ๊ก)",
    "positionId": "3",
    "role": "employee",
    "email": "user35@example.com"
  },
  {
    "id": "e37",
    "employeeCode": "27548",
    "fullName": "สุมาลี ศรีใจ (ทราย)",
    "positionId": "3",
    "role": "employee",
    "email": "user37@example.com"
  },
  {
    "id": "e38",
    "employeeCode": "26539",
    "fullName": "สุนิตา หน่อใจ (มิ้น)",
    "positionId": "3",
    "role": "employee",
    "email": "user38@example.com"
  },
  {
    "id": "e39",
    "employeeCode": "26568",
    "fullName": "สุภาวิณี แขวงชล(มุก)",
    "positionId": "3",
    "role": "employee",
    "email": "user39@example.com"
  },
  {
    "id": "e40",
    "employeeCode": "26528",
    "fullName": "ธนภัทร เจตนภิวัฒน์ (ภัทร)",
    "positionId": "3",
    "role": "employee",
    "email": "user40@example.com"
  },
  {
    "id": "e41",
    "employeeCode": "26529",
    "fullName": "ธนาภรณ์ เตะสินทวี (เกล)",
    "positionId": "3",
    "role": "employee",
    "email": "user41@example.com"
  }
];

export const MOCK_SCHEDULES: ScheduleEntry[] = [
  {
    "id": "s-e7-1",
    "employeeId": "e7",
    "date": "2026-05-01",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e7-2",
    "employeeId": "e7",
    "date": "2026-05-02",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e7-3",
    "employeeId": "e7",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-4",
    "employeeId": "e7",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e7-5",
    "employeeId": "e7",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-6",
    "employeeId": "e7",
    "date": "2026-05-06",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-7",
    "employeeId": "e7",
    "date": "2026-05-07",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-8",
    "employeeId": "e7",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e7-9",
    "employeeId": "e7",
    "date": "2026-05-09",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e7-10",
    "employeeId": "e7",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-11",
    "employeeId": "e7",
    "date": "2026-05-11",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-12",
    "employeeId": "e7",
    "date": "2026-05-12",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-13",
    "employeeId": "e7",
    "date": "2026-05-13",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-14",
    "employeeId": "e7",
    "date": "2026-05-14",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-15",
    "employeeId": "e7",
    "date": "2026-05-15",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e7-16",
    "employeeId": "e7",
    "date": "2026-05-16",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e7-17",
    "employeeId": "e7",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-18",
    "employeeId": "e7",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-19",
    "employeeId": "e7",
    "date": "2026-05-19",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-20",
    "employeeId": "e7",
    "date": "2026-05-20",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e7-21",
    "employeeId": "e7",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e7-22",
    "employeeId": "e7",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e7-23",
    "employeeId": "e7",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-24",
    "employeeId": "e7",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-25",
    "employeeId": "e7",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e7-26",
    "employeeId": "e7",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-27",
    "employeeId": "e7",
    "date": "2026-05-27",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-28",
    "employeeId": "e7",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e7-29",
    "employeeId": "e7",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-1",
    "employeeId": "e8",
    "date": "2026-05-01",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e8-2",
    "employeeId": "e8",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-3",
    "employeeId": "e8",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-4",
    "employeeId": "e8",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e8-5",
    "employeeId": "e8",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-6",
    "employeeId": "e8",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-7",
    "employeeId": "e8",
    "date": "2026-05-07",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-8",
    "employeeId": "e8",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e8-9",
    "employeeId": "e8",
    "date": "2026-05-09",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-10",
    "employeeId": "e8",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-11",
    "employeeId": "e8",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-12",
    "employeeId": "e8",
    "date": "2026-05-12",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e8-13",
    "employeeId": "e8",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-14",
    "employeeId": "e8",
    "date": "2026-05-14",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-15",
    "employeeId": "e8",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e8-16",
    "employeeId": "e8",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-17",
    "employeeId": "e8",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e8-18",
    "employeeId": "e8",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-19",
    "employeeId": "e8",
    "date": "2026-05-19",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-20",
    "employeeId": "e8",
    "date": "2026-05-20",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e8-21",
    "employeeId": "e8",
    "date": "2026-05-21",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-22",
    "employeeId": "e8",
    "date": "2026-05-22",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e8-23",
    "employeeId": "e8",
    "date": "2026-05-23",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-24",
    "employeeId": "e8",
    "date": "2026-05-24",
    "shiftTypeId": "v",
    "status": "approved"
  },
  {
    "id": "s-e8-25",
    "employeeId": "e8",
    "date": "2026-05-25",
    "shiftTypeId": "v",
    "status": "approved"
  },
  {
    "id": "s-e8-26",
    "employeeId": "e8",
    "date": "2026-05-26",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e8-27",
    "employeeId": "e8",
    "date": "2026-05-27",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e8-28",
    "employeeId": "e8",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e8-29",
    "employeeId": "e8",
    "date": "2026-05-29",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-1",
    "employeeId": "e9",
    "date": "2026-05-01",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-2",
    "employeeId": "e9",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-3",
    "employeeId": "e9",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-4",
    "employeeId": "e9",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e9-5",
    "employeeId": "e9",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-6",
    "employeeId": "e9",
    "date": "2026-05-06",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-7",
    "employeeId": "e9",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e9-8",
    "employeeId": "e9",
    "date": "2026-05-08",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e9-9",
    "employeeId": "e9",
    "date": "2026-05-09",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e9-10",
    "employeeId": "e9",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-11",
    "employeeId": "e9",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-12",
    "employeeId": "e9",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e9-13",
    "employeeId": "e9",
    "date": "2026-05-13",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-14",
    "employeeId": "e9",
    "date": "2026-05-14",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e9-15",
    "employeeId": "e9",
    "date": "2026-05-15",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-16",
    "employeeId": "e9",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-17",
    "employeeId": "e9",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-18",
    "employeeId": "e9",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-19",
    "employeeId": "e9",
    "date": "2026-05-19",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-20",
    "employeeId": "e9",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e9-21",
    "employeeId": "e9",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e9-22",
    "employeeId": "e9",
    "date": "2026-05-22",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-23",
    "employeeId": "e9",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-24",
    "employeeId": "e9",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-25",
    "employeeId": "e9",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-26",
    "employeeId": "e9",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e9-27",
    "employeeId": "e9",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e9-28",
    "employeeId": "e9",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e9-29",
    "employeeId": "e9",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-1",
    "employeeId": "e11",
    "date": "2026-05-01",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e11-2",
    "employeeId": "e11",
    "date": "2026-05-02",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-3",
    "employeeId": "e11",
    "date": "2026-05-03",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-4",
    "employeeId": "e11",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e11-5",
    "employeeId": "e11",
    "date": "2026-05-05",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-6",
    "employeeId": "e11",
    "date": "2026-05-06",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e11-7",
    "employeeId": "e11",
    "date": "2026-05-07",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e11-8",
    "employeeId": "e11",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e11-9",
    "employeeId": "e11",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e11-10",
    "employeeId": "e11",
    "date": "2026-05-10",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-11",
    "employeeId": "e11",
    "date": "2026-05-11",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-12",
    "employeeId": "e11",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e11-13",
    "employeeId": "e11",
    "date": "2026-05-13",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-14",
    "employeeId": "e11",
    "date": "2026-05-14",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e11-15",
    "employeeId": "e11",
    "date": "2026-05-15",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e11-16",
    "employeeId": "e11",
    "date": "2026-05-16",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-17",
    "employeeId": "e11",
    "date": "2026-05-17",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-18",
    "employeeId": "e11",
    "date": "2026-05-18",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e11-19",
    "employeeId": "e11",
    "date": "2026-05-19",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-20",
    "employeeId": "e11",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e11-21",
    "employeeId": "e11",
    "date": "2026-05-21",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-22",
    "employeeId": "e11",
    "date": "2026-05-22",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e11-23",
    "employeeId": "e11",
    "date": "2026-05-23",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-24",
    "employeeId": "e11",
    "date": "2026-05-24",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-25",
    "employeeId": "e11",
    "date": "2026-05-25",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e11-26",
    "employeeId": "e11",
    "date": "2026-05-26",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e11-27",
    "employeeId": "e11",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e11-28",
    "employeeId": "e11",
    "date": "2026-05-28",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e11-29",
    "employeeId": "e11",
    "date": "2026-05-29",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e12-1",
    "employeeId": "e12",
    "date": "2026-05-01",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e12-2",
    "employeeId": "e12",
    "date": "2026-05-02",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-3",
    "employeeId": "e12",
    "date": "2026-05-03",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-4",
    "employeeId": "e12",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e12-5",
    "employeeId": "e12",
    "date": "2026-05-05",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-6",
    "employeeId": "e12",
    "date": "2026-05-06",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-7",
    "employeeId": "e12",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e12-9",
    "employeeId": "e12",
    "date": "2026-05-09",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-10",
    "employeeId": "e12",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e12-12",
    "employeeId": "e12",
    "date": "2026-05-12",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-13",
    "employeeId": "e12",
    "date": "2026-05-13",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-14",
    "employeeId": "e12",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e12-15",
    "employeeId": "e12",
    "date": "2026-05-15",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e12-16",
    "employeeId": "e12",
    "date": "2026-05-16",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-17",
    "employeeId": "e12",
    "date": "2026-05-17",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-18",
    "employeeId": "e12",
    "date": "2026-05-18",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-19",
    "employeeId": "e12",
    "date": "2026-05-19",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-20",
    "employeeId": "e12",
    "date": "2026-05-20",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-21",
    "employeeId": "e12",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e12-22",
    "employeeId": "e12",
    "date": "2026-05-22",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e12-23",
    "employeeId": "e12",
    "date": "2026-05-23",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-24",
    "employeeId": "e12",
    "date": "2026-05-24",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-25",
    "employeeId": "e12",
    "date": "2026-05-25",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e12-26",
    "employeeId": "e12",
    "date": "2026-05-26",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-27",
    "employeeId": "e12",
    "date": "2026-05-27",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e12-28",
    "employeeId": "e12",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e12-29",
    "employeeId": "e12",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e13-1",
    "employeeId": "e13",
    "date": "2026-05-01",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-2",
    "employeeId": "e13",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-3",
    "employeeId": "e13",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-4",
    "employeeId": "e13",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e13-5",
    "employeeId": "e13",
    "date": "2026-05-05",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-6",
    "employeeId": "e13",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e13-7",
    "employeeId": "e13",
    "date": "2026-05-07",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-8",
    "employeeId": "e13",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e13-9",
    "employeeId": "e13",
    "date": "2026-05-09",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-11",
    "employeeId": "e13",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-12",
    "employeeId": "e13",
    "date": "2026-05-12",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-13",
    "employeeId": "e13",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e13-14",
    "employeeId": "e13",
    "date": "2026-05-14",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e13-15",
    "employeeId": "e13",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-16",
    "employeeId": "e13",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-17",
    "employeeId": "e13",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-18",
    "employeeId": "e13",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-19",
    "employeeId": "e13",
    "date": "2026-05-19",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-20",
    "employeeId": "e13",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e13-21",
    "employeeId": "e13",
    "date": "2026-05-21",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-22",
    "employeeId": "e13",
    "date": "2026-05-22",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-23",
    "employeeId": "e13",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-24",
    "employeeId": "e13",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-25",
    "employeeId": "e13",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e13-26",
    "employeeId": "e13",
    "date": "2026-05-26",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-27",
    "employeeId": "e13",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e13-28",
    "employeeId": "e13",
    "date": "2026-05-28",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e13-29",
    "employeeId": "e13",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-1",
    "employeeId": "e14",
    "date": "2026-05-01",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e14-2",
    "employeeId": "e14",
    "date": "2026-05-02",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-3",
    "employeeId": "e14",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-4",
    "employeeId": "e14",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e14-5",
    "employeeId": "e14",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-6",
    "employeeId": "e14",
    "date": "2026-05-06",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-7",
    "employeeId": "e14",
    "date": "2026-05-07",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e14-8",
    "employeeId": "e14",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e14-10",
    "employeeId": "e14",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-11",
    "employeeId": "e14",
    "date": "2026-05-11",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-12",
    "employeeId": "e14",
    "date": "2026-05-12",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-13",
    "employeeId": "e14",
    "date": "2026-05-13",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-14",
    "employeeId": "e14",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e14-15",
    "employeeId": "e14",
    "date": "2026-05-15",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e14-16",
    "employeeId": "e14",
    "date": "2026-05-16",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e14-17",
    "employeeId": "e14",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-18",
    "employeeId": "e14",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-19",
    "employeeId": "e14",
    "date": "2026-05-19",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-20",
    "employeeId": "e14",
    "date": "2026-05-20",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-21",
    "employeeId": "e14",
    "date": "2026-05-21",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-22",
    "employeeId": "e14",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e14-23",
    "employeeId": "e14",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-24",
    "employeeId": "e14",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-25",
    "employeeId": "e14",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e14-26",
    "employeeId": "e14",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-27",
    "employeeId": "e14",
    "date": "2026-05-27",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-28",
    "employeeId": "e14",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e14-29",
    "employeeId": "e14",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-1",
    "employeeId": "e15",
    "date": "2026-05-01",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-2",
    "employeeId": "e15",
    "date": "2026-05-02",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-3",
    "employeeId": "e15",
    "date": "2026-05-03",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-4",
    "employeeId": "e15",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e15-5",
    "employeeId": "e15",
    "date": "2026-05-05",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-6",
    "employeeId": "e15",
    "date": "2026-05-06",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-7",
    "employeeId": "e15",
    "date": "2026-05-07",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-8",
    "employeeId": "e15",
    "date": "2026-05-08",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-9",
    "employeeId": "e15",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-10",
    "employeeId": "e15",
    "date": "2026-05-10",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-11",
    "employeeId": "e15",
    "date": "2026-05-11",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-12",
    "employeeId": "e15",
    "date": "2026-05-12",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-13",
    "employeeId": "e15",
    "date": "2026-05-13",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-14",
    "employeeId": "e15",
    "date": "2026-05-14",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-15",
    "employeeId": "e15",
    "date": "2026-05-15",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-16",
    "employeeId": "e15",
    "date": "2026-05-16",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-17",
    "employeeId": "e15",
    "date": "2026-05-17",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e15-18",
    "employeeId": "e15",
    "date": "2026-05-18",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e15-19",
    "employeeId": "e15",
    "date": "2026-05-19",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-20",
    "employeeId": "e15",
    "date": "2026-05-20",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-21",
    "employeeId": "e15",
    "date": "2026-05-21",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-22",
    "employeeId": "e15",
    "date": "2026-05-22",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-23",
    "employeeId": "e15",
    "date": "2026-05-23",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-24",
    "employeeId": "e15",
    "date": "2026-05-24",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-25",
    "employeeId": "e15",
    "date": "2026-05-25",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-26",
    "employeeId": "e15",
    "date": "2026-05-26",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e15-27",
    "employeeId": "e15",
    "date": "2026-05-27",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-28",
    "employeeId": "e15",
    "date": "2026-05-28",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e15-29",
    "employeeId": "e15",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-1",
    "employeeId": "e16",
    "date": "2026-05-01",
    "shiftTypeId": "sick",
    "status": "approved"
  },
  {
    "id": "s-e16-2",
    "employeeId": "e16",
    "date": "2026-05-02",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-3",
    "employeeId": "e16",
    "date": "2026-05-03",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-4",
    "employeeId": "e16",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e16-5",
    "employeeId": "e16",
    "date": "2026-05-05",
    "shiftTypeId": "sick",
    "status": "approved"
  },
  {
    "id": "s-e16-6",
    "employeeId": "e16",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-7",
    "employeeId": "e16",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-8",
    "employeeId": "e16",
    "date": "2026-05-08",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-9",
    "employeeId": "e16",
    "date": "2026-05-09",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-10",
    "employeeId": "e16",
    "date": "2026-05-10",
    "shiftTypeId": "sick",
    "status": "approved"
  },
  {
    "id": "s-e16-11",
    "employeeId": "e16",
    "date": "2026-05-11",
    "shiftTypeId": "sick",
    "status": "approved"
  },
  {
    "id": "s-e16-12",
    "employeeId": "e16",
    "date": "2026-05-12",
    "shiftTypeId": "sick",
    "status": "approved"
  },
  {
    "id": "s-e16-13",
    "employeeId": "e16",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-14",
    "employeeId": "e16",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-15",
    "employeeId": "e16",
    "date": "2026-05-15",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-16",
    "employeeId": "e16",
    "date": "2026-05-16",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-17",
    "employeeId": "e16",
    "date": "2026-05-17",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-18",
    "employeeId": "e16",
    "date": "2026-05-18",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-19",
    "employeeId": "e16",
    "date": "2026-05-19",
    "shiftTypeId": "sick",
    "status": "approved"
  },
  {
    "id": "s-e16-20",
    "employeeId": "e16",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-21",
    "employeeId": "e16",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-22",
    "employeeId": "e16",
    "date": "2026-05-22",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-23",
    "employeeId": "e16",
    "date": "2026-05-23",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-24",
    "employeeId": "e16",
    "date": "2026-05-24",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-25",
    "employeeId": "e16",
    "date": "2026-05-25",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-26",
    "employeeId": "e16",
    "date": "2026-05-26",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e16-27",
    "employeeId": "e16",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-28",
    "employeeId": "e16",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e16-29",
    "employeeId": "e16",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e18-1",
    "employeeId": "e18",
    "date": "2026-05-01",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-2",
    "employeeId": "e18",
    "date": "2026-05-02",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-3",
    "employeeId": "e18",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-4",
    "employeeId": "e18",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e18-5",
    "employeeId": "e18",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-6",
    "employeeId": "e18",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e18-7",
    "employeeId": "e18",
    "date": "2026-05-07",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-8",
    "employeeId": "e18",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e18-9",
    "employeeId": "e18",
    "date": "2026-05-09",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-10",
    "employeeId": "e18",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-11",
    "employeeId": "e18",
    "date": "2026-05-11",
    "shiftTypeId": "v",
    "status": "approved"
  },
  {
    "id": "s-e18-12",
    "employeeId": "e18",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e18-13",
    "employeeId": "e18",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e18-14",
    "employeeId": "e18",
    "date": "2026-05-14",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-15",
    "employeeId": "e18",
    "date": "2026-05-15",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-16",
    "employeeId": "e18",
    "date": "2026-05-16",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-17",
    "employeeId": "e18",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-18",
    "employeeId": "e18",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-19",
    "employeeId": "e18",
    "date": "2026-05-19",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e18-20",
    "employeeId": "e18",
    "date": "2026-05-20",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e18-21",
    "employeeId": "e18",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e18-22",
    "employeeId": "e18",
    "date": "2026-05-22",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-23",
    "employeeId": "e18",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-24",
    "employeeId": "e18",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-25",
    "employeeId": "e18",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e18-26",
    "employeeId": "e18",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-27",
    "employeeId": "e18",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e18-28",
    "employeeId": "e18",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e18-29",
    "employeeId": "e18",
    "date": "2026-05-29",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-1",
    "employeeId": "e19",
    "date": "2026-05-01",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-2",
    "employeeId": "e19",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-3",
    "employeeId": "e19",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-4",
    "employeeId": "e19",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e19-5",
    "employeeId": "e19",
    "date": "2026-05-05",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-6",
    "employeeId": "e19",
    "date": "2026-05-06",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-7",
    "employeeId": "e19",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e19-9",
    "employeeId": "e19",
    "date": "2026-05-09",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-10",
    "employeeId": "e19",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-11",
    "employeeId": "e19",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-12",
    "employeeId": "e19",
    "date": "2026-05-12",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-13",
    "employeeId": "e19",
    "date": "2026-05-13",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-14",
    "employeeId": "e19",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e19-15",
    "employeeId": "e19",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-16",
    "employeeId": "e19",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-17",
    "employeeId": "e19",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-18",
    "employeeId": "e19",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-19",
    "employeeId": "e19",
    "date": "2026-05-19",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-20",
    "employeeId": "e19",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e19-21",
    "employeeId": "e19",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e19-22",
    "employeeId": "e19",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e19-23",
    "employeeId": "e19",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-24",
    "employeeId": "e19",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-25",
    "employeeId": "e19",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e19-26",
    "employeeId": "e19",
    "date": "2026-05-26",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-27",
    "employeeId": "e19",
    "date": "2026-05-27",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e19-28",
    "employeeId": "e19",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e19-29",
    "employeeId": "e19",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-1",
    "employeeId": "e20",
    "date": "2026-05-01",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e20-2",
    "employeeId": "e20",
    "date": "2026-05-02",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-3",
    "employeeId": "e20",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-4",
    "employeeId": "e20",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e20-5",
    "employeeId": "e20",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e20-6",
    "employeeId": "e20",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e20-7",
    "employeeId": "e20",
    "date": "2026-05-07",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e20-8",
    "employeeId": "e20",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e20-9",
    "employeeId": "e20",
    "date": "2026-05-09",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-10",
    "employeeId": "e20",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-11",
    "employeeId": "e20",
    "date": "2026-05-11",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-12",
    "employeeId": "e20",
    "date": "2026-05-12",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e20-13",
    "employeeId": "e20",
    "date": "2026-05-13",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e20-14",
    "employeeId": "e20",
    "date": "2026-05-14",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e20-15",
    "employeeId": "e20",
    "date": "2026-05-15",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e20-16",
    "employeeId": "e20",
    "date": "2026-05-16",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-17",
    "employeeId": "e20",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-18",
    "employeeId": "e20",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-19",
    "employeeId": "e20",
    "date": "2026-05-19",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e20-20",
    "employeeId": "e20",
    "date": "2026-05-20",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-21",
    "employeeId": "e20",
    "date": "2026-05-21",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e20-22",
    "employeeId": "e20",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e20-23",
    "employeeId": "e20",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-24",
    "employeeId": "e20",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-25",
    "employeeId": "e20",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e20-26",
    "employeeId": "e20",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e20-27",
    "employeeId": "e20",
    "date": "2026-05-27",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e20-28",
    "employeeId": "e20",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e20-29",
    "employeeId": "e20",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e21-1",
    "employeeId": "e21",
    "date": "2026-05-01",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-2",
    "employeeId": "e21",
    "date": "2026-05-02",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e21-3",
    "employeeId": "e21",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-4",
    "employeeId": "e21",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e21-5",
    "employeeId": "e21",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-6",
    "employeeId": "e21",
    "date": "2026-05-06",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-7",
    "employeeId": "e21",
    "date": "2026-05-07",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-8",
    "employeeId": "e21",
    "date": "2026-05-08",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-9",
    "employeeId": "e21",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e21-10",
    "employeeId": "e21",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-11",
    "employeeId": "e21",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-12",
    "employeeId": "e21",
    "date": "2026-05-12",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-13",
    "employeeId": "e21",
    "date": "2026-05-13",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-14",
    "employeeId": "e21",
    "date": "2026-05-14",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-15",
    "employeeId": "e21",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-16",
    "employeeId": "e21",
    "date": "2026-05-16",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e21-17",
    "employeeId": "e21",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-18",
    "employeeId": "e21",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-19",
    "employeeId": "e21",
    "date": "2026-05-19",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e21-20",
    "employeeId": "e21",
    "date": "2026-05-20",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e21-21",
    "employeeId": "e21",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e21-22",
    "employeeId": "e21",
    "date": "2026-05-22",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-23",
    "employeeId": "e21",
    "date": "2026-05-23",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e21-24",
    "employeeId": "e21",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-25",
    "employeeId": "e21",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-26",
    "employeeId": "e21",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e21-27",
    "employeeId": "e21",
    "date": "2026-05-27",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-28",
    "employeeId": "e21",
    "date": "2026-05-28",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e21-29",
    "employeeId": "e21",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-2",
    "employeeId": "e23",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-3",
    "employeeId": "e23",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-4",
    "employeeId": "e23",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e23-5",
    "employeeId": "e23",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-6",
    "employeeId": "e23",
    "date": "2026-05-06",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-7",
    "employeeId": "e23",
    "date": "2026-05-07",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-8",
    "employeeId": "e23",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e23-9",
    "employeeId": "e23",
    "date": "2026-05-09",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-10",
    "employeeId": "e23",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-11",
    "employeeId": "e23",
    "date": "2026-05-11",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e23-12",
    "employeeId": "e23",
    "date": "2026-05-12",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-13",
    "employeeId": "e23",
    "date": "2026-05-13",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-14",
    "employeeId": "e23",
    "date": "2026-05-14",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e23-15",
    "employeeId": "e23",
    "date": "2026-05-15",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e23-16",
    "employeeId": "e23",
    "date": "2026-05-16",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e23-17",
    "employeeId": "e23",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-18",
    "employeeId": "e23",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-19",
    "employeeId": "e23",
    "date": "2026-05-19",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-20",
    "employeeId": "e23",
    "date": "2026-05-20",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-21",
    "employeeId": "e23",
    "date": "2026-05-21",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-22",
    "employeeId": "e23",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e23-23",
    "employeeId": "e23",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-24",
    "employeeId": "e23",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-25",
    "employeeId": "e23",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e23-26",
    "employeeId": "e23",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-27",
    "employeeId": "e23",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e23-28",
    "employeeId": "e23",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e23-29",
    "employeeId": "e23",
    "date": "2026-05-29",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e24-1",
    "employeeId": "e24",
    "date": "2026-05-01",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e24-2",
    "employeeId": "e24",
    "date": "2026-05-02",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-3",
    "employeeId": "e24",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-4",
    "employeeId": "e24",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e24-5",
    "employeeId": "e24",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-6",
    "employeeId": "e24",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-7",
    "employeeId": "e24",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-8",
    "employeeId": "e24",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e24-9",
    "employeeId": "e24",
    "date": "2026-05-09",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-10",
    "employeeId": "e24",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-11",
    "employeeId": "e24",
    "date": "2026-05-11",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-12",
    "employeeId": "e24",
    "date": "2026-05-12",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-13",
    "employeeId": "e24",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-14",
    "employeeId": "e24",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-15",
    "employeeId": "e24",
    "date": "2026-05-15",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e24-16",
    "employeeId": "e24",
    "date": "2026-05-16",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-17",
    "employeeId": "e24",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-18",
    "employeeId": "e24",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-19",
    "employeeId": "e24",
    "date": "2026-05-19",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e24-20",
    "employeeId": "e24",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-21",
    "employeeId": "e24",
    "date": "2026-05-21",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e24-22",
    "employeeId": "e24",
    "date": "2026-05-22",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e24-23",
    "employeeId": "e24",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-24",
    "employeeId": "e24",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-25",
    "employeeId": "e24",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e24-26",
    "employeeId": "e24",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e24-27",
    "employeeId": "e24",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e24-28",
    "employeeId": "e24",
    "date": "2026-05-28",
    "shiftTypeId": "v",
    "status": "approved"
  },
  {
    "id": "s-e24-29",
    "employeeId": "e24",
    "date": "2026-05-29",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-1",
    "employeeId": "e25",
    "date": "2026-05-01",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e25-2",
    "employeeId": "e25",
    "date": "2026-05-02",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e25-3",
    "employeeId": "e25",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-4",
    "employeeId": "e25",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e25-5",
    "employeeId": "e25",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e25-6",
    "employeeId": "e25",
    "date": "2026-05-06",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-7",
    "employeeId": "e25",
    "date": "2026-05-07",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-8",
    "employeeId": "e25",
    "date": "2026-05-08",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-9",
    "employeeId": "e25",
    "date": "2026-05-09",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-10",
    "employeeId": "e25",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-11",
    "employeeId": "e25",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-12",
    "employeeId": "e25",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e25-13",
    "employeeId": "e25",
    "date": "2026-05-13",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-14",
    "employeeId": "e25",
    "date": "2026-05-14",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-15",
    "employeeId": "e25",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-16",
    "employeeId": "e25",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-17",
    "employeeId": "e25",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-18",
    "employeeId": "e25",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-19",
    "employeeId": "e25",
    "date": "2026-05-19",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e25-20",
    "employeeId": "e25",
    "date": "2026-05-20",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e25-21",
    "employeeId": "e25",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e25-22",
    "employeeId": "e25",
    "date": "2026-05-22",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-23",
    "employeeId": "e25",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-24",
    "employeeId": "e25",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-25",
    "employeeId": "e25",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e25-26",
    "employeeId": "e25",
    "date": "2026-05-26",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e25-27",
    "employeeId": "e25",
    "date": "2026-05-27",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-28",
    "employeeId": "e25",
    "date": "2026-05-28",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e25-29",
    "employeeId": "e25",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-1",
    "employeeId": "e26",
    "date": "2026-05-01",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-2",
    "employeeId": "e26",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-3",
    "employeeId": "e26",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-4",
    "employeeId": "e26",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e26-5",
    "employeeId": "e26",
    "date": "2026-05-05",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-6",
    "employeeId": "e26",
    "date": "2026-05-06",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-7",
    "employeeId": "e26",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e26-8",
    "employeeId": "e26",
    "date": "2026-05-08",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-9",
    "employeeId": "e26",
    "date": "2026-05-09",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-10",
    "employeeId": "e26",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-11",
    "employeeId": "e26",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-12",
    "employeeId": "e26",
    "date": "2026-05-12",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e26-13",
    "employeeId": "e26",
    "date": "2026-05-13",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e26-14",
    "employeeId": "e26",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e26-15",
    "employeeId": "e26",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-16",
    "employeeId": "e26",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-17",
    "employeeId": "e26",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-18",
    "employeeId": "e26",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-19",
    "employeeId": "e26",
    "date": "2026-05-19",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-20",
    "employeeId": "e26",
    "date": "2026-05-20",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-21",
    "employeeId": "e26",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e26-22",
    "employeeId": "e26",
    "date": "2026-05-22",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-23",
    "employeeId": "e26",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-24",
    "employeeId": "e26",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-25",
    "employeeId": "e26",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-26",
    "employeeId": "e26",
    "date": "2026-05-26",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e26-27",
    "employeeId": "e26",
    "date": "2026-05-27",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e26-28",
    "employeeId": "e26",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e26-29",
    "employeeId": "e26",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-1",
    "employeeId": "e29",
    "date": "2026-05-01",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e29-2",
    "employeeId": "e29",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-3",
    "employeeId": "e29",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-4",
    "employeeId": "e29",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e29-5",
    "employeeId": "e29",
    "date": "2026-05-05",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-6",
    "employeeId": "e29",
    "date": "2026-05-06",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-7",
    "employeeId": "e29",
    "date": "2026-05-07",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-8",
    "employeeId": "e29",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e29-9",
    "employeeId": "e29",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e29-10",
    "employeeId": "e29",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-11",
    "employeeId": "e29",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-12",
    "employeeId": "e29",
    "date": "2026-05-12",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e29-13",
    "employeeId": "e29",
    "date": "2026-05-13",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e29-14",
    "employeeId": "e29",
    "date": "2026-05-14",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-15",
    "employeeId": "e29",
    "date": "2026-05-15",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e29-16",
    "employeeId": "e29",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-17",
    "employeeId": "e29",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-18",
    "employeeId": "e29",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-19",
    "employeeId": "e29",
    "date": "2026-05-19",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-20",
    "employeeId": "e29",
    "date": "2026-05-20",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-21",
    "employeeId": "e29",
    "date": "2026-05-21",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-22",
    "employeeId": "e29",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e29-23",
    "employeeId": "e29",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-24",
    "employeeId": "e29",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-25",
    "employeeId": "e29",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e29-26",
    "employeeId": "e29",
    "date": "2026-05-26",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-27",
    "employeeId": "e29",
    "date": "2026-05-27",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-28",
    "employeeId": "e29",
    "date": "2026-05-28",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e29-29",
    "employeeId": "e29",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-1",
    "employeeId": "e30",
    "date": "2026-05-01",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-2",
    "employeeId": "e30",
    "date": "2026-05-02",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-3",
    "employeeId": "e30",
    "date": "2026-05-03",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-4",
    "employeeId": "e30",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e30-5",
    "employeeId": "e30",
    "date": "2026-05-05",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-6",
    "employeeId": "e30",
    "date": "2026-05-06",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-7",
    "employeeId": "e30",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-8",
    "employeeId": "e30",
    "date": "2026-05-08",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-9",
    "employeeId": "e30",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-10",
    "employeeId": "e30",
    "date": "2026-05-10",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-11",
    "employeeId": "e30",
    "date": "2026-05-11",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-12",
    "employeeId": "e30",
    "date": "2026-05-12",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-13",
    "employeeId": "e30",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-14",
    "employeeId": "e30",
    "date": "2026-05-14",
    "shiftTypeId": "at3",
    "status": "approved"
  },
  {
    "id": "s-e30-15",
    "employeeId": "e30",
    "date": "2026-05-15",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e30-16",
    "employeeId": "e30",
    "date": "2026-05-16",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-17",
    "employeeId": "e30",
    "date": "2026-05-17",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-18",
    "employeeId": "e30",
    "date": "2026-05-18",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-19",
    "employeeId": "e30",
    "date": "2026-05-19",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-20",
    "employeeId": "e30",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-21",
    "employeeId": "e30",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-22",
    "employeeId": "e30",
    "date": "2026-05-22",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-23",
    "employeeId": "e30",
    "date": "2026-05-23",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-24",
    "employeeId": "e30",
    "date": "2026-05-24",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-25",
    "employeeId": "e30",
    "date": "2026-05-25",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e30-26",
    "employeeId": "e30",
    "date": "2026-05-26",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-27",
    "employeeId": "e30",
    "date": "2026-05-27",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e30-28",
    "employeeId": "e30",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e30-29",
    "employeeId": "e30",
    "date": "2026-05-29",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-1",
    "employeeId": "e31",
    "date": "2026-05-01",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e31-2",
    "employeeId": "e31",
    "date": "2026-05-02",
    "shiftTypeId": "o",
    "status": "approved"
  },
  {
    "id": "s-e31-3",
    "employeeId": "e31",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-4",
    "employeeId": "e31",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e31-5",
    "employeeId": "e31",
    "date": "2026-05-05",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-6",
    "employeeId": "e31",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e31-7",
    "employeeId": "e31",
    "date": "2026-05-07",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-8",
    "employeeId": "e31",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e31-9",
    "employeeId": "e31",
    "date": "2026-05-09",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-10",
    "employeeId": "e31",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-11",
    "employeeId": "e31",
    "date": "2026-05-11",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-12",
    "employeeId": "e31",
    "date": "2026-05-12",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-13",
    "employeeId": "e31",
    "date": "2026-05-13",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-14",
    "employeeId": "e31",
    "date": "2026-05-14",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-15",
    "employeeId": "e31",
    "date": "2026-05-15",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-16",
    "employeeId": "e31",
    "date": "2026-05-16",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e31-17",
    "employeeId": "e31",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-18",
    "employeeId": "e31",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-19",
    "employeeId": "e31",
    "date": "2026-05-19",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-20",
    "employeeId": "e31",
    "date": "2026-05-20",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-21",
    "employeeId": "e31",
    "date": "2026-05-21",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-22",
    "employeeId": "e31",
    "date": "2026-05-22",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-23",
    "employeeId": "e31",
    "date": "2026-05-23",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e31-24",
    "employeeId": "e31",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-25",
    "employeeId": "e31",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e31-26",
    "employeeId": "e31",
    "date": "2026-05-26",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-27",
    "employeeId": "e31",
    "date": "2026-05-27",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e31-28",
    "employeeId": "e31",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e31-29",
    "employeeId": "e31",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e32-1",
    "employeeId": "e32",
    "date": "2026-05-01",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-2",
    "employeeId": "e32",
    "date": "2026-05-02",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-3",
    "employeeId": "e32",
    "date": "2026-05-03",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-4",
    "employeeId": "e32",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e32-5",
    "employeeId": "e32",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e32-6",
    "employeeId": "e32",
    "date": "2026-05-06",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-7",
    "employeeId": "e32",
    "date": "2026-05-07",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-8",
    "employeeId": "e32",
    "date": "2026-05-08",
    "shiftTypeId": "ba2",
    "status": "approved"
  },
  {
    "id": "s-e32-9",
    "employeeId": "e32",
    "date": "2026-05-09",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-10",
    "employeeId": "e32",
    "date": "2026-05-10",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-11",
    "employeeId": "e32",
    "date": "2026-05-11",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-12",
    "employeeId": "e32",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e32-13",
    "employeeId": "e32",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e32-14",
    "employeeId": "e32",
    "date": "2026-05-14",
    "shiftTypeId": "v",
    "status": "approved"
  },
  {
    "id": "s-e32-15",
    "employeeId": "e32",
    "date": "2026-05-15",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-16",
    "employeeId": "e32",
    "date": "2026-05-16",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-17",
    "employeeId": "e32",
    "date": "2026-05-17",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-18",
    "employeeId": "e32",
    "date": "2026-05-18",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-19",
    "employeeId": "e32",
    "date": "2026-05-19",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e32-20",
    "employeeId": "e32",
    "date": "2026-05-20",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-21",
    "employeeId": "e32",
    "date": "2026-05-21",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-22",
    "employeeId": "e32",
    "date": "2026-05-22",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-23",
    "employeeId": "e32",
    "date": "2026-05-23",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-24",
    "employeeId": "e32",
    "date": "2026-05-24",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-25",
    "employeeId": "e32",
    "date": "2026-05-25",
    "shiftTypeId": "m1",
    "status": "approved"
  },
  {
    "id": "s-e32-26",
    "employeeId": "e32",
    "date": "2026-05-26",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e32-27",
    "employeeId": "e32",
    "date": "2026-05-27",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-28",
    "employeeId": "e32",
    "date": "2026-05-28",
    "shiftTypeId": "a2",
    "status": "approved"
  },
  {
    "id": "s-e32-29",
    "employeeId": "e32",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e34-1",
    "employeeId": "e34",
    "date": "2026-05-01",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-2",
    "employeeId": "e34",
    "date": "2026-05-02",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-3",
    "employeeId": "e34",
    "date": "2026-05-03",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-4",
    "employeeId": "e34",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e34-5",
    "employeeId": "e34",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e34-6",
    "employeeId": "e34",
    "date": "2026-05-06",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-7",
    "employeeId": "e34",
    "date": "2026-05-07",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-8",
    "employeeId": "e34",
    "date": "2026-05-08",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-9",
    "employeeId": "e34",
    "date": "2026-05-09",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-10",
    "employeeId": "e34",
    "date": "2026-05-10",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-11",
    "employeeId": "e34",
    "date": "2026-05-11",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-12",
    "employeeId": "e34",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e34-13",
    "employeeId": "e34",
    "date": "2026-05-13",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-14",
    "employeeId": "e34",
    "date": "2026-05-14",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-15",
    "employeeId": "e34",
    "date": "2026-05-15",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-16",
    "employeeId": "e34",
    "date": "2026-05-16",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-17",
    "employeeId": "e34",
    "date": "2026-05-17",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-18",
    "employeeId": "e34",
    "date": "2026-05-18",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-19",
    "employeeId": "e34",
    "date": "2026-05-19",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e34-20",
    "employeeId": "e34",
    "date": "2026-05-20",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-21",
    "employeeId": "e34",
    "date": "2026-05-21",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-22",
    "employeeId": "e34",
    "date": "2026-05-22",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-23",
    "employeeId": "e34",
    "date": "2026-05-23",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-24",
    "employeeId": "e34",
    "date": "2026-05-24",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-25",
    "employeeId": "e34",
    "date": "2026-05-25",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e34-26",
    "employeeId": "e34",
    "date": "2026-05-26",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e34-27",
    "employeeId": "e34",
    "date": "2026-05-27",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-28",
    "employeeId": "e34",
    "date": "2026-05-28",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e34-29",
    "employeeId": "e34",
    "date": "2026-05-29",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-1",
    "employeeId": "e35",
    "date": "2026-05-01",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-2",
    "employeeId": "e35",
    "date": "2026-05-02",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-3",
    "employeeId": "e35",
    "date": "2026-05-03",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-4",
    "employeeId": "e35",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e35-5",
    "employeeId": "e35",
    "date": "2026-05-05",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-6",
    "employeeId": "e35",
    "date": "2026-05-06",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-7",
    "employeeId": "e35",
    "date": "2026-05-07",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-8",
    "employeeId": "e35",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e35-9",
    "employeeId": "e35",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e35-10",
    "employeeId": "e35",
    "date": "2026-05-10",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-11",
    "employeeId": "e35",
    "date": "2026-05-11",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-12",
    "employeeId": "e35",
    "date": "2026-05-12",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-13",
    "employeeId": "e35",
    "date": "2026-05-13",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-14",
    "employeeId": "e35",
    "date": "2026-05-14",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-15",
    "employeeId": "e35",
    "date": "2026-05-15",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e35-16",
    "employeeId": "e35",
    "date": "2026-05-16",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e35-17",
    "employeeId": "e35",
    "date": "2026-05-17",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-18",
    "employeeId": "e35",
    "date": "2026-05-18",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-19",
    "employeeId": "e35",
    "date": "2026-05-19",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-20",
    "employeeId": "e35",
    "date": "2026-05-20",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-21",
    "employeeId": "e35",
    "date": "2026-05-21",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-22",
    "employeeId": "e35",
    "date": "2026-05-22",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-23",
    "employeeId": "e35",
    "date": "2026-05-23",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e35-24",
    "employeeId": "e35",
    "date": "2026-05-24",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-25",
    "employeeId": "e35",
    "date": "2026-05-25",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e35-26",
    "employeeId": "e35",
    "date": "2026-05-26",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-27",
    "employeeId": "e35",
    "date": "2026-05-27",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-28",
    "employeeId": "e35",
    "date": "2026-05-28",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e35-29",
    "employeeId": "e35",
    "date": "2026-05-29",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-1",
    "employeeId": "e37",
    "date": "2026-05-01",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-2",
    "employeeId": "e37",
    "date": "2026-05-02",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-3",
    "employeeId": "e37",
    "date": "2026-05-03",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-4",
    "employeeId": "e37",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e37-5",
    "employeeId": "e37",
    "date": "2026-05-05",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-6",
    "employeeId": "e37",
    "date": "2026-05-06",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-7",
    "employeeId": "e37",
    "date": "2026-05-07",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e37-8",
    "employeeId": "e37",
    "date": "2026-05-08",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-9",
    "employeeId": "e37",
    "date": "2026-05-09",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-10",
    "employeeId": "e37",
    "date": "2026-05-10",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-11",
    "employeeId": "e37",
    "date": "2026-05-11",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-12",
    "employeeId": "e37",
    "date": "2026-05-12",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-13",
    "employeeId": "e37",
    "date": "2026-05-13",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-14",
    "employeeId": "e37",
    "date": "2026-05-14",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e37-15",
    "employeeId": "e37",
    "date": "2026-05-15",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-16",
    "employeeId": "e37",
    "date": "2026-05-16",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-17",
    "employeeId": "e37",
    "date": "2026-05-17",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-18",
    "employeeId": "e37",
    "date": "2026-05-18",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-19",
    "employeeId": "e37",
    "date": "2026-05-19",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e37-20",
    "employeeId": "e37",
    "date": "2026-05-20",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e37-21",
    "employeeId": "e37",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e37-22",
    "employeeId": "e37",
    "date": "2026-05-22",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-23",
    "employeeId": "e37",
    "date": "2026-05-23",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-24",
    "employeeId": "e37",
    "date": "2026-05-24",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-25",
    "employeeId": "e37",
    "date": "2026-05-25",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e37-26",
    "employeeId": "e37",
    "date": "2026-05-26",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-27",
    "employeeId": "e37",
    "date": "2026-05-27",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e37-28",
    "employeeId": "e37",
    "date": "2026-05-28",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e37-29",
    "employeeId": "e37",
    "date": "2026-05-29",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-1",
    "employeeId": "e38",
    "date": "2026-05-01",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-2",
    "employeeId": "e38",
    "date": "2026-05-02",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-3",
    "employeeId": "e38",
    "date": "2026-05-03",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-4",
    "employeeId": "e38",
    "date": "2026-05-04",
    "shiftTypeId": "v",
    "status": "approved"
  },
  {
    "id": "s-e38-5",
    "employeeId": "e38",
    "date": "2026-05-05",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e38-6",
    "employeeId": "e38",
    "date": "2026-05-06",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-7",
    "employeeId": "e38",
    "date": "2026-05-07",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-8",
    "employeeId": "e38",
    "date": "2026-05-08",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-9",
    "employeeId": "e38",
    "date": "2026-05-09",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-10",
    "employeeId": "e38",
    "date": "2026-05-10",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-11",
    "employeeId": "e38",
    "date": "2026-05-11",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e38-12",
    "employeeId": "e38",
    "date": "2026-05-12",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e38-13",
    "employeeId": "e38",
    "date": "2026-05-13",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-14",
    "employeeId": "e38",
    "date": "2026-05-14",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e38-15",
    "employeeId": "e38",
    "date": "2026-05-15",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e38-16",
    "employeeId": "e38",
    "date": "2026-05-16",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-17",
    "employeeId": "e38",
    "date": "2026-05-17",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-18",
    "employeeId": "e38",
    "date": "2026-05-18",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-19",
    "employeeId": "e38",
    "date": "2026-05-19",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e38-20",
    "employeeId": "e38",
    "date": "2026-05-20",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-21",
    "employeeId": "e38",
    "date": "2026-05-21",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-22",
    "employeeId": "e38",
    "date": "2026-05-22",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-23",
    "employeeId": "e38",
    "date": "2026-05-23",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-24",
    "employeeId": "e38",
    "date": "2026-05-24",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-25",
    "employeeId": "e38",
    "date": "2026-05-25",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e38-26",
    "employeeId": "e38",
    "date": "2026-05-26",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e38-27",
    "employeeId": "e38",
    "date": "2026-05-27",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-28",
    "employeeId": "e38",
    "date": "2026-05-28",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e38-29",
    "employeeId": "e38",
    "date": "2026-05-29",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-1",
    "employeeId": "e39",
    "date": "2026-05-01",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-2",
    "employeeId": "e39",
    "date": "2026-05-02",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-3",
    "employeeId": "e39",
    "date": "2026-05-03",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-4",
    "employeeId": "e39",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e39-5",
    "employeeId": "e39",
    "date": "2026-05-05",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-6",
    "employeeId": "e39",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e39-7",
    "employeeId": "e39",
    "date": "2026-05-07",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-8",
    "employeeId": "e39",
    "date": "2026-05-08",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-9",
    "employeeId": "e39",
    "date": "2026-05-09",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-10",
    "employeeId": "e39",
    "date": "2026-05-10",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-11",
    "employeeId": "e39",
    "date": "2026-05-11",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-12",
    "employeeId": "e39",
    "date": "2026-05-12",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e39-13",
    "employeeId": "e39",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e39-14",
    "employeeId": "e39",
    "date": "2026-05-14",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-15",
    "employeeId": "e39",
    "date": "2026-05-15",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-16",
    "employeeId": "e39",
    "date": "2026-05-16",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-17",
    "employeeId": "e39",
    "date": "2026-05-17",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-18",
    "employeeId": "e39",
    "date": "2026-05-18",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-19",
    "employeeId": "e39",
    "date": "2026-05-19",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-20",
    "employeeId": "e39",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e39-21",
    "employeeId": "e39",
    "date": "2026-05-21",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-22",
    "employeeId": "e39",
    "date": "2026-05-22",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-23",
    "employeeId": "e39",
    "date": "2026-05-23",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-24",
    "employeeId": "e39",
    "date": "2026-05-24",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-25",
    "employeeId": "e39",
    "date": "2026-05-25",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-26",
    "employeeId": "e39",
    "date": "2026-05-26",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e39-27",
    "employeeId": "e39",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e39-28",
    "employeeId": "e39",
    "date": "2026-05-28",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e39-29",
    "employeeId": "e39",
    "date": "2026-05-29",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-1",
    "employeeId": "e40",
    "date": "2026-05-01",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-2",
    "employeeId": "e40",
    "date": "2026-05-02",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-3",
    "employeeId": "e40",
    "date": "2026-05-03",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-4",
    "employeeId": "e40",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e40-5",
    "employeeId": "e40",
    "date": "2026-05-05",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-6",
    "employeeId": "e40",
    "date": "2026-05-06",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e40-7",
    "employeeId": "e40",
    "date": "2026-05-07",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-8",
    "employeeId": "e40",
    "date": "2026-05-08",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-9",
    "employeeId": "e40",
    "date": "2026-05-09",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-10",
    "employeeId": "e40",
    "date": "2026-05-10",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-11",
    "employeeId": "e40",
    "date": "2026-05-11",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-12",
    "employeeId": "e40",
    "date": "2026-05-12",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-13",
    "employeeId": "e40",
    "date": "2026-05-13",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e40-14",
    "employeeId": "e40",
    "date": "2026-05-14",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e40-15",
    "employeeId": "e40",
    "date": "2026-05-15",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e40-16",
    "employeeId": "e40",
    "date": "2026-05-16",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-17",
    "employeeId": "e40",
    "date": "2026-05-17",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-18",
    "employeeId": "e40",
    "date": "2026-05-18",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-19",
    "employeeId": "e40",
    "date": "2026-05-19",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e40-20",
    "employeeId": "e40",
    "date": "2026-05-20",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e40-21",
    "employeeId": "e40",
    "date": "2026-05-21",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e40-22",
    "employeeId": "e40",
    "date": "2026-05-22",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-23",
    "employeeId": "e40",
    "date": "2026-05-23",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-24",
    "employeeId": "e40",
    "date": "2026-05-24",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-25",
    "employeeId": "e40",
    "date": "2026-05-25",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e40-26",
    "employeeId": "e40",
    "date": "2026-05-26",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-27",
    "employeeId": "e40",
    "date": "2026-05-27",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e40-28",
    "employeeId": "e40",
    "date": "2026-05-28",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e40-29",
    "employeeId": "e40",
    "date": "2026-05-29",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-1",
    "employeeId": "e41",
    "date": "2026-05-01",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e41-2",
    "employeeId": "e41",
    "date": "2026-05-02",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-3",
    "employeeId": "e41",
    "date": "2026-05-03",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-4",
    "employeeId": "e41",
    "date": "2026-05-04",
    "shiftTypeId": "ev",
    "status": "approved"
  },
  {
    "id": "s-e41-5",
    "employeeId": "e41",
    "date": "2026-05-05",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-6",
    "employeeId": "e41",
    "date": "2026-05-06",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-7",
    "employeeId": "e41",
    "date": "2026-05-07",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-8",
    "employeeId": "e41",
    "date": "2026-05-08",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e41-9",
    "employeeId": "e41",
    "date": "2026-05-09",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e41-10",
    "employeeId": "e41",
    "date": "2026-05-10",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-11",
    "employeeId": "e41",
    "date": "2026-05-11",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-12",
    "employeeId": "e41",
    "date": "2026-05-12",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-13",
    "employeeId": "e41",
    "date": "2026-05-13",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-14",
    "employeeId": "e41",
    "date": "2026-05-14",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-15",
    "employeeId": "e41",
    "date": "2026-05-15",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e41-16",
    "employeeId": "e41",
    "date": "2026-05-16",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e41-17",
    "employeeId": "e41",
    "date": "2026-05-17",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-18",
    "employeeId": "e41",
    "date": "2026-05-18",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-19",
    "employeeId": "e41",
    "date": "2026-05-19",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e41-20",
    "employeeId": "e41",
    "date": "2026-05-20",
    "shiftTypeId": "at2",
    "status": "approved"
  },
  {
    "id": "s-e41-21",
    "employeeId": "e41",
    "date": "2026-05-21",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-22",
    "employeeId": "e41",
    "date": "2026-05-22",
    "shiftTypeId": "xc",
    "status": "approved"
  },
  {
    "id": "s-e41-23",
    "employeeId": "e41",
    "date": "2026-05-23",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-24",
    "employeeId": "e41",
    "date": "2026-05-24",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-25",
    "employeeId": "e41",
    "date": "2026-05-25",
    "shiftTypeId": "a1",
    "status": "approved"
  },
  {
    "id": "s-e41-26",
    "employeeId": "e41",
    "date": "2026-05-26",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-27",
    "employeeId": "e41",
    "date": "2026-05-27",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-28",
    "employeeId": "e41",
    "date": "2026-05-28",
    "shiftTypeId": "m2",
    "status": "approved"
  },
  {
    "id": "s-e41-29",
    "employeeId": "e41",
    "date": "2026-05-29",
    "shiftTypeId": "xc",
    "status": "approved"
  }
];
