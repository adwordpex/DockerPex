const API_URL = 'http://localhost:3000/api';

let currentResults = [];
let filteredResults = [];
let isFiltered = false;

// Add autocomplete functionality for location input
document.getElementById('location').addEventListener('input', function(e) {
    const value = e.target.value.toLowerCase();
    const datalist = document.getElementById('locationList');
    
    // Show suggestions based on input
    if (value.length > 0) {
        const options = datalist.querySelectorAll('option');
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const val = option.value.toLowerCase();
            if (text.includes(value) || val.includes(value)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }
});

// Handle search provider change to show/hide engine options
document.getElementById('searchProvider').addEventListener('change', function(e) {
    const provider = e.target.value;
    const engineSelect = document.getElementById('engine');

    if (provider === 'google-custom') {
        // Google Custom Search only supports google and facebook engines
        Array.from(engineSelect.options).forEach(option => {
            if (option.value === 'maps' || option.value === 'local' || option.value === 'all') {
                option.disabled = true;
                if (!option.textContent.includes('(SerpAPI only)')) {
                    option.textContent = option.textContent + ' (SerpAPI only)';
                }
            }
        });

        // If current selection is not supported, switch to google
        if (engineSelect.value === 'maps' || engineSelect.value === 'local' || engineSelect.value === 'all') {
            engineSelect.value = 'google';
        }
    } else {
        // Re-enable all options for SerpAPI
        Array.from(engineSelect.options).forEach(option => {
            option.disabled = false;
            option.textContent = option.textContent.replace(' (SerpAPI only)', '');
        });
    }
});

document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = document.getElementById('query').value;
    const location = document.getElementById('location').value;
    const engine = document.getElementById('engine').value;
    const searchProvider = document.getElementById('searchProvider').value;
    const num = document.getElementById('num').value;
    const scrapeResults = document.getElementById('scrapeResults').checked;
    const scrapeLimit = document.getElementById('scrapeLimit').value;
    
    showLoading(true);
    hideResults();
    
    try {
        const endpoint = scrapeResults ? '/search-and-scrape' : '/search';
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                location,
                engine,
                searchProvider,
                num: parseInt(num),
                scrapeResults,
                scrapeLimit: parseInt(scrapeLimit)
            })
        });
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        currentResults = data.leads;
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to search for leads. Please try again.');
    } finally {
        showLoading(false);
    }
});

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('searchBtn').disabled = show;
}

function hideResults() {
    document.getElementById('resultsContainer').classList.add('hidden');
}

function displayResults(data) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsDiv = document.getElementById('results');
    const summaryDiv = document.getElementById('summary');
    
    resultsContainer.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    
    // Display summary
    const totalFound = data.searchInfo?.totalResults || data.total;
    const formattedTotal = typeof totalFound === 'number' ? totalFound.toLocaleString() : totalFound;

    let summaryHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div class="stat-card p-4 rounded-xl text-center">
                <p class="text-3xl font-bold text-yellow-300">${formattedTotal}</p>
                <p class="text-sm opacity-80">ผลลัพธ์ที่พบทั้งหมด</p>
            </div>
            <div class="stat-card p-4 rounded-xl text-center">
                <p class="text-3xl font-bold text-green-300">${data.total}</p>
                <p class="text-sm opacity-80">ดึงข้อมูลมาแล้ว</p>
            </div>
            <div class="stat-card p-4 rounded-xl text-center">
                <p class="text-2xl font-bold text-blue-300">${data.searchInfo?.query || 'N/A'}</p>
                <p class="text-sm opacity-80">คำค้นหา</p>
            </div>
            <div class="stat-card p-4 rounded-xl text-center">
                <p class="text-2xl font-bold text-purple-300">${new Date().toLocaleDateString('th-TH')}</p>
                <p class="text-sm opacity-80">วันที่ค้นหา</p>
            </div>
        </div>
    `;

    // If combined search, show source breakdown
    if (data.searchInfo?.sources) {
        summaryHTML += `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div class="stat-card p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-orange-300">🏪 ${data.searchInfo.sources.local}</p>
                    <p class="text-xs opacity-80">Google Local</p>
                </div>
                <div class="stat-card p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-red-300">🗺️ ${data.searchInfo.sources.maps}</p>
                    <p class="text-xs opacity-80">Google Maps</p>
                </div>
                <div class="stat-card p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-blue-400">📘 ${data.searchInfo.sources.facebook}</p>
                    <p class="text-xs opacity-80">Facebook</p>
                </div>
                <div class="stat-card p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-green-400">🔍 ${data.searchInfo.sources.google}</p>
                    <p class="text-xs opacity-80">Google Search</p>
                </div>
            </div>
        `;
    }

    summaryDiv.innerHTML = summaryHTML;
    
    // Display results in table format (simple view)
    const tableHTML = createSimpleResultsTable(data.leads);
    resultsDiv.innerHTML = tableHTML;
}

function createSimpleResultsTable(leads) {
    let tableHTML = `
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gradient-to-r from-purple-600 to-blue-600">
                        <tr>
                            <th class="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">#</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">ชื่อธุรกิจ</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">เบอร์โทร</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">อีเมล</th>
                            <th class="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">แหล่งที่มา</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
    `;

    leads.forEach((lead, index) => {
        // Collect all phone numbers
        let phones = [];
        if (lead.phone) {
            phones.push(formatPhoneNumber(lead.phone));
        }
        if (lead.contacts?.phones?.length > 0) {
            lead.contacts.phones.forEach(phone => {
                const formatted = formatPhoneNumber(phone);
                if (formatted && !phones.includes(formatted)) {
                    phones.push(formatted);
                }
            });
        }

        // Collect all emails
        let emails = [];
        if (lead.contacts?.emails?.length > 0) {
            emails = lead.contacts.emails;
        }

        const phoneDisplay = phones.length > 0
            ? phones.map(p => `<span class="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-1 mb-1">${p}</span>`).join('')
            : '<span class="text-gray-400 text-sm">-</span>';

        const emailDisplay = emails.length > 0
            ? emails.map(e => `<span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-1 mb-1">${e}</span>`).join('')
            : '<span class="text-gray-400 text-sm">-</span>';

        const sourceIcons = {
            'google_local': '🏪',
            'google_local_inline': '🏪',
            'google_maps': '🗺️',
            'google_facebook': '📘',
            'google_search': '🔍'
        };
        const sourceIcon = sourceIcons[lead.source] || '📍';

        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        tableHTML += `
            <tr class="${rowClass} hover:bg-purple-50 transition-colors duration-200">
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="font-semibold">${lead.title || 'ไม่มีชื่อ'}</div>
                    ${lead.address ? `<div class="text-xs text-gray-500 mt-1">${lead.address}</div>` : ''}
                </td>
                <td class="px-6 py-4 text-sm">${phoneDisplay}</td>
                <td class="px-6 py-4 text-sm">${emailDisplay}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center text-sm">
                    <span class="text-2xl" title="${lead.source}">${sourceIcon}</span>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    return tableHTML;
}

function createResultCard(lead, index) {
    const card = document.createElement('div');
    card.className = 'result-card bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300';
    
    // Format phone numbers for display
    const formatDisplayPhone = (phone) => {
        if (!phone) return '';
        return formatPhoneNumber(phone);
    };
    
    let content = `
        <div class="flex flex-col md:flex-row md:items-start md:justify-between">
            <div class="flex-1">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">${index + 1}. ${lead.title || 'No title'}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
    `;
    
    if (lead.source === 'google_maps' || lead.source === 'google_local' || lead.source === 'google_local_inline') {
        content += `
            ${lead.address ? `<p class="text-gray-600"><i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>${lead.address}</p>` : ''}
            ${lead.phone ? `<p class="text-gray-600"><i class="fas fa-phone mr-2 text-gray-400"></i>${formatDisplayPhone(lead.phone)}</p>` : ''}
            ${lead.rating ? `<p class="text-gray-600"><i class="fas fa-star mr-2 text-yellow-500"></i>${lead.rating} (${lead.reviews || 0} reviews)</p>` : ''}
            ${lead.type ? `<p class="text-gray-600"><i class="fas fa-tag mr-2 text-gray-400"></i>${lead.type}</p>` : ''}
            ${lead.price ? `<p class="text-gray-600"><i class="fas fa-dollar-sign mr-2 text-gray-400"></i>${lead.price}</p>` : ''}
            ${lead.hours ? `<p class="text-gray-600 col-span-2"><i class="fas fa-clock mr-2 text-gray-400"></i>${lead.hours}</p>` : ''}
        `;
        
        if (lead.description) {
            content += `<p class="text-gray-600 col-span-2 mt-2">${lead.description}</p>`;
        }
        
        if (lead.service_options) {
            content += `<div class="col-span-2 mt-2">`;
            Object.entries(lead.service_options).forEach(([key, value]) => {
                if (value) {
                    content += `<span class="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs font-medium text-gray-600 mr-1 mb-1">${key.replace(/_/g, ' ')}</span>`;
                }
            });
            content += `</div>`;
        }
    } else if (lead.source === 'google_facebook') {
        content += `
            <p class="text-gray-600 col-span-2"><i class="fab fa-facebook mr-2 text-blue-600"></i>Facebook Page</p>
            ${lead.snippet ? `<p class="text-gray-600 col-span-2">${lead.snippet}</p>` : ''}
            ${lead.facebook_url ? `<p class="text-gray-600 col-span-2"><i class="fas fa-link mr-2 text-gray-400"></i><a href="${lead.facebook_url}" target="_blank" class="text-blue-600 hover:text-blue-800">${lead.facebook_url}</a></p>` : ''}
        `;
    } else {
        content += `
            ${lead.snippet ? `<p class="text-gray-600 col-span-2">${lead.snippet}</p>` : ''}
        `;
    }
    
    if (lead.contacts) {
        if (lead.contacts.emails?.length > 0) {
            content += `<p class="text-gray-600 col-span-2"><i class="fas fa-envelope mr-2 text-blue-500"></i>${lead.contacts.emails.join(', ')}</p>`;
        }
        if (lead.contacts.phones?.length > 0) {
            const formattedPhones = lead.contacts.phones.map(formatDisplayPhone).join(', ');
            content += `<p class="text-gray-600 col-span-2"><i class="fas fa-phone mr-2 text-green-500"></i>${formattedPhones}</p>`;
        }
        if (lead.contacts.socialMedia?.length > 0) {
            content += `<div class="text-gray-600 col-span-2 mt-2">`;
            lead.contacts.socialMedia.forEach(social => {
                const icon = getSocialIcon(social);
                content += `<a href="${social}" target="_blank" class="inline-block mr-3 hover:text-purple-600">${icon}</a>`;
            });
            content += `</div>`;
        }
    }
    
    content += `</div></div>`;
    
    // Right side - Website button
    content += `<div class="mt-3 md:mt-0 md:ml-4">`;
    
    if (lead.link || lead.website) {
        content += `
            <a href="${lead.link || lead.website}" target="_blank" class="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-300 text-sm">
                <i class="fas fa-external-link-alt mr-1"></i>Website
            </a>
        `;
    }
    
    content += `</div></div>`;
    
    // Status messages at bottom
    if (lead.scrapedContactPage) {
        content += `<p class="text-xs text-green-600 mt-2"><i class="fas fa-check-circle mr-1"></i>Contact page scraped</p>`;
    }
    
    if (!lead.phone && !lead.contacts?.phones?.length && !lead.contacts?.emails?.length) {
        content += `<p class="text-xs text-orange-500 mt-2"><i class="fas fa-info-circle mr-1"></i>No contact info found</p>`;
    }
    
    card.innerHTML = content;
    return card;
}

function getSocialIcon(url) {
    if (url.includes('facebook.com')) return '<i class="fab fa-facebook"></i>';
    if (url.includes('twitter.com')) return '<i class="fab fa-twitter"></i>';
    if (url.includes('linkedin.com')) return '<i class="fab fa-linkedin"></i>';
    if (url.includes('instagram.com')) return '<i class="fab fa-instagram"></i>';
    return '<i class="fas fa-link"></i>';
}

document.getElementById('exportBtn').addEventListener('click', () => {
    if (currentResults.length === 0) {
        alert('ไม่มีข้อมูลให้ Export');
        return;
    }

    // Use filtered results if filter is active
    const dataToExport = isFiltered ? filteredResults : currentResults;
    downloadExcel(dataToExport, 'leads_export.xlsx');
});

document.getElementById('exportPhonesBtn').addEventListener('click', () => {
    if (currentResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    const phones = extractPhoneNumbers(currentResults);
    if (phones.length === 0) {
        alert('No phone numbers found');
        return;
    }
    
    downloadTXT(phones.join('\n'), 'phone_numbers.txt');
});

document.getElementById('exportEmailsBtn').addEventListener('click', () => {
    if (currentResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    const emails = extractEmailAddresses(currentResults);
    if (emails.length === 0) {
        alert('No email addresses found');
        return;
    }
    
    downloadTXT(emails.join('\n'), 'email_addresses.txt');
});

function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Thai phone numbers
    if (cleaned.startsWith('66')) {
        // Remove country code 66 and add 0
        cleaned = '0' + cleaned.substring(2);
    } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
        // Add leading 0 if missing
        cleaned = '0' + cleaned;
    }
    
    return cleaned;
}

function convertToCSV(data) {
    const headers = ['Title', 'Link/Website', 'Address', 'Phone', 'Email', 'Rating', 'Type', 'Price', 'Hours', 'Source'];
    const rows = data.map(lead => {
        // Get all phone numbers from lead.phone and contacts
        let phoneNumbers = [];
        
        // Add phone from lead.phone if exists
        if (lead.phone) {
            const formatted = formatPhoneNumber(lead.phone);
            if (formatted) phoneNumbers.push(formatted);
        }
        
        // Add phones from contacts if exists
        if (lead.contacts?.phones?.length > 0) {
            lead.contacts.phones.forEach(phone => {
                const formatted = formatPhoneNumber(phone);
                if (formatted && !phoneNumbers.includes(formatted)) {
                    phoneNumbers.push(formatted);
                }
            });
        }
        
        // Get all emails
        let emails = [];
        if (lead.contacts?.emails?.length > 0) {
            emails = lead.contacts.emails;
        }
        
        return [
            lead.title || '',
            lead.link || lead.website || '',
            lead.address || '',
            phoneNumbers.join(', '),  // Join all phone numbers with comma
            emails.join(', '),         // Join all emails with comma
            lead.rating || '',
            lead.type || '',
            lead.price || '',
            lead.hours || '',
            lead.source || ''
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

function extractPhoneNumbers(data) {
    const phoneSet = new Set();
    
    data.forEach(lead => {
        // From direct phone field
        if (lead.phone) {
            const formatted = formatPhoneNumber(lead.phone);
            if (formatted) phoneSet.add(formatted);
        }
        
        // From scraped contacts
        if (lead.contacts && lead.contacts.phones) {
            lead.contacts.phones.forEach(phone => {
                const formatted = formatPhoneNumber(phone);
                if (formatted) phoneSet.add(formatted);
            });
        }
    });
    
    return Array.from(phoneSet).sort();
}

function extractEmailAddresses(data) {
    const emailSet = new Set();
    
    data.forEach(lead => {
        // From scraped contacts
        if (lead.contacts && lead.contacts.emails) {
            lead.contacts.emails.forEach(email => {
                // Basic email validation
                if (email && email.includes('@')) {
                    emailSet.add(email.toLowerCase().trim());
                }
            });
        }
    });
    
    return Array.from(emailSet).sort();
}

function downloadTXT(content, filename) {
    // Add UTF-8 BOM to fix Thai characters
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function downloadCSV(csv, filename) {
    // Add UTF-8 BOM to fix Thai characters in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function downloadExcel(data, filename) {
    // Prepare data for Excel
    const excelData = data.map((lead, index) => {
        // Get all phone numbers
        let phoneNumbers = [];
        if (lead.phone) {
            const formatted = formatPhoneNumber(lead.phone);
            if (formatted) phoneNumbers.push(formatted);
        }
        if (lead.contacts?.phones?.length > 0) {
            lead.contacts.phones.forEach(phone => {
                const formatted = formatPhoneNumber(phone);
                if (formatted && !phoneNumbers.includes(formatted)) {
                    phoneNumbers.push(formatted);
                }
            });
        }

        // Get all emails
        let emails = [];
        if (lead.contacts?.emails?.length > 0) {
            emails = lead.contacts.emails;
        }

        return {
            'ลำดับ': index + 1,
            'ชื่อธุรกิจ': lead.title || '',
            'ที่อยู่': lead.address || '',
            'เบอร์โทร': phoneNumbers.join(', '),
            'อีเมล': emails.join(', '),
            'เว็บไซต์': lead.link || lead.website || '',
            'คะแนน': lead.rating || '',
            'รีวิว': lead.reviews || '',
            'ประเภท': lead.type || '',
            'ราคา': lead.price || '',
            'เวลาทำการ': lead.hours || '',
            'แหล่งที่มา': lead.source || ''
        };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
        { wch: 8 },   // ลำดับ
        { wch: 30 },  // ชื่อธุรกิจ
        { wch: 40 },  // ที่อยู่
        { wch: 25 },  // เบอร์โทร
        { wch: 30 },  // อีเมล
        { wch: 40 },  // เว็บไซต์
        { wch: 8 },   // คะแนน
        { wch: 8 },   // รีวิว
        { wch: 20 },  // ประเภท
        { wch: 10 },  // ราคา
        { wch: 25 },  // เวลาทำการ
        { wch: 15 }   // แหล่งที่มา
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Generate Excel file and download
    XLSX.writeFile(wb, filename);
}