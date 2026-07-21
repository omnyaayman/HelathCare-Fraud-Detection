import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Bell, AlertTriangle, ShieldAlert, Clock, User, Tag, Filter,
  Search, Check, X, ArrowUpRight, Activity, ShieldCheck, Flag,
  RefreshCw, FileText, MessageSquare, History, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Download, Eye, AlertCircle, Minus,
  Building2, Stethoscope, BrainCircuit, Sparkles, ExternalLink,
  CircleDot, CheckCircle2, XCircle, Ban, Send, BarChart3, Layers,
  Calendar, MapPin, Phone, DollarSign, MoreHorizontal, Square, CheckSquare,
} from "lucide-react";
import PlotlyChart from "../../components/PlotlyChart";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatCurrency, formatCompactCurrency, formatNumber } from "../../data/dataUtils";
import { CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_FRAUD_DIAGNOSES, CANONICAL_INVESTIGATORS } from "../../data/canonicalData";

const SYSTEM_NOW = new Date("2026-07-20T14:00:00");
const MODEL_VERSION = "v3.2.1";
const PAGE_SIZE = 10;

const INVESTIGATORS = [...CANONICAL_INVESTIGATORS];

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
const SEVERITY_CONFIG = {
  Critical: { color: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500", icon: AlertTriangle, score: 4, barColor: "bg-red-500", ring: "ring-red-500/30" },
  High:     { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", dot: "bg-orange-500", icon: ShieldAlert, score: 3, barColor: "bg-orange-500", ring: "ring-orange-500/30" },
  Medium:   { color: "bg-amber-400/10 text-amber-400 border-amber-400/20", dot: "bg-amber-400", icon: Activity, score: 2, barColor: "bg-amber-400", ring: "ring-amber-400/30" },
  Low:      { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", dot: "bg-blue-500", icon: Bell, score: 1, barColor: "bg-blue-500", ring: "ring-blue-500/30" },
};

const ALERT_STATUS = ["New", "Under Investigation", "Escalated", "Resolved"];
const RESOLUTION_OUTCOMES = ["Confirmed Fraud", "False Positive", "No Action Taken"];

const STATUS_COLORS = {
  "New":                  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Under Investigation":  "bg-amber-400/10 text-amber-400 border-amber-400/20",
  "Escalated":            "bg-red-500/10 text-red-400 border-red-500/20",
  "Resolved":             "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Confirmed Fraud":      "bg-red-500/10 text-red-400 border-red-500/20",
  "False Positive":       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "No Action Taken":      "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function timeAgo(date) {
  const diff = SYSTEM_NOW - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function slaBreached(alert) {
  if (alert.severity !== "Critical" || alert.assigned !== "Unassigned") return false;
  const hoursSinceCreation = (SYSTEM_NOW - new Date(alert.createdAt)) / 3600000;
  return hoursSinceCreation > 24;
}

const ALERTS_DATA = [
  {
    id: "ALT-1001", title: "Systematic Upcoding — E/M Level 5", severity: "Critical", status: "New",
    createdAt: "2026-07-20T12:15:00", assigned: "Unassigned",
    patientName: "Margaret Thompson", patientId: "PAT-001",
    providerName: "Metropolitan General Hospital", providerId: "PRV-001",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "99215", procedureDesc: "Office Visit — Level 5",
    claimId: "CLM-2026-200142", claimAmount: 12_400,
    reasonTags: ["Upcoding detected", "Billing pattern anomaly", "Provider outlier — 3x avg"],
    aiFactors: [
      { factor: "E/M Level 5 vs Documentation", weight: 42, detail: "Level 5 billed but documentation supports Level 3 at most" },
      { factor: "Provider Historical Pattern", weight: 31, detail: "Metropolitan General bills Level 5 at 4.2x peer average" },
      { factor: "Claim Amount Deviation", weight: 27, detail: "$12,400 vs $3,200 avg for M54.5 — 3.9x deviation" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T12:15:00", detail: "Upcoding pipeline detected Level 5 anomaly" },
    ],
  },
  {
    id: "ALT-1002", title: "Phantom Billing — Services on Holiday", severity: "Critical", status: "New",
    createdAt: "2026-07-20T11:42:00", assigned: "Unassigned",
    patientName: "Patricia Williams", patientId: "PAT-003",
    providerName: "St. Mary Medical Center", providerId: "PRV-002",
    diagnosisCode: "I25.10", diagnosisDesc: "Coronary Artery Disease",
    procedureCode: "93306", procedureDesc: "Echocardiogram — Complete",
    claimId: "CLM-2026-200138", claimAmount: 8_900,
    reasonTags: ["Phantom billing", "Holiday service date", "Facility closed"],
    aiFactors: [
      { factor: "Service Date Verification", weight: 48, detail: "Claims submitted for Jul 4 holiday — facility confirmed closed" },
      { factor: "Patient Location Check", weight: 28, detail: "Patient GPS data shows 200+ miles from facility on claimed date" },
      { factor: "Claim Volume Spike", weight: 24, detail: "142% increase in claims for this provider on holiday weekends" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T11:42:00", detail: "Phantom billing detected — holiday service date" },
    ],
  },
  {
    id: "ALT-1003", title: "Duplicate Claim Network Match", severity: "Critical", status: "Under Investigation",
    createdAt: "2026-07-20T09:30:00", assigned: "Sarah Mitchell, CFE",
    patientName: "Elizabeth Davis", patientId: "PAT-007",
    providerName: "Metropolitan General Hospital", providerId: "PRV-001",
    diagnosisCode: "E11.9", diagnosisDesc: "Type 2 Diabetes Mellitus",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200135", claimAmount: 4_200,
    reasonTags: ["Duplicate claim submission", "Cross-provider match", "Same patient, same day"],
    aiFactors: [
      { factor: "Duplicate Detection", weight: 52, detail: "Identical CPT + date + patient matched across 2 claims at different facilities" },
      { factor: "Network Collusion Pattern", weight: 28, detail: "Both facilities share administrative billing address" },
      { factor: "Claim Timing", weight: 20, detail: "Claims submitted within 4 minutes of each other" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T09:30:00", detail: "Duplicate claim pattern flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T09:32:00", detail: "Assigned to Sarah Mitchell, CFE — specialty match" },
      { action: "Investigation Started", actor: "Sarah Mitchell, CFE", time: "2026-07-20T10:15:00", detail: "Pulling cross-facility billing records" },
    ],
  },
  {
    id: "ALT-1004", title: "New Provider Rapid Billing Surge", severity: "High", status: "Escalated",
    createdAt: "2026-07-19T18:05:00", assigned: "James Rodriguez, CFE",
    patientName: "David Rodriguez", patientId: "PAT-010",
    providerName: "Pacific Wellness Group", providerId: "PRV-004",
    diagnosisCode: "M79.3", diagnosisDesc: "Panniculitis",
    procedureCode: "17000", procedureDesc: "Destruction of Lesion — Skin",
    claimId: "CLM-2026-200128", claimAmount: 15_800,
    reasonTags: ["Rapid billing surge", "New provider risk", "Volume anomaly"],
    aiFactors: [
      { factor: "Provider Enrollment Age", weight: 38, detail: "Enrolled 12 days ago, submitted 212 claims — avg new provider submits 15/month" },
      { factor: "Claim Volume Z-Score", weight: 35, detail: "Volume is 14.1 standard deviations above peer baseline" },
      { factor: "Amount Concentration", weight: 27, detail: "$450K in 12 days — 36x expected for new internal medicine practice" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-19T18:05:00", detail: "New provider rapid billing surge detected" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-19T18:07:00", detail: "Assigned to James Rodriguez, CFE — fraud specialist" },
      { action: "Escalated to SIU", actor: "James Rodriguez, CFE", time: "2026-07-20T08:30:00", detail: "Escalating — potential organized fraud ring. Provider flagged by 3 independent signals." },
    ],
  },
  {
    id: "ALT-1005", title: "Geographic Anomaly — Shell Provider Network", severity: "High", status: "Under Investigation",
    createdAt: "2026-07-20T06:48:00", assigned: "Emily Chen, CFE",
    patientName: "Barbara Garcia", patientId: "PAT-009",
    providerName: "Lakeside Medical Associates", providerId: "PRV-006",
    diagnosisCode: "G43.909", diagnosisDesc: "Migraine, Unspecified",
    procedureCode: "70553", procedureDesc: "MRI Brain w/ Contrast",
    claimId: "CLM-2026-200125", claimAmount: 6_750,
    reasonTags: ["Geographic anomaly", "Patient >250mi from provider", "Potential shell network"],
    aiFactors: [
      { factor: "Patient-Provider Distance", weight: 45, detail: "Patient resides 310 miles from Lakeside Medical — no referral documentation" },
      { factor: "Cluster Analysis", weight: 32, detail: "15 patients from same distant metro area, all referred by same intermediary" },
      { factor: "Referral Pattern", weight: 23, detail: "No medical necessity for out-of-network referrals at this rate" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T06:48:00", detail: "Geographic anomaly cluster flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T06:50:00", detail: "Assigned to Emily Chen, CFE" },
      { action: "Investigation Started", actor: "Emily Chen, CFE", time: "2026-07-20T08:00:00", detail: "Mapping patient referral network. Cross-referencing addresses." },
    ],
  },
  {
    id: "ALT-1006", title: "Phantom Billing Ring — Coordinated Network", severity: "High", status: "Escalated",
    createdAt: "2026-07-19T15:22:00", assigned: "Robert Kim, CFE",
    patientName: "Linda Martinez", patientId: "PAT-005",
    providerName: "City Health Network", providerId: "PRV-003",
    diagnosisCode: "M17.9", diagnosisDesc: "Osteoarthritis of Knee",
    procedureCode: "27447", procedureDesc: "Total Knee Arthroplasty",
    claimId: "CLM-2026-200120", claimAmount: 28_500,
    reasonTags: ["Phantom billing ring", "Coordinated claims", "Services never rendered"],
    aiFactors: [
      { factor: "Clustering Algorithm", weight: 40, detail: "42 claims across 3 providers in same network — all on dates facilities were closed" },
      { factor: "Patient Verification", weight: 35, detail: "8 of 12 patients contacted deny receiving billed services" },
      { factor: "Administrative Linkage", weight: 25, detail: "All 3 providers share same billing company and registered agent" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-19T15:22:00", detail: "Phantom billing ring detected across network" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-19T15:25:00", detail: "Assigned to Robert Kim, CFE" },
      { action: "Escalated to SIU", actor: "Robert Kim, CFE", time: "2026-07-20T09:00:00", detail: "Confirmed ring structure — escalating to federal referral unit" },
      { action: "Federal Referral Submitted", actor: "Robert Kim, CFE", time: "2026-07-20T11:30:00", detail: "Referred to OIG for further investigation" },
    ],
  },
  {
    id: "ALT-1007", title: "Duplicate Claims — Identical Submissions", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-20T13:05:00", assigned: "Emily Chen, CFE",
    patientName: "Robert Chen", patientId: "PAT-002",
    providerName: "St. Mary Medical Center", providerId: "PRV-002",
    diagnosisCode: "E11.9", diagnosisDesc: "Type 2 Diabetes Mellitus",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200140", claimAmount: 3_100,
    reasonTags: ["Duplicate claim", "Identical CPT code", "Same date of service"],
    aiFactors: [
      { factor: "Exact Match Detection", weight: 55, detail: "Claims CLM-2026-200139 and CLM-2026-200140 are identical in all fields except claim ID" },
      { factor: "Submission Timing", weight: 25, detail: "Both submitted within 90 seconds — likely automated resubmission" },
      { factor: "Provider History", weight: 20, detail: "St. Mary has 3 prior duplicate incidents in last 60 days" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T13:05:00", detail: "Duplicate claim detection triggered" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T13:07:00", detail: "Assigned to Emily Chen, CFE" },
      { action: "Investigation Started", actor: "Emily Chen, CFE", time: "2026-07-20T14:00:00", detail: "Comparing duplicate claim records" },
    ],
  },
  {
    id: "ALT-1008", title: "Unbundling — Orthopedic Codes", severity: "High", status: "New",
    createdAt: "2026-07-20T12:50:00", assigned: "Unassigned",
    patientName: "William Brown", patientId: "PAT-006",
    providerName: "Summit Healthcare Partners", providerId: "PRV-005",
    diagnosisCode: "M17.9", diagnosisDesc: "Osteoarthritis of Knee",
    procedureCode: "27447", procedureDesc: "Total Knee Arthroplasty",
    claimId: "CLM-2026-200141", claimAmount: 18_200,
    reasonTags: ["Unbundling detected", "Component codes separate", "NCCI violation"],
    aiFactors: [
      { factor: "NCCI Edit Violation", weight: 48, detail: "Procedure components billed separately that should be bundled under single code" },
      { factor: "Revenue Impact", weight: 30, detail: "Unbundling increases reimbursement by $6,800 per claim" },
      { factor: "Pattern Frequency", weight: 22, detail: "Same unbundling pattern across 12 claims in 3-week period" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T12:50:00", detail: "Unbundling pattern detected in orthopedic claims" },
    ],
  },
  {
    id: "ALT-1009", title: "Excessive Service Frequency — Imaging", severity: "High", status: "Under Investigation",
    createdAt: "2026-07-20T08:18:00", assigned: "Lisa Park, CFE",
    patientName: "James Anderson", patientId: "PAT-004",
    providerName: "Pacific Wellness Group", providerId: "PRV-004",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "72148", procedureDesc: "MRI Lumbar Spine w/o Contrast",
    claimId: "CLM-2026-200130", claimAmount: 5_400,
    reasonTags: ["Excessive imaging", "3x recommended frequency", "No clinical justification"],
    aiFactors: [
      { factor: "Service Frequency", weight: 42, detail: "Patient received 6 MRIs in 30 days — recommended max is 2 per quarter" },
      { factor: "Clinical Guidelines", weight: 35, detail: "ACR Appropriateness Criteria rate this as usually not appropriate" },
      { factor: "Revenue Pattern", weight: 23, detail: "Provider bills 3.2x more imaging than specialty average" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T08:18:00", detail: "Excessive service frequency flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T08:20:00", detail: "Assigned to Lisa Park, CFE — coding specialist" },
      { action: "Investigation Started", actor: "Lisa Park, CFE", time: "2026-07-20T09:45:00", detail: "Reviewing imaging orders and clinical documentation" },
    ],
  },
  {
    id: "ALT-1010", title: "Modifier -25 Misuse Pattern", severity: "High", status: "Under Investigation",
    createdAt: "2026-07-20T07:33:00", assigned: "Angela Davis, CFE",
    patientName: "James Anderson", patientId: "PAT-004",
    providerName: "Metropolitan General Hospital", providerId: "PRV-001",
    diagnosisCode: "I25.10", diagnosisDesc: "Coronary Artery Disease",
    procedureCode: "99214", procedureDesc: "Office Visit — Level 4",
    claimId: "CLM-2026-200129", claimAmount: 7_800,
    reasonTags: ["Modifier misuse", "Systematic -25 overuse", "78% vs 12% peer avg"],
    aiFactors: [
      { factor: "Modifier -25 Usage Rate", weight: 50, detail: "78% of claims include Modifier -25 vs 12% peer average — 6.5x overuse" },
      { factor: "E/M Upgrade Pattern", weight: 30, detail: "Modifier consistently paired with Level 4/5 E/M codes" },
      { factor: "Revenue Impact", weight: 20, detail: "Estimated overbilling of $180K annually from this pattern alone" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T07:33:00", detail: "Modifier misuse pattern detected" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T07:35:00", detail: "Assigned to Angela Davis, CFE" },
      { action: "Investigation Started", actor: "Angela Davis, CFE", time: "2026-07-20T09:00:00", detail: "Pulling 90-day modifier usage report for this provider" },
    ],
  },
  {
    id: "ALT-1011", title: "Identity Fraud Ring — SSN Reuse", severity: "High", status: "Escalated",
    createdAt: "2026-07-19T20:10:00", assigned: "Mark Thompson, CFE",
    patientName: "Robert Chen", patientId: "PAT-002",
    providerName: "City Health Network", providerId: "PRV-003",
    diagnosisCode: "F32.1", diagnosisDesc: "Major Depressive Disorder",
    procedureCode: "90837", procedureDesc: "Psychotherapy — 60 Min",
    claimId: "CLM-2026-200122", claimAmount: 2_800,
    reasonTags: ["Identity fraud", "SSN reused across 4 IDs", "Shared contact info"],
    aiFactors: [
      { factor: "SSN Cross-Match", weight: 45, detail: "Same SSN linked to 4 different member IDs within 60 days" },
      { factor: "Shared Contact", weight: 32, detail: "All 4 IDs share identical phone number and mailing address" },
      { factor: "Claim Pattern", weight: 23, detail: "All 4 IDs submit claims at same 2 providers — possible identity ring" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-19T20:10:00", detail: "Identity fraud ring detection triggered" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-19T20:12:00", detail: "Assigned to Mark Thompson, CFE" },
      { action: "Escalated to SIU", actor: "Mark Thompson, CFE", time: "2026-07-20T10:00:00", detail: "Confirmed identity reuse — escalating to law enforcement liaison" },
    ],
  },
  {
    id: "ALT-1012", title: "Geographic Anomaly — Distant Patients", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-20T11:20:00", assigned: "Mark Thompson, CFE",
    patientName: "Margaret Thompson", patientId: "PAT-001",
    providerName: "Lakeside Medical Associates", providerId: "PRV-006",
    diagnosisCode: "N18.9", diagnosisDesc: "Chronic Kidney Disease",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200137", claimAmount: 3_600,
    reasonTags: ["Geographic anomaly", "15 patients >250mi away", "No referral docs"],
    aiFactors: [
      { factor: "Distance Analysis", weight: 44, detail: "15 claims from patients residing 250+ miles from provider with no referral" },
      { factor: "Network Analysis", weight: 33, detail: "All distant patients share same referring physician — potential kickback" },
      { factor: "Claim Amount", weight: 23, detail: "Distant patient claims average $3,600 vs $1,800 for local patients" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T11:20:00", detail: "Geographic anomaly detected — distant patient cluster" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T11:22:00", detail: "Assigned to Mark Thompson, CFE" },
      { action: "Investigation Started", actor: "Mark Thompson, CFE", time: "2026-07-20T13:00:00", detail: "Mapping patient addresses and referral origins" },
    ],
  },
  {
    id: "ALT-1013", title: "Upcoding — Lab Panel Complexity", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-20T05:45:00", assigned: "Emily Chen, CFE",
    patientName: "Linda Martinez", patientId: "PAT-005",
    providerName: "St. Mary Medical Center", providerId: "PRV-002",
    diagnosisCode: "E11.9", diagnosisDesc: "Type 2 Diabetes Mellitus",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200124", claimAmount: 4_800,
    reasonTags: ["Upcoding detected", "Panel complexity inflated", "4x avg reimbursement"],
    aiFactors: [
      { factor: "Panel Upcoding", weight: 46, detail: "Billing comprehensive panel when basic panel clinically sufficient — 4x cost" },
      { factor: "Medical Necessity", weight: 32, detail: "Diagnosis code doesn't support comprehensive panel per LCD guidelines" },
      { factor: "Provider Pattern", weight: 22, detail: "St. Mary bills comprehensive panels at 2.8x rate of similar hospitals" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T05:45:00", detail: "Lab panel upcoding flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T05:47:00", detail: "Assigned to Emily Chen, CFE" },
      { action: "Investigation Started", actor: "Emily Chen, CFE", time: "2026-07-20T08:10:00", detail: "Comparing lab orders vs. clinical documentation" },
    ],
  },
  {
    id: "ALT-1014", title: "Billing Pattern Anomaly — Weekend Services", severity: "Medium", status: "New",
    createdAt: "2026-07-20T10:55:00", assigned: "Unassigned",
    patientName: "Elizabeth Davis", patientId: "PAT-007",
    providerName: "Valley Regional Hospital", providerId: "PRV-007",
    diagnosisCode: "M79.3", diagnosisDesc: "Panniculitis",
    procedureCode: "17000", procedureDesc: "Destruction of Lesion — Skin",
    claimId: "CLM-2026-200136", claimAmount: 5_200,
    reasonTags: ["Weekend billing anomaly", "Facility typically closed", "142% volume spike"],
    aiFactors: [
      { factor: "Weekend Volume", weight: 40, detail: "142% increase in weekend claims for this provider — facility normally closed Sat-Sun" },
      { factor: "Staffing Check", weight: 34, detail: "No staff scheduled for the claimed service dates" },
      { factor: "Patient Verification", weight: 26, detail: "2 of 6 patients contacted confirm no weekend visit occurred" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T10:55:00", detail: "Weekend billing anomaly detected" },
    ],
  },
  {
    id: "ALT-1015", title: "Kickback Scheme — Referral Pattern", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-20T04:15:00", assigned: "Lisa Park, CFE",
    patientName: "William Brown", patientId: "PAT-006",
    providerName: "Pacific Wellness Group", providerId: "PRV-004",
    diagnosisCode: "M17.9", diagnosisDesc: "Osteoarthritis of Knee",
    procedureCode: "27447", procedureDesc: "Total Knee Arthroplasty",
    claimId: "CLM-2026-200123", claimAmount: 22_100,
    reasonTags: ["Kickback pattern", "100% referral concentration", "Financial relationship suspected"],
    aiFactors: [
      { factor: "Referral Concentration", weight: 42, detail: "98% of referrals from single orthopedist — expected: 15-25% max" },
      { factor: "Financial Linkage", weight: 35, detail: "Shared ownership structure between referring and receiving facilities" },
      { factor: "Volume Impact", weight: 23, detail: "Referral volume generates $22K per claim — 3x normal for this procedure" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T04:15:00", detail: "Kickback pattern detected in referral network" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T04:17:00", detail: "Assigned to Lisa Park, CFE" },
      { action: "Investigation Started", actor: "Lisa Park, CFE", time: "2026-07-20T08:30:00", detail: "Mapping referral relationships and financial disclosures" },
    ],
  },
  {
    id: "ALT-1016", title: "Duplicate Claims — St. Mary Cluster", severity: "Medium", status: "New",
    createdAt: "2026-07-20T12:30:00", assigned: "Unassigned",
    patientName: "Patricia Williams", patientId: "PAT-003",
    providerName: "St. Mary Medical Center", providerId: "PRV-002",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "72148", procedureDesc: "MRI Lumbar Spine w/o Contrast",
    claimId: "CLM-2026-200139", claimAmount: 4_500,
    reasonTags: ["Duplicate claim", "3 claims in 48h", "Same procedure, same patient"],
    aiFactors: [
      { factor: "Duplicate Count", weight: 50, detail: "3 identical MRI claims for same patient within 48 hours" },
      { factor: "Billing System", weight: 28, detail: "Auto-billing system appears to resubmit on rejection without voiding original" },
      { factor: "Revenue Impact", weight: 22, detail: "$9,000 in duplicate claims if all 3 paid" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T12:30:00", detail: "Duplicate claim cluster detected at St. Mary" },
    ],
  },
  {
    id: "ALT-1017", title: "Diagnosis-Procedure Mismatch", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-20T03:50:00", assigned: "Angela Davis, CFE",
    patientName: "Margaret Thompson", patientId: "PAT-001",
    providerName: "Northeast Health Services", providerId: "PRV-008",
    diagnosisCode: "G43.909", diagnosisDesc: "Migraine, Unspecified",
    procedureCode: "70553", procedureDesc: "MRI Brain w/ Contrast",
    claimId: "CLM-2026-200121", claimAmount: 7_200,
    reasonTags: ["Dx-procedure mismatch", "MRI not indicated for migraine", "Clinical guidelines violation"],
    aiFactors: [
      { factor: "Dx-Procedure Match", weight: 48, detail: "MRI Brain with contrast not indicated for migraine per ACR Appropriateness Criteria" },
      { factor: "Clinical Guidelines", weight: 30, detail: "ACR rates MRI for uncomplicated migraine as 'Usually Not Appropriate'" },
      { factor: "Provider Pattern", weight: 22, detail: "Northeast Health orders MRI for migraine at 5.2x expected rate" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T03:50:00", detail: "Diagnosis-procedure mismatch flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T03:52:00", detail: "Assigned to Angela Davis, CFE" },
      { action: "Investigation Started", actor: "Angela Davis, CFE", time: "2026-07-20T08:15:00", detail: "Reviewing clinical documentation against imaging orders" },
    ],
  },
  {
    id: "ALT-1018", title: "Prescription Anomaly — Controlled Substance", severity: "Medium", status: "New",
    createdAt: "2026-07-20T11:05:00", assigned: "Unassigned",
    patientName: "Barbara Garcia", patientId: "PAT-009",
    providerName: "Southeast Neurology Associates", providerId: "PRV-015",
    diagnosisCode: "G43.909", diagnosisDesc: "Migraine, Unspecified",
    procedureCode: "99215", procedureDesc: "Office Visit — Level 5",
    claimId: "CLM-2026-200137b", claimAmount: 3_800,
    reasonTags: ["Prescription anomaly", "Schedule II controlled substance", "5 providers in 30 days"],
    aiFactors: [
      { factor: "Provider Shopping", weight: 44, detail: "Patient seen by 5 different providers in 30 days for same complaint — classic drug-seeking pattern" },
      { factor: "Controlled Substance", weight: 33, detail: "Schedule II opioid prescribed at elevated dosage vs. migraine guidelines" },
      { factor: "Claim Frequency", weight: 23, detail: "3.2x expected visit frequency for this diagnosis" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T11:05:00", detail: "Prescription anomaly flagged — controlled substance" },
    ],
  },
  {
    id: "ALT-1019", title: "Unbundling — Lab Component Billing", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-19T22:30:00", assigned: "Mark Thompson, CFE",
    patientName: "James Anderson", patientId: "PAT-004",
    providerName: "Community Health Alliance", providerId: "PRV-010",
    diagnosisCode: "E11.9", diagnosisDesc: "Type 2 Diabetes Mellitus",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200119", claimAmount: 2_900,
    reasonTags: ["Unbundling", "Lab components separate", "NCCI violation"],
    aiFactors: [
      { factor: "NCCI Violation", weight: 52, detail: "Lab components billed individually instead of as bundled panel — $1,200 overcharge" },
      { factor: "Frequency", weight: 28, detail: "Same unbundling pattern in 18 claims over 6-week period" },
      { factor: "Revenue Impact", weight: 20, detail: "Total overcharge across all affected claims: $21,600" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-19T22:30:00", detail: "Lab unbundling pattern detected" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-19T22:32:00", detail: "Assigned to Mark Thompson, CFE" },
      { action: "Investigation Started", actor: "Mark Thompson, CFE", time: "2026-07-20T09:30:00", detail: "Analyzing NCCI edit logs for this provider" },
    ],
  },
  {
    id: "ALT-1020", title: "Excessive Services — Therapy Overbilling", severity: "Medium", status: "New",
    createdAt: "2026-07-20T10:30:00", assigned: "Unassigned",
    patientName: "Linda Martinez", patientId: "PAT-005",
    providerName: "Sunrise Health Clinic", providerId: "PRV-011",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "97110", procedureDesc: "Therapeutic Exercises",
    claimId: "CLM-2026-200134", claimAmount: 3_200,
    reasonTags: ["Excessive services", "2.5x recommended frequency", "No progress notes"],
    aiFactors: [
      { factor: "Service Frequency", weight: 45, detail: "Patient receiving therapy 5x/week — recommended max is 2x/week for this diagnosis" },
      { factor: "Documentation Gap", weight: 32, detail: "No progress notes supporting continued high-frequency treatment" },
      { factor: "Duration Analysis", weight: 23, detail: "Treatment duration at 2.5x expected recovery timeline" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T10:30:00", detail: "Excessive therapy services flagged" },
    ],
  },
  {
    id: "ALT-1021", title: "Billing Pattern Anomaly — After-Hours", severity: "Medium", status: "Escalated",
    createdAt: "2026-07-19T16:40:00", assigned: "Robert Kim, CFE",
    patientName: "David Rodriguez", patientId: "PAT-010",
    providerName: "Heartland Medical Center", providerId: "PRV-012",
    diagnosisCode: "I25.10", diagnosisDesc: "Coronary Artery Disease",
    procedureCode: "93306", procedureDesc: "Echocardiogram — Complete",
    claimId: "CLM-2026-200118", claimAmount: 6_100,
    reasonTags: ["After-hours billing", "85% claims after 8pm", "Staffing doesn't match"],
    aiFactors: [
      { factor: "Time-of-Day Pattern", weight: 42, detail: "85% of claims bill after-hours rates — facility staff records show no night shift" },
      { factor: "Revenue Premium", weight: 35, detail: "After-hours coding adds 50% premium to each claim" },
      { factor: "Staffing Records", weight: 23, detail: "No night/weekend staff on payroll for the claimed service dates" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-19T16:40:00", detail: "After-hours billing anomaly flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-19T16:42:00", detail: "Assigned to Robert Kim, CFE" },
      { action: "Escalated to SIU", actor: "Robert Kim, CFE", time: "2026-07-20T08:45:00", detail: "Escalating — staffing records directly contradict billing times" },
    ],
  },
  {
    id: "ALT-1022", title: "Modifier Misuse — -59 Override", severity: "Medium", status: "New",
    createdAt: "2026-07-20T09:50:00", assigned: "Unassigned",
    patientName: "Elizabeth Davis", patientId: "PAT-007",
    providerName: "Coastal Diagnostic Center", providerId: "PRV-013",
    diagnosisCode: "M17.9", diagnosisDesc: "Osteoarthritis of Knee",
    procedureCode: "73721", procedureDesc: "MRI Lower Extremity Joint",
    claimId: "CLM-2026-200133", claimAmount: 4_100,
    reasonTags: ["Modifier -59 misuse", "NCCI override pattern", "Separate billing of bundled services"],
    aiFactors: [
      { factor: "Modifier -59 Usage", weight: 48, detail: "Modifier -59 used on 62% of claims to bypass NCCI edits — peer avg: 8%" },
      { factor: "NCCI Override", weight: 30, detail: "Modifier consistently overrides edits that should require manual review" },
      { factor: "Revenue Impact", weight: 22, detail: "Each override adds $1,800-$2,400 to reimbursement" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T09:50:00", detail: "Modifier -59 override pattern detected" },
    ],
  },
  {
    id: "ALT-1023", title: "Claim Amount Deviation — High-Value Lab", severity: "Medium", status: "Under Investigation",
    createdAt: "2026-07-20T02:15:00", assigned: "Lisa Park, CFE",
    patientName: "Robert Chen", patientId: "PAT-002",
    providerName: "Northeast Health Services", providerId: "PRV-008",
    diagnosisCode: "N18.9", diagnosisDesc: "Chronic Kidney Disease",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200120b", claimAmount: 5_800,
    reasonTags: ["Claim amount deviation", "2.3x avg for procedure", "No special justification"],
    aiFactors: [
      { factor: "Amount Deviation", weight: 50, detail: "$5,800 for CMP vs $2,500 avg — 2.3x deviation with no documented justification" },
      { factor: "Facility Fee", weight: 28, detail: "Unusually high facility fee component for outpatient lab work" },
      { factor: "Billing History", weight: 22, detail: "Northeast Health CMP claims average 1.8x regional baseline across all patients" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T02:15:00", detail: "Claim amount deviation flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-20T02:17:00", detail: "Assigned to Lisa Park, CFE" },
      { action: "Investigation Started", actor: "Lisa Park, CFE", time: "2026-07-20T08:00:00", detail: "Reviewing itemized billing breakdown and facility feejustification" },
    ],
  },
  {
    id: "ALT-1024", title: "Duplicate Procedure — Imaging Resubmit", severity: "Low", status: "New",
    createdAt: "2026-07-20T11:35:00", assigned: "Unassigned",
    patientName: "William Brown", patientId: "PAT-006",
    providerName: "Coastal Diagnostic Center", providerId: "PRV-013",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "72148", procedureDesc: "MRI Lumbar Spine w/o Contrast",
    claimId: "CLM-2026-200138b", claimAmount: 4_300,
    reasonTags: ["Duplicate procedure", "Same imaging, same week", "No clinical reason for repeat"],
    aiFactors: [
      { factor: "Repeat Imaging", weight: 52, detail: "Same MRI ordered twice within 5 days — no documented clinical reason for repeat" },
      { factor: "Guideline Violation", weight: 28, detail: "ACR guidelines recommend against routine repeat MRI within 30 days for stable low back pain" },
      { factor: "Revenue Pattern", weight: 20, detail: "Coastal Diagnostic has 22% duplicate imaging rate vs 4% peer average" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T11:35:00", detail: "Duplicate imaging procedure flagged" },
    ],
  },
  {
    id: "ALT-1025", title: "Late Submission — 45-Day Window", severity: "Low", status: "New",
    createdAt: "2026-07-20T13:30:00", assigned: "Unassigned",
    patientName: "James Anderson", patientId: "PAT-004",
    providerName: "Premier Care Network", providerId: "PRV-009",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "99213", procedureDesc: "Office Visit — Level 3",
    claimId: "CLM-2026-200143", claimAmount: 1_200,
    reasonTags: ["Late submission", "45-day filing window", "Potentially stale claim"],
    aiFactors: [
      { factor: "Submission Timeliness", weight: 55, detail: "Claim submitted 45 days after date of service — approaching filing deadline" },
      { factor: "Documentation Risk", weight: 25, detail: "Late submissions have 2.1x higher error rate in coding accuracy" },
      { factor: "Provider History", weight: 20, detail: "Premier Care has 18% late submission rate vs 6% peer average" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T13:30:00", detail: "Late submission flagged — approaching filing deadline" },
    ],
  },
  {
    id: "ALT-1026", title: "Low-Risk Pattern — Routine Monitoring", severity: "Low", status: "Resolved",
    createdAt: "2026-07-18T10:00:00", assigned: "Mark Thompson, CFE",
    patientName: "Michael Wilson", patientId: "PAT-008",
    providerName: "Community Health Alliance", providerId: "PRV-010",
    diagnosisCode: "F32.1", diagnosisDesc: "Major Depressive Disorder",
    procedureCode: "90834", procedureDesc: "Psychotherapy — 45 Min",
    claimId: "CLM-2026-200110", claimAmount: 1_800,
    reasonTags: ["Slightly elevated frequency", "Within acceptable range", "Routine monitoring"],
    aiFactors: [
      { factor: "Service Frequency", weight: 40, detail: "Slightly above average frequency but within clinical guidelines for this diagnosis" },
      { factor: "Amount Analysis", weight: 35, detail: "Claim amount within normal range for this CPT code" },
      { factor: "Resolution", weight: 25, detail: "Investigated — flagged due to frequency threshold, confirmed as legitimate ongoing treatment" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-18T10:00:00", detail: "Low-risk frequency alert generated" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-18T10:02:00", detail: "Assigned to Mark Thompson, CFE" },
      { action: "Investigation Started", actor: "Mark Thompson, CFE", time: "2026-07-18T11:00:00", detail: "Quick review of treatment plan initiated" },
      { action: "Resolved — No Action", actor: "Mark Thompson, CFE", time: "2026-07-18T14:30:00", detail: "Confirmed legitimate ongoing treatment. No fraud indicators. Closing alert." },
    ],
    resolution: "No Action Taken",
  },
  {
    id: "ALT-1027", title: "Provider Volume Spike — Day Shift", severity: "Low", status: "Resolved",
    createdAt: "2026-07-18T14:20:00", assigned: "Michael O'Brien, CFE",
    patientName: "Patricia Williams", patientId: "PAT-003",
    providerName: "Sunrise Health Clinic", providerId: "PRV-011",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "99213", procedureDesc: "Office Visit — Level 3",
    claimId: "CLM-2026-200112", claimAmount: 1_100,
    reasonTags: ["Volume spike", "Day-shift anomaly", "Clinically appropriate"],
    aiFactors: [
      { factor: "Volume Spike", weight: 45, detail: "Unusual volume on specific day — investigation revealed staff meeting makeups" },
      { factor: "Clinical Review", weight: 32, detail: "All claims reviewed — documentation supports each service" },
      { factor: "Resolution", weight: 23, detail: "Volume spike due to rescheduled appointments from prior day closure" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-18T14:20:00", detail: "Volume spike flagged for day-shift services" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-18T14:22:00", detail: "Assigned to Michael O'Brien, CFE" },
      { action: "Investigation Started", actor: "Michael O'Brien, CFE", time: "2026-07-18T15:00:00", detail: "Reviewing scheduling records for the flagged day" },
      { action: "Resolved — No Action", actor: "Michael O'Brien, CFE", time: "2026-07-18T17:00:00", detail: "Volume spike explained by rescheduled appointments. No fraud. Closing." },
    ],
    resolution: "No Action Taken",
  },
  {
    id: "ALT-1028", title: "Modifier Misuse — Minor Flag", severity: "Low", status: "Resolved",
    createdAt: "2026-07-17T16:45:00", assigned: "Lisa Park, CFE",
    patientName: "David Rodriguez", patientId: "PAT-010",
    providerName: "Premier Care Network", providerId: "PRV-009",
    diagnosisCode: "E11.9", diagnosisDesc: "Type 2 Diabetes Mellitus",
    procedureCode: "99214", procedureDesc: "Office Visit — Level 4",
    claimId: "CLM-2026-200108", claimAmount: 2_100,
    reasonTags: ["Modifier usage edge case", "Within tolerance", "Documentation sufficient"],
    aiFactors: [
      { factor: "Modifier Pattern", weight: 42, detail: "Modifier usage flagged as edge case — at lower threshold of concern" },
      { factor: "Documentation Review", weight: 35, detail: "Chart review confirms medical necessity for modifier application" },
      { factor: "Resolution", weight: 23, detail: "False positive — provider documentation supports modifier usage in this case" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-17T16:45:00", detail: "Modifier usage flagged at low threshold" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-17T16:47:00", detail: "Assigned to Lisa Park, CFE" },
      { action: "Investigation Started", actor: "Lisa Park, CFE", time: "2026-07-17T17:30:00", detail: "Chart review initiated" },
      { action: "Resolved — False Positive", actor: "Lisa Park, CFE", time: "2026-07-18T09:15:00", detail: "Documentation supports modifier usage. False positive. Closing." },
    ],
    resolution: "False Positive",
  },
  {
    id: "ALT-1029", title: "Duplicate Claim — Auto-Resubmit", severity: "Low", status: "Resolved",
    createdAt: "2026-07-17T09:10:00", assigned: "Angela Davis, CFE",
    patientName: "Margaret Thompson", patientId: "PAT-001",
    providerName: "Community Health Alliance", providerId: "PRV-010",
    diagnosisCode: "N18.9", diagnosisDesc: "Chronic Kidney Disease",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200105", claimAmount: 1_900,
    reasonTags: ["Auto-resubmit duplicate", "System error", "Billing software glitch"],
    aiFactors: [
      { factor: "Auto-Resubmit", weight: 55, detail: "Billing software auto-resubmitted claim after electronic rejection — no intent to duplicate" },
      { factor: "System Error", weight: 28, detail: "Software vendor confirmed auto-resubmit bug in version 4.2.1" },
      { factor: "Resolution", weight: 17, detail: "Confirmed system error. Provider notified to update billing software." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-17T09:10:00", detail: "Duplicate from auto-resubmit detected" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-17T09:12:00", detail: "Assigned to Angela Davis, CFE" },
      { action: "Investigation Started", actor: "Angela Davis, CFE", time: "2026-07-17T10:00:00", detail: "Checking billing system logs" },
      { action: "Resolved — False Positive", actor: "Angela Davis, CFE", time: "2026-07-17T14:00:00", detail: "Confirmed auto-resubmit bug. False positive. Provider updating software." },
    ],
    resolution: "False Positive",
  },
  {
    id: "ALT-1030", title: "Geographic Flag — Border Case", severity: "Low", status: "Resolved",
    createdAt: "2026-07-16T13:25:00", assigned: "Sarah Mitchell, CFE",
    patientName: "Robert Chen", patientId: "PAT-002",
    providerName: "Midwest Surgical Institute", providerId: "PRV-014",
    diagnosisCode: "M17.9", diagnosisDesc: "Osteoarthritis of Knee",
    procedureCode: "27447", procedureDesc: "Total Knee Arthroplasty",
    claimId: "CLM-2026-200100", claimAmount: 24_000,
    reasonTags: ["Border geographic case", "Patient near state line", "Legitimate referral"],
    aiFactors: [
      { factor: "Distance Threshold", weight: 40, detail: "Patient 180 miles from provider — below 250-mile threshold but flagged for cluster analysis" },
      { factor: "Referral Network", weight: 35, detail: "Patient referred through established network — no kickback indicators" },
      { factor: "Resolution", weight: 25, detail: "Legitimate referral from specialist not available locally. Closing." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-16T13:25:00", detail: "Geographic flag for borderline distance" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-16T13:27:00", detail: "Assigned to Sarah Mitchell, CFE" },
      { action: "Investigation Started", actor: "Sarah Mitchell, CFE", time: "2026-07-16T14:00:00", detail: "Reviewing referral documentation" },
      { action: "Resolved — No Action", actor: "Sarah Mitchell, CFE", time: "2026-07-16T16:30:00", detail: "Legitimate specialist referral. No fraud. Closing alert." },
    ],
    resolution: "No Action Taken",
  },
  {
    id: "ALT-1031", title: "Billing Pattern — Holiday Weekend", severity: "Low", status: "Resolved",
    createdAt: "2026-07-15T11:50:00", assigned: "James Rodriguez, CFE",
    patientName: "Barbara Garcia", patientId: "PAT-009",
    providerName: "Heartland Medical Center", providerId: "PRV-012",
    diagnosisCode: "F32.1", diagnosisDesc: "Major Depressive Disorder",
    procedureCode: "90837", procedureDesc: "Psychotherapy — 60 Min",
    claimId: "CLM-2026-200095", claimAmount: 2_200,
    reasonTags: ["Holiday weekend flag", "Minor volume anomaly", "Clinically justified"],
    aiFactors: [
      { factor: "Holiday Volume", weight: 45, detail: "Minor volume increase on Memorial Day weekend — facility was open for emergency services" },
      { factor: "Service Type", weight: 32, detail: "Telehealth sessions — appropriate for holiday weekend delivery" },
      { factor: "Resolution", weight: 23, detail: "Confirmed telehealth services were legitimate. Closing." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-15T11:50:00", detail: "Holiday weekend billing flag" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-15T11:52:00", detail: "Assigned to James Rodriguez, CFE" },
      { action: "Resolved — No Action", actor: "James Rodriguez, CFE", time: "2026-07-15T15:00:00", detail: "Telehealth services confirmed. No issues. Closing." },
    ],
    resolution: "No Action Taken",
  },
  {
    id: "ALT-1032", title: "Upcoding — E/M Level 4 Edge", severity: "Low", status: "Resolved",
    createdAt: "2026-07-15T08:30:00", assigned: "Emily Chen, CFE",
    patientName: "William Brown", patientId: "PAT-006",
    providerName: "Valley Regional Hospital", providerId: "PRV-007",
    diagnosisCode: "I25.10", diagnosisDesc: "Coronary Artery Disease",
    procedureCode: "99214", procedureDesc: "Office Visit — Level 4",
    claimId: "CLM-2026-200092", claimAmount: 3_400,
    reasonTags: ["E/M level edge case", "Documentation borderline", "Resolved as appropriate"],
    aiFactors: [
      { factor: "E/M Level Assessment", weight: 48, detail: "Level 4 billed — documentation borderline but supports medical decision-making complexity" },
      { factor: "Provider Context", weight: 30, detail: "Cardiology specialty — complex patients justify higher E/M levels" },
      { factor: "Resolution", weight: 22, detail: "Medical record review confirmed Level 4 is appropriate for this case complexity" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-15T08:30:00", detail: "E/M level edge case flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-15T08:32:00", detail: "Assigned to Emily Chen, CFE" },
      { action: "Resolved — False Positive", actor: "Emily Chen, CFE", time: "2026-07-15T12:00:00", detail: "Documentation supports Level 4. False positive. Closing." },
    ],
    resolution: "False Positive",
  },
  {
    id: "ALT-1033", title: "Unbundling Flag — Minor", severity: "Low", status: "New",
    createdAt: "2026-07-20T13:55:00", assigned: "Unassigned",
    patientName: "Michael Wilson", patientId: "PAT-008",
    providerName: "Premier Care Network", providerId: "PRV-009",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "99213", procedureDesc: "Office Visit — Level 3",
    claimId: "CLM-2026-200144", claimAmount: 1_050,
    reasonTags: ["Minor unbundling edge case", "Within coding tolerance", "Review recommended"],
    aiFactors: [
      { factor: "Unbundling Threshold", weight: 45, detail: "Minor unbundling detected — at lower threshold of concern" },
      { factor: "Coding Tolerance", weight: 35, detail: "Within acceptable coding variation for this specialty" },
      { factor: "Recommendation", weight: 20, detail: "Flagged for monitoring rather than active investigation" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T13:55:00", detail: "Minor unbundling edge case flagged" },
    ],
  },
  {
    id: "ALT-1034", title: "Duplicate — Resubmission Pattern", severity: "Low", status: "New",
    createdAt: "2026-07-20T12:45:00", assigned: "Unassigned",
    patientName: "Linda Martinez", patientId: "PAT-005",
    providerName: "Sunrise Health Clinic", providerId: "PRV-011",
    diagnosisCode: "E11.9", diagnosisDesc: "Type 2 Diabetes Mellitus",
    procedureCode: "80053", procedureDesc: "Comprehensive Metabolic Panel",
    claimId: "CLM-2026-200141b", claimAmount: 1_600,
    reasonTags: ["Resubmission pattern", "Electronic rejection retry", "Low risk"],
    aiFactors: [
      { factor: "Resubmission Pattern", weight: 50, detail: "Claim resubmitted after electronic rejection — common billing workflow issue" },
      { factor: "Timing Analysis", weight: 30, detail: "Resubmission within normal 24-hour retry window" },
      { factor: "Risk Assessment", weight: 20, detail: "Low fraud risk — appears to be legitimate billing correction" },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-20T12:45:00", detail: "Resubmission pattern flagged" },
    ],
  },
  {
    id: "ALT-1035", title: "Confirmed Fraud — Upcoding Ring", severity: "High", status: "Resolved",
    createdAt: "2026-07-10T09:00:00", assigned: "James Rodriguez, CFE",
    patientName: "Patricia Williams", patientId: "PAT-003",
    providerName: "Metropolitan General Hospital", providerId: "PRV-001",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "99215", procedureDesc: "Office Visit — Level 5",
    claimId: "CLM-2026-200065", claimAmount: 14_200,
    reasonTags: ["Confirmed fraud", "Upcoding ring", "Systematic pattern confirmed"],
    aiFactors: [
      { factor: "Pattern Confirmation", weight: 45, detail: "Confirmed systematic upcoding across 47 patients over 6-month period" },
      { factor: "Documentation Audit", weight: 35, detail: "Chart audit confirmed Level 5 billed but documentation supports Level 3 in 89% of cases" },
      { factor: "Financial Impact", weight: 20, detail: "Total overpayment recovered: $127,400. Provider placed on prepayment review." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-10T09:00:00", detail: "Upcoding ring alert generated" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-10T09:02:00", detail: "Assigned to James Rodriguez, CFE" },
      { action: "Investigation Started", actor: "James Rodriguez, CFE", time: "2026-07-10T10:00:00", detail: "Initiating full chart audit for Metropolitan General" },
      { action: "Escalated to SIU", actor: "James Rodriguez, CFE", time: "2026-07-12T14:00:00", detail: "Audit confirmed systematic pattern. Escalating." },
      { action: "Resolved — Confirmed Fraud", actor: "James Rodriguez, CFE", time: "2026-07-15T16:00:00", detail: "Fraud confirmed. $127,400 recovered. Provider on prepayment review." },
    ],
    resolution: "Confirmed Fraud",
  },
  {
    id: "ALT-1036", title: "Confirmed Fraud — Phantom Billing", severity: "Medium", status: "Resolved",
    createdAt: "2026-07-12T11:30:00", assigned: "Robert Kim, CFE",
    patientName: "Elizabeth Davis", patientId: "PAT-007",
    providerName: "St. Mary Medical Center", providerId: "PRV-002",
    diagnosisCode: "I25.10", diagnosisDesc: "Coronary Artery Disease",
    procedureCode: "93306", procedureDesc: "Echocardiogram — Complete",
    claimId: "CLM-2026-200078", claimAmount: 8_400,
    reasonTags: ["Confirmed phantom billing", "Services never rendered", "Patient denial"],
    aiFactors: [
      { factor: "Patient Contact", weight: 50, detail: "3 of 5 patients contacted confirmed services were never rendered" },
      { factor: "Facility Verification", weight: 30, detail: "Facility logs show no record of the claimed service dates" },
      { factor: "Financial Impact", weight: 20, detail: "Total phantom claims recovered: $42,000. Referral to legal." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-12T11:30:00", detail: "Phantom billing alert generated" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-12T11:32:00", detail: "Assigned to Robert Kim, CFE" },
      { action: "Investigation Started", actor: "Robert Kim, CFE", time: "2026-07-12T13:00:00", detail: "Initiating patient contact and facility verification" },
      { action: "Resolved — Confirmed Fraud", actor: "Robert Kim, CFE", time: "2026-07-16T10:00:00", detail: "Phantom billing confirmed. $42K recovered. Legal referral submitted." },
    ],
    resolution: "Confirmed Fraud",
  },
  {
    id: "ALT-1037", title: "False Positive — Legitimate Complex Case", severity: "Medium", status: "Resolved",
    createdAt: "2026-07-14T08:20:00", assigned: "Emily Chen, CFE",
    patientName: "Margaret Thompson", patientId: "PAT-001",
    providerName: "Summit Healthcare Partners", providerId: "PRV-005",
    diagnosisCode: "I25.10", diagnosisDesc: "Coronary Artery Disease",
    procedureCode: "93306", procedureDesc: "Echocardiogram — Complete",
    claimId: "CLM-2026-200088", claimAmount: 7_600,
    reasonTags: ["False positive", "Complex cardiology case", "Multiple comorbidities justified"],
    aiFactors: [
      { factor: "Clinical Complexity", weight: 40, detail: "Patient has 4 comorbidities — higher claim amount justified by complexity" },
      { factor: "Specialist Override", weight: 35, detail: "Cardiology specialist confirmed medical necessity for all billed services" },
      { factor: "Resolution", weight: 25, detail: "Complex case with legitimate elevated billing. False positive confirmed." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-14T08:20:00", detail: "Elevated claim amount flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-14T08:22:00", detail: "Assigned to Emily Chen, CFE" },
      { action: "Investigation Started", actor: "Emily Chen, CFE", time: "2026-07-14T09:00:00", detail: "Reviewing clinical documentation and comorbidity history" },
      { action: "Resolved — False Positive", actor: "Emily Chen, CFE", time: "2026-07-14T14:00:00", detail: "Complex case confirmed. False positive. Closing." },
    ],
    resolution: "False Positive",
  },
  {
    id: "ALT-1038", title: "Confirmed Fraud — Identity Theft", severity: "High", status: "Resolved",
    createdAt: "2026-07-08T14:15:00", assigned: "Mark Thompson, CFE",
    patientName: "James Anderson", patientId: "PAT-004",
    providerName: "City Health Network", providerId: "PRV-003",
    diagnosisCode: "F32.1", diagnosisDesc: "Major Depressive Disorder",
    procedureCode: "90837", procedureDesc: "Psychotherapy — 60 Min",
    claimId: "CLM-2026-200055", claimAmount: 3_200,
    reasonTags: ["Confirmed identity theft", "SSN stolen", "Claims filed without patient knowledge"],
    aiFactors: [
      { factor: "Identity Verification", weight: 55, detail: "Patient confirmed no knowledge of 8 claims filed under their SSN" },
      { factor: "Network Analysis", weight: 28, detail: "Claims originated from single billing entity — identity theft ring" },
      { factor: "Financial Impact", weight: 17, detail: "Total fraudulent claims: $25,600. Referred to law enforcement." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-08T14:15:00", detail: "Identity theft alert generated" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-08T14:17:00", detail: "Assigned to Mark Thompson, CFE" },
      { action: "Investigation Started", actor: "Mark Thompson, CFE", time: "2026-07-08T15:00:00", detail: "Initiating patient contact and identity verification" },
      { action: "Resolved — Confirmed Fraud", actor: "Mark Thompson, CFE", time: "2026-07-13T11:00:00", detail: "Identity theft confirmed. $25,600 recovered. Law enforcement notified." },
    ],
    resolution: "Confirmed Fraud",
  },
  {
    id: "ALT-1039", title: "Confirmed Fraud — Kickback Scheme", severity: "Medium", status: "Resolved",
    createdAt: "2026-07-11T10:40:00", assigned: "Angela Davis, CFE",
    patientName: "Barbara Garcia", patientId: "PAT-009",
    providerName: "Pacific Wellness Group", providerId: "PRV-004",
    diagnosisCode: "M17.9", diagnosisDesc: "Osteoarthritis of Knee",
    procedureCode: "27447", procedureDesc: "Total Knee Arthroplasty",
    claimId: "CLM-2026-200072", claimAmount: 26_500,
    reasonTags: ["Confirmed kickback", "Financial relationship proven", "Referral pattern anomaly"],
    aiFactors: [
      { factor: "Financial Trail", weight: 48, detail: "Wire transfers confirmed between referring physician and receiving facility" },
      { factor: "Referral Pattern", weight: 32, detail: "98% referral concentration confirmed as financially motivated" },
      { factor: "Financial Impact", weight: 20, detail: "Total kickback-related claims: $185,000. Federal referral submitted." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-11T10:40:00", detail: "Kickback scheme alert generated" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-11T10:42:00", detail: "Assigned to Angela Davis, CFE" },
      { action: "Investigation Started", actor: "Angela Davis, CFE", time: "2026-07-11T11:30:00", detail: "Initiating financial record subpoena" },
      { action: "Resolved — Confirmed Fraud", actor: "Angela Davis, CFE", time: "2026-07-17T09:00:00", detail: "Kickback confirmed. $185K in fraudulent claims. Federal referral." },
    ],
    resolution: "Confirmed Fraud",
  },
  {
    id: "ALT-1040", title: "False Positive — Coding Variation", severity: "Low", status: "Resolved",
    createdAt: "2026-07-16T09:15:00", assigned: "Lisa Park, CFE",
    patientName: "James Anderson", patientId: "PAT-004",
    providerName: "Lakeside Medical Associates", providerId: "PRV-006",
    diagnosisCode: "M54.5", diagnosisDesc: "Low Back Pain",
    procedureCode: "99213", procedureDesc: "Office Visit — Level 3",
    claimId: "CLM-2026-200098", claimAmount: 1_150,
    reasonTags: ["Coding variation", "Within normal range", "Legitimate practice pattern"],
    aiFactors: [
      { factor: "Coding Pattern", weight: 45, detail: "Slight variation in coding pattern — within normal range for family medicine" },
      { factor: "Practice Context", weight: 35, detail: "Rural practice with different patient demographics than urban peers" },
      { factor: "Resolution", weight: 20, detail: "Legitimate practice pattern variation. False positive confirmed." },
    ],
    auditTrail: [
      { action: "Alert Generated", actor: `AI Engine ${MODEL_VERSION}`, time: "2026-07-16T09:15:00", detail: "Coding variation flagged" },
      { action: "Assigned to Investigator", actor: "Auto-Assign", time: "2026-07-16T09:17:00", detail: "Assigned to Lisa Park, CFE" },
      { action: "Resolved — False Positive", actor: "Lisa Park, CFE", time: "2026-07-16T12:30:00", detail: "Coding variation confirmed as legitimate. Closing." },
    ],
    resolution: "False Positive",
  },
];

export default function AlertCenter() {
  const [alerts, setAlerts] = useState(ALERTS_DATA);
  const [lastScan, setLastScan] = useState(SYSTEM_NOW);
  const [refreshing, setRefreshing] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterProvider, setFilterProvider] = useState("All");
  const [filterInvestigator, setFilterInvestigator] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveOutcome, setResolveOutcome] = useState("");
  const [resolveNote, setResolveNote] = useState("");

  const [expandedAI, setExpandedAI] = useState(new Set());
  const [investigationNote, setInvestigationNote] = useState("");

  const uniqueProviders = useMemo(() => [...new Set(alerts.map(a => a.providerName))].sort(), [alerts]);
  const uniqueInvestigators = useMemo(() => [...new Set(alerts.map(a => a.assigned).filter(a => a !== "Unassigned"))].sort(), [alerts]);

  const severityCounts = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alerts.filter(a => a.status !== "Resolved").forEach(a => { counts[a.severity] = (counts[a.severity] || 0) + 1; });
    return counts;
  }, [alerts]);

  const activeAlerts = useMemo(() => alerts.filter(a => a.status !== "Resolved"), [alerts]);
  const totalExposure = useMemo(() => activeAlerts.reduce((sum, a) => sum + a.claimAmount, 0), [activeAlerts]);

  const slaBreaches = useMemo(() => alerts.filter(a => slaBreached(a)).length, [alerts]);

  const resolvedAlerts = useMemo(() => alerts.filter(a => a.status === "Resolved"), [alerts]);
  const confirmedFraudPct = useMemo(() => {
    if (resolvedAlerts.length === 0) return 0;
    return +((resolvedAlerts.filter(a => a.resolution === "Confirmed Fraud").length / resolvedAlerts.length) * 100).toFixed(1);
  }, [resolvedAlerts]);

  const avgResolutionHours = useMemo(() => {
    const resolved = alerts.filter(a => a.status === "Resolved" && a.auditTrail.length > 1);
    if (resolved.length === 0) return 0;
    const totalHours = resolved.reduce((sum, a) => {
      const created = new Date(a.createdAt);
      const lastEntry = new Date(a.auditTrail[a.auditTrail.length - 1].time);
      return sum + (lastEntry - created) / 3600000;
    }, 0);
    return +(totalHours / resolved.length).toFixed(1);
  }, [alerts]);

  const severityDonutData = useMemo(() => {
    const activeSevs = SEVERITY_ORDER.map(s => alerts.filter(a => a.severity === s && a.status !== "Resolved").length);
    return [{
      type: "pie",
      labels: SEVERITY_ORDER,
      values: activeSevs,
      hole: 0.55,
      marker: { colors: ["#dc2626", "#ea580c", "#eab308", "#3b82f6"] },
      textinfo: "label+percent+value",
      textposition: "inside",
      textfont: { size: 10, color: "#f8fafc" },
      hovertemplate: "%{label}: %{value} alerts (%{percent})<extra></extra>",
      showlegend: false,
    }];
  }, [alerts]);

  const severityDonutLayout = {
    margin: { t: 5, r: 5, l: 5, b: 5 },
    showlegend: false,
    height: 160,
    font: { color: "#94a3b8", size: 10 },
  };

  const trendData = useMemo(() => {
    const days = [];
    const dailyCounts = [9, 14, 11, 16, 12, 18, 22];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(SYSTEM_NOW);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      days.push({ label, count: dailyCounts[6 - i] });
    }
    return [{
      type: "scatter",
      mode: "lines+markers",
      x: days.map(d => d.label),
      y: days.map(d => d.count),
      line: { color: "#6366f1", width: 2, shape: "spline" },
      marker: { size: 6, color: "#6366f1" },
      fill: "tozeroy",
      fillcolor: "rgba(99,102,241,0.1)",
      hovertemplate: "%{x}: %{y} alerts<extra></extra>",
    }];
  }, [alerts]);

  const trendLayout = {
    margin: { t: 5, r: 5, l: 30, b: 25 },
    height: 160,
    xaxis: { showgrid: false, tickfont: { size: 9, color: "#64748b" }, tickangle: -30 },
    yaxis: { showgrid: true, gridcolor: "rgba(71,85,105,0.3)", tickfont: { size: 9, color: "#64748b" }, dtick: 2 },
    showlegend: false,
    font: { color: "#94a3b8", size: 10 },
  };

  const filteredAlerts = useMemo(() => {
    let result = alerts.filter(a => {
      if (filterSeverity !== "All" && a.severity !== filterSeverity) return false;
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (filterProvider !== "All" && a.providerName !== filterProvider) return false;
      if (filterInvestigator !== "All" && a.assigned !== filterInvestigator) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.claimId.toLowerCase().includes(q) ||
          a.patientName.toLowerCase().includes(q) ||
          a.providerName.toLowerCase().includes(q) ||
          a.diagnosisCode.toLowerCase().includes(q) ||
          a.diagnosisDesc.toLowerCase().includes(q) ||
          a.procedureCode.toLowerCase().includes(q)
        );
      }
      return true;
    });

    switch (sortBy) {
      case "risk":
        result.sort((a, b) => {
          const sevDiff = (SEVERITY_CONFIG[b.severity]?.score || 0) - (SEVERITY_CONFIG[a.severity]?.score || 0);
          if (sevDiff !== 0) return sevDiff;
          return b.claimAmount - a.claimAmount;
        });
        break;
      case "amount":
        result.sort((a, b) => b.claimAmount - a.claimAmount);
        break;
      case "sla":
        result.sort((a, b) => {
          const aSla = slaBreached(a) ? 1 : 0;
          const bSla = slaBreached(b) ? 1 : 0;
          if (bSla !== aSla) return bSla - aSla;
          return (SEVERITY_CONFIG[b.severity]?.score || 0) - (SEVERITY_CONFIG[a.severity]?.score || 0);
        });
        break;
      case "date":
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }
    return result;
  }, [alerts, filterSeverity, filterStatus, filterProvider, filterInvestigator, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredAlerts.length / PAGE_SIZE);
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAlerts.slice(start, start + PAGE_SIZE);
  }, [filteredAlerts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [filterSeverity, filterStatus, filterProvider, filterInvestigator, searchQuery, sortBy]);

  const toggleSelect = useCallback((id) => {
    setSelectedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedAlerts(prev => {
      if (prev.size === paginatedAlerts.length) return new Set();
      return new Set(paginatedAlerts.map(a => a.id));
    });
  }, [paginatedAlerts]);

  const handleBulkAssign = useCallback((investigator) => {
    setAlerts(prev => prev.map(a => selectedAlerts.has(a.id) ? { ...a, assigned: investigator } : a));
    setSelectedAlerts(new Set());
  }, [selectedAlerts]);

  const handleBulkResolve = useCallback(() => {
    setAlerts(prev => prev.map(a =>
      selectedAlerts.has(a.id) && a.status !== "Resolved"
        ? { ...a, status: "Resolved", resolution: "Confirmed Fraud",
            auditTrail: [...a.auditTrail, { action: "Resolved — Confirmed Fraud", actor: "Bulk Action", time: SYSTEM_NOW.toISOString(), detail: "Bulk resolve action applied" }]
          }
        : a
    ));
    setSelectedAlerts(new Set());
  }, [selectedAlerts]);

  const handleStartInvestigate = useCallback((id) => {
    setAlerts(prev => prev.map(a =>
      a.id === id && a.status === "New"
        ? { ...a, status: "Under Investigation",
            auditTrail: [...a.auditTrail, { action: "Investigation Started", actor: a.assigned || "Unassigned", time: SYSTEM_NOW.toISOString(), detail: "Preliminary review initiated" }]
          }
        : a
    ));
  }, []);

  const handleEscalate = useCallback((id) => {
    setAlerts(prev => prev.map(a =>
      a.id === id && (a.status === "Under Investigation" || a.status === "New")
        ? { ...a, status: "Escalated",
            auditTrail: [...a.auditTrail, { action: "Escalated to SIU", actor: a.assigned, time: SYSTEM_NOW.toISOString(), detail: "Escalating for senior review" }]
          }
        : a
    ));
  }, []);

  const handleAssign = useCallback((id, investigator) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, assigned: investigator,
        auditTrail: [...a.auditTrail, { action: `Assigned to ${investigator}`, actor: "Manual Assignment", time: SYSTEM_NOW.toISOString(), detail: `Investigator assigned manually` }]
      } : a
    ));
  }, []);

  const handleResolve = useCallback(() => {
    if (!resolveTarget || !resolveOutcome) return;
    setAlerts(prev => prev.map(a =>
      a.id === resolveTarget.id
        ? { ...a, status: "Resolved", resolution: resolveOutcome,
            auditTrail: [...a.auditTrail, { action: `Resolved — ${resolveOutcome}`, actor: a.assigned, time: SYSTEM_NOW.toISOString(), detail: resolveNote || `Marked as ${resolveOutcome}` }]
          }
        : a
    ));
    setShowResolveModal(false);
    setResolveTarget(null);
    setResolveOutcome("");
    setResolveNote("");
  }, [resolveTarget, resolveOutcome, resolveNote]);

  const openResolveModal = useCallback((alert) => {
    setResolveTarget(alert);
    setResolveOutcome("");
    setResolveNote("");
    setShowResolveModal(true);
  }, []);

  const toggleAI = useCallback((id) => {
    setExpandedAI(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setLastScan(new Date());
      setRefreshing(false);
    }, 800);
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-textPrimary tracking-tight">Alert Center</h1>
            <p className="text-sm text-textSecondary font-medium">
              Real-time fraud alerts — {activeAlerts.length} active, {alerts.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live</span>
          </div>
          <span className="text-[10px] text-textSecondary font-medium flex items-center gap-1">
            <Clock size={10} /> Last scan: {lastScan.toLocaleTimeString()}
          </span>
          <button onClick={handleRefresh} disabled={refreshing}
            className="enterprise-btn-ghost py-2 px-3 text-xs flex items-center gap-1.5">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-border/80 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Bell size={13} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Active Alerts</span>
          </div>
          <p className="text-xl font-black text-textPrimary">{activeAlerts.length}</p>
          <p className="text-[10px] text-textSecondary mt-0.5">
            {severityCounts.Critical} critical, {severityCounts.High} high
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign size={13} className="text-red-400" />
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">$ Exposure</span>
          </div>
          <p className="text-xl font-black text-textPrimary">{formatCompactCurrency(totalExposure)}</p>
          <p className="text-[10px] text-textSecondary mt-0.5">Active claim value at risk</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={13} className="text-amber-400" />
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Avg Resolution</span>
          </div>
          <p className="text-xl font-black text-textPrimary">{avgResolutionHours}h</p>
          <p className="text-[10px] text-textSecondary mt-0.5">Last 30 days average</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle size={13} className="text-red-500" />
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">SLA Breaches</span>
          </div>
          <p className="text-xl font-black text-red-500">{slaBreaches}</p>
          <p className="text-[10px] text-textSecondary mt-0.5">Critical unassigned &gt;24h</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Fraud Confirmed</span>
          </div>
          <p className="text-xl font-black text-textPrimary">{confirmedFraudPct}%</p>
          <p className="text-[10px] text-textSecondary mt-0.5">Of resolved alerts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl border border-border/80 p-4">
          <h3 className="text-xs font-bold text-textPrimary mb-2 flex items-center gap-1.5">
            <BarChart3 size={13} /> Severity Distribution <span className="text-[9px] font-normal text-textSecondary ml-1">(active)</span>
          </h3>
          <PlotlyChart data={severityDonutData} layout={severityDonutLayout} config={{ displayModeBar: false }} style={{ minHeight: "160px" }} />
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-4">
          <h3 className="text-xs font-bold text-textPrimary mb-2 flex items-center gap-1.5">
            <Activity size={13} /> 7-Day Alert Trend
          </h3>
          <PlotlyChart data={trendData} layout={trendLayout} config={{ displayModeBar: false }} style={{ minHeight: "160px" }} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border/80 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {SEVERITY_ORDER.map(sev => {
            const cfg = SEVERITY_CONFIG[sev];
            const Icon = cfg.icon;
            return (
              <button key={sev} onClick={() => setFilterSeverity(filterSeverity === sev ? "All" : sev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                  filterSeverity === sev ? `${cfg.color} ring-1 ${cfg.ring}` : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
                }`}>
                <Icon size={12} />
                <span>{sev}</span>
                <span className={`px-1 py-0.5 rounded text-[9px] font-black ${filterSeverity === sev ? "bg-white/10" : "bg-border/30"}`}>
                  {severityCounts[sev]}
                </span>
              </button>
            );
          })}
          <div className="h-4 w-px bg-border/40 mx-1" />
          {ALERT_STATUS.map(st => (
            <button key={st} onClick={() => setFilterStatus(filterStatus === st ? "All" : st)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                filterStatus === st ? "bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/20" : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
              }`}>
              {st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input type="text" placeholder="Search by title, claim ID, patient, provider, diagnosis..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="enterprise-input pl-8 w-full text-xs" />
          </div>
          <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="enterprise-select text-xs">
            <option value="All">All Providers</option>
            {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterInvestigator} onChange={e => setFilterInvestigator(e.target.value)} className="enterprise-select text-xs">
            <option value="All">All Investigators</option>
            {uniqueInvestigators.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="enterprise-select text-xs">
            <option value="date">Sort: Date (Newest)</option>
            <option value="risk">Sort: Risk Score</option>
            <option value="amount">Sort: Amount (Highest)</option>
            <option value="sla">Sort: SLA Status</option>
          </select>
        </div>
      </div>

      {selectedAlerts.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-primary">{selectedAlerts.size} alert{selectedAlerts.size !== 1 ? "s" : ""} selected</span>
          <div className="h-4 w-px bg-primary/20" />
          <select onChange={e => { if (e.target.value) { handleBulkAssign(e.target.value); e.target.value = ""; } }}
            className="enterprise-select text-xs py-1.5" defaultValue="">
            <option value="" disabled>Assign to...</option>
            {INVESTIGATORS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={handleBulkResolve}
            className="enterprise-btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 text-amber-400">
            <CheckCircle2 size={12} /> Bulk Resolve
          </button>
          <button onClick={() => setSelectedAlerts(new Set())}
            className="enterprise-btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 ml-auto">
            <X size={12} /> Clear Selection
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <button onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-[10px] font-bold text-textSecondary hover:text-textPrimary transition-colors">
            {selectedAlerts.size === paginatedAlerts.length && paginatedAlerts.length > 0
              ? <CheckSquare size={13} className="text-primary" />
              : <Square size={13} />}
            Select all on page
          </button>
          <span className="text-[10px] text-textSecondary">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredAlerts.length)}–{Math.min(currentPage * PAGE_SIZE, filteredAlerts.length)} of {filteredAlerts.length}
          </span>
        </div>

        {paginatedAlerts.map((alert, idx) => {
          const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Medium;
          const SevIcon = sev.icon;
          const isSlaBreach = slaBreached(alert);
          const isSelected = selectedAlerts.has(alert.id);
          const aiExpanded = expandedAI.has(alert.id);

          return (
            <div key={alert.id}
              className={`bg-surface rounded-2xl border p-5 transition-all duration-200 hover:shadow-[0_4px_20px_rgb(0_0_0/_0.06)] animate-fade-in-up ${
                isSelected ? "border-primary/40 ring-1 ring-primary/20" :
                isSlaBreach ? "border-red-500/40 ring-1 ring-red-500/10" :
                "border-border/80 hover:border-primary/30"
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}>

              {isSlaBreach && (
                <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">SLA Breach — Critical alert unassigned &gt;24h</span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <button onClick={() => toggleSelect(alert.id)} className="mt-1 shrink-0">
                  {isSelected
                    ? <CheckSquare size={15} className="text-primary" />
                    : <Square size={15} className="text-textSecondary/40 hover:text-textSecondary" />}
                </button>

                <div className={`p-2 rounded-xl shrink-0 ${sev.color}`}>
                  <SevIcon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-textPrimary text-sm">{alert.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {alert.reasonTags.map((tag, ti) => (
                          <span key={ti} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-bg/60 text-textSecondary border border-border/40">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${sev.color}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${STATUS_COLORS[alert.status] || "bg-bg/10 text-textSecondary border-border"}`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-textSecondary">Risk Score</span>
                      <span className={`text-[10px] font-black ${
                        alert.severity === "Critical" ? "text-red-500" :
                        alert.severity === "High" ? "text-orange-500" :
                        alert.severity === "Medium" ? "text-amber-400" : "text-blue-500"
                      }`}>{alert.claimAmount > 20000 ? "High" : alert.claimAmount > 10000 ? "Elevated" : "Moderate"} — {formatCurrency(alert.claimAmount)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-border/30 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${sev.barColor}`}
                        style={{ width: `${Math.min((alert.claimAmount / 30000) * 100, 100)}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10px] font-semibold text-textSecondary">
                    <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(alert.createdAt)}</span>
                    <span className="flex items-center gap-1"><User size={10} /> {alert.assigned}</span>
                    <span className="flex items-center gap-1 text-primary/80"><User size={10} /> {alert.patientName}</span>
                    <span className="flex items-center gap-1"><Building2 size={10} /> {alert.providerName}</span>
                    <span className="flex items-center gap-1"><Stethoscope size={10} /> {alert.diagnosisCode}</span>
                    <span className="flex items-center gap-1 font-mono text-primary"><FileText size={10} /> {alert.claimId}</span>
                    <span className="flex items-center gap-1 font-mono text-textSecondary/50 text-[9px]">
                      <BrainCircuit size={9} /> {MODEL_VERSION} • {formatDateTime(alert.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => toggleAI(alert.id)}
                      className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors">
                      <BrainCircuit size={11} />
                      {aiExpanded ? "Hide" : "View"} AI Reasoning
                      {aiExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                    <span className="text-border/40">|</span>
                    <button onClick={() => { setSelectedAlert(alert); setShowDetail(true); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
                      <Eye size={11} /> Details
                    </button>
                  </div>

                  {aiExpanded && (
                    <div className="mt-3 bg-bg/40 rounded-xl border border-border/40 p-3 animate-in fade-in duration-200">
                      <h4 className="text-[10px] font-bold text-textPrimary mb-2 flex items-center gap-1">
                        <Sparkles size={11} className="text-accent" /> AI Contributing Factors
                      </h4>
                      <div className="space-y-2">
                        {alert.aiFactors.map((f, fi) => (
                          <div key={fi}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-semibold text-textPrimary">{f.factor}</span>
                              <span className="text-[10px] font-black text-accent">{f.weight}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-border/20 overflow-hidden mb-0.5">
                              <div className="h-full rounded-full bg-accent/60 transition-all duration-500"
                                style={{ width: `${f.weight}%` }} />
                            </div>
                            <p className="text-[9px] text-textSecondary leading-relaxed">{f.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  {alert.status !== "Resolved" && (
                    <>
                      {alert.assigned === "Unassigned" && (
                        <select value="" onChange={e => { if (e.target.value) handleAssign(alert.id, e.target.value); }}
                          className="enterprise-select text-[10px] py-1 px-1.5 max-w-[120px]" title="Assign investigator">
                          <option value="" disabled>Assign</option>
                          {INVESTIGATORS.map(i => <option key={i} value={i}>{i.split(",")[0]}</option>)}
                        </select>
                      )}
                      {alert.status === "New" && (
                        <button onClick={() => handleStartInvestigate(alert.id)}
                          className="enterprise-btn-primary py-1.5 px-2.5 text-[10px] flex items-center gap-1">
                          <ArrowUpRight size={10} /> Investigate
                        </button>
                      )}
                      {(alert.status === "Under Investigation" || alert.status === "New") && (
                        <button onClick={() => handleEscalate(alert.id)}
                          className="enterprise-btn-ghost py-1.5 px-2.5 text-[10px] flex items-center gap-1">
                          <Send size={10} /> Escalate
                        </button>
                      )}
                      <button onClick={() => openResolveModal(alert)}
                        className="enterprise-btn-ghost py-1.5 px-2.5 text-[10px] flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={10} /> Resolve
                      </button>
                    </>
                  )}
                  {alert.status === "Resolved" && alert.resolution && (
                    <span className={`px-2 py-1 rounded text-[9px] font-bold ${STATUS_COLORS[alert.resolution] || "bg-bg/10 text-textSecondary"}`}>
                      {alert.resolution}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No alerts match your filters</p>
            <p className="text-xs text-textSecondary/60 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="enterprise-btn-ghost py-1.5 px-2.5 text-xs disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                page === currentPage ? "bg-primary text-white" : "bg-bg/40 text-textSecondary hover:bg-surface-hover border border-border/50"
              }`}>
              {page}
            </button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="enterprise-btn-ghost py-1.5 px-2.5 text-xs disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Alert">
        {resolveTarget && (
          <div className="space-y-4">
            <div className="bg-bg/40 rounded-xl border border-border/40 p-3">
              <p className="text-xs font-bold text-textPrimary">{resolveTarget.title}</p>
              <p className="text-[10px] text-textSecondary mt-1">{resolveTarget.claimId} — {formatCurrency(resolveTarget.claimAmount)}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-textPrimary block mb-2">Resolution Outcome</label>
              <div className="space-y-2">
                {RESOLUTION_OUTCOMES.map(outcome => (
                  <button key={outcome} onClick={() => setResolveOutcome(outcome)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      resolveOutcome === outcome
                        ? outcome === "Confirmed Fraud" ? "bg-red-500/10 text-red-400 border-red-500/30 ring-1 ring-red-500/20"
                          : outcome === "False Positive" ? "bg-blue-500/10 text-blue-400 border-blue-500/30 ring-1 ring-blue-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/30 ring-1 ring-slate-500/20"
                        : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
                    }`}>
                    <div className="flex items-center gap-2">
                      {outcome === "Confirmed Fraud" ? <AlertTriangle size={14} /> :
                       outcome === "False Positive" ? <XCircle size={14} /> : <Minus size={14} />}
                      {outcome}
                    </div>
                    <p className="text-[10px] mt-1 opacity-70">
                      {outcome === "Confirmed Fraud" ? "Claim is fraudulent — initiate recovery" :
                       outcome === "False Positive" ? "AI flag was incorrect — close alert" :
                       "No action needed — routine close"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-textPrimary block mb-1.5">Resolution Note (optional)</label>
              <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                placeholder="Add details about the resolution..." rows={3}
                className="enterprise-input w-full text-xs resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowResolveModal(false)}
                className="enterprise-btn-ghost flex-1 py-2.5 text-xs">Cancel</button>
              <button onClick={handleResolve} disabled={!resolveOutcome}
                className="enterprise-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40">
                <CheckCircle2 size={14} /> Confirm Resolution
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Alert Investigation Detail" wide>
        {selectedAlert && <DetailContent alert={selectedAlert} />}
      </Modal>
    </div>
  );
}

function DetailContent({ alert }) {
  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Medium;
  const SevIcon = sev.icon;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${sev.color}`}>
          <SevIcon size={10} className="inline mr-1" />{alert.severity}
        </span>
        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[alert.status] || "bg-bg/10 text-textSecondary border-border"}`}>
          {alert.status}
        </span>
        {alert.resolution && (
          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[alert.resolution] || "bg-bg/10 text-textSecondary border-border"}`}>
            {alert.resolution}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-textSecondary">{alert.id}</span>
      </div>

      <div>
        <h3 className="text-base font-bold text-textPrimary mb-1">{alert.title}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {alert.reasonTags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-bg/60 text-textSecondary border border-border/40">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border/60 pt-4">
        <div>
          <span className="text-textSecondary block mb-0.5">Claim ID</span>
          <span className="font-mono font-bold text-primary">{alert.claimId}</span>
        </div>
        <div>
          <span className="text-textSecondary block mb-0.5">Amount</span>
          <span className="font-bold text-textPrimary">{formatCurrency(alert.claimAmount)}</span>
        </div>
        <div>
          <span className="text-textSecondary block mb-0.5">Patient</span>
          <span className="font-bold text-textPrimary">{alert.patientName}</span>
        </div>
        <div>
          <span className="text-textSecondary block mb-0.5">Provider</span>
          <span className="font-bold text-textPrimary">{alert.providerName}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs border-t border-border/60 pt-4">
        <div>
          <span className="text-textSecondary block mb-0.5">Diagnosis</span>
          <span className="font-mono font-bold text-textPrimary">{alert.diagnosisCode}</span>
          <p className="text-[10px] text-textSecondary">{alert.diagnosisDesc}</p>
        </div>
        <div>
          <span className="text-textSecondary block mb-0.5">Procedure</span>
          <span className="font-mono font-bold text-textPrimary">{alert.procedureCode}</span>
          <p className="text-[10px] text-textSecondary">{alert.procedureDesc}</p>
        </div>
        <div>
          <span className="text-textSecondary block mb-0.5">Assigned</span>
          <span className="font-bold text-textPrimary">{alert.assigned}</span>
        </div>
      </div>

      <div className="bg-bg/40 rounded-xl border border-border/60 p-4">
        <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
          <BrainCircuit size={14} className="text-accent" /> AI Reasoning
        </h4>
        <div className="space-y-3">
          {alert.aiFactors.map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-semibold text-textPrimary">{f.factor}</span>
                <span className="text-[11px] font-black text-accent">{f.weight}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-border/20 overflow-hidden mb-1">
                <div className="h-full rounded-full bg-accent/60" style={{ width: `${f.weight}%` }} />
              </div>
              <p className="text-[10px] text-textSecondary leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bg/40 rounded-xl border border-border/60 p-4">
        <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
          <Activity size={14} /> Claim Amount Context
        </h4>
        <div className="w-full h-3 rounded-full bg-border/30 overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-700 ${sev.barColor}`}
            style={{ width: `${Math.min((alert.claimAmount / 30000) * 100, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-textSecondary">
          <span>$0</span>
          <span className="font-bold text-textPrimary">{formatCurrency(alert.claimAmount)}</span>
          <span>$30K+</span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
          <History size={14} /> Audit Trail
        </h4>
        <div className="space-y-0 relative ml-2">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
          {alert.auditTrail.map((event, i) => (
            <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
              <div className={`relative z-10 w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-0.5 ${
                i === alert.auditTrail.length - 1 ? "border-primary bg-primary/20" : "border-border bg-surface"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-textPrimary">{event.action}</span>
                  <span className="text-[9px] text-textSecondary font-mono">
                    {new Date(event.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] text-textSecondary mt-0.5">{event.detail}</p>
                <p className="text-[10px] text-textSecondary/60 mt-0.5">by {event.actor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
