import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import "jspdf-autotable";
import { TermsConditionsWarrantySections } from "@/types/sales-quotation";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data || !data.quotation || !data.quotation.task_id) {
      return NextResponse.json(
        { error: "Invalid data provided" },
        { status: 400 },
      );
    }
    console.log("Received data:", data.quotation.task_id);
    // Create directory if it doesn't exist
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "sales",
      data.quotation.task_id,
      "quotation",
    );
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Create a safe filename from quotation number
    const safeFilename = data.quotation.quotation_number.replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );
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

    // Return the PDF
    return new Response(pdfBuffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quotation-${fileName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate PDF", details: errorMessage },
      { status: 500 },
    );
  }
}

async function generateQuotationPDF(
  data: any,
  fileIndex: number,
): Promise<Buffer> {
  // Create a new jsPDF instance
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Define margins
  const margin = 6;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // ----- HEADER SECTION WITH LOGO -----

  // Add logo on the left side
  try {
    // If a logo URL is provided in the data
    if (data.company.logo && data.company.logo.startsWith("data:image")) {
      // Logo is provided as base64 data URL
      const logoData = data.company.logo.split(",")[1];
      doc.addImage(logoData, "PNG", margin, margin - 8, 28, 26);
    } else {
      // Use a default logo path
      const logoPath = path.join(
        process.cwd(),
        "public",
        "images",
        "logo",
        "Classy_2023_vertical.png",
      );
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = logoData.toString("base64");
        doc.addImage(
          `data:image/png;base64,${logoBase64}`,
          "PNG",
          margin,
          margin - 4,
          32,
          30,
        );
      }
    }
  } catch (error) {
    console.error("Error adding logo:", error);
    // Continue without the logo if there's an error
  }

  // // Company name with larger font
  // doc.setFontSize(16);
  // doc.setFont("helvetica", "bold");
  // doc.text(data.company.name, pageWidth / 2 + margin + 10, margin + 8, {
  //   align: "center",
  // });

  // // company reg. no.
  // doc.setFontSize(10)
  // doc.setFont("helvetica", "bold");
  // doc.text(data.company.regNo, pageWidth / 2 + margin + 20, margin + 8, {
  //   align: "right",
  // });
  //v1.2
  // Define the space occupied by the logo and its margin
  const logoWidth = 32; // Based on your addImage width
  const logoMarginRight = 16; // A small buffer to the right of the logo
  const textContentStartX = margin + logoWidth + logoMarginRight;

  // Define the content area for the text, starting after the logo
  const textContentWidth = pageWidth - textContentStartX - margin;

  // Define the column widths based on the new content area
  const companyNameWidth = textContentWidth * 0.8; // 80% of the available space
  const regNoWidth = textContentWidth * 0.2; // 20% of the available space

  // Set the y-coordinate for the top line of text
  const yPos = margin + 8; // Adjust this if needed to align with your logo vertically

  // Company name with larger font
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  // Position company name at the new starting point for text content
  doc.text(data.company.name, textContentStartX, yPos, {
    align: "left",
    maxWidth: companyNameWidth,
  });

  // Company reg. no.
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  // Position registration number at the end of the text content area and align right
  doc.text(data.company.regNo, pageWidth - margin - 14, yPos, {
    align: "right",
    maxWidth: regNoWidth,
  });

  // Company details with smaller font
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.company.address, pageWidth / 2 + margin + 10, margin + 14, {
    align: "center",
  });
  doc.text(
    `H/p: ${data.company.phone} • Tel: ${data.company.tel} • Email: ${data.company.email} • Website: ${data.company.website}`,
    pageWidth / 2 + margin + 10,
    margin + 18,
    { align: "center" },
  );
  doc.text(
    `Branches: ${data.company.branches}`,
    pageWidth / 2 + margin + 10,
    margin + 22,
    { align: "center" },
  );

  // Horizontal line separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, margin + 27, pageWidth - margin, margin + 27);

  // ----- THREE-SECTION HEADER LAYOUT -----
  // Top position for all three sections
  const sectionTop = margin + 32;
  // Calculate column widths and positions
  const columnWidth = (pageWidth - 2 * margin) / 3;
  const col1X = margin;
  const col2X = margin + columnWidth - 5;
  const col3X = margin + columnWidth * 2 + 12;

  // Quotation information with labels and values vertically aligned
  const valueC1 = col1X + 12;
  const labelX = col3X;
  const valueC3 = col3X + 10; // Offset for values

  // Column Headers
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(0, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(col1X, sectionTop - 4, 37, 7, "F");
  doc.text(" Customer Details", col1X, sectionTop + 1);

  doc.setTextColor(0, 0, 0);
  doc.text("Address", col2X, sectionTop + 1);

  doc.setFontSize(18);
  doc.text("QUOTATION", col3X, sectionTop + 2);

  // Column Label header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Name:", col1X, sectionTop + 8);
  doc.text("I/C:", col1X, sectionTop + 13);
  doc.text("Phone:", col1X, sectionTop + 18);
  doc.text("Email:", col1X, sectionTop + 23);

  doc.text("Property:", col2X, sectionTop + 23);
  doc.text("Access:", col2X + 36, sectionTop + 23);

  doc.text("REF:", labelX, sectionTop + 8);
  doc.text("Date:", labelX, sectionTop + 13);
  doc.text("PIC:", labelX, sectionTop + 18);

  // Column Contents
  // column 1 - Customer Details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.quotation.customer_name, valueC1, sectionTop + 8);
  doc.text(data.quotation.customer_nric || "", valueC1, sectionTop + 13);
  doc.text(data.quotation.customer_contact, valueC1, sectionTop + 18);
  doc.text(data.quotation.customer_email || "", valueC1, sectionTop + 23);

  // column 2 - Address
  doc.text(data.quotation.customer_property || "", col2X + 16, sectionTop + 23);
  doc.text(data.quotation.customer_guard || "", col2X + 50, sectionTop + 23);

  // Initialize addressLinesArray with an empty array
  let addressLinesArray = [];
  // Add shipping address if available
  if (data.quotation.customer_address) {
    const shipAddress = data.quotation.customer_address;
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
        doc.text(line, col2X, sectionTop + 8 + index * 5);
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

  // column 3 - Quotation
  doc.text(data.quotation.quotation_number, valueC3, sectionTop + 8);
  doc.text(
    `-${fileIndex.toString()}`,
    valueC3 + doc.getTextWidth(data.quotation.quotation_number),
    sectionTop + 8,
  );
  doc.text(
    new Date(data.quotation.quotation_date).toLocaleDateString(),
    valueC3,
    sectionTop + 13,
  );
  doc.text("~", valueC3 + 19, sectionTop + 13);
  doc.text(
    new Date(data.quotation.valid_until).toLocaleDateString(),
    valueC3 + 22,
    sectionTop + 13,
  );
  doc.text(data.quotation.sales_representative, valueC3, sectionTop + 18);
  const salesRepWidth =
    doc.getTextWidth(data.quotation.sales_representative) + 1;
  doc.text(
    `(${data.quotation.sales_uid})`,
    valueC3 + salesRepWidth,
    sectionTop + 18,
  );

  // ----- ITEMS TABLE SECTION -----
  // Starting y position after the header information
  let yPosition = margin + 60;

  // Add items table header
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Create a manual table since autoTable might not be working
  const colWidths = [10, 90, 15, 20, 30, 20];
  const colPositions = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1] + 17,
    margin + colWidths[0] + colWidths[1] + colWidths[2] + 11,
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 3,
    margin +
      colWidths[0] +
      colWidths[1] +
      colWidths[2] +
      colWidths[3] +
      colWidths[4],
  ];

  // Table header
  doc.setFillColor(255, 202, 122);
  doc.setTextColor(0, 0, 0);
  // Draw the filled background rectangle without a border
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, "F");

  // Set the line color for the borders
  doc.setDrawColor(0, 0, 0);

  // Draw the top & bottom border line of the header
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  doc.line(margin, yPosition + 7, pageWidth - margin, yPosition + 7);

  // Draw the internal vertical lines
  doc.line(colPositions[1] - 1, yPosition, colPositions[1] - 1, yPosition + 7);
  doc.line(colPositions[2] + 4, yPosition, colPositions[2] + 4, yPosition + 7);
  doc.line(colPositions[3] + 5, yPosition, colPositions[3] + 5, yPosition + 7);
  doc.line(colPositions[4] + 6, yPosition, colPositions[4] + 6, yPosition + 7);
  doc.line(colPositions[5] + 9, yPosition, colPositions[5] + 9, yPosition + 7);

  // font for table header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  doc.text("No.", colPositions[0] + 2, yPosition + 5);
  doc.text("Product Details", colPositions[1], yPosition + 5);
  doc.text("Qty", colPositions[2] + 6, yPosition + 5);
  doc.text("Unit", colPositions[3] + 8, yPosition + 5);
  doc.text("Unit Price (RM)", colPositions[4] + 8, yPosition + 5);
  doc.text("Total (RM)", colPositions[5] + 12, yPosition + 5);

  yPosition += 7;
  // Font, color for table contents
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Table rows
  data.quotation.items.forEach((item: any, index: number) => {
    // Check if need a new page
    if (yPosition + 10 > pageHeight - margin * 2) {
      doc.addPage();
      yPosition = margin;

      // Redraw header on new page
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Items (continued):", margin, yPosition);
      yPosition += 5;

      // Redraw table header
      doc.setFillColor(255, 202, 122);
      doc.setTextColor(0, 0, 0);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, "F");

      doc.text("No.", colPositions[0] + 2, yPosition + 5);
      doc.text("Product Details", colPositions[1], yPosition + 5);
      doc.text("Qty", colPositions[2] + 6, yPosition + 5);
      doc.text("Unit", colPositions[3] + 8, yPosition + 5);
      doc.text("Unit Price (RM)", colPositions[4] + 8, yPosition + 5);
      doc.text("Total (RM)", colPositions[5] + 12, yPosition + 5);

      yPosition += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    // Format values
    const unitPrice = parseFloat(item.unitPrice).toFixed(2);
    const total = parseFloat(item.total).toFixed(2);
    const productTitle = item.product || "";
    const productDescription = item.description || "";

    // Handle text wrapping for the description
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const descLines = doc.splitTextToSize(productDescription, colWidths[1]);
    // Reset font back for other drawing commands
    doc.setFont("helvetica", "normal");

    const bottomPadding = 1;

    // Calculate row height based on both lines of text
    const titleHeight = 5; // Height for a single line of text
    const descriptionHeight = descLines.length * 5; // 5 points per line of wrapped text
    const rowHeight = titleHeight + descriptionHeight + bottomPadding;

    // define the color for cell fill
    doc.setFillColor(230, 230, 230);
    doc.setTextColor(0, 0, 0);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");

    // Draw horizontal lines
    if (index === 0) {
      // If it's the first row, draw a black top line
      doc.setDrawColor(0, 0, 0);
    } else {
      // For all other rows, draw a light gray top line
      doc.setDrawColor(197, 197, 197);
    }
    // Draw the top horizontal line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    // Draw the bottom horizontal line only if it's NOT the last row
    if (index < data.quotation.items.length - 1) {
      doc.setDrawColor(197, 197, 197);
      doc.line(
        margin,
        yPosition + rowHeight,
        pageWidth - margin,
        yPosition + rowHeight,
      );
    }

    // Draw the vertical lines
    doc.setDrawColor(115, 115, 115);
    doc.line(
      colPositions[1] - 1,
      yPosition,
      colPositions[1] - 1,
      yPosition + rowHeight,
    );
    doc.line(
      colPositions[2] + 4,
      yPosition,
      colPositions[2] + 4,
      yPosition + rowHeight,
    );
    doc.line(
      colPositions[3] + 5,
      yPosition,
      colPositions[3] + 5,
      yPosition + rowHeight,
    );
    doc.line(
      colPositions[4] + 6,
      yPosition,
      colPositions[4] + 6,
      yPosition + rowHeight,
    );
    doc.line(
      colPositions[5] + 9,
      yPosition,
      colPositions[5] + 9,
      yPosition + rowHeight,
    );

    // Reset font settings for the row content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Define data & Format numbers with thousand separators
    const formattedUnitPrice = parseFloat(unitPrice).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedTotal = parseFloat(total).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Add row content
    doc.text((index + 1).toString(), colPositions[0] + 2 * 2, yPosition + 4, {
      align: "center",
    });

    // Draw the Product Title (bold)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(productTitle, colPositions[1], yPosition + 4);

    // Draw the Italicized Description (wrapped)
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(descLines, colPositions[1], yPosition + 4 + titleHeight);

    //reset font back
    doc.setFont("helvetica", "normal");

    // Right-aligned numeric values
    doc.text(
      item.quantity.toString(),
      colPositions[2] + colWidths[2] - 5,
      yPosition + 4,
      { align: "right" },
    );
    doc.text(item.unit, colPositions[3] + 9, yPosition + 4);
    doc.text(
      formattedUnitPrice,
      colPositions[4] + colWidths[4] + 4,
      yPosition + 4,
      { align: "right" },
    );
    doc.text(
      formattedTotal,
      colPositions[5] + colWidths[5] + 10,
      yPosition + 4,
      { align: "right" },
    );

    yPosition += rowHeight;
  });

  // ----- SUMMARY SECTION -----
  const finalY = yPosition + 6;

  // Create a summary box on the right side
  const summaryX = pageWidth - margin - 60;
  const summaryWidth = 60;
  let summaryY = finalY;

  // Draw summary box with totals
  doc.setFontSize(9);
  // Subtotal
  doc.setFont("helvetica", "bold");
  doc.text("SUBTOTAL:", summaryX, summaryY);
  const formattedSubtotal = parseFloat(data.quotation.subtotal).toLocaleString(
    "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );
  // reset font style
  doc.setFont("helvetica", "normal");
  doc.text("RM" + formattedSubtotal, summaryX + summaryWidth, summaryY, {
    align: "right",
  });
  summaryY += 5;

  // Define function and filter for each types of discounts
  const pkgDisc = data.quotation.items.find(
    (item: any) =>
      item.category === "Discount" && item.subcategory === "Packages",
  );
  const addItemDisc = data.quotation.items.find(
    (item: any) =>
      item.category === "Discount" && item.subcategory === "Add-on Items",
  );
  const roundingDisc = data.quotation.items.find(
    (item: any) =>
      item.category === "SALES DISCOUNT" &&
      item.subcategory === "Final Discount",
  );

  // Discounts header
  if (pkgDisc || addItemDisc || roundingDisc) {
    // Title Discount
    doc.setFont("helvetica", "bold");
    doc.text("Discounts", summaryX, summaryY);
    summaryY += 5;
  }

  // Package Discounts
  if (pkgDisc) {
    doc.setFont("helvetica", "bold");
    doc.text("Packages:", summaryX, summaryY);
    // Format the total with two decimal places
    const formattedPkgDiscount = parseFloat(pkgDisc.total).toFixed(2);
    // reset font style
    doc.setFont("helvetica", "normal");
    if (formattedPkgDiscount.startsWith("-")) {
      // If it's negative, add "RM" after the negative sign
      doc.text(
        `-RM${formattedPkgDiscount.substring(1)}`,
        summaryX + summaryWidth,
        summaryY,
        {
          align: "right",
        },
      );
    } else {
      // add "RM"
      doc.text(`RM${formattedPkgDiscount}`, summaryX + summaryWidth, summaryY, {
        align: "right",
      });
    }
    summaryY += 5;
  }

  // Add on Item Discounts
  if (addItemDisc) {
    doc.setFont("helvetica", "bold");
    doc.text("Additional Items:", summaryX, summaryY);
    const formattedAddItemDiscount = parseInt(
      parseFloat(addItemDisc.discount).toFixed(0),
    );
    // reset font style
    doc.setFont("helvetica", "normal");
    doc.text(
      "-" + formattedAddItemDiscount.toString() + "%",
      summaryX + summaryWidth,
      summaryY,
      {
        align: "right",
      },
    );
    summaryY += 5;
  }

  // Rounding Discounts
  if (roundingDisc) {
    doc.setFont("helvetica", "bold");
    doc.text("Rounding:", summaryX, summaryY);
    // Format the total with two decimal places
    const formattedRounding = parseFloat(roundingDisc.total).toFixed(2);
    // reset font style
    doc.setFont("helvetica", "normal");
    if (formattedRounding.startsWith("-")) {
      // If it's negative, add "RM" after the negative sign
      doc.text(
        `-RM${formattedRounding.substring(1)}`,
        summaryX + summaryWidth,
        summaryY,
        {
          align: "right",
        },
      );
    } else {
      // add "RM"
      doc.text(`RM${formattedRounding}`, summaryX + summaryWidth, summaryY, {
        align: "right",
      });
    }
    summaryY += 5;
  }

  // Tax (if applicable)
  // if (parseFloat(data.quotation.tax) > 0) {
  //   doc.text("SST @ 8%:", summaryX, summaryY);
  //   doc.text(
  //     `${parseFloat(data.quotation.tax).toFixed(2)}%`,
  //     summaryX + summaryWidth,
  //     summaryY,
  //     { align: "right" },
  //   );
  //   summaryY += 5;
  // }

  // Draw line before total
  doc.setLineWidth(0.2);
  doc.line(summaryX, summaryY, summaryX + summaryWidth, summaryY);
  summaryY += 3;

  // Total (bold)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GRAND TOTAL (RM):", summaryX, summaryY + 1);
  const formattedTotal = parseFloat(data.quotation.total).toLocaleString(
    "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );
  doc.text(`RM ${formattedTotal}`, summaryX + summaryWidth, summaryY + 1, {
    align: "right",
  });

  // ----- NOTES SECTION -----
  const notePosY = yPosition + 6;
  let notesY = notePosY;

  if (data.quotation.notes && data.quotation.notes.trim() !== "") {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, notesY);
    doc.setFont("helvetica", "normal");

    const noteLines = doc.splitTextToSize(
      data.quotation.notes,
      pageWidth - 2 * margin - 80,
    );
    // doc.text(noteLines, margin, notesY + 5);
    doc.text(noteLines, margin, notesY + 5, { lineHeightFactor: 1.5 });

    // This variable now holds the Y position where the notes content ends.
    // notesY += noteLines.length * 5 + 10;
    const lineHeight = 5; // The base height of your line
    const totalNoteHeight = noteLines.length * lineHeight * 1.5;
    notesY += totalNoteHeight + 10;
  }

  // --- TERMS AND CONDITIONS SECTION ---
  if (data.quotation.terms && data.quotation.terms.trim() !== "") {
    // Get page dimensions from jspdf
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper function to calculate the total height - for T&C block
    const calculateTermsHeight = () => {
      let totalHeight = 0;
      // These values should match the font sizes and spacing used for drawing
      const mainTitleHeight = 4;
      const spaceAfterMainTitle = 4;
      const subTitleHeight = 5;
      const lineItemHeight = 4; // Height for each line of content
      const spaceAfterSection = 2;
      const topSeparatorHeight = 5; // Space for the top line and some padding

      totalHeight += mainTitleHeight + spaceAfterMainTitle + topSeparatorHeight;

      TermsConditionsWarrantySections.forEach((section) => {
        totalHeight += subTitleHeight;
        section.content.forEach((line, index) => {
          const wrappedLines = doc.splitTextToSize(
            `${index + 1}. ${line}`,
            pageWidth - 2 * margin,
          );
          totalHeight += wrappedLines.length * lineItemHeight;
        });
        totalHeight += spaceAfterSection;
      });
      return totalHeight;
    };

    // 1. Calculate the required height
    const termsHeight = calculateTermsHeight();

    // Define a bottom margin to keep the block from hitting the page footer
    const bottomMargin = 2;

    // 2. Determine the ideal starting position to align the block at the bottom
    let termsStartY = pageHeight - termsHeight - bottomMargin;

    // 3. Check for overlap with the notes section. If notes end after the
    // T&C should start, we need to move the T&C to a new page.
    if (notesY > termsStartY) {
      doc.addPage();
      // Recalculate the starting Y for the new page
      termsStartY = pageHeight - termsHeight - bottomMargin;
    }

    // --- Drawing Logic (uses the dynamically calculated 'termsStartY') ---

    // Separator horizontal line top
    doc.setLineWidth(0.3);
    doc.line(margin, termsStartY + 2, pageWidth - margin, termsStartY + 2);

    // Main title
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Order Policy & Warranty Coverage:", margin, termsStartY + 6);

    let currentY = termsStartY + 10; // Start content below title

    TermsConditionsWarrantySections.forEach((section) => {
      // Subsection title
      doc.setFont("helvetica", "bold");
      doc.text(section.title, margin, currentY);
      currentY += 5;

      // List items
      doc.setFont("helvetica", "normal");
      section.content.forEach((line, index) => {
        const wrappedLines = doc.splitTextToSize(
          `${index + 1}. ${line}`,
          pageWidth - 2 * margin,
        );
        doc.text(wrappedLines, margin + 3, currentY);
        currentY += wrappedLines.length * 4;
      });

      currentY += 2;
    });
  }

  // ----- FOOTER SECTION -----
  // Add a footer with page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Add horizontal line at bottom of page
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(
      margin,
      pageHeight - margin - 2,
      pageWidth - margin,
      pageHeight - margin - 2,
    );

    // Add footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(
      `This document is system-generated and does not require a signature. Please contact our sales team if you require further clarification.`,
      margin,
      pageHeight - margin + 2,
    );

    // Add page number
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - margin + 2,
      {
        align: "right",
      },
    );
  }

  // Convert the PDF to a buffer
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
