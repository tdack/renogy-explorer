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

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each Object.entries(details) as [key, value]}
    {@const info = getParameterInfo(key)}
    {@const formatted = formatParameterValue(key, value, info)}
    <div class="flex flex-col justify-between p-4 border rounded-lg bg-gray-50">
      <div>
        <p class="text-sm font-semibold text-gray-600 capitalize">
          {info.desc || key.replace(/([A-Z])/g, ' $1')}
        </p>
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
