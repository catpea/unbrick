/**
 * Safe ASUS AURA Controller
 * Implements BLACK STATE MACHINE methodology
 * 
 * State Flow:
 *   BOOT → LOCKED → RUNTIME → COMMITTED
 * 
 * Safety guarantees:
 * - Topology always initialized before operations
 * - No commits without topology
 * - Automatic state tracking
 * - Safe recovery from bricked states
 */

const { AuraProtocol } = require('./protocol');

// BLACK STATE MACHINE states
const States = {
    DISCONNECTED: 'DISCONNECTED',
    LOCKED: 'LOCKED',           // After boot/reset, before topology init
    RUNTIME: 'RUNTIME',         // After topology init, can set colors
    COMMITTED: 'COMMITTED'      // After commit, changes persisted
};

class SafeAuraController {
    constructor(options = {}) {
        this.protocol = new AuraProtocol();
        this.protocol.verbose = options.verbose || false;
        
        // BLACK STATE MACHINE state tracking
        this.state = States.DISCONNECTED;
        
        // Default topology (can be overridden)
        this.topology = options.topology || {
            0: 15,  // Channel 0: 15 LEDs
            1: 15,  // Channel 1: 15 LEDs
            2: 16   // Channel 2: 16 LEDs
        };
        
        this.verbose = options.verbose || false;
    }

    /**
     * Connect to device and initialize topology
     * AUTO-INITIALIZES: DISCONNECTED → LOCKED → RUNTIME
     */
    connect() {
        this.protocol.connect();
        this.state = States.LOCKED;
        
        if (this.verbose) {
            console.log('[BSM] State: DISCONNECTED → LOCKED');
        }
        
        // CRITICAL: Always initialize topology on connect
        // This is the key insight from reverse engineering
        this.initTopology();
    }

    /**
     * Disconnect from device
     */
    disconnect() {
        this.protocol.disconnect();
        this.state = States.DISCONNECTED;
        
        if (this.verbose) {
            console.log('[BSM] State: → DISCONNECTED');
        }
    }

    /**
     * Initialize topology (LOCKED → RUNTIME)
     * MUST be called before any color/mode operations
     */
    initTopology() {
        if (this.state === States.DISCONNECTED) {
            throw new Error('[BSM] Cannot init topology while disconnected');
        }

        if (this.verbose) {
            console.log('[BSM] Initializing topology...');
        }

        // Send topology init for each channel
        for (const [channel, count] of Object.entries(this.topology)) {
            this.protocol.setLEDCount(parseInt(channel), count);
            
            if (this.verbose) {
                console.log(`  Channel ${channel}: ${count} LEDs`);
            }
        }

        this.state = States.RUNTIME;
        
        if (this.verbose) {
            console.log('[BSM] State: LOCKED → RUNTIME');
        }
    }

    /**
     * GUARD: Ensure we're in RUNTIME state
     */
    _ensureRuntime() {
        if (this.state === States.DISCONNECTED) {
            throw new Error('[BSM] Not connected');
        }
        
        if (this.state === States.LOCKED) {
            if (this.verbose) {
                console.log('[BSM] Auto-initializing topology...');
            }
            this.initTopology();
        }
    }

    /**
     * Set color for a single LED
     * AUTO-GUARDS: Ensures topology initialized
     */
    setLED(channel, ledIndex, r, g, b) {
        this._ensureRuntime();
        
        this.protocol.setDirectLED(channel, ledIndex, [{ r, g, b }]);
    }

    /**
     * Set color for all LEDs on a channel
     */
    setAllLEDs(channel, r, g, b) {
        this._ensureRuntime();
        
        const count = this.topology[channel] || 16;
        const colors = Array(count).fill({ r, g, b });
        
        this.protocol.setDirectLED(channel, 0, colors);
    }

    /**
     * Set effect mode
     */
    setEffect(channel, mode, r = 0, g = 0, b = 0, brightness = 0xFF) {
        this._ensureRuntime();
        
        this.protocol.setEffect(channel, mode, r, g, b, brightness);
    }

    /**
     * Commit current state to EEPROM
     * GUARD: Only allowed in RUNTIME state
     */
    commit() {
        if (this.state !== States.RUNTIME) {
            throw new Error(`[BSM] Cannot commit in state: ${this.state}`);
        }

        if (this.verbose) {
            console.log('[BSM] Committing to EEPROM...');
        }

        this.protocol.commit();
        this.state = States.COMMITTED;
        
        if (this.verbose) {
            console.log('[BSM] State: RUNTIME → COMMITTED');
        }
    }

    /**
     * Read current CONFIG_TABLE
     */
    getConfig() {
        if (this.state === States.DISCONNECTED) {
            throw new Error('[BSM] Not connected');
        }
        
        return this.protocol.getConfig();
    }

    /**
     * Get current BLACK STATE MACHINE state
     */
    getState() {
        return this.state;
    }

    /**
     * RECOVERY: Detect if system is in bricked state
     */
    isBricked() {
        try {
            const config = this.getConfig();
            
            // Check if any channel has 0 or suspiciously low LED count
            const ch0 = config.channel0_leds;
            const ch1 = config.channel1_leds;
            const ch2 = config.channel2_leds;
            
            // Bricked if any channel is 0 or all are same unusual value
            if (ch0 === 0 || ch1 === 0 || ch2 === 0) {
                return true;
            }
            
            // All same value suggests accidental global set
            if (ch0 === ch1 && ch1 === ch2 && ch0 !== 15) {
                return true;
            }
            
            return false;
            
        } catch (error) {
            // If we can't read config, assume bricked
            return true;
        }
    }

    /**
     * RECOVERY: Unbrick the device
     * Returns to safe topology
     */
    unbrick(targetTopology = null) {
        if (this.verbose) {
            console.log('[BSM] === UNBRICK PROCEDURE ===');
        }

        const topology = targetTopology || this.topology;

        // Force topology init (even if state is wrong)
        for (const [channel, count] of Object.entries(topology)) {
            this.protocol.setLEDCount(parseInt(channel), count);
            
            if (this.verbose) {
                console.log(`  Setting Channel ${channel}: ${count} LEDs`);
            }
        }

        // Commit to EEPROM
        this.protocol.commit();
        
        if (this.verbose) {
            console.log('[BSM] Committed recovery topology');
        }

        // Verify
        const config = this.getConfig();
        const success = config.channel2_leds >= 16; // At least check channel 2
        
        if (this.verbose) {
            console.log('[BSM] Recovery ' + (success ? 'SUCCESS' : 'FAILED'));
        }

        this.state = States.COMMITTED;
        return success;
    }
}

module.exports = { SafeAuraController, States };
