class StockManagerApp {
    constructor() {
        this.db = new GoogleSheetsDB();
        this.currentData = [];
        this.filteredData = [];
        this.init();
    }

    async init() {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        // Load data
        await this.loadData();

        // Setup event listeners
        this.setupEventListeners();

        // Check online status
        this.setupOnlineStatus();
    }

    async loadData() {
        try {
            this.showLoading();
            this.currentData = await this.db.readData();
            this.filteredData = [...this.currentData];
            this.renderStockList(this.filteredData);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Gagal memuat data', 'error');
        }
    }

    setupEventListeners() {
        // Form tambah barang
        document.getElementById('addForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addItem();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchItems(e.target.value);
        });

        // Sync button
        document.getElementById('syncBtn').addEventListener('click', async () => {
            await this.syncData();
        });
    }

    setupOnlineStatus() {
        window.addEventListener('online', () => {
            this.showNotification('Kembali online', 'success');
            this.syncData();
        });

        window.addEventListener('offline', () => {
            this.showNotification('Mode offline', 'error');
        });
    }

    async addItem() {
        const nama = document.getElementById('namaBarang').value.trim();
        const kategori = document.getElementById('kategori').value.trim();
        const jumlah = document.getElementById('jumlah').value;
        const harga = document.getElementById('harga').value;

        if (!nama || !kategori || !jumlah || !harga) {
            this.showNotification('Semua field harus diisi!', 'error');
            return;
        }

        try {
            const newItem = await this.db.addItem({
                nama,
                kategori,
                jumlah: parseInt(jumlah),
                harga: parseInt(harga)
            });

            // Update UI
            this.currentData.push(newItem);
            this.filteredData = [...this.currentData];
            this.renderStockList(this.filteredData);
            
            // Reset form
            document.getElementById('addForm').reset();
            
            this.showNotification('Barang berhasil ditambahkan!', 'success');
        } catch (error) {
            console.error('Error adding item:', error);
            this.showNotification('Gagal menambahkan barang', 'error');
        }
    }

    async updateStock(id, change) {
        try {
            const updatedItem = await this.db.updateStock(id, change);
            
            // Update UI
            const index = this.currentData.findIndex(item => item.id === id);
            if (index !== -1) {
                this.currentData[index] = updatedItem;
                this.filteredData = [...this.currentData];
                this.renderStockList(this.filteredData);
            }
            
            const action = change > 0 ? 'ditambahkan' : 'dikurangi';
            this.showNotification(`Stock ${action}!`, 'success');
        } catch (error) {
            console.error('Error updating stock:', error);
            this.showNotification('Gagal update stock', 'error');
        }
    }

    async deleteItem(id) {
        if (!confirm('Yakin ingin menghapus barang ini?')) return;
        
        try {
            await this.db.deleteItem(id);
            
            // Update UI
            this.currentData = this.currentData.filter(item => item.id !== id);
            this.filteredData = [...this.currentData];
            this.renderStockList(this.filteredData);
            
            this.showNotification('Barang berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showNotification('Gagal menghapus barang', 'error');
        }
    }

    searchItems(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.filteredData = [...this.currentData];
        } else {
            this.filteredData = this.currentData.filter(item => 
                item.nama.toLowerCase().includes(searchTerm) ||
                item.kategori.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderStockList(this.filteredData);
    }

    renderStockList(data) {
        const container = document.getElementById('stockList');
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty">📭 Belum ada data barang</div>';
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `
                <div class="stock-item">
                    <div class="stock-info">
                        <div class="stock-name">${this.escapeHtml(item.nama)}</div>
                        <div class="stock-category">${this.escapeHtml(item.kategori)}</div>
                    </div>
                    <div class="stock-details">
                        <span class="stock-qty">${item.jumlah}</span>
                        <span class="stock-price">Rp ${this.formatCurrency(item.harga)}</span>
                        <div class="stock-actions">
                            <button class="btn-increase" onclick="app.updateStock('${item.id}', 1)" title="Tambah Stock">+</button>
                            <button class="btn-decrease" onclick="app.updateStock('${item.id}', -1)" title="Kurangi Stock">-</button>
                            <button class="btn-edit" onclick="app.editItem('${item.id}')" title="Edit">✏️</button>
                            <button class="btn-delete" onclick="app.deleteItem('${item.id}')" title="Hapus">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async editItem(id) {
        const item = this.currentData.find(i => i.id === id);
        if (!item) return;

        const newNama = prompt('Nama Barang:', item.nama);
        if (newNama === null) return;
        
        const newKategori = prompt('Kategori:', item.kategori);
        if (newKategori === null) return;
        
        const newJumlah = prompt('Jumlah:', item.jumlah);
        if (newJumlah === null) return;
        
        const newHarga = prompt('Harga:', item.harga);
        if (newHarga === null) return;

        try {
            const updatedItem = await this.db.updateItem(id, {
                nama: newNama.trim(),
                kategori: newKategori.trim(),
                jumlah: parseInt(newJumlah),
                harga: parseInt(newHarga)
            });

            // Update UI
            const index = this.currentData.findIndex(item => item.id === id);
            if (index !== -1) {
                this.currentData[index] = updatedItem;
                this.filteredData = [...this.currentData];
                this.renderStockList(this.filteredData);
            }

            this.showNotification('Barang berhasil diupdate!', 'success');
        } catch (error) {
            console.error('Error editing item:', error);
            this.showNotification('Gagal update barang', 'error');
        }
    }

    async syncData() {
        try {
            this.showNotification('Menyinkronkan data...', '');
            
            const success = await this.db.syncOfflineData();
            
            if (success) {
                await this.loadData();
                this.showNotification('Sinkronisasi berhasil!', 'success');
            } else {
                this.showNotification('Gagal sinkronisasi, coba lagi nanti', 'error');
            }
        } catch (error) {
            console.error('Error syncing:', error);
            this.showNotification('Gagal sinkronisasi', 'error');
        }
    }

    showNotification(message, type = '') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification';
        
        if (type) {
            notification.classList.add(type);
        }
        
        notification.classList.add('show');
        
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    showLoading() {
        document.getElementById('stockList').innerHTML = '<div class="loading">⏳ Memuat data...</div>';
    }

    hideLoading() {
        // Loading will be replaced by render
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('id-ID').format(value);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StockManagerApp();
});
