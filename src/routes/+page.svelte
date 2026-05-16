<script lang="ts">
  import { onMount } from 'svelte';
  import { DeviceCard } from '$lib';

  let devices = $state<any[]>([]);
  let error = $state<string | null>(null);
  let isLoading = $state(true);

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

  // Fetch alarms for each device
  const deviceAlarms = $state<Record<string, any[]>>({});

  onMount(async () => {
    if (isLoading) return;
    
    try {
      const alarmPromises = devices.map(async (device: any) => {
        const response = await fetch(`/api/renogy/device/alarm/${device.deviceId}`);
        if (response.ok) {
          const alarms = await response.json();
          deviceAlarms[device.deviceId] = alarms;
        }
      });
      await Promise.all(alarmPromises);
    } catch (e: any) {
      console.error('Alarm fetch error:', e);
    }
  });
</script>

<svelte:head>
  <title>Renogy Device Explorer</title>
</svelte:head>

<div class="container mx-auto p-4">
  <header class="mb-8">
    <h1 class="text-4xl font-bold text-center text-gray-800">Renogy Device Explorer</h1>
    <p class="text-center text-gray-500">View your Renogy devices and their status.</p>
  </header>

  {#if isLoading}
    <div class="text-center">
      <p>Loading devices...</p>
    </div>
  {:else if error}
    <div class="text-center text-red-500 bg-red-100 p-4 rounded-lg">
      <p><strong>Error:</strong> {error}</p>
    </div>
  {:else if devices.length === 0}
    <div class="text-center text-gray-500">
      <p>No devices found.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each devices as device (device.deviceId)}
        <DeviceCard {device} deviceAlarms={deviceAlarms[device.deviceId]} />
      {/each}
    </div>
  {/if}
</div>
