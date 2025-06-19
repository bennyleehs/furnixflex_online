// Example with pdfkit-table
import PDFDocument from 'pdfkit-table';

export async function generateQuotationPDF(data: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        bufferPages: true
      });
      
      // Collect PDF chunks
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Add company logo
      if (data.company.logo) {
        try {
          // Use a public URL instead of file system path
          const logoUrl = new URL(data.company.logo, 'http://localhost:3000').toString();
          doc.image(logoUrl.replace('http://localhost:3000', ''), 50, 45, { width: 150 });
        } catch (e) {
          console.warn('Could not load company logo:', e);
        }
      }
      
      // Add company information - using standard fonts
      doc.fontSize(10)
         .font('Times-Bold')
         .text(data.company.name, 350, 50)
         .font('Times-Roman')
         .text(data.company.address, 350, 65)
         .text(`Phone: ${data.company.phone}`, 350, 80)
         .text(`Email: ${data.company.email}`, 350, 95)
         .text(`Website: ${data.company.website}`, 350, 110);
      
      // Add quotation title
      doc.moveDown(2)
         .fontSize(16)
         .font('Times-Bold')
         .text('QUOTATION', { align: 'center' })
         .moveDown(0.5);
      
      // Add quotation details
      const startY = doc.y + 10;
      doc.fontSize(10)
         .font('Times-Bold')
         .text('Quotation #:', 50, startY)
         .text('Date:', 50, startY + 15)
         .text('Valid Until:', 50, startY + 30)
         .text('Sales Rep:', 50, startY + 45)
         .font('Times-Roman')
         .text(data.quotation.quotation_number, 150, startY)
         .text(new Date(data.quotation.quotation_date).toLocaleDateString(), 150, startY + 15)
         .text(new Date(data.quotation.valid_until).toLocaleDateString(), 150, startY + 30)
         .text(data.quotation.sales_representative, 150, startY + 45);
      
      // Add customer details
      doc.font('Times-Bold')
         .text('Customer:', 300, startY)
         .text('Contact:', 300, startY + 15)
         .text('Address:', 300, startY + 30)
         .font('Times-Roman')
         .text(data.quotation.customer_name, 370, startY)
         .text(data.quotation.customer_contact, 370, startY + 15)
         .text(data.quotation.customer_address, 370, startY + 30, { width: 180 });
      
      // Create items table
    // Define interfaces for table structure
    interface TableHeader {
      label: string;
      property: string;
      width: number;
      align: 'left' | 'right' | 'center';
    }
    
    interface TableRow {
      index: number;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: string;
      total: string;
      [key: string]: any; // Add index signature to match pdfkit-table's Data type
    }
    
    interface QuotationItem {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      total: number;
    }
    
    interface TableData {
      headers: TableHeader[];
      datas: TableRow[];
    }
    
    const tableData: TableData = {
      headers: [
        { label: "Item", property: 'index', width: 50, align: 'left' },
        { label: "Description", property: 'description', width: 200, align: 'left' },
        { label: "Qty", property: 'quantity', width: 40, align: 'right' },
        { label: "Unit", property: 'unit', width: 50, align: 'center' },
        { label: "Unit Price (RM)", property: 'unitPrice', width: 80, align: 'right' },
        { label: "Amount (RM)", property: 'total', width: 80, align: 'right' }
      ],
      datas: data.quotation.items.map((item: QuotationItem, i: number) => ({
        index: i + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: formatWithCommas(item.unitPrice),
        total: formatWithCommas(item.total)
      }))
    };
      
      // Draw the table
      await doc.table(tableData, { 
        prepareHeader: () => doc.font('Times-Bold').fontSize(10),
        prepareRow: () => doc.font('Times-Roman').fontSize(10)
      });
      
      // Add totals
      let y = doc.y + 10;
      
      // Format monetary values with commas
      const formattedSubtotal = formatWithCommas(parseFloat(data.quotation.subtotal || 0));
      const formattedDiscount = formatWithCommas(parseFloat(data.quotation.discount || 0));
      const formattedTax = formatWithCommas(parseFloat(data.quotation.tax || 0));
      const formattedTotal = formatWithCommas(parseFloat(data.quotation.total || 0));
      
      doc.font('Times-Bold')
         .text('Subtotal:', 390, y, { width: 80, align: 'right' })
         .font('Times-Roman')
         .text(`RM ${formattedSubtotal}`, 470, y, { width: 80, align: 'right' });
      
      if (parseFloat(data.quotation.discount || 0) > 0) {
        y += 20;
        doc.font('Times-Bold')
           .text('Discount:', 390, y, { width: 80, align: 'right' })
           .font('Times-Roman')
           .fillColor('red')
           .text(`- RM ${formattedDiscount}`, 470, y, { width: 80, align: 'right' })
           .fillColor('black');
      }
      
      if (parseFloat(data.quotation.tax || 0) > 0) {
        y += 20;
        doc.font('Times-Bold')
           .text('Tax:', 390, y, { width: 80, align: 'right' })
           .font('Times-Roman')
           .text(`RM ${formattedTax}`, 470, y, { width: 80, align: 'right' });
      }
      
      y += 20;
      doc.font('Times-Bold')
         .text('Total:', 390, y, { width: 80, align: 'right' })
         .text(`RM ${formattedTotal}`, 470, y, { width: 80, align: 'right' });
      
      // Add notes
      if (data.quotation.notes) {
        y += 40;
        doc.font('Times-Bold')
           .text('Notes:', 50, y)
           .font('Times-Roman')
           .text(data.quotation.notes, 50, y + 15, { width: 500 });
      }
      
      // Add terms and conditions
      if (data.quotation.terms) {
        doc.addPage();
        doc.font('Times-Bold')
           .text('Terms and Conditions', 50, 50)
           .font('Times-Roman')
           .text(data.quotation.terms, 50, 70, { width: 500 });
      }
      
      // Add signature blocks
      const signatureY = doc.y + 50;
      
      doc.font('Times-Roman')
         .text('For ' + data.company.name, 50, signatureY)
         .text('Customer Acceptance', 350, signatureY);
      
      // Add signature lines
      doc.moveTo(50, signatureY + 60)
         .lineTo(200, signatureY + 60)
         .stroke();
      
      doc.moveTo(350, signatureY + 60)
         .lineTo(500, signatureY + 60)
         .stroke();
      
      // Add signature labels
      doc.font('Times-Roman')
         .fontSize(8)
         .text('Authorized Signature', 50, signatureY + 65)
         .text('Signature & Company Stamp', 350, signatureY + 65);
      
      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Add page number
        doc.font('Times-Roman')
           .fontSize(8)
           .text(
             `Page ${i + 1} of ${pageCount}`,
             50,
             doc.page.height - 50,
             { align: 'center', width: doc.page.width - 100 }
           );
        
        // Add footer text
        doc.font('Times-Roman')
           .fontSize(8)
           .text(
             'Thank you for your business',
             50,
             doc.page.height - 40,
             { align: 'center', width: doc.page.width - 100 }
           );
      }
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to format numbers with commas
function formatWithCommas(value: number): string {
  // Format with 2 decimal places
  const formattedValue = value.toFixed(2);
  
  // Only add commas if the number is 1000 or greater
  if (value >= 1000) {
    // Split into integer and decimal parts
    const parts = formattedValue.split('.');
    
    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Join with the decimal part
    return parts.join('.');
  }
  
  return formattedValue;
}