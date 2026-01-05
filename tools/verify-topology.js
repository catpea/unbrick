#!/usr/bin/env node

/**
 * Verify AURA Topology
 * Checks current LED configuration
 */

const { SafeAuraController } = require('../src/aura-safe');

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('ASUS AURA TOPOLOGY VERIFICATION');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const aura = new SafeAuraController({ verbose: false });

try {
    aura.connect();
    
    const config = aura.getConfig();
    
    console.log('Current Configuration:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Channel 0: ${config.channel0_leds} LEDs`);
    console.log(`  Channel 1: ${config.channel1_leds} LEDs`);
    console.log(`  Channel 2: ${config.channel2_leds} LEDs`);
    console.log('');
    
    console.log('BLACK STATE MACHINE:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Current State: ${aura.getState()}`);
    console.log(`  Bricked: ${aura.isBricked() ? 'YES ⚠️' : 'NO ✓'}`);
    console.log('');
    
    if (aura.isBricked()) {
        console.log('⚠️  WARNING: Bricked state detected!');
        console.log('');
        console.log('Run: npm run unbrick');
        console.log('');
    } else {
        console.log('✓ Topology is valid');
        console.log('');
        
        // Test LED 10 if channel 2 has enough LEDs
        if (config.channel2_leds >= 10) {
            console.log('Testing LED 10 (index 9) on Channel 2...');
            aura.setLED(2, 9, 255, 0, 0);  // RED
            
            console.log('');
            console.log('🔴 LED 10 should be RED for 3 seconds...');
            console.log('');
            
            setTimeout(() => {
                aura.setLED(2, 9, 0, 0, 0);  // OFF
                console.log('Test complete.');
                console.log('');
                aura.disconnect();
            }, 3000);
        } else {
            console.log(`⚠️  Channel 2 only has ${config.channel2_leds} LEDs`);
            console.log('   Expected: 16 LEDs');
            console.log('');
            console.log('Run: npm run unbrick');
            console.log('');
            aura.disconnect();
        }
    }
    
} catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
}
