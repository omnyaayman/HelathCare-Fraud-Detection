import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Filter, AlertTriangle, ShieldCheck, X, ArrowUpRight, DollarSign, Bell,
  User, Users, Building2, FileText, BrainCircuit, Clock, Send, Download, ChevronDown,
  Activity, Eye, Zap, MapPin, CheckSquare, Square, History, MessageSquare,
  Paperclip, ExternalLink, Link2, CheckCircle2, Flag, Bookmark, BookmarkCheck, RotateCcw,
} from "lucide-react";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import {
  formatCurrency, getRiskLevel, buildSHAPExplanation, getStatusColor,
} from "../../data/dataUtils";
import {
  CANONICAL_PATIENTS, CANONICAL_PROVIDERS, CANONICAL_FRAUD_DIAGNOSES,
  CANONICAL_REFERENCE, CANONICAL_INVESTIGATORS,
} from "../../data/canonicalData";
import api from "../../api";

const SYSTEM_NOW = new Date();
const MODEL_VERSION = "v3.2.1";
const INVESTIGATORS = [...CANONICAL_INVESTIGATORS];

const STATUSES = ["New", "Under Review", "Escalated", "Closed", "Approved"];
const STATUS_ORDER = { "New": 0, "Under Review": 1, "Escalated": 2, "Closed": 3, "Approved": 4 };
const RESOLUTION_OUTCOMES = ["Confirmed Fraud", "False Positive", "Billing Error (No Fraud)"];

const FRAUD_PATTERNS = ["Upcoding", "Phantom Billing", "Doctor Shopping", "Duplicate Billing", "Unbundling"];

const PATIENT_FRAUD_MATRIX = [
  ["Upcoding", "Upcoding", "Upcoding"],
  ["Phantom Billing", "Phantom Billing", "Doctor Shopping"],
  ["Doctor Shopping", "Unbundling", "Doctor Shopping"],
  ["Duplicate Billing", "Unbundling", "Phantom Billing"],
  ["Unbundling", "Unbundling", "Upcoding"],
  ["Phantom Billing", "Phantom Billing", "Phantom Billing"],
  ["Doctor Shopping", "Duplicate Billing", "Doctor Shopping"],
  ["Duplicate Billing", "Duplicate Billing", "Upcoding"],
  ["Upcoding", "Phantom Billing", "Doctor Shopping"],
  ["Unbundling", "Unbundling", "Unbundling"],
];

const SERVICE_TYPES = [
  { name: "Office Visit", cpt: ["99213", "99214", "99215", "99203", "99204"], amountRange: [150, 500] },
  { name: "Lab Work", cpt: ["80053", "80054", "82947", "84443", "85025"], amountRange: [200, 800] },
  { name: "Imaging", cpt: ["71046", "72148", "70553", "73721", "76856"], amountRange: [500, 3000] },
  { name: "Physical Therapy", cpt: ["97110", "97140", "97530", "97112", "97760"], amountRange: [100, 400] },
  { name: "Emergency Visit", cpt: ["99281", "99282", "99283", "99284", "99285"], amountRange: [800, 5000] },
  { name: "Surgery Consultation", cpt: ["10120", "27447", "29881", "43239", "49505"], amountRange: [1000, 5000] },
  { name: "Cardiology Consult", cpt: ["93306", "93000", "93303", "93015", "93307"], amountRange: [600, 2500] },
  { name: "Neurology Consult", cpt: ["95910", "95913", "99245", "95816", "95819"], amountRange: [500, 2000] },
];

const SERVICE_RECOMMENDATIONS = {
  "Office Visit": {
    "Upcoding": "E/M level billed does not match documented complexity. Request encounter notes for level validation and schedule coding audit.",
    "Phantom Billing": "Office visit claim submitted for date provider facility was closed. Request proof of service delivery and patient sign-in records.",
    "Doctor Shopping": "Patient has multiple office visit claims across different providers within 30 days for similar complaints. Cross-reference PDMP and coordinate with providers.",
    "Duplicate Billing": "Duplicate office visit claim detected for same patient on same date. Verify whether separate visits occurred or if this is duplicate submission.",
    "Unbundling": "Office visit billed separately from bundled diagnostic services. Review NCCI edits for proper bundling requirements.",
  },
  "Lab Work": {
    "Upcoding": "Lab panel billed at higher complexity tier than ordered tests justify. Cross-reference physician orders with lab requisitions.",
    "Phantom Billing": "Lab results submitted without corresponding physician order. Verify ordering provider and clinical justification.",
    "Doctor Shopping": "Patient has lab work ordered by multiple providers for overlapping indications within short timeframe. Flag for coordinated review.",
    "Duplicate Billing": "Duplicate lab panel billed within 7-day window. Verify clinical justification for repeat testing.",
    "Unbundling": "Lab components billed individually where panel code exists. Compare against CMS bundling edits.",
  },
  "Imaging": {
    "Upcoding": "Advanced imaging ordered without conservative treatment history per ACR Appropriateness Criteria. Review clinical justification.",
    "Phantom Billing": "Imaging claim billed without corresponding radiologist interpretation on file. Request signed report.",
    "Doctor Shopping": "Patient received identical imaging studies at multiple facilities within 14 days. Cross-reference PACS records.",
    "Duplicate Billing": "Duplicate imaging study billed for same body part within 30 days. Verify clinical necessity for repeat imaging.",
    "Unbundling": "Imaging components billed separately where comprehensive code exists. Check NCCI edit compliance.",
  },
  "Physical Therapy": {
    "Upcoding": "PT visit billed at higher complexity than treatment plan supports. Review session notes for actual services rendered.",
    "Phantom Billing": "Physical therapy claim shows services on dates patient had no documented appointment. Request sign-in logs and treatment records.",
    "Doctor Shopping": "Patient receiving PT from multiple providers simultaneously for same diagnosis. Verify single-provider treatment plan.",
    "Duplicate Billing": "Duplicate PT session billed for same date and procedure. Verify if concurrent sessions occurred.",
    "Unbundling": "PT modalities billed separately where bundled code applies. Review CCI edits for PT coding.",
  },
  "Emergency Visit": {
    "Upcoding": "Emergency visit billed at high acuity level inconsistent with presenting complaint. Review triage documentation.",
    "Phantom Billing": "Emergency visit claim for date facility was at capacity closure. Request security logs and patient records.",
    "Doctor Shopping": "High-frequency emergency utilization with overlapping diagnoses across multiple ERs. Flag for utilization review.",
    "Duplicate Billing": "Duplicate emergency department visit claim for same date of service. Verify if patient was registered twice.",
    "Unbundling": "Emergency visit components unbundled from global ED code. Review ED coding guidelines.",
  },
  "Surgery Consultation": {
    "Upcoding": "Surgical consultation billed at level not supported by documentation complexity. Request operative planning notes.",
    "Phantom Billing": "Surgical consultation recorded without corresponding follow-up procedure or surgical booking. Verify consultation occurred.",
    "Doctor Shopping": "Patient received surgical consultations from multiple surgeons for same condition within 60 days. Review referral pattern.",
    "Duplicate Billing": "Duplicate surgical consultation claim for same date and provider. Verify if separate encounters occurred.",
    "Unbundling": "Surgical consultation unbundled from procedural pre-op workup. Check global surgical package rules.",
  },
  "Cardiology Consult": {
    "Upcoding": "Cardiology consultation billed at elevated level without diagnostic workup documentation. Review consultation notes.",
    "Phantom Billing": "Cardiology consultation claim without corresponding cardiac testing orders. Verify clinical encounter.",
    "Doctor Shopping": "Patient seen by multiple cardiologists for same symptoms within 30 days. Cross-reference referral network.",
    "Duplicate Billing": "Duplicate cardiology consultation billed within 14-day window. Verify distinct clinical encounters.",
    "Unbundling": "Cardiac testing billed separately from consultation global fee. Review cardiac coding bundling rules.",
  },
  "Neurology Consult": {
    "Upcoding": "Neurology consultation billed at level inconsistent with documented neurological examination. Review examination depth.",
    "Phantom Billing": "Neurology consultation recorded without neurological examination documentation. Request examination records.",
    "Doctor Shopping": "Patient consulted multiple neurologists for same presenting complaint within 45 days. Flag for review.",
    "Duplicate Billing": "Duplicate neurology consultation claim for overlapping date range. Verify separate clinical encounters.",
    "Unbundling": "Neurological testing unbundled from consultation. Check NCCI neurology bundling edits.",
  },
};

function getRecommendation(serviceName, fraudPattern, claim) {
  const serviceRecs = SERVICE_RECOMMENDATIONS[serviceName] || SERVICE_RECOMMENDATIONS["Office Visit"];
  return serviceRecs[fraudPattern] || serviceRecs["Upcoding"] || "Standard review recommended. Examine documentation completeness and medical necessity.";
}

function getPriority(score) {
  if (score >= 0.90) return { label: "P1", full: "P1 — Immediate", color: "text-red-400 bg-red-500/10 border-red-500/20", dot: "bg-red-500" };
  if (score >= 0.70) return { label: "P2", full: "P2 — Urgent", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", dot: "bg-orange-500" };
  if (score >= 0.40) return { label: "P3", full: "P3 — Standard", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" };
  return { label: "P4", full: "P4 — Review", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" };
}

const FLAGGED_CLAIMS = (() => {
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const randDate = (startDays, endDays) => {
    const d = new Date(SYSTEM_NOW);
    d.setDate(d.getDate() - randInt(startDays, endDays));
    d.setHours(randInt(6, 20), randInt(0, 59), 0, 0);
    return d.toISOString();
  };

  const providers = CANONICAL_PROVIDERS;
  const patients = CANONICAL_PATIENTS;
  const diagnoses = CANONICAL_FRAUD_DIAGNOSES;

  const STATUS_DIST = [
    ...Array(4).fill(null).map(() => "New"),
    ...Array(11).fill(null).map(() => "Under Review"),
    ...Array(3).fill(null).map(() => "Escalated"),
    ...Array(6).fill(null).map(() => "Closed"),
    ...Array(6).fill(null).map(() => "Closed"),
  ];
  const OUTCOME_DIST = [
    null, null, null, null,
    null, null, null, null, null, null,
    null, null, null, null, null,
    null, null, null,
    "Billing Error (No Fraud)", "Billing Error (No Fraud)",
    "Confirmed Fraud", "Confirmed Fraud", "Confirmed Fraud", "Confirmed Fraud",
    "False Positive", "False Positive",
    "Billing Error (No Fraud)", "Billing Error (No Fraud)",
    "Confirmed Fraud", "Confirmed Fraud",
  ];
  const RESOLUTION_REASONS = {
    "Confirmed Fraud": [
      "Provider systematically billed Level 5 E/M codes for Level 2-3 visits across 47 patients. Documentation audit confirmed pattern.",
      "Claims submitted for dates when facility was closed. Security footage and sign-in logs confirm services were not rendered.",
      "Patient medical records show services billed were never ordered by treating physician. Coordinated billing ring suspected.",
      "Lab panels ordered by unlicensed staff under provider NPI. Provider failed to demonstrate direct supervision.",
      "Imaging studies billed at facility different from where patient was located. GPS and scheduling data confirm non-delivery.",
      "PT sessions billed for dates patient was hospitalized. Inpatient records confirm patient could not have received outpatient services.",
    ],
    "False Positive": [
      "Investigation confirmed legitimate billing practices. Documentation supports billed levels upon detailed review.",
      "Patient确实 visited provider multiple times for different complaints. Claims are distinct and properly documented.",
      "Provider practice pattern is within normal variation for specialty and patient population complexity.",
    ],
    "Billing Error (No Fraud)": [
      "Administrative coding error — incorrect modifier applied. Provider education provided. Corrected claim resubmitted.",
      "Duplicate submission due to EHR system glitch. Single service confirmed. Duplicate voided.",
    ],
  };

  const claims = [];
  for (let i = 0; i < 30; i++) {
    const p = providers[i % providers.length];
    const pt = patients[i % patients.length];
    const d = diagnoses[i % diagnoses.length];
    const svc = SERVICE_TYPES[i % SERVICE_TYPES.length];
    const cpt = pick(svc.cpt);
    const patientIdx = i % 10;
    const claimIdx = Math.floor(i / 10);
    const fraudPattern = PATIENT_FRAUD_MATRIX[patientIdx][claimIdx];
    const amount = randInt(svc.amountRange[0], svc.amountRange[1]);
    const claimDate = randDate(10, 120);
    const claimDateObj = new Date(claimDate);
    const serviceDate = new Date(claimDateObj);
    serviceDate.setDate(serviceDate.getDate() - randInt(0, 3));
    const daysAgo = Math.floor((SYSTEM_NOW - claimDateObj) / 86400000);

    let fraudScore;
    const roll = rand();
    if (i < 5) fraudScore = randInt(90, 99) / 100;
    else if (i < 17) fraudScore = randInt(70, 89) / 100;
    else if (i < 25) fraudScore = randInt(50, 69) / 100;
    else fraudScore = randInt(30, 49) / 100;

    const status = STATUS_DIST[i];
    const resolutionOutcome = OUTCOME_DIST[i] || null;
    const resolutionReason = resolutionOutcome ? pick(RESOLUTION_REASONS[resolutionOutcome]) : null;

    const assignedInvestigator = status === "New" ? null : pick(INVESTIGATORS);
    const claimId = `CLM-2026-${String(200301 + i).padStart(6, "0")}`;
    const alertId = `ALT-${String(2001 + i).padStart(4, "0")}`;

    const priorClaims = randInt(1, 14);
    const numProcedures = randInt(1, 4);
    const distance = randInt(5, 350);
    const late = rand() > 0.88;

    let sub_scores;
    {
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
      switch (fraudPattern) {
        case "Upcoding":
        case "Unbundling":
          sub_scores = { codingAnomaly: 0.55 + r1 * 0.30, duplicateBilling: 0.03 + r2 * 0.10, providerAnomaly: 0.08 + r3 * 0.15, outlierDetection: 0.12 + r4 * 0.18 };
          break;
        case "Duplicate Billing":
          sub_scores = { duplicateBilling: 0.55 + r1 * 0.30, codingAnomaly: 0.03 + r2 * 0.10, providerAnomaly: 0.08 + r3 * 0.15, outlierDetection: 0.12 + r4 * 0.18 };
          break;
        case "Phantom Billing":
          sub_scores = { providerAnomaly: 0.50 + r1 * 0.30, outlierDetection: 0.40 + r2 * 0.30, codingAnomaly: 0.06 + r3 * 0.12, duplicateBilling: 0.04 + r4 * 0.10 };
          break;
        case "Doctor Shopping":
          sub_scores = { duplicateBilling: 0.50 + r1 * 0.28, providerAnomaly: 0.28 + r2 * 0.22, codingAnomaly: 0.06 + r3 * 0.12, outlierDetection: 0.08 + r4 * 0.15 };
          break;
        default:
          sub_scores = { duplicateBilling: 0.15 + r1 * 0.20, codingAnomaly: 0.15 + r2 * 0.20, providerAnomaly: 0.15 + r3 * 0.20, outlierDetection: 0.15 + r4 * 0.20 };
      }
    }

    const aiRec = getRecommendation(svc.name, fraudPattern, {
      claim_amount: amount, number_of_previous_claims_patient: priorClaims,
      provider_patient_distance_miles: distance, fraud_pattern: fraudPattern,
    });

    const baseDate = new Date(claimDateObj);
    const timeline = [
      { action: "Claim Flagged by AI", actor: `AI Engine ${MODEL_VERSION}`, time: baseDate.toISOString(), detail: `Risk score: ${(fraudScore * 100).toFixed(1)}% — ${fraudScore >= 0.90 ? "Critical" : fraudScore >= 0.70 ? "High" : fraudScore >= 0.40 ? "Medium" : fraudScore >= 0.20 ? "Low" : "Minimal"} risk. Pattern: ${fraudPattern}.` },
    ];

    if (status !== "New") {
      const assignTime = new Date(baseDate.getTime() + 3600000);
      timeline.push({ action: "Assigned for Review", actor: assignedInvestigator, time: assignTime.toISOString(), detail: `Case assigned to ${assignedInvestigator} for investigation.` });
    }
    if (["Under Review", "Escalated", "Closed", "Approved"].includes(status)) {
      const invTime = new Date(baseDate.getTime() + 7200000);
      timeline.push({ action: "Investigation Started", actor: assignedInvestigator, time: invTime.toISOString(), detail: "Preliminary review initiated. Evidence collection in progress." });
    }
    if (["Escalated", "Closed", "Approved"].includes(status)) {
      const escTime = new Date(baseDate.getTime() + 14400000);
      const actor = status === "Escalated" ? "System Auto-Escalate" : assignedInvestigator;
      timeline.push({ action: "Escalated to Compliance", actor, time: escTime.toISOString(), detail: "Risk score exceeded threshold. Compliance team notified for review." });
    }
    if (status === "Closed") {
      const closeTime = new Date(baseDate.getTime() + 28800000);
      timeline.push({ action: "Investigation Completed", actor: assignedInvestigator, time: closeTime.toISOString(), detail: `Resolution: ${resolutionOutcome}. ${resolutionReason || ""}` });
    }
    if (status === "Approved") {
      const approveTime = new Date(baseDate.getTime() + 28800000);
      timeline.push({ action: "Claim Approved with Note", actor: assignedInvestigator, time: approveTime.toISOString(), detail: `Approved after investigation. Resolution note: ${resolutionReason || "Claim reviewed and cleared for payment."}` });
    }

    const caseNotes = [];
    if (status !== "New") {
      caseNotes.push({ author: `AI Engine ${MODEL_VERSION}`, text: `Initial risk assessment: ${(fraudScore * 100).toFixed(1)}% fraud probability. Key factors: ${fraudPattern} pattern detected across ${svc.name} claims.`, time: baseDate.toISOString() });
    }
    if (["Under Review", "Escalated", "Closed", "Approved"].includes(status)) {
      const noteAuthor = assignedInvestigator;
      const notes = [
        `Reviewing patient claim history — ${priorClaims} prior claims on file. Cross-referencing with provider billing patterns.`,
        `Examined procedure codes: ${cpt} billed for ${svc.name}. ${distance > 200 ? `Provider-patient distance of ${distance}mi flagged as anomaly.` : "Distance within normal range."}`,
        `Cross-referenced claim with NCCI bundling edits and ACR appropriateness criteria. ${fraudPattern} pattern ${fraudScore >= 0.7 ? "confirmed" : "under evaluation"}.`,
        `Documentation review complete. ${resolutionOutcome === "Confirmed Fraud" ? "Evidence supports fraud determination." : resolutionOutcome === "False Positive" ? "Documentation supports legitimate billing." : "Administrative error identified."}`,
      ];
      const noteCount = status === "Under Review" ? 2 : status === "Escalated" ? 3 : 4;
      for (let n = 0; n < noteCount && n < notes.length; n++) {
        caseNotes.push({ author: noteAuthor, text: notes[n], time: new Date(baseDate.getTime() + (n + 2) * 3600000).toISOString() });
      }
    }

    const evidence = [
      { type: "AI Finding", title: `${fraudPattern} pattern detected in ${svc.name} claims`, date: claimDateObj.toISOString().split("T")[0] },
    ];
    if (priorClaims > 5) evidence.push({ type: "Pattern", title: `Patient has ${priorClaims} prior claims — elevated frequency`, date: claimDateObj.toISOString().split("T")[0] });
    if (distance > 200) evidence.push({ type: "Pattern", title: `Provider-patient distance: ${distance}mi — geographic anomaly`, date: claimDateObj.toISOString().split("T")[0] });
    if (resolutionOutcome === "Confirmed Fraud") evidence.push({ type: "Document", title: "Documentation audit report confirms billing discrepancy", date: claimDateObj.toISOString().split("T")[0] });

    claims.push({
      claim_id: claimId,
      patient_name: pt.name,
      patient_id: pt.id,
      provider_name: p.name,
      provider_id: p.id,
      service_name: svc.name,
      diagnosis_code: d.code,
      diagnosis_desc: d.description,
      procedure_code: cpt,
      claim_amount: amount,
      fraud_score: fraudScore,
      status,
      priority: getPriority(fraudScore).label,
      resolution_outcome: resolutionOutcome,
      resolution_reason: resolutionReason,
      claim_date: claimDateObj.toISOString().split("T")[0],
      service_date: serviceDate.toISOString().split("T")[0],
      fraud_pattern: fraudPattern,
      ai_recommendation: aiRec,
      investigator: assignedInvestigator,
      alert_id: alertId,
      number_of_previous_claims_patient: priorClaims,
      number_of_procedures: numProcedures,
      provider_patient_distance_miles: distance,
      claim_submitted_late: late,
      case_notes: caseNotes,
      evidence,
      timeline,
      sub_scores,
    });
  }
  return claims;
})();

const PATIENT_REPEAT_MAP = {};
FLAGGED_CLAIMS.forEach(c => {
  if (!PATIENT_REPEAT_MAP[c.patient_id]) PATIENT_REPEAT_MAP[c.patient_id] = [];
  PATIENT_REPEAT_MAP[c.patient_id].push(c);
});
FLAGGED_CLAIMS.forEach(c => {
  const patientClaims = PATIENT_REPEAT_MAP[c.patient_id] || [];
  const samePattern = patientClaims.filter(p => p.fraud_pattern === c.fraud_pattern);
  if (samePattern.length > 1) {
    const otherClaims = samePattern.filter(p => p.claim_id !== c.claim_id);
    const otherProviders = [...new Set(otherClaims.map(p => p.provider_name))];
    c.repeat_info = {
      count: samePattern.length,
      pattern: c.fraud_pattern,
      other_claims: otherClaims.map(p => p.claim_id),
      other_providers: otherProviders,
      is_multi_provider: otherProviders.length > 1,
      detected_pattern: otherProviders.length > 1
        ? `Multi-Provider ${c.fraud_pattern} (${samePattern.length} claims across ${otherProviders.length + 1} providers)`
        : `Repeated ${c.fraud_pattern} at ${c.provider_name} (${samePattern.length} claims)`,
    };
  }
});

const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const STATUS_OPTIONS = ["All", "New", "Under Review", "Escalated", "Closed", "Approved"];
const OUTCOME_OPTIONS = ["All", "Confirmed Fraud", "False Positive", "Billing Error (No Fraud)"];

const SAVED_VIEWS = [
  { id: "my-assigned", label: "My Assigned", icon: User, filter: (c) => c.investigator === INVESTIGATORS[0] },
  { id: "high-risk", label: "High Risk Only", icon: AlertTriangle, filter: (c) => c.fraud_score >= 0.70 },
  { id: "needs-review", label: "Needs Review", icon: Eye, filter: (c) => c.status === "New" || c.status === "Under Review" },
  { id: "escalated", label: "Escalated", icon: Flag, filter: (c) => c.status === "Escalated" },
  { id: "resolved", label: "Resolved", icon: ShieldCheck, filter: (c) => c.status === "Closed" || c.status === "Approved" },
];

function ScoreBar({ label, score, color, tooltip }) {
  return (
    <div className="flex items-center gap-3" title={tooltip || label}>
      <span className="text-[10px] text-textSecondary w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-bg/60 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score * 100, 100)}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-textPrimary w-10 text-right">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function PriorityBadge({ score }) {
  const p = getPriority(score);
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${p.color}`}>{p.full}</span>;
}

function SeverityBadge({ score }) {
  const r = getRiskLevel(score);
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${r.bg} ${r.color} ${r.border}`}>{r.label}</span>;
}

function OutcomeBadge({ outcome }) {
  if (!outcome) return null;
  const colors = {
    "Confirmed Fraud": "bg-red-500/10 text-red-400 border-red-500/20",
    "False Positive": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Billing Error (No Fraud)": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${colors[outcome] || "bg-bg/10 text-textSecondary border-border"}`}>{outcome}</span>;
}

function exportToCSV(claims) {
  const headers = ["Claim ID", "Patient", "Provider", "Amount", "Risk Score", "Severity", "Priority", "Status", "Investigator", "Outcome", "Date", "Service", "Diagnosis", "Procedure", "Fraud Pattern"];
  const rows = claims.map(c => [
    c.claim_id, c.patient_name, c.provider_name, c.claim_amount,
    (c.fraud_score || 0).toFixed(4), getRiskLevel(c.fraud_score || 0).label,
    getPriority(c.fraud_score || 0).label, c.status,
    c.investigator || "Unassigned", c.resolution_outcome || "",
    c.claim_date, c.service_name, c.diagnosis_code, c.procedure_code, c.fraud_pattern,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flagged_claims_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SLA_LIMITS = { P1: 24, P2: 72, P3: 168, P4: 720 };

function getAgingInfo(claimDate, priority, status) {
  if (status === "Closed" || status === "Approved") return null;
  const elapsed = (SYSTEM_NOW - new Date(claimDate)) / 3600000;
  const hours = Math.floor(elapsed);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  const elapsedText = days > 0 ? `${days}d ${remH}h` : `${hours}h`;
  const slaLimit = SLA_LIMITS[priority] || SLA_LIMITS.P4;
  const breached = elapsed > slaLimit;
  const remaining = Math.max(0, slaLimit - elapsed);
  const remDays = Math.floor(remaining / 24);
  const remH2 = Math.floor(remaining % 24);
  const remainingText = remaining > 0 ? `${remDays}d ${remH2}h left` : "SLA breached";
  let color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (breached) color = "bg-red-500/10 text-red-400 border-red-500/20";
  else if (remaining < slaLimit * 0.25) color = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return { elapsedText, remainingText, breached, color };
}

export default function FlaggedClaims() {
  const [claims] = useState(FLAGGED_CLAIMS);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [investigatorFilter, setInvestigatorFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("risk_desc");
  const [activeSavedView, setActiveSavedView] = useState(null);

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

  const [selectedClaims, setSelectedClaims] = useState(new Set());
  const [bulkInvestigator, setBulkInvestigator] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveOutcome, setResolveOutcome] = useState("");
  const [resolveReason, setResolveReason] = useState("");

  const [suspiciousPatterns, setSuspiciousPatterns] = useState([]);
  useEffect(() => {
    api.getPatientSuspiciousPatterns().then(p => setSuspiciousPatterns(p || [])).catch(() => {});
  }, []);

  const uniqueProviders = useMemo(() => [...new Set(claims.map(c => c.provider_name))].sort(), [claims]);
  const uniqueInvestigators = useMemo(() => [...new Set(claims.map(c => c.investigator).filter(Boolean))].sort(), [claims]);

  const activeClaims = useMemo(() => claims.filter(c => c.status !== "Closed" && c.status !== "Approved"), [claims]);
  const resolvedClaims = useMemo(() => claims.filter(c => c.status === "Closed" || c.status === "Approved"), [claims]);

  const patientPatternsMap = useMemo(() => {
    const map = {};
    suspiciousPatterns.forEach(p => {
      if (!map[p.patient_name]) map[p.patient_name] = [];
      map[p.patient_name].push(p);
    });
    return map;
  }, [suspiciousPatterns]);

  const filtered = useMemo(() => {
    let result = [...claims];

    if (activeSavedView) {
      const sv = SAVED_VIEWS.find(v => v.id === activeSavedView);
      if (sv) result = result.filter(sv.filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.claim_id?.toLowerCase().includes(q) ||
        c.patient_name?.toLowerCase().includes(q) ||
        c.provider_name?.toLowerCase().includes(q) ||
        c.diagnosis_code?.toLowerCase().includes(q) ||
        c.fraud_pattern?.toLowerCase().includes(q)
      );
    }
    if (severityFilter === "Critical") result = result.filter(c => (c.fraud_score || 0) >= 0.90);
    else if (severityFilter === "High") result = result.filter(c => (c.fraud_score || 0) >= 0.70 && (c.fraud_score || 0) < 0.90);
    else if (severityFilter === "Medium") result = result.filter(c => (c.fraud_score || 0) >= 0.40 && (c.fraud_score || 0) < 0.70);
    else if (severityFilter === "Low") result = result.filter(c => (c.fraud_score || 0) >= 0.20 && (c.fraud_score || 0) < 0.40);
    else if (severityFilter === "Minimal") result = result.filter(c => (c.fraud_score || 0) < 0.20);

    if (statusFilter !== "All") result = result.filter(c => c.status === statusFilter);
    if (priorityFilter !== "All") result = result.filter(c => c.priority === priorityFilter);
    if (providerFilter !== "All") result = result.filter(c => c.provider_name === providerFilter);
    if (investigatorFilter === "Unassigned") result = result.filter(c => !c.investigator);
    else if (investigatorFilter !== "All") result = result.filter(c => c.investigator === investigatorFilter);
    if (outcomeFilter !== "All") result = result.filter(c => c.resolution_outcome === outcomeFilter);

    if (sortBy === "risk_desc") result.sort((a, b) => (b.fraud_score || 0) - (a.fraud_score || 0));
    else if (sortBy === "amount_desc") result.sort((a, b) => (b.claim_amount || 0) - (a.claim_amount || 0));
    else if (sortBy === "date_desc") result.sort((a, b) => new Date(b.claim_date || 0) - new Date(a.claim_date || 0));
    else if (sortBy === "priority_asc") {
      const order = { P1: 0, P2: 1, P3: 2, P4: 3 };
      result.sort((a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99));
    }

    return result;
  }, [claims, search, severityFilter, statusFilter, priorityFilter, providerFilter, investigatorFilter, outcomeFilter, sortBy, activeSavedView]);

  const stats = useMemo(() => {
    const total = claims.length;
    const active = activeClaims.length;
    const resolved = resolvedClaims.length;
    const critical = claims.filter(c => (c.fraud_score || 0) >= 0.90).length;
    const high = claims.filter(c => (c.fraud_score || 0) >= 0.70 && (c.fraud_score || 0) < 0.90).length;
    const medium = claims.filter(c => (c.fraud_score || 0) >= 0.40 && (c.fraud_score || 0) < 0.70).length;
    const low = claims.filter(c => (c.fraud_score || 0) >= 0.20 && (c.fraud_score || 0) < 0.40).length;
    const activeExposure = activeClaims.reduce((s, c) => s + (c.claim_amount || 0), 0);
    const resolvedAmount = resolvedClaims.reduce((s, c) => s + (c.claim_amount || 0), 0);
    const totalExposure = activeExposure + resolvedAmount;
    const confirmedFraud = resolvedClaims.filter(c => c.resolution_outcome === "Confirmed Fraud").length;
    const falsePositive = resolvedClaims.filter(c => c.resolution_outcome === "False Positive").length;
    const billingError = resolvedClaims.filter(c => c.resolution_outcome === "Billing Error (No Fraud)").length;
    return { total, active, resolved, critical, high, medium, low, activeExposure, resolvedAmount, totalExposure, confirmedFraud, falsePositive, billingError };
  }, [claims, activeClaims, resolvedClaims]);

  const savedViewCounts = useMemo(() => {
    const counts = {};
    SAVED_VIEWS.forEach(sv => { counts[sv.id] = claims.filter(sv.filter).length; });
    return counts;
  }, [claims]);

  const openClaimDetail = useCallback((claim) => {
    setSelectedClaim(claim);
    setModalTab("overview");
    setNewNote("");
    setShowModal(true);
  }, []);

  const toggleClaimSelection = useCallback((claimId) => {
    setSelectedClaims(prev => { const n = new Set(prev); if (n.has(claimId)) n.delete(claimId); else n.add(claimId); return n; });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelectedClaims(prev => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map(c => c.claim_id));
    });
  }, [filtered]);

  const bulkAssign = useCallback(() => {
    if (!bulkInvestigator) return;
    setSelectedClaims(new Set());
    setBulkInvestigator("");
  }, [bulkInvestigator]);

  const openResolve = useCallback((claim) => {
    setResolveTarget(claim);
    setResolveOutcome("");
    setResolveReason("");
    setShowResolveModal(true);
  }, []);

  const confirmResolve = useCallback(() => {
    if (!resolveTarget || !resolveOutcome || !resolveReason) return;
    setShowResolveModal(false);
    setResolveTarget(null);
    setResolveOutcome("");
    setResolveReason("");
  }, [resolveTarget, resolveOutcome, resolveReason]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-48" />
          <Skeleton className="w-24" />
        </div>
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} type="card" className="flex-1" />)}
        </div>
        {[...Array(6)].map((_, i) => <Skeleton key={i} type="card" />)}
      </div>
    );
  }

  const detail = selectedClaim || {};
  const shapData = buildSHAPExplanation(detail);
  const hasActiveFilters = search || severityFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All" || providerFilter !== "All" || investigatorFilter !== "All" || outcomeFilter !== "All" || activeSavedView;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            Flagged Claims
          </h1>
          <p className="text-sm text-textSecondary font-medium mt-1">
            <span className="font-bold text-textPrimary">{stats.total}</span> total flagged
            {" · "}
            <span className="font-bold text-textPrimary">{stats.active}</span> active
            {" · "}
            <span className="font-bold text-textPrimary">{stats.resolved}</span> resolved
          </p>
        </div>
        <button
          onClick={() => exportToCSV(selectedClaims.size > 0 ? filtered.filter(c => selectedClaims.has(c.claim_id)) : filtered)}
          className="enterprise-btn-ghost py-2 px-4 text-xs flex items-center gap-2 border border-border/60"
        >
          <Download size={14} />
          {selectedClaims.size > 0 ? `Export Selected (${selectedClaims.size})` : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-surface rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-1.5 mb-1"><Flag size={12} className="text-indigo-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Total Flagged</span></div>
          <p className="text-lg font-black text-textPrimary">{stats.total}</p>
          <p className="text-[9px] text-textSecondary">{stats.active} active + {stats.resolved} resolved</p>
        </div>
        <div className="bg-surface rounded-xl border border-red-500/20 p-3">
          <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={12} className="text-red-400" /><span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Critical (≥90%)</span></div>
          <p className="text-lg font-black text-red-500">{stats.critical}</p>
        </div>
        <div className="bg-surface rounded-xl border border-orange-500/20 p-3">
          <div className="flex items-center gap-1.5 mb-1"><ShieldCheck size={12} className="text-orange-400" /><span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">High (70-89%)</span></div>
          <p className="text-lg font-black text-orange-500">{stats.high}</p>
        </div>
        <div className="bg-surface rounded-xl border border-amber-500/20 p-3">
          <div className="flex items-center gap-1.5 mb-1"><Activity size={12} className="text-amber-400" /><span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Medium (40-69%)</span></div>
          <p className="text-lg font-black text-amber-500">{stats.medium}</p>
        </div>
        <div className="bg-surface rounded-xl border border-blue-500/20 p-3">
          <div className="flex items-center gap-1.5 mb-1"><Bell size={12} className="text-blue-400" /><span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Low (&lt;40%)</span></div>
          <p className="text-lg font-black text-blue-500">{stats.low}</p>
        </div>
        <div className="bg-surface rounded-xl border border-danger/20 p-3">
          <div className="flex items-center gap-1.5 mb-1"><DollarSign size={12} className="text-danger" /><span className="text-[9px] font-bold text-danger uppercase tracking-wider">Active Exposure</span></div>
          <p className="text-lg font-black text-danger">{formatCurrency(stats.activeExposure)}</p>
          <p className="text-[9px] text-textSecondary">of {formatCurrency(stats.totalExposure)} total</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 size={12} className="text-emerald-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Resolved</span></div>
          <p className="text-lg font-black text-textPrimary">{stats.resolved}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-[8px] font-bold text-red-400">{stats.confirmedFraud} confirmed</span>
            <span className="text-[8px] text-textSecondary">·</span>
            <span className="text-[8px] font-bold text-blue-400">{stats.falsePositive} false +</span>
            <span className="text-[8px] text-textSecondary">·</span>
            <span className="text-[8px] font-bold text-slate-400">{stats.billingError} billing err</span>
          </div>
        </div>
      </div>
      <p className="text-[9px] text-textSecondary/60 text-right">All {stats.total} flagged claims — severity counts span the full set ({stats.critical}+{stats.high}+{stats.medium}+{stats.low}={stats.total}) · Risk tiers: Critical ≥90% · High 70-89% · Medium 40-69% · Low &lt;40%</p>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-3">
          {SAVED_VIEWS.map(sv => (
            <button key={sv.id} onClick={() => { setActiveSavedView(activeSavedView === sv.id ? null : sv.id); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                activeSavedView === sv.id ? "bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/20" : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
              }`}>
              {activeSavedView === sv.id ? <BookmarkCheck size={11} /> : <sv.icon size={11} />}
              {sv.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                activeSavedView === sv.id ? "bg-primary/20 text-primary" : "bg-bg/60 text-textSecondary/70"
              }`}>{savedViewCounts[sv.id] || 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input type="text" placeholder="Search claim ID, patient, provider, diagnosis, pattern..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="enterprise-input pl-9 w-full text-xs" />
          </div>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="enterprise-select text-xs">
            <option value="All">All Severity</option>
            <option value="Critical">Critical (≥90%)</option>
            <option value="High">High (70-89%)</option>
            <option value="Medium">Medium (40-69%)</option>
            <option value="Low">Low (20-39%)</option>
            <option value="Minimal">Minimal (&lt;20%)</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="enterprise-select text-xs">
            <option value="All">All Priority</option>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="enterprise-select text-xs">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>)}
          </select>
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="enterprise-select text-xs">
            <option value="All">All Providers</option>
            {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={investigatorFilter} onChange={e => setInvestigatorFilter(e.target.value)} className="enterprise-select text-xs">
            <option value="All">All Investigators</option>
            <option value="Unassigned">Unassigned</option>
            {uniqueInvestigators.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)} className="enterprise-select text-xs">
            {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{o === "All" ? "All Outcomes" : o}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="enterprise-select text-xs">
            <option value="risk_desc">Risk Score (Highest)</option>
            <option value="priority_asc">Priority (P1 → P4)</option>
            <option value="amount_desc">Amount (Highest)</option>
            <option value="date_desc">Date (Newest)</option>
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setSeverityFilter("All"); setStatusFilter("All"); setPriorityFilter("All"); setProviderFilter("All"); setInvestigatorFilter("All"); setOutcomeFilter("All"); setActiveSavedView(null); }}
              className="enterprise-btn-ghost py-2 px-3 text-[10px] font-bold flex items-center gap-1 text-red-400 hover:bg-red-500/10">
              <X size={12} /> Clear All
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <span className="text-[10px] text-textSecondary font-mono">
            {filtered.length} of {claims.length} claims
            {selectedClaims.size > 0 && <span className="text-primary font-bold ml-2">({selectedClaims.size} selected)</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[9px] text-textSecondary/60 px-1">
        <span className="font-bold text-textSecondary/80">Case Lifecycle:</span>
        {["New", "Under Review", "Escalated", "Closed"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded font-bold ${getStatusColor(s)}`}>{s}</span>
            {i < arr.length - 1 && <span className="text-textSecondary/40">→</span>}
          </span>
        ))}
      </div>

      {selectedClaims.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-primary">{selectedClaims.size} claim{selectedClaims.size !== 1 ? "s" : ""} selected</span>
          <div className="h-4 w-px bg-primary/20" />
          <div className="relative">
            <select value={bulkInvestigator} onChange={e => setBulkInvestigator(e.target.value)} className="enterprise-select text-[10px] py-1.5 pl-2 pr-8 min-w-[160px]">
              <option value="">Assign investigator...</option>
              {INVESTIGATORS.map(inv => <option key={inv} value={inv}>{inv}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
          </div>
          <button onClick={bulkAssign} disabled={!bulkInvestigator}
            className={`enterprise-btn-primary py-1.5 px-3 text-xs flex items-center gap-1 ${!bulkInvestigator ? "opacity-40 cursor-not-allowed" : ""}`}>
            <Send size={12} /> Assign
          </button>
          <button onClick={() => setSelectedClaims(new Set())} className="enterprise-btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 border border-border/60">
            <X size={12} /> Clear
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((c, idx) => {
          const risk = getRiskLevel(c.fraud_score || 0);
          const priority = getPriority(c.fraud_score || 0);
          const isSelected = selectedClaims.has(c.claim_id);
          const isResolved = c.status === "Closed" || c.status === "Approved";

          return (
            <div
              key={c.claim_id}
              className={`group bg-surface rounded-2xl border p-5 transition-all duration-200 animate-fade-in-up ${
                isSelected ? "border-indigo-500/40 bg-indigo-500/5" : "border-border/80 hover:border-danger/30 hover:shadow-[0_4px_20px_rgb(239_68_68_/_0.06)]"
              }`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 pt-1">
                  <button onClick={() => toggleClaimSelection(c.claim_id)} className="text-textSecondary hover:text-indigo-400 transition-colors">
                    {isSelected ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                  </button>
                  <div className={`p-2.5 rounded-xl ${(c.fraud_score || 0) >= 0.90 ? "bg-red-500/10 text-red-500" : (c.fraud_score || 0) >= 0.70 ? "bg-orange-500/10 text-orange-500" : (c.fraud_score || 0) >= 0.40 ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                    <AlertTriangle size={18} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-textPrimary text-sm">{c.claim_id}</h3>
                      <SeverityBadge score={c.fraud_score || 0} />
                      <PriorityBadge score={c.fraud_score || 0} />
                      {isResolved && c.resolution_outcome && <OutcomeBadge outcome={c.resolution_outcome} />}
                      {c.claim_submitted_late && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                          <Clock size={8} /> Late
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-textPrimary">{formatCurrency(c.claim_amount)}</span>
                      <span
                        className="text-xs font-bold font-mono cursor-help"
                        style={{ color: (c.fraud_score || 0) >= 0.90 ? "#ef4444" : (c.fraud_score || 0) >= 0.70 ? "#f97316" : (c.fraud_score || 0) >= 0.40 ? "#f59e0b" : "#3b82f6" }}
                        title={`Overall Risk Score: ML model prediction (XGBoost ${MODEL_VERSION}, 47 features).\nSub-scores below are independent risk dimensions — not weighted components.\nThe model combines claim amount, provider history, patient patterns, geographic data, and billing anomalies.`}
                      >
                        {((c.fraud_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-textSecondary">
                    <span className="flex items-center gap-1"><User size={10} /> {c.patient_name}</span>
                    <span className="flex items-center gap-1"><Building2 size={10} /> {c.provider_name}</span>
                    <span className="flex items-center gap-1"><FileText size={10} /> {c.service_name}</span>
                    {c.fraud_pattern && <span className="flex items-center gap-1 text-red-400 font-semibold"><Zap size={10} /> {c.fraud_pattern}</span>}
                    {c.repeat_info ? (
                      (patientPatternsMap[c.patient_name]?.length > 0) ? (
                        <a href="/insurance/patients" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
                          title={`Linked to detected pattern: ${patientPatternsMap[c.patient_name][0].title} — ${patientPatternsMap[c.patient_name][0].providers_count} providers, ${patientPatternsMap[c.patient_name][0].claims_count} claims, ${patientPatternsMap[c.patient_name][0].confidence}% confidence`}>
                          <CheckCircle2 size={10} /> Repeat ({c.repeat_info.count}x) — Linked
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="flex items-center gap-1 text-amber-400 font-semibold" title="New repeat pattern detected — not yet logged in Patient Management">
                            <Users size={10} /> Repeat ({c.repeat_info.count}x) — New Pattern
                          </span>
                          <a href="/insurance/patients" target="_blank" rel="noopener noreferrer"
                            className="text-[9px] text-amber-300 hover:text-amber-200 underline font-bold"
                            title="Open Patient Management to log this repeat pattern for tracking">
                            Create Record
                          </a>
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400/60 font-medium" title="First occurrence of this fraud pattern for this patient">
                        <CheckCircle2 size={9} /> First Occurrence
                      </span>
                    )}
                    {c.investigator && <span className="flex items-center gap-1"><User size={10} /> {c.investigator}</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-textSecondary">
                    <span title="Diagnosis-procedure mismatch score. Higher = more mismatch between diagnosis code and procedure code, indicating potential coding fraud.">
                      <span className="text-textSecondary/60 font-semibold">Coding Mismatch:</span>{" "}
                      <span className="font-bold text-purple-400">{((c.sub_scores?.codingAnomaly || 0) * 100).toFixed(0)}%</span>
                    </span>
                    <span title="Duplicate billing risk score based on patient claim frequency.">
                      <span className="text-textSecondary/60 font-semibold">Dup Risk:</span>{" "}
                      <span className="font-bold text-red-400">{((c.sub_scores?.duplicateBilling || 0) * 100).toFixed(0)}%</span>
                    </span>
                    <span title="Provider anomaly score based on geographic distance.">
                      <span className="text-textSecondary/60 font-semibold">Provider Anomaly:</span>{" "}
                      <span className="font-bold text-orange-400">{((c.sub_scores?.providerAnomaly || 0) * 100).toFixed(0)}%</span>
                    </span>
                    <span title="Financial outlier detection score based on claim amount.">
                      <span className="text-textSecondary/60 font-semibold">Outlier:</span>{" "}
                      <span className="font-bold text-amber-400">{((c.sub_scores?.outlierDetection || 0) * 100).toFixed(0)}%</span>
                    </span>
                  </div>

                  <div className={`mt-3 p-2.5 rounded-lg border ${isResolved ? "bg-emerald-500/5 border-emerald-500/20" : "bg-bg/40 border-border/40"}`}>
                    <p className="text-[10px] text-textSecondary leading-relaxed">
                      <span className="font-bold text-textPrimary">{isResolved ? "Resolution:" : "AI Recommendation:"}</span>{" "}
                      {isResolved
                        ? `${c.resolution_outcome}. ${c.resolution_reason || "No additional details provided."}`
                        : c.ai_recommendation}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                      {c.investigator ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <User size={8} /> {c.investigator}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Unassigned
                        </span>
                      )}
                      <span className="text-[9px] text-textSecondary flex items-center gap-1" title={`Links to Alert ${c.alert_id} in Alert Center`}>
                        <Link2 size={9} /> {c.alert_id}
                      </span>
                      {!isResolved && (() => {
                        const aging = getAgingInfo(c.claim_date, c.priority, c.status);
                        return aging ? (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${aging.color}`} title={aging.remainingText}>
                            <Clock size={8} /> {aging.elapsedText}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openClaimDetail(c)}
                        className="enterprise-btn-primary py-1.5 px-3 text-[10px] flex items-center gap-1"
                        title={isResolved ? "View case details and resolution history" : "Open case management workflow — assign investigator, review evidence, resolve case"}>
                        <Eye size={11} /> {isResolved ? "View Details" : "Investigate"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No flagged claims match your criteria</p>
            <p className="text-xs mt-1 text-textSecondary/60">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Case Management: ${detail.claim_id}`} wide>
        {detail.claim_id ? (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-border/40 pb-3">
              {["overview", "analysis", "timeline", "case-notes", "evidence"].map(tab => (
                <button key={tab} onClick={() => setModalTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    modalTab === tab ? "bg-primary/10 text-primary border border-primary/20" : "text-textSecondary hover:text-textPrimary"
                  }`}>
                  {tab === "case-notes" ? "Case Notes" : tab === "case-management" ? "Case Mgmt" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {modalTab === "overview" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                    <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2 flex items-center gap-1.5"><User size={12} /> Patient Profile</p>
                    <p className="text-sm font-bold text-textPrimary">{detail.patient_name}</p>
                    <p className="text-[10px] text-textSecondary mt-0.5">ID: {detail.patient_id}</p>
                    <p className="text-[10px] text-textSecondary">Prior Claims: <span className="font-bold text-textPrimary">{detail.number_of_previous_claims_patient}</span></p>
                    {detail.repeat_info && (
                      (patientPatternsMap[detail.patient_name]?.length > 0) ? (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Existing Pattern in Patient Management
                          </p>
                          <p className="text-[9px] text-emerald-300/80 mt-0.5">
                            {patientPatternsMap[detail.patient_name][0].title} — {patientPatternsMap[detail.patient_name][0].providers_count} providers, {patientPatternsMap[detail.patient_name][0].claims_count} claims, {patientPatternsMap[detail.patient_name][0].confidence}% confidence
                          </p>
                          <p className="text-[9px] text-emerald-300/60 mt-0.5">{patientPatternsMap[detail.patient_name][0].description}</p>
                          <a href="/insurance/patients" target="_blank" rel="noopener noreferrer"
                            className="text-[9px] text-primary hover:underline mt-1 inline-flex items-center gap-1">
                            View in Patient Management <ExternalLink size={8} />
                          </a>
                        </div>
                      ) : (
                        <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                            <Users size={10} /> New Repeat Pattern Detected
                          </p>
                          <p className="text-[9px] text-amber-300/80 mt-0.5">{detail.repeat_info.detected_pattern}</p>
                          <p className="text-[9px] text-amber-300/60 mt-0.5">Not yet logged in Patient Management.</p>
                          <a href="/insurance/patients" target="_blank" rel="noopener noreferrer"
                            className="text-[9px] text-primary hover:underline mt-1 inline-flex items-center gap-1">
                            Create Pattern Record <ExternalLink size={8} />
                          </a>
                        </div>
                      )
                    )}
                  </div>
                  <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                    <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2 flex items-center gap-1.5"><Building2 size={12} /> Provider Profile</p>
                    <p className="text-sm font-bold text-textPrimary">{detail.provider_name}</p>
                    <p className="text-[10px] text-textSecondary mt-0.5">ID: {detail.provider_id}</p>
                    <p className="text-[10px] text-textSecondary flex items-center gap-1">
                      <MapPin size={9} />
                      Distance: <span className={`font-bold ${detail.provider_patient_distance_miles > 200 ? "text-red-400" : "text-textPrimary"}`}>{detail.provider_patient_distance_miles} mi</span>
                    </p>
                  </div>
                </div>

                <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                  <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5"><FileText size={12} /> Claim Details</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div><span className="text-[10px] text-textSecondary block mb-0.5">Amount</span><span className="font-mono font-bold text-textPrimary text-sm">{formatCurrency(detail.claim_amount)}</span></div>
                    <div><span className="text-[10px] text-textSecondary block mb-0.5">Diagnosis</span><span className="font-mono font-bold text-textPrimary">{detail.diagnosis_code}</span></div>
                    <div><span className="text-[10px] text-textSecondary block mb-0.5">Procedure</span><span className="font-mono font-bold text-textPrimary">{detail.procedure_code}</span></div>
                    <div><span className="text-[10px] text-textSecondary block mb-0.5">Service Date</span><span className="font-bold text-textPrimary">{detail.service_date}</span></div>
                  </div>
                  <div className="mt-2 text-[10px] text-textSecondary">
                    Service: <span className="font-bold text-textPrimary">{detail.service_name}</span>
                    {" · "}Pattern: <span className="font-bold text-red-400">{detail.fraud_pattern}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px]">
                    <span className="text-textSecondary flex items-center gap-1" title={`Links to ${detail.alert_id} in Alert Center`}>
                      <Link2 size={10} /> Alert: <span className="font-bold text-primary cursor-pointer hover:underline">{detail.alert_id}</span>
                    </span>
                    <span className="text-textSecondary flex items-center gap-1">
                      <ExternalLink size={10} /> Claim: <span className="font-bold text-primary cursor-pointer hover:underline">{detail.claim_id}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary flex items-center gap-1.5"><Eye size={12} /> Recommended Action</p>
                    <PriorityBadge score={detail.fraud_score || 0} />
                  </div>
                  <p className="text-xs text-textPrimary leading-relaxed">{detail.ai_recommendation}</p>
                  {isResolved && detail.resolution_outcome && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-[10px] text-textSecondary">
                        <span className="font-bold text-emerald-400">Resolution:</span> {detail.resolution_outcome}
                        {detail.resolution_reason && ` — ${detail.resolution_reason}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {modalTab === "analysis" && (
              <div className="space-y-5">
                <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                  <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5"><BrainCircuit size={12} /> AI Model Analysis</p>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-textSecondary">Risk Score</span>
                      <span className={`font-bold ${(detail.fraud_score || 0) >= 0.90 ? "text-red-500" : (detail.fraud_score || 0) >= 0.70 ? "text-orange-500" : (detail.fraud_score || 0) >= 0.40 ? "text-amber-500" : "text-blue-500"}`}>
                        {((detail.fraud_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-bg/60 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${(detail.fraud_score || 0) >= 0.90 ? "bg-gradient-to-r from-red-600 to-red-400" : (detail.fraud_score || 0) >= 0.70 ? "bg-gradient-to-r from-orange-600 to-orange-400" : (detail.fraud_score || 0) >= 0.40 ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-blue-600 to-blue-400"}`}
                        style={{ width: `${Math.min((detail.fraud_score || 0) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar label="Overall Risk" score={detail.fraud_score || 0} color={(detail.fraud_score || 0) >= 0.90 ? "bg-red-500" : (detail.fraud_score || 0) >= 0.70 ? "bg-orange-500" : (detail.fraud_score || 0) >= 0.40 ? "bg-amber-500" : "bg-blue-500"} />
                    <div className="bg-bg/40 rounded-lg p-2 border border-border/30 mt-1">
                      <p className="text-[9px] text-textSecondary/70 leading-relaxed">
                        <span className="font-bold text-textSecondary/90">Scoring methodology:</span> Overall risk is an ML model prediction (XGBoost {MODEL_VERSION}, 47 features). The four sub-scores below are independent risk dimensions, not weighted inputs — the model uses them alongside other features (claim amount, provider history, geographic data) to produce the composite score.
                      </p>
                    </div>
                    <ScoreBar label="Duplicate Billing" score={detail.sub_scores?.duplicateBilling || 0} color="bg-red-400" tooltip="Risk of duplicate billing based on patient claim frequency" />
                    <ScoreBar label="Provider Anomaly" score={detail.sub_scores?.providerAnomaly || 0} color="bg-orange-400" tooltip="Provider anomaly based on patient-provider geographic distance" />
                    <ScoreBar label="Coding Mismatch" score={detail.sub_scores?.codingAnomaly || 0} color="bg-purple-400" tooltip="Diagnosis-procedure code mismatch score. Higher = codes from different body systems." />
                    <ScoreBar label="Financial Outlier" score={detail.sub_scores?.outlierDetection || 0} color="bg-amber-400" tooltip="Claim amount outlier detection relative to typical billing for this service type" />
                  </div>
                </div>

                {shapData && shapData.top_factors && shapData.top_factors.length > 0 && (
                  <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                    <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5"><BrainCircuit size={12} /> SHAP Explanation</p>
                    <p className="text-[10px] text-textSecondary leading-relaxed mb-3 italic">
                      {shapData.summary || `Model prediction of ${((shapData.prediction || 0) * 100).toFixed(1)}% with base value ${(shapData.base_value || 0).toFixed(3)}`}
                    </p>
                    <div className="space-y-2">
                      {shapData.top_factors.map((factor, i) => (
                        <div key={i} className="flex items-center gap-3 bg-bg/40 rounded-lg p-2.5 border border-border/40">
                          <div className={`w-1.5 h-8 rounded-full shrink-0 ${factor.impact === "high" ? "bg-red-500" : factor.impact === "medium" ? "bg-orange-400" : "bg-amber-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-textPrimary truncate">{factor.feature}</span>
                              <span className="text-[10px] font-mono text-textSecondary shrink-0">{factor.value}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] font-bold ${factor.direction === "increases" ? "text-red-400" : factor.direction === "decreases" ? "text-green-400" : "text-textSecondary"}`}>
                                {factor.direction === "increases" ? "▲ Increases" : factor.direction === "decreases" ? "▼ Decreases" : "— Neutral"}
                              </span>
                              <div className="flex-1 bg-bg/60 rounded-full h-1 overflow-hidden">
                                <div className={`h-full rounded-full ${factor.impact === "high" ? "bg-red-500" : factor.impact === "medium" ? "bg-orange-400" : "bg-amber-400"}`}
                                  style={{ width: `${Math.min((factor.weight || 0.1) * 100 * 3, 100)}%` }} />
                              </div>
                              <span className="text-[9px] font-mono text-textSecondary">w={((factor.weight || 0) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {modalTab === "timeline" && (
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-4 flex items-center gap-1.5"><History size={12} /> Investigation Timeline</p>
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border/40" />
                  {(detail.timeline || []).map((event, i) => (
                    <div key={i} className="relative mb-5 last:mb-0">
                      <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 ${
                        i === (detail.timeline || []).length - 1 ? "bg-primary border-primary" : "bg-surface border-border"
                      }`} />
                      <div className="text-[10px] text-textSecondary mb-0.5">{new Date(event.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-xs font-bold text-textPrimary">{event.action}</div>
                      <div className="text-[10px] text-textSecondary mt-0.5">{event.actor}</div>
                      {event.detail && <div className="text-[10px] text-textSecondary/70 mt-0.5 leading-relaxed">{event.detail}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalTab === "case-notes" && (
              <div className="space-y-4">
                <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                  <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5"><MessageSquare size={12} /> Activity Log</p>
                  {(detail.case_notes || []).length === 0 ? (
                    <p className="text-xs text-textSecondary/60 italic">No case notes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(detail.case_notes || []).map((note, i) => (
                        <div key={i} className="bg-surface rounded-lg p-3 border border-border/40">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-primary">{note.author}</span>
                            <span className="text-[9px] text-textSecondary">{new Date(note.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-[11px] text-textPrimary leading-relaxed">{note.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                  <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2">Add Note</p>
                  <textarea
                    value={newNote} onChange={e => setNewNote(e.target.value)}
                    placeholder="Add investigation note, observation, or follow-up item..."
                    className="enterprise-input w-full min-h-[60px] text-xs resize-y" rows={2} />
                  <button disabled={!newNote.trim()} className={`enterprise-btn-primary py-1.5 px-3 text-[10px] flex items-center gap-1 mt-2 ${!newNote.trim() ? "opacity-40 cursor-not-allowed" : ""}`}>
                    <Send size={11} /> Add Note
                  </button>
                </div>
              </div>
            )}

            {modalTab === "evidence" && (
              <div className="space-y-4">
                <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                  <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5"><Paperclip size={12} /> Evidence & Attachments</p>
                  {(detail.evidence || []).length === 0 ? (
                    <p className="text-xs text-textSecondary/60 italic">No evidence items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(detail.evidence || []).map((ev, i) => (
                        <div key={i} className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-border/40">
                          <div className={`p-1.5 rounded-lg ${ev.type === "AI Finding" ? "bg-purple-500/10 text-purple-400" : ev.type === "Document" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
                            {ev.type === "AI Finding" ? <BrainCircuit size={14} /> : ev.type === "Document" ? <FileText size={14} /> : <Activity size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-textPrimary">{ev.title}</p>
                            <p className="text-[9px] text-textSecondary">{ev.type} · {ev.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
              {detail.status === "New" && (
                <>
                  <div className="relative flex-1 min-w-[180px]">
                    <select value={bulkInvestigator} onChange={e => setBulkInvestigator(e.target.value)} className="enterprise-select text-[10px] py-2 pl-2 pr-8 w-full">
                      <option value="">Assign investigator...</option>
                      {INVESTIGATORS.map(inv => <option key={inv} value={inv}>{inv}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
                  </div>
                  <button className="enterprise-btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2 min-w-[120px]">
                    <Send size={14} /> Assign & Start Review
                  </button>
                </>
              )}
              {detail.status === "Under Review" && (
                <>
                  <button onClick={() => { setShowModal(false); openResolve(detail); }}
                    className="enterprise-btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2 min-w-[120px]">
                    <CheckCircle2 size={14} /> Resolve Case
                  </button>
                  <button className="enterprise-btn-ghost flex-1 py-2 text-xs flex items-center justify-center gap-2 border border-border/60 min-w-[120px]">
                    <Flag size={14} /> Escalate
                  </button>
                </>
              )}
              {detail.status === "Escalated" && (
                <>
                  <button onClick={() => { setShowModal(false); openResolve(detail); }}
                    className="enterprise-btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2 min-w-[120px]">
                    <CheckCircle2 size={14} /> Resolve Case
                  </button>
                  <button className="enterprise-btn-ghost flex-1 py-2 text-xs flex items-center justify-center gap-2 border border-border/60 min-w-[120px]">
                    <RotateCcw size={14} /> Return to Review
                  </button>
                </>
              )}
              {(detail.status === "Closed" || detail.status === "Approved") && (
                <div className="w-full p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[10px] text-textSecondary">
                    <span className="font-bold text-emerald-400">Case {detail.status.toLowerCase()}.</span>{" "}
                    Resolution: {detail.resolution_outcome || "N/A"}
                    {detail.resolution_reason && ` — ${detail.resolution_reason}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} type="card" />)}</div>
        )}
      </Modal>

      <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Case">
        {resolveTarget && (
          <div className="space-y-4">
            <div className="bg-bg/40 rounded-lg p-3 border border-border/60 text-xs">
              <p className="font-bold text-textPrimary">{resolveTarget.claim_id}</p>
              <p className="text-textSecondary mt-0.5">{resolveTarget.patient_name} · {resolveTarget.provider_name} · {formatCurrency(resolveTarget.claim_amount)}</p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2">Resolution Outcome <span className="text-red-400">*</span></p>
              <div className="space-y-2">
                {RESOLUTION_OUTCOMES.map(outcome => (
                  <label key={outcome} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${resolveOutcome === outcome ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"}`}>
                    <input type="radio" name="resolution" value={outcome} checked={resolveOutcome === outcome} onChange={() => setResolveOutcome(outcome)} className="accent-primary" />
                    <div>
                      <span className="text-xs font-bold text-textPrimary">{outcome}</span>
                      <p className="text-[9px] text-textSecondary mt-0.5">
                        {outcome === "Confirmed Fraud" && "Investigation validated fraudulent billing. Provider may face sanctions."}
                        {outcome === "False Positive" && "Investigation found legitimate billing practices. Close without action."}
                        {outcome === "Billing Error (No Fraud)" && "Administrative error identified. Corrective action without fraud finding."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2">Resolution Reason <span className="text-red-400">*</span></p>
              <textarea
                value={resolveReason} onChange={e => setResolveReason(e.target.value)}
                placeholder="Provide a detailed resolution reason. This field is required..."
                className="enterprise-input w-full min-h-[80px] text-xs resize-y" rows={3} />
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/60">
              <button onClick={confirmResolve}
                disabled={!resolveOutcome || !resolveReason.trim()}
                className={`enterprise-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-2 ${!resolveOutcome || !resolveReason.trim() ? "opacity-40 cursor-not-allowed" : ""}`}>
                <CheckCircle2 size={14} /> Confirm Resolution
              </button>
              <button onClick={() => setShowResolveModal(false)}
                className="enterprise-btn-ghost flex-1 py-2.5 text-xs flex items-center justify-center gap-2 border border-border/60">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
