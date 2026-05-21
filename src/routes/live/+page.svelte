<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createFormatParameter, type FormattedParameter } from '$lib/utils/formatParameter';

  interface Device {
    deviceId: string;
    name: string;
    onlineStatus: 'online' | 'offline';
    category: string;
  }

  interface ParameterInfo {
    name: string;
    desc?: string;
    type?: string;
    operation?: string;
    unit?: string;
  }

  interface DashboardSensor {
    deviceId: string;
    deviceName: string;
    deviceCategory: string;
    paramName: string;
    paramDesc: string;
    paramUnit?: string;
    paramType?: string;
  }

  let devices = $state<Device[]>([]);
  let selectedDeviceId = $state<string>('');
  let selectedDevice = $derived(devices.find(d => d.deviceId === selectedDeviceId));
  
  let datamap = $state<ParameterInfo[]>([]);
  let dashboardSensors = $state<DashboardSensor[]>([]);
  
  // Keyed by deviceId, e.g. { "device123": { "batteryVoltage": 13.2 } }
  let liveTelemetry = $state<Record<string, Record<string, any>>>({});
  let prevTelemetry = $state<Record<string, Record<string, any>>>({}); // To track and animate values on changes
  
  let isStreaming = $state(false);
  let pollIntervalSeconds = $state(10); // Defaulting to 10s for safe multi-polling, adjustable to 5, 10, 20, 30
  let countdown = $state(10);
  let countdownIntervalId: any = null;
  let isLoadingDevices = $state(true);
  let isLoadingDatamap = $state(false);
  let error = $state<string | null>(null);

  // Derived unique device IDs pinning parameters to the dashboard
  let activeDeviceIds = $derived([...new Set(dashboardSensors.map(s => s.deviceId))]);

  // Derived active count of parameters selected
  let selectedCount = $derived(dashboardSensors.length);

  // Derived API Pressure calculations (Calls/Minute) to warn user about limits
  let estCallsPerMin = $derived(isStreaming && activeDeviceIds.length > 0 ? Math.round((60 / pollIntervalSeconds) * activeDeviceIds.length) : 0);
  
  // Threat Level logic
  let riskLevel = $derived(
    estCallsPerMin === 0 ? 'safe' :
    estCallsPerMin <= 15 ? 'safe' :
    estCallsPerMin <= 28 ? 'warning' : 'danger'
  );

  // Telemetry Formatters Cache
  const formatters: Record<string, ReturnType<typeof createFormatParameter>> = {};
  function getFormatter(category: string) {
    if (!formatters[category]) {
      formatters[category] = createFormatParameter(category);
    }
    return formatters[category];
  }

  // Load devices and cached layout on mount
  onMount(async () => {
    // 1. Fetch layout from local storage
    const saved = localStorage.getItem('renogy_dashboard_sensors');
    if (saved) {
      try {
        dashboardSensors = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved dashboard layout:', e);
      }
    }

    // 2. Fetch device listing
    try {
      const res = await fetch('/api/renogy/device/list');
      if (res.ok) {
        const data = await res.json();
        const list: Device[] = [];
        if (Array.isArray(data)) {
          data.forEach((main: any) => {
            list.push(main);
            if (main.sublist && Array.isArray(main.sublist)) {
              main.sublist.forEach((sub: any) => {
                sub.isSubDevice = true;
                sub.parentDeviceName = main.name;
                list.push(sub);
              });
            }
          });
        }
        devices = list;
        if (devices.length > 0) {
          selectedDeviceId = devices[0].deviceId;
        }
      } else {
        error = 'Failed to load device listing.';
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      isLoadingDevices = false;
    }
  });

  // Watch selectedDeviceId and fetch datamap
  $effect(() => {
    if (!selectedDeviceId) return;
    
    datamap = [];
    isLoadingDatamap = true;
    error = null;

    fetchDatamap(selectedDeviceId);
  });

  // Automatically persist layout to localStorage
  $effect(() => {
    localStorage.setItem('renogy_dashboard_sensors', JSON.stringify(dashboardSensors));
  });

  async function fetchDatamap(deviceId: string) {
    try {
      const res = await fetch(`/api/renogy/device/datamap/${deviceId}`);
      if (res.ok) {
        const data = await res.json();
        datamap = Array.isArray(data) ? data : [];
      } else {
        error = 'Failed to retrieve device telemetry dictionary.';
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      isLoadingDatamap = false;
    }
  }

  // Handle telemetry fetch for all unique devices
  async function fetchLatestTelemetry() {
    if (activeDeviceIds.length === 0) return;
    try {
      // Save previous state (deep copy)
      prevTelemetry = JSON.parse(JSON.stringify(liveTelemetry));

      const fetchPromises = activeDeviceIds.map(async (deviceId) => {
        try {
          const res = await fetch(`/api/renogy/device/data/latest/${deviceId}`);
          if (res.ok) {
            const payload = await res.json();
            liveTelemetry[deviceId] = payload.data || {};
          } else {
            console.error(`Telemetry request failed for device ${deviceId} (Status: ${res.status})`);
          }
        } catch (e: any) {
          console.error(`Failed to connect to comm port for device ${deviceId}:`, e);
        }
      });

      await Promise.all(fetchPromises);
      error = null;
    } catch (e: any) {
      error = e.message;
    }
  }

  function startStream() {
    if (isStreaming) return;
    isStreaming = true;
    countdown = pollIntervalSeconds;
    
    // Fetch immediately
    fetchLatestTelemetry();

    // Setup polling countdown
    countdownIntervalId = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        countdown = pollIntervalSeconds;
        fetchLatestTelemetry();
      }
    }, 1000);
  }

  function stopStream() {
    isStreaming = false;
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
  }

  function toggleStream() {
    if (isStreaming) {
      stopStream();
    } else {
      startStream();
    }
  }

  function setPollInterval(seconds: number) {
    pollIntervalSeconds = seconds;
    if (isStreaming) {
      stopStream();
      startStream();
    } else {
      countdown = seconds;
    }
  }

  // Toggle sensor state
  function isSensorPinned(deviceId: string, paramName: string): boolean {
    return dashboardSensors.some(s => s.deviceId === deviceId && s.paramName === paramName);
  }

  function toggleSensor(device: Device, param: ParameterInfo, checked: boolean) {
    if (checked) {
      if (!isSensorPinned(device.deviceId, param.name)) {
        dashboardSensors.push({
          deviceId: device.deviceId,
          deviceName: device.name,
          deviceCategory: device.category,
          paramName: param.name,
          paramDesc: param.desc || param.name.replace(/([A-Z])/g, ' $1'),
          paramUnit: param.unit,
          paramType: param.type
        });
      }
    } else {
      dashboardSensors = dashboardSensors.filter(s => !(s.deviceId === device.deviceId && s.paramName === param.name));
    }
  }

  function removeSensor(deviceId: string, paramName: string) {
    dashboardSensors = dashboardSensors.filter(s => !(s.deviceId === deviceId && s.paramName === paramName));
  }

  function selectAllParams() {
    if (!selectedDevice) return;
    datamap.forEach(p => {
      toggleSensor(selectedDevice!, p, true);
    });
  }

  function clearAllParams() {
    if (!selectedDevice) return;
    datamap.forEach(p => {
      toggleSensor(selectedDevice!, p, false);
    });
  }

  function clearFullDashboard() {
    dashboardSensors = [];
  }

  // Cleanup timers on destroy
  onDestroy(() => {
    stopStream();
  });
</script>

<svelte:head>
  <title>Custom Telemetry Console - Renogy Explorer</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-7xl">
  <!-- Header -->
  <header class="mb-10 relative py-4 border-b border-gray-800/50">
    <a href="/" class="inline-flex items-center gap-1.5 text-xs font-mono text-cyber-cyan hover:text-white uppercase tracking-widest transition-colors duration-200">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Return to Core Hub
    </a>
    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent uppercase tracking-widest mt-4 filter drop-shadow-[0_0_10px_rgba(0,243,255,0.15)]">
      🛰️ Custom Live Telemetry Console
    </h1>
    <p class="text-gray-400 font-mono text-[10px] mt-1.5 uppercase tracking-widest">
      Mix and Match Hardware Sensor Diagnostics Terminal v2.0
    </p>
  </header>

  {#if isLoadingDevices}
    <div class="flex flex-col items-center justify-center py-24">
      <div class="relative w-14 h-14">
        <div class="absolute inset-0 rounded-full border-4 border-cyber-cyan/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-cyber-cyan animate-spin shadow-[0_0_15px_rgba(0,243,255,0.4)]"></div>
      </div>
      <p class="mt-5 text-xs font-mono uppercase tracking-widest text-cyber-cyan animate-pulse">Initializing Comm Ports...</p>
    </div>
  {:else if error && devices.length === 0}
    <div class="max-w-md mx-auto bg-black/40 border border-cyber-pink/40 p-6 rounded-lg glow-pink text-center">
      <div class="inline-flex p-3 rounded-full bg-cyber-pink/10 text-cyber-pink mb-4">
        <svg class="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-sm font-bold text-cyber-pink uppercase tracking-widest mb-2">Interface Error</h3>
      <p class="text-xs text-gray-300 font-mono">{error}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      
      <!-- Control Panel & Sensor checklist -->
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-deep-slate/30 border border-gray-800/80 p-5 rounded-xl glow-purple relative overflow-hidden">
          <h2 class="text-xs font-bold text-cyber-purple uppercase tracking-wider font-mono border-b border-gray-800/40 pb-2.5 mb-4 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-cyber-purple inline-block shadow-[0_0_4px_var(--color-cyber-purple)]"></span>
            Hardware Selector
          </h2>

          <div class="space-y-4">
            <!-- Selector -->
            <div>
              <label for="device-select" class="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">Target Node:</label>
              <select 
                id="device-select"
                bind:value={selectedDeviceId}
                class="w-full bg-black/60 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyber-purple transition-colors duration-200 cursor-pointer"
              >
                {#each devices as d}
                  <option value={d.deviceId}>{d.name} ({d.onlineStatus})</option>
                {/each}
              </select>
            </div>

            <!-- Device Meta -->
            {#if selectedDevice}
              <div class="bg-black/40 border border-gray-800/50 rounded-lg p-3 text-xs font-mono space-y-1.5 text-gray-400">
                <div class="flex justify-between">
                  <span class="uppercase text-[9px] text-gray-600">Category:</span>
                  <span class="text-white capitalize text-[11px]">{selectedDevice.category}</span>
                </div>
                <div class="flex justify-between">
                  <span class="uppercase text-[9px] text-gray-600">Comm Status:</span>
                  <span class={selectedDevice.onlineStatus === 'online' ? 'text-cyber-cyan font-bold uppercase' : 'text-gray-500 uppercase'}>
                    {selectedDevice.onlineStatus}
                  </span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Parameters Checklist -->
        <div class="bg-deep-slate/30 border border-gray-800/80 p-5 rounded-xl glow-cyan flex flex-col h-[400px]">
          <h2 class="text-xs font-bold text-cyber-cyan uppercase tracking-wider font-mono border-b border-gray-800/40 pb-2.5 mb-3 flex justify-between items-center">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-cyber-cyan inline-block shadow-[0_0_4px_var(--color-cyber-cyan)]"></span>
              Sensors Library
            </span>
          </h2>

          {#if isLoadingDatamap}
            <div class="flex-1 flex flex-col items-center justify-center">
              <div class="w-6 h-6 border-2 border-t-cyber-cyan border-cyber-cyan/20 rounded-full animate-spin"></div>
              <p class="text-[9px] font-mono mt-3 uppercase tracking-wider text-cyber-cyan animate-pulse">Mapping Dictionary...</p>
            </div>
          {:else}
            <!-- Toggle control links -->
            <div class="flex justify-between mb-3 text-[9px] font-mono uppercase tracking-wider">
              <button onclick={selectAllParams} class="text-cyber-cyan/80 hover:text-white transition-colors duration-150 cursor-pointer">Pin All</button>
              <button onclick={clearAllParams} class="text-gray-500 hover:text-white transition-colors duration-150 cursor-pointer">Unpin All</button>
            </div>

            <!-- Parameters checklist scrollbox -->
            <div class="flex-1 overflow-y-auto pr-1 space-y-2 select-none">
              {#each datamap as param}
                {@const isPinned = isSensorPinned(selectedDeviceId, param.name)}
                <label class="flex items-start gap-2.5 p-2 rounded cursor-pointer transition-all duration-150 border {
                  isPinned 
                    ? 'bg-cyber-cyan/5 border-cyber-cyan/30 hover:bg-cyber-cyan/10' 
                    : 'bg-black/20 hover:bg-black/40 border-gray-900/60 hover:border-gray-800/80'
                }">
                  <input 
                    type="checkbox" 
                    checked={isPinned}
                    onchange={(e) => toggleSensor(selectedDevice!, param, e.currentTarget.checked)}
                    class="mt-0.5 accent-cyber-cyan cursor-pointer"
                  />
                  <div class="font-mono text-xs" class:text-white={isPinned} class:text-gray-300={!isPinned}>
                    <span class="block font-semibold leading-tight capitalize">{param.desc || param.name.replace(/([A-Z])/g, ' $1')}</span>
                    <span class="block text-[9px] uppercase mt-0.5 {isPinned ? 'text-cyber-cyan/80' : 'text-gray-600'}">{param.name}</span>
                  </div>
                </label>
              {:else}
                <div class="h-full flex items-center justify-center text-center text-gray-600 text-xs font-mono uppercase">
                  No sensors found.
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Telemetry Stream Display Area -->
      <div class="lg:col-span-3 space-y-6">
        
        <!-- Stream Control Toolbar -->
        <div class="bg-deep-slate/30 border border-gray-800/80 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" class:bg-cyber-cyan={isStreaming} class:bg-cyber-pink={!isStreaming}></span>
              <span class="relative inline-flex rounded-full h-3 w-3" class:bg-cyber-cyan={isStreaming} class:bg-cyber-pink={!isStreaming}></span>
            </div>
            <div class="font-mono">
              <span class="text-xs uppercase tracking-widest block font-bold" class:text-cyber-cyan={isStreaming} class:text-cyber-pink={!isStreaming}>
                {isStreaming ? 'Stream Active' : 'Stream Offline'}
              </span>
              {#if isStreaming}
                <span class="text-[9px] text-gray-500 uppercase tracking-widest block mt-0.5">
                  Refreshed: <span class="text-cyber-cyan font-bold">{countdown}s</span> | Unique Nodes: <span class="text-cyber-purple font-bold">{activeDeviceIds.length}</span>
                </span>
              {:else}
                <span class="text-[9px] text-gray-500 uppercase tracking-widest block mt-0.5">
                  Stream paused. Total pinned: <span class="text-cyber-purple font-bold">{selectedCount}</span>
                </span>
              {/if}
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            
            <!-- Adjustable Poll Speed Buttons -->
            <div class="flex flex-col gap-1 select-none">
              <span class="text-[8px] font-mono text-gray-500 uppercase tracking-wider block">Interval:</span>
              <div class="inline-flex rounded-lg p-0.5 bg-black/40 border border-gray-800/80">
                {#each [5, 10, 20, 30] as sec}
                  <button 
                    onclick={() => setPollInterval(sec)}
                    class="px-2.5 py-1 text-[9px] font-mono rounded-md uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer"
                    class:bg-cyber-purple={pollIntervalSeconds === sec}
                    class:text-white={pollIntervalSeconds === sec}
                    class:text-gray-500={pollIntervalSeconds !== sec}
                    class:hover:text-white={pollIntervalSeconds !== sec}
                  >
                    {sec}s
                  </button>
                {/each}
              </div>
            </div>

            <!-- Rate Limit Risk Meter -->
            <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/40 border font-mono text-[9px] relative overflow-hidden transition-all duration-300 {
              riskLevel === 'safe' ? 'border-cyber-green/40' :
              riskLevel === 'warning' ? 'border-cyber-purple/40' :
              'border-cyber-pink/40 animate-pulse'
            }"
            >
              {#if riskLevel === 'danger'}
                <div class="absolute inset-0 bg-cyber-pink/5 pointer-events-none animate-pulse"></div>
              {/if}
              
              <div class="flex flex-col">
                <span class="text-gray-500">API PRESSURE:</span>
                <span class="font-bold text-white uppercase flex items-center gap-1">
                  {estCallsPerMin} calls/min 
                  <span class="px-1.5 py-0.2 text-[8px] rounded font-extrabold {
                    riskLevel === 'safe' ? 'bg-cyber-green/15 text-cyber-green' :
                    riskLevel === 'warning' ? 'bg-cyber-purple/15 text-cyber-purple' :
                    'bg-cyber-pink/15 text-cyber-pink'
                  }">
                    {riskLevel}
                  </span>
                </span>
              </div>
            </div>

            <!-- Action Controls -->
            <div class="flex gap-2">
              {#if selectedCount > 0}
                <button 
                  onclick={clearFullDashboard} 
                  class="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-cyber-pink hover:bg-cyber-pink/10 border border-gray-800 rounded-lg transition-all duration-200 cursor-pointer select-none"
                  title="Clear all dashboard pins"
                >
                  Clear Console
                </button>
              {/if}

              <button 
                onclick={toggleStream}
                disabled={selectedCount === 0}
                class="px-5 py-2 text-xs font-mono uppercase font-bold tracking-widest border rounded-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer {
                  isStreaming 
                    ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan shadow-[0_0_15px_rgba(0,243,255,0.25)]' 
                    : 'bg-cyber-purple text-white border-cyber-purple hover:shadow-[0_0_20px_rgba(189,0,255,0.45)]'
                }"
              >
                {isStreaming ? 'PAUSE FEED' : 'START FEED'}
              </button>
            </div>
          </div>
        </div>

        <!-- Telemetry Display Nodes -->
        {#if selectedCount === 0}
          <div class="border border-dashed border-gray-800/80 rounded-2xl py-24 text-center bg-black/10 relative overflow-hidden">
            <div class="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40"></div>
            <div class="relative z-10">
              <svg class="w-14 h-14 text-cyber-purple/50 mx-auto mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 class="text-sm font-bold text-white uppercase tracking-widest mb-2">Custom Console Is Empty</h3>
              <p class="text-xs text-gray-400 font-mono max-w-sm mx-auto mb-6">Configure your monitoring setup: Select a target device and check parameters in the left panel to populate your real-time terminal.</p>
            </div>
          </div>
        {:else if !isStreaming && Object.values(liveTelemetry).length === 0}
          <div class="border border-gray-800/60 bg-deep-slate/10 rounded-2xl py-24 text-center relative overflow-hidden">
            <div class="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
            <div class="relative z-10 max-w-md mx-auto">
              <svg class="w-12 h-12 text-cyber-purple/80 mx-auto mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 class="text-sm font-bold text-white uppercase tracking-widest mb-2">Terminal Interface Ready</h3>
              <p class="text-xs text-gray-400 font-mono mb-6">Initialize the custom telemetry stream to aggregate metrics across all selected Renogy devices simultaneously.</p>
              <button 
                onclick={startStream}
                class="px-6 py-2.5 text-xs font-mono uppercase font-bold tracking-widest bg-gradient-to-r from-cyber-cyan to-cyber-purple border border-transparent rounded-lg text-black hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(189,0,255,0.4)] cursor-pointer"
              >
                CONNECT STREAM
              </button>
            </div>
          </div>
        {:else}
          <!-- The live grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {#each dashboardSensors as sensor (sensor.deviceId + '-' + sensor.paramName)}
              {@const val = liveTelemetry[sensor.deviceId]?.[sensor.paramName]}
              {@const formatted = getFormatter(sensor.deviceCategory)(
                sensor.paramName, 
                val, 
                { name: sensor.paramName, desc: sensor.paramDesc, unit: sensor.paramUnit, type: sensor.paramType }
              )}
              {@const prevVal = prevTelemetry[sensor.deviceId]?.[sensor.paramName]}
              {@const hasChanged = val !== undefined && prevVal !== undefined && val !== prevVal}

              <div 
                class="flex flex-col justify-between p-5 border rounded-xl bg-black/40 hover:bg-black/60 transition-all duration-300 relative group overflow-hidden {
                  hasChanged 
                    ? 'border-cyber-cyan/50 shadow-[0_0_15px_rgba(0,243,255,0.18)]' 
                    : 'border-gray-800/60 hover:border-cyber-purple/40 hover:shadow-[0_0_15px_rgba(189,0,255,0.15)]'
                }"
              >
                <!-- Flash changed indicator -->
                {#if hasChanged}
                  <div class="absolute inset-x-0 top-0 h-[2px] bg-cyber-cyan animate-pulse"></div>
                {/if}

                <div>
                  <!-- Card Header: Device Name & Close Button -->
                  <div class="flex justify-between items-start gap-2 border-b border-gray-800/40 pb-2 mb-3.5">
                    <div class="min-w-0 flex-1">
                      <p class="text-[8px] font-mono font-bold tracking-widest text-cyber-purple uppercase truncate">
                        {sensor.deviceName}
                      </p>
                      <p class="text-[10px] font-bold text-white truncate uppercase font-sans mt-0.5 leading-tight select-none">
                        {sensor.paramDesc}
                      </p>
                    </div>
                    
                    <!-- Delete close button -->
                    <button 
                      onclick={() => removeSensor(sensor.deviceId, sensor.paramName)}
                      class="text-gray-500 hover:text-cyber-pink p-1 rounded hover:bg-cyber-pink/10 transition-all duration-200 select-none cursor-pointer"
                      title="Remove Sensor"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p class="text-3xl font-extrabold text-white mt-1 font-sans flex items-baseline gap-1 relative">
                    <!-- Ticking number with a simple visual indicator -->
                    <span class="transition-all duration-300" class:text-cyber-cyan={hasChanged}>
                      {val !== undefined ? formatted.value : '---'}
                    </span>
                    {#if val !== undefined && formatted.unit}
                      <span class="text-xs font-bold text-cyber-cyan tracking-wider uppercase font-mono">{formatted.unit}</span>
                    {/if}
                  </p>
                </div>

                <div class="text-[9px] text-gray-500 mt-5 pt-2.5 border-t border-gray-800/40 font-mono flex items-center justify-between uppercase tracking-widest select-none">
                  <span>REF: {sensor.paramName}</span>
                  {#if sensor.paramType}
                    <span class="text-cyber-purple/70">[{sensor.paramType}]</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    </div>
  {/if}
</div>
