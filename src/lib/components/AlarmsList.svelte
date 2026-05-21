<script lang="ts">
  interface Alarm {
    alarmName?: string;
    code?: string;
    alarmLevel?: string;
  }

  interface Props {
    alarms?: Alarm[];
  }

  let { alarms = [] }: Props = $props();
</script>

{#if alarms && alarms.length > 0}
  <div class="mt-5 p-3.5 bg-cyber-pink/5 border-l-2 border-cyber-pink rounded-r-lg glow-pink">
    <div class="flex items-center gap-1.5 mb-2">
      <svg class="w-4 h-4 text-cyber-pink animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-xs font-bold text-cyber-pink uppercase tracking-widest font-mono">Active Alerts:</h3>
    </div>
    <ul class="space-y-1.5">
      {#each alarms as alarm}
        <li class="text-xs text-gray-300 font-mono flex justify-between items-center bg-black/20 px-2 py-1 rounded">
          <span class="font-semibold text-white">{alarm.alarmName || alarm.code}</span>
          {#if alarm.alarmLevel}
            <span class="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30">{alarm.alarmLevel}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
