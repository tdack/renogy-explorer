<script lang="ts">
  import { onMount } from 'svelte';
  import { DeviceCard } from '$lib';

  let devices = $state<any[]>([]);
  let error = $state<string | null>(null);
  let isLoading = $state(true);
  const deviceAlarms = $state<Record<string, any[]>>({});

  onMount(async () => {
    try {
      const response = await fetch('/api/renogy/device/list');
      if (response.ok) {
        const data = await response.json();
        
        const mappedDevices: any[] = [];
        if (Array.isArray(data)) {
          data.forEach(mainDevice => {
            mappedDevices.push(mainDevice);
            if (mainDevice.sublist && Array.isArray(mainDevice.sublist)) {
              mainDevice.sublist.forEach((subDevice: any) => {
                // Add a property to distinguish sub-devices if needed
                subDevice.isSubDevice = true;
                subDevice.parentDeviceName = mainDevice.name;
                mappedDevices.push(subDevice);
              });
            }
          });
        }
        devices = mappedDevices;

        // Fetch alarms directly for loaded devices
        const alarmPromises = mappedDevices.map(async (device: any) => {
          try {
            const alarmResponse = await fetch(`/api/renogy/device/alarm/${device.deviceId}`);
            if (alarmResponse.ok) {
              const alarms = await alarmResponse.json();
              deviceAlarms[device.deviceId] = alarms;
            }
          } catch (e: any) {
            console.error(`Alarm fetch error for ${device.deviceId}:`, e);
          }
        });
        await Promise.all(alarmPromises);

      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to fetch devices.';
        console.error('API Error:', errorData);
      }
    } catch (e: any) {
      error = e.message;
      console.error('Fetch Error:', e);
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Renogy Device Explorer</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-7xl">
  <header class="mb-12 text-center relative py-8 border-b border-gray-800/60">
    <!-- Grid overlay background effect for header -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50"></div>
    
    <div class="relative z-10">
      <h1 class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent uppercase tracking-widest text-glow-cyan filter drop-shadow-[0_0_15px_rgba(0,243,255,0.2)]">
        Renogy Explorer
      </h1>
      <p class="text-gray-400 font-light mt-2 tracking-widest uppercase text-xs">
        Core Telemetry & Monitoring Terminal v1.0
      </p>
      
      <div class="w-32 h-[2px] mx-auto mt-6 bg-gradient-to-r from-cyber-cyan to-cyber-purple relative">
        <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyber-cyan rotate-45 border border-black shadow-[0_0_8px_var(--color-cyber-cyan)]"></div>
      </div>

      <div class="mt-8 flex justify-center relative z-20">
        <a 
          href="/live" 
          class="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest bg-gradient-to-r from-cyber-cyan to-cyber-purple border border-transparent rounded-lg text-black hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(189,0,255,0.4)] animate-pulse-glow"
        >
          🛰️ Launch Live Terminal
        </a>
      </div>
    </div>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-20">
      <div class="relative w-16 h-16">
        <div class="absolute inset-0 rounded-full border-4 border-cyber-purple/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-cyber-cyan animate-spin shadow-[0_0_15px_rgba(0,243,255,0.4)]"></div>
      </div>
      <p class="mt-6 text-sm uppercase tracking-widest text-cyber-cyan animate-pulse">Initializing Secure Telemetry link...</p>
    </div>
  {:else if error}
    <div class="max-w-md mx-auto bg-black/40 border border-cyber-pink/40 p-6 rounded-lg glow-pink text-center">
      <div class="inline-flex p-3 rounded-full bg-cyber-pink/10 text-cyber-pink mb-4">
        <svg class="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-cyber-pink uppercase tracking-wider mb-2">Terminal link Failure</h3>
      <p class="text-sm text-gray-300 font-mono">{error}</p>
    </div>
  {:else if devices.length === 0}
    <div class="text-center py-16 bg-deep-slate/30 border border-gray-800 rounded-lg max-w-md mx-auto">
      <svg class="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-400 uppercase tracking-wider text-sm">No Active Nodes Detected</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each devices as device (device.deviceId)}
        <DeviceCard {device} deviceAlarms={deviceAlarms[device.deviceId]} />
      {/each}
    </div>
  {/if}
</div>
