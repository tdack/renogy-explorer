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

<div 
  class="bg-deep-slate/40 backdrop-blur-md border rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
  class:glow-cyan={device.onlineStatus === 'online'}
  class:glow-purple={device.onlineStatus !== 'online'}
>
  <div class="flex justify-between items-start gap-4 mb-5">
    <h2 class="text-xl font-bold tracking-wide">
      <a 
        href="/device/{device.deviceId}?name={encodeURIComponent(device.name)}&category={encodeURIComponent(device.category)}" 
        class="text-cyber-cyan hover:text-white transition-colors duration-200 relative group uppercase"
      >
        {device.name}
        <span class="absolute left-0 bottom-0 w-0 h-[2px] bg-cyber-cyan transition-all duration-300 group-hover:w-full shadow-[0_0_8px_var(--color-cyber-cyan)]"></span>
      </a>
    </h2>
    <div class="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
      <span 
        class="px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider border transition-all duration-300 {device.onlineStatus === 'online' ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30 shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'bg-gray-800/60 text-gray-500 border-gray-700/40'}" 
      >
        {device.onlineStatus}
      </span>
      {#if deviceAlarms && deviceAlarms.length > 0}
        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30 shadow-[0_0_10px_rgba(255,0,85,0.25)] animate-pulse uppercase tracking-wider">
          {deviceAlarms.length} Alert{deviceAlarms.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>
  </div>

  {#if device.isSubDevice}
    <div class="flex items-center gap-1.5 text-xs text-cyber-purple/80 font-mono mb-4 uppercase tracking-wider">
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
      <span>Sub-node of: {device.parentDeviceName}</span>
    </div>
  {/if}

  <div class="space-y-2 text-sm text-gray-300 border-t border-gray-800/40 pt-4 font-mono">
    <div class="flex justify-between">
      <span class="text-gray-500 uppercase text-xs tracking-wider">Category:</span>
      <span class="text-white font-semibold capitalize">{device.category}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-500 uppercase text-xs tracking-wider">SKU:</span>
      <span class="text-white font-semibold">{device.sku || 'N/A'}</span>
    </div>
    <div class="flex justify-between items-center pt-2">
      <span class="text-gray-500 uppercase text-xs tracking-wider">Node ID:</span>
      <span class="text-xs bg-black/40 border border-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono select-all">
        {device.deviceId}
      </span>
    </div>
  </div>

  <AlarmsList alarms={deviceAlarms} />
</div>
