import jsPDF from 'jspdf';

type CertificatePDFData = {
  studentName: string;
  courseName: string;
  certificateCode: string;
  issuedAt: string;
  completionDate: string;
};

export function generateCertificatePDF(data: CertificatePDFData): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  // Outer border
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20);

  // Inner border
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, width - 30, height - 30);

  // Decorative corner elements
  const cornerSize = 20;
  const corners = [
    [15, 15],
    [width - 15 - cornerSize, 15],
    [15, height - 15 - cornerSize],
    [width - 15 - cornerSize, height - 15 - cornerSize],
  ];

  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(1);
  corners.forEach(([x, y]) => {
    doc.line(x, y, x + cornerSize, y);
    doc.line(x, y, x, y + cornerSize);
  });

  // Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  doc.text('DR. MALIK SHEHRYAR MEDICAL ACADEMY', width / 2, 40, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(26, 54, 93);
  doc.text('CERTIFICATE', width / 2, 58, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('OF COMPLETION', width / 2, 68, { align: 'center' });

  // Decorative line
  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(1);
  doc.line(width / 2 - 60, 73, width / 2 + 60, 73);

  // "This is to certify that"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text('This is to certify that', width / 2, 85, { align: 'center' });

  // Student name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(26, 54, 93);
  doc.text(data.studentName, width / 2, 100, { align: 'center' });

  // Underline for name
  const nameWidth = doc.getTextWidth(data.studentName);
  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - nameWidth / 2, 103, width / 2 + nameWidth / 2, 103);

  // "has successfully completed"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text('has successfully completed the course', width / 2, 115, { align: 'center' });

  // Course name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(26, 54, 93);
  doc.text(data.courseName, width / 2, 130, { align: 'center' });

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Issued on: ${data.issuedAt}`, width / 2, 145, { align: 'center' });

  // Certificate code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Certificate ID: ${data.certificateCode}`, width / 2, 153, { align: 'center' });

  // Signature line
  const sigY = 170;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);

  // Left signature
  doc.line(60, sigY, 120, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Dr. Malik Shehryar', 90, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('NRE Mentor, FCPS 1 Mentor', 90, sigY + 9, { align: 'center' });

  // Right signature
  doc.line(width - 120, sigY, width - 60, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Academy Director', width - 90, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('MedPro LMS', width - 90, sigY + 9, { align: 'center' });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('MedPro LMS | Dr. Malik Shehryar Medical Academy', width / 2, height - 20, { align: 'center' });

  return doc;
}

export function downloadCertificatePDF(data: CertificatePDFData) {
  const doc = generateCertificatePDF(data);
  const fileName = `certificate-${data.certificateCode}.pdf`;
  doc.save(fileName);
}
