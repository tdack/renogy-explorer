<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { DeviceDetails } from '$lib';
  import { createFormatParameter } from '$lib/utils/formatParameter';

  let details = $state<any>({});
  let dataMap = $state<any[]>([]);
  let error = $state<string | null>(null);
  let isLoading = $state(true);

  const deviceId = $page.params.deviceId;
  const deviceName = $page.url.searchParams.get('name') || '';
  const deviceCategory = $page.url.searchParams.get('category') || '';

  const safeDeviceName: string = deviceName ?? '';
  const safeDeviceCategory: string = deviceCategory ?? '';

  // Controller battery type values from:
  // 1. https://renogy-website.oss-us-east-1.aliyuncs.com/DeveloperPlatform/DCC_Charger_Controller_Modbus_Protocol_V1.0_EN.pdf
  // 2. https://renogy-website.oss-us-east-1.aliyuncs.com/DeveloperPlatform/Solar_Charger_Controller_Modbus_Protocol_V1.0_EN.pdf
  

  // Solar yield data
  let currentMonthYield = $state<number>(0);
  let previousMonthYield = $state<number>(0);
  let currentMonthData = $state<any[]>([]);
  let previousMonthData = $state<any[]>([]);
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

        const localUtcOffset = Math.round(new Date().getTimezoneOffset() / -60);

        const [currentMonthResponse, previousMonthResponse] = await Promise.all([
          fetch(`/api/renogy/device/data/history/${deviceId}?year=${currentYear}&month=${currentMonth + 1}&utcOffsetHours=${localUtcOffset}`),
          fetch(`/api/renogy/device/data/history/${deviceId}?year=${currentYear}&month=${previousMonth + 1}&utcOffsetHours=${localUtcOffset}`)
        ]);

        if (currentMonthResponse.ok) {
          currentMonthData = await currentMonthResponse.json();
          currentMonthYield = currentMonthData.reduce((sum: number, item: any) => sum + item.generatePower, 0);
        }

        if (previousMonthResponse.ok) {
          previousMonthData = await previousMonthResponse.json();
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

  const formatParameterValue = createFormatParameter(deviceCategory);
</script>

<svelte:head>
  <title>Device Details: {deviceId}</title>
</svelte:head>

<DeviceDetails
  deviceId={String(deviceId)}
  deviceName={String(safeDeviceName)}
  deviceCategory={String(safeDeviceCategory)}
  {details}
  {dataMap}
  {currentMonthYield}
  {previousMonthYield}
  {currentMonthData}
  {previousMonthData}
  isLoading={isLoading}
  error={error}
  {formatParameterValue}
/> 
