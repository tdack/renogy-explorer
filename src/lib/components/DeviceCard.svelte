<script lang="ts">
  import AlarmsList from './AlarmsList.svelte';

  interface Device {
    deviceId: string;
    name: string;
    onlineStatus: 'online' | 'offline';
    isSubDevice?: boolean;
    parentDeviceName?: string;
    category: string;
    sku?: string;
  }

  interface Alarm {
    alarmName?: string;
    code?: string;
    alarmLevel?: string;
  }

  interface Props {
    device: Device;
    deviceAlarms?: Alarm[];
  }

  let { device, deviceAlarms = [] }: Props = $props();
</script>

<div class="bg-white rounded-lg shadow-md p-6 border-l-4" class:border-green-500={device.onlineStatus === 'online'} class:border-gray-300={device.onlineStatus !== 'online'}>
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-bold text-gray-700">
      <a href="/device/{device.deviceId}?name={encodeURIComponent(device.name)}&category={encodeURIComponent(device.category)}" class="text-blue-500 hover:underline">
        {device.name}
      </a>
    </h2>
    <div class="flex gap-2">
      <span class="px-3 py-1 text-sm font-semibold rounded-full" class:bg-green-100={device.onlineStatus === 'online'} class:text-green-800={device.onlineStatus === 'online'} class:bg-gray-100={device.onlineStatus !== 'online'} class:text-gray-800={device.onlineStatus !== 'online'} >
        {device.onlineStatus}
      </span>
      {#if deviceAlarms && deviceAlarms.length > 0}
        <span class="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
          {deviceAlarms.length} Alarm{deviceAlarms.length !== 1 ? 's' : ''}
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

  <AlarmsList alarms={deviceAlarms} />
</div>
