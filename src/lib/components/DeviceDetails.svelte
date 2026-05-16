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

<div class="container mx-auto p-4">
  <header class="mb-8">
    <a href="/" class="text-blue-500 hover:underline">&larr; Back to Device List</a>
    <h1 class="text-3xl font-bold text-gray-800 mt-4">Device Details - {deviceName || ""}</h1>
    <p class="font-mono text-sm text-gray-500">{deviceId}</p>
  </header>

  {#if isLoading}
    <div class="text-center">
      <p>Loading device details...</p>
    </div>
  {:else if error}
    <div class="text-center text-red-500 bg-red-100 p-4 rounded-lg">
      <p><strong>Error:</strong> {error}</p>
    </div>
  {:else if Object.keys(details).length === 0}
    <div class="text-center text-gray-500">
      <p>No data available for this device.</p>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold mb-6 text-gray-700">Latest Parameters</h2>
      <DeviceParameters {details} {dataMap} {formatParameterValue} />

      {#if (deviceCategory ?? '').toLowerCase() === 'controller' || (deviceCategory ?? '').toLowerCase() === 'mppt'}
        <div class="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold mb-6 text-gray-700">Solar Yield</h2>
          <YieldSummary {currentMonthYield} {previousMonthYield} />
          <SolarYieldChart {currentMonthYield} {previousMonthYield} {currentMonthData} {previousMonthData} />
        </div>
      {/if}
    </div>
  {/if}
</div>
