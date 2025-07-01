// IoT Sensor Dashboard JavaScript - Basit Versiyon
// Global variables
let currentData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 20;
let selectedTimeRange = 1; // hours
let refreshInterval = null;

// Configuration
const CONFIG = {
    refreshRate: 30000, // 30 seconds
};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 IoT Dashboard başlatılıyor...');
    
    try {
        // Initialize dashboard
        await initializeDashboard();
        
        // Setup event listeners
        setupEventListeners();
        
        // Start auto-refresh
        startAutoRefresh();
        
        console.log('🎉 Dashboard tamamen hazır!');
    } catch (error) {
        console.error('❌ Dashboard başlatma kritik hatası:', error);
        showErrorMessage('Dashboard başlatılamadı');
    }
});

/**
 * Initialize the dashboard
 */
async function initializeDashboard() {
    console.log('📊 Dashboard başlatılıyor...');
    
    try {
        // Load initial data
        await loadDashboardData(true);
        console.log('✅ Dashboard başarıyla başlatıldı');
    } catch (error) {
        console.error('❌ Dashboard başlatma hatası:', error);
        showErrorMessage('Dashboard yüklenirken hata oluştu');
    }
    
    // Update last refresh time
    updateLastRefreshTime();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Time range buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Prevent multiple clicks
            if (this.disabled) return;
            
            // Disable all buttons temporarily
            document.querySelectorAll('.time-btn').forEach(b => b.disabled = true);
            
            try {
                // Remove active class from all buttons
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Update selected time range
                const newTimeRange = parseInt(this.dataset.hours) || 0;
                selectedTimeRange = newTimeRange;
                
                console.log(`🕒 Zaman aralığı değiştirildi: ${selectedTimeRange || 'Tümü'} saat`);
                
                // Show loading and reload data
                showLoadingSpinner();
                await loadDashboardData();
                
            } catch (error) {
                console.error('❌ Zaman aralığı değiştirme hatası:', error);
                showErrorMessage('Zaman aralığı değiştirilirken hata oluştu');
            } finally {
                // Re-enable all buttons
                document.querySelectorAll('.time-btn').forEach(b => b.disabled = false);
                hideLoadingSpinner();
            }
        });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await refreshData();
        });
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', previousPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);
}

/**
 * Load all dashboard data
 */
async function loadDashboardData(showSpinner = false) {
    if (showSpinner) showLoadingSpinner();
    
    try {
        // Load data based on selected time range
        await Promise.all([
            loadFilteredData(),
            loadStats()
        ]);
        
        console.log('✅ Tüm veriler başarıyla yüklendi');
        
    } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
        showErrorMessage('Veriler yüklenirken hata oluştu');
        throw error; // Re-throw to let caller handle it
    } finally {
        if (showSpinner) hideLoadingSpinner();
        updateLastRefreshTime();
    }
}

/**
 * Load filtered data based on time range
 */
async function loadFilteredData() {
    try {
        let url = '/api/data?limit=1000'; // Get more data for filtering
        if (selectedTimeRange > 0) {
            url = `/api/chart?hours=${selectedTimeRange}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        currentData = data;
        filteredData = data;
        currentPage = 1;
        
        updateDataDisplay();
        console.log(`📋 ${data.length} kayıt yüklendi`);
        
    } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
    }
}

/**
 * Load statistics data
 */
async function loadStats() {
    try {
        // Calculate stats from current filtered data
        if (filteredData.length === 0) {
            document.getElementById('totalRecords').textContent = '0';
            document.getElementById('avgTemperature').textContent = '0°C';
            document.getElementById('maxTemperature').textContent = '0°C';
            document.getElementById('minTemperature').textContent = '0°C';
            return;
        }
        
        const temperatures = filteredData.map(item => parseFloat(item.temperature || 0));
        const totalRecords = filteredData.length;
        const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
        const maxTemp = Math.max(...temperatures);
        const minTemp = Math.min(...temperatures);
        
        // Update stats cards
        document.getElementById('totalRecords').textContent = formatNumber(totalRecords);
        document.getElementById('avgTemperature').textContent = `${avgTemp.toFixed(1)}°C`;
        document.getElementById('maxTemperature').textContent = `${maxTemp.toFixed(1)}°C`;
        document.getElementById('minTemperature').textContent = `${minTemp.toFixed(1)}°C`;
        
        // Add fade-in animation
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.add('fade-in');
        });
        
        console.log('📈 İstatistikler güncellendi');
        
    } catch (error) {
        console.error('❌ İstatistik hesaplama hatası:', error);
    }
}

/**
 * Update data display (table with pagination)
 */
function updateDataDisplay() {
    const tbody = document.getElementById('dataTableBody');
    
    if (!filteredData || filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Seçilen zaman aralığında veri bulunmuyor</td></tr>';
        updatePagination();
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // Update table
    tbody.innerHTML = pageData.map((item, index) => `
        <tr>
            <td><strong>${startIndex + index + 1}</strong></td>
            <td><strong>${item.sensor_id || 'Unknown'}</strong></td>
            <td><span class="${getTemperatureClass(item.temperature)}">${item.temperature || 0}°C</span></td>
            <td>${item.humidity ? item.humidity + '%' : 'N/A'}</td>
            <td>${item.location || 'Unknown'}</td>
            <td>${formatDateTime(item.timestamp)}</td>
        </tr>
    `).join('');
    
    updatePagination();
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Update page info
    pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages || 1}`;
    
    // Update button states
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // Add disabled styling
    if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
    else prevBtn.style.opacity = '1';
    
    if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
    else nextBtn.style.opacity = '1';
}

/**
 * Go to previous page
 */
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        updateDataDisplay();
        console.log(`📄 Önceki sayfa: ${currentPage}`);
    }
}

/**
 * Go to next page
 */
function nextPage() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateDataDisplay();
        console.log(`📄 Sonraki sayfa: ${currentPage}`);
    }
}

/**
 * Refresh all data
 */
async function refreshData() {
    console.log('🔄 Veriler yenileniyor...');
    
    // Add rotation animation to refresh button
    const refreshBtn = document.querySelector('.refresh-btn i');
    if (refreshBtn) {
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 500);
    }
    
    try {
        currentPage = 1; // Reset to first page
        await loadDashboardData(true);
        console.log('✅ Manuel yenileme başarılı');
    } catch (error) {
        console.error('❌ Manuel yenileme hatası:', error);
        showErrorMessage('Veriler yenilenirken hata oluştu');
    }
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(async () => {
        try {
            console.log('🔄 Otomatik yenileme...');
            await loadDashboardData();
        } catch (error) {
            console.error('❌ Otomatik yenileme hatası:', error);
        }
    }, CONFIG.refreshRate);
    
    console.log(`⏱️ Otomatik yenileme başlatıldı (${CONFIG.refreshRate/1000}s)`);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('⏸️ Otomatik yenileme durduruldu');
    }
}

/**
 * Show loading spinner
 */
function showLoadingSpinner() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

/**
 * Hide loading spinner
 */
function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    statusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Hata';
    statusIndicator.className = 'status-indicator status-error';
    
    console.error('❌ ' + message);
}

/**
 * Update last refresh time
 */
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('tr-TR');
    document.getElementById('lastUpdate').textContent = `Son Güncelleme: ${timeString}`;
    
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Bağlı';
    statusIndicator.className = 'status-indicator status-success';
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toLocaleString('tr-TR');
}

/**
 * Format date and time
 */
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get temperature CSS class based on value
 */
function getTemperatureClass(temp) {
    if (temp < 15) return 'temp-cold';
    if (temp < 25) return 'temp-normal';
    if (temp < 30) return 'temp-warm';
    return 'temp-hot';
}

/**
 * Handle visibility change (pause/resume auto-refresh)
 */
document.addEventListener('visibilitychange', async function() {
    if (document.hidden) {
        console.log('📱 Sayfa arka plana geçti, otomatik yenileme duraklatıldı');
        stopAutoRefresh();
    } else {
        console.log('📱 Sayfa aktif, otomatik yenileme devam ediyor');
        startAutoRefresh();
        try {
            await loadDashboardData(); // Refresh immediately when page becomes visible
        } catch (error) {
            console.error('❌ Sayfa görünür olduğunda yenileme hatası:', error);
        }
    }
});

// Export functions for global access
window.refreshData = refreshData;
window.previousPage = previousPage;
window.nextPage = nextPage; 