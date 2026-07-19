import { useState, useMemo } from 'react';
import PlotlyChart from '../../components/PlotlyChart';
import { MapPin, AlertTriangle, TrendingUp, TrendingDown, Activity, Building2, Stethoscope, DollarSign, Calendar, ChevronRight, Map } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const nationalMonthlyTrend = [7.2, 7.4, 7.6, 7.8, 8.0, 8.2, 8.5, 8.3, 8.1, 7.9, 7.7, 7.5];

const STATE_DATA = [
  { code: 'AL', name: 'Alabama', fraudRate: 6.2, totalClaims: 28540, flaggedClaims: 1769, totalCost: 42810000, avgClaim: 1500, providers: 847, hospitals: 128, topICD: ['M54.5', 'E11.9', 'I10'], topFraudType: 'Upcoding', monthlyTrend: [5.8, 6.0, 6.1, 5.9, 6.3, 6.5, 6.2, 6.0, 6.1, 6.4, 6.3, 6.2] },
  { code: 'AK', name: 'Alaska', fraudRate: 2.8, totalClaims: 8920, flaggedClaims: 250, totalCost: 13380000, avgClaim: 1500, providers: 215, hospitals: 34, topICD: ['M54.5', 'J06.9', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [2.5, 2.7, 2.9, 2.6, 2.8, 3.0, 2.9, 2.7, 2.8, 2.9, 2.8, 2.8] },
  { code: 'AZ', name: 'Arizona', fraudRate: 7.1, totalClaims: 62300, flaggedClaims: 4423, totalCost: 93450000, avgClaim: 1500, providers: 1680, hospitals: 198, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [6.8, 7.0, 7.2, 6.9, 7.3, 7.5, 7.4, 7.1, 7.0, 7.2, 7.1, 7.1] },
  { code: 'AR', name: 'Arkansas', fraudRate: 5.4, totalClaims: 18600, flaggedClaims: 1004, totalCost: 27900000, avgClaim: 1500, providers: 580, hospitals: 89, topICD: ['M54.5', 'I10', 'E11.9'], topFraudType: 'Unbundling', monthlyTrend: [5.1, 5.3, 5.5, 5.2, 5.6, 5.8, 5.4, 5.3, 5.4, 5.5, 5.4, 5.4] },
  { code: 'CA', name: 'California', fraudRate: 12.4, totalClaims: 485000, flaggedClaims: 60140, totalCost: 727500000, avgClaim: 1500, providers: 12500, hospitals: 485, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [11.8, 12.0, 12.2, 12.1, 12.5, 12.8, 13.0, 12.8, 12.6, 12.3, 12.4, 12.4] },
  { code: 'CO', name: 'Colorado', fraudRate: 5.6, totalClaims: 45200, flaggedClaims: 2531, totalCost: 67800000, avgClaim: 1500, providers: 1320, hospitals: 142, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [5.3, 5.5, 5.7, 5.4, 5.8, 6.0, 5.8, 5.6, 5.5, 5.7, 5.6, 5.6] },
  { code: 'CT', name: 'Connecticut', fraudRate: 6.8, totalClaims: 32100, flaggedClaims: 2183, totalCost: 48150000, avgClaim: 1500, providers: 920, hospitals: 108, topICD: ['I10', 'E11.9', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [6.5, 6.7, 6.9, 6.6, 7.0, 7.2, 7.0, 6.8, 6.7, 6.9, 6.8, 6.8] },
  { code: 'DE', name: 'Delaware', fraudRate: 5.9, totalClaims: 10800, flaggedClaims: 637, totalCost: 16200000, avgClaim: 1500, providers: 320, hospitals: 28, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Unbundling', monthlyTrend: [5.6, 5.8, 6.0, 5.7, 6.1, 6.3, 6.0, 5.9, 5.8, 6.0, 5.9, 5.9] },
  { code: 'FL', name: 'Florida', fraudRate: 13.6, totalClaims: 312000, flaggedClaims: 42432, totalCost: 468000000, avgClaim: 1500, providers: 9800, hospitals: 395, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [13.0, 13.2, 13.4, 13.3, 13.7, 14.0, 14.2, 14.0, 13.8, 13.5, 13.6, 13.6] },
  { code: 'GA', name: 'Georgia', fraudRate: 9.5, totalClaims: 142000, flaggedClaims: 13490, totalCost: 213000000, avgClaim: 1500, providers: 3800, hospitals: 245, topICD: ['I10', 'E11.9', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [9.1, 9.3, 9.5, 9.2, 9.6, 9.9, 10.0, 9.8, 9.6, 9.4, 9.5, 9.5] },
  { code: 'HI', name: 'Hawaii', fraudRate: 3.2, totalClaims: 14200, flaggedClaims: 454, totalCost: 21300000, avgClaim: 1500, providers: 380, hospitals: 32, topICD: ['I10', 'E11.9', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [3.0, 3.1, 3.3, 3.0, 3.3, 3.5, 3.4, 3.2, 3.1, 3.3, 3.2, 3.2] },
  { code: 'ID', name: 'Idaho', fraudRate: 3.1, totalClaims: 12400, flaggedClaims: 384, totalCost: 18600000, avgClaim: 1500, providers: 340, hospitals: 42, topICD: ['M54.5', 'I10', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [2.9, 3.0, 3.2, 3.0, 3.2, 3.4, 3.3, 3.1, 3.0, 3.2, 3.1, 3.1] },
  { code: 'IL', name: 'Illinois', fraudRate: 8.9, totalClaims: 178000, flaggedClaims: 15842, totalCost: 267000000, avgClaim: 1500, providers: 4500, hospitals: 285, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [8.5, 8.7, 8.9, 8.6, 9.0, 9.3, 9.4, 9.1, 8.9, 8.8, 8.9, 8.9] },
  { code: 'IN', name: 'Indiana', fraudRate: 6.7, totalClaims: 58200, flaggedClaims: 3899, totalCost: 87300000, avgClaim: 1500, providers: 1620, hospitals: 168, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Unbundling', monthlyTrend: [6.4, 6.6, 6.8, 6.5, 6.9, 7.1, 6.9, 6.7, 6.6, 6.8, 6.7, 6.7] },
  { code: 'IA', name: 'Iowa', fraudRate: 3.8, totalClaims: 22400, flaggedClaims: 851, totalCost: 33600000, avgClaim: 1500, providers: 620, hospitals: 78, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [3.5, 3.7, 3.9, 3.6, 4.0, 4.2, 4.0, 3.8, 3.7, 3.9, 3.8, 3.8] },
  { code: 'KS', name: 'Kansas', fraudRate: 4.2, totalClaims: 21100, flaggedClaims: 886, totalCost: 31650000, avgClaim: 1500, providers: 580, hospitals: 72, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Unbundling', monthlyTrend: [3.9, 4.1, 4.3, 4.0, 4.4, 4.6, 4.4, 4.2, 4.1, 4.3, 4.2, 4.2] },
  { code: 'KY', name: 'Kentucky', fraudRate: 6.0, totalClaims: 33500, flaggedClaims: 2010, totalCost: 50250000, avgClaim: 1500, providers: 920, hospitals: 118, topICD: ['M54.5', 'E11.9', 'I10'], topFraudType: 'Upcoding', monthlyTrend: [5.7, 5.9, 6.1, 5.8, 6.2, 6.4, 6.2, 6.0, 5.9, 6.1, 6.0, 6.0] },
  { code: 'LA', name: 'Louisiana', fraudRate: 7.6, totalClaims: 38900, flaggedClaims: 2956, totalCost: 58350000, avgClaim: 1500, providers: 1080, hospitals: 135, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [7.3, 7.5, 7.7, 7.4, 7.8, 8.0, 7.8, 7.6, 7.5, 7.7, 7.6, 7.6] },
  { code: 'ME', name: 'Maine', fraudRate: 3.4, totalClaims: 15200, flaggedClaims: 517, totalCost: 22800000, avgClaim: 1500, providers: 410, hospitals: 38, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [3.1, 3.3, 3.5, 3.2, 3.6, 3.8, 3.6, 3.4, 3.3, 3.5, 3.4, 3.4] },
  { code: 'MD', name: 'Maryland', fraudRate: 7.3, totalClaims: 52400, flaggedClaims: 3825, totalCost: 78600000, avgClaim: 1500, providers: 1520, hospitals: 138, topICD: ['I10', 'E11.9', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [7.0, 7.2, 7.4, 7.1, 7.5, 7.7, 7.5, 7.3, 7.2, 7.4, 7.3, 7.3] },
  { code: 'MA', name: 'Massachusetts', fraudRate: 5.8, totalClaims: 58600, flaggedClaims: 3399, totalCost: 87900000, avgClaim: 1500, providers: 1780, hospitals: 142, topICD: ['I10', 'E11.9', 'M54.5'], topFraudType: 'Unbundling', monthlyTrend: [5.5, 5.7, 5.9, 5.6, 6.0, 6.2, 6.0, 5.8, 5.7, 5.9, 5.8, 5.8] },
  { code: 'MI', name: 'Michigan', fraudRate: 7.4, totalClaims: 125000, flaggedClaims: 9250, totalCost: 187500000, avgClaim: 1500, providers: 3400, hospitals: 225, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [7.1, 7.3, 7.5, 7.2, 7.6, 7.8, 7.6, 7.4, 7.3, 7.5, 7.4, 7.4] },
  { code: 'MN', name: 'Minnesota', fraudRate: 4.1, totalClaims: 44800, flaggedClaims: 1837, totalCost: 67200000, avgClaim: 1500, providers: 1280, hospitals: 132, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [3.8, 4.0, 4.2, 3.9, 4.3, 4.5, 4.3, 4.1, 4.0, 4.2, 4.1, 4.1] },
  { code: 'MS', name: 'Mississippi', fraudRate: 6.9, totalClaims: 20100, flaggedClaims: 1387, totalCost: 30150000, avgClaim: 1500, providers: 560, hospitals: 82, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [6.6, 6.8, 7.0, 6.7, 7.1, 7.3, 7.1, 6.9, 6.8, 7.0, 6.9, 6.9] },
  { code: 'MO', name: 'Missouri', fraudRate: 6.5, totalClaims: 48600, flaggedClaims: 3159, totalCost: 72900000, avgClaim: 1500, providers: 1380, hospitals: 152, topICD: ['I10', 'E11.9', 'M54.5'], topFraudType: 'Unbundling', monthlyTrend: [6.2, 6.4, 6.6, 6.3, 6.7, 6.9, 6.7, 6.5, 6.4, 6.6, 6.5, 6.5] },
  { code: 'MT', name: 'Montana', fraudRate: 2.2, totalClaims: 8900, flaggedClaims: 196, totalCost: 13350000, avgClaim: 1500, providers: 240, hospitals: 38, topICD: ['M54.5', 'I10', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [2.0, 2.1, 2.3, 2.0, 2.3, 2.5, 2.4, 2.2, 2.1, 2.3, 2.2, 2.2] },
  { code: 'NE', name: 'Nebraska', fraudRate: 3.5, totalClaims: 15800, flaggedClaims: 553, totalCost: 23700000, avgClaim: 1500, providers: 440, hospitals: 52, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [3.2, 3.4, 3.6, 3.3, 3.7, 3.9, 3.7, 3.5, 3.4, 3.6, 3.5, 3.5] },
  { code: 'NV', name: 'Nevada', fraudRate: 8.7, totalClaims: 38200, flaggedClaims: 3323, totalCost: 57300000, avgClaim: 1500, providers: 1080, hospitals: 62, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [8.3, 8.5, 8.7, 8.4, 8.8, 9.1, 9.2, 8.9, 8.7, 8.6, 8.7, 8.7] },
  { code: 'NH', name: 'New Hampshire', fraudRate: 3.3, totalClaims: 13200, flaggedClaims: 436, totalCost: 19800000, avgClaim: 1500, providers: 360, hospitals: 26, topICD: ['I10', 'M54.5', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [3.0, 3.2, 3.4, 3.1, 3.4, 3.6, 3.5, 3.3, 3.2, 3.4, 3.3, 3.3] },
  { code: 'NJ', name: 'New Jersey', fraudRate: 8.4, totalClaims: 82600, flaggedClaims: 6938, totalCost: 123900000, avgClaim: 1500, providers: 2680, hospitals: 178, topICD: ['I10', 'E11.9', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [8.0, 8.2, 8.4, 8.1, 8.5, 8.8, 8.9, 8.6, 8.4, 8.3, 8.4, 8.4] },
  { code: 'NM', name: 'New Mexico', fraudRate: 5.1, totalClaims: 17800, flaggedClaims: 908, totalCost: 26700000, avgClaim: 1500, providers: 480, hospitals: 48, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Unbundling', monthlyTrend: [4.8, 5.0, 5.2, 4.9, 5.3, 5.5, 5.3, 5.1, 5.0, 5.2, 5.1, 5.1] },
  { code: 'NY', name: 'New York', fraudRate: 11.2, totalClaims: 298000, flaggedClaims: 33376, totalCost: 447000000, avgClaim: 1500, providers: 8900, hospitals: 385, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [10.6, 10.8, 11.0, 10.9, 11.3, 11.6, 11.8, 11.5, 11.3, 11.1, 11.2, 11.2] },
  { code: 'NC', name: 'North Carolina', fraudRate: 7.8, totalClaims: 138000, flaggedClaims: 10764, totalCost: 207000000, avgClaim: 1500, providers: 3600, hospitals: 215, topICD: ['I10', 'E11.9', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [7.4, 7.6, 7.8, 7.5, 7.9, 8.2, 8.3, 8.0, 7.8, 7.7, 7.8, 7.8] },
  { code: 'ND', name: 'North Dakota', fraudRate: 2.0, totalClaims: 6100, flaggedClaims: 122, totalCost: 9150000, avgClaim: 1500, providers: 165, hospitals: 28, topICD: ['M54.5', 'I10', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [1.8, 1.9, 2.1, 1.8, 2.1, 2.3, 2.2, 2.0, 1.9, 2.1, 2.0, 2.0] },
  { code: 'OH', name: 'Ohio', fraudRate: 8.2, totalClaims: 165000, flaggedClaims: 13530, totalCost: 247500000, avgClaim: 1500, providers: 4200, hospitals: 265, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [7.8, 8.0, 8.2, 7.9, 8.3, 8.6, 8.7, 8.4, 8.2, 8.1, 8.2, 8.2] },
  { code: 'OK', name: 'Oklahoma', fraudRate: 5.7, totalClaims: 32100, flaggedClaims: 1830, totalCost: 48150000, avgClaim: 1500, providers: 880, hospitals: 112, topICD: ['M54.5', 'E11.9', 'I10'], topFraudType: 'Unbundling', monthlyTrend: [5.4, 5.6, 5.8, 5.5, 5.9, 6.1, 5.9, 5.7, 5.6, 5.8, 5.7, 5.7] },
  { code: 'OR', name: 'Oregon', fraudRate: 4.8, totalClaims: 34600, flaggedClaims: 1661, totalCost: 51900000, avgClaim: 1500, providers: 960, hospitals: 78, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [4.5, 4.7, 4.9, 4.6, 5.0, 5.2, 5.0, 4.8, 4.7, 4.9, 4.8, 4.8] },
  { code: 'PA', name: 'Pennsylvania', fraudRate: 9.8, totalClaims: 198000, flaggedClaims: 19404, totalCost: 297000000, avgClaim: 1500, providers: 5200, hospitals: 295, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [9.4, 9.6, 9.8, 9.5, 9.9, 10.2, 10.3, 10.0, 9.8, 9.7, 9.8, 9.8] },
  { code: 'RI', name: 'Rhode Island', fraudRate: 4.5, totalClaims: 9600, flaggedClaims: 432, totalCost: 14400000, avgClaim: 1500, providers: 280, hospitals: 18, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [4.2, 4.4, 4.6, 4.3, 4.7, 4.9, 4.7, 4.5, 4.4, 4.6, 4.5, 4.5] },
  { code: 'SC', name: 'South Carolina', fraudRate: 6.4, totalClaims: 41200, flaggedClaims: 2637, totalCost: 61800000, avgClaim: 1500, providers: 1120, hospitals: 108, topICD: ['I10', 'E11.9', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [6.1, 6.3, 6.5, 6.2, 6.6, 6.8, 6.6, 6.4, 6.3, 6.5, 6.4, 6.4] },
  { code: 'SD', name: 'South Dakota', fraudRate: 2.4, totalClaims: 7400, flaggedClaims: 178, totalCost: 11100000, avgClaim: 1500, providers: 195, hospitals: 32, topICD: ['M54.5', 'I10', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [2.1, 2.3, 2.5, 2.2, 2.5, 2.7, 2.6, 2.4, 2.3, 2.5, 2.4, 2.4] },
  { code: 'TN', name: 'Tennessee', fraudRate: 7.2, totalClaims: 60800, flaggedClaims: 4378, totalCost: 91200000, avgClaim: 1500, providers: 1680, hospitals: 162, topICD: ['E11.9', 'I10', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [6.9, 7.1, 7.3, 7.0, 7.4, 7.6, 7.4, 7.2, 7.1, 7.3, 7.2, 7.2] },
  { code: 'TX', name: 'Texas', fraudRate: 10.8, totalClaims: 378000, flaggedClaims: 40824, totalCost: 567000000, avgClaim: 1500, providers: 10200, hospitals: 435, topICD: ['E11.9', 'I10', 'J44.1'], topFraudType: 'Upcoding', monthlyTrend: [10.2, 10.4, 10.6, 10.5, 10.9, 11.2, 11.4, 11.1, 10.9, 10.7, 10.8, 10.8] },
  { code: 'UT', name: 'Utah', fraudRate: 3.6, totalClaims: 25200, flaggedClaims: 907, totalCost: 37800000, avgClaim: 1500, providers: 680, hospitals: 48, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [3.3, 3.5, 3.7, 3.4, 3.8, 4.0, 3.8, 3.6, 3.5, 3.7, 3.6, 3.6] },
  { code: 'VT', name: 'Vermont', fraudRate: 1.5, totalClaims: 3800, flaggedClaims: 57, totalCost: 5700000, avgClaim: 1500, providers: 95, hospitals: 14, topICD: ['I10', 'M54.5', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [1.3, 1.4, 1.6, 1.3, 1.6, 1.8, 1.7, 1.5, 1.4, 1.6, 1.5, 1.5] },
  { code: 'VA', name: 'Virginia', fraudRate: 6.6, totalClaims: 72400, flaggedClaims: 4778, totalCost: 108600000, avgClaim: 1500, providers: 2100, hospitals: 178, topICD: ['I10', 'E11.9', 'M54.5'], topFraudType: 'Upcoding', monthlyTrend: [6.3, 6.5, 6.7, 6.4, 6.8, 7.0, 6.8, 6.6, 6.5, 6.7, 6.6, 6.6] },
  { code: 'WA', name: 'Washington', fraudRate: 5.3, totalClaims: 68200, flaggedClaims: 3615, totalCost: 102300000, avgClaim: 1500, providers: 1880, hospitals: 118, topICD: ['I10', 'E11.9', 'M54.5'], topFraudType: 'Unbundling', monthlyTrend: [5.0, 5.2, 5.4, 5.1, 5.5, 5.7, 5.5, 5.3, 5.2, 5.4, 5.3, 5.3] },
  { code: 'WV', name: 'West Virginia', fraudRate: 5.5, totalClaims: 14600, flaggedClaims: 803, totalCost: 21900000, avgClaim: 1500, providers: 420, hospitals: 58, topICD: ['M54.5', 'E11.9', 'I10'], topFraudType: 'Upcoding', monthlyTrend: [5.2, 5.4, 5.6, 5.3, 5.7, 5.9, 5.7, 5.5, 5.4, 5.6, 5.5, 5.5] },
  { code: 'WI', name: 'Wisconsin', fraudRate: 4.6, totalClaims: 49800, flaggedClaims: 2291, totalCost: 74700000, avgClaim: 1500, providers: 1400, hospitals: 138, topICD: ['I10', 'M54.5', 'E11.9'], topFraudType: 'Phantom Billing', monthlyTrend: [4.3, 4.5, 4.7, 4.4, 4.8, 5.0, 4.8, 4.6, 4.5, 4.7, 4.6, 4.6] },
  { code: 'WY', name: 'Wyoming', fraudRate: 1.8, totalClaims: 4200, flaggedClaims: 76, totalCost: 6300000, avgClaim: 1500, providers: 110, hospitals: 18, topICD: ['M54.5', 'I10', 'Z00.00'], topFraudType: 'Phantom Billing', monthlyTrend: [1.5, 1.7, 1.9, 1.6, 1.9, 2.1, 2.0, 1.8, 1.7, 1.9, 1.8, 1.8] },
];

function getRiskColor(rate) {
  if (rate > 12) return '#ef4444';
  if (rate > 8) return '#f97316';
  if (rate > 4) return '#eab308';
  return '#22c55e';
}

function getRiskBadge(rate) {
  if (rate > 12) return { label: 'Critical', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' };
  if (rate > 8) return { label: 'High', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' };
  if (rate > 4) return { label: 'Medium', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' };
  return { label: 'Low', bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' };
}

export default function FraudHeatmap() {
  const [selectedState, setSelectedState] = useState(null);

  const sortedByRisk = useMemo(() => [...STATE_DATA].sort((a, b) => b.fraudRate - a.fraudRate), []);
  const top5 = useMemo(() => sortedByRisk.slice(0, 5), [sortedByRisk]);
  const bottom5 = useMemo(() => sortedByRisk.slice(-5).reverse(), [sortedByRisk]);
  const maxFraudRate = useMemo(() => Math.max(...STATE_DATA.map(s => s.fraudRate)), []);

  const totals = useMemo(() => {
    let totalClaims = 0;
    let totalFlagged = 0;
    let totalCost = 0;
    let totalProviders = 0;
    let totalHospitals = 0;
    STATE_DATA.forEach(s => {
      totalClaims += s.totalClaims;
      totalFlagged += s.flaggedClaims;
      totalCost += s.totalCost;
      totalProviders += s.providers;
      totalHospitals += s.hospitals;
    });
    const avgRate = STATE_DATA.reduce((sum, s) => sum + s.fraudRate, 0) / STATE_DATA.length;
    return { totalClaims, totalFlagged, totalCost, avgRate, totalProviders, totalHospitals };
  }, []);

  const peakMonth = useMemo(() => {
    let maxVal = 0;
    let maxIdx = 0;
    nationalMonthlyTrend.forEach((v, i) => {
      if (v > maxVal) { maxVal = v; maxIdx = i; }
    });
    return { label: monthLabels[maxIdx], value: maxVal };
  }, []);

  const detail = selectedState ? STATE_DATA.find(s => s.code === selectedState) : null;
  const detailBadge = detail ? getRiskBadge(detail.fraudRate) : null;

  const handleMapClick = (point) => {
    if (point && point.location) {
      const clicked = STATE_DATA.find(s => s.code === point.location);
      if (clicked) setSelectedState(clicked.code);
    }
  };

  const mapData = [{
    type: 'choropleth',
    locationmode: 'USA-states',
    locations: STATE_DATA.map(s => s.code),
    z: STATE_DATA.map(s => s.fraudRate),
    text: STATE_DATA.map(s => `${s.name}\nFraud Rate: ${s.fraudRate.toFixed(1)}%\nTotal Claims: ${s.totalClaims.toLocaleString()}\nFlagged: ${s.flaggedClaims.toLocaleString()}`),
    hoverinfo: 'text',
    colorscale: [
      [0, '#064e3b'],
      [0.25, '#059669'],
      [0.5, '#f59e0b'],
      [0.75, '#ea580c'],
      [1, '#dc2626']
    ],
    colorbar: {
      title: { text: 'Fraud Rate %', font: { color: '#94a3b8', size: 11 } },
      tickfont: { color: '#94a3b8' },
      thickness: 15,
      len: 0.6,
      bgcolor: 'transparent',
      outlinewidth: 0
    },
    marker: { line: { color: '#1e293b', width: 1 } }
  }];

  const mapLayout = {
    geo: {
      scope: 'usa',
      showlakes: true,
      lakecolor: 'rgb(11, 15, 25)',
      bgcolor: 'transparent',
      landcolor: '#1e293b',
      subunitcolor: '#334155',
      countrycolor: '#334155',
      projection: { type: 'albers usa' }
    },
    margin: { t: 10, r: 10, l: 10, b: 10 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    dragmode: false,
    height: 520
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#4f46e5]/10 text-[#818cf8]">
              <Map size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#f8fafc]">Geographic Intelligence Center</h1>
              <p className="text-sm text-[#94a3b8]">Interactive USA Fraud Distribution Analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">National Fraud Rate</span>
          </div>
          <p className="text-3xl font-black text-[#f8fafc]">{totals.avgRate.toFixed(1)}%</p>
          <p className="text-xs text-[#94a3b8] mt-1">Across {STATE_DATA.length} states</p>
        </div>
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-[#818cf8]/10 text-[#818cf8]">
              <DollarSign size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Average Claim Amount</span>
          </div>
          <p className="text-3xl font-black text-[#f8fafc]">$1,500</p>
          <p className="text-xs text-[#94a3b8] mt-1">Mean across all states</p>
        </div>
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Estimated National Financial Loss</span>
          </div>
          <p className="text-3xl font-black text-[#f8fafc]">{formatCurrency(totals.totalCost)}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Total flagged claims cost</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[70%]">
          <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-0 overflow-hidden">
            <div className="p-4 border-b border-[#1e293b]/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#f8fafc]">USA Fraud Distribution Choropleth</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-[#94a3b8]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Low</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Medium</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> High</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Critical</span>
              </div>
            </div>
            <div className="p-2">
              <PlotlyChart
                data={mapData}
                layout={mapLayout}
                onPointClick={handleMapClick}
                style={{ height: '520px' }}
              />
            </div>
          </div>
        </div>

        <div className="lg:w-[30%]">
          <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5 h-full max-h-[600px] overflow-y-auto custom-scrollbar">
            {!detail ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-[#818cf8]" />
                  <h3 className="text-sm font-bold text-[#f8fafc]">National Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Claims Nationwide</p>
                    <p className="text-xl font-black text-[#f8fafc] font-mono">{totals.totalClaims.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Flagged Claims</p>
                    <p className="text-xl font-black text-red-400 font-mono">{totals.totalFlagged.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Financial Impact</p>
                    <p className="text-xl font-black text-orange-400 font-mono">{formatCurrency(totals.totalCost)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Average Fraud Rate</p>
                    <p className="text-xl font-black text-yellow-400 font-mono">{totals.avgRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={12} className="text-[#94a3b8]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Providers</p>
                    </div>
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{totals.totalProviders.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope size={12} className="text-[#94a3b8]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Hospitals</p>
                    </div>
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{totals.totalHospitals.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-5 p-3 rounded-xl bg-[#818cf8]/5 border border-[#818cf8]/20 flex items-center gap-2">
                  <MapPin size={14} className="text-[#818cf8] flex-shrink-0" />
                  <p className="text-xs text-[#94a3b8]">Click on a state to view detailed fraud intelligence</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#818cf8]" />
                    <h3 className="text-sm font-bold text-[#f8fafc]">{detail.name}</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#1e293b] text-[#94a3b8]">{detail.code}</span>
                  </div>
                  <button
                    onClick={() => setSelectedState(null)}
                    className="text-[10px] font-bold text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
                  >
                    National
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#94a3b8]">Fraud Rate</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${detailBadge.bg} ${detailBadge.text} ${detailBadge.border}`}>
                      {detailBadge.label}
                    </span>
                  </div>
                  <p className="text-3xl font-black font-mono" style={{ color: getRiskColor(detail.fraudRate) }}>{detail.fraudRate.toFixed(1)}%</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Total Claims</span>
                    <span className="font-mono font-bold text-[#f8fafc] text-sm">{detail.totalClaims.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Flagged Claims</span>
                    <span className="font-mono font-bold text-red-400 text-sm">{detail.flaggedClaims.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Est. Financial Loss</span>
                    <span className="font-mono font-bold text-orange-400 text-sm">{formatCurrency(detail.totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Avg Claim Amount</span>
                    <span className="font-mono font-bold text-[#f8fafc] text-sm">${detail.avgClaim.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 text-center">
                    <Building2 size={14} className="text-[#94a3b8] mx-auto mb-1" />
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{detail.providers.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-[#94a3b8] uppercase">Providers</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 text-center">
                    <Stethoscope size={14} className="text-[#94a3b8] mx-auto mb-1" />
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{detail.hospitals}</p>
                    <p className="text-[9px] font-bold text-[#94a3b8] uppercase">Hospitals</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Most Common ICD-10 Codes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.topICD.map((code) => (
                      <span key={code} className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Top Fraud Type</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs font-bold text-red-400">{detail.topFraudType}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Monthly Fraud Trend</p>
                  <div className="bg-[#1e293b]/40 rounded-xl border border-[#1e293b]/60 p-1">
                    <PlotlyChart
                      data={[{
                        type: 'scatter',
                        mode: 'lines+markers',
                        x: monthLabels,
                        y: detail.monthlyTrend,
                        line: { color: '#818cf8', width: 2, shape: 'spline' },
                        marker: { size: 6, color: '#818cf8' },
                        fill: 'tozeroy',
                        fillcolor: 'rgba(129,140,248,0.1)'
                      }]}
                      layout={{
                        margin: { t: 8, r: 10, l: 35, b: 25 },
                        height: 140,
                        xaxis: { showgrid: false, tickfont: { size: 9 } },
                        yaxis: { tickfont: { size: 9 }, ticksuffix: '%' },
                        showlegend: false,
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-sm font-bold text-[#f8fafc]">Top 5 Risk States</h3>
          </div>
          <div className="space-y-3">
            {top5.map((s, i) => (
              <div key={s.code} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 cursor-pointer hover:border-[#818cf8]/30 transition-colors" onClick={() => setSelectedState(s.code)}>
                <span className="text-xs font-black text-[#94a3b8] w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#f8fafc]">{s.name}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: getRiskColor(s.fraudRate) }}>{s.fraudRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1.5 mb-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${(s.fraudRate / maxFraudRate) * 100}%`, backgroundColor: getRiskColor(s.fraudRate) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#94a3b8]">{s.totalClaims.toLocaleString()} claims</span>
                    <ChevronRight size={12} className="text-[#94a3b8]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-green-400" />
            <h3 className="text-sm font-bold text-[#f8fafc]">Bottom 5 Risk States</h3>
          </div>
          <div className="space-y-3">
            {bottom5.map((s, i) => (
              <div key={s.code} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 cursor-pointer hover:border-[#818cf8]/30 transition-colors" onClick={() => setSelectedState(s.code)}>
                <span className="text-xs font-black text-[#94a3b8] w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#f8fafc]">{s.name}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: getRiskColor(s.fraudRate) }}>{s.fraudRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1.5 mb-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${(s.fraudRate / maxFraudRate) * 100}%`, backgroundColor: getRiskColor(s.fraudRate) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#94a3b8]">{s.totalClaims.toLocaleString()} claims</span>
                    <ChevronRight size={12} className="text-[#94a3b8]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[#818cf8]" />
          <h3 className="text-sm font-bold text-[#f8fafc]">National Fraud Rate Trend (12 Months)</h3>
        </div>
        <PlotlyChart
          data={[{
            type: 'scatter',
            mode: 'lines+markers',
            x: monthLabels,
            y: nationalMonthlyTrend,
            line: { color: '#818cf8', width: 3, shape: 'spline' },
            marker: { size: 8, color: nationalMonthlyTrend.map(v => v === peakMonth.value ? '#ef4444' : '#818cf8'), line: { color: '#0f172a', width: 2 } },
            fill: 'tozeroy',
            fillcolor: 'rgba(129,140,248,0.08)',
            name: 'Fraud Rate',
            hovertemplate: '%{x}<br>Fraud Rate: %{y:.1f}%<extra></extra>'
          }]}
          layout={{
            margin: { t: 20, r: 30, l: 50, b: 40 },
            height: 300,
            xaxis: { showgrid: false, tickfont: { size: 11, color: '#94a3b8' } },
            yaxis: {
              tickfont: { size: 11, color: '#94a3b8' },
              ticksuffix: '%',
              gridcolor: 'rgba(71,85,105,0.3)'
            },
            showlegend: false,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            annotations: [{
              x: peakMonth.label,
              y: peakMonth.value,
              text: `Peak: ${peakMonth.value}%`,
              showarrow: true,
              arrowhead: 2,
              arrowcolor: '#ef4444',
              font: { size: 11, color: '#ef4444', family: 'monospace' },
              bgcolor: 'rgba(239,68,68,0.1)',
              bordercolor: '#ef4444',
              borderwidth: 1,
              borderpad: 4,
              ax: 0,
              ay: -40
            }]
          }}
        />
      </div>
    </div>
  );
}
