import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data || !data.task_id) {
      return NextResponse.json(
        { error: "Invalid data provided" },
        { status: 400 },
      );
    }

    // Create directory if it doesn't exist
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "sales",
      data.task_id.toString(),
      "Invoice",
    );
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Create filename for the statement
    const fileName = `Payment_Statement_${data.quotation_number}_${new Date().toISOString().split("T")[0].replace(/-/g, "")}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    // Generate PDF
    const pdfBuffer = await generateStatementPDF(data);

    // Save the PDF to the file system
    fs.writeFileSync(filePath, pdfBuffer);

    // Return the PDF
    return new Response(pdfBuffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating payment statement PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate PDF", details: errorMessage },
      { status: 500 },
    );
  }
}

async function generateStatementPDF(data: any): Promise<Buffer> {
  // Create a new jsPDF instance
  const doc = new jsPDF({
    orientation: data.format?.orientation || "portrait",
    unit: "mm",
    format: data.format?.pageSize || "a4",
  });

  // Define margins
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // ----- HEADER SECTION WITH LOGO -----

  // Add logo on the left side
  try {
    // If a logo URL is provided in the data
    if (data.company.logo && data.company.logo.startsWith("data:image")) {
      // Logo is provided as base64 data URL
      const logoData = data.company.logo.split(",")[1];
      doc.addImage(logoData, "PNG", margin, margin - 8, 40, 15);
    } else {
      // Use a default logo path
      const logoPath = path.join(
        process.cwd(),
        "public",
        "images",
        "logo",
        "classy_logo_gray.png",
      );
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = logoData.toString("base64");
        doc.addImage(
          `data:image/png;base64,${logoBase64}`,
          "PNG",
          margin,
          margin - 8,
          40,
          15,
        );
      }
    }
  } catch (error) {
    console.error("Error adding logo:", error);
    // Continue without the logo if there's an error
  }

  // Company name with larger font
  doc.setFontSize(20);
  // doc.setFont('courier', 'bold');
  // doc.setFont('helvetica', 'bold');
  doc.setFont("times", "bold");
  // doc.setFont('symbol', 'bold');
  // doc.setFont('zapfdingbats', 'bold');
  doc.text(data.company.name, pageWidth / 2 + margin, margin - 2, {
    align: "center",
  });

  // Company details with smaller font
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(data.company.address, pageWidth / 2 + margin, margin + 3, {
    align: "center",
  });
  doc.text(
    `Tel: ${data.company.phone} | Email: ${data.company.email} | Email: ${data.company.website}`,
    pageWidth / 2 + margin,
    margin + 7,
    { align: "center" },
  );

  // Horizontal line separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, margin + 10, pageWidth - margin, margin + 10);

  // ----- THREE-SECTION HEADER LAYOUT -----
  // Top position for all three sections
  const sectionTop = margin + 16;
  // Calculate column widths and positions
  const columnWidth = (pageWidth - 2 * margin) / 3;
  const col1X = margin;
  const col2X = margin + columnWidth - 5;
  const col3X = margin + columnWidth * 2 + 12;

  // Quotation information with labels and values vertically aligned
  const valueC1 = col1X + 11;
  const labelX = col3X;
  const valueC3 = col3X + 10; // Offset for values

  // Column Headers
  doc.setFontSize(12);
  doc.setFont("courier", "bold"); // Using fontLable object
  doc.text("CUSTOMER", col1X, sectionTop);
  doc.text("ADDRESS", col2X, sectionTop);
  doc.text("STATEMENT", col3X, sectionTop);

  // Add underlines for headers
  const lineY = sectionTop + 1;
  doc.setLineWidth(0.3);
  doc.line(col1X, lineY, col1X + doc.getTextWidth("CUSTOMER"), lineY);
  doc.line(col2X, lineY, col2X + doc.getTextWidth("ADDRESS"), lineY);
  doc.line(col3X, lineY, col3X + doc.getTextWidth("STATEMENT"), lineY);

  // Column Labels
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text("Name:", col1X, sectionTop + 5);
  doc.text("NRIC:", col1X, sectionTop + 10);
  doc.text("TEL:", col1X, sectionTop + 15);
  doc.text("Email:", col1X, sectionTop + 20);

  doc.text("Property:", col2X, sectionTop + 20);
  doc.text("Access:", col2X + 32, sectionTop + 20);

  doc.text("REF:", labelX, sectionTop + 5);
  doc.text("QUO:", labelX, sectionTop + 10);
  doc.text("Date:", labelX, sectionTop + 15);
  doc.text("PIC:", labelX, sectionTop + 20);
  // doc.text('Terms :', labelX, sectionTop + 20);

  // Column Contents
  doc.setFontSize(10);
  doc.setFont("times", "bold");
  doc.text(data.customer_name, valueC1, sectionTop + 5);
  doc.text(data.customer_nric || "", valueC1, sectionTop + 10);
  doc.text(data.customer_contact, valueC1, sectionTop + 15);
  doc.text(data.customer_email || "", valueC1, sectionTop + 20);

  doc.text(data.customer_property || "", col2X + 14, sectionTop + 20);
  doc.text(data.customer_guard || "", col2X + 44, sectionTop + 20);

  // Initialize addressLinesArray with an empty array
  let addressLinesArray = [];
  // Add shipping address if available
  if (data.customer_address) {
    const shipAddress = data.customer_address;
    // First split by commas and trim each part
    const addressParts = shipAddress
      .split(",")
      .map((part: string) => part.trim())
      .filter((part: any) => part);

    // Format according to specific pattern:
    // Line 1: First 2 parts
    // Line 2: Next 3 parts
    // Line 3: All remaining parts

    if (addressParts.length > 0) {
      // First line - first 2 parts with comma at end
      const firstLine = addressParts.slice(0, 2).join(", ") + ",";
      addressLinesArray.push(firstLine);

      // Second line - next 3 parts with comma at end
      if (addressParts.length > 2) {
        const secondLine = addressParts.slice(2, 5).join(", ") + ",";
        addressLinesArray.push(secondLine);

        // Third line - all remaining parts
        if (addressParts.length > 5) {
          const thirdLine = addressParts.slice(5).join(", ");
          addressLinesArray.push(thirdLine);
        }
      }

      // Display each line with proper spacing
      addressLinesArray.forEach((line: string, index: number) => {
        doc.text(line, col2X, sectionTop + 5 + index * 5);
      });
    } else {
      // Default empty value if no address parts after filtering
      doc.text("N/A", col2X, sectionTop + 5);
      addressLinesArray = ["N/A"];
    }
  } else {
    // Default empty value if no address is provided
    doc.text("N/A", col2X, sectionTop + 5);
    addressLinesArray = ["N/A"];
  }

  doc.text(data.invoice_number || "N/A", valueC3, sectionTop + 5);

  doc.text(data.quotation_number || "N/A", valueC3, sectionTop + 10);

  doc.text(new Date().toLocaleDateString(), valueC3, sectionTop + 15);

  doc.text(data.sales_representative || "N/A", valueC3, sectionTop + 20);
  const salesRepWidth = data.sales_representative
    ? doc.getTextWidth(data.sales_representative) + 1
    : 0;
  if (data.sales_uid) {
    doc.text(`(${data.sales_uid})`, valueC3 + salesRepWidth, sectionTop + 20);
  }

  // Add payment summary
  const paymentSummaryY = margin + 50;
  const paymentSummaryTitle = "PAYMENT SUMMARY";
  const paymentSummaryTitleWidth = doc.getTextWidth(paymentSummaryTitle) + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(paymentSummaryTitle, pageWidth / 2, paymentSummaryY, {
    align: "center",
  });
  doc.line(
    pageWidth / 2 - paymentSummaryTitleWidth / 2,
    paymentSummaryY + 2,
    pageWidth / 2 + paymentSummaryTitleWidth / 2,
    paymentSummaryY + 2,
  );

  // Payment summary boxes
  const boxWidth = (pageWidth - margin * 2 - 10) / 3;
  const boxHeight = 25;

  // Total amount box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, paymentSummaryY + 5, boxWidth, boxHeight, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Total Amount", margin + boxWidth / 2, paymentSummaryY + 12, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    formatCurrency(data.quotation_total),
    margin + boxWidth / 2,
    paymentSummaryY + 20,
    { align: "center" },
  );

  // Paid amount box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(240, 255, 240);
  doc.rect(
    margin + boxWidth + 5,
    paymentSummaryY + 5,
    boxWidth,
    boxHeight,
    "F",
  );
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Amount Paid",
    margin + boxWidth + 5 + boxWidth / 2,
    paymentSummaryY + 12,
    { align: "center" },
  );
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0);
  doc.text(
    formatCurrency(data.total_paid),
    margin + boxWidth + 5 + boxWidth / 2,
    paymentSummaryY + 20,
    { align: "center" },
  );
  doc.setTextColor(0, 0, 0);

  // Balance box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(255, 245, 240);
  doc.rect(
    margin + boxWidth * 2 + 10,
    paymentSummaryY + 5,
    boxWidth,
    boxHeight,
    "F",
  );
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Remaining Balance",
    margin + boxWidth * 2 + 10 + boxWidth / 2,
    paymentSummaryY + 12,
    { align: "center" },
  );
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 53, 69);
  doc.text(
    formatCurrency(data.balance),
    margin + boxWidth * 2 + 10 + boxWidth / 2,
    paymentSummaryY + 20,
    { align: "center" },
  );
  doc.setTextColor(0, 0, 0);

  // Add progress bar
  const progressBarY = paymentSummaryY + 40;
  const progressBarWidth = pageWidth - margin * 2;
  const progressBarHeight = 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Ensure payment_progress is a valid number
  const progressPercentage =
    typeof data.payment_progress === "number"
      ? data.payment_progress
      : parseFloat(data.payment_progress) || 0;

  doc.text(
    `Payment Progress: ${progressPercentage.toFixed(0)}%`,
    margin,
    progressBarY - 2,
  );

  // Background (empty) progress bar
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(
    margin,
    progressBarY,
    progressBarWidth,
    progressBarHeight,
    1,
    1,
    "F",
  );

  // Filled progress bar
  const filledWidth = Math.min(
    progressBarWidth * (progressPercentage / 100),
    progressBarWidth,
  );
  doc.setDrawColor(40, 167, 69);
  doc.setFillColor(40, 167, 69);
  if (filledWidth > 0) {
    doc.roundedRect(
      margin,
      progressBarY,
      filledWidth,
      progressBarHeight,
      1,
      1,
      "F",
    );
  }

  // Add payment records table
  const tableY = progressBarY + 15;

  // Update the tableHeaders to include receipt date
  const tableHeaders = [
    { header: "Date", dataKey: "date", align: "left" },
    { header: "Reference", dataKey: "reference", align: "left" },
    { header: "Method", dataKey: "method", align: "left" },
    { header: "Amount", dataKey: "amount", align: "center" },
    { header: "Balance", dataKey: "balance", align: "center" },
    { header: "Status", dataKey: "status", align: "center" },
    { header: "Received Date", dataKey: "received_date", align: "center" }, // New column
  ];

  // Update the tableBody to include the received date
  const tableBody = data.payments.map((payment: any) => [
    formatDate(payment.payment_date),
    payment.payment_reference || "N/A",
    payment.payment_method.replace(/_/g, " ").toUpperCase(),
    formatCurrency(payment.amount),
    formatCurrency(payment.balance),
    payment.received ? "RECEIVED" : "PENDING",
    payment.received && payment.received_date
      ? formatDate(payment.received_date)
      : "-", // Format the received date or show dash if not available
  ]);

  // Add the table to the PDF
  autoTable(doc, {
    startY: tableY,
    head: [tableHeaders.map((h) => h.header)],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center", // Center all headers by default
    },
    columnStyles: {
      3: { halign: "right" }, // Amount column data (right-aligned)
      4: { halign: "right" }, // Balance column data (right-aligned)
      5: { halign: "center" }, // Status column data (center-aligned)
      6: { halign: "center" }, // Received Date column data (center-aligned)
    },
    didDrawCell: function (data) {
      // Center align the specified headers
      if (data.section === "head") {
        if (
          data.column.index === 3 ||
          data.column.index === 4 ||
          data.column.index === 5 ||
          data.column.index === 6
        ) {
          // Add column 6 to headers to center
          // Set center alignment for these specific headers
          const { x, y, width, height } = data.cell;
          doc.setFont("helvetica", "bold");

          // Save current text color
          const currentTextColor = doc.getTextColor();

          // Center the header text using the align option
          const text = typeof data.cell.raw === "string" ? data.cell.raw : "";
          const textWidth = doc.getTextWidth(text);
          const textX = x + width / 2 - textWidth / 2;
          doc.text(text, x + width / 2, y + height / 2 + 1, {
            align: "center",
          });

          // Restore text color
          doc.setTextColor(currentTextColor);
        }
      }

      // Status cell styling
      if (
        data.section === "body" &&
        data.column.index === 5 &&
        data.cell.raw === "RECEIVED"
      ) {
        doc.setTextColor(40, 167, 69);
      } else if (
        data.section === "body" &&
        data.column.index === 5 &&
        data.cell.raw === "PENDING"
      ) {
        doc.setTextColor(255, 193, 7);
      }
    },
    willDrawCell: function (data) {
      // Reset text color after drawing cell
      if (data.section === "body" && data.column.index === 5) {
        doc.setTextColor(0, 0, 0);
      }
    },
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Add footer
  const footerY = pageHeight - margin;

  // Add the SYSTEM-GENERATED STATEMENT notice at the footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SYSTEM-GENERATED STATEMENT", pageWidth / 2, footerY - 8, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "This is an electronically generated payment statement. No signature is required.",
    pageWidth / 2,
    footerY - 4,
    { align: "center" },
  );

  // Standard footer info
  doc.setFontSize(7);
  doc.text("Generated on: " + new Date().toLocaleDateString(), margin, footerY);
  doc.text("Page 1 of 1", pageWidth - margin, footerY, { align: "right" });
  doc.text("Powered by CLASSYPRO System", pageWidth / 2, footerY, {
    align: "center",
  });

  // Convert the PDF to buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}

// Fix the formatCurrency function implementation
function formatCurrency(amount: any): string {
  // Handle undefined, null, or NaN values
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;

  // Format with RM currency symbol and 2 decimal places
  return `RM ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// Helper function to format date as 'DD/MM/YYYY'
function formatDate(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
