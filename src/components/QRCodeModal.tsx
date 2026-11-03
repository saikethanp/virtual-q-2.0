import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, Copy, Check, ExternalLink } from 'lucide-react';
import { Business } from '../types';

interface QRCodeModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ business, isOpen, onClose }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const businessUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/business/${business.slug}`
    : `https://virtual-q.vercel.app/business/${business.slug}`;

  useEffect(() => {
    if (isOpen && business) {
      QRCode.toDataURL(businessUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#3D2010',
          light: '#FFFFFF',
        },
      })
        .then(url => setDataUrl(url))
        .catch(err => console.error('QR code generation error:', err));
    }
  }, [isOpen, business, businessUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(businessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${business.slug}-virtual-q-code.png`;
    link.href = dataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${business.name} - Virtual-Q QR Code</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #171412; }
            .card { border: 2px solid #EFECE6; border-radius: 20px; padding: 30px; display: inline-block; max-width: 400px; }
            h2 { margin: 0 0 8px 0; color: #3D2010; }
            p { margin: 0 0 20px 0; color: #766B63; font-size: 14px; }
            img { width: 280px; height: 280px; margin-bottom: 20px; }
            .badge { background: #3D2010; color: white; padding: 8px 18px; border-radius: 999px; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${business.name}</h2>
            <p>Scan to join queue remotely with Virtual-Q</p>
            <img src="${dataUrl}" />
            <div>
              <span class="badge">Skip The Wait. Scan Now!</span>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EFECE6] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8F5] text-[#766B63] hover:text-[#171412] hover:bg-[#F3EFEA] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className="text-xs font-semibold tracking-wider uppercase text-[#9E948C]">
            Customer Remote Check-in
          </span>
          <h3 className="text-xl font-bold text-[#171412] mt-1">
            {business.name}
          </h3>
          <p className="text-xs text-[#766B63] mt-1">
            Display this QR standee at your counter or entrance for instant token booking.
          </p>

          {/* QR Code Container */}
          <div ref={printRef} className="my-6 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] inline-block shadow-inner">
            {dataUrl ? (
              <img src={dataUrl} alt="Business QR Code" className="w-56 h-56 mx-auto rounded-xl" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-[#766B63]">
                Generating QR code...
              </div>
            )}
          </div>

          {/* Link box */}
          <div className="flex items-center gap-2 p-2 bg-[#FAF8F5] border border-[#EFECE6] rounded-xl text-xs text-[#766B63] mb-5">
            <span className="truncate flex-1 text-left px-2 font-mono">{businessUrl}</span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E0D8CE] text-[#171412] font-medium hover:bg-[#F5F2EC] flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#DCD5CB] text-[#171412] hover:bg-[#FAF8F5] font-semibold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#3D2010]" />
              Download PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#3D2010] text-[#FAF8F5] hover:bg-[#2C170A] font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print QR Standee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
