import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Chart from "chart.js/auto";

const PieChart = forwardRef(({ title = "", data = {} }, ref) => {
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

      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "pie",
        data: data,
        options: options,
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, title]);

  const getImage = () => {
    if (!chartInstance.current) return null;
    return {
      dataUrl: chartInstance.current.toBase64Image("image/png", 1),
      width: chartInstance.current.canvas.width,
      height: chartInstance.current.canvas.height,
    };
  };

  useImperativeHandle(ref, () => ({
    getImage,
    title,
  }));

  const handleDownload = () => {
    const image = getImage();
    if (!image) return;
    const filename = (title || "chart")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const link = document.createElement("a");
    link.href = image.dataUrl;
    link.download = `${filename || "chart"}.png`;
    link.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <button
          onClick={handleDownload}
          className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors duration-150"
          title="Download chart as PNG"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download
        </button>
      </div>

      <div className="relative h-80">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
});

export default PieChart;
