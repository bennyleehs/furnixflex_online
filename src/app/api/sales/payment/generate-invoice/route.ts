import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

async function generateQRCode(data: string): Promise<string> {
  try {
    // Generate QR code as data URL
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 150,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

export async function POST(request: Request) {
  try {

    const data = await request.json();

    // console.log('Received data:', data);
    if (!data || !data.invoice_number || !data.task_id) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }
    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'sales', data.task_id, 'Invoice');
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    // Create a safe filename from quotation number
    const safeFilename = data.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_');
    // const filePath = path.join(uploadsDir, `Quotation-${safeFilename}.pdf`);
    
    // Check if file already exists and generate a unique name with incrementing index if needed
    // let fileIndex = 0;
    let fileName = `${safeFilename}.pdf`;
    let filePath = path.join(uploadsDir, fileName);
    
    // while (fs.existsSync(filePath)) {
    //   fileIndex++;
    //   fileName = `${safeFilename}-${fileIndex.toString()}.pdf`;
    //   filePath = path.join(uploadsDir, fileName);
    // }
    
    // Generate PDF using jsPDF
    const pdfBuffer = await generateInvoicePDF(data);
    // const pdfBuffer = await generateInvoicePDF(data, fileIndex);
    
    // Save the PDF to the file system
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Return success response with the file path
    // return NextResponse.json({
    //   success: true,
    //   message: 'PDF saved successfully',
    //   filePath: filePath.replace(process.cwd(), ''),
    //   fileName: `Q-${safeFilename}.pdf`
    // });

    // Return the PDF with invoice number in the URL
        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${data.invoice_number}.pdf"`,
            // Add a custom header for the frontend to extract the invoice number
            'X-Invoice-Number': data.invoice_number
          }
        });

  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    );
  }
}

async function generateInvoicePDF(data: any): Promise<Buffer> {
  // Create a new jsPDF instance
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Define margins
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // ----- HEADER SECTION WITH LOGO -----
  
  // Add logo on the left side
try {
    // If a logo URL is provided in the data
    if (data.company.logo && data.company.logo.startsWith('data:image')) {
      // Logo is provided as base64 data URL
      const logoData = data.company.logo.split(',')[1];
      doc.addImage(logoData, 'PNG', margin, margin - 8, 40, 15);
    } else {
      // Use a default logo path
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo', 'classy_logo_gray.png');
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = logoData.toString('base64');
        doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', margin, margin - 8, 40, 15);
      }
    }
  } catch (error) {
    console.error('Error adding logo:', error);
    // Continue without the logo if there's an error
  }
  
  // Company name with larger font
  doc.setFontSize(20);
  // doc.setFont('courier', 'bold');
  // doc.setFont('helvetica', 'bold');
  doc.setFont('times', 'bold');
  // doc.setFont('symbol', 'bold');
  // doc.setFont('zapfdingbats', 'bold');
  doc.text(data.company.name, pageWidth / 2 + margin , margin -2, { align: 'center' });
  
  // Company details with smaller font
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(data.company.address, pageWidth / 2 + margin, margin + 3, { align: 'center' });
  doc.text(`Tel: ${data.company.phone} | Email: ${data.company.email} | Email: ${data.company.website}`, 
    pageWidth / 2 + margin, margin + 7, { align: 'center' });
  
  // Horizontal line separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, margin + 10, pageWidth - margin, margin + 10);

  // ----- THREE-SECTION HEADER LAYOUT -----
  // Top position for all three sections
  const sectionTop = margin + 16;
  // Calculate column widths and positions
  const columnWidth = (pageWidth - (2 * margin)) / 3;
  const col1X = margin;
  const col2X = margin + columnWidth -5;
  const col3X = margin + (columnWidth * 2) +12;

  // Quotation information with labels and values vertically aligned
  const valueC1 = col1X + 11;
  const labelX = col3X;
  const valueC3 = col3X + 10; // Offset for values

  // Column Headers
  doc.setFontSize(12);
  doc.setFont('courier', 'bold'); // Using fontLable object
  doc.text('CUSTOMER', col1X, sectionTop);
  doc.text('ADDRESS', col2X, sectionTop);
  doc.text('INVOICE', col3X, sectionTop);

  // Add underlines for headers
  const lineY = sectionTop + 1;
  doc.setLineWidth(0.3);
  doc.line(col1X, lineY, col1X + doc.getTextWidth('CUSTOMER'), lineY);
  doc.line(col2X, lineY, col2X + doc.getTextWidth('ADDRESS'), lineY);
  doc.line(col3X, lineY, col3X + doc.getTextWidth('INVOICE'), lineY);

  // Column Labels
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text('Name:', col1X, sectionTop + 5);
  doc.text('NRIC:', col1X, sectionTop + 10);
  doc.text('TEL:', col1X, sectionTop + 15);
  doc.text('Email:', col1X, sectionTop + 20);

  doc.text('Property:', col2X, sectionTop + 20);
  doc.text('Access:', col2X+32, sectionTop + 20);

  doc.text('REF:', labelX, sectionTop + 5);
  doc.text('QUO:', labelX, sectionTop + 10);
  doc.text('Date:', labelX, sectionTop + 15);
  doc.text('PIC:', labelX, sectionTop + 20);
  // doc.text('Terms :', labelX, sectionTop + 20);

  // Column Contents
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.text(data.customer_name, valueC1, sectionTop + 5);
  doc.text(data.customer_nric || "", valueC1, sectionTop + 10);
  doc.text(data.customer_contact, valueC1, sectionTop + 15);
  doc.text(data.customer_email || "", valueC1, sectionTop + 20);

  doc.text(data.customer_property || "", col2X+14, sectionTop + 20);
  doc.text(data.customer_guard || "", col2X+44, sectionTop + 20);
  
  // Initialize addressLinesArray with an empty array
  let addressLinesArray = [];
  // Add shipping address if available
  if (data.customer_address) {
    const shipAddress = data.customer_address;
    // First split by commas and trim each part
    const addressParts = shipAddress.split(',').map((part: string) => part.trim()).filter((part: any) => part);
    
    // Format according to specific pattern:
    // Line 1: First 2 parts
    // Line 2: Next 3 parts
    // Line 3: All remaining parts
    
    if (addressParts.length > 0) {
      // First line - first 2 parts with comma at end
      const firstLine = addressParts.slice(0, 2).join(', ') + ',';
      addressLinesArray.push(firstLine);
      
      // Second line - next 3 parts with comma at end
      if (addressParts.length > 2) {
        const secondLine = addressParts.slice(2, 5).join(', ') + ',';
        addressLinesArray.push(secondLine);
        
        // Third line - all remaining parts
        if (addressParts.length > 5) {
          const thirdLine = addressParts.slice(5).join(', ');
          addressLinesArray.push(thirdLine);
        }
      }
      
      // Display each line with proper spacing
      addressLinesArray.forEach((line: string, index: number) => {
        doc.text(line, col2X, sectionTop + 5 + (index * 5));
      });
    } else {
      // Default empty value if no address parts after filtering
      doc.text('N/A', col2X, sectionTop + 5);
      addressLinesArray = ['N/A'];
    }
  } else {
    // Default empty value if no address is provided
    doc.text('N/A', col2X, sectionTop + 5);
    addressLinesArray = ['N/A'];
  }

  doc.text(data.invoice_number, valueC3, sectionTop + 5);

  doc.text(data.payment_reference, valueC3, sectionTop + 10);

  doc.text(new Date(data.payment_date).toLocaleDateString(), valueC3, sectionTop + 15);

  doc.text(data.sales_representative, valueC3, sectionTop + 20);
  const salesRepWidth = doc.getTextWidth(data.sales_representative)+1;
  doc.text(`(${data.sales_uid})`, valueC3 + salesRepWidth, sectionTop + 20);
  // doc.text(data.quotation.payment_terms || '', valueC3, sectionTop + 20);

  // Continue after the header sections
  // Add payment details section
  const paymentSectionTop = sectionTop + 20;

  // Payment header
  // doc.setFontSize(14);
  // doc.setFont('times', 'bold');
  // doc.text('PAYMENT RECEIPT', pageWidth / 2, paymentSectionTop, { align: 'center' });

  // Add "PAID" watermark if payment is received
  if (data.received) {
    // Opacity is not natively supported in jsPDF for text, so we only set color and font
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 180, 0);
    doc.setFontSize(60);
    doc.text('PAID', pageWidth / 2, pageHeight / 2, { 
      align: 'center',
      angle: 45
    });
    // Reset color
    doc.setTextColor(0, 0, 0);
  }

  // Payment info table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const tableTop = paymentSectionTop + 10;

  // Table headers
  autoTable(doc, {
    startY: tableTop,
    head: [['Description', 'Quotation #', 'Method', 'Amount', 'Status']],
    body: [[
      (data.notes || 'Payment for services rendered').toUpperCase(), 
      (data.quotation_number || '').toUpperCase(),
      ((data.payment_method || 'cash').replace(/_/g, ' ')).toUpperCase(),
      formatCurrency(data.amount_inv),
      data.received ? 'RECEIVED' : 'PENDING'
    ]],
    margin: { left: margin, right: margin },
    headStyles: { 
      fillColor: [240, 240, 240], 
      textColor: [0, 0, 0],
      fontStyle: 'bold' 
    },
    bodyStyles: { textColor: [50, 50, 50] },
    columnStyles: {
      3: { 
        halign: 'right',
        fontStyle: 'bold'
      },
      4: { 
        halign: 'center' 
      }
    },
    didDrawCell: function(data) {
      // Center align just the headers for Amount and Status
      if (data.section === 'head' && (data.column.index === 3 || data.column.index === 4)) {
        // doc.setTextAlign('center'); // Removed: jsPDF does not have setTextAlign
      }
    },
    willDrawCell: function(data) {
      // Set specific alignment for the header cells
      if (data.section === 'head') {
        if (data.column.index === 3 || data.column.index === 4) {
          data.cell.styles.halign = 'center';
        }
      }
    },
    theme: 'grid'
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY +10;

  // Payment QR Code section
  const qrSectionY = finalY ;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Create a box for the QR code on the left side of the page
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, qrSectionY, 70, 80, 3, 3, 'FD');

  // Add QR code heading
  doc.text('Payment QR Code', margin + 35, qrSectionY + 7, { align: 'center' });

  // Generate payment QR code data
  // This should be replaced with your actual payment gateway URL
  const paymentAmount = Number(data.amount_inv) || 0;
  const paymentRef = data.payment_reference || data.invoice_number;
  const paymentData = `https://pay.example.com?amount=${paymentAmount}&ref=${paymentRef}&recipient=${encodeURIComponent(data.company.name)}`;

  try {
    // Generate and add QR code - but only if we're not in a received state
    if (!data.received) {
      // Generate QR code
      const qrCodeDataUrl = await generateQRCode(paymentData);
      
      // Add QR code to PDF
      doc.addImage(qrCodeDataUrl, 'PNG', margin + 10, qrSectionY + 12, 50, 50);
      
      // Add payment instructions with highlighted amount
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Scan to pay ${formatCurrency(data.amount_inv)}`, margin + 35, qrSectionY + 70, { align: 'center' });
      
      // Add additional instruction line
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      // doc.text('Use any banking app to scan this QR code', margin + 35, qrSectionY + 75, { align: 'center' });
    } else {
      // For received payments, show a "Payment Received" message instead
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 150, 0);
      doc.text('PAYMENT', margin + 35, qrSectionY + 30, { align: 'center' });
      doc.text('RECEIVED', margin + 35, qrSectionY + 40, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  } catch (error) {
    console.error('Error adding QR code:', error);
    // Continue without QR code if there's an error
  }

  // Adjust the positions of the following sections to account for the QR code
  // const paymentMethodY = Math.max(finalY + 10, qrSectionY + 10);

  // Summary section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Summary box
  doc.setDrawColor(0);
  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - margin - 70, finalY, 70, 30, 'F');
  doc.rect(pageWidth - margin - 70, finalY, 70, 30);

  // Labels and values
  // Values (right-aligned)
  doc.text('Payment Amount:', pageWidth - margin - 65, finalY + 10);
  doc.text(formatCurrency(data.amount_inv), pageWidth - margin - 5, finalY + 10, { align: 'right' });

  // Labels and values
  // Values (right-aligned)
  doc.setFont('helvetica', 'normal');
  doc.text('Remaining Balance:', pageWidth - margin - 65, finalY + 20);
  doc.text(formatCurrency(data.balance), pageWidth - margin - 5, finalY + 20, { align: 'right' });

  // Add Terms and Conditions
  const termsY = finalY + 150;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', margin, termsY);
  doc.setFont('helvetica', 'normal');

  const terms = [
    '1. This receipt acknowledges payment received for the services described above.',
    '2. All payments are non-refundable unless otherwise specified in the service agreement.',
    '3. Please retain this receipt for your records and future reference.',
    '4. Any dispute regarding this payment should be reported within 7 days of receipt date.'
  ];

  terms.forEach((term, index) => {
    doc.text(term, margin, termsY + 5 + (index * 4));
  });

  const footerY = pageHeight - 30;
  // Add dashed line instead of signature lines
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setLineDashPattern([0], 0); // Reset to solid line

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Add text indicating this is a system-generated invoice
  doc.text('SYSTEM-GENERATED INVOICE', pageWidth / 2, footerY+7, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('This is an electronically generated receipt. No signature is required.', pageWidth / 2, footerY + 12, { align: 'center' });

  // Add a verification note
  doc.setFontSize(8);
  doc.text('This document can be verified in our system using the invoice number.', pageWidth / 2, footerY + 17, { align: 'center' });





  // Convert the PDF to a buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

function formatCurrency(amount_inv: any): string {
  const amount = Number(amount_inv) || 0;
  return amount.toLocaleString('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 });
}

