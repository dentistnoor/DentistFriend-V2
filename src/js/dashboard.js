// --- CONFIG ---
const CASH_PRICES_PATH = '../../data/cash/Cash.xlsx';
const INSURANCE_PRICES_DIR = '../../data/insurance/';

// --- GLOBAL STATE ---
let cashProcedures = [];
let insuranceCompanies = [];
let insuranceProcedures = {};
let patientLogs = [];
let filteredLogs = [];
let charts = {};
let procedureCounter = 0;
let editProcedureCounter = 0;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Initialize the app
    init();
    
    // Setup event listeners
    setupEventListeners();
});

function checkAuth() {
    const doctorInfo = localStorage.getItem('doctorInfo');
    if (!doctorInfo) {
        window.location.href = 'login.html';
        return;
    }
    
    const doctor = JSON.parse(doctorInfo);
    document.getElementById('doctor-name').textContent = doctor.name;
    document.getElementById('doctor-email').textContent = doctor.email;
}

function logout() {
    localStorage.removeItem('doctorInfo');
    window.location.href = 'login.html';
}

// --- UTILS ---
function fetchExcel(url) {
    return fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.arrayBuffer();
        })
        .then(data => XLSX.read(data, { type: 'array' }))
        .catch(error => {
            throw error;
        });
}

function findHeaderRow(rows, requiredHeaders) {
    // Look for headers in the first few rows
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const lowerRow = rows[i].map(h => (h || '').toString().toLowerCase().trim());
        console.log('Checking row', i, ':', lowerRow); // Debug log
        
        // Check if this row contains our required headers
        if (requiredHeaders.every(h => lowerRow.includes(h.toLowerCase()))) {
            console.log('Found header row at index:', i); // Debug log
            return i;
        }
    }
    console.log('No header row found, using row 0'); // Debug log
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
    
    console.log('Insurance parsing - Raw rows:', rows.slice(0, 5)); // Debug log
    
    // Look for the header row - be more flexible with header names
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (row && row.length > 0) {
            const lowerRow = row.map(h => (h || '').toString().toLowerCase().trim());
            console.log('Checking row', i, ':', lowerRow); // Debug log
            
            // Look for key columns - Description, Price, Discount, Net
            const hasDescription = lowerRow.some(h => h.includes('description'));
            const hasPrice = lowerRow.some(h => h.includes('price'));
            const hasDiscount = lowerRow.some(h => h.includes('discount') || h.includes('%'));
            const hasNet = lowerRow.some(h => h.includes('net'));
            
            if (hasDescription && hasPrice) {
                headerRowIdx = i;
                console.log('Found header row at index:', i); // Debug log
                break;
            }
        }
    }
    
    if (headerRowIdx === -1) {
        console.log('No header row found, using row 1'); // Debug log
        headerRowIdx = 1; // Assume row 1 is headers if row 0 is title
    }
    
    const header = rows[headerRowIdx].map(h => h.toString().toLowerCase().trim());
    console.log('Insurance parsing - Headers found:', header); // Debug log
    
    const descIdx = header.findIndex(h => h.includes('description'));
    const priceIdx = header.findIndex(h => h.includes('price'));
    const discIdx = header.findIndex(h => h.includes('discount') || h.includes('%'));
    const netIdx = header.findIndex(h => h.includes('net'));
    
    console.log('Insurance parsing - Column indices:', { descIdx, priceIdx, discIdx, netIdx }); // Debug log
    
    const procedures = rows.slice(headerRowIdx + 1)
        .filter(row => row && row[descIdx] && row[priceIdx])
        .map(row => ({
            procedure: (row[descIdx] || '').toString().trim(),
            price: Number(row[priceIdx]) || 0,
            discount: discIdx !== -1 ? (Number(row[discIdx]) || 0) : 0,
            finalAmount: netIdx !== -1 ? (Number(row[netIdx]) || 0) : 0
        }))
        .filter(row => row.procedure && row.price);
    
    console.log('Insurance parsing - Parsed procedures:', procedures.slice(0, 3)); // Debug log
    
    return procedures;
}

// --- DATA LOADING ---
async function loadPriceLists() {
    try {
        // Load cash procedures
        const cashWb = await fetchExcel(CASH_PRICES_PATH);
        cashProcedures = parseCashProcedures(cashWb);
    } catch (e) {
        showError('Failed to load cash price list: ' + e.message);
        cashProcedures = [];
    }

    // Load insurance companies
    try {
        const insuranceFiles = [
            'TOTAL CARE SAUDI.xlsx',
            'TAWUNIYA.xlsx',
            'SAUDI NEXTCARE.xlsx',
            'SAUDI ARABIAN INSURANCE COMPANY (SAICO).xlsx',
            'MEDGULF-MEDIVISA.xlsx',
            'GULF UNION.xlsx',
            'GLOBEMED.xlsx',
            'GIG.xlsx',
            'BUPA.xlsx',
            'AL ETIHAD.xlsx',
            'AL RAJHI.xlsx',
            'MALATH.xlsx'
        ];
        
        insuranceCompanies = insuranceFiles.map(f => {
            const displayName = f.replace(/\.xlsx$/i, '').replace(/\s+$/, '');
            return { name: displayName, file: f };
        });
        
        for (const company of insuranceCompanies) {
            try {
                const wb = await fetchExcel(INSURANCE_PRICES_DIR + company.file);
                const procedures = parseInsuranceProcedures(wb);
                insuranceProcedures[normalizeCompanyName(company.name)] = procedures;
            } catch (companyError) {
                insuranceProcedures[normalizeCompanyName(company.name)] = [];
            }
        }
    } catch (e) {
        showError('Failed to load insurance price lists: ' + e.message);
        insuranceCompanies = [];
        insuranceProcedures = {};
    }
}

function normalizeCompanyName(name) {
    return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

function formatDateToDDMMYYYY(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- UI FUNCTIONS ---
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            switchTab(tabName);
        });
    });

    // Patient form
    document.getElementById('patient-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('patient-type').addEventListener('change', handlePatientTypeChange);
    document.getElementById('insurance-company').addEventListener('change', handleInsuranceCompanyChange);
    
    // Procedures management
    document.getElementById('add-procedure-btn').addEventListener('click', addProcedureItem);
    
    // Enhanced date picker functionality
    setupDatePicker();
    
    // Sidebar toggle functionality
    setupSidebarToggle();

    // Edit form
    document.getElementById('edit-patient-form').addEventListener('submit', handleEditFormSubmit);
    document.getElementById('edit-patient-type').addEventListener('change', handleEditPatientTypeChange);
    document.getElementById('edit-insurance-company').addEventListener('change', handleEditInsuranceCompanyChange);
    
    // Edit procedures management
    document.getElementById('edit-add-procedure-btn').addEventListener('click', () => addEditProcedureItem());

    // Search functionality
    document.getElementById('search-patients').addEventListener('input', handleSearch);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterPatients(btn.dataset.filter);
        });
    });
    
    // Analytics date range controls
    setupAnalyticsDateRange();
    
    // Patient records date range controls
    setupPatientsDateRange();
    
    // File upload functionality
    setupFileUploads();
    
    // Close modal when clicking outside
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('edit-modal')) {
            closeEditModal();
        }
    });
}

function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Load content based on tab
    if (tabName === 'patients') {
        applyPatientsDateFilter(); // This will render the table with current filters
    } else if (tabName === 'analytics') {
        updateAnalytics();
    } else if (tabName === 'settings') {
        setupSettingsTab();
    }
}

// --- PROCEDURES MANAGEMENT ---
function addProcedureItem() {
    procedureCounter++;
    const proceduresList = document.getElementById('procedures-list');
    const patientType = document.getElementById('patient-type').value;
    
    if (!patientType) {
        showError('Please select patient type first');
        return;
    }
    
    const procedureItem = document.createElement('div');
    procedureItem.className = 'procedure-item';
    procedureItem.dataset.procedureId = procedureCounter;
    
    procedureItem.innerHTML = `
        <div class="procedure-item-header">
            <span class="procedure-number">Procedure ${procedureCounter}</span>
        </div>
        <button type="button" class="remove-procedure-btn" onclick="removeProcedureItem(${procedureCounter})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <div class="procedure-fields">
            <div class="form-group">
                <label for="procedure-${procedureCounter}">Procedure</label>
                <select id="procedure-${procedureCounter}" name="procedure-${procedureCounter}" required onchange="updateProcedureFields(${procedureCounter})">
                    <option value="">Select procedure</option>
                </select>
            </div>
            <div class="form-group">
                <label for="price-${procedureCounter}">Price (SAR)</label>
                <input type="number" id="price-${procedureCounter}" name="price-${procedureCounter}" step="any" readonly>
            </div>
            <div class="form-group">
                <label for="discount-${procedureCounter}">Discount (%)</label>
                <input type="number" id="discount-${procedureCounter}" name="discount-${procedureCounter}" 
                       step="any" min="0" max="100" onchange="calculateProcedureAmount(${procedureCounter})" 
                       ${patientType === 'insurance' ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label for="final-amount-${procedureCounter}">Final Amount (SAR)</label>
                <input type="number" id="final-amount-${procedureCounter}" name="final-amount-${procedureCounter}" step="any" readonly>
            </div>
        </div>
    `;
    
    proceduresList.appendChild(procedureItem);
    populateProcedureDropdown(patientType, document.getElementById('insurance-company').value, procedureCounter);
    updateTotalAmount();
}

function removeProcedureItem(procedureId) {
    const procedureItem = document.querySelector(`[data-procedure-id="${procedureId}"]`);
    if (procedureItem) {
        procedureItem.remove();
        updateTotalAmount();
        
        // Renumber remaining procedures
        const remainingProcedures = document.querySelectorAll('.procedure-item');
        remainingProcedures.forEach((item, index) => {
            const newNumber = index + 1;
            const numberSpan = item.querySelector('.procedure-number');
            if (numberSpan) {
                numberSpan.textContent = `Procedure ${newNumber}`;
            }
        });
    }
}

function addEditProcedureItem() {
    editProcedureCounter++;
    const proceduresList = document.getElementById('edit-procedures-list');
    const patientType = document.getElementById('edit-patient-type').value;
    
    if (!patientType) {
        showError('Please select patient type first');
        return;
    }
    
    const procedureItem = document.createElement('div');
    procedureItem.className = 'procedure-item';
    procedureItem.dataset.procedureId = editProcedureCounter;
    
    procedureItem.innerHTML = `
        <div class="procedure-item-header">
            <span class="procedure-number">Procedure ${editProcedureCounter}</span>
        </div>
        <button type="button" class="remove-procedure-btn" onclick="removeEditProcedureItem(${editProcedureCounter})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <div class="procedure-fields">
            <div class="form-group">
                <label for="edit-procedure-${editProcedureCounter}">Procedure</label>
                <select id="edit-procedure-${editProcedureCounter}" name="edit-procedure-${editProcedureCounter}" required onchange="updateEditProcedureFields(${editProcedureCounter})">
                    <option value="">Select procedure</option>
                </select>
            </div>
            <div class="form-group">
                <label for="edit-price-${editProcedureCounter}">Price (SAR)</label>
                <input type="number" id="edit-price-${editProcedureCounter}" name="edit-price-${editProcedureCounter}" step="any" readonly>
            </div>
            <div class="form-group">
                <label for="edit-discount-${editProcedureCounter}">Discount (%)</label>
                <input type="number" id="edit-discount-${editProcedureCounter}" name="edit-discount-${editProcedureCounter}" 
                       step="any" min="0" max="100" onchange="calculateEditProcedureAmount(${editProcedureCounter})"
                       ${patientType === 'insurance' ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label for="edit-final-amount-${editProcedureCounter}">Final Amount (SAR)</label>
                <input type="number" id="edit-final-amount-${editProcedureCounter}" name="edit-final-amount-${editProcedureCounter}" step="any" readonly>
            </div>
        </div>
    `;
    
    proceduresList.appendChild(procedureItem);
    populateEditProcedureDropdown(patientType, document.getElementById('edit-insurance-company').value, editProcedureCounter);
    updateEditTotalAmount();
}

function removeEditProcedureItem(procedureId) {
    const procedureItem = document.querySelector(`#edit-procedures-list [data-procedure-id="${procedureId}"]`);
    if (procedureItem) {
        procedureItem.remove();
        updateEditTotalAmount();
        
        // Renumber remaining procedures
        const remainingProcedures = document.querySelectorAll('#edit-procedures-list .procedure-item');
        remainingProcedures.forEach((item, index) => {
            const newNumber = index + 1;
            const numberSpan = item.querySelector('.procedure-number');
            if (numberSpan) {
                numberSpan.textContent = `Procedure ${newNumber}`;
            }
        });
    }
}

function updateProcedureFields(procedureId) {
    const type = document.getElementById('patient-type').value;
    const procedure = document.getElementById(`procedure-${procedureId}`).value;
    
    let price = '';
    let discount = '';
    let finalAmount = '';
    
    if (procedure && type === 'cash') {
        const proc = cashProcedures.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    } else if (procedure && type === 'insurance') {
        const company = document.getElementById('insurance-company').value;
        const normName = normalizeCompanyName(company);
        const proc = insuranceProcedures[normName]?.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = proc ? proc.discount : '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    }
    
    document.getElementById(`price-${procedureId}`).value = price !== undefined && price !== null ? price : '';
    document.getElementById(`discount-${procedureId}`).value = discount !== undefined && discount !== null ? discount : '';
    document.getElementById(`final-amount-${procedureId}`).value = (finalAmount !== undefined && finalAmount !== null && !isNaN(finalAmount)) ? String(finalAmount) : '';
    
    if (type === 'cash') {
        calculateProcedureAmount(procedureId);
    }
    
    updateTotalAmount();
}

function updateEditProcedureFields(procedureId) {
    const type = document.getElementById('edit-patient-type').value;
    const procedure = document.getElementById(`edit-procedure-${procedureId}`).value;
    
    let price = '';
    let discount = '';
    let finalAmount = '';
    
    if (procedure && type === 'cash') {
        const proc = cashProcedures.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    } else if (procedure && type === 'insurance') {
        const company = document.getElementById('edit-insurance-company').value;
        const normName = normalizeCompanyName(company);
        const proc = insuranceProcedures[normName]?.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = proc ? proc.discount : '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    }
    
    document.getElementById(`edit-price-${procedureId}`).value = price !== undefined && price !== null ? price : '';
    document.getElementById(`edit-discount-${procedureId}`).value = discount !== undefined && discount !== null ? discount : '';
    document.getElementById(`edit-final-amount-${procedureId}`).value = (finalAmount !== undefined && finalAmount !== null && !isNaN(finalAmount)) ? String(finalAmount) : '';
    
    if (type === 'cash') {
        calculateEditProcedureAmount(procedureId);
    }
    
    updateEditTotalAmount();
}

function calculateProcedureAmount(procedureId) {
    const type = document.getElementById('patient-type').value;
    
    if (type === 'cash') {
        const priceField = document.getElementById(`price-${procedureId}`);
        const discountField = document.getElementById(`discount-${procedureId}`);
        const finalAmountField = document.getElementById(`final-amount-${procedureId}`);
        
        const price = parseFloat(priceField.value) || 0;
        const discount = parseFloat(discountField.value) || 0;
        
        if (price > 0) {
            const discountAmount = (price * discount) / 100;
            const finalAmount = price - discountAmount;
            finalAmountField.value = finalAmount.toFixed(2);
        } else {
            finalAmountField.value = '';
        }
    }
    
    updateTotalAmount();
}

function calculateEditProcedureAmount(procedureId) {
    const type = document.getElementById('edit-patient-type').value;
    
    if (type === 'cash') {
        const priceField = document.getElementById(`edit-price-${procedureId}`);
        const discountField = document.getElementById(`edit-discount-${procedureId}`);
        const finalAmountField = document.getElementById(`edit-final-amount-${procedureId}`);
        
        const price = parseFloat(priceField.value) || 0;
        const discount = parseFloat(discountField.value) || 0;
        
        if (price > 0) {
            const discountAmount = (price * discount) / 100;
            const finalAmount = price - discountAmount;
            finalAmountField.value = finalAmount.toFixed(2);
        } else {
            finalAmountField.value = '';
        }
    }
    
    updateEditTotalAmount();
}

function updateTotalAmount() {
    const procedureItems = document.querySelectorAll('#procedures-list .procedure-item');
    let total = 0;
    
    procedureItems.forEach(item => {
        const procedureId = item.dataset.procedureId;
        const finalAmountField = document.getElementById(`final-amount-${procedureId}`);
        const amount = parseFloat(finalAmountField.value) || 0;
        total += amount;
    });
    
    document.getElementById('total-amount').value = total.toFixed(2);
}

function updateEditTotalAmount() {
    const procedureItems = document.querySelectorAll('#edit-procedures-list .procedure-item');
    let total = 0;
    
    procedureItems.forEach(item => {
        const procedureId = item.dataset.procedureId;
        const finalAmountField = document.getElementById(`edit-final-amount-${procedureId}`);
        const amount = parseFloat(finalAmountField.value) || 0;
        total += amount;
    });
    
    document.getElementById('edit-total-amount').value = total.toFixed(2);
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const procedureItems = document.querySelectorAll('#procedures-list .procedure-item');
    
    if (procedureItems.length === 0) {
        showError('Please add at least one procedure');
        return;
    }
    
    const procedures = [];
    procedureItems.forEach(item => {
        const procedureId = item.dataset.procedureId;
        const procedure = document.getElementById(`procedure-${procedureId}`).value;
        const price = parseFloat(document.getElementById(`price-${procedureId}`).value) || 0;
        const discount = parseFloat(document.getElementById(`discount-${procedureId}`).value) || 0;
        const finalAmount = parseFloat(document.getElementById(`final-amount-${procedureId}`).value) || 0;
        
        if (procedure && price > 0) {
            procedures.push({
                procedure,
                price,
                discount,
                finalAmount
            });
        }
    });
    
    if (procedures.length === 0) {
        showError('Please complete at least one procedure with valid details');
        return;
    }
    
    const log = {
        id: Date.now(),
        visitDate: formData.get('visit-date'),
        patientName: formData.get('patient-name'),
        fileNumber: formData.get('file-number'),
        age: Number(formData.get('patient-age')),
        gender: formData.get('patient-gender'),
        patientType: formData.get('patient-type'),
        insuranceCompany: formData.get('patient-type') === 'insurance' ? formData.get('insurance-company') : '',
        procedures: procedures,
        totalAmount: parseFloat(document.getElementById('total-amount').value) || 0,
        remarks: formData.get('remarks') || ''
    };
    
    patientLogs.push(log);
    localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
    
    showSuccess('Patient record added successfully!');
    e.target.reset();
    
    // Reset form state
    document.getElementById('insurance-company-row').style.display = 'none';
    clearAllProcedures();
    
    // Auto-refresh after adding patient
    autoRefreshPatientRecords();
}

function handlePatientTypeChange(e) {
    const type = e.target.value;
    
    if (type === 'insurance') {
        document.getElementById('insurance-company-row').style.display = 'block';
        populateInsuranceDropdown();
        clearAllProcedures();
    } else if (type === 'cash') {
        document.getElementById('insurance-company-row').style.display = 'none';
        clearAllProcedures();
    } else {
        // No patient type selected - clear everything
        document.getElementById('insurance-company-row').style.display = 'none';
        clearAllProcedures();
    }
}

function handleInsuranceCompanyChange(e) {
    // Update all existing procedure dropdowns with the new insurance company
    const procedureItems = document.querySelectorAll('#procedures-list .procedure-item');
    procedureItems.forEach(item => {
        const procedureId = item.dataset.procedureId;
        populateProcedureDropdown('insurance', e.target.value, procedureId);
    });
}

function clearAllProcedures() {
    document.getElementById('procedures-list').innerHTML = '';
    document.getElementById('total-amount').value = '0';
    procedureCounter = 0;
}

function handleSearch(e) {
    // Apply date filter first, then search
    applyPatientsDateFilter();
}

function filterPatients(filter) {
    // Apply date filter first, then type filter
    applyPatientsDateFilter();
}

function autoRefreshPatientRecords() {
    // Reload patient logs from localStorage
    patientLogs = JSON.parse(localStorage.getItem('patientLogs') || '[]');
    
    // Reset search and filters
    document.getElementById('search-patients').value = '';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-filter="all"]').classList.add('active');
    
    // Reset date filter
    clearPatientsDateFilter();
    
    // Update stats
    updateStats();
    
    // Update analytics if on analytics tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'analytics') {
        updateAnalytics();
    }
    
    // No success message for auto-refresh (operation already shows its own message)
}

// --- DROPDOWN POPULATION ---
function populateInsuranceDropdown() {
    const select = document.getElementById('insurance-company');
    select.innerHTML = '<option value="">Select insurance company</option>';
    
    insuranceCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

function populateProcedureDropdown(type, companyName, procedureId) {
    const select = document.getElementById(`procedure-${procedureId}`);
    if (!select) return;
    
    select.innerHTML = '<option value="">Select procedure</option>';
    
    let procedures = [];
    if (type === 'cash') {
        procedures = cashProcedures;
        console.log('Cash procedures:', procedures.length);
    } else if (type === 'insurance' && companyName) {
        const normName = normalizeCompanyName(companyName);
        procedures = insuranceProcedures[normName] || [];
        console.log('Insurance procedures for', companyName, '(normalized:', normName, '):', procedures.length);
        console.log('Available insurance keys:', Object.keys(insuranceProcedures));
        console.log('Sample procedures:', procedures.slice(0, 3));
    }
    
    procedures.forEach(proc => {
        const option = document.createElement('option');
        option.value = proc.procedure;
        option.textContent = proc.procedure;
        select.appendChild(option);
    });
    
    console.log('Populated procedure dropdown with', procedures.length, 'procedures');
}

function populateEditProcedureDropdown(type, companyName, procedureId) {
    const select = document.getElementById(`edit-procedure-${procedureId}`);
    if (!select) return;
    
    select.innerHTML = '<option value="">Select procedure</option>';
    
    let procedures = [];
    if (type === 'cash') {
        procedures = cashProcedures;
    } else if (type === 'insurance' && companyName) {
        const normName = normalizeCompanyName(companyName);
        procedures = insuranceProcedures[normName] || [];
    }
    
    procedures.forEach(proc => {
        const option = document.createElement('option');
        option.value = proc.procedure;
        option.textContent = proc.procedure;
        select.appendChild(option);
    });
}

// Legacy functions removed - now using multiple procedures system

function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    // Check if mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Load saved sidebar state (only for desktop)
    if (!isMobile()) {
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        }
    }
    
    // Toggle sidebar on button click
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Close sidebar when clicking overlay (mobile)
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    function toggleSidebar() {
        if (isMobile()) {
            toggleMobileSidebar();
        } else {
            toggleDesktopSidebar();
        }
    }
    
    function toggleMobileSidebar() {
        const isOpen = sidebar.classList.contains('mobile-open');
        
        if (isOpen) {
            closeMobileSidebar();
        } else {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('show');
        }
    }
    
    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('show');
    }
    
    function toggleDesktopSidebar() {
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', 'false');
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', 'true');
        }
    }
    
    function handleResize() {
        // Close mobile sidebar when switching to desktop
        if (!isMobile()) {
            closeMobileSidebar();
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            
            // Reapply saved state for desktop
            const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('sidebar-collapsed');
            }
        } else {
            // On mobile, remove desktop classes
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    }
}

function setupDatePicker() {
    const trigger = document.getElementById('date-picker-trigger');
    const dropdown = document.getElementById('calendar-dropdown');
    const hiddenInput = document.getElementById('visit-date');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const calendarTitle = document.getElementById('calendar-title');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonth = document.getElementById('prev-month');
    const nextMonth = document.getElementById('next-month');
    
    let currentDate = new Date();
    let selectedDate = new Date(); // Default to today
    let isOpen = false;
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Initialize with today's date
    updateSelectedDate(selectedDate);
    
    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Keyboard support
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-date-picker')) {
            closeDropdown();
        }
    });
    
    // Navigation
    prevMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    function toggleDropdown() {
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
    
    function openDropdown() {
        isOpen = true;
        dropdown.classList.add('show');
        trigger.setAttribute('aria-expanded', 'true');
        currentDate = new Date(selectedDate);
        renderCalendar();
    }
    
    function closeDropdown() {
        isOpen = false;
        dropdown.classList.remove('show');
        trigger.setAttribute('aria-expanded', 'false');
    }
    
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        calendarTitle.textContent = `${months[month]} ${year}`;
        
        // Clear previous days
        calendarDays.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Previous month's trailing days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dayEl = createDayElement(day, 'other-month');
            calendarDays.appendChild(dayEl);
        }
        
        // Current month days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEl = createDayElement(day);
            
            // Mark today
            if (date.toDateString() === today.toDateString()) {
                dayEl.classList.add('today');
            }
            
            // Mark selected
            if (date.toDateString() === selectedDate.toDateString()) {
                dayEl.classList.add('selected');
            }
            
            // Disable future dates
            if (date > today) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.addEventListener('click', () => selectDate(date));
            }
            
            calendarDays.appendChild(dayEl);
        }
        
        // Next month's leading days
        const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const dayEl = createDayElement(day, 'other-month');
            calendarDays.appendChild(dayEl);
        }
    }
    
    function createDayElement(day, className = '') {
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${className}`;
        dayEl.textContent = day;
        return dayEl;
    }
    
    function selectDate(date) {
        selectedDate = new Date(date);
        updateSelectedDate(selectedDate);
        closeDropdown();
    }
    
    function updateSelectedDate(date) {
        const options = { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        };
        selectedDateDisplay.textContent = date.toLocaleDateString('en-US', options);
        hiddenInput.value = date.toISOString().split('T')[0];
    }
}

// --- RENDERING ---
function updateStats() {
    const totalPatients = patientLogs.length;
    const cashPatients = patientLogs.filter(log => log.patientType === 'cash').length;
    const insurancePatients = patientLogs.filter(log => log.patientType === 'insurance').length;
    
    // Handle both new and old data formats
    const totalCollection = patientLogs.reduce((sum, log) => {
        if (log.procedures && Array.isArray(log.procedures)) {
            return sum + (log.totalAmount || log.procedures.reduce((procSum, proc) => procSum + (proc.finalAmount || 0), 0));
        } else {
            return sum + (log.finalAmount || 0);
        }
    }, 0);
    
    document.getElementById('total-patients').textContent = totalPatients;
    document.getElementById('cash-patients').textContent = cashPatients;
    document.getElementById('insurance-patients').textContent = insurancePatients;
    document.getElementById('total-collection').textContent = `SAR ${totalCollection.toFixed(2)}`;
}

function renderPatientTable() {
    const tbody = document.querySelector('#patients-table tbody');
    tbody.innerHTML = '';
    
    const logsToShow = filteredLogs.length > 0 ? filteredLogs : patientLogs;
    
    logsToShow.forEach(log => {
        const row = document.createElement('tr');
        
        // Handle age display consistently
        const ageDisplay = (log.age && log.age > 0) ? log.age : 'N/A';
        
        // Handle gender display consistently
        const genderClass = log.gender ? log.gender.toLowerCase() : 'unknown';
        const genderText = log.gender ? log.gender.charAt(0).toUpperCase() + log.gender.slice(1) : 'N/A';
        
        // Handle procedures display (support both old and new format)
        let proceduresDisplay = '';
        let totalAmount = 0;
        
        if (log.procedures && Array.isArray(log.procedures)) {
            // New format with multiple procedures - list all procedures with commas and line breaks
            proceduresDisplay = log.procedures.map((proc, index) => {
                if (index === log.procedures.length - 1) {
                    // Last procedure - no comma
                    return proc.procedure;
                } else {
                    // Not last procedure - add comma and line break
                    return proc.procedure + ',';
                }
            }).join('<br>');
            totalAmount = log.totalAmount || log.procedures.reduce((sum, proc) => sum + (proc.finalAmount || 0), 0);
        } else {
            // Old format with single procedure (for backward compatibility)
            proceduresDisplay = log.procedure || '-';
            totalAmount = log.finalAmount || 0;
        }
        
        row.innerHTML = `
            <td>${formatDateToDDMMYYYY(log.visitDate)}</td>
            <td>${log.patientName}</td>
            <td>${log.fileNumber}</td>
            <td>${ageDisplay}</td>
            <td><span class="badge ${genderClass}">${genderText}</span></td>
            <td><span class="badge ${log.patientType}">${log.patientType}</span></td>
            <td>${log.insuranceCompany || '-'}</td>
            <td title="${getProceduresTooltip(log)}">${proceduresDisplay}</td>
            <td>SAR ${totalAmount.toFixed(2)}</td>
            <td class="remarks-cell" title="${log.remarks || ''}">${log.remarks ? (log.remarks.length > 50 ? log.remarks.substring(0, 50) + '...' : log.remarks) : '-'}</td>
            <td>
                <button class="action-btn edit" onclick="editPatient(${log.id})" title="Edit Patient">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="action-btn delete" onclick="deletePatient(${log.id})" title="Delete Patient">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getProceduresTooltip(log) {
    if (log.procedures && Array.isArray(log.procedures)) {
        return log.procedures.map(proc => `${proc.procedure} - SAR ${proc.finalAmount.toFixed(2)}`).join('\n');
    } else {
        return log.procedure || '';
    }
}

function deletePatient(id) {
    if (confirm('Are you sure you want to delete this patient record?')) {
        patientLogs = patientLogs.filter(log => log.id !== id);
        localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
        showSuccess('Patient record deleted successfully!');
        
        // Auto-refresh after deleting patient
        autoRefreshPatientRecords();
    }
}

// --- EDIT PATIENT FUNCTIONALITY ---
function editPatient(id) {
    const patient = patientLogs.find(log => log.id === id);
    if (!patient) {
        showError('Patient record not found!');
        return;
    }
    
    // Reset edit counters and clear existing procedures
    editProcedureCounter = 0;
    document.getElementById('edit-procedures-list').innerHTML = '';
    
    // Populate the edit form
    document.getElementById('edit-patient-id').value = patient.id;
    document.getElementById('edit-visit-date').value = patient.visitDate;
    document.getElementById('edit-patient-name').value = patient.patientName;
    document.getElementById('edit-file-number').value = patient.fileNumber;
    document.getElementById('edit-patient-age').value = patient.age || '';
    document.getElementById('edit-patient-gender').value = patient.gender || '';
    document.getElementById('edit-patient-type').value = patient.patientType;
    document.getElementById('edit-remarks').value = patient.remarks || '';
    
    // Handle patient type specific fields
    if (patient.patientType === 'insurance') {
        document.getElementById('edit-insurance-company-row').style.display = 'block';
        populateEditInsuranceDropdown();
        document.getElementById('edit-insurance-company').value = patient.insuranceCompany;
    } else {
        document.getElementById('edit-insurance-company-row').style.display = 'none';
    }
    
    // Handle procedures (support both old and new format)
    if (patient.procedures && Array.isArray(patient.procedures)) {
        // New format with multiple procedures
        patient.procedures.forEach(proc => {
            addEditProcedureItem();
            const currentId = editProcedureCounter;
            
            setTimeout(() => {
                const select = document.getElementById(`edit-procedure-${currentId}`);
                if (select) {
                    select.value = proc.procedure;
                    updateEditProcedureFields(currentId);
                    
                    // Override with actual values from the saved data
                    document.getElementById(`edit-price-${currentId}`).value = proc.price;
                    document.getElementById(`edit-discount-${currentId}`).value = proc.discount || '';
                    document.getElementById(`edit-final-amount-${currentId}`).value = proc.finalAmount;
                }
            }, 100);
        });
    } else {
        // Old format with single procedure - convert to new format
        addEditProcedureItem();
        const currentId = editProcedureCounter;
        
        setTimeout(() => {
            const select = document.getElementById(`edit-procedure-${currentId}`);
            if (select) {
                select.value = patient.procedure;
                updateEditProcedureFields(currentId);
                
                // Override with actual values from the saved data
                document.getElementById(`edit-price-${currentId}`).value = patient.price;
                document.getElementById(`edit-discount-${currentId}`).value = patient.discount || '';
                document.getElementById(`edit-final-amount-${currentId}`).value = patient.finalAmount;
            }
        }, 100);
    }
    
    // Update total amount
    setTimeout(() => {
        updateEditTotalAmount();
    }, 200);
    
    // Show the modal
    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

function populateEditInsuranceDropdown() {
    const select = document.getElementById('edit-insurance-company');
    select.innerHTML = '<option value="">Select insurance company</option>';
    
    insuranceCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

function populateSettingsInsuranceDropdown() {
    const select = document.getElementById('insurance-select');
    const currentValue = select.value;
    
    // Save all existing predefined options
    const predefinedCompanies = [
        'AL ETIHAD', 'AL RAJHI', 'BUPA', 'GIG', 'GLOBEMED', 'GULF UNION',
        'MALATH', 'MEDGULF-MEDIVISA', 'SAUDI ARABIAN INSURANCE COMPANY (SAICO)',
        'SAUDI NEXTCARE', 'TAWUNIYA', 'TOTAL CARE SAUDI'
    ];
    
    // Clear and rebuild
    select.innerHTML = '<option value="">Choose insurance company...</option>';
    
    // Add predefined companies
    predefinedCompanies.forEach(companyName => {
        const option = document.createElement('option');
        option.value = companyName;
        option.textContent = companyName;
        select.appendChild(option);
    });
    
    // Add custom companies that aren't in predefined list
    const customCompanies = insuranceCompanies.filter(company => 
        !predefinedCompanies.includes(company.name)
    );
    
    if (customCompanies.length > 0) {
        // Add separator if there are custom companies
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '--- Custom Companies ---';
        select.appendChild(separator);
        
        customCompanies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.name;
            option.textContent = company.name;
            select.appendChild(option);
        });
    }
    
    // Add "Add New" option
    const addNewOption = document.createElement('option');
    addNewOption.value = '__ADD_NEW__';
    addNewOption.textContent = '➕ Add New Insurance Company';
    select.appendChild(addNewOption);
    
    // Restore selection if valid
    if (currentValue && currentValue !== '__ADD_NEW__') {
        select.value = currentValue;
    }
}

function populateEditProcedureDropdown(type, companyName) {
    const select = document.getElementById('edit-procedure');
    select.innerHTML = '<option value="">Select procedure</option>';
    
    let procedures = [];
    if (type === 'cash') {
        procedures = cashProcedures;
    } else if (type === 'insurance' && companyName) {
        const normName = normalizeCompanyName(companyName);
        procedures = insuranceProcedures[normName] || [];
    }
    
    procedures.forEach(proc => {
        const option = document.createElement('option');
        option.value = proc.procedure;
        option.textContent = proc.procedure;
        select.appendChild(option);
    });
}

function updateEditPriceFields() {
    const type = document.getElementById('edit-patient-type').value;
    const procedure = document.getElementById('edit-procedure').value;
    
    let price = '';
    let discount = '';
    let finalAmount = '';
    
    // Only populate price fields if a procedure is actually selected
    if (procedure && type === 'cash') {
        const proc = cashProcedures.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    } else if (procedure && type === 'insurance') {
        const company = document.getElementById('edit-insurance-company').value;
        const normName = normalizeCompanyName(company);
        const proc = insuranceProcedures[normName]?.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = proc ? proc.discount : '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    }
    
    document.getElementById('edit-price').value = price !== undefined && price !== null ? price : '';
    document.getElementById('edit-discount').value = discount !== undefined && discount !== null ? discount : '';
    document.getElementById('edit-final-amount').value = (finalAmount !== undefined && finalAmount !== null && !isNaN(finalAmount)) ? String(finalAmount) : '';
}

function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const patientId = parseInt(formData.get('patient-id'));
    
    // Find the patient to update
    const patientIndex = patientLogs.findIndex(log => log.id === patientId);
    if (patientIndex === -1) {
        showError('Patient record not found!');
        return;
    }
    
    const procedureItems = document.querySelectorAll('#edit-procedures-list .procedure-item');
    
    if (procedureItems.length === 0) {
        showError('Please add at least one procedure');
        return;
    }
    
    const procedures = [];
    procedureItems.forEach(item => {
        const procedureId = item.dataset.procedureId;
        const procedure = document.getElementById(`edit-procedure-${procedureId}`).value;
        const price = parseFloat(document.getElementById(`edit-price-${procedureId}`).value) || 0;
        const discount = parseFloat(document.getElementById(`edit-discount-${procedureId}`).value) || 0;
        const finalAmount = parseFloat(document.getElementById(`edit-final-amount-${procedureId}`).value) || 0;
        
        if (procedure && price > 0) {
            procedures.push({
                procedure,
                price,
                discount,
                finalAmount
            });
        }
    });
    
    if (procedures.length === 0) {
        showError('Please complete at least one procedure with valid details');
        return;
    }
    
    // Update the patient record
    patientLogs[patientIndex] = {
        id: patientId,
        visitDate: formData.get('visit-date'),
        patientName: formData.get('patient-name'),
        fileNumber: formData.get('file-number'),
        age: Number(formData.get('patient-age')),
        gender: formData.get('patient-gender'),
        patientType: formData.get('patient-type'),
        insuranceCompany: formData.get('patient-type') === 'insurance' ? formData.get('insurance-company') : '',
        procedures: procedures,
        totalAmount: parseFloat(document.getElementById('edit-total-amount').value) || 0,
        remarks: formData.get('remarks') || ''
    };
    
    localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
    
    showSuccess('Patient record updated successfully!');
    closeEditModal();
    
    // Auto-refresh after editing patient
    autoRefreshPatientRecords();
}

function handleEditPatientTypeChange(e) {
    const type = e.target.value;
    if (type === 'insurance') {
        document.getElementById('edit-insurance-company-row').style.display = 'block';
        populateEditInsuranceDropdown();
        clearAllEditProcedures();
    } else if (type === 'cash') {
        document.getElementById('edit-insurance-company-row').style.display = 'none';
        clearAllEditProcedures();
    } else {
        document.getElementById('edit-insurance-company-row').style.display = 'none';
        clearAllEditProcedures();
    }
}

function handleEditInsuranceCompanyChange(e) {
    // Update all existing procedure dropdowns with the new insurance company
    const procedureItems = document.querySelectorAll('#edit-procedures-list .procedure-item');
    procedureItems.forEach(item => {
        const procedureId = item.dataset.procedureId;
        populateEditProcedureDropdown('insurance', e.target.value, procedureId);
    });
}

function clearAllEditProcedures() {
    document.getElementById('edit-procedures-list').innerHTML = '';
    document.getElementById('edit-total-amount').value = '0';
    editProcedureCounter = 0;
}

// --- ANALYTICS DATE RANGE ---
let analyticsDateRange = {
    from: null,
    to: null,
    preset: 'all'
};

// --- PATIENTS DATE RANGE ---
let patientsDateRange = {
    from: null,
    to: null,
    preset: 'all'
};

function setupAnalyticsDateRange() {
    const fromDateInput = document.getElementById('analytics-from-date');
    const toDateInput = document.getElementById('analytics-to-date');
    const presetButtons = document.querySelectorAll('.date-preset-btn');
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Initialize date inputs
    fromDateInput.value = getEarliestPatientDate() || thirtyDaysAgo.toISOString().split('T')[0];
    toDateInput.value = today.toISOString().split('T')[0];
    
    // Set initial range
    analyticsDateRange.from = new Date(fromDateInput.value);
    analyticsDateRange.to = new Date(toDateInput.value);
    
    // Event listeners for manual date inputs
    fromDateInput.addEventListener('change', updateAnalyticsFromDate);
    toDateInput.addEventListener('change', updateAnalyticsToDate);
    
    // Event listeners for preset buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setDateRangePreset(btn.dataset.range);
        });
    });
    
    // Initial load with "All Time" preset
    setDateRangePreset('all');
}

function getEarliestPatientDate() {
    if (patientLogs.length === 0) return null;
    
    const dates = patientLogs.map(log => new Date(log.visitDate));
    const earliest = new Date(Math.min(...dates));
    return earliest.toISOString().split('T')[0];
}

function updateAnalyticsFromDate() {
    const fromDate = document.getElementById('analytics-from-date').value;
    if (fromDate) {
        analyticsDateRange.from = new Date(fromDate);
        analyticsDateRange.preset = 'custom';
        clearPresetButtons();
        updateAnalytics();
    }
}

function updateAnalyticsToDate() {
    const toDate = document.getElementById('analytics-to-date').value;
    if (toDate) {
        analyticsDateRange.to = new Date(toDate);
        analyticsDateRange.preset = 'custom';
        clearPresetButtons();
        updateAnalytics();
    }
}

function setDateRangePreset(range) {
    const today = new Date();
    const fromDateInput = document.getElementById('analytics-from-date');
    const toDateInput = document.getElementById('analytics-to-date');
    
    analyticsDateRange.preset = range;
    
    switch (range) {
        case 'all':
            const earliestDate = getEarliestPatientDate();
            analyticsDateRange.from = earliestDate ? new Date(earliestDate) : new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
            analyticsDateRange.to = today;
            break;
        case '7':
            analyticsDateRange.from = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
            analyticsDateRange.to = today;
            break;
        case '30':
            analyticsDateRange.from = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
            analyticsDateRange.to = today;
            break;
        case '90':
            analyticsDateRange.from = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
            analyticsDateRange.to = today;
            break;
        case '365':
            analyticsDateRange.from = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
            analyticsDateRange.to = today;
            break;
    }
    
    // Update input fields
    fromDateInput.value = analyticsDateRange.from.toISOString().split('T')[0];
    toDateInput.value = analyticsDateRange.to.toISOString().split('T')[0];
    
    updateAnalytics();
}

function clearPresetButtons() {
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function getFilteredPatientLogs() {
    if (!analyticsDateRange.from || !analyticsDateRange.to) {
        return patientLogs;
    }
    
    return patientLogs.filter(log => {
        const logDate = new Date(log.visitDate);
        return logDate >= analyticsDateRange.from && logDate <= analyticsDateRange.to;
    });
}

function updateAnalytics() {
    updateAnalyticsSummary();
    renderCharts();
}

function updateAnalyticsSummary() {
    const filteredLogs = getFilteredPatientLogs();
    
    const totalPatients = filteredLogs.length;
    
    // Handle both new and old data formats
    const totalRevenue = filteredLogs.reduce((sum, log) => {
        if (log.procedures && Array.isArray(log.procedures)) {
            return sum + (log.totalAmount || log.procedures.reduce((procSum, proc) => procSum + (proc.finalAmount || 0), 0));
        } else {
            return sum + (log.finalAmount || 0);
        }
    }, 0);
    
    const avgAmount = totalPatients > 0 ? totalRevenue / totalPatients : 0;
    
    document.getElementById('analytics-total-patients').textContent = totalPatients;
    document.getElementById('analytics-total-revenue').textContent = `SAR ${totalRevenue.toFixed(2)}`;
    document.getElementById('analytics-avg-amount').textContent = `SAR ${avgAmount.toFixed(2)}`;
}

// --- PATIENTS DATE RANGE FUNCTIONS ---
function setupPatientsDateRange() {
    const fromDateInput = document.getElementById('patients-from-date');
    const toDateInput = document.getElementById('patients-to-date');
    const presetButtons = document.querySelectorAll('.patients-preset-btn');
    const clearButton = document.getElementById('clear-patients-date');
    
    // Set default values (no filtering initially)
    const today = new Date();
    const earliest = getEarliestPatientDate();
    
    if (earliest) {
        fromDateInput.value = earliest;
        toDateInput.value = today.toISOString().split('T')[0];
    }
    
    // Event listeners for manual date inputs
    fromDateInput.addEventListener('change', updatePatientsFromDate);
    toDateInput.addEventListener('change', updatePatientsToDate);
    
    // Event listeners for preset buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setPatientsDateRangePreset(btn.dataset.range);
        });
    });
    
    // Clear button functionality
    clearButton.addEventListener('click', clearPatientsDateFilter);
    
    // Initialize with "All Dates" preset
    setPatientsDateRangePreset('all');
}

function updatePatientsFromDate() {
    const fromDate = document.getElementById('patients-from-date').value;
    if (fromDate) {
        patientsDateRange.from = new Date(fromDate);
        patientsDateRange.preset = 'custom';
        clearPatientsPresetButtons();
        applyPatientsDateFilter();
    }
}

function updatePatientsToDate() {
    const toDate = document.getElementById('patients-to-date').value;
    if (toDate) {
        patientsDateRange.to = new Date(toDate);
        patientsDateRange.preset = 'custom';
        clearPatientsPresetButtons();
        applyPatientsDateFilter();
    }
}

function setPatientsDateRangePreset(range) {
    const today = new Date();
    const fromDateInput = document.getElementById('patients-from-date');
    const toDateInput = document.getElementById('patients-to-date');
    
    patientsDateRange.preset = range;
    
    switch (range) {
        case 'all':
            patientsDateRange.from = null;
            patientsDateRange.to = null;
            fromDateInput.value = '';
            toDateInput.value = '';
            break;
        case 'today':
            patientsDateRange.from = new Date(today.setHours(0, 0, 0, 0));
            patientsDateRange.to = new Date(today.setHours(23, 59, 59, 999));
            fromDateInput.value = patientsDateRange.from.toISOString().split('T')[0];
            toDateInput.value = patientsDateRange.to.toISOString().split('T')[0];
            break;
        case '7':
            patientsDateRange.from = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
            patientsDateRange.to = today;
            fromDateInput.value = patientsDateRange.from.toISOString().split('T')[0];
            toDateInput.value = patientsDateRange.to.toISOString().split('T')[0];
            break;
        case '30':
            patientsDateRange.from = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
            patientsDateRange.to = today;
            fromDateInput.value = patientsDateRange.from.toISOString().split('T')[0];
            toDateInput.value = patientsDateRange.to.toISOString().split('T')[0];
            break;
        case '90':
            patientsDateRange.from = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
            patientsDateRange.to = today;
            fromDateInput.value = patientsDateRange.from.toISOString().split('T')[0];
            toDateInput.value = patientsDateRange.to.toISOString().split('T')[0];
            break;
    }
    
    applyPatientsDateFilter();
}

function clearPatientsPresetButtons() {
    document.querySelectorAll('.patients-preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function clearPatientsDateFilter() {
    // Reset date range
    patientsDateRange.from = null;
    patientsDateRange.to = null;
    patientsDateRange.preset = 'all';
    
    // Clear input fields
    document.getElementById('patients-from-date').value = '';
    document.getElementById('patients-to-date').value = '';
    
    // Reset preset buttons
    clearPatientsPresetButtons();
    document.querySelector('[data-range="all"]').classList.add('active');
    
    // Apply filter (which will show all records)
    applyPatientsDateFilter();
}

function getFilteredPatientLogsByDate() {
    if (!patientsDateRange.from || !patientsDateRange.to) {
        return patientLogs;
    }
    
    return patientLogs.filter(log => {
        const logDate = new Date(log.visitDate);
        // Set time to start/end of day for proper comparison
        const fromDate = new Date(patientsDateRange.from);
        const toDate = new Date(patientsDateRange.to);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        
        return logDate >= fromDate && logDate <= toDate;
    });
}

function applyPatientsDateFilter() {
    // Get date-filtered logs
    const dateFilteredLogs = getFilteredPatientLogsByDate();
    
    // Apply existing search filter if there's a search term
    const searchTerm = document.getElementById('search-patients').value.toLowerCase();
    if (searchTerm) {
        filteredLogs = dateFilteredLogs.filter(log => {
            // Check basic fields
            if (log.patientName.toLowerCase().includes(searchTerm) ||
                log.fileNumber.toLowerCase().includes(searchTerm) ||
                (log.age && log.age.toString().includes(searchTerm)) ||
                (log.gender && log.gender.toLowerCase().includes(searchTerm))) {
                return true;
            }
            
            // Check procedures (handle both new and old formats)
            if (log.procedures && Array.isArray(log.procedures)) {
                return log.procedures.some(proc => 
                    proc.procedure.toLowerCase().includes(searchTerm)
                );
            } else if (log.procedure) {
                return log.procedure.toLowerCase().includes(searchTerm);
            }
            
            return false;
        });
    } else {
        filteredLogs = [...dateFilteredLogs];
    }
    
    // Apply type filter
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const typeFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
    
    if (typeFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.patientType === typeFilter);
    }
    
    // Re-render the table
    renderPatientTable();
}

// --- CHARTS ---
function renderCharts() {
    renderPatientTypeChart();
    renderGenderChart();
    renderAgeGroupChart();
    renderRevenueChart();
    renderProcedureChart();
}

function renderPatientTypeChart() {
    const ctx = document.getElementById('patientTypeChart').getContext('2d');
    
    if (charts.patientType) {
        charts.patientType.destroy();
    }
    
    const filteredLogs = getFilteredPatientLogs();
    const cashCount = filteredLogs.filter(log => log.patientType === 'cash').length;
    const insuranceCount = filteredLogs.filter(log => log.patientType === 'insurance').length;
    
    charts.patientType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Cash', 'Insurance'],
            datasets: [{
                data: [cashCount, insuranceCount],
                backgroundColor: ['#10b981', '#2563eb'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                }
            }
        }
    });
}

function renderGenderChart() {
    const ctx = document.getElementById('genderChart').getContext('2d');
    
    if (charts.gender) {
        charts.gender.destroy();
    }
    
    const filteredLogs = getFilteredPatientLogs();
    const maleCount = filteredLogs.filter(log => log.gender === 'male').length;
    const femaleCount = filteredLogs.filter(log => log.gender === 'female').length;
    const unknownCount = filteredLogs.filter(log => !log.gender || log.gender === '').length;
    
    const data = [];
    const labels = [];
    const colors = [];
    
    if (maleCount > 0) {
        labels.push('Male');
        data.push(maleCount);
        colors.push('#3b82f6');
    }
    if (femaleCount > 0) {
        labels.push('Female');
        data.push(femaleCount);
        colors.push('#ec4899');
    }
    if (unknownCount > 0) {
        labels.push('Unknown');
        data.push(unknownCount);
        colors.push('#6b7280');
    }
    
    charts.gender = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                }
            }
        }
    });
}

function renderAgeGroupChart() {
    const ctx = document.getElementById('ageGroupChart').getContext('2d');
    
    if (charts.ageGroup) {
        charts.ageGroup.destroy();
    }
    
    const filteredLogs = getFilteredPatientLogs();
    
    // Define age groups
    const ageGroups = {
        '0-12': 0,      // Children
        '13-17': 0,     // Teenagers
        '18-29': 0,     // Young Adults
        '30-49': 0,     // Adults
        '50-64': 0,     // Middle-aged
        '65+': 0,       // Seniors
        'Unknown': 0    // No age specified
    };
    
    filteredLogs.forEach(log => {
        const age = log.age;
        if (!age || age < 0) {
            ageGroups['Unknown']++;
        } else if (age <= 12) {
            ageGroups['0-12']++;
        } else if (age <= 17) {
            ageGroups['13-17']++;
        } else if (age <= 29) {
            ageGroups['18-29']++;
        } else if (age <= 49) {
            ageGroups['30-49']++;
        } else if (age <= 64) {
            ageGroups['50-64']++;
        } else {
            ageGroups['65+']++;
        }
    });
    
    // Filter out age groups with 0 counts
    const labels = [];
    const data = [];
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#6b7280', '#9ca3af'];
    const backgroundColors = [];
    
    Object.entries(ageGroups).forEach(([label, count], index) => {
        if (count > 0) {
            labels.push(label);
            data.push(count);
            backgroundColors.push(colors[index % colors.length]);
        }
    });
    
    charts.ageGroup = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Patients',
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (charts.revenue) {
        charts.revenue.destroy();
    }
    
    const filteredLogs = getFilteredPatientLogs();
    
    // Group revenue by month
    const monthlyRevenue = {};
    filteredLogs.forEach(log => {
        const month = new Date(log.visitDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        // Handle both new and old data formats
        let amount = 0;
        if (log.procedures && Array.isArray(log.procedures)) {
            amount = log.totalAmount || log.procedures.reduce((procSum, proc) => procSum + (proc.finalAmount || 0), 0);
        } else {
            amount = log.finalAmount || 0;
        }
        
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
    });
    
    const labels = Object.keys(monthlyRevenue);
    const data = Object.values(monthlyRevenue);
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'SAR ' + value;
                        }
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

function renderProcedureChart() {
    const ctx = document.getElementById('procedureChart').getContext('2d');
    
    if (charts.procedure) {
        charts.procedure.destroy();
    }
    
    const filteredLogs = getFilteredPatientLogs();
    
    // Count procedures (handle both new and old formats)
    const procedureCount = {};
    filteredLogs.forEach(log => {
        if (log.procedures && Array.isArray(log.procedures)) {
            // New format with multiple procedures
            log.procedures.forEach(proc => {
                procedureCount[proc.procedure] = (procedureCount[proc.procedure] || 0) + 1;
            });
        } else {
            // Old format with single procedure
            if (log.procedure) {
                procedureCount[log.procedure] = (procedureCount[log.procedure] || 0) + 1;
            }
        }
    });
    
    // Get top 5 procedures
    const sortedProcedures = Object.entries(procedureCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    const labels = sortedProcedures.map(([procedure]) => procedure);
    const data = sortedProcedures.map(([,count]) => count);
    
    charts.procedure = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: '#10b981',
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// --- NOTIFICATIONS ---
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'success-message';
    notification.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>${message}</span>
    `;
    
    document.querySelector('.main-content').insertBefore(notification, document.querySelector('.main-content').firstChild);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error-message';
    notification.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>${message}</span>
    `;
    
    document.querySelector('.main-content').insertBefore(notification, document.querySelector('.main-content').firstChild);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}



// --- SETTINGS FUNCTIONS ---
function setupSettingsTab() {
    // Load current doctor info
    const doctorInfo = JSON.parse(localStorage.getItem('doctorInfo') || '{}');
    document.getElementById('settings-doctor-name').value = doctorInfo.name || '';
    document.getElementById('settings-doctor-email').value = doctorInfo.email || '';

    // Setup settings form
    document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
}

function handleSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newDoctorInfo = {
        name: formData.get('doctor-name'),
        email: formData.get('doctor-email'),
        loginTime: new Date().toISOString()
    };
    
    // Update localStorage
    localStorage.setItem('doctorInfo', JSON.stringify(newDoctorInfo));
    
    // Update header display
    document.getElementById('doctor-name').textContent = newDoctorInfo.name;
    document.getElementById('doctor-email').textContent = newDoctorInfo.email;
    
    showSuccess('Settings updated successfully!');
}

// --- MAIN INITIALIZATION ---
async function init() {
    // Load patient logs from localStorage
    patientLogs = JSON.parse(localStorage.getItem('patientLogs') || '[]');
    
    // Migrate existing patient data to include age and gender fields
    migratePatientData();
    
    // Migrate existing patient data to support multiple procedures
    migrateProcedureData();
    
    filteredLogs = [...patientLogs];
    
    // Load price lists
    await loadPriceLists();
    
    // Load uploaded procedures from localStorage
    loadUploadedProcedures();
    
    // Update settings insurance dropdown with all companies
    populateSettingsInsuranceDropdown();
    
    // Setup initial form state - clear all procedures
    clearAllProcedures();
    
    // Update stats
    updateStats();
}

// --- DATA MIGRATION ---
function migratePatientData() {
    let dataChanged = false;
    
    patientLogs = patientLogs.map(log => {
        const updatedLog = { ...log };
        
        // Add age field if missing
        if (!updatedLog.hasOwnProperty('age')) {
            updatedLog.age = null;
            dataChanged = true;
        }
        
        // Add gender field if missing
        if (!updatedLog.hasOwnProperty('gender')) {
            updatedLog.gender = null;
            dataChanged = true;
        }
        
        return updatedLog;
    });
    
    // Save updated data if changes were made
    if (dataChanged) {
        localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
        console.log('Patient data migrated to include age and gender fields');
    }
}

function migrateProcedureData() {
    let dataChanged = false;
    
    patientLogs = patientLogs.map(log => {
        const updatedLog = { ...log };
        
        // Convert old single procedure format to new multiple procedures format
        if (!updatedLog.procedures && updatedLog.procedure) {
            updatedLog.procedures = [{
                procedure: updatedLog.procedure,
                price: updatedLog.price || 0,
                discount: updatedLog.discount || 0,
                finalAmount: updatedLog.finalAmount || 0
            }];
            
            updatedLog.totalAmount = updatedLog.finalAmount || 0;
            
            // Remove old fields
            delete updatedLog.procedure;
            delete updatedLog.price;
            delete updatedLog.discount;
            delete updatedLog.finalAmount;
            
            dataChanged = true;
        }
        
        return updatedLog;
    });
    
    // Save updated data if changes were made
    if (dataChanged) {
        localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
        console.log('Patient data migrated to support multiple procedures');
    }
}
