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
  <div class="mt-4 p-3 bg-red-50 rounded-lg">
    <h3 class="text-sm font-semibold text-red-800 mb-2">Active Alarms:</h3>
    <ul class="space-y-1">
      {#each alarms as alarm}
        <li class="text-xs text-red-700">
          <span class="font-semibold">{alarm.alarmName || alarm.code}</span>
          {#if alarm.alarmLevel}
            <span class="ml-2 text-red-600">({alarm.alarmLevel})</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
