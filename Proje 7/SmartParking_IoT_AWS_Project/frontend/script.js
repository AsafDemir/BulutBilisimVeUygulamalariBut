/**
 * Smart Parking Dashboard - JavaScript
 * AWS DynamoDB'den veri çekerek dashboard'u günceller
 */

// Global değişkenler
let parkingData = [];
let refreshInterval = null;

// Konfigürasyon
const CONFIG = {
    DATA_MODE: 'live', // 'simulation' veya 'live'
    API_ENDPOINT: 'https://8nu2cgjkme.execute-api.eu-north-1.amazonaws.com/v1/data',
    REFRESH_INTERVAL: 10000, // 10 saniye (database yükünü azaltmak için)
    MOCK_API_ENABLED: false // Gerçek API kullanılacak
};

// Otopark cihazları konfigürasyonu
const PARKING_DEVICES = {
    "PARK01": "Merkez",
    "PARK02": "AVM", 
    "PARK03": "Hastane",
    "PARK04": "Sanayi",
    "PARK05": "Üniversite",
    "PARK06": "Stadium",
    "PARK07": "Havaalanı",
    "PARK08": "İş Merkezi",
    "PARK09": "Sahil",
    "PARK10": "Tren Garı"
};

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚗 Smart Parking Dashboard yükleniyor...');
    
    initializeDashboard();
    setupEventListeners();
    startDataRefresh();
    updateLastUpdateTime();
});

/**
 * Dashboard'u başlat
 */
function initializeDashboard() {
    updateConnectionStatus(true);
    loadParkingData();
    createParkingCards();
    setupLocationFilter();
}

/**
 * Event listener'ları kurulum
 */
function setupEventListeners() {
    // Yenile butonu
    document.getElementById('refreshBtn').addEventListener('click', function() {
        showLoading();
        loadParkingData();
        updateLastUpdateTime();
        setTimeout(hideLoading, 1000);
    });
    
    // Lokasyon filtresi
    document.getElementById('locationFilter').addEventListener('change', function() {
        filterDataTable();
    });
    
    // Modal kapatma
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('infoModal').style.display = 'none';
    });
    
    // Modal dış alan tıklama
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('infoModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * Otopark verilerini yükle
 * AWS DynamoDB'den gerçek veri çeker
 */
async function loadParkingData() {
    try {
        showLoading();
        
        // Sadece gerçek API'den veri çek
        parkingData = await fetchRealData();
        
        updateDashboard();
        console.log(`✅ Database'den ${parkingData.length} cihaz verisi alındı`);
        updateConnectionStatus(true);
        
    } catch (error) {
        console.error('❌ Database bağlantı hatası:', error);
        updateConnectionStatus(false);
        
        // Hata durumunda boş array kullan - random veri üretme!
        parkingData = [];
        updateDashboard();
        
        // Kullanıcıya hata mesajı göster
        showErrorMessage('Database bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.');
        
    } finally {
        hideLoading();
    }
}

/**
 * AWS API Gateway üzerinden DynamoDB'den veri çek
 */
async function fetchRealData() {
    try {
        console.log('🔄 AWS DynamoDB\'den veri çekiliyor...');
        
        // API çağırısı
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API hatası: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // API'den dönen veri formatını kontrol et
        if (Array.isArray(data)) {
            console.log(`✅ API'den ${data.length} cihaz verisi alındı`);
            return data;
        } else if (data.success && Array.isArray(data.data)) {
            console.log(`✅ API'den ${data.data.length} cihaz verisi alındı`);
            return data.data;
        } else {
            console.log('⚠️ API\'den boş veri döndü');
            return [];
        }
        
    } catch (error) {
        console.error('❌ API çağırı hatası:', error);
        throw error; // Hatayı yukarı fırlat
    }
}

/**
 * Hata mesajı göster
 */
function showErrorMessage(message) {
    // Varolan hata mesajını kaldır
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Yeni hata mesajı oluştur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="error-close">×</button>
        </div>
    `;
    
    // Header'dan sonra ekle
    const header = document.querySelector('.header');
    header.insertAdjacentElement('afterend', errorDiv);
    
    // 10 saniye sonra otomatik kaldır
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

/**
 * Dashboard'u güncelle
 */
function updateDashboard() {
    updateOverviewCards();
    updateParkingCards();
    updateDataTable();
}

/**
 * Genel durum kartlarını güncelle
 */
function updateOverviewCards() {
    if (parkingData.length === 0) {
        // Veri yoksa placeholder değerler göster
        document.getElementById('avgOccupancy').textContent = '--';
        document.getElementById('availableCount').textContent = '--';
        document.getElementById('peakCount').textContent = '--';
        return;
    }
    
    // Ortalama doluluk
    const avgOccupancy = Math.round(
        parkingData.reduce((sum, item) => sum + item.occupancy_rate, 0) / parkingData.length
    );
    document.getElementById('avgOccupancy').textContent = avgOccupancy + '%';
    
    // Müsait alanlar (<%50 doluluk)
    const availableCount = parkingData.filter(item => item.occupancy_rate < 50).length;
    document.getElementById('availableCount').textContent = availableCount;
    
    // Yoğun alanlar (>80% doluluk)
    const peakCount = parkingData.filter(item => item.occupancy_rate > 80).length;
    document.getElementById('peakCount').textContent = peakCount;
}

/**
 * Park alanı kartlarını oluştur
 */
function createParkingCards() {
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';
    
    Object.entries(PARKING_DEVICES).forEach(([deviceId, location]) => {
        const card = createLocationCard(deviceId, location, 0);
        grid.appendChild(card);
    });
}

/**
 * Park alanı kartlarını güncelle
 */
function updateParkingCards() {
    // Önce tüm kartları sıfırla
    Object.entries(PARKING_DEVICES).forEach(([deviceId, location]) => {
        const card = document.querySelector(`[data-device="${deviceId}"]`);
        if (card) {
            // Varsayılan değerlerle sıfırla
            const fill = card.querySelector('.occupancy-fill');
            const percentage = card.querySelector('.occupancy-percentage');
            const badge = card.querySelector('.status-badge');
            
            fill.style.width = '0%';
            fill.className = 'occupancy-fill';
            percentage.textContent = '--';
            badge.className = 'status-badge status-available';
            badge.textContent = 'Veri Yok';
        }
    });
    
    // Database'den gelen verilerle güncelle
    parkingData.forEach(data => {
        const card = document.querySelector(`[data-device="${data.device_id}"]`);
        if (card) {
            updateLocationCard(card, data);
        }
    });
}

/**
 * Lokasyon kartı oluştur
 */
function createLocationCard(deviceId, location, occupancy) {
    const card = document.createElement('div');
    card.className = 'location-card fade-in';
    card.setAttribute('data-device', deviceId);
    
    card.innerHTML = `
        <div class="location-header">
            <span class="location-name">${location}</span>
            <span class="location-id">${deviceId}</span>
        </div>
        <div class="occupancy-bar">
            <div class="occupancy-fill" style="width: 0%"></div>
        </div>
        <div class="location-details">
            <span>Doluluk: <span class="occupancy-percentage">0%</span></span>
            <span class="status-badge status-available">Müsait</span>
        </div>
    `;
    
    return card;
}

/**
 * Lokasyon kartını güncelle
 */
function updateLocationCard(card, data) {
    const fill = card.querySelector('.occupancy-fill');
    const percentage = card.querySelector('.occupancy-percentage');
    const badge = card.querySelector('.status-badge');
    
    // Doluluk çubuğu
    fill.style.width = data.occupancy_rate + '%';
    percentage.textContent = data.occupancy_rate + '%';
    
    // Renk sınıfları
    fill.className = 'occupancy-fill';
    if (data.occupancy_rate < 50) {
        fill.classList.add('occupancy-low');
    } else if (data.occupancy_rate < 80) {
        fill.classList.add('occupancy-medium');
    } else {
        fill.classList.add('occupancy-high');
    }
    
    // Durum badge'i
    badge.className = 'status-badge';
    if (data.occupancy_rate < 50) {
        badge.classList.add('status-available');
        badge.textContent = 'Müsait';
    } else if (data.occupancy_rate < 80) {
        badge.classList.add('status-moderate');
        badge.textContent = 'Orta';
    } else {
        badge.classList.add('status-busy');
        badge.textContent = 'Yoğun';
    }
}

/**
 * Veri tablosunu güncelle
 */
function updateDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    if (parkingData.length === 0) {
        // Veri yoksa bilgi mesajı göster
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 30px; color: #7f8c8d;">
                <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <strong>Henüz veri bulunmuyor</strong><br>
                <small>IoT cihazlarından veri gelmesini bekleyin veya manuel veri ekleyin</small>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    // Database verilerini göster
    parkingData.forEach(data => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.device_id}</td>
            <td>${data.location}</td>
            <td>%${data.occupancy_rate}</td>
            <td>${getStatusBadge(data.occupancy_rate)}</td>
            <td>${formatTimestamp(data.timestamp)}</td>
            <td><button class="btn-detail" onclick="showDetails('${data.device_id}')">Detay</button></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Durum badge'i oluştur
 */
function getStatusBadge(occupancy) {
    if (occupancy < 50) {
        return '<span class="status-badge status-available">Müsait</span>';
    } else if (occupancy < 80) {
        return '<span class="status-badge status-moderate">Orta</span>';
    } else {
        return '<span class="status-badge status-busy">Yoğun</span>';
    }
}

/**
 * Timestamp formatla
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR');
}

/**
 * Lokasyon filtresini kurulum
 */
function setupLocationFilter() {
    const select = document.getElementById('locationFilter');
    select.innerHTML = '<option value="">Tüm Lokasyonlar</option>';
    
    Object.values(PARKING_DEVICES).forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        select.appendChild(option);
    });
}

/**
 * Veri tablosunu filtrele
 */
function filterDataTable() {
    const filter = document.getElementById('locationFilter').value;
    const rows = document.querySelectorAll('#dataTableBody tr');
    
    rows.forEach(row => {
        const location = row.cells[1].textContent;
        if (filter === '' || location === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Grafikler oluştur
 */




/**
 * Bağlantı durumunu güncelle
 */
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.textContent = 'Bağlı';
        statusElement.parentElement.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
    } else {
        statusElement.textContent = 'Bağlantı Kesildi';
        statusElement.parentElement.style.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
    }
}

/**
 * Son güncelleme zamanını güncelle
 */
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('tr-TR');
}

/**
 * Otomatik yenileme başlat
 */
function startDataRefresh() {
    // CONFIG'ten interval süresi al
    refreshInterval = setInterval(() => {
        loadParkingData();
        updateLastUpdateTime();
    }, CONFIG.REFRESH_INTERVAL);
    
    console.log(`🔄 Otomatik veri yenileme başlatıldı (${CONFIG.REFRESH_INTERVAL/1000} saniye)`);
}

/**
 * Yükleme animasyonu göster
 */
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
}

/**
 * Yükleme animasyonu gizle
 */
function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

/**
 * Cihaz detaylarını göster
 */
function showDetails(deviceId) {
    const data = parkingData.find(d => d.device_id === deviceId);
    if (!data) return;
    
    const modal = document.getElementById('infoModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h3>📊 ${data.device_id} - ${data.location}</h3>
        <div style="margin: 20px 0;">
            <p><strong>Doluluk Oranı:</strong> %${data.occupancy_rate}</p>
            <p><strong>Toplam Kapasite:</strong> ${data.total_spaces} araç</p>
            <p><strong>Müsait Alan:</strong> ${data.available_spaces} araç</p>
            <p><strong>Son Güncelleme:</strong> ${formatTimestamp(data.timestamp)}</p>
            <p><strong>Durum:</strong> ${getStatusText(data.occupancy_rate)}</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4>💡 Öneriler</h4>
            <p>${getRecommendation(data.occupancy_rate)}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

/**
 * Durum metni al
 */
function getStatusText(occupancy) {
    if (occupancy < 50) return '🟢 Müsait';
    if (occupancy < 80) return '🟡 Orta Yoğunluk';
    return '🔴 Yoğun';
}

/**
 * Öneri metni al
 */
function getRecommendation(occupancy) {
    if (occupancy < 50) {
        return 'Bu alan şu anda müsait durumda. Park etmek için ideal.';
    } else if (occupancy < 80) {
        return 'Orta yoğunlukta bir alan. Yakın zamanda park yeri bulabilirsiniz.';
    } else {
        return 'Bu alan oldukça yoğun. Alternatif park alanlarını değerlendirin.';
    }
}

/**
 * Proje bilgilerini göster
 */
function showInfo() {
    const modal = document.getElementById('infoModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h3>🚗 Smart Parking IoT Sistemi</h3>
        <p><strong>Versiyon:</strong> 1.0.0</p>
        <p><strong>Geliştirici:</strong> Bulut Bilişim Uygulamaları Dersi</p>
        <p><strong>Tarih:</strong> Ocak 2025</p>
        
        <h4>📋 Özellikler</h4>
        <ul>
            <li>📡 IoT tabanlı veri toplama</li>
            <li>☁️ AWS bulut entegrasyonu</li>
            <li>📊 Gerçek zamanlı izleme</li>
            <li>📈 Grafik görselleştirme</li>
            <li>📱 Responsive tasarım</li>
        </ul>
        
        <h4>🛠️ Teknolojiler</h4>
        <p>AWS IoT Core, Lambda, DynamoDB, Python MQTT, HTML5, CSS3, JavaScript, Chart.js</p>
    `;
    
    modal.style.display = 'block';
}

/**
 * Teknoloji bilgilerini göster
 */
function showTechInfo() {
    const modal = document.getElementById('infoModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h3>⚙️ Sistem Mimarisi</h3>
        
        <h4>🏗️ Katmanlar</h4>
        <ul>
            <li><strong>IoT Katmanı:</strong> Python MQTT Simülatörü</li>
            <li><strong>Bulut Katmanı:</strong> AWS IoT Core</li>
            <li><strong>İşleme Katmanı:</strong> AWS Lambda</li>
            <li><strong>Veri Katmanı:</strong> AWS DynamoDB</li>
            <li><strong>Sunum Katmanı:</strong> Web Dashboard</li>
        </ul>
        
        <h4>📊 Veri Akışı</h4>
        <p>IoT Cihazları → MQTT → AWS IoT Core → Lambda → DynamoDB → Dashboard</p>
        
        <h4>🔧 Kurulum</h4>
        <p>Detaylı kurulum talimatları için README.md dosyasını inceleyin.</p>
    `;
    
    modal.style.display = 'block';
}

// Sayfa kapatılırken temizleme
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

console.log('✅ Smart Parking Dashboard JavaScript yüklendi'); 