// filepath: src/app/api/sales/quotation/generate-pdf/route.ts
import { NextResponse } from 'next/server';
import { generateQuotationPDF } from '@/lib/pdf-generator';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Generate PDF using external script
    const pdfBuffer = await generateQuotationPDF(data);
    
    // Return the PDF as a binary response
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quotation-${data.quotation.quotation_number}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}