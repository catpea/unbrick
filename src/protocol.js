/**
 * Low-level ASUS AURA USB Protocol
 * Based on empirical reverse engineering
 *
 * Zero dependencies - uses custom HID wrapper with Node.js built-ins
 */

const HID = require('./hid');

const ASUS_VENDOR_ID = 0x0b05;
const AURA_PRODUCT_ID = 0x19af;
const PACKET_SIZE = 65;

class AuraProtocol {
    constructor() {
        this.device = null;
        this.verbose = false;
    }

    /**
     * Connect to ASUS Aura USB controller
     */
    connect() {
        const devices = HID.devices();
        const auraDevice = devices.find(d =>
            d.vendorId === ASUS_VENDOR_ID &&
            d.productId === AURA_PRODUCT_ID
        );

        if (!auraDevice) {
            throw new Error('ASUS Aura controller not found (0b05:19af)');
        }

        this.device = new HID.HID(auraDevice.path);
        if (this.verbose) {
            console.log('✓ Connected to ASUS Aura controller');
            console.log(`  Path: ${auraDevice.path}`);
        }
    }

    /**
     * Disconnect from device
     */
    disconnect() {
        if (this.device) {
            this.device.close();
            this.device = null;
            if (this.verbose) console.log('✓ Disconnected');
        }
    }

    /**
     * Send raw HID packet
     */
    sendPacket(packet, waitResponse = false) {
        if (!this.device) throw new Error('Not connected');
        if (packet.length !== PACKET_SIZE) {
            throw new Error(`Packet must be ${PACKET_SIZE} bytes`);
        }

        if (this.verbose) {
            console.log('→ Sending:', this.formatPacket(packet));
        }

        this.device.write(Array.from(packet));

        if (waitResponse) {
            const response = this.device.readTimeout(1000);
            if (response && this.verbose) {
                console.log('← Response:', this.formatPacket(Buffer.from(response)));
            }
            return response ? Buffer.from(response) : null;
        }

        return null;
    }

    /**
     * Format packet for display
     */
    formatPacket(packet) {
        const hex = Array.from(packet.slice(0, 16))
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
        return `${hex} ... (${packet.length} bytes)`;
    }

    /**
     * Create zero-filled packet
     */
    createPacket() {
        return Buffer.alloc(PACKET_SIZE);
    }

    /**
     * 0xB0 - Request configuration table
     */
    getConfig() {
        const packet = this.createPacket();
        packet[0] = 0xEC;
        packet[1] = 0xB0;

        const response = this.sendPacket(packet, true);
        if (!response || response[0] !== 0xEC || response[1] !== 0x30) {
            throw new Error('Invalid config response');
        }

        return {
            raw: response,
            configBytes: response,
            channel0_leds: response[0x0A],
            channel1_leds: response[0x10],
            channel2_leds: response[0x16],
        };
    }

    /**
     * 0x52 0x53 - Set LED count for channel (TOPOLOGY INIT)
     * CRITICAL: This is the runtime topology initializer
     */
    setLEDCount(channel, count) {
        const packet = this.createPacket();
        packet[0] = 0xEC;
        packet[1] = 0x52;
        packet[2] = 0x53;
        packet[3] = channel;
        packet[4] = count;

        this.sendPacket(packet);
    }

    /**
     * 0x3F 0x55 - Commit runtime state to EEPROM
     * CRITICAL: Only works after topology init
     */
    commit() {
        const packet = this.createPacket();
        packet[0] = 0xEC;
        packet[1] = 0x3F;
        packet[2] = 0x55;

        this.sendPacket(packet);
    }

    /**
     * 0x35 - Set effect mode
     */
    setEffect(channel, mode, r = 0, g = 0, b = 0, brightness = 0xFF) {
        const packet = this.createPacket();
        packet[0] = 0xEC;
        packet[1] = 0x35;
        packet[2] = channel;
        packet[3] = mode;
        packet[4] = r;
        packet[5] = g;
        packet[6] = b;
        packet[7] = brightness;

        this.sendPacket(packet);
    }

    /**
     * 0x40 - Direct LED color control
     */
    setDirectLED(channel, offset, colors) {
        const packet = this.createPacket();
        packet[0] = 0xEC;
        packet[1] = 0x40;
        packet[2] = 0x80 | channel;  // OR with 0x80 for mainboard
        packet[3] = offset;
        packet[4] = colors.length;

        for (let i = 0; i < colors.length && i < 20; i++) {
            const idx = 0x05 + (i * 3);
            packet[idx + 0] = colors[i].r;
            packet[idx + 1] = colors[i].g;
            packet[idx + 2] = colors[i].b;
        }

        this.sendPacket(packet);
    }
}

module.exports = { AuraProtocol, ASUS_VENDOR_ID, AURA_PRODUCT_ID, PACKET_SIZE };
