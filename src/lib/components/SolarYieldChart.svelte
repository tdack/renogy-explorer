<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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

  let canvasElement = $state<HTMLCanvasElement>();
  let chartInstance: Chart | null = null;

  onMount(async () => {
    if (currentMonthData.length > 0 || previousMonthData.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for DOM to render
      if (canvasElement) {
        chartInstance = new Chart(canvasElement.getContext('2d')!, {
          type: 'line',
          data: {
            labels: currentMonthData.map(d => new Date(d.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [
              {
                label: 'Current Month (Wh)',
                data: currentMonthData.map(d => d.generatePower),
                borderColor: '#00f3ff',
                backgroundColor: 'rgba(0, 243, 255, 0.04)',
                pointBorderColor: '#00f3ff',
                pointBackgroundColor: '#050508',
                pointHoverBackgroundColor: '#00f3ff',
                pointHoverBorderColor: '#fff',
                tension: 0.35,
                fill: true
              },
              {
                label: 'Previous Month (Wh)',
                data: previousMonthData.map(d => d.generatePower),
                borderColor: '#bd00ff',
                backgroundColor: 'rgba(189, 0, 255, 0.04)',
                pointBorderColor: '#bd00ff',
                pointBackgroundColor: '#050508',
                pointHoverBackgroundColor: '#bd00ff',
                pointHoverBorderColor: '#fff',
                tension: 0.35,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top' as const,
                labels: {
                  color: '#94a3b8',
                  font: {
                    family: 'Outfit',
                    size: 12,
                    weight: 'normal'
                  }
                }
              },
              title: {
                display: false
              }
            },
            scales: {
              x: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.04)'
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    family: 'Outfit',
                    size: 10
                  }
                },
                title: {
                  display: true,
                  text: 'Telemetry Timeline (Days)',
                  color: '#475569',
                  font: {
                    family: 'Outfit',
                    size: 11,
                    weight: 'bold'
                  }
                }
              },
              y: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.04)'
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    family: 'Outfit',
                    size: 10
                  }
                },
                title: {
                  display: true,
                  text: 'Watt-hours Generated (Wh)',
                  color: '#475569',
                  font: {
                    family: 'Outfit',
                    size: 11,
                    weight: 'bold'
                  }
                }
              }
            }
          }
        });
      }
    }
  });

  onDestroy(() => {
    if (chartInstance) {
      chartInstance.destroy();
    }
  });
</script>

<div class="relative h-96">
  <canvas bind:this={canvasElement}></canvas>
</div>
