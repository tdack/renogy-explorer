<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  interface YieldData {
    ts: number;
    generatePower: number;
  }

  interface Props {
    currentMonthYield?: number;
    previousMonthYield?: number;
    currentMonthData?: YieldData[];
    previousMonthData?: YieldData[];
  }

  let { 
    currentMonthYield = 0, 
    previousMonthYield = 0, 
    currentMonthData = [], 
    previousMonthData = [] 
  }: Props = $props();

  onMount(async () => {
    if (currentMonthData.length > 0 || previousMonthData.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for DOM to render
      const canvas = document.getElementById('solarYieldChart') as HTMLCanvasElement;
      if (canvas) {
        new Chart(canvas.getContext('2d')!, {
          type: 'line',
          data: {
            labels: currentMonthData.map(d => new Date(d.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [
              {
                label: 'Current Month',
                data: currentMonthData.map(d => d.generatePower),
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true
              },
              {
                label: 'Previous Month',
                data: previousMonthData.map(d => d.generatePower),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top' as const
              },
              title: {
                display: true,
                text: 'Solar Yield Comparison'
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Date'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Watt-hours (Wh)'
                }
              }
            }
          }
        });
      }
    }
  });
</script>

<div class="relative h-96">
  <canvas id="solarYieldChart"></canvas>
</div>
