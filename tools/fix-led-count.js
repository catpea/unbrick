#!/usr/bin/env node

/**
 * Quick fix for LED count issue
 * Sets Channel 2 to 16 LEDs
 */

const { SafeAuraController } = require('../src/aura-safe');

console.log('');
console.log('Fixing Channel 2 LED count to 16...');
console.log('');

const aura = new SafeAuraController({ verbose: true });

try {
    aura.connect();
    
    // Force correct topology
    const targetTopology = {
        0: 15,
        1: 15,
        2: 16
    };
    
    aura.unbrick(targetTopology);
    
    console.log('');
    console.log('✓ Fix applied!');
    console.log('');
    
    aura.disconnect();
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
