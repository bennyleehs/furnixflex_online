import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import "jspdf-autotable";
import { TermsConditionsWarrantySections } from "@/types/sales-quotation";
import { getCountryFromRequest } from "@/utils/countryDetect";

export async function POST(request: Request) {
  try {
    const country = getCountryFromRequest(request);
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
      country,
      "sales",
      data.quotation.task_id.toString(),
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
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // =======================================================================
  // 1. PAGE LAYOUT DEFINITION
  // =======================================================================
  const margin = 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper function to calculate T&C height (using your existing logic)
  const calculateTermsHeight = () => {
    // This calculation should accurately reflect the space your T&C needs.
    // detailed calculation logic here for better accuracy.
    return 55; // Estimated height in mm
  };

  const TNC_HEIGHT = calculateTermsHeight();
  const HEADER_HEIGHT = 65;
  const PAGE_NUMBER_HEIGHT = 10;

  // The footer now includes the T&C and the page number area.
  const FOOTER_HEIGHT = TNC_HEIGHT + PAGE_NUMBER_HEIGHT;

  // The content area is the space between the header and the new, larger footer.
  const CONTENT_START_Y = HEADER_HEIGHT;
  const CONTENT_END_Y = pageHeight - FOOTER_HEIGHT;

  // === START MODIFICATION 1A ===
  // Determine which company info to use based on "Dealer" discount
  const isDealerQuotation = data.quotation.items.some(
    (item: any) =>
      item.category === "Discount" && item.subcategory === "Dealer",
  );

  const companyInfo = isDealerQuotation ? data.company2 : data.company1;
  // === END MODIFICATION 1A ===

  // =======================================================================
  // 2. REUSABLE DRAWING FUNCTIONS
  // =======================================================================

  // === START MODIFICATION 1A ===
  // Modified drawHeader to accept companyInfo
  const drawHeader = (company: any) => {
    // ----- HEADER SECTION WITH LOGO -----
    // Add logo on the left side
    try {
      // If a logo URL is provided in the data
      if (company.logo && company.logo.startsWith("data:image")) {
        // Logo is provided as base64 data URL
        // Note: Corrected data.company11.logo typo to company.logo
        const logoData = company.logo.split(",")[1];
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
    //v1.2
    // Define the space occupied by the logo and its margin
    const logoWidth = 32; // addImage width
    const logoMarginRight = 16; // A small buffer to the right of the logo
    const textContentStartX = margin + logoWidth + logoMarginRight;

    // content area for the text, starting after the logo
    const textContentWidth = pageWidth - textContentStartX - margin;

    // Define the column widths based on the new content area
    const companyNameWidth = textContentWidth * 0.8; // 80% of the available space
    const regNoWidth = textContentWidth * 0.2; // 20% of the available space

    // Set the y-coordinate for the top line of text
    const yPos = margin + 8; // needed to align with logo vertically

    // Company name
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(company.name, textContentStartX, yPos, {
      align: "left",
      maxWidth: companyNameWidth,
    });

    // Company reg. no.
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(company.regNo, pageWidth - margin - 14, yPos, {
      align: "right",
      maxWidth: regNoWidth,
    });

    // Company details with smaller font
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(company.address, pageWidth / 2 + margin + 10, margin + 14, {
      align: "center",
    });
    doc.text(
      `H/p: ${company.phone} • Tel: ${company.tel} • Email: ${company.email} • Website: ${company.website}`,
      pageWidth / 2 + margin + 10,
      margin + 18,
      { align: "center" },
    );
    doc.text(
      `Branches: ${company.branches}`,
      pageWidth / 2 + margin + 10,
      margin + 22,
      { align: "center" },
    );
    // === END MODIFICATION 1A ===

    // // Horizontal line separator
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
    const valueC3 = col3X + 10;

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
    doc.text(
      data.quotation.customer_property || "",
      col2X + 16,
      sectionTop + 23,
    );
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
  };

  // Draws the Terms & Conditions block on every page
  const drawRepeatingFooter = () => {
    const termsStartY = CONTENT_END_Y + 5; // Start T&C right after the content area

    // Separator horizontal line top
    doc.setLineWidth(0.3);
    doc.line(margin, termsStartY - 2, pageWidth - margin, termsStartY - 2);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Order Policy & Warranty Coverage:", margin, termsStartY + 2);

    let currentY = termsStartY + 6; // Start content below title
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
  };

  // Adds the final page number text to the bottom of the page
  const drawPageNumberFooter = (currentPage: number, totalPages: number) => {
    const footerTextY = pageHeight - PAGE_NUMBER_HEIGHT + 6;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(margin, footerTextY - 4, pageWidth - margin, footerTextY - 4);
    // Add footer text
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `This document is system-generated and does not require a signature. Please contact our sales team if you require further clarification.`,
      margin,
      footerTextY,
    );

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${currentPage} of ${totalPages}`,
      pageWidth - margin,
      footerTextY,
      { align: "right" },
    );
  };

  /**
   * Safely adds a new page, ensuring both header and footer are redrawn.
   */
  const addNewPage = () => {
    doc.addPage();
    // === START MODIFICATION 1A ===
    // Pass the selected companyInfo to the header on new pages
    drawHeader(companyInfo);
    // === END MODIFICATION 1A ===
    drawRepeatingFooter();
    return CONTENT_START_Y;
  };

  // =======================================================================
  // 3. MAIN EXECUTION FLOW
  // =======================================================================

  // Define table column
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
  const tHeaderStructure = (y: number) => {
    const headerHeight = 7;
    // Add items table header
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Table header
    doc.setFillColor(255, 202, 122);
    doc.setTextColor(0, 0, 0);
    // Draw the filled background rectangle without a border
    doc.rect(margin, y, pageWidth - 2 * margin, 7, "F");

    // Set the line color for the borders
    doc.setDrawColor(0, 0, 0);

    // Draw the top & bottom border line of the header
    doc.line(margin, y, pageWidth - margin, y);
    doc.line(margin, y + 7, pageWidth - margin, y + 7);

    // Draw the internal vertical lines
    doc.line(colPositions[1] - 1, y, colPositions[1] - 1, y + 7);
    doc.line(colPositions[2] + 4, y, colPositions[2] + 4, y + 7);
    doc.line(colPositions[3] + 5, y, colPositions[3] + 5, y + 7);
    doc.line(colPositions[4] + 6, y, colPositions[4] + 6, y + 7);
    doc.line(colPositions[5] + 9, y, colPositions[5] + 9, y + 7);

    // font for table header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    doc.text("No.", colPositions[0] + 2, y + 5);
    doc.text("Product Details", colPositions[1], y + 5);
    doc.text("Qty", colPositions[2] + 6, y + 5);
    doc.text("Unit", colPositions[3] + 8, y + 5);
    doc.text("Unit Price (RM)", colPositions[4] + 8, y + 5);
    doc.text("Total (RM)", colPositions[5] + 12, y + 5);

    // Return the y-position for the content below the header.
    return y + headerHeight;
  };

  // --- Initial Page Setup ---
  // === START MODIFICATION 1A ===
  // Pass the selected companyInfo to the header on the first page
  drawHeader(companyInfo);
  // === END MODIFICATION 1A ===
  drawRepeatingFooter();
  let yPos = CONTENT_START_Y;
  // Initial table header draw on the first page.
  yPos = tHeaderStructure(yPos);

  // Initialize flag for row before loop
  let isFirstRowOnPage = true;

  data.quotation.items.forEach((item: any, index: number) => {
    // Format values
    const unitPrice = parseFloat(item.unitPrice).toFixed(2);
    const total = parseFloat(item.total).toFixed(2);
    const productSubCtgy = item.subcategory;
    const productTitle = item.product || "";
    const productDescription = item.description || "";

    let displayText = "";

    if (item.category === "Packages") {
      displayText = productTitle;
    } else {
      displayText = productSubCtgy + " " + productTitle;
    }

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
    // // The page break check uses the new CONTENT_END_Y, leaving space for the T&C
    // Check if a new page is needed
    if (yPos + rowHeight > CONTENT_END_Y) {
      yPos = addNewPage();
      yPos = tHeaderStructure(yPos);

      // Reset the flag for row to true after creating a new page
      isFirstRowOnPage = true;
    }

    // define the color for cell fill
    doc.setFillColor(230, 230, 230);
    doc.setTextColor(0, 0, 0);
    doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, "F");

    if (isFirstRowOnPage) {
      doc.setDrawColor(0, 0, 0);

      // set the flag to false - next rows are normal
      isFirstRowOnPage = false;
    } else {
      // For all other rows color
      doc.setDrawColor(197, 197, 197);
    }

    // Draw the top horizontal line - connect with table header
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Draw the bottom horizontal line only if it's NOT the last row
    if (index < data.quotation.items.length - 1) {
      doc.setDrawColor(197, 197, 197);
      doc.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);
    }

    // Draw the vertical lines
    doc.setDrawColor(115, 115, 115);
    doc.line(colPositions[1] - 1, yPos, colPositions[1] - 1, yPos + rowHeight);
    doc.line(colPositions[2] + 4, yPos, colPositions[2] + 4, yPos + rowHeight);
    doc.line(colPositions[3] + 5, yPos, colPositions[3] + 5, yPos + rowHeight);
    doc.line(colPositions[4] + 6, yPos, colPositions[4] + 6, yPos + rowHeight);
    doc.line(colPositions[5] + 9, yPos, colPositions[5] + 9, yPos + rowHeight);

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

    // -- Add row content
    doc.text((index + 1).toString(), colPositions[0] + 2 * 2, yPos + 4, {
      align: "center",
    });

    // Draw the Product Title (bold)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(displayText, colPositions[1], yPos + 4);

    // Draw the Italicized Description (wrapped)
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(descLines, colPositions[1], yPos + 4 + titleHeight);

    //reset font back
    doc.setFont("helvetica", "normal");

    // Right-aligned numeric values
    doc.text(
      item.quantity.toString(),
      colPositions[2] + colWidths[2] - 5,
      yPos + 4,
      { align: "right" },
    );
    doc.text(item.unit, colPositions[3] + 9, yPos + 4);
    // === START MODIFICATION HERE ===
    let priceDisplay: string;
    let totalDisplay: string;

    if (item.category === "SALES DISCOUNT") {
      // For a discount item, display the total amount in the 'Unit Price' column
      // and display the total amount (which is the actual discount) in the 'Total' column as well.
      // This will visually place the discount value clearly.
      // We will ensure the discount total is displayed with the appropriate sign (negative or positive).
      const discountAmount = parseFloat(item.total);

      // Use toLocaleString for number formatting (e.g., 3,000.00)
      const formattedDiscount = discountAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Unit Price column will show the amount
      // The negative sign is part of the `item.total` value, so we'll prepend '-' if needed.
      priceDisplay =
        discountAmount < 0
          ? `-RM${formattedDiscount.substring(1)}`
          : `RM${formattedDiscount}`;

      // Total column will show the same amount, as it's a line item total.
      totalDisplay = priceDisplay;
    } else {
      // For all other items, use the regular unit price and total price.
      priceDisplay = formattedUnitPrice;
      totalDisplay = formattedTotal;
    }

    // Draw Unit Price (or Discount Total)
    doc.text(priceDisplay, colPositions[4] + colWidths[4] + 4, yPos + 4, {
      align: "right",
    });

    // Draw Total
    doc.text(totalDisplay, colPositions[5] + colWidths[5] + 10, yPos + 4, {
      align: "right",
    });
    // === END MODIFICATION HERE ===

    yPos += rowHeight;
  });

  // ---- Notes & Summary ----
  doc.setFontSize(9); // Ensure font size is set for accurate calculations

  // Calculate the potential height of the Summary section
  let summaryHeight = 5; // Initial height for Subtotal line
  const rawPkgPriceItem = data.quotation.items.filter(
    (item: any) => item.category === "Packages",
  );
  const rawAddOnPriceItem = data.quotation.items.filter(
    (item: any) => item.category === "Additional Items",
  );
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
      item.subcategory === "Special Sales Discount",
  );
  const dealerCommission = data.quotation.items.find(
    (item: any) =>
      item.category === "Discount" && item.subcategory === "Dealer",
  );
  const staffPurchaseDisc = data.quotation.items.find(
    (item: any) =>
      item.category === "Discount" && item.subcategory === "Staff Purchase",
  );

  if (
    pkgDisc ||
    addItemDisc ||
    roundingDisc ||
    dealerCommission ||
    staffPurchaseDisc
  ) {
    summaryHeight += 5; // Add space for "Discounts" title
    if (pkgDisc) summaryHeight += 5;
    if (addItemDisc) summaryHeight += 5;
    if (roundingDisc) summaryHeight += 5;
    if (dealerCommission) summaryHeight += 5;
    if (staffPurchaseDisc) summaryHeight += 5;
  }
  summaryHeight += 8; // Add space for the separator line and Grand Total

  // Calculate the actual height of the Notes section
  let notesHeight = 0;
  const noteLines = doc.splitTextToSize(
    data.quotation.notes || "",
    pageWidth - 2 * margin - 80, // width of the notes column
  );

  if (noteLines.length > 0 && noteLines[0] !== "") {
    // height of a single line of text
    const singleLineHeight = doc.getTextDimensions("M").h;
    // Calculate total height including the "Notes:" title, line spacing, and padding
    notesHeight = noteLines.length * singleLineHeight * 1.5 + 10;
  }

  // The required height is the height of the TALLER of the two sections
  const requiredHeight = Math.max(summaryHeight, notesHeight);

  // determine the section's starting Y-position
  let sectionStartY;

  if (yPos + requiredHeight > CONTENT_END_Y) {
    // CASE 1: NOT ENOUGH SPACE - new page and add top padding.
    let newPageY = addNewPage(); // newPageY is now the top of the content area
    sectionStartY = newPageY + 10; // Add 10mm of padding at the top of the new page
  } else {
    // CASE 2: ENOUGH SPACE - continue same page and add padding after the table.
    sectionStartY = yPos + 10;
  }

  // Both sections will now start drawing from the correctly padded `sectionStartY`
  yPos = sectionStartY;

  // --- Draw Summary Section (on the right) ---
  const summaryX = pageWidth - margin - 60;
  const summaryWidth = 60;
  let summaryY = sectionStartY;

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
  // ===================================================================
  // START: PRE-CALCULATE ALL DISCOUNT AMOUNTS
  // ===================================================================

  let pkgTotalDiscountAmount = 0;
  if (pkgDisc) {
    if (pkgDisc.discount > 0) {
      const pkgDiscountRate = parseFloat(pkgDisc.discount) / 100;
      if (rawPkgPriceItem.length > 0) {
        rawPkgPriceItem.forEach((item: any) => {
          pkgTotalDiscountAmount += parseFloat(item.total) * pkgDiscountRate;
        });
      }
    } else if (pkgDisc.total < 0) {
      pkgTotalDiscountAmount = Math.abs(parseFloat(pkgDisc.total));
    }
  }

  let addItemTotalDiscountAmount = 0;
  if (addItemDisc) {
    if (addItemDisc.discount > 0) {
      const addItemDiscountRate = parseFloat(addItemDisc.discount) / 100;
      if (rawAddOnPriceItem.length > 0) {
        const eligibleAddOnItems = rawAddOnPriceItem.filter(
          (item: any) =>
            item.subcategory !== "On-site Services" &&
            item.subcategory !== "Transportation Charge",
        );
        eligibleAddOnItems.forEach((item: any) => {
          addItemTotalDiscountAmount +=
            parseFloat(item.total) * addItemDiscountRate;
        });
      }
    } else if (addItemDisc.total < 0) {
      const eligibleAddItemsTotal = rawAddOnPriceItem
        .filter(
          (item: any) =>
            item.category === "Additional Items" &&
            item.subcategory !== "On-site Services" &&
            item.subcategory !== "Transportation Charge",
        )
        .reduce((sum: any, i: any) => sum + i.total, 0);

      if (eligibleAddItemsTotal > 0) {
        addItemTotalDiscountAmount = Math.abs(parseFloat(addItemDisc.total));
      }
    }
  }

  // Get Rounding Total (it's already a negative value if it exists)
  const roundingTotal = roundingDisc ? parseFloat(roundingDisc.total) : 0;

  // Calculate the base total (totalBase)
  const totalBase =
    parseFloat(data.quotation.subtotal) - // Raw Subtotal
    pkgTotalDiscountAmount - // Subtract positive package discount
    addItemTotalDiscountAmount + // Subtract positive add item discount
    roundingTotal; // Add negative rounding discount

  // Now, calculate Dealer and Staff discounts based on this new total
  let dealerCommissionAmount = 0;
  if (dealerCommission) {
    if (dealerCommission.discount > 0) {
      const dealerCommissionRate = parseFloat(dealerCommission.discount) / 100;
      dealerCommissionAmount = totalBase * dealerCommissionRate;
    } else if (dealerCommission.total < 0) {
      dealerCommissionAmount = Math.abs(parseFloat(dealerCommission.total));
    }
  }

  let staffPurchaseAmount = 0;
  if (staffPurchaseDisc) {
    if (staffPurchaseDisc.discount > 0) {
      const staffPurchaseRate = parseFloat(staffPurchaseDisc.discount) / 100;
      staffPurchaseAmount = totalBase * staffPurchaseRate;
    } else if (staffPurchaseDisc.total < 0) {
      staffPurchaseAmount = Math.abs(parseFloat(staffPurchaseDisc.total));
    }
  }

  // ===================================================================
  // END: PRE-CALCULATIONS
  // START: DRAWING SUMMARY LINES
  // ===================================================================

  // --- Display Package Discounts ---
  if (pkgTotalDiscountAmount > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Packages:", summaryX, summaryY);
    const formattedTotalDiscount = pkgTotalDiscountAmount.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `-RM${formattedTotalDiscount}`,
      summaryX + summaryWidth,
      summaryY,
      {
        align: "right",
      },
    );
    summaryY += 5;
  } else if (rawPkgPriceItem.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Packages:", summaryX, summaryY);
    doc.setFont("helvetica", "normal");
    doc.text(`RM0.00`, summaryX + summaryWidth, summaryY, {
      align: "right",
    });
    summaryY += 5;
  }

  // --- Display Additional Item Discounts ---
  if (addItemTotalDiscountAmount > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Additional Items:", summaryX, summaryY);
    const formattedTotalDiscount = addItemTotalDiscountAmount.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `-RM${formattedTotalDiscount}`,
      summaryX + summaryWidth,
      summaryY,
      {
        align: "right",
      },
    );
    summaryY += 5;
  } else if (rawAddOnPriceItem.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Additional Items:", summaryX, summaryY);
    doc.setFont("helvetica", "normal");
    doc.text(`RM0.00`, summaryX + summaryWidth, summaryY, {
      align: "right",
    });
    summaryY += 5;
  }

  // --- Display Rounding Discounts ---
  if (roundingTotal < 0) {
    // Only show if rounding is applied
    doc.setFont("helvetica", "bold");
    doc.text("Rounding:", summaryX, summaryY);
    // Use Math.abs to show roundingTotal (which is negative) as -RM...
    const formattedRounding = Math.abs(roundingTotal).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    doc.setFont("helvetica", "normal");
    doc.text(`-RM${formattedRounding}`, summaryX + summaryWidth, summaryY, {
      align: "right",
    });
    summaryY += 5;
  }

  // --- Display Dealer Commission ---
  if (dealerCommissionAmount > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Dealer Comm.:", summaryX, summaryY);
    const formattedTotalDiscount = dealerCommissionAmount.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `-RM${formattedTotalDiscount}`,
      summaryX + summaryWidth,
      summaryY,
      {
        align: "right",
      },
    );
    summaryY += 5;
  }

  // --- Display Staff Purchase ---
  if (staffPurchaseAmount > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Staff Purchase:", summaryX, summaryY);
    const formattedTotalDiscount = staffPurchaseAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    doc.setFont("helvetica", "normal");
    doc.text(
      `-RM${formattedTotalDiscount}`,
      summaryX + summaryWidth,
      summaryY,
      {
        align: "right",
      },
    );
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

  // --- Draw Notes Section (on the left) ---
  let notesY = sectionStartY;
  if (notesHeight > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, notesY);
    doc.setFont("helvetica", "normal");
    doc.text(noteLines, margin, notesY + 5, { lineHeightFactor: 1.5 });
  }

  // y axis for new position by height of section
  yPos += requiredHeight;

  // --- Page Numbers to All Pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageNumberFooter(i, totalPages);
  }

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
