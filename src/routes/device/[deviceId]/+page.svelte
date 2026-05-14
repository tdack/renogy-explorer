<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let details = $state<any>({});
  let dataMap = $state<any[]>([]);
  let error = $state<string | null>(null);
  let isLoading = $state(true);

  const deviceId = $page.params.deviceId;
  const deviceName = $page.url.searchParams.get('name') || '';
  const deviceCategory = $page.url.searchParams.get('category') || '';

  // Controller battery type values from:
  // 1. https://renogy-website.oss-us-east-1.aliyuncs.com/DeveloperPlatform/DCC_Charger_Controller_Modbus_Protocol_V1.0_EN.pdf
  // 2. https://renogy-website.oss-us-east-1.aliyuncs.com/DeveloperPlatform/Solar_Charger_Controller_Modbus_Protocol_V1.0_EN.pdf
  const controllerBatteryTypeLabels: { [key: string]: string } = {
    '00': 'User',
    '01': 'FLD',
    '02': 'SLD',
    '03': 'GEL',
    '04': 'LI'
  };

  // Inverter battery type values from https://renogy-website.oss-us-east-1.aliyuncs.com/DeveloperPlatform/Inverter_Modbus_Protocol_V1.0_EN.pdf
  const inverterBatteryTypeLabels: { [key: string]: string } = {
    '00': 'UserDef',
    '01': 'SLD',
    '02': 'FLD',
    '03': 'GEL',
    '04': 'LFP14(48v)',
    '05': 'LFP15(48v)',
    '06': 'LFP16(48v)',
    '0C': 'N13',
    '0D': 'N14',
    '0E': 'LFP4(12V)'
  };

  // Solar yield data
  let currentMonthYield = $state<number>(0);
  let previousMonthYield = $state<number>(0);
  const isController = deviceCategory.toLowerCase() === 'controller';
  const isMPPT = deviceCategory.toLowerCase() === 'mppt';

  onMount(async () => {
    try {
      // Fetch latest data and datamap in parallel
      const [detailsResponse, dataMapResponse] = await Promise.all([
        fetch(`/api/renogy/device/data/latest/${deviceId}`),
        fetch(`/api/renogy/device/datamap/${deviceId}`)
      ]);

      if (detailsResponse.ok) {
        const data = await detailsResponse.json();
        details = data.data || {};
      } else {
        const errorData = await detailsResponse.json();
        throw new Error(errorData.error || `Failed to fetch device details (Status: ${detailsResponse.status})`);
      }

      if (dataMapResponse.ok) {
        dataMap = await dataMapResponse.json();
      } else {
        const errorData = await dataMapResponse.json();
        throw new Error(errorData.error || `Failed to fetch device data map (Status: ${dataMapResponse.status})`);
      }

      // Fetch solar yield data for current and previous month if this is a controller
      if (isController || isMPPT) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-indexed
        const previousMonth = (currentMonth - 1 + 12) % 12; // Handle month wraparound

        const [currentMonthResponse, previousMonthResponse] = await Promise.all([
          fetch(`/api/renogy/device/data/history/${deviceId}?year=${currentYear}&month=${currentMonth + 1}&utcOffsetHours=-8`),
          fetch(`/api/renogy/device/data/history/${deviceId}?year=${currentYear}&month=${previousMonth + 1}&utcOffsetHours=-8`)
        ]);

        if (currentMonthResponse.ok) {
          const currentMonthData = await currentMonthResponse.json();
          currentMonthYield = currentMonthData.reduce((sum: number, item: any) => sum + item.generatePower, 0);
        }

        if (previousMonthResponse.ok) {
          const previousMonthData = await previousMonthResponse.json();
          previousMonthYield = previousMonthData.reduce((sum: number, item: any) => sum + item.generatePower, 0);
        }
      }

    } catch (e: any) {
      error = e.message;
      console.error('Fetch Error:', e);
    } finally {
      isLoading = false;
    }
  });

  function getParameterInfo(paramName: string) {
    if (!Array.isArray(dataMap)) return {};
    return dataMap.find(p => p.name === paramName) || {};
  }

  function isBatteryTypeParameter(key: string, info: any) {
    const param = `${key}`.toLowerCase();
    const desc = `${info?.desc || ''}`.toLowerCase();
    return /battery.*type/.test(param) || /battery.*type/.test(desc);
  }

  type FormattedParameter = {
    value: string;
    unit?: string;
  };

  function formatParameterValue(key: string, value: any, info: any): FormattedParameter {
    if (isBatteryTypeParameter(key, info)) {
      const batteryLabels = deviceCategory.toLowerCase() === 'inverter' ? inverterBatteryTypeLabels : controllerBatteryTypeLabels;
      // For inverters, values are decimal but keys are hex; for controllers, both are hex strings
      const batteryValue = deviceCategory.toLowerCase() === 'inverter' 
        ? Number(value).toString(16).padStart(2, '0').toUpperCase()
        : String(value).padStart(2, '0');
      return {
        value: batteryLabels[batteryValue] ?? String(value),
        unit: info.unit
      };
    }

    if (info.type === 'float') {
      if (info.unit === 'mA') {
        return {
          value: (Number(value) / 1000).toFixed(2),
          unit: 'A'
        };
      }
      return {
        value: Number(value).toFixed(2),
        unit: info.unit
      };
    }

    return {
      value: String(value),
      unit: info.unit
    };
  }
</script>

<svelte:head>
  <title>Device Details: {deviceId}</title>
</svelte:head>

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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Object.entries(details) as [key, value]}
          {@const info = getParameterInfo(key)}
          {@const formatted = formatParameterValue(key, value, info)}
          <div class="flex flex-col justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <p class="text-sm font-semibold text-gray-600 capitalize">{info.desc || key.replace(/([A-Z])/g, ' $1')}</p>
              <p class="text-2xl font-bold text-gray-800">
                {formatted.value}
                {#if formatted.unit}
                  <span class="text-lg font-normal text-gray-500">{formatted.unit}</span>
                {/if}
              </p>
            </div>
            <div class="text-xs text-gray-400 mt-2">
              {#if info.operation}<span>{info.operation}</span>{/if}
              {#if info.type}<span class="ml-2">({info.type})</span>{/if}
            </div>
          </div>
        {/each}
      </div>

      {#if isController || isMPPT}
        <div class="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold mb-6 text-gray-700">Solar Yield</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-4 bg-blue-50 rounded-lg">
              <p class="text-sm font-semibold text-blue-800 mb-2">Current Month</p>
              <p class="text-3xl font-bold text-blue-600">{currentMonthYield.toLocaleString()} Wh</p>
            </div>
            <div class="p-4 bg-green-50 rounded-lg">
              <p class="text-sm font-semibold text-green-800 mb-2">Previous Month</p>
              <p class="text-3xl font-bold text-green-600">{previousMonthYield.toLocaleString()} Wh</p>
            </div>
          </div>
          {#if currentMonthYield > 0 || previousMonthYield > 0}
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-600">
                {#if currentMonthYield > previousMonthYield}
                  <span class="text-green-600 font-semibold">↑</span>
                  Current month is {(currentMonthYield - previousMonthYield).toLocaleString()} Wh higher than previous month
                {:else if currentMonthYield < previousMonthYield}
                  <span class="text-red-600 font-semibold">↓</span>
                  Current month is {(previousMonthYield - currentMonthYield).toLocaleString()} Wh lower than previous month
                {:else}
                  Both months have equal yield
                {/if}
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
