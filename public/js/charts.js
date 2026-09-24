/**
 * Chart.js Integration for HOME AUTOMATION
 * Plots live temperature and humidity trends.
 */

let sensorChart = null;

function initSensorChart() {
  const ctx = document.getElementById('sensorHistoryChart');
  if (!ctx) return;

  // Destroy if already exists
  if (sensorChart) {
    sensorChart.destroy();
  }

  sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temp (°C)',
          data: [],
          borderColor: '#06b6d4', // Cyan
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#06b6d4',
          yAxisID: 'y'
        },
        {
          label: 'Humidity (%)',
          data: [],
          borderColor: '#10b981', // Emerald
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#10b981',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 8,
          boxPadding: 4,
          callbacks: {
            label: function (context) {
              const unit = context.datasetIndex === 0 ? ' °C' : ' %';
              return `${context.dataset.label}: ${context.parsed.y}${unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(51, 65, 85, 0.3)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 9 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(51, 65, 85, 0.25)',
            drawBorder: false
          },
          ticks: {
            color: '#06b6d4',
            font: { size: 10 }
          },
          suggestedMin: 15,
          suggestedMax: 45
        },
        y1: {
          type: 'linear',
          display: false, // Keep clean, data will scale smoothly
          position: 'right',
          suggestedMin: 20,
          suggestedMax: 100
        }
      }
    }
  });
}

function updateSensorChart(records) {
  if (!sensorChart || !records) return;

  const labels = records.map(r => r.time || '');
  const temps = records.map(r => r.temperature);
  const hums = records.map(r => r.humidity);

  sensorChart.data.labels = labels;
  sensorChart.data.datasets[0].data = temps;
  sensorChart.data.datasets[1].data = hums;
  sensorChart.update();
}
