<script lang="ts">
  interface ParameterInfo {
    name?: string;
    desc?: string;
    operation?: string;
    type?: string;
    unit?: string;
  }

  interface FormattedParameter {
    value: string;
    unit?: string;
  }

  interface Props {
    details?: Record<string, any>;
    dataMap?: ParameterInfo[];
    formatParameterValue: (key: string, value: any, info: ParameterInfo) => FormattedParameter;
  }

  let { details = {}, dataMap = [], formatParameterValue }: Props = $props();

  function getParameterInfo(paramName: string): ParameterInfo {
    if (!Array.isArray(dataMap)) return {};
    return dataMap.find(p => p.name === paramName) || {};
  }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
  {#each Object.entries(details) as [key, value]}
    {@const info = getParameterInfo(key)}
    {@const formatted = formatParameterValue(key, value, info)}
    <div class="flex flex-col justify-between p-5 border border-gray-800/60 rounded-xl bg-black/40 hover:border-cyber-cyan/40 hover:bg-black/60 transition-all duration-200">
      <div>
        <p class="text-xs font-semibold text-gray-500 capitalize tracking-widest font-mono">
          {info.desc || key.replace(/([A-Z])/g, ' $1')}
        </p>
        <p class="text-2xl font-extrabold text-white mt-1 font-sans">
          {formatted.value}
          {#if formatted.unit}
            <span class="text-sm font-medium text-cyber-cyan tracking-wider">{formatted.unit}</span>
          {/if}
        </p>
      </div>
      <div class="text-[10px] text-gray-500 mt-4 pt-2.5 border-t border-gray-800/40 font-mono flex items-center justify-between uppercase tracking-widest">
        <span>{info.operation || 'Telemetry'}</span>
        {#if info.type}<span class="text-cyber-purple/80">[{info.type}]</span>{/if}
      </div>
    </div>
  {/each}
</div>
