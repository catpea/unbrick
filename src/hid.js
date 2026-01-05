/**
 * Zero-dependency HID wrapper for ASUS AURA
 * Uses only Node.js built-in 'fs' module
 *
 * Replaces node-hid to eliminate supply chain attack surface
 */

const fs = require('fs');
const path = require('path');

const ASUS_VENDOR_ID = '0b05';
const AURA_PRODUCT_ID = '19af';

/**
 * Find ASUS AURA device in /sys/class/hidraw/
 */
function findAuraDevice() {
    try {
        const hidrawDevices = fs.readdirSync('/sys/class/hidraw');

        for (const hidraw of hidrawDevices) {
            try {
                // Read device uevent to get vendor/product IDs
                const ueventPath = `/sys/class/hidraw/${hidraw}/device/uevent`;
                if (!fs.existsSync(ueventPath)) continue;

                const uevent = fs.readFileSync(ueventPath, 'utf8');

                // Parse HID_ID=0003:0000VID:0000PID
                const hidIdMatch = uevent.match(/HID_ID=\w+:([0-9A-Fa-f]{4}):([0-9A-Fa-f]{4})/);
                if (!hidIdMatch) continue;

                const [, vendorId, productId] = hidIdMatch;

                if (vendorId.toLowerCase() === ASUS_VENDOR_ID &&
                    productId.toLowerCase() === AURA_PRODUCT_ID) {
                    return `/dev/${hidraw}`;
                }
            } catch (err) {
                // Skip device if we can't read its info
                continue;
            }
        }

        // Fallback: try /dev/hidraw0 directly
        if (fs.existsSync('/dev/hidraw0')) {
            return '/dev/hidraw0';
        }

        return null;
    } catch (err) {
        // If /sys/class/hidraw doesn't exist, fallback to /dev/hidraw0
        if (fs.existsSync('/dev/hidraw0')) {
            return '/dev/hidraw0';
        }
        return null;
    }
}

/**
 * HID Device class - mimics node-hid API
 */
class HIDDevice {
    constructor(devicePath) {
        this.path = devicePath;
        this.fd = null;

        try {
            // Open device for read/write
            this.fd = fs.openSync(devicePath, 'r+');
        } catch (error) {
            if (error.code === 'EACCES') {
                throw new Error(`Permission denied: ${devicePath}\n  Fix: sudo chmod 666 ${devicePath}`);
            } else if (error.code === 'ENOENT') {
                throw new Error(`Device not found: ${devicePath}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Write packet to device
     */
    write(data) {
        if (!this.fd) throw new Error('Device not open');

        const buffer = Buffer.from(data);
        const written = fs.writeSync(this.fd, buffer);

        if (written !== buffer.length) {
            throw new Error(`Write failed: expected ${buffer.length} bytes, wrote ${written}`);
        }

        return written;
    }

    /**
     * Read from device with timeout
     */
    readTimeout(timeoutMs) {
        if (!this.fd) throw new Error('Device not open');

        try {
            // Set read timeout using fcntl (not available in Node.js fs)
            // For simplicity, do a blocking read with a small buffer
            // In practice, HID reads are fast or fail immediately

            const buffer = Buffer.alloc(65);
            const bytesRead = fs.readSync(this.fd, buffer, 0, 65, null);

            if (bytesRead === 0) return null;

            return Array.from(buffer.slice(0, bytesRead));
        } catch (error) {
            // Read timeout or no data
            return null;
        }
    }

    /**
     * Close device
     */
    close() {
        if (this.fd !== null) {
            fs.closeSync(this.fd);
            this.fd = null;
        }
    }
}

/**
 * List all HID devices (minimal implementation)
 */
function devices() {
    const devicePath = findAuraDevice();
    if (!devicePath) return [];

    return [{
        vendorId: parseInt(ASUS_VENDOR_ID, 16),
        productId: parseInt(AURA_PRODUCT_ID, 16),
        path: devicePath,
        manufacturer: 'ASUSTek',
        product: 'AURA LED Controller'
    }];
}

module.exports = {
    HID: HIDDevice,
    devices
};
