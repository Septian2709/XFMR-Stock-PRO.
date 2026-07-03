class GoogleSheetsDB {
    constructor() {
        this.API_KEY = 'AIzaSyB0zW4SCKKaEYtNCa2_Z_JfZ96zN4A-28I'; // Ganti dengan API Key Anda
        this.SPREADSHEET_ID = '1CmG1syUsDSdm5il6v0TwWgDZ6dvxWtnWmzD4zKh_O10'; // Ganti dengan Spreadsheet ID
        this.SHEET_NAME = 'Sheet1'; // Nama sheet
        this.RANGE = 'A:E'; // Kolom A sampai E
        this.cache = [];
        this.isOffline = false;
    }

    // Baca data dari Google Sheets
    async readData() {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.SHEET_NAME}!${this.RANGE}?key=${this.API_KEY}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Gagal mengambil data');
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                this.cache = [];
                return [];
            }
            
            // Skip header row
            const rows = data.values.slice(1);
            
            this.cache = rows.map(row => ({
                id: row[0] || Date.now().toString(),
                nama: row[1] || '',
                kategori: row[2] || '',
                jumlah: parseInt(row[3]) || 0,
                harga: parseInt(row[4]) || 0
            }));
            
            // Simpan ke cache lokal
            this.saveToLocalCache(this.cache);
            
            return this.cache;
        } catch (error) {
            console.error('Error reading data:', error);
            this.isOffline = true;
            // Ambil dari cache lokal jika offline
            return this.getLocalCache();
        }
    }

    // Tulis data ke Google Sheets
    async writeData(data) {
        try {
            // Format data untuk Google Sheets
            const values = data.map(item => [
                item.id,
                item.nama,
                item.kategori,
                item.jumlah,
                item.harga
            ]);
            
            // Tambahkan header
            const header = ['ID', 'Nama Barang', 'Kategori', 'Jumlah', 'Harga'];
            const allValues = [header, ...values];
            
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.SHEET_NAME}!${this.RANGE}?valueInputOption=RAW&key=${this.API_KEY}`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: allValues
                })
            });
            
            if (!response.ok) {
                throw new Error('Gagal menyimpan data');
            }
            
            this.cache = data;
            this.saveToLocalCache(data);
            this.isOffline = false;
            
            return await response.json();
        } catch (error) {
            console.error('Error writing data:', error);
            this.isOffline = true;
            // Simpan ke cache lokal untuk sync nanti
            this.saveToLocalCache(data);
            throw error;
        }
    }

    // Tambah barang baru
    async addItem(item) {
        const newItem = {
            id: Date.now().toString(),
            ...item,
            jumlah: parseInt(item.jumlah) || 0,
            harga: parseInt(item.harga) || 0
        };
        
        const currentData = await this.readData();
        currentData.push(newItem);
        
        await this.writeData(currentData);
        return newItem;
    }

    // Update barang
    async updateItem(id, updates) {
        const currentData = await this.readData();
        const index = currentData.findIndex(item => item.id === id);
        
        if (index === -1) {
            throw new Error('Barang tidak ditemukan');
        }
        
        currentData[index] = {
            ...currentData[index],
            ...updates
        };
        
        await this.writeData(currentData);
        return currentData[index];
    }

    // Hapus barang
    async deleteItem(id) {
        const currentData = await this.readData();
        const filteredData = currentData.filter(item => item.id !== id);
        
        await this.writeData(filteredData);
        return filteredData;
    }

    // Update jumlah (tambah/kurang)
    async updateStock(id, change) {
        const currentData = await this.readData();
        const item = currentData.find(item => item.id === id);
        
        if (!item) {
            throw new Error('Barang tidak ditemukan');
        }
        
        const newJumlah = Math.max(0, item.jumlah + change);
        return await this.updateItem(id, { jumlah: newJumlah });
    }

    // Simpan ke local cache
    saveToLocalCache(data) {
        try {
            localStorage.setItem('stockData', JSON.stringify(data));
            localStorage.setItem('stockDataTime', Date.now().toString());
        } catch (error) {
            console.error('Gagal menyimpan ke cache:', error);
        }
    }

    // Ambil dari local cache
    getLocalCache() {
        try {
            const data = localStorage.getItem('stockData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Gagal mengambil dari cache:', error);
            return [];
        }
    }

    // Sinkronisasi data offline
    async syncOfflineData() {
        const localData = this.getLocalCache();
        if (localData.length > 0) {
            try {
                await this.writeData(localData);
                return true;
            } catch (error) {
                console.error('Gagal sinkronisasi:', error);
                return false;
            }
        }
        return true;
    }
}
