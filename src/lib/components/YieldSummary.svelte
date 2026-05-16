<script lang="ts">
  interface Props {
    currentMonthYield?: number;
    previousMonthYield?: number;
  }

  let { currentMonthYield = 0, previousMonthYield = 0 }: Props = $props();
</script>

<div class="mb-4">
  <p class="text-sm text-gray-600">
    <strong>Current Month:</strong> {currentMonthYield.toLocaleString()} Wh | 
    <strong>Previous Month:</strong> {previousMonthYield.toLocaleString()} Wh
  </p>
</div>
