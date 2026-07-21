
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const USE_MOCK = !import.meta.env.VITE_API_URL || BASE_URL === 'http://127.0.0.1:8000';

function getToken() {
  try {
    const stored = localStorage.getItem('fraud_auth_user');
    if (stored) return JSON.parse(stored).token;
  } catch (error) {
    return null;
  }
  return null;
}

function getMock(path, params) {
  const cleanPath = path.split('?')[0];
  const fallback = MOCK_DATA[path] || MOCK_DATA[cleanPath] || MOCK_DATA[`${cleanPath}/`];
  if (fallback) return typeof fallback === 'function' ? fallback(params) : JSON.parse(JSON.stringify(fallback));
  if (cleanPath.startsWith('/api/claims/')) {
    const id = cleanPath.replace('/api/claims/', '');
    const handler = MOCK_DATA['/api/claims/'];
    if (handler) return typeof handler === 'function' ? handler(id) : JSON.parse(JSON.stringify(handler));
  }
  if (cleanPath.startsWith('/api/notifications/')) {
    const id = cleanPath.replace('/api/notifications/', '').replace('/read', '');
    if (cleanPath.endsWith('/read')) return {};
    const handler = MOCK_DATA['/api/notifications'];
    if (handler) return typeof handler === 'function' ? handler() : JSON.parse(JSON.stringify(handler));
  }
  return null;
}

async function request(method, path, body = null, params = null) {
  if (USE_MOCK) {
    const mock = getMock(path, params);
    if (mock) return mock;
    throw new Error(`No mock data for ${path}`);
  }

  const token = getToken();

  let url = `${BASE_URL}${path}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Basic ${token}`;
  }

  const opts = { method, headers, mode: 'cors' };
  if (body) opts.body = JSON.stringify(body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    opts.signal = controller.signal;
    const res = await fetch(url, opts);
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Server Error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`API Fallback [${method} ${path}]:`, error.message);
    const mock = getMock(path, params);
    if (mock) return mock;
    throw error;
  }
}

import {
  CANONICAL_MODEL, CANONICAL_FUNNEL, CANONICAL_FINANCIALS, CANONICAL_PROVIDERS,
  CANONICAL_PATIENTS, CANONICAL_MONTHLY_TRENDS, CANONICAL_INVESTIGATORS,
  CANONICAL_CLAIMS_OVER_TIME, CANONICAL_NOTIFICATIONS, CANONICAL_FRAUD_DIAGNOSES,
  CANONICAL_FRAUD_BY_CITY, CANONICAL_REGIONAL_DATA, CANONICAL_FRAUD_CATEGORIES,
  CANONICAL_TOP_RISKY_PROVIDERS, CANONICAL_TOP_RISKY_PATIENTS, CANONICAL_CUMULATIVE_SAVINGS,
  CANONICAL_GENDER_DISTRIBUTION, CANONICAL_SPECIALTY_DISTRIBUTION, CANONICAL_REFERENCE
} from './data/canonicalData';

// ─────────────────────────────────────────────────────────────────────────────
// Seeded PRNG — deterministic data generation (same output every page load)
// ─────────────────────────────────────────────────────────────────────────────
function createRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk scoring — IMPORTED from dataUtils.js (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────
import { severityFromConfidence, computeBaseRisk } from './data/dataUtils';

function riskLevelFromScore(score) {
  if (score >= 0.90) return 'critical';
  if (score >= 0.70) return 'high';
  if (score >= 0.40) return 'medium';
  if (score >= 0.20) return 'low';
  return 'minimal';
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Generation — name-gender paired, deterministic, consistent risk
// ─────────────────────────────────────────────────────────────────────────────
let _cachedPatients = null;
let _cachedPatterns = null;
let _totalActiveClaims = 0;

function generateAllPatientData() {
  if (_cachedPatients && _cachedPatterns) return;

  const rng = createRng(42);

  // ── Gender-paired name lists ──────────────────────────────────────────────
  // Male first names — index in array determines which patient index gets them
  // Patient i: firstName = maleFirstNames[floor(i/2) % len] when i is even
  const maleFirstNames = [
    'James','Robert','John','Michael','William','David','Richard','Joseph','Thomas','Charles',
    'Christopher','Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua',
    'Kenneth','Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan',
    'Jacob','Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin','Scott','Brandon',
    'Benjamin','Samuel','Raymond','Gregory','Frank','Alexander','Patrick','Jack','Dennis','Jerry',
    'Tyler','Aaron','Jose','Nathan','Henry','Douglas','Peter','Adam','Zachary','Walter',
    'Kyle','Harold','Jeremy','Gerald','Keith','Roger','Arthur','Terry','Lawrence','Jesse',
    'Austin','Dylan','Bryan','Joe','Bruce','Gabriel','Logan','Albert','Willie','Alan',
    'Eugene','Russell','Vincent','Philip','Bobby','Johnny','Bradley','Roy','Elijah','Randy',
    'Wayne','Howard','Harry','Francis','Leonard','Christian','Ethan','Derek','Sean','Noah'
  ];
  // Female first names
  const femaleFirstNames = [
    'Mary','Patricia','Jennifer','Linda','Elizabeth','Barbara','Susan','Jessica','Sarah','Karen',
    'Lisa','Nancy','Betty','Margaret','Sandra','Ashley','Kimberly','Emily','Donna','Michelle',
    'Dorothy','Carol','Amanda','Melissa','Deborah','Stephanie','Rebecca','Sharon','Laura','Cynthia',
    'Kathleen','Amy','Angela','Shirley','Anna','Brenda','Pamela','Emma','Nicole','Helen',
    'Samantha','Katherine','Christine','Debra','Rachel','Carolyn','Janet','Catherine','Maria','Heather',
    'Diane','Ruth','Julie','Olivia','Joyce','Virginia','Victoria','Kelly','Lauren','Christina',
    'Joan','Evelyn','Judith','Megan','Andrea','Cheryl','Hannah','Jacqueline','Martha','Gloria',
    'Teresa','Ann','Sara','Madison','Frances','Kathryn','Janice','Jean','Abigail','Alice',
    'Judy','Sophia','Grace','Denise','Amber','Doris','Marilyn','Danielle','Beverly','Isabella',
    'Theresa','Diana','Natalie','Brittany','Charlotte','Marie','Kayla','Alexis','Lori','Alyssa'
  ];

  const lastNames = [
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
    'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
    'Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes',
    'Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper',
    'Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
    'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes',
    'Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez',
    'Powell','Jenkins','Perry','Russell','Sullivan','Bell','Coleman','Butler','Henderson','Barnes',
    'Gonzales','Fisher','Vasquez','Simmons','Patterson','Jordan','Reynolds','Hamilton','Graham','Wallace',
    'Gibson','Bryant','Alexander','Tucker','Harvey','Marshall','Hunt','Dixon','Ramos','Reeves',
    'Burns','Gordon','Shaw','Holmes','Rice','Robertson','Hunt','Black','Daniels','Palmer',
    'Mills','Grant','Cunningham','Williamson','Morant','Stone','Bishop','Warren','Barnes','Ferguson',
    'Rose','Stone','Hawkins','Dunn','Perkins','Hudson','Spencer','Wells','Webb','Simpson',
    'Stevens','Tucker','Porter','Hunter','Hicks','Crawford','Henry','Boyd','Mason','Morales',
    'Kennedy','Warren','Dixon','Ramos','Reeves','Burns','Simone','Bautista','Ibarra','Delgado'
  ];

  const cities = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus','Charlotte','Indianapolis','San Francisco','Seattle','Denver','Washington','Nashville','Oklahoma City','El Paso','Boston','Portland','Las Vegas','Memphis','Louisville','Baltimore','Milwaukee','Tucson','Fresno','Sacramento','Mesa','Kansas City','Atlanta','Omaha','Colorado Springs','Raleigh','Long Beach','Virginia Beach','Miami','Oakland','Minneapolis','Tulsa','Tampa','Arlington','New Orleans','Wichita','Cleveland'];
  const states = ['NY','CA','IL','TX','AZ','PA','TX','CA','TX','CA','TX','FL','TX','OH','NC','IN','CA','WA','CO','DC','TN','OK','TX','MA','OR','NV','TN','KY','MD','WI','AZ','CA','CA','AZ','MO','GA','NE','CO','NC','CA','VA','FL','CA','MN','OK','FL','TX','LA','KS','OH'];
  const diagnoses = CANONICAL_FRAUD_DIAGNOSES;

  // ── Special patient overrides ─────────────────────────────────────────────
  // These guarantee the specifically-mentioned patients have consistent, justified data.
  // Index 1 = Mary Lee, Index 2 = Robert Ramirez, Index 7 = Linda Morales
  const SPECIAL = {
    1: { totalClaims: 21, providersVisited: 8, fraudCount: 8 },
    2: { totalClaims: 2,  providersVisited: 1, fraudCount: 0 },
    7: { totalClaims: 13, providersVisited: 5, fraudCount: 7 },
  };

  const patients = [];
  let totalActiveClaimsSum = 0;

  for (let i = 0; i < 500; i++) {
    // Gender: seeded-PRNG-driven with natural variance (~49% Male, ~49% Female, ~2% Other)
    const genderRand = rng();
    const gender = genderRand < 0.488 ? 'Male' : genderRand < 0.978 ? 'Female' : 'Other';

    // Name: pick from gendered list; for "Other", alternate between male/female names
    const firstNameList = gender === 'Male' ? maleFirstNames
      : gender === 'Female' ? femaleFirstNames
        : (i % 2 === 0 ? maleFirstNames : femaleFirstNames);
    const firstName = firstNameList[Math.floor(i / 2) % firstNameList.length];
    const lastName = lastNames[(i * 7 + 13) % lastNames.length];
    const name = `${firstName} ${lastName}`;

    // City: deterministic
    const cityIdx = i % cities.length;

    // Claims / providers / fraud — use special overrides for key patients, PRNG for rest
    let totalClaims, providersVisited, fraudCount;
    if (SPECIAL[i]) {
      ({ totalClaims, providersVisited, fraudCount } = SPECIAL[i]);
    } else {
      const claimRand = rng();
      totalClaims = claimRand < 0.45 ? Math.floor(rng() * 3) + 1
        : claimRand < 0.70 ? Math.floor(rng() * 4) + 4
          : claimRand < 0.88 ? Math.floor(rng() * 8) + 8
            : Math.floor(rng() * 20) + 16;
      const maxProviders = Math.min(totalClaims, 8);
      providersVisited = Math.max(1, Math.min(maxProviders, Math.floor(totalClaims * (0.25 + rng() * 0.45))));
      const fraudRand = rng();
      fraudCount = fraudRand < 0.68 ? 0
        : fraudRand < 0.88 ? Math.floor(rng() * 3) + 1
          : Math.floor(rng() * 8) + 3;
    }

    // Risk score — deterministic, matching computePatientRisk() formula exactly
    const riskScore = computeBaseRisk(totalClaims, fraudCount, providersVisited);
    const riskLevel = riskLevelFromScore(riskScore);

    // Active claims: subset of total claims in non-closed status
    const activeClaimCount = Math.max(0, Math.floor(totalClaims * (0.15 + rng() * 0.40)));
    totalActiveClaimsSum += activeClaimCount;

    // Avg claim amount: deterministic per patient
    const avgClaimAmount = Math.round(600 + rng() * 1400);

    // Provider names for this patient
    const providerNames = CANONICAL_PROVIDERS
      .sort(() => rng() - 0.5)
      .slice(0, providersVisited)
      .map(p => p.name);

    // Last claim date: deterministic, spread across Jan–Jul 2026 (historical only)
    const lastClaimMonth = Math.floor(rng() * 7) + 1;
    const maxDay = lastClaimMonth === 7 ? 20 : 28;
    const lastClaimDay = Math.floor(rng() * maxDay) + 1;
    const lastClaimDate = `2026-${String(lastClaimMonth).padStart(2, '0')}-${String(lastClaimDay).padStart(2, '0')}`;

    patients.push({
      patient_id: `PAT-${String(1000 + i).padStart(4, '0')}`,
      name,
      age: Math.floor(rng() * 55) + 18,
      gender,
      city: cities[cityIdx],
      state: states[cityIdx],
      total_claims: totalClaims,
      claim_count: totalClaims,
      total_amount: totalClaims * avgClaimAmount,
      avg_claim_amount: avgClaimAmount,
      flagged_claims: fraudCount,
      fraud_count: fraudCount,
      fraud_score: Math.round(riskScore * 100),
      risk_level: riskLevel,
      providers_visited: providersVisited,
      provider_names: providerNames,
      diagnosis_code: diagnoses[i % diagnoses.length].code,
      insurance_plan: ['Medicare','Medicaid','Blue Cross PPO','Aetna HMO','UnitedHealth Choice','Cigna Open Access'][i % 6],
      status: 'active',
      policy_id: `POL-2026-${String(1000 + i).padStart(6, '0')}`,
      annual_deductible: 1000 + Math.floor(rng() * 2000),
      copay_amount: 20 + Math.floor(rng() * 40),
      policy_start_date: '2026-01-01',
      policy_end_date: '2026-12-31',
      last_claim_date: lastClaimDate,
      active_claims: activeClaimCount,
    });
  }

  // ── Generate suspicious patterns from patient data ────────────────────────
  const patterns = generatePatternsFromPatients(patients, rng);

  // ── Adjust patient risk scores based on patterns ──────────────────────────
  // RULE: patient risk score = max confidence / 100 across all their patterns.
  // This is the structural guarantee that pattern card severity, confidence %,
  // and table Risk Level all agree — they derive from the same number.
  // risk_score is stored as a 0–1 float (rounded to 2 decimals) so it matches
  // what computePatientRisk() returns — no integer/float mismatch possible.
  patients.forEach(p => {
    const patientPatternList = patterns.filter(pat => pat.patient_id === p.patient_id);
    if (patientPatternList.length > 0) {
      const maxConfidence = Math.max(...patientPatternList.map(pat => pat.confidence || 0));
      const patternScore = Math.round(Math.min(0.99, maxConfidence / 100) * 100) / 100;
      p.risk_score = patternScore;
      p.risk_level = riskLevelFromScore(patternScore);
      p.has_suspicious_pattern = true;
    } else {
      // No pattern: recompute base risk with the low-activity cap applied
      const baseScore = computeBaseRisk(
        p.total_claims, p.fraud_count, p.providers_visited
      );
      p.risk_score = baseScore;
      p.risk_level = riskLevelFromScore(baseScore);
      p.has_suspicious_pattern = false;
    }
  });

  _cachedPatients = patients;
  _cachedPatterns = patterns;
  _totalActiveClaims = totalActiveClaimsSum;
}

function generatePatternsFromPatients(patients, rng) {
  const patterns = [];

  // Doctor shopping: patients with many providers AND many claims
  const doctorShoppers = patients
    .filter(p => p.providers_visited >= 4 && p.total_claims >= 8)
    .sort((a, b) => b.providers_visited - a.providers_visited || b.total_claims - a.total_claims);

  doctorShoppers.slice(0, 3).forEach(p => {
    const confidence = Math.min(98, 60 + p.providers_visited * 7);
    patterns.push({
      id: `PAT-${patterns.length + 1}`,
      type: 'doctor_shopping',
      severity: severityFromConfidence(confidence),
      title: 'Multi-Provider Pattern',
      description: `${p.name} visited ${p.providers_visited} different providers for ${p.diagnosis_code || 'similar diagnoses'} within the review period. This pattern is consistent with doctor shopping.`,
      patient_id: p.patient_id,
      patient_name: p.name,
      providers_count: p.providers_visited,
      claims_count: p.total_claims,
      confidence,
    });
  });

  // Geographic anomaly: patients with many providers not yet in patterns
  const geoAnomaly = patients
    .filter(p => p.providers_visited >= 4 && !patterns.some(pa => pa.patient_id === p.patient_id))
    .sort((a, b) => b.providers_visited - a.providers_visited);

  geoAnomaly.slice(0, 2).forEach(p => {
    const confidence = Math.min(95, 55 + p.providers_visited * 8);
    patterns.push({
      id: `PAT-${patterns.length + 1}`,
      type: 'geographic_anomaly',
      severity: severityFromConfidence(confidence),
      title: 'Geographic Anomaly',
      description: `${p.name} received services from providers in ${p.providers_visited} different locations. Distance between providers suggests potential phantom billing network.`,
      patient_id: p.patient_id,
      patient_name: p.name,
      providers_count: p.providers_visited,
      claims_count: p.total_claims,
      confidence,
    });
  });

  // Rapid filing: patients with high claim volume not yet in patterns
  const rapidFire = patients
    .filter(p => p.total_claims >= 14 && !patterns.some(pa => pa.patient_id === p.patient_id))
    .sort((a, b) => b.total_claims - a.total_claims);

  rapidFire.slice(0, 2).forEach(p => {
    const confidence = Math.min(92, 45 + p.total_claims * 2);
    patterns.push({
      id: `PAT-${patterns.length + 1}`,
      type: 'rapid_filing',
      severity: severityFromConfidence(confidence),
      title: 'Rapid Claim Filing',
      description: `${p.name} submitted ${p.total_claims} claims in the review period, averaging ${(p.total_claims / 12).toFixed(1)} claims/month. Normal average is 1-2 claims/month.`,
      patient_id: p.patient_id,
      patient_name: p.name,
      providers_count: p.providers_visited,
      claims_count: p.total_claims,
      confidence,
    });
  });

  // Upcoding: patients with high fraud count not yet in patterns
  const upcoding = patients
    .filter(p => p.fraud_count >= 4 && !patterns.some(pa => pa.patient_id === p.patient_id))
    .sort((a, b) => b.fraud_count - a.fraud_count);

  upcoding.slice(0, 2).forEach(p => {
    const confidence = Math.min(96, 50 + p.fraud_count * 6);
    const fraudRate = ((p.fraud_count / p.total_claims) * 100).toFixed(0);
    patterns.push({
      id: `PAT-${patterns.length + 1}`,
      type: 'upcoding',
      severity: severityFromConfidence(confidence),
      title: 'Potential Upcoding Pattern',
      description: `${p.name} has ${p.fraud_count} flagged claims where billing exceeds standard fee schedule by approximately ${fraudRate}%. Claims show consistent pattern of billed amounts above standard fee schedule.`,
      patient_id: p.patient_id,
      patient_name: p.name,
      providers_count: p.providers_visited,
      claims_count: p.total_claims,
      confidence,
    });
  });

  // ── Medium-severity patterns: limited pass for display variety ───────────
  // Adds 3-5 medium-severity patterns so card section shows a realistic
  // risk pyramid (few Critical, more High, some Medium) rather than all Critical.
  const mediumPatients = patients
    .filter(p => !patterns.some(pa => pa.patient_id === p.patient_id))
    .filter(p => {
      const br = computeBaseRisk(p.total_claims, p.fraud_count, p.providers_visited);
      return br >= 0.40 && br < 0.70;
    })
    .sort((a, b) => computeBaseRisk(b.total_claims, b.fraud_count, b.providers_visited) - computeBaseRisk(a.total_claims, a.fraud_count, a.providers_visited));

  mediumPatients.slice(0, 4).forEach(p => {
    const baseRisk = computeBaseRisk(p.total_claims, p.fraud_count, p.providers_visited);
    const confidence = Math.min(69, Math.max(40, Math.round(baseRisk * 100)));
    let type, title, description;

    if (p.providers_visited >= 3) {
      type = 'doctor_shopping';
      title = 'Multi-Provider Pattern';
      description = `${p.name} visited ${p.providers_visited} different providers within the review period. While claim volume is moderate, the provider diversity warrants further review.`;
    } else if (p.fraud_count >= 2) {
      type = 'upcoding';
      title = 'Potential Upcoding Pattern';
      const overbilling = ((p.fraud_count / p.total_claims) * 100).toFixed(0);
      description = `${p.name} has ${p.fraud_count} flagged claims where billing exceeds standard fee schedule by approximately ${overbilling}%. Elevated but below critical threshold.`;
    } else {
      type = 'rapid_filing';
      title = 'Elevated Claim Activity';
      description = `${p.name} submitted ${p.total_claims} claims in the review period. While individual claims are within normal range, the cumulative volume warrants monitoring.`;
    }

    patterns.push({
      id: `PAT-${patterns.length + 1}`,
      type,
      severity: severityFromConfidence(confidence),
      title,
      description,
      patient_id: p.patient_id,
      patient_name: p.name,
      providers_count: p.providers_visited,
      claims_count: p.total_claims,
      confidence,
    });
  });

  // ── Comprehensive pass: every High/Critical risk patient must have a pattern ───
  // The top-N passes above only cover 9 patients. Any remaining patient whose
  // activity-based risk is ≥ 0.70 (High or above) still needs a pattern record
  // so their Critical/High risk level is fully backed by data.
  patients.forEach(p => {
    if (patterns.some(pa => pa.patient_id === p.patient_id)) return;

    const baseRisk = computeBaseRisk(p.total_claims, p.fraud_count, p.providers_visited);
    if (baseRisk < 0.70) return;

    const confidence = Math.min(99, Math.round(baseRisk * 100));
    let type, title, description;

    if (p.providers_visited >= 4 && p.total_claims >= 8) {
      type = 'doctor_shopping';
      title = 'Multi-Provider Pattern';
      description = `${p.name} visited ${p.providers_visited} different providers for ${p.diagnosis_code || 'similar diagnoses'} within the review period. This pattern is consistent with doctor shopping.`;
    } else if (p.providers_visited >= 4) {
      type = 'geographic_anomaly';
      title = 'Geographic Anomaly';
      description = `${p.name} received services from providers in ${p.providers_visited} different locations. Distance between providers suggests potential phantom billing network.`;
    } else if (p.fraud_count >= 4) {
      type = 'upcoding';
      title = 'Potential Upcoding Pattern';
      const overbilling = ((p.fraud_count / p.total_claims) * 100).toFixed(0);
      description = `${p.name} has ${p.fraud_count} flagged claims where billing exceeds standard fee schedule by approximately ${overbilling}%. Claims show consistent pattern of billed amounts above standard fee schedule.`;
    } else if (p.total_claims >= 10) {
      type = 'rapid_filing';
      title = 'Rapid Claim Filing';
      description = `${p.name} submitted ${p.total_claims} claims in the review period, averaging ${(p.total_claims / 12).toFixed(1)} claims/month. Normal average is 1-2 claims/month.`;
    } else {
      const fraudRate = p.fraud_count / Math.max(1, p.total_claims);
      if (fraudRate >= 0.3) {
        type = 'upcoding';
        title = 'Potential Upcoding Pattern';
        const overbilling = (fraudRate * 100).toFixed(0);
        description = `${p.name} has ${p.fraud_count} flagged claims where billing exceeds standard fee schedule by approximately ${overbilling}% across ${p.providers_visited} provider(s) with elevated billing activity.`;
      } else {
        type = 'rapid_filing';
        title = 'Elevated Activity Pattern';
        description = `${p.name} submitted ${p.total_claims} claims with ${p.providers_visited} provider(s) and elevated risk indicators.`;
      }
    }

    patterns.push({
      id: `PAT-${patterns.length + 1}`,
      type,
      severity: severityFromConfidence(confidence),
      title,
      description,
      patient_id: p.patient_id,
      patient_name: p.name,
      providers_count: p.providers_visited,
      claims_count: p.total_claims,
      confidence,
    });
  });

  return patterns;
}

function generatePatients() {
  generateAllPatientData();
  return _cachedPatients;
}

function getPatientPatterns() {
  generateAllPatientData();
  return _cachedPatterns;
}

function getTotalActiveClaims() {
  generateAllPatientData();
  return _totalActiveClaims;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Generation (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
let _cachedProviders = null;
function generateProviders() {
  if (_cachedProviders) return _cachedProviders;
  const specialties = ['Cardiology','Orthopedics','Internal Medicine','Family Medicine','Emergency Medicine','Neurology','Pediatrics','Dermatology','Oncology','Gastroenterology','Radiology','General Surgery','Urgent Care','Pulmonology','Nephrology','Endocrinology','Rheumatology','Urology','Psychiatry','Ophthalmology'];
  const types = ['Hospital','Clinic','Medical Group','Specialist','Diagnostic Center','Surgery Center','Urgent Care','Health System'];
  const firstNamePool = ['Alpine','Arcadia','Aurora','Austin','Banner','Bayside','Bell','Blue Ridge','Bridgeport','Broadway','Brookside','Camelback','Capitol','Cascade','Cedar','Central','Charter','Clearwater','Coastal','Columbia','Commonwealth','Community','Cornerstone','Crestwood','Crossroads','Crystal','Cypress','Dayton','Delta','Discovery','Eastern','Edgewood','Elite','Evergreen','Fairview','Foundry','Frontier','Gateway','Genesis','Glenbrook','Golden','Grand','Granite','Greenfield','Greenwood','Gulf','Harbor','Harmony','Harrison','Heartland','Heritage','Highland','Hillcrest','Horizon','Hudson','Imperial','Ironwood','Jefferson','Keystone','Kings','Lakeside','Landmark','Laurel','Legacy','Lexington','Liberty','Lincoln','Lone Star','Madison','Magnolia','Main Street','Maple','Marina','Meadowbrook','Memorial','Mercy','Meridian','Metro','Metropolitan','Midwest','Millennium','Mission','Monarch','Mount','Mountain','New','North Star','Northeast','Northern','Northwest','Oak','Oakwood','Ocean','Olympic','Pacific','Palm','Palmetto','Park','Parker','Parkview','Pinnacle','Pioneer','Pleasant','Prestige','Prime','Princeton','Providence','Quest','Red River','Regional','Renaissance','Ridge','River','Riverbend','Rocky','Rose','Sage','Sakura','San','Sapphire','Savannah','Seaside','Serenity','Sherman','Silver','Skyline','Somerset','South','Southeast','Southern','Southwest','Spring','Springfield','St. Luke','St. Mary','Sterling','Stone','Summit','Sun','Sunrise','Sunset','Tampa','Temple','Terra','Teton','Timber','Titan','Tower','Trident','Trinity','Tucson','Twin','Unity','University','Uptown','Valley','Victoria','Village','Vista','Washington','Wellness','West','Western','Westwood','White','Willow','Windward','Windsor','Winter','Wisconsin','Woodland','Woodside','Xavier','Yorkshire','Zenith'];
  const suffixPool = ['Associates','Care Center','Care Partners','Clinic','Clinical Associates','Community Health','Diagnostic Center','Health Alliance','Health Group','Health Network','Health Partners','Health Services','Healthcare Partners','Medical Associates','Medical Care','Medical Center','Medical Group','Medical Institute','Medical Network','Medical Plaza','Medical Solutions','Medical Specialists','Physician Group','Physicians','Primary Care','Specialty Center','Specialty Clinic','Surgical Center','Surgical Institute','Wellness Center'];
  const provCities = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus','Charlotte','Indianapolis','San Francisco','Seattle','Denver','Nashville','Portland','Las Vegas','Memphis','Baltimore','Milwaukee','Tucson','Fresno','Sacramento','Atlanta','Miami'];
  const provStates = ['NY','CA','IL','TX','AZ','PA','TX','CA','TX','CA','TX','FL','TX','OH','NC','IN','CA','WA','CO','TN','OR','NV','TN','MD','WI','AZ','CA','CA','GA','FL'];
  const usedNames = new Set();
  const providers = [];
  const rng = createRng(99);
  for (let i = 0; i < 200; i++) {
    let name;
    let attempts = 0;
    do {
      const pf = firstNamePool[(i * 13 + attempts * 7) % firstNamePool.length];
      const sf = suffixPool[(i * 17 + attempts * 11) % suffixPool.length];
      name = `${pf} ${sf}`;
      attempts++;
      if (attempts > 50) name = `${firstNamePool[i % firstNamePool.length]} ${suffixPool[(i + 200) % suffixPool.length]}`;
    } while (usedNames.has(name));
    usedNames.add(name);
    const specialty = specialties[i % specialties.length];
    const type = types[i % types.length];
    const totalClaims = Math.floor(30 + rng() * 220);
    const fraudRand = rng();
    const fraudCount = fraudRand < 0.6 ? Math.floor(rng() * Math.floor(totalClaims * 0.06)) : Math.floor(rng() * Math.floor(totalClaims * 0.22)) + Math.floor(totalClaims * 0.04);
    const approvedCount = Math.floor(totalClaims * (0.55 + rng() * 0.35));
    const rejectedCount = Math.floor(totalClaims * (0.02 + rng() * 0.10));
    const avgClaimAmount = Math.round(800 + rng() * 2200);
    const networkStatus = rng() > 0.2 ? 'In-Network' : 'Out-of-Network';
    providers.push({
      provider_id: `PRV-${String(1000 + i).padStart(4, '0')}`,
      name, provider_name: name, type, specialty,
      address: `${100 + Math.floor(rng() * 9900)} ${['Main','Oak','Elm','Pine','Cedar','Maple','Park','Lake','Hill','Valley'][i % 10]} ${['St','Ave','Blvd','Dr','Rd','Way','Ln','Ct','Pl','Cir'][i % 10]}`,
      city: provCities[i % provCities.length], state: provStates[i % provStates.length],
      phone: `(${200 + Math.floor(rng() * 800)}) 555-${String(1000 + i).padStart(4, '0')}`,
      npi: String(1000000000 + i),
      total_claims: totalClaims, claim_count: totalClaims, claims_count: totalClaims,
      fraud_claims: fraudCount, fraud_count: fraudCount,
      total_amount: totalClaims * avgClaimAmount,
      avg_claim_amount: avgClaimAmount,
      flagged_amount: Math.round(fraudCount * avgClaimAmount),
      approved_count: approvedCount, rejected_count: rejectedCount,
      network_status: networkStatus,
    });
  }
  _cachedProviders = providers;
  return providers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Generation (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
let _cachedPolicies = null;
function generatePolicies() {
  if (_cachedPolicies) return _cachedPolicies;
  const patientNames = ['Margaret Thompson','Robert Chen','Patricia Williams','James Anderson','Linda Martinez','William Brown','Elizabeth Davis','Michael Wilson','Barbara Garcia','David Rodriguez','Sarah Johnson','John Smith','Emily Davis','Christopher Lee','Amanda Taylor','Kevin White','Jessica Martin','Thomas Harris','Nicole Clark','Daniel Lewis','Ashley Walker','Brandon Hall','Stephanie Allen','Justin Young','Rachel King','Katherine Wright','Joshua Scott','Laura Adams','Andrew Nelson','Brittany Baker'];
  const planTypes = ['Medicare Advantage','Blue Cross PPO','Aetna HMO','UnitedHealth Choice','Cigna Open Access','Humana Gold','Kaiser Permanente','Anthem Blue Cross','Molina Healthcare','WellCare'];
  const polCities = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose'];
  const polStates = ['NY','CA','IL','TX','AZ','PA','TX','CA','TX','CA'];
  const coverageProfiles = [
    { label: 'Platinum', policyType: 'Individual', premiumRange: [7000, 12000], dedRange: [250, 750], copayRange: [10, 30], maxCovMult: [25, 40] },
    { label: 'Gold', policyType: 'Corporate', premiumRange: [5000, 8000], dedRange: [1000, 2500], copayRange: [25, 75], maxCovMult: [20, 35] },
    { label: 'Silver', policyType: 'Standard', premiumRange: [3000, 5500], dedRange: [2500, 5000], copayRange: [50, 200], maxCovMult: [15, 28] },
    { label: 'Bronze', policyType: 'Family', premiumRange: [1500, 3000], dedRange: [5000, 8000], copayRange: [200, 500], maxCovMult: [10, 22] },
  ];
  const providerNames = ['Metropolitan General Hospital','St. Mary Medical Center','City Health Network','Pacific Wellness Group','Summit Healthcare Partners','Lakeside Medical Associates','Valley Regional Hospital','Northeast Health Services','Premier Care Network','Community Health Alliance'];
  const investigators = ['Sarah Mitchell, CFE','James Rodriguez, CFE','Emily Chen, CFE','Mark Thompson, CFE','Lisa Park, CFE'];
  const policies = [];
  const rng = createRng(77);

  const statusPool = Array(CANONICAL_REFERENCE.policiesActive).fill('Active')
    .concat(Array(CANONICAL_REFERENCE.policiesExpired).fill('Expired'))
    .concat(Array(CANONICAL_REFERENCE.policiesPending).fill('Pending'));
  for (let s = statusPool.length - 1; s > 0; s--) {
    const j = Math.floor(rng() * (s + 1));
    [statusPool[s], statusPool[j]] = [statusPool[j], statusPool[s]];
  }

  const now = new Date();

  for (let i = 0; i < 80; i++) {
    const year = '2026';
    const profile = coverageProfiles[i % coverageProfiles.length];
    const status = statusPool[i];

    let startDate, endDate;
    if (status === 'Expired') {
      const sM = Math.floor(rng() * 5) + 1;
      const sD = Math.floor(rng() * 28) + 1;
      const dur = Math.floor(rng() * 4) + 2;
      let eM = Math.min(6, sM + dur);
      startDate = `${year}-${String(sM).padStart(2,'0')}-${String(sD).padStart(2,'0')}`;
      endDate = `${year}-${String(eM).padStart(2,'0')}-${String(Math.min(sD, 28)).padStart(2,'0')}`;
    } else if (status === 'Pending') {
      const sM = Math.floor(rng() * 5) + 8;
      const sD = Math.floor(rng() * 28) + 1;
      const totalM = sM + 11;
      const eY = totalM > 12 ? 2027 : 2026;
      const eM = totalM > 12 ? totalM - 12 : totalM;
      startDate = `${year}-${String(sM).padStart(2,'0')}-${String(sD).padStart(2,'0')}`;
      endDate = `${eY}-${String(eM).padStart(2,'0')}-${String(Math.min(sD, 28)).padStart(2,'0')}`;
    } else {
      const sM = Math.floor(rng() * 6) + 1;
      const sD = Math.floor(rng() * 28) + 1;
      const totalM = sM + 12 + Math.floor(rng() * 6);
      const eY = totalM > 12 ? 2027 : 2026;
      const eM = totalM > 12 ? totalM - 12 : totalM;
      startDate = `${year}-${String(sM).padStart(2,'0')}-${String(sD).padStart(2,'0')}`;
      endDate = `${eY}-${String(eM).padStart(2,'0')}-${String(Math.min(sD, 28)).padStart(2,'0')}`;
    }

    const dedLo = profile.dedRange[0], dedHi = profile.dedRange[1];
    const deductible = dedLo + Math.floor(rng() * (dedHi - dedLo));
    const copay = profile.copayRange[0] + Math.floor(rng() * (profile.copayRange[1] - profile.copayRange[0]));
    const maxCovMult = profile.maxCovMult[0] + rng() * (profile.maxCovMult[1] - profile.maxCovMult[0]);
    const maxCoverage = Math.round(deductible * maxCovMult * (0.9 + rng() * 0.2));
    const annualPremium = profile.premiumRange[0] + Math.floor(rng() * (profile.premiumRange[1] - profile.premiumRange[0]));
    const claimCount = Math.min(40, Math.max(3, Math.round(8 + rng() * 15)));
    const avgClaimAmount = 600 + Math.floor(rng() * 1200);
    const totalBilled = claimCount * avgClaimAmount;
    const fraudRand = rng();
    let fraudCount;
    if (fraudRand < 0.50) fraudCount = 0;
    else if (fraudRand < 0.75) fraudCount = 1;
    else if (fraudRand < 0.88) fraudCount = 2;
    else if (fraudRand < 0.95) fraudCount = 3;
    else if (fraudRand < 0.98) fraudCount = Math.floor(rng() * 2) + 4;
    else fraudCount = Math.floor(rng() * 3) + 6;
    fraudCount = Math.min(claimCount, fraudCount);
    if (claimCount >= 5) fraudCount = Math.min(fraudCount, Math.max(1, Math.floor(claimCount * 0.18)));

    const cityIdx = i % polCities.length;
    const reviewedBy = (status === 'Expired' || (status === 'Active' && fraudCount > 2))
      ? investigators[Math.floor(rng() * investigators.length)]
      : null;
    const lastReviewedDate = reviewedBy
      ? `2026-${String(Math.floor(rng() * 6) + 1).padStart(2,'0')}-${String(Math.floor(rng() * 28) + 1).padStart(2,'0')}`
      : null;

    policies.push({
      id: `POL-${String(1000 + i).padStart(4,'0')}`,
      policy_id: `POL-${String(1000 + i).padStart(4,'0')}`,
      policy_number: `POL-${year}-${String(10000 + i).padStart(6,'0')}`,
      patient_name: patientNames[i % patientNames.length],
      patient_id: `PAT-${String(100 + i).padStart(4,'0')}`,
      plan_type: profile.policyType,
      coverage_class: profile.label,
      provider: providerNames[i % providerNames.length],
      city: polCities[cityIdx],
      state: polStates[cityIdx],
      address: `${100 + Math.floor(rng()*9900)} ${['Main','Oak','Elm','Pine','Cedar','Maple','Park','Lake','Hill','Valley'][i%10]} ${['St','Ave','Blvd','Dr','Rd','Way','Ln','Ct','Pl','Cir'][i%10]}`,
      start_date: startDate,
      end_date: endDate,
      policy_start_date: startDate,
      policy_end_date: endDate,
      premium: annualPremium,
      annual_premium: annualPremium,
      annual_deductible: deductible,
      deductible: deductible,
      copay_amount: copay,
      max_coverage: maxCoverage,
      status: status,
      policy_status: status,
      claims_count: claimCount,
      claim_count: claimCount,
      total_paid: totalBilled,
      total_billed: totalBilled,
      fraud_count: fraudCount,
      fraud_claims: fraudCount,
      risk_score: Math.round((fraudCount / Math.max(1, claimCount)) * 50 + rng() * 20),
      last_reviewed_by: reviewedBy,
      last_reviewed_date: lastReviewedDate,
    });
  }
  _cachedPolicies = policies;
  return policies;
}

// ─────────────────────────────────────────────────────────────────────────────
// Claims Generation
// Key fixes: unique patient names (no cyclical repeat), dates capped to past,
// fraud rate ~7.5% (15/200) matching canonical source.
// ─────────────────────────────────────────────────────────────────────────────
let _cachedClaims = null;
function generateClaims() {
  if (_cachedClaims) return _cachedClaims;

  generateAllPatientData();
  const patientPool = _cachedPatients.map(p => p.name);
  const localProviders = generateProviders();
  const providerNames = localProviders.map(p => p.name);
  const investigators = [...CANONICAL_INVESTIGATORS, null, null, null];
  const services = ['Office Visit', 'Lab Work', 'Imaging', 'Surgery Consultation', 'Physical Therapy', 'Prescription', 'Emergency Visit', 'Ambulance', 'Specialist Referral', 'Diagnostic Test'];
  const procedures = ['99213', '99214', '99215', '99203', '99204', '80053', '71046', '97110', '99283', '99291'];
  const statuses = ['Submitted', 'AI Scored', 'Under Review', 'Approved', 'Rejected', 'Fraud Confirmed', 'Closed'];
  const claims = [];
  const rng = createRng(55);

  const shuffledPatients = [...patientPool];
  for (let i = shuffledPatients.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledPatients[i], shuffledPatients[j]] = [shuffledPatients[j], shuffledPatients[i]];
  }

  for (let i = 0; i < 200; i++) {
    const r = rng();
    const score = r < 0.85
      ? Math.round((rng() * 0.48 + 0.01) * 100) / 100
      : r < 0.925
        ? Math.round((rng() * 0.24 + 0.40) * 100) / 100
        : r < 0.9625
          ? Math.round((rng() * 0.19 + 0.65) * 100) / 100
          : Math.round((rng() * 0.12 + 0.85) * 100) / 100;
    const raw = Math.exp(Math.log(1250) + 0.7 * (rng() + rng() + rng() - 1.5));
    const amount = Math.round(Math.max(150, Math.min(raw, 50000)) * 100) / 100;
    const riskLevel = score >= 0.85 ? 'critical' : score >= 0.65 ? 'high' : score >= 0.45 ? 'medium' : 'low';
    const status = statuses[Math.floor(rng() * statuses.length)];
    const month = String(Math.floor(rng() * 6) + 1).padStart(2, '0');
    const day = String(Math.floor(rng() * 28) + 1).padStart(2, '0');
    const year = '2026';
    const investigator = (status === 'Under Review' || status === 'Fraud Confirmed')
      ? investigators[Math.floor(rng() * (investigators.length - 3))]
      : null;
    claims.push({
      id: `CLM-${year}-${String(200000 + i).padStart(6, '0')}`,
      claim_id: `CLM-${year}-${String(200000 + i).padStart(6, '0')}`,
      patient_name: shuffledPatients[i % shuffledPatients.length],
      provider_name: providerNames[i % providerNames.length],
      service_name: services[i % services.length],
      procedure_code: procedures[i % procedures.length],
      amount, status, fraud_score: score, risk_level: riskLevel,
      claim_date: `${year}-${month}-${day}`,
      diagnosis_code: CANONICAL_FRAUD_DIAGNOSES[i % CANONICAL_FRAUD_DIAGNOSES.length].code,
      flagged: score >= 0.65,
      claim_amount: amount,
      investigator,
    });
  }
  const outliers = [
    { i: 5,  amount: 42500, service: 'Emergency Visit',      score: 0.92, status: 'Fraud Confirmed' },
    { i: 25, amount: 28900, service: 'Surgery Consultation', score: 0.88, status: 'Under Review' },
    { i: 45, amount: 18500, service: 'Ambulance',            score: 0.78, status: 'Under Review' },
    { i: 65, amount: 31200, service: 'Surgery Consultation', score: 0.95, status: 'Fraud Confirmed' },
    { i: 85, amount: 15800, service: 'Diagnostic Test',      score: 0.71, status: 'Under Review' },
  ];
  outliers.forEach(o => {
    const c = claims[o.i];
    if (c) {
      c.amount = o.amount;
      c.claim_amount = o.amount;
      c.fraud_score = o.score;
      c.status = o.status;
      c.service_name = o.service;
      c.flagged = o.score >= 0.65;
      c.risk_level = o.score >= 0.85 ? 'critical' : o.score >= 0.65 ? 'high' : o.score >= 0.45 ? 'medium' : 'low';
    }
  });
  claims.forEach(c => {
    if (c.status === 'Fraud Confirmed' && c.fraud_score < 0.85) {
      c.fraud_score = 0.85 + rng() * 0.14;
      c.risk_level = 'critical';
      c.flagged = true;
    }
  });
  _cachedClaims = claims;
  return claims;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — all API endpoint handlers
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_DATA = {
  '/api/stats': {
    total_claims: CANONICAL_FUNNEL.totalClaims,
    total_fraud: CANONICAL_FUNNEL.aiScoredHighRisk,
    flagged_claims: CANONICAL_FUNNEL.formallyFlagged,
    escalated_alerts: CANONICAL_FUNNEL.escalatedAlerts,
    total_amount: CANONICAL_FINANCIALS.totalClaimValue,
    fraud_amount: CANONICAL_FINANCIALS.fraudExposure,
    normal_claims: CANONICAL_FUNNEL.normalClaims,
    total_providers: CANONICAL_FUNNEL.totalProviders,
    total_patients: CANONICAL_FUNNEL.totalPatients,
    total_policies: CANONICAL_FUNNEL.totalPolicies,
    pending_claims: 0,
    approved_claims: 0,
    denied_claims: 0,
    under_review: 0,
    fraud_rate: CANONICAL_REFERENCE.fraudRate,
    avg_claim_amount: CANONICAL_FINANCIALS.avgClaimAmount,
    detection_accuracy: CANONICAL_MODEL.accuracy * 100,
    model_accuracy: CANONICAL_MODEL.accuracy,
    model_version: CANONICAL_MODEL.version,
    model_f1: CANONICAL_MODEL.f1Score,
    model_roc_auc: CANONICAL_MODEL.rocAuc,
    money_saved: CANONICAL_FINANCIALS.moneySaved,
    financial_exposure: CANONICAL_FINANCIALS.fraudExposure,
    total_claim_amount: CANONICAL_FINANCIALS.totalClaimValue,
    monthly_data: CANONICAL_MONTHLY_TRENDS,
  },
  '/api/charts/claims-over-time': CANONICAL_CLAIMS_OVER_TIME.map(d => ({
    month: d.date.slice(0, 7),
    date: d.date,
    total: d.total_claims,
    flagged: d.fraud_claims,
    total_claims: d.total_claims,
    fraud_claims: d.fraud_claims,
    total_amount: d.total_amount,
    fraud_amount: d.fraud_amount,
  })),
  '/api/charts/monthly-claims': CANONICAL_MONTHLY_TRENDS.map(d => ({
    month: d.month,
    claims: d.claims,
    amount: d.amount,
    total_claims: d.claims,
    fraud_claims: d.fraud_claims,
  })),
  '/api/charts/fraud-by-provider': CANONICAL_PROVIDERS.map(p => ({
    provider: p.name,
    provider_name: p.name,
    fraud_cases: p.fraud_claims,
    total_claims: p.total_claims,
    rate: +((p.fraud_claims / p.total_claims) * 100).toFixed(1),
  })),
  '/api/charts/fraud-by-region': CANONICAL_REGIONAL_DATA.map(r => ({
    region: r.state,
    state: r.state,
    fraud_cases: r.fraud_claims,
    fraud_claims: r.fraud_claims,
    percentage: +((r.fraud_claims / r.total_claims) * 100).toFixed(1),
    total_claims: r.total_claims,
    amount: r.total_claims * CANONICAL_FINANCIALS.avgClaimAmount,
  })),
  '/api/charts/fraud-by-diagnosis': CANONICAL_FRAUD_DIAGNOSES.map(d => ({
    code: d.code,
    description: d.description,
    diagnosis_code: d.code,
    total_claims: d.claims,
    fraud_claims: d.fraud_claims,
    fraud_cases: d.fraud_claims,
    amount: d.amount,
    rate: d.fraud_rate,
    fraud_rate: d.fraud_rate,
  })),
  '/api/charts/fraud-by-city': CANONICAL_FRAUD_BY_CITY.map(c => ({
    city: c.city,
    state: c.state,
    fraud_cases: c.fraud_claims,
    fraud_claims: c.fraud_claims,
    total_claims: c.total_claims,
    rate: c.rate,
  })),
  '/api/charts/fraud-score-distribution': [
    { range: '0-10', count: 6245, label: 'Very Low Risk', score_range: '0-10%' },
    { range: '10-20', count: 4832, label: 'Low Risk', score_range: '10-20%' },
    { range: '20-30', count: 3156, label: 'Low Risk', score_range: '20-30%' },
    { range: '30-40', count: 2234, label: 'Medium Risk', score_range: '30-40%' },
    { range: '40-50', count: 1567, label: 'Medium Risk', score_range: '40-50%' },
    { range: '50-60', count: 923, label: 'High Risk', score_range: '50-60%' },
    { range: '60-70', count: 534, label: 'High Risk', score_range: '60-70%' },
    { range: '70-80', count: 312, label: 'Very High Risk', score_range: '70-80%' },
    { range: '80-90', count: 198, label: 'Critical Risk', score_range: '80-90%' },
    { range: '90-100', count: 71, label: 'Critical Risk', score_range: '90-100%' },
  ],
  '/api/charts/claim-status-distribution': [
    { status: 'Approved', count: 100, percentage: 50.0 },
    { status: 'Under Review', count: 32, percentage: 16.0 },
    { status: 'Rejected', count: 26, percentage: 13.0 },
    { status: 'AI Scored', count: 20, percentage: 10.0 },
    { status: 'Fraud Confirmed', count: 15, percentage: 7.5 },
    { status: 'Submitted', count: 7, percentage: 3.5 },
  ],
  '/api/charts/fraud-categories': CANONICAL_FRAUD_CATEGORIES,
  '/api/charts/average-claim-cost': CANONICAL_MONTHLY_TRENDS.map(d => ({
    month: d.month,
    avg_cost: CANONICAL_FINANCIALS.avgClaimAmount + (Math.random() * 200 - 100),
  })),
  '/api/analytics/top-providers': CANONICAL_TOP_RISKY_PROVIDERS.map(p => ({
    name: p.name,
    total_claims: p.claim_count,
    fraud_claims: p.fraud_count,
    fraud_rate: +((p.fraud_count / p.claim_count) * 100).toFixed(1),
    total_amount: p.total_amount,
    flagged_amount: Math.round(p.total_amount * 0.1),
    claim_count: p.claim_count,
    fraud_count: p.fraud_count,
  })),
  '/api/analytics/top-patients': CANONICAL_TOP_RISKY_PATIENTS.map(p => ({
    name: p.name,
    claim_count: p.claim_count,
    fraud_count: p.fraud_count,
    total_claims: p.claim_count,
    age: p.age,
    gender: p.gender,
    city: p.city,
  })),
  '/api/analytics/top-diagnoses': CANONICAL_FRAUD_DIAGNOSES.slice(0, 6).map(d => ({
    diagnosis_code: d.code,
    code: d.code,
    description: d.description,
    claim_count: d.claims,
    claims: d.claims,
    fraud_count: d.fraud_claims,
    fraud_rate: d.fraud_rate,
    amount: d.amount,
  })),
  '/api/claims': () => {
    const claims = generateClaims();
    return { claims, total: 200, total_pages: 1 };
  },
  '/api/claims/': (id) => {
    const allClaims = generateClaims();
    const c = allClaims.find(cl => cl.claim_id === id || cl.id === id) || allClaims[0];
    const provider = CANONICAL_PROVIDERS[Math.floor(Math.random() * CANONICAL_PROVIDERS.length)];
    return {
      claim: {
        ...c,
        patient_id: 'PAT-' + String(Math.floor(Math.random() * 900) + 100),
        patient_age: 35 + Math.floor(Math.random() * 45),
        patient_gender: Math.random() > 0.5 ? 'Male' : 'Female',
        patient_city: provider.city,
        patient_state: provider.state,
        provider_type: provider.type,
        provider_specialty: provider.specialty,
        service_date: c.claim_date,
        claim_submitted_late: Math.random() > 0.85,
        number_of_previous_claims_patient: Math.floor(Math.random() * 12) + 1,
        number_of_procedures: Math.floor(Math.random() * 4) + 1,
        deductible_amount: Math.round((c.claim_amount || 0) * 0.1),
        claim_copay: Math.round((c.claim_amount || 0) * 0.05),
        investigator: c.investigator,
      },
      patient_history: [],
      shap_contributions: [],
      base_value: 0.15,
      audit_log: [
        { timestamp: `${c.claim_date}T08:15:00Z`, action: 'Claim Submitted', user: 'System', details: `Claim submitted for ${c.service_name || 'services rendered'}` },
        { timestamp: `${c.claim_date}T08:16:00Z`, action: 'AI Scoring', user: 'ML Engine v3.2.1', details: `Fraud score assigned: ${((c.fraud_score || 0) * 100).toFixed(1)}%` },
        ...(c.status !== 'Submitted' ? [{ timestamp: `${c.claim_date}T09:00:00Z`, action: 'Status Updated', user: 'System', details: `Status changed to ${c.status}` }] : []),
        ...(c.investigator ? [{ timestamp: `${c.claim_date}T14:30:00Z`, action: 'Investigator Assigned', user: 'Case Manager', details: `Assigned to ${c.investigator}` }] : []),
        ...(c.flagged ? [{ timestamp: `${c.claim_date}T09:05:00Z`, action: 'Flagged for Review', user: 'AI Engine', details: 'Claim flagged: score exceeds threshold' }] : []),
      ],
    };
  },
  '/api/patients': () => {
    return generatePatients();
  },
  '/api/patients/suspicious-patterns': () => {
    return getPatientPatterns();
  },
  '/api/providers': () => generateProviders(),
  '/api/policies': () => generatePolicies(),
  '/api/notifications': () => CANONICAL_NOTIFICATIONS,
  '/api/ai-insights': () => ({
    insights: [
      { id: 1, type: 'pattern', title: 'Upcoding Surge in Q4', description: 'Analysis reveals a 34% increase in upcoded claims (CPT 99214→99215) from providers in the Northeast region during Q4 2025. Estimated financial impact: $4.2M.', confidence: 94.5, severity: 'high', actionable: true, created_at: '2026-01-16T10:00:00Z', priority: 'high' },
      { id: 2, type: 'anomaly', title: 'Phantom Billing Ring Detected', description: 'Network analysis identified 5 providers sharing overlapping patient records with suspicious billing patterns. Cross-referencing with provider address data reveals 3 share the same registered address.', confidence: 89.2, severity: 'critical', actionable: true, created_at: '2026-01-15T14:30:00Z', priority: 'high' },
      { id: 3, type: 'prediction', title: 'Claim Volume Surge Expected', description: 'Predictive model forecasts a 18-22% increase in claim volume during December holidays. Recommend scaling fraud detection resources accordingly.', confidence: 82.7, severity: 'medium', actionable: true, created_at: '2026-01-14T09:15:00Z', priority: 'medium' },
      { id: 4, type: 'recommendation', title: 'Threshold Optimization', description: 'Current fraud detection threshold (0.75) can be optimized to 0.72 to improve recall by 4.2% without significant increase in false positives.', confidence: 91.3, severity: 'medium', actionable: true, created_at: '2026-01-13T11:00:00Z', priority: 'medium' },
      { id: 5, type: 'pattern', title: 'Weekend Billing Anomaly', description: 'Weekend claim submissions show 47% higher fraud probability than weekday submissions. Flagged for enhanced review on Saturday-Sunday claims.', confidence: 87.8, severity: 'high', actionable: true, created_at: '2026-01-12T16:45:00Z', priority: 'low' },
    ],
    summary: { total_insights: 5, critical: 1, high: 2, medium: 2, low: 0, avg_confidence: 89.1 },
    model_accuracy: CANONICAL_MODEL.accuracy,
    precision: CANONICAL_MODEL.precision,
    recall: CANONICAL_MODEL.recall,
    f1: CANONICAL_MODEL.f1Score,
    roc_auc: CANONICAL_MODEL.rocAuc,
    model_version: CANONICAL_MODEL.version,
  }),
  '/api/ai-insights/detailed': () => ({
    kpi: {
      top_provider: { name: 'Metropolitan General Hospital', specialty: 'Multi-Specialty', city: 'New York', state: 'NY', total_claims: 28, fraud_count: 12, fraud_rate: 42.9, fraud_amount: 156000 },
      top_city: { city: 'New York', state: 'NY', total_claims: 28, fraud_count: 12, fraud_rate: 42.9, avg_fraud_amount: 13000, pct_above_avg: 280 },
      top_diagnosis: { code: '414', total_claims: 12, fraud_count: 5, fraud_rate: 41.7, avg_amount: 18500 },
      top_patient: { patient_id: 'PAT-003', name: 'Patricia Williams', total_claims: 6, fraud_count: 1, max_fraud_score: 0.856, suspicious_amount: 12500 },
      system: { total_claims: 200, total_fraud: 15, fraud_rate: 7.5, total_amount: 2500000, fraud_amount: 625000, avg_claim_amount: 12500, avg_fraud_amount: 41667 },
    },
    model: { accuracy: CANONICAL_MODEL.accuracy, precision: CANONICAL_MODEL.precision, recall: CANONICAL_MODEL.recall, f1_score: CANONICAL_MODEL.f1Score, roc_auc: CANONICAL_MODEL.rocAuc, version: CANONICAL_MODEL.version, training_samples: 128459, last_training_date: '2026-06-15' },
    feature_importance: CANONICAL_MODEL.featureImportance,
    insights: [
      { id: 1, type: 'admission_analysis', title: 'Emergency Admissions Show Highest Fraud Rate', confidence: 88, severity: 'high', description: 'Emergency admissions have a fraud rate of 12.3% compared to 4.1% for Elective admissions. This represents a 3.0x difference in fraud probability.', evidence: ['Emergency: 8 fraud claims out of 65 total (12.3%)', 'Elective: 3 fraud claims out of 73 total (4.1%)', 'Admission type distribution across 4 categories analyzed'] },
      { id: 2, type: 'claim_amount_analysis', title: 'Higher Claim Amounts Strongly Correlate with Fraud', confidence: 91, severity: 'critical', description: 'Fraudulent claims average $41,667 compared to $9,876 for legitimate claims — a 4.2x difference. 18 extreme claims (2x+ average) were confirmed fraudulent.', evidence: ['Average fraudulent claim: $41,667 vs legitimate: $9,876', '18 claims exceeding 2x average confirmed as fraud', 'Total fraudulent exposure: $625,000 (7.5% of all claims)'] },
      { id: 3, type: 'provider_specialty', title: 'Multi-Specialty Providers Lead Fraud Cases', confidence: 84, severity: 'high', description: 'Multi-Specialty providers account for 45% of all fraudulent claims with 12 cases and $156,000 in suspicious billings.', evidence: ['Multi-Specialty: 12 fraud claims (42.9% fraud rate)', 'Total specialty fraud exposure: $156,000', 'Across 9 provider specialties analyzed'] },
      { id: 4, type: 'geographic_analysis', title: 'New York Shows Unusually High Fraud Rate', confidence: 82, severity: 'high', description: 'New York has a fraud rate of 42.9%, which is 280% above the dataset average of 11.3%.', evidence: ['New York: 12 fraud claims out of 28 (42.9%)', 'Dataset average fraud rate: 11.3%', '3 cities identified above average threshold'] },
      { id: 5, type: 'patient_behavior', title: 'Suspicious Patient Claim Patterns Detected', confidence: 78, severity: 'medium', description: 'Patient PAT-003 (Patricia Williams) has 6 claims with 1 flagged as fraudulent and a peak fraud score of 86%.', evidence: ['Patient PAT-003: 6 total claims, 1 fraudulent', 'Peak fraud score: 86%', '3 patients identified with suspicious patterns'] },
      { id: 6, type: 'diagnosis_pattern', title: 'ICD Code 414 Shows Elevated Fraud Association', confidence: 80, severity: 'medium', description: 'Diagnosis code 414 has 5 fraudulent claims (41.7% rate) with an average claim amount of $18,500.', evidence: ['ICD 414: 5 fraud / 12 total (41.7%)', 'Average claim amount for this diagnosis: $18,500', 'Compared to dataset average fraud rate: 7.5%'] },
      { id: 7, type: 'financial_risk', title: 'Financial Impact: $625,000 in Fraudulent Claims', confidence: 95, severity: 'critical', description: 'Total fraudulent claim value is $625,000 (7.5% of $2,500,000 total). Estimated $118,750 saved through AI detection.', evidence: ['Fraudulent claims: 15 totaling $625,000', 'Average fraudulent claim: $41,667', 'Estimated fraud prevented: $118,750'] },
      { id: 8, type: 'fraud_trend', title: 'Fraud Rate Increasing — 8.2% in Latest Month', confidence: 76, severity: 'medium', description: 'Fraud rate changed from 6.8% to 8.2% (+1.4pp) between the two most recent months.', evidence: ['Latest month: 8 fraud / 98 total (8.2%)', 'Previous month: 7 fraud / 103 total (6.8%)', 'Trend direction: increasing by 1.4 percentage points'] },
    ],
  }),
  '/api/model/metrics': () => ({
    accuracy: CANONICAL_MODEL.accuracy,
    precision: CANONICAL_MODEL.precision,
    recall: CANONICAL_MODEL.recall,
    f1_score: CANONICAL_MODEL.f1Score,
    roc_auc: CANONICAL_MODEL.rocAuc,
    prediction_time_ms: CANONICAL_MODEL.predictionTimeMs,
    model_version: CANONICAL_MODEL.version,
    dataset_version: CANONICAL_MODEL.datasetVersion,
    training_date: CANONICAL_MODEL.trainingDate,
    data_drift: CANONICAL_MODEL.dataDrift,
    last_retrained: CANONICAL_MODEL.lastRetrained,
    validation_accuracy: CANONICAL_MODEL.validationAccuracy,
    num_features: CANONICAL_MODEL.numFeatures,
    training_size: CANONICAL_MODEL.trainingSize,
    confusion_matrix: CANONICAL_MODEL.confusionMatrix,
    feature_importance: CANONICAL_MODEL.featureImportance,
    model_versions: CANONICAL_MODEL.versions,
  }),
  '/api/system/health': () => ({
    status: 'healthy', uptime: '47d 14h 32m', version: '2.8.3',
    database: { status: 'connected', latency_ms: 12, connections: '47/200', last_backup: '2026-07-20T03:00:00Z' },
    api: { status: 'running', avg_response_ms: 145, requests_per_min: 1247, uptime_pct: 99.97 },
    gpu: { status: 'active', utilization_pct: 67, memory_used_gb: 14.2, memory_total_gb: 24, temperature_c: 72 },
    disk: { status: 'warning', used_gb: 847, total_gb: 1000, usage_pct: 82.7, iops: 12400 },
    memory: { status: 'healthy', usage_pct: 57, total_gb: 32, used_gb: 18.2, swap_used_gb: 1.4 },
    queue: { status: 'healthy', size: 23, processed_per_hour: 45230, failed_24h: 3 },
    jobs: { status: 'running', active: 4, queued: 12, completed_24h: 1847 }
  }),
  '/api/audit-logs': (params) => {
    const level = params?.level || 'all';
    const allLogs = [
      { id: 1, timestamp: '2026-07-20T09:32:18Z', level: 'INFO', user: 'admin_insurance', action: 'VIEW', resource: 'Dashboard', details: 'Viewed fraud analytics dashboard' },
      { id: 2, timestamp: '2026-07-20T09:30:45Z', level: 'INFO', user: 'admin_insurance', action: 'UPDATE', resource: 'Claim CLM-2026-200127', details: 'Updated claim status to Under Review' },
      { id: 3, timestamp: '2026-07-20T09:28:12Z', level: 'WARN', user: 'auditor_insurance', action: 'EXPORT', resource: 'Reports', details: 'Exported fraud report (CSV format)' },
      { id: 4, timestamp: '2026-07-20T09:25:30Z', level: 'INFO', user: 'admin_insurance', action: 'VIEW', resource: 'Model Management', details: 'Viewed model performance metrics' },
      { id: 5, timestamp: '2026-07-20T09:22:15Z', level: 'ERROR', user: 'manager_insurance', action: 'CREATE', resource: 'Notification', details: 'Generated fraud alert notifications' },
      { id: 6, timestamp: '2026-07-20T09:18:45Z', level: 'INFO', user: 'admin_insurance', action: 'UPDATE', resource: 'Settings', details: 'Updated fraud detection threshold to 0.75' },
      { id: 7, timestamp: '2026-07-20T09:15:20Z', level: 'WARN', user: 'auditor_insurance', action: 'VIEW', resource: 'Alert Center', details: 'Reviewed 14 fraud alerts' },
      { id: 8, timestamp: '2026-07-20T09:10:00Z', level: 'ERROR', user: 'admin_insurance', action: 'LOGIN', resource: 'System', details: 'Successful login from 192.168.1.45' },
      { id: 9, timestamp: '2026-07-20T08:55:30Z', level: 'INFO', user: 'manager_insurance', action: 'VIEW', resource: 'Executive Summary', details: 'Viewed executive dashboard' },
      { id: 10, timestamp: '2026-07-20T08:45:10Z', level: 'INFO', user: 'admin_insurance', action: 'UPDATE', resource: 'Model', details: 'Triggered model retraining' }
    ];
    const filtered = level === 'all' ? allLogs : allLogs.filter(l => l.level === level);
    const summary = { INFO: allLogs.filter(l => l.level === 'INFO').length, WARN: allLogs.filter(l => l.level === 'WARN').length, ERROR: allLogs.filter(l => l.level === 'ERROR').length };
    return { logs: filtered, total: filtered.length, summary };
  },
  '/api/stats/trends': () => ({
    claims_trend: { current: CANONICAL_FUNNEL.totalClaims, previous: 185, change_pct: 8.1 },
    fraud_trend: { current: CANONICAL_FUNNEL.aiScoredHighRisk, previous: 13, change_pct: 15.4 },
    amount_trend: { current: CANONICAL_FINANCIALS.totalClaimValue, previous: 2_300_000, change_pct: 8.7 },
    detection_trend: { current: CANONICAL_MODEL.accuracy * 100, previous: 93.8, change_pct: 0.85 },
    money_saved_trend: 12.7,
    suspicious_providers_active: 12,
  }),
  '/api/heatmap/providers': () => CANONICAL_PROVIDERS.slice(0, 5).map(p => ({
    name: p.name,
    lat: { 'New York': 40.7128, 'Los Angeles': 34.0522, 'Chicago': 41.8781, 'San Francisco': 37.7749, 'Denver': 39.7392 }[p.city] || 39.0,
    lng: { 'New York': -74.006, 'Los Angeles': -118.2437, 'Chicago': -87.6298, 'San Francisco': -122.4194, 'Denver': -104.9903 }[p.city] || -98.0,
    fraud_rate: +((p.fraud_claims / p.total_claims) * 100).toFixed(1),
    claims: p.total_claims,
  })),
  '/api/search': (params) => {
    const q = params?.q?.toLowerCase() || '';
    return {
      results: [
        { type: 'claim', id: 'CLM-2026-200127', title: 'Claim #CLM-2026-200127', subtitle: '$2,450 - Under Review', url: '/insurance/claims/CLM-2026-200127' },
        { type: 'provider', id: 'PRV-001', title: 'Metropolitan General Hospital', subtitle: 'Fraud Rate: 10.3%', url: '/insurance/providers' },
        { type: 'patient', id: 'PAT-001', title: 'Margaret Thompson', subtitle: '47 claims, Risk: High', url: '/insurance/patients' }
      ].filter(r => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)),
      total: 3
    };
  },
  '/api/reports/data': () => ({
    monthly: CANONICAL_MONTHLY_TRENDS.map(d => ({
      month: d.month, claims: d.claims, fraud: d.fraud_claims,
      amount: d.amount, loss: Math.round(d.amount * 0.12),
    })),
    total_claims: CANONICAL_FUNNEL.totalClaims,
    total_fraud: CANONICAL_FUNNEL.aiScoredHighRisk,
    total_amount: CANONICAL_FINANCIALS.fraudExposure,
  }),
};

const api = {
  login: async (username, password) => {
    const token = btoa(`${username}:${password}`);
    const isInsurance = ['admin_insurance', 'auditor_insurance', 'manager_insurance'].includes(username);
    const role = isInsurance ? 'insurance' : 'provider';
    let subrole = 'admin';
    if (username === 'auditor_insurance') subrole = 'auditor';
    if (username === 'manager_insurance') subrole = 'manager';
    if (!isInsurance) subrole = 'doctor';
    const data = { token, username, role, subrole };
    localStorage.setItem('fraud_auth_user', JSON.stringify(data));
    return data;
  },

  getStats: () => request('GET', '/api/stats'),
  getMetrics: () => request('GET', '/api/stats'),
  getClaims: (params) => request('GET', '/api/claims', null, params),
  submitClaim: (data) => request('POST', '/api/claims', data),
  updateClaimStatus: (id, status) => request('PATCH', `/api/claims/${id}/status`, { status }),

  getPatients: () => request('GET', '/api/patients'),
  getPatientSuspiciousPatterns: () => request('GET', '/api/patients/suspicious-patterns'),
  getTotalActiveClaims: () => getTotalActiveClaims(),
  getProviders: () => request('GET', '/api/providers'),
  getPolicies: () => request('GET', '/api/policies'),
  getServices: () => request('GET', '/api/services'),
  createService: (data) => request('POST', '/api/services', data),
  updateService: (id, data) => request('PATCH', `/api/services/${id}`, data),
  deleteService: (id) => request('DELETE', `/api/services/${id}`),

  getLabeledData: (params) => request('GET', '/api/labeled-data', null, params),
  createLabeledRecord: (data) => request('POST', '/api/labeled-data', data),
  updateLabeledRecord: (id, data) => request('PATCH', `/api/labeled-data/${id}`, data),
  deleteLabeledRecord: (id) => request('DELETE', `/api/labeled-data/${id}`),

  getClaimsOverTime: () => request('GET', '/api/charts/claims-over-time'),
  getFraudByProvider: () => request('GET', '/api/charts/fraud-by-provider'),
  getFraudByRegion: () => request('GET', '/api/charts/fraud-by-region'),
  getFraudByDiagnosis: () => request('GET', '/api/charts/fraud-by-diagnosis'),
  getFraudByCity: () => request('GET', '/api/charts/fraud-by-city'),
  getFraudScoreDistribution: () => request('GET', '/api/charts/fraud-score-distribution'),
  getClaimStatusDistribution: () => request('GET', '/api/charts/claim-status-distribution'),
  getMonthlyClaims: () => request('GET', '/api/charts/monthly-claims'),
  getAverageClaimCost: () => request('GET', '/api/charts/average-claim-cost'),

  getTopProviders: () => request('GET', '/api/analytics/top-providers'),
  getTopPatients: () => request('GET', '/api/analytics/top-patients'),
  getTopDiagnoses: () => request('GET', '/api/analytics/top-diagnoses'),

  getAiInsights: () => request('GET', '/api/ai-insights'),
  getAiInsightsDetailed: () => request('GET', '/api/ai-insights/detailed'),

  getNotifications: () => request('GET', '/api/notifications'),
  getNotificationDetail: (id) => request('GET', `/api/notifications/${id}`),
  markNotificationRead: (id) => request('PATCH', `/api/notifications/${id}/read`),
  markAllNotificationsRead: () => request('PATCH', '/api/notifications/read-all'),

  getModelMetrics: () => request('GET', '/api/model/metrics'),
  triggerRetrain: () => request('POST', '/api/model/retrain'),

  getAuditLogs: (params) => request('GET', '/api/audit-logs', null, params),

  getSystemHealth: () => request('GET', '/api/system/health'),

  getHeatmapProviders: () => request('GET', '/api/heatmap/providers'),

  getStatsTrends: () => request('GET', '/api/stats/trends'),
  generateNotifications: () => request('POST', '/api/notifications/generate'),
  getReportData: (params) => request('GET', '/api/reports/data', null, params),
  exportReports: (params) => request('GET', '/api/reports/export', null, params),

  getDistributionByRegion: () => request('GET', '/api/charts/fraud-by-region'),
  getFraudByCategory: () => request('GET', '/api/charts/fraud-categories'),

  searchGlobal: (q) => request('GET', '/api/search', null, { q }),

  getClaim: (id) => request('GET', `/api/claims/${id}`),
  getClaimInvestigation: (id) => request('GET', `/api/claims/${id}/investigation`),
  updateInvestigation: (id, data) => request('PATCH', `/api/claims/${id}/investigation`, data),
  addInvestigationNote: (id, note) => request('POST', `/api/claims/${id}/investigation/notes`, note),
};

export default api;
