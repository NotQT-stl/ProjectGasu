const MAX_POINTS = 60;

export class ChartManager {
  #chart  = null;
  #labels = [];
  #data   = [];

  init(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx    = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(45, 158, 104, 0.28)');
    gradient.addColorStop(1, 'rgba(45, 158, 104, 0.00)');

    this.#chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.#labels,
        datasets: [{
          label:           'PM2.5 (µg/m³)',
          data:            this.#data,
          borderColor:     '#2d9e68',
          backgroundColor: gradient,
          borderWidth:     2,
          pointRadius:     0,
          fill:            true,
          tension:         0.4,
        }],
      },
      options: {
        animation:           false,
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode:            'index',
            intersect:       false,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderColor:     'rgba(45, 158, 104, 0.30)',
            borderWidth:     1,
            titleColor:      'rgba(19,42,30,0.7)',
            bodyColor:       '#132a1e',
            padding:         10,
          },
        },
        scales: {
          x: {
            ticks: {
              color:         'rgba(19, 42, 30, 0.45)',
              maxTicksLimit: 8,
              font:          { size: 11 },
            },
            grid: { color: 'rgba(82, 183, 136, 0.12)' },
          },
          y: {
            min: 0,
            ticks: {
              color: 'rgba(19, 42, 30, 0.45)',
              font:  { size: 11 },
            },
            grid: { color: 'rgba(82, 183, 136, 0.12)' },
          },
        },
      },
    });
  }

  push(reading) {
    const label = reading.timestamp.toLocaleTimeString([], {
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    this.#labels.push(label);
    this.#data.push(reading.pm25);

    if (this.#labels.length > MAX_POINTS) {
      this.#labels.shift();
      this.#data.shift();
    }

    this.#chart.data.datasets[0].borderColor = reading.aqiColor;
    this.#chart.update('none');
  }
}
