// ============================================
// In-Memory Redis Replacement
// ============================================
// Uses a simple Map + EventEmitter to replace
// Redis for caching,  presence, and Pub/Sub.
// No Docker or external services needed!
// ============================================

const { EventEmitter } = require('events');

class InMemoryStore {
    constructor() {
        this.store = new Map();
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
        console.log('[Cache] Using in-memory store (no Redis needed)');
    }

    // ── Key-Value Operations ──
    async get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key, value, options = {}) {
        const expiry = options.EX ? Date.now() + options.EX * 1000 : null;
        this.store.set(key, { value, expiry });
        return 'OK';
    }

    async del(key) {
        return this.store.delete(key) ? 1 : 0;
    }

    async exists(key) {
        const item = this.store.get(key);
        if (!item) return 0;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return 0;
        }
        return 1;
    }

    async incr(key) {
        const current = await this.get(key);
        const newVal = (parseInt(current) || 0) + 1;
        const item = this.store.get(key);
        const expiry = item?.expiry || null;
        this.store.set(key, { value: String(newVal), expiry });
        return newVal;
    }

    async expire(key, seconds) {
        const item = this.store.get(key);
        if (item) {
            item.expiry = Date.now() + seconds * 1000;
            return 1;
        }
        return 0;
    }

    // ── Set Operations ──
    async sAdd(key, ...members) {
        let item = this.store.get(key);
        if (!item) {
            item = { value: new Set(), expiry: null };
            this.store.set(key, item);
        }
        members.forEach(m => item.value.add(m));
        return members.length;
    }

    async sRem(key, ...members) {
        const item = this.store.get(key);
        if (!item) return 0;
        let count = 0;
        members.forEach(m => { if (item.value.delete(m)) count++; });
        return count;
    }

    async sMembers(key) {
        const item = this.store.get(key);
        if (!item) return [];
        return [...item.value];
    }

    async sIsMember(key, member) {
        const item = this.store.get(key);
        if (!item) return 0;
        return item.value.has(member) ? 1 : 0;
    }

    // ── Pub/Sub ──
    async publish(channel, message) {
        this.emitter.emit(channel, message);
        return 1;
    }

    async subscribe(channel, callback) {
        this.emitter.on(channel, callback);
    }

    async unsubscribe(channel) {
        this.emitter.removeAllListeners(channel);
    }

    // ── Misc ──
    duplicate() { return this; }
    on(event, handler) { /* suppress */ }
    async connect() { return this; }
    async quit() { this.store.clear(); }
}

// Singleton instances
const client = new InMemoryStore();
const subscriber = new InMemoryStore();

async function connectRedis() {
    return { client, subscriber };
}

function getRedisClient() {
    return client;
}

function getRedisSubscriber() {
    return subscriber;
}

module.exports = { connectRedis, getRedisClient, getRedisSubscriber };
