<script lang="ts">
  import DeviceParameters from './DeviceParameters.svelte';
  import SolarYieldChart from './SolarYieldChart.svelte';
  import YieldSummary from './YieldSummary.svelte';

  interface ParameterInfo {
    desc?: string;
    operation?: string;
    type?: string;
  }

  interface FormattedParameter {
    value: string;
    unit?: string;
  }

  interface YieldData {
    ts: number;
    generatePower: number;
  }

  interface Props {
    deviceId: string;
    deviceName?: string;
    deviceCategory?: string;
    details?: Record<string, any>;
    dataMap?: ParameterInfo[];
    currentMonthYield?: number;
    previousMonthYield?: number;
    currentMonthData?: YieldData[];
    previousMonthData?: YieldData[];
    isLoading?: boolean;
    error?: string | null;
    formatParameterValue: (key: string, value: any, info: ParameterInfo) => FormattedParameter;
  }

  let {
    deviceId,
    deviceName,
    deviceCategory,
    details = {},
    dataMap = [],
    currentMonthYield = 0,
    previousMonthYield = 0,
    currentMonthData = [],
    previousMonthData = [],
    isLoading = false,
    error = null,
    formatParameterValue
  }: Props = $props();

  // use inline checks in markup to avoid capturing initial prop value warning
</script>

<div class="container mx-auto p-6 max-w-7xl">
  <header class="mb-10 relative py-4 border-b border-gray-800/50">
    <a href="/" class="inline-flex items-center gap-1.5 text-xs font-mono text-cyber-cyan hover:text-white uppercase tracking-widest transition-colors duration-200">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Terminal Hub
    </a>
    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent uppercase tracking-widest mt-4 filter drop-shadow-[0_0_10px_rgba(0,243,255,0.15)]">
      Node: {deviceName || "Device Detail"}
    </h1>
    <p class="font-mono text-[10px] bg-cyber-cyan/5 text-cyber-cyan border border-cyber-cyan/30 px-2.5 py-1 rounded w-fit mt-2 uppercase tracking-widest shadow-[0_0_8px_rgba(0,243,255,0.1)]">
      Node Ref: {deviceId}
    </p>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-24">
      <div class="relative w-14 h-14">
        <div class="absolute inset-0 rounded-full border-4 border-cyber-cyan/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-cyber-cyan animate-spin shadow-[0_0_15px_rgba(0,243,255,0.4)]"></div>
      </div>
      <p class="mt-5 text-xs font-mono uppercase tracking-widest text-cyber-cyan animate-pulse">Requesting Node Telemetry Stream...</p>
    </div>
  {:else if error}
    <div class="max-w-md mx-auto bg-black/40 border border-cyber-pink/40 p-6 rounded-lg glow-pink text-center">
      <div class="inline-flex p-3 rounded-full bg-cyber-pink/10 text-cyber-pink mb-4">
        <svg class="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-sm font-bold text-cyber-pink uppercase tracking-widest mb-2">Telemetry Failure</h3>
      <p class="text-xs text-gray-300 font-mono">{error}</p>
    </div>
  {:else if Object.keys(details).length === 0}
    <div class="text-center py-16 bg-deep-slate/30 border border-gray-800 rounded-lg max-w-md mx-auto">
      <p class="text-gray-400 font-mono uppercase tracking-wider text-xs">No Stream Data Available</p>
    </div>
  {:else}
    <div class="bg-deep-slate/30 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 md:p-8 glow-cyan">
      <h2 class="text-lg font-bold mb-6 text-cyber-cyan uppercase tracking-widest font-mono border-b border-gray-800/40 pb-4 flex items-center gap-2">
        <span class="w-2.5 h-2.5 bg-cyber-cyan inline-block shadow-[0_0_8px_var(--color-cyber-cyan)]"></span>
        Latest Telemetry Stream
      </h2>
      <DeviceParameters {details} {dataMap} {formatParameterValue} />

      {#if (deviceCategory ?? '').toLowerCase() === 'controller' || (deviceCategory ?? '').toLowerCase() === 'mppt'}
        <div class="mt-10 pt-8 border-t border-gray-800/60">
          <h2 class="text-lg font-bold mb-6 text-cyber-purple uppercase tracking-widest font-mono flex items-center gap-2">
            <span class="w-2.5 h-2.5 bg-cyber-purple inline-block shadow-[0_0_8px_var(--color-cyber-purple)]"></span>
            Solar Yield Analytics
          </h2>
          <YieldSummary {currentMonthYield} {previousMonthYield} />
          <SolarYieldChart {currentMonthYield} {previousMonthYield} {currentMonthData} {previousMonthData} />
        </div>
      {/if}
    </div>
  {/if}
</div>
