export class HealthManager {
    constructor() {
        this.history = []; // Rolling window of results
        this.WINDOW_SIZE = 5;
        this.status = 'unknown'; // 'online', 'offline', 'unstable', 'starting'
        this.pollInterval = 2000;
        this.onStatusChange = null;
        this.timer = null;
        // Use 127.0.0.1 to avoid potential localhost resolution issues
        this.endpoint = 'http://127.0.0.1:8000/health';
    }

    start(onStatusChangeCallback) {
        this.onStatusChange = onStatusChangeCallback;
        this.poll();
    }

    stop() {
        if (this.timer) clearTimeout(this.timer);
    }

    async poll() {
        const result = await this.checkEndpoint();
        this.updateHistory(result);

        const newStatus = this.computeStatus();
        if (newStatus !== this.status) {
            this.status = newStatus;
            console.log(`Health State Change: ${newStatus}`);
            if (this.onStatusChange) {
                this.onStatusChange(this.status, result ? result.data : null);
            }
        }

        // Adaptive Scheduling
        let nextInterval = this.pollInterval;

        if (result && result.success) {
            // Success: Reset backoff
            this.pollInterval = 2000;
            nextInterval = 2000;
        } else {
            // Failure: Exponential Backoff
            this.pollInterval = Math.min(this.pollInterval * 1.5, 15000);
            nextInterval = this.pollInterval;
        }

        // Jitter (+- 300ms)
        const jitter = Math.floor(Math.random() * 600) - 300;
        const delay = Math.max(1000, nextInterval + jitter);

        this.timer = setTimeout(() => this.poll(), delay);
    }

    async checkEndpoint() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const res = await fetch(`${this.endpoint}?ts=${Date.now()}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return { success: true, data };
            }
            return { success: false };
            return { success: false };
        } catch (e) {
            console.warn(`Health Check Failed: ${e.message}`);
            return { success: false };
        }
    }

    updateHistory(result) {
        this.history.push(result);
        if (this.history.length > this.WINDOW_SIZE) {
            this.history.shift();
        }
    }

    computeStatus() {
        if (this.history.length === 0) return 'offline';

        const successes = this.history.filter(r => r.success).length;
        const latest = this.history[this.history.length - 1];

        // Specific Server States
        if (latest.success && latest.data && latest.data.status === 'starting') {
            return 'starting';
        }

        // Sliding Window Logic
        if (successes >= 3) return 'online';
        if (successes <= 1) return 'offline';

        return 'unstable'; // 2 successes in window
    }
}
