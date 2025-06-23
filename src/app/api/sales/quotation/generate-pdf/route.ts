import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import fs from 'fs';
import path from 'path';
import 'jspdf-autotable';

export async function POST(request: Request) {
  try {

    const data = await request.json();
    if (!data || !data.quotation || !data.quotation.task_id) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }
    console.log('Received data:', data.quotation.task_id);
    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'sales', data.quotation.task_id, 'quotation');
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    // Create a safe filename from quotation number
    const safeFilename = data.quotation.quotation_number.replace(/[^a-zA-Z0-9-_]/g, '_');
    // const filePath = path.join(uploadsDir, `Quotation-${safeFilename}.pdf`);
    
    // Check if file already exists and generate a unique name with incrementing index if needed
    let fileIndex = 0;
    let fileName = `Q-${safeFilename}.pdf`;
    let filePath = path.join(uploadsDir, fileName);
    
    while (fs.existsSync(filePath)) {
      fileIndex++;
      fileName = `Q-${safeFilename}-${fileIndex.toString()}.pdf`;
      filePath = path.join(uploadsDir, fileName);
    }
    
    // Generate PDF using jsPDF
    const pdfBuffer = await generateQuotationPDF(data, fileIndex);
    
    // Save the PDF to the file system
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Return success response with the file path
    // return NextResponse.json({
    //   success: true,
    //   message: 'PDF saved successfully',
    //   filePath: filePath.replace(process.cwd(), ''),
    //   fileName: `Q-${safeFilename}.pdf`
    // });

    // Return the PDF
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quotation-${fileName}.pdf"`
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

async function generateQuotationPDF(data: any,fileIndex: number): Promise<Buffer> {
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
  doc.text('QUOTATION', col3X, sectionTop);
  
  // Add underlines for headers
  const lineY = sectionTop + 1;
  doc.setLineWidth(0.3);
  doc.line(col1X, lineY, col1X + doc.getTextWidth('CUSTOMER:'), lineY);
  doc.line(col2X, lineY, col2X + doc.getTextWidth('SHIP TO:'), lineY);
  doc.line(col3X, lineY, col3X + doc.getTextWidth('QUOTATION:'), lineY);

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
  doc.text('Date:', labelX, sectionTop + 10);
  doc.text('PIC:', labelX, sectionTop + 15);
  // doc.text('Terms :', labelX, sectionTop + 20);

  // Column Contents
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.text(data.quotation.customer_name, valueC1, sectionTop + 5);
  doc.text(data.quotation.customer_nric || "", valueC1, sectionTop + 10);
  doc.text(data.quotation.customer_contact, valueC1, sectionTop + 15);
  doc.text(data.quotation.customer_email || "", valueC1, sectionTop + 20);

  doc.text(data.quotation.customer_property || "", col2X+14, sectionTop + 20);
  doc.text(data.quotation.customer_guard || "", col2X+44, sectionTop + 20);

  // Initialize addressLinesArray with an empty array
  let addressLinesArray = [];
  // Add shipping address if available
  if (data.quotation.customer_address) {
    const shipAddress = data.quotation.customer_address;
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

  doc.text(data.quotation.quotation_number, valueC3, sectionTop + 5);
  doc.text(`-${fileIndex.toString()}`, valueC3+doc.getTextWidth(data.quotation.quotation_number), sectionTop + 5);
  doc.text(new Date(data.quotation.quotation_date).toLocaleDateString(), valueC3, sectionTop + 10);
  doc.text('~', valueC3+17, sectionTop + 10);
  doc.text(new Date(data.quotation.valid_until).toLocaleDateString(), valueC3 +20, sectionTop + 10);
  doc.text(data.quotation.sales_representative, valueC3, sectionTop + 15);
  const salesRepWidth = doc.getTextWidth(data.quotation.sales_representative)+1;
  doc.text(`(${data.quotation.sales_uid})`, valueC3 + salesRepWidth, sectionTop + 15);
  // doc.text(data.quotation.payment_terms || '', valueC3, sectionTop + 20);


  // ----- ITEMS TABLE SECTION -----
  // Starting y position after the header information
  let yPosition = margin + 38 + (addressLinesArray.length - 1) * 5;
  
  // Add items table header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  // doc.text('Items:', margin, yPosition);
  // yPosition += 5;
  
  // Create a manual table since autoTable might not be working
  const colWidths = [10, 80, 15, 20, 30, 30];
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]
  ];
  
  // Table header
  doc.setFillColor(80, 80, 80);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, yPosition, pageWidth - (2 * margin), 7, 'F');
  
  doc.text('No', colPositions[0] + 2, yPosition + 5);
  doc.text('Description', colPositions[1] + 2, yPosition + 5);
  doc.text('Qty', colPositions[2] + 19, yPosition + 5);
  doc.text('Unit', colPositions[3] + 15, yPosition + 5);
  doc.text('Unit Price', colPositions[4] + 10, yPosition + 5);
  doc.text('Total (RM)', colPositions[5] + 5, yPosition + 5);
  
  yPosition += 10;
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Table rows
  data.quotation.items.forEach((item: any, index: number) => {
    // Check if we need a new page
    if (yPosition + 10 > pageHeight - margin * 2) {
      doc.addPage();
      yPosition = margin;
      
      // Redraw header on new page
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Items (continued):', margin, yPosition);
      yPosition += 5;
      
      // Redraw table header
      doc.setFillColor(80, 80, 80);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, yPosition, pageWidth - (2 * margin), 7, 'F');
      
      doc.text('No', colPositions[0] + 2, yPosition + 5);
      doc.text('Description', colPositions[1] + 2, yPosition + 5);
      doc.text('Qty', colPositions[2] + 19, yPosition + 5);
      doc.text('Unit', colPositions[3] + 15, yPosition + 5);
      doc.text('Unit Price', colPositions[4] + 10, yPosition + 5);
      doc.text('Total (RM)', colPositions[5] + 5, yPosition + 5);
      
      yPosition += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }
    
    // Draw row lines
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition + 6, pageWidth - margin, yPosition + 6);
    
    // Format values
    const unitPrice = parseFloat(item.unitPrice).toFixed(2);
    const total = parseFloat(item.total).toFixed(2);
    
    // Add row content
    doc.text((index + 1).toString(), colPositions[0] + 2, yPosition + 4);
    
    // Handle long descriptions with text wrapping
    const description = item.description || item.product || '';
    const descLines = doc.splitTextToSize(description, colWidths[1] - 4);
    doc.text(descLines, colPositions[1] + 2, yPosition + 4);
    
    const rowHeight = Math.max(6, descLines.length * 5);
    
    // Right-aligned numeric values
    doc.text(item.quantity.toString(), colPositions[2] + colWidths[2] +11, yPosition + 4, { align: 'right' });
    doc.text(item.unit, colPositions[3] + 16, yPosition + 4);
    doc.text(unitPrice, colPositions[4] + colWidths[4] - 2, yPosition + 4, { align: 'right' });
    doc.text(total, colPositions[5] + colWidths[5] -5, yPosition + 4, { align: 'right' });
    
    yPosition += rowHeight;
  });
  
  // Draw table bottom line
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
  
  // ----- SUMMARY SECTION -----
  const finalY = yPosition + 10;
  
  // Create a summary box on the right side
  const summaryX = pageWidth - margin - 60;
  const summaryWidth = 60;
  let summaryY = finalY;
  
  // Draw summary box with totals
  doc.setFontSize(9);
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(`${parseFloat(data.quotation.subtotal).toFixed(2)}`, 
    summaryX + summaryWidth, summaryY, { align: 'right' });
  summaryY += 5;
  
  // Discount (if applicable)
  if (parseFloat(data.quotation.discount) > 0) {
    doc.text('Discount:', summaryX, summaryY);
    doc.text(`- ${parseFloat(data.quotation.discount).toFixed(2)}%`, 
      summaryX + summaryWidth, summaryY, { align: 'right' });
    summaryY += 5;
  }
  
  // Tax (if applicable)
  if (parseFloat(data.quotation.tax) > 0) {
    doc.text('SST:', summaryX, summaryY);
    doc.text(`${parseFloat(data.quotation.tax).toFixed(2)}%`, 
      summaryX + summaryWidth, summaryY, { align: 'right' });
    summaryY += 5;
  }
  
  // Draw line before total
  doc.setLineWidth(0.2);
  doc.line(summaryX, summaryY, summaryX + summaryWidth, summaryY);
  summaryY += 3;
  
  // Total (bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', summaryX, summaryY+1);
  doc.text(`RM ${parseFloat(data.quotation.total).toFixed(2)}`, 
    summaryX + summaryWidth, summaryY+1, { align: 'right' });
  
  // ----- NOTES SECTION -----
  let notesY = Math.max(summaryY + 15, finalY + 10);
  
  // Add notes if present
  if (data.quotation.notes && data.quotation.notes.trim() !== '') {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, notesY);
    doc.setFont('helvetica', 'normal');
    
    const noteLines = doc.splitTextToSize(data.quotation.notes, pageWidth - (2 * margin));
    doc.text(noteLines, margin, notesY + 5);
    
    notesY += noteLines.length * 5 + 10;
  }
  
  // ----- TERMS AND CONDITIONS SECTION -----
  if (data.quotation.terms && data.quotation.terms.trim() !== '') {
    // Check if we need to add a new page
    if (notesY + 40 > pageHeight - margin) {
      doc.addPage();
      notesY = margin;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms and Conditions:', margin, notesY);
    doc.setFont('helvetica', 'normal');
    
    const termLines = doc.splitTextToSize(data.quotation.terms, pageWidth - (2 * margin));
    doc.text(termLines, margin, notesY + 5);
    
    notesY += termLines.length * 5 + 10;
  }
  
  // ----- FOOTER SECTION -----
  // Add a footer with page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Add horizontal line at bottom of page
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - margin - 5, pageWidth - margin, pageHeight - margin - 5);
    
    // Add page number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`, 
      pageWidth / 2, 
      pageHeight - margin, 
      { align: 'center' }
    );
    
    // Add website/copyright
    doc.text(
      data.company.website || 'www.classyhome.com',
      pageWidth - margin,
      pageHeight - margin,
      { align: 'right' }
    );
  }
  
  // Convert the PDF to a buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}