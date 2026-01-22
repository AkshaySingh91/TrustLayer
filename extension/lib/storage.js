export class StorageManager {
    constructor(dbName = 'TrustLayerDB', storeName = 'cookies') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.dbPromise = this.initDB();
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 2);

            request.onerror = (event) => reject('IndexedDB error: ' + event.target.errorCode);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('terms')) {
                    db.createObjectStore('terms', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('analysis_state')) {
                    db.createObjectStore('analysis_state', { keyPath: 'domain' });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
        });
    }

    async getCookie(id) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveCookie(cookieData) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(cookieData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllCookies() {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getTermsAnalysis(domain, type) {
        const db = await this.dbPromise;
        return new Promise((resolve) => {
            const transaction = db.transaction(['terms'], 'readonly');
            const store = transaction.objectStore('terms');
            const request = store.get(`${domain}::${type}`);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    async saveTermsAnalysis(analysis) {
        const db = await this.dbPromise;
        // analysis: { id: "domain::type", domain, type, summary, risk_score, timestamp, ... }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['terms'], 'readwrite');
            const store = transaction.objectStore('terms');
            store.put(analysis);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getAnalysisState(domain) {
        const db = await this.dbPromise;
        return new Promise((resolve) => {
            const transaction = db.transaction(['analysis_state'], 'readonly');
            const store = transaction.objectStore('analysis_state');
            const request = store.get(domain);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    async setAnalysisState(domain, status, progress = 0, details = null) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['analysis_state'], 'readwrite');
            const store = transaction.objectStore('analysis_state');
            store.put({ domain, status, progress, details, timestamp: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}
