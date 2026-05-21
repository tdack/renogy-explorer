<script lang="ts">
  interface Props {
    currentMonthYield?: number;
    previousMonthYield?: number;
  }

  let { currentMonthYield = 0, previousMonthYield = 0 }: Props = $props();
</script>

<div class="flex flex-wrap gap-4 mb-6 font-mono">
  <div class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-cyber-cyan/5 border border-cyber-cyan/20 shadow-[0_0_12px_rgba(0,243,255,0.08)]">
    <div class="w-2 h-2 rounded-full bg-cyber-cyan shadow-[0_0_6px_var(--color-cyber-cyan)]"></div>
    <span class="text-xs text-gray-400 uppercase tracking-widest">Current Month:</span>
    <span class="text-sm font-bold text-cyber-cyan">{currentMonthYield.toLocaleString()} <span class="text-[10px] font-normal text-cyber-cyan/70">Wh</span></span>
  </div>
  
  <div class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-cyber-purple/5 border border-cyber-purple/20 shadow-[0_0_12px_rgba(189,0,255,0.08)]">
    <div class="w-2 h-2 rounded-full bg-cyber-purple shadow-[0_0_6px_var(--color-cyber-purple)]"></div>
    <span class="text-xs text-gray-400 uppercase tracking-widest">Previous Month:</span>
    <span class="text-sm font-bold text-cyber-purple">{previousMonthYield.toLocaleString()} <span class="text-[10px] font-normal text-cyber-purple/70">Wh</span></span>
  </div>
</div>
