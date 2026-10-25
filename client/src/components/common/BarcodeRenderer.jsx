import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeRenderer({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 42,
  displayValue = true,
  className = '',
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format,
          width,
          height,
          displayValue,
          font: 'monospace',
          fontSize: 11,
          fontOptions: 'bold',
          textMargin: 2,
          margin: 4,
          lineColor: '#20252B',
        });
      } catch (err) {
        console.warn('Barcode render error:', err);
      }
    }
  }, [value, format, width, height, displayValue]);

  if (!value) return null;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto select-none" />
    </div>
  );
}
