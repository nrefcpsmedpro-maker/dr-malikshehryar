'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCertificatePDF } from '@/utils/certificatePdf';
import { Button } from '@/components/ui/button';

type CertificateDownloadProps = {
  studentName: string;
  courseName: string;
  certificateCode: string;
  issuedAt: string;
};

export function CertificateDownload({
  studentName,
  courseName,
  certificateCode,
  issuedAt,
}: CertificateDownloadProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      const date = new Date(issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      downloadCertificatePDF({
        studentName,
        courseName,
        certificateCode,
        issuedAt: date,
        completionDate: date,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={downloading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Download size={14} />
      {downloading ? 'Generating...' : 'Download PDF'}
    </Button>
  );
}
