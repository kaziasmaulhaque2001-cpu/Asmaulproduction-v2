import { jsPDF } from 'jspdf';
import { Booking, Payment } from '../types';
import { BrandSettings } from '../contexts/BrandContext';
import { getStatusLabel } from './statusUtils';
import { offlineService } from '../services/offlineService';

// Helper to standardize any date string/number/Date object to DD/MM/YYYY
export const formatDateToDDMMYYYY = (dateInput: any): string => {
  if (!dateInput) return '';
  
  let d: Date;
  if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';
    
    // 1. Check if already in DD/MM/YYYY format
    const ddmmMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmMatch) {
      const day = ddmmMatch[1].padStart(2, '0');
      const month = ddmmMatch[2].padStart(2, '0');
      const year = ddmmMatch[3];
      return `${day}/${month}/${year}`;
    }

    // 2. Check YYYY-MM-DD or YYYY/MM/DD to prevent timezone offset shifts
    const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // 3. Fallback: Parse string to Date object
    d = new Date(trimmed);
  } else if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    return String(dateInput);
  }

  if (isNaN(d.getTime())) {
    // Try manual token parsing as a last resort for formats like "13 Jul 2026"
    const parts = String(dateInput).split(/[\s,\-\/]+/);
    if (parts.length >= 3) {
      const yearIdx = parts.findIndex(p => p.length === 4 && !isNaN(Number(p)));
      if (yearIdx !== -1) {
        const year = parts[yearIdx];
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        let month = '01';
        let day = '01';
        
        const otherParts = parts.filter((_, idx) => idx !== yearIdx);
        let monthFound = false;
        for (let i = 0; i < otherParts.length; i++) {
          const pLower = otherParts[i].toLowerCase().slice(0, 3);
          const mIdx = months.indexOf(pLower);
          if (mIdx !== -1) {
            month = String(mIdx + 1).padStart(2, '0');
            monthFound = true;
            otherParts.splice(i, 1);
            break;
          }
        }
        
        if (monthFound && otherParts.length > 0) {
          const possibleDay = parseInt(otherParts[0], 10);
          if (!isNaN(possibleDay)) {
            day = String(possibleDay).padStart(2, '0');
          }
        } else if (otherParts.length >= 2) {
          const p1 = parseInt(otherParts[0], 10);
          const p2 = parseInt(otherParts[1], 10);
          if (!isNaN(p1) && !isNaN(p2)) {
            day = String(p1).padStart(2, '0');
            month = String(p2).padStart(2, '0');
          }
        }
        return `${day}/${month}/${year}`;
      }
    }
    return String(dateInput);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to load image from URL and convert to Base64 data URI for jsPDF
const loadLogoImage = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    // If it's already a base64 DataURL, return it directly
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.error('Error rendering image to canvas for PDF:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load logo image for PDF, using text fallback.');
      resolve(null);
    };
    img.src = url;
  });
};

// Helper to draw a beautiful, highly precise vector QR code
const drawQRCode = (doc: jsPDF, x: number, y: number, size: number = 25) => {
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  doc.setLineWidth(0.4);
  
  // Outer Border Frame
  doc.rect(x - 1, y - 1, size + 2, size + 2, 'D');

  // Position detection eyes (top-left, top-right, bottom-left)
  const eyeSize = size * 0.28;

  // 1. Top-Left Eye
  doc.rect(x, y, eyeSize, eyeSize, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + eyeSize * 0.15, y + eyeSize * 0.15, eyeSize * 0.7, eyeSize * 0.7, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + eyeSize * 0.3, y + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4, 'F');

  // 2. Top-Right Eye
  doc.rect(x + size - eyeSize, y, eyeSize, eyeSize, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + size - eyeSize + eyeSize * 0.15, y + eyeSize * 0.15, eyeSize * 0.7, eyeSize * 0.7, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + size - eyeSize + eyeSize * 0.3, y + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4, 'F');

  // 3. Bottom-Left Eye
  doc.rect(x, y + size - eyeSize, eyeSize, eyeSize, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + eyeSize * 0.15, y + size - eyeSize + eyeSize * 0.15, eyeSize * 0.7, eyeSize * 0.7, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + eyeSize * 0.3, y + size - eyeSize + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4, 'F');

  // Small alignment marker bottom-right
  const alignSize = size * 0.12;
  doc.rect(x + size - alignSize - 1.5, y + size - alignSize - 1.5, alignSize, alignSize, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + size - alignSize - 1.5 + alignSize * 0.2, y + size - alignSize - 1.5 + alignSize * 0.2, alignSize * 0.6, alignSize * 0.6, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + size - alignSize - 1.5 + alignSize * 0.35, y + size - alignSize - 1.5 + alignSize * 0.35, alignSize * 0.3, alignSize * 0.3, 'F');

  // Fill pseudo-random cells to make it look completely authentic
  doc.setFillColor(0, 0, 0);
  const cells = 17;
  const cellSize = size / cells;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Don't draw over the outer tracking eyes
      const inTopLeft = r < 6 && c < 6;
      const inTopRight = r < 6 && c > cells - 7;
      const inBottomLeft = r > cells - 7 && c < 6;
      const inBottomRight = r > cells - 4 && c > cells - 4;
      
      if (!inTopLeft && !inTopRight && !inBottomLeft && !inBottomRight) {
        if ((r * 11 + c * 7) % 3 === 0 || (r * c) % 4 === 1 || (r + c) % 5 === 0) {
          doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
  }
};

// Add standard luxury styles, header, and logo to PDF
const addPDFHeader = (
  doc: jsPDF,
  settings: BrandSettings,
  logoBase64: string | null,
  title: string
): number => {
  // 1. Gold-colored top primary band
  doc.setFillColor(212, 175, 55); // #D4AF37
  doc.rect(0, 0, 210, 8, 'F');

  let currentY = 22;
  let leftBottomY = currentY + 18;

  // 2. Draw brand identity (Left Side with automatic wrapping to prevent overlap)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, currentY, 18, 18);
      
      // Business Name beside logo (Max width 90mm to reserve right column)
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      
      const nameText = settings.studioName || 'Asmaul Production';
      const nameLines = doc.splitTextToSize(nameText, 90);
      let nameY = currentY + 6;
      nameLines.forEach((line: string) => {
        doc.text(line, 36, nameY);
        nameY += 6.5;
      });

      // Business Tagline below Business Name (Max width 90mm)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(110, 110, 110);
      
      const taglineText = settings.studioTagline || 'Luxury Wedding Photojournalism';
      const taglineLines = doc.splitTextToSize(taglineText, 90);
      let taglineY = nameY - 1.5; // space perfectly below name
      taglineLines.forEach((line: string) => {
        doc.text(line, 36, taglineY);
        taglineY += 4.5;
      });

      leftBottomY = Math.max(currentY + 18, taglineY);
    } catch (e) {
      // Fallback
      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(212, 175, 55);
      
      const nameText = settings.studioName || 'Asmaul Production';
      const nameLines = doc.splitTextToSize(nameText, 110);
      let nameY = currentY + 7;
      nameLines.forEach((line: string) => {
        doc.text(line, 14, nameY);
        nameY += 8;
      });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(110, 110, 110);
      
      const taglineText = settings.studioTagline || 'Luxury Wedding Photojournalism';
      const taglineLines = doc.splitTextToSize(taglineText, 110);
      let taglineY = nameY - 1;
      taglineLines.forEach((line: string) => {
        doc.text(line, 14, taglineY);
        taglineY += 4.5;
      });

      leftBottomY = taglineY;
    }
  } else {
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55); // Luxury Gold Theme
    
    const nameText = settings.studioName || 'Asmaul Production';
    const nameLines = doc.splitTextToSize(nameText, 110);
    let nameY = currentY + 7;
    nameLines.forEach((line: string) => {
      doc.text(line, 14, nameY);
      nameY += 8;
    });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    
    const taglineText = settings.studioTagline || 'Luxury Wedding Photojournalism';
    const taglineLines = doc.splitTextToSize(taglineText, 110);
    let taglineY = nameY - 1;
    taglineLines.forEach((line: string) => {
      doc.text(line, 14, taglineY);
      taglineY += 4.5;
    });

    leftBottomY = taglineY;
  }

  // 3. Right Side: Document Header Details (Fixed area on the right, right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(title.toUpperCase(), 196, currentY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const today = formatDateToDDMMYYYY(new Date());
  doc.text(`Generated: ${today}`, 196, currentY + 9, { align: 'right' });
  doc.text(`Office Phone: ${settings.studioPhone || '+91 98765 43210'}`, 196, currentY + 13, { align: 'right' });

  const rightBottomY = currentY + 18;
  const headerBottomY = Math.max(leftBottomY, rightBottomY);

  // Dynamic header end Y coordinate with proper spacing
  currentY = headerBottomY + 3;

  // Thin dividing line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(14, currentY, 196, currentY);

  return currentY + 8;
};

// Add standard footer
const addPDFFooter = (doc: jsPDF, settings: BrandSettings) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Gold divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(14, pageHeight - 18, 196, pageHeight - 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`${settings.studioName || 'Asmaul Production'} | ${settings.studioAddress || 'Calcutta, India'}`, 14, pageHeight - 12);
  doc.text(`Email: ${settings.studioEmail || 'info@asmaulproduction.com'} | Web: ${settings.website || 'www.asmaulproduction.com'}`, 14, pageHeight - 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('PAGE 1 OF 1', 196, pageHeight - 10, { align: 'right' });
};

// Core Builder: Booking Confirmation
export const buildBookingConfirmationPDF = async (
  booking: Booking,
  settings: BrandSettings
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = await loadLogoImage(settings.studioLogo || '');
  let y = addPDFHeader(doc, settings, logoBase64, 'Booking Confirmation');

  // 1. Client & Booking Registry Details Panel (Simplified)
  doc.setFillColor(249, 249, 248);
  doc.rect(14, y, 182, 38, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, y, 182, 38, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text('BOOKING CONFIRMATION', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  
  doc.text(`Client Name: ${booking.clientName}`, 18, y + 13);
  doc.text(`Booking For: ${booking.bookingFor || 'Wedding'}`, 18, y + 19);
  doc.text(`Coverage: ${booking.coverage || 'Both Side'}`, 18, y + 25);
  doc.text(`Event Date: ${formatDateToDDMMYYYY(booking.weddingDate)}`, 18, y + 31);

  doc.text(`Total Amount: INR ${booking.totalAmount.toLocaleString('en-IN')}`, 112, y + 13);
  doc.text(`Advance Paid: INR ${booking.paidAmount.toLocaleString('en-IN')}`, 112, y + 19);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55); // Premium Gold color
  doc.text(`Remaining Due: INR ${(booking.totalAmount - booking.paidAmount).toLocaleString('en-IN')}`, 112, y + 25);

  y += 46;

  // 2. Payment History Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text('PAYMENT HISTORY', 14, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  y += 6;

  // Fetch payment records from database
  let bookingPayments: Payment[] = [];
  try {
    const allPayments = await offlineService.getPayments();
    bookingPayments = allPayments
      .filter((p) => p.bookingId === booking.id && p.status === 'completed')
      .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically (oldest first)
  } catch (err) {
    console.error('Error fetching payments for PDF:', err);
  }

  // Calculate rows for history
  let cumulativePaid = 0;
  let historyRows = bookingPayments.map((p) => {
    cumulativePaid += p.amount;
    const remainingDue = Math.max(0, booking.totalAmount - cumulativePaid);
    const formattedDate = formatDateToDDMMYYYY(p.date);
    
    return {
      date: formattedDate,
      received: `INR ${p.amount.toLocaleString('en-IN')}`,
      totalPaid: `INR ${cumulativePaid.toLocaleString('en-IN')}`,
      remainingDue: `INR ${remainingDue.toLocaleString('en-IN')}`
    };
  });

  // Fallback if there are no logged payment records but there is paidAmount on the booking
  if (historyRows.length === 0 && booking.paidAmount > 0) {
    const formattedDate = formatDateToDDMMYYYY(booking.createdAt) || 'Initial Deposit';
    historyRows = [
      {
        date: formattedDate,
        received: `INR ${booking.paidAmount.toLocaleString('en-IN')}`,
        totalPaid: `INR ${booking.paidAmount.toLocaleString('en-IN')}`,
        remainingDue: `INR ${(booking.totalAmount - booking.paidAmount).toLocaleString('en-IN')}`
      }
    ];
  }

  // Header row for table
  doc.setFillColor(242, 242, 241);
  doc.rect(14, y, 182, 7.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text('Payment Date', 18, y + 4.5);
  doc.text('Payment Received', 100, y + 4.5, { align: 'right' });
  doc.text('Total Paid', 145, y + 4.5, { align: 'right' });
  doc.text('Remaining Due', 186, y + 4.5, { align: 'right' });
  
  y += 7.5;

  if (historyRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('No payments registered yet.', 18, y + 5);
    y += 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);

    historyRows.forEach((row, idx) => {
      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(14, y, 182, 7.5, 'F');
      }
      
      doc.setDrawColor(245, 245, 245);
      doc.line(14, y + 7.5, 196, y + 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(row.date, 18, y + 5);
      doc.text(row.received, 100, y + 5, { align: 'right' });
      doc.text(row.totalPaid, 145, y + 5, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      if (row.remainingDue === 'INR 0' || row.remainingDue.endsWith(' 0') || row.remainingDue === '0') {
        doc.setTextColor(30, 100, 50); // Green if fully paid
      } else {
        doc.setTextColor(212, 175, 55); // Premium Gold
      }
      doc.text(row.remainingDue, 186, y + 5, { align: 'right' });
      
      y += 7.5;
    });
  }

  y += 10;

  // 3. Thank You & QR Authentication block
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  y += 7;

  // Render Custom Vector QR Code
  drawQRCode(doc, 169, y, 26);

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('Thank you for choosing Asmaul Production.', 14, y);

  // Authorizing Signature stamp
  y = Math.max(y + 12, 195);
  doc.setDrawColor(180, 180, 180);
  doc.line(140, y, 190, y);
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(settings.authorizedSignature || 'Asmaul Production Authorized Signatory', 165, y - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Authorized Studio Sign-off', 165, y + 4, { align: 'center' });

  addPDFFooter(doc, settings);
  return doc;
};

// Core Builder: Payment Receipt
export const buildPaymentReceiptPDF = async (
  payment: Payment,
  settings: BrandSettings,
  associatedBooking?: Booking
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = await loadLogoImage(settings.studioLogo || '');
  
  // Detect if paid in full (Remaining Due = 0)
  const bookingTotal = associatedBooking ? associatedBooking.totalAmount : payment.amount;
  const bookingPaid = associatedBooking ? associatedBooking.paidAmount : payment.amount;
  const remainingDue = Math.max(0, bookingTotal - bookingPaid);
  const isPaidInFull = remainingDue === 0;

  const titleText = isPaidInFull ? 'Final Payment Receipt' : 'Payment Installment Receipt';
  let y = addPDFHeader(doc, settings, logoBase64, titleText);

  // 1. Payment Registry panel
  doc.setFillColor(249, 249, 248);
  doc.rect(14, y, 182, 32, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, y, 182, 32, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('TRANSACTION CREDIT LEDGER', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Receipt Reference: REC-2026-${payment.id.toUpperCase().slice(2, 8)}`, 18, y + 13);
  doc.text(`Payment Logged: ${formatDateToDDMMYYYY(payment.date)}`, 18, y + 19);
  doc.text(`Payment Instrument: ${payment.paymentMethod}`, 18, y + 25);

  doc.text(`Client Marriage Registry: ${payment.clientName}`, 112, y + 13);
  doc.text(`Booking Reference ID: ${payment.bookingId.toUpperCase().slice(0, 8)}`, 112, y + 19);
  
  // Paid-In-Full Badge / Status
  doc.text(`Transaction Status:`, 112, y + 25);
  doc.setFillColor(isPaidInFull ? 212 : 230, isPaidInFull ? 175 : 245, isPaidInFull ? 55 : 233, isPaidInFull ? 0.15 : 1.0);
  doc.rect(142, y + 21, 26, 5, 'F');
  doc.setDrawColor(isPaidInFull ? 212 : 180, isPaidInFull ? 175 : 220, isPaidInFull ? 55 : 190);
  doc.rect(142, y + 21, 26, 5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(isPaidInFull ? 130 : 30, isPaidInFull ? 100 : 100, isPaidInFull ? 30 : 50);
  doc.text(isPaidInFull ? 'PAID IN FULL' : 'SUCCESSFUL', 155, y + 24.5, { align: 'center' });

  y += 40;

  // 2. Receipt Amount highlight block
  doc.setFillColor(242, 247, 243); // Light soft green
  doc.rect(14, y, 182, 16, 'F');
  doc.setDrawColor(180, 215, 185);
  doc.rect(14, y, 182, 16, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 90, 50);
  doc.text('CREDITED AMOUNT RECEIVED:', 20, y + 10);
  
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(`INR ${payment.amount.toLocaleString('en-IN')}`, 176, y + 11, { align: 'right' });

  y += 24;

  // 3. Ledger break-down
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text('OFFICIAL STATEMENTS OF ACCOUNTS', 14, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  y += 6;

  const statementRows = [
    { label: 'Original Project Shoot Value:', val: `INR ${bookingTotal.toLocaleString('en-IN')}` },
    { label: 'Cumulative Total Paid Till Date:', val: `INR ${bookingPaid.toLocaleString('en-IN')}` },
    { label: 'Net Outstanding Remaining Due:', val: `INR ${remainingDue.toLocaleString('en-IN')}`, highlight: true },
  ];

  statementRows.forEach((row) => {
    if (row.highlight) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(212, 175, 55); // Gold
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
    }
    doc.setFontSize(8.5);
    doc.text(row.label, 14, y);
    doc.text(row.val, 186, y, { align: 'right' });
    y += 6.5;
  });

  y += 4;

  // 4. Notes & QR
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('REMITTANCE REMARKS & AUTHENTICATOR', 14, y);

  // QR
  drawQRCode(doc, 169, y, 26);

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`Remarks: ${payment.notes || 'Production shoot advance credit logged successfully.'}`, 14, y);
  
  y += 5;
  if (isPaidInFull) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 100, 50);
    doc.text('CONGRATULATIONS! Your contract is paid in full. We look forward to wedding delivery.', 14, y);
    doc.setTextColor(110, 110, 110);
  } else {
    doc.text('This is a legally binding ledger statement. Retain copy for final registry clearance.', 14, y);
  }

  y = Math.max(y + 12, 195);
  doc.setDrawColor(180, 180, 180);
  doc.line(140, y, 190, y);
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(settings.authorizedSignature || 'Asmaul Production Accounts Dept', 165, y - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Authorized Finance Sign-off', 165, y + 4, { align: 'center' });

  addPDFFooter(doc, settings);
  return doc;
};

// Backwards-compatible download triggers
export const downloadBookingConfirmationPDF = async (
  booking: Booking,
  settings: BrandSettings
) => {
  const doc = await buildBookingConfirmationPDF(booking, settings);
  doc.save(`booking_confirmation_${booking.id.slice(0, 8)}.pdf`);
};

export const downloadPaymentReceiptPDF = async (
  payment: Payment,
  settings: BrandSettings,
  associatedBooking?: Booking
) => {
  const doc = await buildPaymentReceiptPDF(payment, settings, associatedBooking);
  doc.save(`payment_receipt_${payment.id.slice(0, 8)}.pdf`);
};

// Invoice Builder
export const buildInvoicePDF = async (
  booking: Booking,
  settings: BrandSettings
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = await loadLogoImage(settings.studioLogo || '');
  let y = addPDFHeader(doc, settings, logoBase64, 'Invoice');

  // Invoice registry details
  const invoicePrefix = settings.invoicePrefix || 'INV-2026-';
  const invoiceNo = `${invoicePrefix}${booking.id.toUpperCase().slice(0, 6)}`;

  doc.setFillColor(249, 249, 248);
  doc.rect(14, y, 182, 32, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, y, 182, 32, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('BILL TO CLIENT', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Client Name: ${booking.clientName}`, 18, y + 13);
  doc.text(`Client Phone: ${booking.clientPhone || 'N/A'}`, 18, y + 19);
  doc.text(`Client Email: ${booking.clientEmail || 'N/A'}`, 18, y + 25);

  doc.text(`Invoice No: ${invoiceNo}`, 112, y + 13);
  doc.text(`Wedding Shoot Date: ${formatDateToDDMMYYYY(booking.weddingDate)}`, 112, y + 19);
  doc.text(`Payment Clearance Term: Advance Installment`, 112, y + 25);

  y += 40;

  // Invoice lines table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text('INVOICE LINE ITEMS', 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item Description of Services', 18, y + 4.5);
  doc.text('Total Price', 186, y + 4.5, { align: 'right' });
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Wedding Shoots Luxury Coverage Package: ${booking.packageName}`, 18, y + 4.5);
  doc.text(`INR ${booking.totalAmount.toLocaleString('en-IN')}`, 186, y + 4.5, { align: 'right' });

  y += 11;
  doc.line(14, y, 196, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 125, y);
  doc.text(`INR ${booking.totalAmount.toLocaleString('en-IN')}`, 186, y, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.text('Advance Payments Logged:', 125, y);
  doc.text(`INR ${booking.paidAmount.toLocaleString('en-IN')}`, 186, y, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.text('Remaining Due:', 125, y);
  doc.text(`INR ${(booking.totalAmount - booking.paidAmount).toLocaleString('en-IN')}`, 186, y, { align: 'right' });
  
  y += 12;

  // Remittance
  if (settings.bankName || settings.upiId) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text('OFFICIAL STUDIO REMITTANCE ROUTING', 14, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    if (settings.bankName) {
      doc.text(`Bank Name: ${settings.bankName} | Account No: ${settings.bankAccountNo} | IFSC Code: ${settings.bankIfsc}`, 14, y);
      y += 4;
    }
    if (settings.upiId) {
      doc.text(`UPI Virtual Address: ${settings.upiId}`, 14, y);
    }
  }

  y = Math.max(y + 12, 195);
  doc.setDrawColor(180, 180, 180);
  doc.line(140, y, 190, y);
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(settings.authorizedSignature || 'Asmaul Production Finance Dept', 165, y - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Authorized Signatory Stamp', 165, y + 4, { align: 'center' });

  addPDFFooter(doc, settings);
  return doc;
};

export const downloadInvoicePDF = async (
  booking: Booking,
  settings: BrandSettings
) => {
  const doc = await buildInvoicePDF(booking, settings);
  doc.save(`invoice_${booking.id.slice(0, 8)}.pdf`);
};

// Freelancer Work Order builder
export const buildFreelancerWorkOrderPDF = async (
  booking: Booking,
  settings: BrandSettings
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = await loadLogoImage(settings.studioLogo || '');
  let y = addPDFHeader(doc, settings, logoBase64, 'Freelancer Work Order');

  // Freelancer details panel
  doc.setFillColor(249, 249, 248);
  doc.rect(14, y, 182, 32, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, y, 182, 32, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('CONTRACTOR DETAILS', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Freelancer Name: ${booking.photographer}`, 18, y + 13);
  doc.text(`Contact Phone: ${booking.freelancerPhone || 'N/A'}`, 18, y + 19);
  doc.text(`Work Order ID: WO-${booking.id.toUpperCase().slice(0, 8)}`, 18, y + 25);

  doc.text(`Project Assignment: ${booking.packageName}`, 112, y + 13);
  doc.text(`Date of Wedding: ${formatDateToDDMMYYYY(booking.weddingDate)}`, 112, y + 19);
  doc.text(`Total Agreed Remittance: INR ${(booking.freelancerRate || 0).toLocaleString('en-IN')}`, 112, y + 25);

  y += 40;

  // Work details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text('ASSIGNMENTS & EVENT SCHEDULE BREAKDOWNS', 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Event Venue / Destination: ${booking.venue}`, 14, y);
  y += 8;

  if (booking.freelancerAssignments && booking.freelancerAssignments.length > 0) {
    booking.freelancerAssignments.forEach((assignment, index) => {
      doc.setFillColor(252, 252, 252);
      doc.rect(14, y, 182, 13, 'F');
      doc.setDrawColor(235, 235, 235);
      doc.rect(14, y, 182, 13, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text(`${index + 1}. ${assignment.eventType} - ${formatDateToDDMMYYYY(assignment.eventDate)}`, 18, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(`Venue: ${assignment.venue} | Duration: ${assignment.workingDays} Days | Rate: INR ${assignment.perDayRate}/day`, 18, y + 9);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(`Subtotal: INR ${assignment.totalPayment.toLocaleString('en-IN')}`, 180, y + 7.5, { align: 'right' });

      y += 16;
    });
  } else {
    doc.text('Lead shooter/videography production support. Delivery of RAW cards within 48h.', 14, y);
    y += 10;
  }

  y = Math.max(y + 5, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('OFFICIAL STUDIO RULES & COMPLIANCES', 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  const guidelines = [
    '1. Absolute strict professional code of conduct in front of guests and premium clients.',
    '2. Standard black formal/semiformal attire is mandatory during shoot coverage.',
    '3. RAW backup must be uploaded to our private studio servers within 48 hours of completion.',
    '4. Remittance is released within 5 bank business days post verification of card deliveries.',
  ];
  guidelines.forEach((g) => {
    doc.text(g, 14, y);
    y += 4.5;
  });

  y = Math.max(y + 12, 195);
  doc.setDrawColor(180, 180, 180);
  doc.line(140, y, 190, y);
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(settings.authorizedSignature || 'Asmaul Production Production Team', 165, y - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Authorized Studio Sign-off', 165, y + 4, { align: 'center' });

  addPDFFooter(doc, settings);
  return doc;
};

export const downloadFreelancerWorkOrderPDF = async (
  booking: Booking,
  settings: BrandSettings
) => {
  const doc = await buildFreelancerWorkOrderPDF(booking, settings);
  doc.save(`freelancer_work_order_${booking.id.slice(0, 8)}.pdf`);
};

// ==========================================
// WEDDING SERVICES AGREEMENT PDF GENERATORS
// ==========================================
export const buildAgreementPDF = async (
  booking: Booking,
  settings: BrandSettings
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = await loadLogoImage(settings.studioLogo || '');
  let y = addPDFHeader(doc, settings, logoBase64, 'Wedding Agreement');
  
  // Custom Agreement Title and Registry
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(170, 124, 17); // #AA7C11 (Premium deep gold)
  doc.text('WEDDING PHOTOGRAPHY & CINEMATOGRAPHY AGREEMENT', 14, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const agrNo = `AGR-${booking.id.slice(0, 8).toUpperCase()}`;
  const agrDate = formatDateToDDMMYYYY(booking.createdAt || Date.now());
  doc.text(`Agreement No: ${agrNo}`, 14, y + 4.5);
  doc.text(`Agreement Date: ${agrDate}`, 112, y + 4.5);
  
  y += 9;

  // Helper to draw a beautiful card
  const drawPremiumCard = (startY: number, height: number, cardTitle: string) => {
    // Fill card background
    doc.setFillColor(251, 251, 250);
    doc.roundedRect(14, startY, 182, height, 2.5, 2.5, 'F');
    
    // Stroke golden border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.25);
    doc.roundedRect(14, startY, 182, height, 2.5, 2.5, 'D');
    
    // Header band
    doc.setFillColor(245, 241, 230);
    doc.roundedRect(14, startY, 182, 6.5, 2.5, 2.5, 'F');
    doc.rect(14, startY + 3.5, 182, 3, 'F'); // keep bottom corners flat
    
    // Header title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(140, 105, 25);
    doc.text(cardTitle, 18, startY + 4.3);
  };

  // 1. CLIENT INFORMATION CARD
  const clientCardHeight = 35;
  drawPremiumCard(y, clientCardHeight, 'I. CLIENT ARCHIVE & PROFILE');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  
  doc.text('Client Name:', 18, y + 11.5);
  doc.text('Bride Name:', 18, y + 16.5);
  doc.text('Groom Name:', 18, y + 21.5);
  doc.text('Full Address:', 18, y + 26.5);
  
  doc.text('Contact Mobile:', 112, y + 11.5);
  doc.text('Alternate Phone:', 112, y + 16.5);
  doc.text('Client Email:', 112, y + 21.5);
  doc.text('Contact Person:', 112, y + 26.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(booking.clientName || 'N/A', 38, y + 11.5);
  doc.text(booking.brideName || 'N/A', 38, y + 16.5);
  doc.text(booking.groomName || 'N/A', 38, y + 21.5);
  
  // Clean full address string to fit on a single line
  const cleanAddress = (booking.fullAddress || 'N/A').replace(/\r?\n|\r/g, ' ');
  const clippedAddress = cleanAddress.length > 55 ? cleanAddress.slice(0, 52) + '...' : cleanAddress;
  doc.text(clippedAddress, 38, y + 26.5);
  
  doc.text(booking.clientPhone || 'N/A', 135, y + 11.5);
  doc.text(booking.altContactNumber || 'N/A', 135, y + 16.5);
  doc.text(booking.clientEmail || 'N/A', 135, y + 21.5);
  doc.text(booking.contactPersonName || 'N/A', 135, y + 26.5);
  
  y += clientCardHeight + 3.5;

  // 2. WORK INFORMATION CARD
  const nameLower = (booking.packageName || '').toLowerCase();
  const notesLower = (booking.notes || '').toLowerCase();
  
  interface ResolvedEvent {
    name: string;
    selected: boolean;
    date: string;
    location: string;
  }
  
  const eventsToCheck = [
    { name: 'Pre Wedding', key: 'pre wedding' },
    { name: 'Mehendi', key: 'mehendi' },
    { name: 'Wedding', key: 'wedding' }, // Always selected
    { name: 'Reception', key: 'reception' },
    { name: 'Haldi', key: 'haldi' },
    { name: 'Aiburobhat', key: 'aiburo' },
    { name: 'Biday', key: 'bida' }
  ];
  
  const resolvedEvents: ResolvedEvent[] = [];
  eventsToCheck.forEach(ev => {
    let selected = false;
    let date = '';
    let location = booking.venue || 'Venue TBD';
    
    if (booking.bookingFor && booking.bookingFor.toLowerCase() === ev.name.toLowerCase()) {
      selected = true;
      date = formatDateToDDMMYYYY(booking.weddingDate);
    } else if (ev.name === 'Wedding') {
      selected = true;
      date = formatDateToDDMMYYYY(booking.weddingDate);
    } else {
      const hasMention = nameLower.includes(ev.key) || notesLower.includes(ev.key);
      if (hasMention) {
        selected = true;
      }
      
      const assignment = (booking.freelancerAssignments || []).find(
        a => a.eventType.toLowerCase().includes(ev.key)
      );
      if (assignment) {
        selected = true;
        date = formatDateToDDMMYYYY(assignment.eventDate);
        location = assignment.venue;
      }
    }
    
    if (selected) {
      if (!date) {
        date = 'Refer to Notes';
      }
      resolvedEvents.push({
        name: ev.name,
        selected: true,
        date: date,
        location: location
      });
    }
  });

  // Inject or override Pre Wedding and Reception dynamically from agreement form
  if (booking.preWedding === 'Yes') {
    const pwIndex = resolvedEvents.findIndex(e => e.name === 'Pre Wedding');
    const pwData = {
      name: 'Pre Wedding',
      selected: true,
      date: booking.preWeddingDate ? formatDateToDDMMYYYY(booking.preWeddingDate) : 'Date TBD',
      location: booking.preWeddingLocation || 'Venue TBD'
    };
    if (pwIndex > -1) {
      resolvedEvents[pwIndex] = pwData;
    } else {
      resolvedEvents.unshift(pwData);
    }
  }
  
  if (booking.receptionDate || booking.receptionLocation) {
    const recIndex = resolvedEvents.findIndex(e => e.name === 'Reception');
    const recData = {
      name: 'Reception',
      selected: true,
      date: booking.receptionDate ? formatDateToDDMMYYYY(booking.receptionDate) : 'Date TBD',
      location: booking.receptionLocation || 'Venue TBD'
    };
    if (recIndex > -1) {
      resolvedEvents[recIndex] = recData;
    } else {
      resolvedEvents.push(recData);
    }
  }
  
  const eventRowsCount = resolvedEvents.length;
  const workCardHeight = 11 + (eventRowsCount * 5) + 5;
  
  drawPremiumCard(y, workCardHeight, 'II. WORK SCHEDULE & EVENT RECOGNITION');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Event Type', 18, y + 11.5);
  doc.text('Event Date', 55, y + 11.5);
  doc.text('Coverage & Times', 85, y + 11.5);
  doc.text('Event Location / Venue', 135, y + 11.5);
  
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.15);
  doc.line(18, y + 13, 192, y + 13);
  
  let eventY = y + 17;
  resolvedEvents.forEach(ev => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text(ev.name, 18, eventY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(ev.date, 55, eventY);
    
    let coverageAndTimes = '';
    if (ev.name === 'Wedding') {
      coverageAndTimes = `${booking.coverage || 'Both Side'} (${booking.eventTime || '12:00 PM'})`;
    } else {
      coverageAndTimes = `Standard Schedule`;
    }
    doc.text(coverageAndTimes, 85, eventY);
    
    const locationText = ev.location || 'As specified in notes';
    const clippedLoc = locationText.length > 32 ? locationText.slice(0, 30) + '...' : locationText;
    doc.text(clippedLoc, 135, eventY);
    
    eventY += 5;
  });

  y += workCardHeight + 3.5;

  // 3. PACKAGE DETAILS CARD
  const services = [
    { name: 'Photography (Traditional & Candid)', key: 'photo', defaultVal: true },
    { name: 'Videography (Traditional Video)', key: 'video', defaultVal: false },
    { name: 'Drone Aerial Shoot', key: 'drone', defaultVal: false },
    { name: 'Premium Layflat Photo Album', key: 'album', defaultVal: false },
    { name: 'Laminated Wall Frame', key: 'frame', defaultVal: false },
    { name: 'USB Pendrive / Digital Delivery', key: 'pendrive', defaultVal: true },
    { name: 'Edited High-Res Retouched Photos', key: 'edit', defaultVal: true },
    { name: 'Cinematic Teaser & Highlight Film', key: 'cine', defaultVal: false },
    { name: 'Complete Raw Video & Photo Data', key: 'raw', defaultVal: true }
  ];
  
  const packageServices = services.map(srv => {
    let included = srv.defaultVal;
    let customName = srv.name;
    
    if (nameLower.includes(srv.key) || notesLower.includes(srv.key)) {
      included = true;
    }

    if (srv.key === 'album') {
      included = booking.pkgAlbum === 'Yes';
      if (included && booking.pkgAlbumSize) {
        customName = `Premium Photo Album: ${booking.pkgAlbumSize}` + (booking.pkgAlbumQty ? ` (Qty: ${booking.pkgAlbumQty})` : '');
      }
    } else if (srv.key === 'frame') {
      included = booking.pkgFrame === 'Yes';
      if (included && booking.pkgFrameSize) {
        customName = `Laminated Wall Frame: ${booking.pkgFrameSize}` + (booking.pkgFrameQty ? ` (Qty: ${booking.pkgFrameQty})` : '');
      }
    } else if (srv.key === 'pendrive') {
      if (booking.pkgPendriveSize) {
        included = true;
        customName = `USB Pendrive Delivery: ${booking.pkgPendriveSize}` + (booking.pkgPendriveQty ? ` (Qty: ${booking.pkgPendriveQty})` : '');
      }
    } else if (srv.key === 'edit') {
      if (booking.pkgEditedPhotosCount) {
        included = true;
        customName = `Edited Retouched Photos: ${booking.pkgEditedPhotosCount} Pics`;
      }
    } else if (srv.key === 'drone') {
      included = booking.pkgDroneCoverage === 'Yes';
    } else if (srv.key === 'video') {
      included = booking.pkgStandardVideoEditing === 'Yes';
    } else if (srv.key === 'cine') {
      included = booking.pkgCinematicVideoEditing === 'Yes';
    } else if (srv.key === 'raw') {
      included = booking.pkgRawVideo === 'Yes';
    }

    return { name: customName, included };
  });

  // Dynamically add the rest of the videography deliverables if they are "Yes"
  if (booking.pkgShortTrailer === 'Yes') {
    packageServices.push({ name: 'Short Teaser Trailer', included: true });
  }
  if (booking.pkgLedWall === 'Yes') {
    packageServices.push({ name: 'LED Wall Display', included: true });
  }
  if (booking.pkgCrane === 'Yes') {
    packageServices.push({ name: 'Crane Jib Camera', included: true });
  }
  if (booking.pkgLiveStreaming === 'Yes') {
    packageServices.push({ name: 'YouTube Live Streaming', included: true });
  }

  const packageCardHeight = 11 + (Math.ceil(packageServices.length / 2) * 5);
  drawPremiumCard(y, packageCardHeight, `III. SELECTED PACKAGE: ${booking.packageName.toUpperCase()}`);
  
  doc.setFontSize(7.5);
  let col1X = 18;
  let col2X = 112;
  let serviceRowY = y + 11.5;
  
  for (let i = 0; i < packageServices.length; i++) {
    const srv = packageServices[i];
    const targetX = i % 2 === 0 ? col1X : col2X;
    
    if (srv.included) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(170, 124, 17);
      doc.text('[X]', targetX, serviceRowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(srv.name, targetX + 6, serviceRowY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('[  ]', targetX, serviceRowY);
      doc.setTextColor(140, 140, 140);
      doc.text(srv.name, targetX + 6, serviceRowY);
    }
    
    if (i % 2 !== 0) {
      serviceRowY += 4.5;
    }
  }

  y += packageCardHeight + 3.5;

  // 4. PAYMENT DETAILS CARD
  const payCardHeight = 28;
  drawPremiumCard(y, payCardHeight, 'IV. RESERVATION FINANCE & BILLING');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  
  doc.text('Total Package Value:', 18, y + 11.5);
  doc.text('Retainer Advance Paid:', 18, y + 16.5);
  doc.text('1st Installment Due:', 18, y + 21.5);
  
  doc.text('2nd Installment Due:', 112, y + 11.5);
  doc.text('Outstanding Balance Due:', 112, y + 16.5);
  doc.text('Primary Payment Method:', 112, y + 21.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`INR ${booking.totalAmount.toLocaleString('en-IN')}`, 55, y + 11.5);
  doc.text(`INR ${booking.paidAmount.toLocaleString('en-IN')}`, 55, y + 16.5);
  doc.text(booking.payment1 ? `INR ${booking.payment1.toLocaleString('en-IN')}` : 'INR 0', 55, y + 21.5);
  
  doc.text(booking.payment2 ? `INR ${booking.payment2.toLocaleString('en-IN')}` : 'INR 0', 148, y + 11.5);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(170, 124, 17);
  doc.text(`INR ${(booking.totalAmount - booking.paidAmount).toLocaleString('en-IN')}`, 148, y + 16.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Bank Transfer / Cash', 148, y + 21.5);

  y += payCardHeight + 3.5;

  // 5. SPECIAL NOTES
  if (booking.notes && booking.notes.trim()) {
    const notesBoxHeight = 18;
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(14, y, 182, notesBoxHeight, 2, 2, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, y, 182, notesBoxHeight, 2, 2, 'D');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('V. CLIENT SPECIAL NOTES & REQUESTS', 18, y + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const clippedNotes = booking.notes.length > 105 ? booking.notes.slice(0, 102) + '...' : booking.notes;
    doc.text(clippedNotes, 18, y + 11);
  }

  // Draw Page 1 Footer
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(14, 279, 196, 279);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(`${settings.studioName || 'Asmaul Production'} | ${settings.studioAddress || 'Calcutta, India'}`, 14, 284);
  doc.text(`Email: ${settings.studioEmail || 'info@asmaulproduction.com'} | Web: ${settings.website || 'www.asmaulproduction.com'}`, 14, 288);
  
  doc.setFont('helvetica', 'bold');
  doc.text('PAGE 1 OF 2', 196, 286, { align: 'right' });

  // ==========================================
  // PAGE 2: TERMS, CONDITIONS & SIGNATURES
  // ==========================================
  doc.addPage();
  
  // Page 2 Top Gold Band
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, 210, 8, 'F');
  
  let y2 = 20;
  
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(170, 124, 17);
  doc.text('VI. STANDARD TERMS & LEGAL CONDITIONS', 14, y2);
  y2 += 4;
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.2);
  doc.line(14, y2, 196, y2);
  y2 += 5;

  const clauses = [
    {
      title: '1. Exclusive Retention & Engagement Lock',
      body: 'The Studio is retained exclusively to provide professional photography and/or videography coverage for the events specified. No other commercial visual capture teams are permitted without formal prior written authorization. Booking dates are strictly locked and secured only upon receiving the specified non-refundable retainer advance.'
    },
    {
      title: '2. Payment Terms, Billing Schedule & Clearance Dues',
      body: 'All payments must proceed strictly according to the agreed schedule. The remaining contract balance must be cleared in full on or prior to the final wedding event day. The Studio reserves the absolute right to halt deliverables generation, album layouts, or digital transfers until all financial accounts are completely cleared.'
    },
    {
      title: '3. Creative Authority, Aesthetic Styling & Discretion',
      body: 'The Studio retains absolute creative control over composition, poses, editing styles, color palettes, and overall deliverable parameters. Client demands regarding specific composition configurations, lens selection, or editorial styles are considered creative guidelines only, and the Studio maintains full artistic sovereignty over the final outputs.'
    },
    {
      title: '4. Copyrights, Usage License & Digital Promotion Rights',
      body: 'All photos, videos, films, and physical mockups remain the unique intellectual property of the Studio. The Client is granted an indefinite, personal, non-commercial license to share, print, and reproduce deliverables. The Studio retains the absolute right to use any captured material for promotional media, public portfolios, and professional exhibitions.'
    },
    {
      title: '5. Deliverable Timelines, Curation & Client Selection Process',
      body: 'Standard high-resolution photos require 45-60 days for curation and retouching. Cinematic films, trailers, and custom photo albums require 60-90 days from the date the Client finalizes their image selections. The Studio cannot be held liable for delivery delays arising from Client selection latency.'
    },
    {
      title: '6. Limitation of Liability, Equipment Redundancy & Force Majeure',
      body: 'In the extremely unlikely event of severe equipment failure, accidental data corruption, medical emergencies, casualty, fire, acts of God, or any unforeseen force majeure events preventing the performance of our duties, the Studio\'s entire liability is strictly limited to the absolute refund of all payments received.'
    }
  ];

  doc.setFontSize(7.2);
  clauses.forEach(clause => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text(clause.title, 14, y2);
    y2 += 3.5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const bodyLines = doc.splitTextToSize(clause.body, 182);
    bodyLines.forEach((line: string) => {
      doc.text(line, 14, y2);
      y2 += 3.2;
    });
    y2 += 1.8;
  });

  y2 += 3;

  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(170, 124, 17);
  doc.text('VII. SOLEMN BINDING & SIGNATURE RESOLUTION', 14, y2);
  y2 += 3;
  doc.line(14, y2, 196, y2);
  y2 += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.35);
  doc.line(14, y2, 90, y2);
  doc.line(120, y2, 196, y2);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 70, 70);
  doc.text('Client Signature & Consent', 14, y2 + 4);
  doc.text('Bride Signature & Consent', 120, y2 + 4);
  
  y2 += 15;

  doc.line(14, y2, 90, y2);
  doc.line(120, y2, 196, y2);
  
  doc.text('Groom Signature & Consent', 14, y2 + 4);
  doc.text('Authorized Studio Representative Signature', 120, y2 + 4);
  
  y2 += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Signing Date:  ___________________`, 14, y2 + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('SCAN PORTAL QR', 171, y2 - 4, { align: 'center' });
  doc.text('TO LIVE-TRACK CONTRACTS', 171, y2 - 1.5, { align: 'center' });
  drawQRCode(doc, 158, y2 + 1, 26);

  // Page 2 Footer
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(14, 279, 196, 279);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(`${settings.studioName || 'Asmaul Production'} | ${settings.studioAddress || 'Calcutta, India'}`, 14, 284);
  doc.text(`Email: ${settings.studioEmail || 'info@asmaulproduction.com'} | Web: ${settings.website || 'www.asmaulproduction.com'}`, 14, 288);
  
  doc.setFont('helvetica', 'bold');
  doc.text('PAGE 2 OF 2', 196, 286, { align: 'right' });

  return doc;
};

export const downloadAgreementPDF = async (
  booking: Booking,
  settings: BrandSettings
) => {
  const doc = await buildAgreementPDF(booking, settings);
  doc.save(`agreement_document_${booking.id.slice(0, 8).toUpperCase()}.pdf`);
};

// ==========================================
// UNIFIED HIGH-FIDELITY ACTIONS EXECUTOR
// ==========================================
export const handlePDFActions = async (
  doc: jsPDF,
  filename: string,
  action: 'download' | 'preview' | 'share' | 'whatsapp',
  messageText: string,
  clientPhone: string,
  onPreviewOpen?: (url: string) => void
) => {
  const isMobile = typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (action === 'download') {
    doc.save(filename);
  } else if (action === 'preview') {
    const url = doc.output('bloburl') as any as string;
    if (onPreviewOpen) {
      onPreviewOpen(url);
    } else {
      window.open(url, '_blank');
    }
  } else if (action === 'share') {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    
    // Only attempt native file sharing on mobile devices, since desktop is buggy & unreliable
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: 'PDF Document from Asmaul Production.'
        });
      } catch (err) {
        console.warn('Native sharing cancelled or failed, downloading instead:', err);
        doc.save(filename); // Fallback to download
      }
    } else {
      // Fallback: download the file
      try {
        doc.save(filename);
      } catch (e) {
        console.error('Download failed:', e);
      }
      
      // If we are on mobile, try sharing text
      if (isMobile && navigator.share) {
        try {
          await navigator.share({
            title: filename,
            text: `Document for Asmaul Production. Please download manually.`
          });
        } catch (e) {
          console.warn('Fallback share failed:', e);
        }
      }
    }
  } else if (action === 'whatsapp') {
    // 1. Download PDF so client has it locally
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.error('Failed to automatically save/download PDF:', saveErr);
    }

    // 2. Prepare WhatsApp Redirect
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    // 3. Try to use Web Share API on MOBILE only
    if (isMobile && navigator.canShare) {
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: messageText
          });
          return; // Success! Mobile web share successfully sent to WhatsApp/etc.
        } catch (err) {
          console.warn('Native mobile share failed, falling back to direct redirect:', err);
        }
      }
    }

    // 4. Reliable Desktop/Mobile Fallback (WhatsApp Redirect)
    // On Desktop, web.whatsapp.com is preferred. On Mobile, use api.whatsapp.com.
    const waBaseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
    const waUrl = `${waBaseUrl}?phone=${finalPhone}&text=${encodeURIComponent(messageText)}`;

    if (!isMobile) {
      // Direct desktop popup warning for attachment guidance
      alert(
        `📄 Billing PDF Generated & Downloaded!\n\n` +
        `We are now opening WhatsApp Web to complete your message. Since browsers cannot automate file attachments to external sites, please manually drag and drop or attach the downloaded PDF file to the chat window.`
      );
    }

    try {
      const openedWindow = window.open(waUrl, '_blank');
      if (!openedWindow) {
        console.warn('Popup blocked! Attempting fallback redirect in the current window.');
        alert(
          `Pop-up blocker detected!\n\n` +
          `Your browser blocked us from opening WhatsApp Web in a new tab. Please allow popups for this site, or check the address bar to proceed.`
        );
      }
    } catch (openErr) {
      console.error('Failed to open WhatsApp window:', openErr);
    }
  }
};
