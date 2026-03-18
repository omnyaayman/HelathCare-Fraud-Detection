/* ===== MEDICAL REFERENCE DATA (CONSTANTS) ===== 
   هذه البيانات تظل ثابتة لأنها تُستخدم في القوائم المنسدلة (Dropdowns) 
   داخل صفحة تقديم المطالبات.
*/

export const ADMISSION_TYPES = [
  { id: 1, label: 'Elective' },
  { id: 2, label: 'Urgent' },
  { id: 3, label: 'Trauma' },
  { id: 4, label: 'Emergency' },
  { id: 5, label: 'Newborn' },
];

export const DIAGNOSES = [
  { code: 'A09', label: 'Infectious Gastroenteritis and Colitis' },
  { code: 'C50.919', label: 'Malignant Neoplasm of Breast' },
  { code: 'D50.9', label: 'Iron Deficiency Anemia' },
  { code: 'E11.9', label: 'Type 2 Diabetes Mellitus' },
  { code: 'E78.5', label: 'Hyperlipidemia, Unspecified' },
  { code: 'F32.9', label: 'Major Depressive Disorder' },
  { code: 'G40.909', label: 'Epilepsy, Unspecified' },
  { code: 'H25.9', label: 'Senile Cataract, Unspecified' },
  { code: 'I10', label: 'Essential Hypertension' },
  { code: 'I25.10', label: 'ASHD of Native Coronary Artery' },
  { code: 'J02.9', label: 'Acute Pharyngitis, Unspecified' },
  { code: 'J20.9', label: 'Acute Bronchitis' },
  { code: 'J45.909', label: 'Unspecified Asthma' },
  { code: 'K21.9', label: 'Gastro-Esophageal Reflux Disease' },
  { code: 'L20.9', label: 'Atopic Dermatitis' },
  { code: 'M17.9', label: 'Osteoarthritis of Knee' },
  { code: 'M54.5', label: 'Low Back Pain' },
  { code: 'N18.9', label: 'Chronic Kidney Disease' },
  { code: 'R05', label: 'Cough' },
  { code: 'Z00.00', label: 'General Adult Medical Examination' },
];

export const PROCEDURES = [
  { code: '71045', label: 'Chest X-ray, single view' },
  { code: '71046', label: 'Chest X-ray, 2 views' },
  { code: '80053', label: 'Comprehensive metabolic panel' },
  { code: '93000', label: 'ECG, 12 leads (Complete)' },
  { code: '93010', label: 'ECG, 12 leads (Interpretation)' },
  { code: '93040', label: 'Rhythm ECG, 1-3 leads' },
  { code: '93306', label: 'TTE with spectral and color Doppler' },
  { code: '93307', label: 'TTE complete (2D)' },
  { code: '93308', label: 'Echocardiography, follow-up' },
  { code: '93458', label: 'Left heart catheterization' },
  { code: '93571', label: 'Intravascular Doppler flow (1st vessel)' },
  { code: '93572', label: 'Intravascular Doppler flow (add-on)' },
  { code: '93600', label: 'Bundle of His recording' },
  { code: '93610', label: 'Intra-atrial pacing' },
  { code: '99203', label: 'Office visit, new patient (30-44 min)' },
  { code: '99204', label: 'Office visit, new patient (45-59 min)' },
  { code: '99213', label: 'Office visit, established patient (20-29 min)' },
  { code: '99214', label: 'Office visit, established patient (30-39 min)' },
  { code: '99283', label: 'Emergency dept visit (Moderate)' },
  { code: '99284', label: 'Emergency dept visit (High)' },
];

export const SERVICES = [
  { id: 1, label: 'Ambulance', cost: 491.50 },
  { id: 2, label: 'Emergency Room', cost: 500.45 },
  { id: 3, label: 'Inpatient', cost: 496.11 },
  { id: 4, label: 'Laboratory', cost: 502.79 },
  { id: 5, label: 'Outpatient', cost: 501.94 },
  { id: 6, label: 'Pharmacy', cost: 505.10 },
];

export const DISCHARGE_TYPES = [
  { id: 1, label: 'Rehab/Skilled Nursing' },
  { id: 2, label: 'Deceased' },
  { id: 3, label: 'Home' },
  { id: 4, label: 'Against Medical Advice' },
  { id: 5, label: 'Transfer to another facility' },
];

export const PROVIDER_TYPES = ['Hospital', 'Clinic', 'Urgent Care', 'Specialist Office', 'Surgery Center', 'Rehabilitation Center'];
export const SPECIALTIES = ['General Medicine', 'Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Pediatrics', 'Emergency Medicine', 'Dermatology', 'Gastroenterology', 'Pulmonology'];
export const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin'];
export const STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'GA', 'NC'];