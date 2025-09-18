import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const PieChart = ({ title = "", data = {} }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && data && data.labels && data.datasets) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
              font: {
                size: 14,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 15,
            cornerRadius: 8,
          },
        },
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1000,
          easing: "easeOutQuart",
        },
      };

      // Create new chart
      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "pie",
        data: data,
        options: options,
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, title]); // Add data and title to dependency array

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>

      <div className="relative h-80">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default PieChart;
