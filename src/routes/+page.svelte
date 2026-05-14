<script lang="ts">
  import { onMount } from 'svelte';

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
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4" class:border-green-500={device.onlineStatus === 'online'} class:border-gray-300={device.onlineStatus !== 'online'}>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-gray-700"><a href="/device/{device.deviceId}?name={encodeURIComponent(device.name)}&category={encodeURIComponent(device.category)}" class="text-blue-500 hover:underline">{device.name}</a></h2>
            <div class="flex gap-2">
              <span class="px-3 py-1 text-sm font-semibold rounded-full" class:bg-green-100={device.onlineStatus === 'online'} class:text-green-800={device.onlineStatus === 'online'} class:bg-gray-100={device.onlineStatus !== 'online'} class:text-gray-800={device.onlineStatus !== 'online'} >
                {device.onlineStatus}
              </span>
              {#if deviceAlarms[device.deviceId] && deviceAlarms[device.deviceId].length > 0}
                <span class="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                  {deviceAlarms[device.deviceId].length} Alarm{deviceAlarms[device.deviceId].length !== 1 ? 's' : ''}
                </span>
              {/if}
            </div>
          </div>
          {#if device.isSubDevice}
            <p class="text-sm text-gray-500 mb-2">Sub-device of: {device.parentDeviceName}</p>
          {/if}
          <div class="text-gray-600">
            <p><strong>Category:</strong> {device.category}</p>
            <p><strong>SKU:</strong> {device.sku || 'N/A'}</p>
            <p><strong>Device ID:</strong> <span class="font-mono text-sm">{device.deviceId}</span></p>
          </div>
          {#if deviceAlarms[device.deviceId] && deviceAlarms[device.deviceId].length > 0}
            <div class="mt-4 p-3 bg-red-50 rounded-lg">
              <h3 class="text-sm font-semibold text-red-800 mb-2">Active Alarms:</h3>
              <ul class="space-y-1">
                {#each deviceAlarms[device.deviceId] as alarm}
                  <li class="text-xs text-red-700">
                    <span class="font-semibold">{alarm.alarmName || alarm.code}</span>
                    {#if alarm.alarmLevel}
                      <span class="ml-2 text-red-600">({alarm.alarmLevel})</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
