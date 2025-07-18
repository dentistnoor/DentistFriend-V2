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
    document.getElementById('procedure').addEventListener('change', updatePriceFields);

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
        renderPatientTable();
    } else if (tabName === 'analytics') {
        renderCharts();
    } else if (tabName === 'settings') {
        setupSettingsTab();
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const log = {
        id: Date.now(),
        visitDate: formData.get('visit-date'),
        patientName: formData.get('patient-name'),
        fileNumber: formData.get('file-number'),
        patientType: formData.get('patient-type'),
        insuranceCompany: formData.get('patient-type') === 'insurance' ? formData.get('insurance-company') : '',
        procedure: formData.get('procedure'),
        price: Number(formData.get('price')),
        discount: Number(formData.get('discount')) || 0,
        finalAmount: Number(formData.get('final-amount'))
    };
    
    patientLogs.push(log);
    localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
    
    showSuccess('Patient record added successfully!');
    e.target.reset();
    updateStats();
    
    // Reset form state
    document.getElementById('insurance-company-row').style.display = 'none';
    document.getElementById('discount-row').style.display = 'none';
    clearProcedureDropdown(); // Clear procedure dropdown on reset
}

function handlePatientTypeChange(e) {
    const type = e.target.value;
    if (type === 'insurance') {
        document.getElementById('insurance-company-row').style.display = 'block';
        document.getElementById('discount-row').style.display = 'block';
        populateInsuranceDropdown();
        // Don't populate procedure dropdown until insurance company is selected
        clearProcedureDropdown();
    } else if (type === 'cash') {
        document.getElementById('insurance-company-row').style.display = 'none';
        document.getElementById('discount-row').style.display = 'none';
        populateProcedureDropdown('cash');
    } else {
        // No patient type selected - clear everything
        document.getElementById('insurance-company-row').style.display = 'none';
        document.getElementById('discount-row').style.display = 'none';
        clearProcedureDropdown();
    }
}

function handleInsuranceCompanyChange(e) {
    populateProcedureDropdown('insurance', e.target.value);
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    filteredLogs = patientLogs.filter(log => 
        log.patientName.toLowerCase().includes(searchTerm) ||
        log.fileNumber.toLowerCase().includes(searchTerm) ||
        log.procedure.toLowerCase().includes(searchTerm)
    );
    renderPatientTable();
}

function filterPatients(filter) {
    if (filter === 'all') {
        filteredLogs = [...patientLogs];
    } else {
        filteredLogs = patientLogs.filter(log => log.patientType === filter);
    }
    renderPatientTable();
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

function populateProcedureDropdown(type, companyName) {
    const select = document.getElementById('procedure');
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
    updatePriceFields();
}

function clearProcedureDropdown() {
    const select = document.getElementById('procedure');
    select.innerHTML = '<option value="">Select procedure</option>';
    
    // Clear price fields
    document.getElementById('price').value = '';
    document.getElementById('discount').value = '';
    document.getElementById('final-amount').value = '';
}

function updatePriceFields() {
    const type = document.getElementById('patient-type').value;
    const procedure = document.getElementById('procedure').value;
    
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
        const company = document.getElementById('insurance-company').value;
        const normName = normalizeCompanyName(company);
        const proc = insuranceProcedures[normName]?.find(p => p.procedure === procedure);
        price = proc ? proc.price : '';
        discount = proc ? proc.discount : '';
        finalAmount = proc && typeof proc.finalAmount === 'number' && !isNaN(proc.finalAmount) ? proc.finalAmount : (typeof price === 'number' && !isNaN(price) ? price : '');
    }
    
    document.getElementById('price').value = price !== undefined && price !== null ? price : '';
    document.getElementById('discount').value = discount !== undefined && discount !== null ? discount : '';
    document.getElementById('final-amount').value = (finalAmount !== undefined && finalAmount !== null && !isNaN(finalAmount)) ? String(finalAmount) : '';
}

// --- RENDERING ---
function updateStats() {
    const totalPatients = patientLogs.length;
    const cashPatients = patientLogs.filter(log => log.patientType === 'cash').length;
    const insurancePatients = patientLogs.filter(log => log.patientType === 'insurance').length;
    const totalCollection = patientLogs.reduce((sum, log) => sum + (log.finalAmount || 0), 0);
    
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
        row.innerHTML = `
            <td>${new Date(log.visitDate).toLocaleDateString()}</td>
            <td>${log.patientName}</td>
            <td>${log.fileNumber}</td>
            <td><span class="badge ${log.patientType}">${log.patientType}</span></td>
            <td>${log.insuranceCompany || '-'}</td>
            <td>${log.procedure}</td>
            <td>SAR ${log.price}</td>
            <td>${log.discount ? log.discount + '%' : '-'}</td>
            <td>SAR ${log.finalAmount}</td>
            <td>
                <button class="action-btn delete" onclick="deletePatient(${log.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function deletePatient(id) {
    if (confirm('Are you sure you want to delete this patient record?')) {
        patientLogs = patientLogs.filter(log => log.id !== id);
        localStorage.setItem('patientLogs', JSON.stringify(patientLogs));
        updateStats();
        renderPatientTable();
        showSuccess('Patient record deleted successfully!');
    }
}

// --- CHARTS ---
function renderCharts() {
    renderPatientTypeChart();
    renderRevenueChart();
    renderProcedureChart();
}

function renderPatientTypeChart() {
    const ctx = document.getElementById('patientTypeChart').getContext('2d');
    
    if (charts.patientType) {
        charts.patientType.destroy();
    }
    
    const cashCount = patientLogs.filter(log => log.patientType === 'cash').length;
    const insuranceCount = patientLogs.filter(log => log.patientType === 'insurance').length;
    
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

function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (charts.revenue) {
        charts.revenue.destroy();
    }
    
    // Group revenue by month
    const monthlyRevenue = {};
    patientLogs.forEach(log => {
        const month = new Date(log.visitDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + log.finalAmount;
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
    
    // Count procedures
    const procedureCount = {};
    patientLogs.forEach(log => {
        procedureCount[log.procedure] = (procedureCount[log.procedure] || 0) + 1;
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
    filteredLogs = [...patientLogs];
    
    // Load price lists
    await loadPriceLists();
    
    // Setup initial form state - clear procedure dropdown since no patient type is selected
    clearProcedureDropdown();
    
    // Update stats
    updateStats();
    
    // Set today's date as default
    document.getElementById('visit-date').valueAsDate = new Date();
}
