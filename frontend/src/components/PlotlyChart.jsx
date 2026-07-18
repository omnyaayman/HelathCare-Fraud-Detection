import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function PlotlyChart({ data, layout, config, style, className, onPointClick }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const container = containerRef.current;
    
    if (!container) return;

    const getThemeColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        textColor: isDark ? '#94a3b8' : '#475569',
        gridColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(226, 232, 240, 0.5)',
        zeroLineColor: isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(226, 232, 240, 0.9)'
      };
    };

    const { textColor, gridColor, zeroLineColor } = getThemeColors();

    const mergedLayout = {
      margin: { t: 40, r: 20, l: 40, b: 40 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
        size: 11,
        color: textColor
      },
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0,
        y: -0.2,
        xanchor: 'left',
        yanchor: 'top',
        font: { color: textColor, size: 10 }
      },
      ...layout
    };

    // Ensure axis gridcolors and zerolinecolors are set and dynamic
    if (!mergedLayout.xaxis) mergedLayout.xaxis = {};
    if (!mergedLayout.yaxis) mergedLayout.yaxis = {};
    mergedLayout.xaxis.gridcolor = mergedLayout.xaxis.gridcolor || gridColor;
    mergedLayout.xaxis.zerolinecolor = mergedLayout.xaxis.zerolinecolor || zeroLineColor;
    mergedLayout.yaxis.gridcolor = mergedLayout.yaxis.gridcolor || gridColor;
    mergedLayout.yaxis.zerolinecolor = mergedLayout.yaxis.zerolinecolor || zeroLineColor;

    // Adapt USA geo map colors if present
    if (mergedLayout.geo) {
      const isDark = document.documentElement.classList.contains('dark');
      mergedLayout.geo.landcolor = isDark ? '#1e293b' : (mergedLayout.geo.landcolor || '#f8fafc');
      mergedLayout.geo.subunitcolor = isDark ? '#334155' : (mergedLayout.geo.subunitcolor || '#cbd5e1');
      mergedLayout.geo.countrycolor = isDark ? '#334155' : (mergedLayout.geo.countrycolor || '#cbd5e1');
      mergedLayout.geo.lakecolor = isDark ? '#0b0f19' : (mergedLayout.geo.lakecolor || '#e2e8f0');
    }

    Plotly.newPlot(container, data, mergedLayout, {
      responsive: true,
      displayModeBar: false,
      ...config
    }).then(() => {
      // Force relayout after draw to fit container size
      if (active && container) {
        Plotly.Plots.resize(container);
        if (onPointClick) {
          container.on('plotly_click', (eventData) => {
            if (eventData && eventData.points && eventData.points[0]) {
              onPointClick(eventData.points[0]);
            }
          });
        }
      }
    });

    // Theme changes observer
    const observer = new MutationObserver(() => {
      if (!active || !container) return;
      const { textColor: newTextColor, gridColor: newGridColor, zeroLineColor: newZeroLineColor } = getThemeColors();
      const isDark = document.documentElement.classList.contains('dark');
      
      const relayoutUpdate = {
        'font.color': newTextColor,
        'legend.font.color': newTextColor,
        'xaxis.gridcolor': layout?.xaxis?.gridcolor || newGridColor,
        'xaxis.zerolinecolor': layout?.xaxis?.zerolinecolor || newZeroLineColor,
        'yaxis.gridcolor': layout?.yaxis?.gridcolor || newGridColor,
        'yaxis.zerolinecolor': layout?.yaxis?.zerolinecolor || newZeroLineColor,
      };

      if (layout?.geo) {
        relayoutUpdate['geo.landcolor'] = isDark ? '#1e293b' : (layout.geo.landcolor || '#f8fafc');
        relayoutUpdate['geo.subunitcolor'] = isDark ? '#334155' : (layout.geo.subunitcolor || '#cbd5e1');
        relayoutUpdate['geo.countrycolor'] = isDark ? '#334155' : (layout.geo.countrycolor || '#cbd5e1');
        relayoutUpdate['geo.lakecolor'] = isDark ? '#0b0f19' : (layout.geo.lakecolor || '#e2e8f0');
      }

      Plotly.relayout(container, relayoutUpdate);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleResize = () => {
      if (container) {
        Plotly.Plots.resize(container);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      if (container) {
        Plotly.purge(container);
      }
    };
  }, [data, layout, config]);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ width: '100%', height: '100%', minHeight: '260px', ...style }} 
    />
  );
}
