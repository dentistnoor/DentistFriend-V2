// --- CONFIG ---
const CASH_PRICES_PATH = '../data/cash/Cash.xlsx';
const INSURANCE_PRICES_DIR = '../data/insurance/';

// --- GLOBAL STATE ---
let cashProcedures = [];
let insuranceCompanies = [];
let insuranceProcedures = {}; // { companyName: [ { procedure, price, discount, finalAmount } ] }
let patientLogs = [];

// --- UTILS ---
function fetchExcel(url) {
  return fetch(url)
    .then(res => res.arrayBuffer())
    .then(data => XLSX.read(data, { type: 'array' }));
}

function findHeaderRow(rows, requiredHeaders) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const lowerRow = rows[i].map(h => (h || '').toString().toLowerCase().trim());
    if (requiredHeaders.every(h => lowerRow.includes(h.toLowerCase()))) {
      return i;
    }
  }
  return 0;
}

function parseCashProcedures(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const requiredHeaders = ['description', 'price', 'net'];
  const headerRowIdx = findHeaderRow(rows, requiredHeaders);
  const header = rows[headerRowIdx].map(h => h.toString().toLowerCase().trim());
  const descIdx = header.findIndex(h => h === 'description');
  const priceIdx = header.findIndex(h => h === 'price');
  const netIdx = header.findIndex(h => h === 'net');
  return rows.slice(headerRowIdx + 1)
    .filter(row => row[descIdx] && row[priceIdx])
    .map(row => ({
      procedure: (row[descIdx] || '').toString().trim(),
      price: Number(row[priceIdx]) || 0,
      finalAmount: netIdx !== -1 ? (Number(row[netIdx]) || 0) : 0
    }))
    .filter(row => row.procedure && row.price);
}

function parseInsuranceProcedures(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const requiredHeaders = ['description', 'price', 'discount %', 'net'];
  const headerRowIdx = findHeaderRow(rows, requiredHeaders);
  const header = rows[headerRowIdx].map(h => h.toString().toLowerCase().trim());
  const descIdx = header.findIndex(h => h === 'description');
  const priceIdx = header.findIndex(h => h === 'price');
  const discIdx = header.findIndex(h => h.includes('discount'));
  const netIdx = header.findIndex(h => h === 'net');
  return rows.slice(headerRowIdx + 1)
    .filter(row => row[descIdx] && row[priceIdx])
    .map(row => ({
      procedure: (row[descIdx] || '').toString().trim(),
      price: Number(row[priceIdx]) || 0,
      discount: discIdx !== -1 ? (Number(row[discIdx]) || 0) : 0,
      finalAmount: netIdx !== -1 ? (Number(row[netIdx]) || 0) : 0
    }))
    .filter(row => row.procedure && row.price);
}

// --- INITIALIZATION ---
async function loadPriceLists() {
  // Load cash procedures
  try {
    const cashWb = await fetchExcel(CASH_PRICES_PATH);
    cashProcedures = parseCashProcedures(cashWb);
  } catch (e) {
    alert('Failed to load cash price list.');
    cashProcedures = [];
  }

  // Dynamically load all insurance company files
  try {
    const insuranceFiles = [
      'TOTAL CARE SAUDI.xlsx',
      'TAWUNIYA .xlsx',
      'SAUDI NEXTCARE.xlsx',
      'SAUDI ARABIAN INSURANCE COMPANY (SAICO).xlsx',
      'MEDGULF-MEDIVISA.xlsx',
      'GULF UNION .xlsx',
      'GLOBEMED .xlsx',
      'GIG.xlsx',
      'BUPA.xlsx',
      'AL-ETIHAD.xlsx',
      'AL RAJHI .xlsx',
      'MALATH .xlsx'
    ];
    insuranceCompanies = insuranceFiles.map(f => {
      const displayName = f.replace(/\.xlsx$/i, '').replace(/\s+$/, '');
      return { name: displayName, file: f };
    });
    for (const company of insuranceCompanies) {
      const wb = await fetchExcel(INSURANCE_PRICES_DIR + company.file);
      insuranceProcedures[normalizeCompanyName(company.name)] = parseInsuranceProcedures(wb);
    }
  } catch (e) {
    alert('Failed to load insurance price lists.');
    insuranceCompanies = [];
    insuranceProcedures = {};
  }
}

function normalizeCompanyName(name) {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

function populateProcedureDropdown(type, companyName) {
  const procedureSelect = document.getElementById('procedure');
  procedureSelect.innerHTML = '';
  let procedures = [];
  if (type === 'cash') {
    procedures = cashProcedures;
  } else if (type === 'insurance' && companyName) {
    const normName = normalizeCompanyName(companyName);
    procedures = insuranceProcedures[normName] || [];
  }
  for (const proc of procedures) {
    const opt = document.createElement('option');
    opt.value = proc.procedure;
    opt.textContent = proc.procedure;
    procedureSelect.appendChild(opt);
  }
  if (procedures.length > 0) {
    procedureSelect.value = procedures[0].procedure;
  }
  updatePriceFields();
}

function populateInsuranceDropdown() {
  const insuranceSelect = document.getElementById('insurance-company');
  insuranceSelect.innerHTML = '';
  for (const company of insuranceCompanies) {
    const opt = document.createElement('option');
    opt.value = company.name;
    opt.textContent = company.name;
    insuranceSelect.appendChild(opt);
  }
}

function updatePriceFields() {
  const type = document.getElementById('patient-type').value;
  const procedure = document.getElementById('procedure').value;
  let price = '';
  let discount = '';
  let finalAmount = '';
  if (type === 'cash') {
    const proc = cashProcedures.find(p => p.procedure === procedure);
    price = proc ? proc.price : '';
    discount = '';
    finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    document.getElementById('discount-row').style.display = 'none';
  } else if (type === 'insurance') {
    const company = document.getElementById('insurance-company').value;
    const normName = normalizeCompanyName(company);
    const proc = insuranceProcedures[normName]?.find(p => p.procedure === procedure);
    price = proc ? proc.price : '';
    discount = proc ? proc.discount : '';
    finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    document.getElementById('discount-row').style.display = '';
  }
  document.getElementById('price').value = price !== undefined && price !== null ? price : '';
  document.getElementById('discount').value = discount !== undefined && discount !== null ? discount : '';
  document.getElementById('final-amount').value = (finalAmount !== undefined && finalAmount !== null && !isNaN(finalAmount)) ? String(finalAmount) : '';
}

function setupFormListeners() {
  document.getElementById('patient-type').addEventListener('change', e => {
    const type = e.target.value;
    if (type === 'insurance') {
      document.getElementById('insurance-company-row').style.display = '';
      populateInsuranceDropdown();
      populateProcedureDropdown('insurance', document.getElementById('insurance-company').value);
      document.getElementById('discount-row').style.display = '';
    } else {
      document.getElementById('insurance-company-row').style.display = 'none';
      populateProcedureDropdown('cash');
      document.getElementById('discount-row').style.display = 'none';
    }
  });
  document.getElementById('insurance-company').addEventListener('change', e => {
    populateProcedureDropdown('insurance', e.target.value);
  });
  document.getElementById('procedure').addEventListener('change', updatePriceFields);
}

function setupFormSubmit() {
  document.getElementById('patient-form').addEventListener('submit', e => {
    e.preventDefault();
    const log = {
      visitDate: document.getElementById('visit-date').value,
      patientName: document.getElementById('patient-name').value,
      fileNumber: document.getElementById('file-number').value,
      patientType: document.getElementById('patient-type').value,
      insuranceCompany: document.getElementById('patient-type').value === 'insurance' ? document.getElementById('insurance-company').value : '',
      procedure: document.getElementById('procedure').value,
      price: Number(document.getElementById('price').value),
      discount: Number(document.getElementById('discount').value) || 0,
      finalAmount: Number(document.getElementById('final-amount').value),
      notes: document.getElementById('notes').value
    };
    patientLogs.push(log);
    localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
    renderLogs();
    renderAnalytics();
    e.target.reset();
    updatePriceFields();
  });
}

function renderLogs() {
  const tbody = document.querySelector('#logs-table tbody');
  tbody.innerHTML = '';
  for (const log of patientLogs) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${log.visitDate}</td>
      <td>${log.patientName}</td>
      <td>${log.fileNumber}</td>
      <td>${log.patientType}</td>
      <td>${log.insuranceCompany || '-'}</td>
      <td>${log.procedure}</td>
      <td>${log.price}</td>
      <td>${log.discount || '-'}</td>
      <td>${log.finalAmount}</td>
      <td>${log.notes || '-'}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderAnalytics() {
  document.getElementById('total-patients').textContent = patientLogs.length;
  document.getElementById('cash-patients').textContent = patientLogs.filter(l => l.patientType === 'cash').length;
  document.getElementById('insurance-patients').textContent = patientLogs.filter(l => l.patientType === 'insurance').length;
  document.getElementById('total-collection').textContent = patientLogs.reduce((sum, l) => sum + (l.finalAmount || 0), 0);
}

function setupFilters() {
  // Placeholder: implement filter logic
}

async function init() {
  patientLogs = JSON.parse(localStorage.getItem('patientLogs') || '[]');
  await loadPriceLists();
  setupFormListeners();
  setupFormSubmit();
  setupFilters();
  populateProcedureDropdown('cash');
  renderLogs();
  renderAnalytics();
}

document.addEventListener('DOMContentLoaded', init);
