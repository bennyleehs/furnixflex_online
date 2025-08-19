"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import {
  Task,
  Product,
  QuotationItem,
  Quotation,
  TermsConditionsWarrantySections,
  getTermsAsPlainText,
} from "@/types/sales-quotation";

export default function QuotationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const hasFetchedData = useRef(false);

  // Add this with your other useState declarations at the top of your component
  const [generatingPdf, setGeneratingPdf] = useState(false);

  function generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for browsers/environments without crypto.randomUUID
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }
  // Form states
  const [items, setItems] = useState<QuotationItem[]>([
    {
      // id: crypto.randomUUID(),
      id: generateUUID(),
      productId: "", // Use string for product ID
      category: "",
      subcategory: "",
      productName: "",
      description: "",
      quantity: 1,
      unit: "unit",
      unitPrice: 0,
      rounding: 0,
      total: 0,
      note: "",
      discount: 0,
    },
  ]);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(getTermsAsPlainText());
  const [tax, setTax] = useState(8);
  const [taxLabel, setTaxLabel] = useState<string>("SST"); // Default tax label
  const [validDays, setValidDays] = useState(14);

  // Add state variables for calculations
  const [subtotal, setSubtotal] = useState<number>(0);
  const [disAmount, setDisAmount] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  // Add this with your other state variables
  const [totalDiscount, setTotalDiscount] = useState<number>(0);

  // Add a state for the quotation number
  const [generatedQuotationNumber, setGeneratedQuotationNumber] =
    useState<string>("");

  // Categories and products state
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>(
    {},
  );
  const [products, setProducts] = useState<
    Record<string, Record<string, Product[]>>
  >({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cache for product lookup
  const [productLookup, setProductLookup] = useState<Record<string, Product>>(
    {},
  );
  const [productsError, setProductsError] = useState<string | null>(null);

  // Calculate dates
  const today = new Date().toISOString().split("T")[0];
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);
  const validUntilString = validUntil.toISOString().split("T")[0];

  // Function to generate a quotation number
  const generateQuotationNumber = useCallback(async (): Promise<string> => {
    const uid = task?.sales_uid || "";
    const prefix = uid ? uid.substring(0, 2).toUpperCase() : "QT";
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const currentMonth = (new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0");
    const quote_ref = `${prefix}${currentYear}${currentMonth}`;

    try {
      // Get the running number from the API
      const countResponse = await fetch(
        `/api/sales/quotation/count?quoteRef=${quote_ref}`,
      );
      if (!countResponse.ok) throw new Error("Failed to get quotation count");

      const countData = await countResponse.json();
      const runningNumber = (countData.count + 1).toString().padStart(4, "0");

      // Return the full quotation number
      return `${quote_ref}-${runningNumber}`;
    } catch (error) {
      console.error("Error generating quotation number:", error);
      return `${quote_ref}-0001`; // Fallback if API call fails
    }
  }, [task?.sales_uid]);

  // Add a useEffect to generate the number when needed
  useEffect(() => {
    // Only generate if we don't have a quotation ID yet
    if (!quotation?.id) {
      const generateNumber = async () => {
        const number = await generateQuotationNumber();
        setGeneratedQuotationNumber(number);
      };

      generateNumber();
    }
  }, [quotation?.id, task?.sales_uid, generateQuotationNumber]);

  // Function to generate a new quotation number
  const generateNewQuotationNumber = useCallback(async () => {
    if (!task?.sales_uid) return;

    const number = await generateQuotationNumber();
    setGeneratedQuotationNumber(number);
  }, [task?.sales_uid, generateQuotationNumber]);

  // Function to fetch existing quotation - update this function
  const fetchQuotation = useCallback(
    async (taskId: string) => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sales/quotation?taskId=${taskId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.quotation) {
            // Found existing quotation in database - load it into state
            setQuotation(data.quotation);

            // Populate form with existing data
            setItems(data.quotation.items || []);
            setNotes(data.quotation.notes || "");
            setTerms(data.quotation.terms || terms);
            setTax(data.quotation.tax || 0);

            // Show success notification
            console.log(
              "Loaded existing quotation:",
              data.quotation.quotation_number,
            );

            // No need to generate a new number since we have an existing one
            if (data.quotation.quotation_number) {
              setGeneratedQuotationNumber("");
            }

            // Show notification based on quotation status
            if (data.quotation.status === "draft") {
              alert(
                `Loaded existing draft quotation #${data.quotation.quotation_number}`,
              );
            } else if (data.quotation.status === "sent") {
              alert(
                `This quotation #${data.quotation.quotation_number} has already been sent to the customer.`,
              );
            } else if (data.quotation.status === "accepted") {
              alert(
                `This quotation #${data.quotation.quotation_number} has been accepted by the customer.`,
              );
            }
          } else {
            // No existing quotation found, generate a new one
            generateNewQuotationNumber();
          }
        } else {
          // API error handling
          console.error("Failed to check for existing quotation");
          // Still generate a number since we couldn't verify if one exists
          generateNewQuotationNumber();
        }
      } catch (error) {
        console.error("Error fetching quotation:", error);
        // Generate a number in case of error
        generateNewQuotationNumber();
      } finally {
        setLoading(false);
      }
    },
    [generateNewQuotationNumber, terms],
  ); // Add missing dependencies

  // Fetch task data if taskId is provided
  useEffect(() => {
    async function fetchTaskData() {
      if (!taskId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/sales/task?id=${taskId}`);
        if (!response.ok) throw new Error("Failed to fetch task");

        const responseData = await response.json();

        if (responseData.listTask && responseData.listTask.length > 0) {
          // Map database fields to task object
          const taskData = responseData.listTask[0];

          // Make sure property and guard are set from database values
          setTask({
            ...taskData,
            property: taskData.property,
            guard: taskData.guard,
          });

          // Try to fetch existing quotation for this task using the standardized endpoint
          fetchQuotation(taskId);
        } else {
          throw new Error("No task data found");
        }
      } catch (error) {
        console.error("Error fetching task:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!hasFetchedData.current && taskId) {
      fetchTaskData();
      hasFetchedData.current = true;
    }
  }, [taskId, fetchQuotation]);

  // Improve product fetching with better category structure
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await fetch("/api/sales/products");
        if (!response.ok) throw new Error("Failed to fetch products");

        const data = await response.json();
        console.log("Raw API response:", data);

        // Set categories and subcategories directly from API
        setCategories(data.categories || []);
        setSubcategories(data.subcategories || {});

        // Create a properly structured products object
        const productsStructure: Record<string, Record<string, Product[]>> = {};

        // Initialize the structure with all categories and subcategories
        (data.categories || []).forEach((category: string) => {
          productsStructure[category] = {};

          // Add all subcategories for this category
          if (data.subcategories && data.subcategories[category]) {
            data.subcategories[category].forEach((subcategory: string) => {
              productsStructure[category][subcategory] = [];
            });
          }
        });

        // Populate with products from allProducts array
        data.allProducts.forEach((product: any) => {
          const category = product.category;
          const subcategory = product.subcategory;

          // Ensure the category and subcategory arrays exist
          if (!productsStructure[category]) {
            productsStructure[category] = {};
          }

          if (!productsStructure[category][subcategory]) {
            productsStructure[category][subcategory] = [];
          }

          // Add the product to the appropriate category and subcategory
          productsStructure[category][subcategory].push({
            id: String(product.id),
            name: product.name,
            description: product.description || "",
            price: product.price,
            unit: product.unit,
            discount: product.discount || 0,
            // Add any other necessary properties
          });
        });

        console.log("Structured products:", productsStructure);
        setProducts(productsStructure);

        // Build product lookup for quick reference
        const productMap: Record<string, Product> = {};
        data.allProducts.forEach((product: any) => {
          productMap[String(product.id)] = {
            id: String(product.id),
            name: product.name,
            description: product.description || "",
            price: product.price,
            unit: product.unit,
            discount: product.discount || 0,
            category: product.category,
            subcategory: product.subcategory,
            // Add any other necessary properties
          };
        });
        setProductLookup(productMap);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProductsError(
          "Failed to load products from database. Please refresh and try again.",
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Enhanced logging for subcategories
  useEffect(() => {
    if (Object.keys(subcategories).length > 0) {
      console.log("Subcategories data loaded:");
      Object.keys(subcategories).forEach((cat) => {
        console.log(
          `  - ${cat}: ${subcategories[cat]?.length || 0} subcategories`,
        );
      });
    }
  }, [subcategories]);

  // Add a useEffect to log product categories and subcategories
  useEffect(() => {
    // Log the first few keys of products to debug
    console.log("Product categories:", Object.keys(products).slice(0, 3));
    console.log(
      "First category subcategories:",
      Object.keys(products)[0]
        ? Object.keys(products[Object.keys(products)[0]])
        : "No categories",
    );
  }, [products]);

  // Add a new item to the quotation
  const addItem = () => {
    setItems([
      ...items,
      {
        // id: crypto.randomUUID(),
        id: generateUUID(),
        productId: "", // Use string for product ID
        category: "",
        subcategory: "",
        productName: "",
        description: "",
        quantity: 1, // Not undefined
        unit: "unit", // Not undefined
        unitPrice: 0, // Not undefined
        rounding: 0, // Not undefined
        total: 0, // Not undefined
        note: "",
        discount: 0,
      },
    ]);
  };

  // Add a new item after the specified item
  const addItemAfter = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;

    const newItem: QuotationItem = {
      // id: crypto.randomUUID(),
      id: generateUUID(),
      productId: "", // Use string for product ID
      category: "",
      subcategory: "",
      productName: "",
      description: "",
      quantity: 1,
      unit: "unit",
      unitPrice: 0,
      rounding: 0,
      total: 0,
      note: "",
      discount: 0,
    };

    const newItems = [
      ...items.slice(0, index + 1),
      newItem,
      ...items.slice(index + 1),
    ];

    setItems(newItems);
  };

  // Remove an item from the quotation
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Update an item property
  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total when quantity or unitPrice changes
          if (field === "quantity" || field === "unitPrice") {
            const quantity =
              field === "quantity" ? Number(value) : Number(item.quantity);
            const unitPrice =
              field === "unitPrice" ? Number(value) : Number(item.unitPrice);

            updatedItem.total = quantity * unitPrice;
          }

          return updatedItem;
        }
        return item;
      }),
    );
  };

  // Save quotation with taskId-based upsert logic
  const saveQuotation = async (status: "draft" | "sent" = "draft") => {
    if (!taskId) return;

    try {
      // Always check if a quotation exists for this task ID in the database
      const checkResponse = await fetch(
        `/api/sales/quotation?taskId=${taskId}`,
      );
      let existingQuotation = null;

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.quotation) {
          existingQuotation = checkData.quotation;

          // If we didn't have the quotation loaded yet, update our state
          if (!quotation || quotation.id !== existingQuotation.id) {
            setQuotation(existingQuotation);
            setItems(existingQuotation.items || []);
            setNotes(existingQuotation.notes || "");
            setTerms(existingQuotation.terms || terms);
            setTax(existingQuotation.tax || 0);

            // Show notification
            alert("Found existing quotation. Loaded for editing.");
            return;
          }
        }
      }

      // Prepare common data for both create and update
      const quotationData = {
        task_id: taskId,
        customer_name: task?.name || "",
        customer_nric: task?.nric || "",
        customer_contact: task?.phone1 || "",
        customer_email: task?.email || "",
        customer_property: task?.property || "",
        customer_guard: task?.guard || "",
        customer_address: [
          task?.address_line1,
          task?.address_line2,
          task?.city,
          task?.postcode,
          task?.state,
          task?.country,
        ]
          .filter(Boolean)
          .join(", "),
        quotation_date: today,
        valid_until: validUntilString,
        sales_representative:
          quotation?.sales_representative || task?.sales_name || "",
        sales_uid: quotation?.sales_uid || task?.sales_uid || "",
        items,
        subtotal,
        discount: totalDiscount || 0,
        tax: tax || 0,
        total: grandTotal,
        notes,
        terms,
        status,
      };

      // If we have an existing quotation, update it - otherwise create new
      if (existingQuotation) {
        // Add ID and reference fields to update an existing quotation
        const updateData = {
          ...quotationData,
          id: existingQuotation.id,
          quote_ref: existingQuotation.quote_ref,
          quotation_number:
            existingQuotation.quotation_number || generatedQuotationNumber,
        };

        // Update existing quotation
        const response = await fetch(`/api/sales/quotation`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) throw new Error("Failed to update quotation");

        const data = await response.json();
        setQuotation(data.quotation);

        alert("Quotation updated successfully");
      } else {
        // This is a new quotation - generate new quote_ref and number
        const uid = task?.sales_uid || "";
        const prefix = uid ? uid.substring(0, 2).toUpperCase() : "QT";
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const currentMonth = (new Date().getMonth() + 1)
          .toString()
          .padStart(2, "0");
        const quote_ref = `${prefix}${currentYear}${currentMonth}`;

        // Get the running number for this quote_ref
        const countResponse = await fetch(
          `/api/sales/quotation/count?quoteRef=${quote_ref}`,
        );
        if (!countResponse.ok) throw new Error("Failed to get quotation count");

        const countData = await countResponse.json();
        const runningNumber = (countData.count + 1).toString().padStart(4, "0");

        // Generate full quotation_number
        const quotation_number = `${quote_ref}-${runningNumber}`;

        // Create new quotation
        const response = await fetch("/api/sales/quotation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...quotationData,
            quote_ref,
            quotation_number,
          }),
        });

        if (!response.ok) throw new Error("Failed to save quotation");

        const data = await response.json();
        setQuotation(data.quotation);

        alert("Quotation created successfully");
      }

      if (status === "sent" && task && task.status !== "Quotation") {
        const formData = new FormData();
        formData.append("id", taskId);
        formData.append("status", "Quotation");
        formData.append("oldStatus", task.status);
        formData.append("notes", "Quotation sent to customer");
        formData.append("userName", "Current User");

        await fetch(`/api/sales/task/update`, {
          method: "POST",
          body: formData,
        });
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Failed to save quotation");
    }
  };

  // Generate PDF quotation
  const generatePDF = async () => {
    // Alert the user to save the quotation first
    const confirmSave = confirm(
      "You need to save the quotation before generating a PDF. Would you like to save now?",
    );

    if (confirmSave) {
      // Save as draft and then continue
      await saveQuotation("draft");
      // If quotation is still not available after saving, return
      if (!quotation) {
        alert("Unable to generate PDF. Please try saving again.");
        return;
      }
    } else {
      // User declined to save, abort PDF generation
      return;
    }
    // }

    try {
      setGeneratingPdf(true);

      // Prepare the data with proper formatting
      const pdfData = {
        quotation: {
          ...quotation,
          items: items.map((item) => ({
            category: item.category,
            subcategory: item.subcategory,
            product: item.productName,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            total: item.total,
            note: item.note,
          })),
        },
        company: {
          name: "CLASSY PROJECT MARKETING SDN BHD",
          address: `No. 3, Jln Empire 2, Tmn Perindustrian Empire Park, 81550 Gelang Patah, Johor Darul Ta'zim`,
          phone: "+6016-8866001",
          tel: "07-5104106",
          email: "inquiry@classy-pro.com",
          website: "www.classy-pro.com",
          branches:
            "Kota Masai, Johor • Setia Alam, Selangor • Bukit Mertajam, Penang",
          logo: "/images/logo/Classy_2023_vertical.png",
        },
        format: {
          pageSize: "A4",
          orientation: "portrait",
          margins: { top: 50, right: 50, bottom: 50, left: 50 },
          header: true,
          footer: true,
          tableLines: true,
          currencySymbol: "RM",
        },
      };

      // Call the API endpoint to generate PDF
      const response = await fetch("/api/sales/quotation/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pdfData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get PDF blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, `Q-${quotation.quotation_number}.pdf`);

      // Revoke the URL after a small delay to ensure the new window has loaded the PDF
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Log items changes
  useEffect(() => {
    console.log("Items updated:", items);
  }, [items]);

  // Add after category selection
  const logSubcategorySelection = (category: string) => {
    console.log({
      selectedCategory: category,
      subcategoriesExist: Boolean(subcategories[category]),
      availableSubcategories: subcategories[category],
      allSubcategories: subcategories,
    });
  };

  // Add this somewhere in your component
  const debugProductStructure = (category: string, subcategory: string) => {
    console.log("Debug product structure:");
    console.log(`- Selected category: "${category}"`);
    console.log(`- Selected subcategory: "${subcategory}"`);
    console.log(
      `- Category exists in products: ${Boolean(products[category])}`,
    );
    console.log(
      `- Subcategory exists in category: ${Boolean(products[category]?.[subcategory])}`,
    );
    console.log(
      `- Products in this subcategory: ${products[category]?.[subcategory]?.length || 0}`,
    );

    if (products[category]?.[subcategory]?.length > 0) {
      console.log(
        "- First product sample:",
        products[category][subcategory][0],
      );
    } else {
      console.log("- No products found in this category/subcategory");
    }

    // Check product lookup
    const productsByCategory = Object.values(productLookup).filter(
      (p) => p.category === category && p.subcategory === subcategory,
    );
    console.log(
      `- Products in lookup for this category/subcategory: ${productsByCategory.length}`,
    );
  };

  // Add this utility function
  const formatWithCommas = (value: number | string): string => {
    // Convert to number if it's a string
    const num = typeof value === "string" ? parseFloat(value) : value;

    // Handle NaN and null values
    if (isNaN(num) || num === null) return "0.00";

    // Format with 2 decimal places
    const formattedValue = num.toFixed(2);

    // Only add commas if the number is 1000 or greater
    if (num >= 1000) {
      // Split into integer and decimal parts
      const parts = formattedValue.split(".");

      // Add commas to the integer part
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

      // Join with the decimal part
      return parts.join(".");
    }

    // For numbers less than 1000, just return with 2 decimal places
    return formattedValue;
  };

  // Add this new function inside your QuotationPage component
  const handleRoundingChange = (
    itemId: string,
    value: number,
    unitPrice: number,
  ) => {
    // Find the item being updated to check its properties
    const currentItem = items.find((i) => i.id === itemId);
    if (!currentItem) return;

    // Only proceed if it's the specific sales discount item
    if (
      currentItem.category !== "SALES DISCOUNT" ||
      currentItem.subcategory !== "Final Discount"
    ) {
      return; // Do nothing for other item types
    }

    const roundingValue = parseFloat(String(value));

    // If the input is empty or not a valid number, reset rounding and total to 0
    if (isNaN(roundingValue)) {
      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, rounding: 0, total: 0 } : item,
        ),
      );
      return;
    }

    // Validation: The absolute value of the discount cannot be larger than the absolute unit price
    // This prevents deducting more than the item is worth (e.g., deducting -120 from a -100 item)
    if (Math.abs(roundingValue) > Math.abs(unitPrice)) {
      alert(
        `Final discount cannot be more than the fixed unit price of RM ${Math.abs(unitPrice).toFixed(2)}.`,
      );
      return;
    }

    // Update both the 'rounding' and 'total' for this specific item.
    // The 'total' for a sales discount is determined by this rounding input.
    setItems(
      items.map((item) =>
        item.id === itemId
          ? { ...item, rounding: roundingValue, total: roundingValue }
          : item,
      ),
    );
  };

  // useEffect for calculation
  useEffect(() => {
    let rawPackagesTotal = 0; // <-- raw without discounts
    let rawAddItemsTotal = 0; // <-- raw without discounts

    let packagesTotal = 0; // <-- discounted
    let addItemsTotal = 0; // <-- discounted

    let rawRounding = 0; // raw salespersons' discounts
    let roundingTotal = 0; // salespersons' discounts

    // 1: Base totals
    items.forEach((item) => {
      if (item.category === "Packages") {
        rawPackagesTotal += item.total; // raw
        packagesTotal += item.total; // start discounted same as raw
      } else if (item.category === "Additional Items") {
        rawAddItemsTotal += item.total; // raw
        addItemsTotal += item.total; // start discounted same as raw
      } else if (item.category === "Deducted Accessories") {
        rawPackagesTotal += item.total; // already negative in raw
        packagesTotal += item.total; // already negative in discounted
      } else if (item.category === "SALES DISCOUNT") {
        rawRounding += item.total; // already negative in raw
        roundingTotal += item.total; // already negative in discounted
      }
    });

    // 2: Apply fixed amount discounts
    items.forEach((item) => {
      // Packages fixed discount
      if (
        item.category === "Discount" &&
        item.subcategory === "Packages" &&
        item.total < 0
      ) {
        packagesTotal += item.total; // subtract from discounted
      }
      // Add. On Item fixed discount
      if (
        item.category === "Discount" &&
        item.subcategory === "Add-on Items" &&
        item.total < 0
      ) {
        const eligibleAddItemsTotal = items
          .filter(
            (i) =>
              i.category === "Additional Items" &&
              i.subcategory !== "On-site Services" &&
              i.subcategory !== "Transportation Charge",
          )
          .reduce((sum, i) => sum + i.total, 0);

        if (eligibleAddItemsTotal > 0) {
          addItemsTotal += item.total; // subtract from discounted
        }
      }
    });

    // 3: Apply percentage discounts
    items.forEach((item) => {
      // Packages % discount
      if (
        item.category === "Discount" &&
        item.subcategory === "Packages" &&
        item.discount > 0
      ) {
        packagesTotal -= packagesTotal * (item.discount / 100);
      }
      // Add. On Item % discount
      if (
        item.category === "Discount" &&
        item.subcategory === "Add-on Items" &&
        item.discount > 0
      ) {
        const eligibleAddItemsTotal = items
          .filter(
            (i) =>
              i.category === "Additional Items" &&
              i.subcategory !== "On-site Services" &&
              i.subcategory !== "Transportation Charge",
          )
          .reduce((sum, i) => sum + i.total, 0);

        addItemsTotal -= eligibleAddItemsTotal * (item.discount / 100);
      }
    });

    // 4: Final totals
    const subtotal = rawPackagesTotal + rawAddItemsTotal; // <-- no discounts
    // const grandTotal = packagesTotal + addItemsTotal; // <-- with discounts
    const grandTotal = packagesTotal + addItemsTotal + roundingTotal; // <-- with discounts

    setSubtotal(subtotal);
    setGrandTotal(grandTotal);
  }, [items, tax]);

  // Group and format discounts
  const formatDiscounts = (discountItems: typeof items) => {
    const percentage = discountItems
      .filter((d) => d.discount > 0)
      .map((d) => `${d.discount}%`);

    const fixed = discountItems
      .filter((d) => d.total < 0)
      .map((d) => `RM ${formatWithCommas(Math.abs(d.total))}`);

    // Combine both percentage and fixed discounts
    return [...percentage, ...fixed].join(" + ");
  };

  // Detect applied discounts
  const appliedPackageDiscounts = items.filter(
    (item) =>
      item.category === "Discount" &&
      item.subcategory === "Packages" &&
      (item.total < 0 || item.discount > 0),
  );

  const appliedAddItemDiscounts = items.filter(
    (item) =>
      item.category === "Discount" &&
      item.subcategory === "Add-on Items" &&
      (item.total < 0 || item.discount > 0),
  );

  const appliedRoundingDiscounts = items.filter(
    (item) =>
      item.category === "SALES DISCOUNT" &&
      item.subcategory === "Final Discount" &&
      (item.total < 0 || item.rounding > 0),
  );

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary h-16 w-16 animate-spin rounded-full border-t-2 border-b-2"></div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
        <Breadcrumb
          noHeader={true}
          pageName={taskId ? `Quotation for Task #${taskId}` : "New Quotation"}
        />

        <div className="mt-3 flex gap-2 md:mt-0">
          <button
            onClick={() => saveQuotation("draft")}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
          >
            Save Draft
          </button>
          <button
            onClick={() => saveQuotation("sent")}
            className="bg-success hover:bg-success/90 rounded-md px-4 py-2 text-white transition"
          >
            Save & Send
          </button>
          {quotation && (
            <button
              onClick={generatePDF}
              className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-white transition"
            >
              Generate PDF
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-8">
        {/* Customer Information */}
        {task && (
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Customer Informations
              </h2>
              <button
                onClick={() => setEditingCustomer(!editingCustomer)}
                className="text-success hover:text-success/80 inline-flex items-center text-sm font-medium"
              >
                {editingCustomer ? (
                  <>
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>

            {/* Three column layout */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Left column - Customer details */}
              <div>
                <h5 className="mb-2 text-sm font-medium text-black dark:text-white">
                  Customer Details
                </h5>
                <div className="space-y-1 text-sm">
                  {editingCustomer ? (
                    <>
                      {/* Edit Mode - Name with NRIC below it */}
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Name
                        </label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) =>
                            setTask({ ...task, name: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          NRIC
                        </label>
                        <input
                          type="text"
                          value={task.nric || ""}
                          onChange={(e) =>
                            setTask({ ...task, nric: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        />
                      </div>

                      {/* Phone with Email below it */}
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={task.phone1 || ""}
                          onChange={(e) =>
                            setTask({ ...task, phone1: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Email
                        </label>
                        <input
                          type="email"
                          value={task.email || ""}
                          onChange={(e) =>
                            setTask({ ...task, email: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* View Mode - Vertical display */}
                      <div className="dark:bg-meta-4 rounded-md bg-gray-50 p-3">
                        <p className="mb-1">
                          <span className="font-medium">Name:</span> {task.name}
                        </p>
                        {task.nric && (
                          <p className="mb-1">
                            <span className="font-medium">NRIC:</span>{" "}
                            {task.nric}
                          </p>
                        )}
                        {task.phone1 && (
                          <p className="mb-1">
                            <span className="font-medium">Phone:</span>{" "}
                            {task.phone1}
                          </p>
                        )}
                        {task.email && (
                          <p>
                            <span className="font-medium">Email:</span>{" "}
                            {task.email}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Middle column - Address */}
              <div>
                <h5 className="mb-2 text-sm font-medium text-black dark:text-white">
                  Address
                </h5>
                <div className="space-y-1 text-sm">
                  {editingCustomer ? (
                    <>
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          value={task.address_line1 || ""}
                          onChange={(e) =>
                            setTask({ ...task, address_line1: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={task.address_line2 || ""}
                          onChange={(e) =>
                            setTask({ ...task, address_line2: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        />
                      </div>
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            City
                          </label>
                          <input
                            type="text"
                            value={task.city || ""}
                            onChange={(e) =>
                              setTask({ ...task, city: e.target.value })
                            }
                            className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Postcode
                          </label>
                          <input
                            type="text"
                            value={task.postcode || ""}
                            onChange={(e) =>
                              setTask({ ...task, postcode: e.target.value })
                            }
                            className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                          />
                        </div>
                      </div>
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            State
                          </label>
                          <input
                            type="text"
                            value={task.state || ""}
                            onChange={(e) =>
                              setTask({ ...task, state: e.target.value })
                            }
                            className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Country
                          </label>
                          <input
                            type="text"
                            value={task.country || ""}
                            onChange={(e) =>
                              setTask({ ...task, country: e.target.value })
                            }
                            className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Compact address display */}
                      <div className="dark:bg-meta-4 rounded-md bg-gray-50 p-3">
                        {task.address_line1 ? (
                          <>
                            <p className="mb-1">
                              {task.address_line1}
                              {task.address_line2
                                ? `, ${task.address_line2}`
                                : ""}
                            </p>
                            <p>
                              {[
                                task.city,
                                task.postcode,
                                task.state,
                                task.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-500 italic">
                            No address information available
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right column - Property Information */}
              <div>
                <h5 className="mb-2 text-sm font-medium text-black dark:text-white">
                  Property Information
                </h5>
                <div className="space-y-1 text-sm">
                  {editingCustomer ? (
                    <>
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Property Type
                        </label>
                        <select
                          value={task.property || ""}
                          onChange={(e) =>
                            setTask({ ...task, property: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        >
                          <option value="Landed">Landed</option>
                          <option value="High-Rise">High-Rise</option>
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Access Type
                        </label>
                        <select
                          value={task.guard || ""}
                          onChange={(e) =>
                            setTask({ ...task, guard: e.target.value })
                          }
                          className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-3 py-2 text-sm outline-hidden transition"
                        >
                          <option value="Guarded">Guarded</option>
                          <option value="No-Guard">No-Guard</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="dark:bg-meta-4 rounded-md bg-gray-50 p-3">
                      {task.property ? (
                        <p className="mb-1">
                          <span className="font-medium">Property:</span>{" "}
                          {task.property}
                        </p>
                      ) : (
                        <p className="mb-1 text-gray-500 italic">
                          No property details available
                        </p>
                      )}
                      {task.guard ? (
                        <p>
                          <span className="font-medium">Access:</span>{" "}
                          {task.guard}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic">
                          No access information available
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save changes button when in edit mode */}
            {editingCustomer && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      // Only proceed if we have a task with ID
                      if (!task || !task.id) {
                        throw new Error("No task ID available");
                      }

                      // Prepare the data to update using the structure expected by the API
                      const customerData = {
                        name: task.name,
                        nric: task.nric || "",
                        phone1: task.phone1 || "",
                        phone2: task.phone2 || "",
                        email: task.email || "",
                        address_line1: task.address_line1 || "",
                        address_line2: task.address_line2 || "",
                        postcode: task.postcode || "",
                        city: task.city || "",
                        state: task.state || "",
                        country: task.country || "",
                        // Include these required fields with existing values to avoid overwriting
                        source: task.source || "",
                        interested: task.interested || "",
                        add_info: task.add_info || "",
                        status: task.status || "",
                        sales_id: task.sales_id || null,
                        // Only include property_type and security_access
                        property: task.property || "",
                        guard: task.guard || "",
                      };

                      // Send to API using PUT method
                      const response = await fetch(
                        `/api/sales/lead/create?id=${task.id}`,
                        {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(customerData),
                        },
                      );

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                          errorData.error ||
                            "Failed to update customer information",
                        );
                      }

                      // If successful, toggle edit mode off
                      setEditingCustomer(false);

                      // Optional: Update the quotation customer info
                      if (quotation) {
                        setQuotation({
                          ...quotation,
                          customer_name: task.name,
                          customer_contact: task.phone1 || "",
                          customer_address: [
                            task.address_line1,
                            task.address_line2,
                            task.city,
                            task.state,
                          ]
                            .filter(Boolean)
                            .join(", "),
                        });
                      }

                      // Show success message
                      alert("Customer information updated successfully");
                    } catch (error) {
                      console.error(
                        "Error updating customer information:",
                        error,
                      );
                      alert(
                        error instanceof Error
                          ? error.message
                          : "Failed to update customer information",
                      );
                    }
                  }}
                  className="bg-success hover:bg-success/90 rounded-md px-4 py-2 text-white transition"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quotation Details */}
        <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white p-6">
          {/* Header Section */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Quotation Details
            </h2>

            {/* Quotation Number Display */}
            <div className="dark:bg-meta-4 flex items-center rounded-md bg-gray-50 px-3 py-2">
              <span className="mr-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                Quotation #:
              </span>
              {quotation?.quotation_number ? (
                <div className="flex items-center">
                  <span className="bg-primary/10 text-primary rounded-sm px-2 py-1 text-sm font-medium">
                    {quotation.quotation_number}
                  </span>
                  {quotation.status && (
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                        quotation.status === "draft"
                          ? "bg-gray-200 text-gray-800"
                          : quotation.status === "sent"
                            ? "bg-blue-100 text-blue-800"
                            : quotation.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {quotation.status.toUpperCase()}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        quotation.quotation_number || "",
                      )
                    }
                    className="hover:text-primary ml-2 text-gray-500"
                    title="Copy to clipboard"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      ></path>
                    </svg>
                  </button>
                </div>
              ) : (
                <span className="px-2 py-1 text-sm">
                  {generatedQuotationNumber ? (
                    <span className="text-gray-500">
                      {generatedQuotationNumber} (Draft)
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">
                      Auto-generated (will appear after saving)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Info Section - Dates and Representative */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Dates Panel */}
            <div className="dark:bg-meta-4 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-black dark:text-white">
                Quotation Timeline
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={today}
                    disabled
                    className="border-stroke dark:bg-boxdark w-full rounded-sm border-[1.5px] bg-white px-3 py-2 text-sm outline-hidden transition disabled:cursor-default"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Valid For (Days)
                  </label>
                  <input
                    type="number"
                    value={validDays}
                    onChange={(e) =>
                      setValidDays(parseInt(e.target.value) || 14)
                    }
                    min="1"
                    max="90"
                    className="border-stroke dark:bg-boxdark focus:border-primary active:border-primary w-full rounded-sm border-[1.5px] bg-white px-3 py-2 text-sm outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Installation Date
                  </label>
                  <input
                    type="date"
                    value={validUntilString}
                    disabled
                    className="border-stroke dark:bg-boxdark w-full rounded-sm border-[1.5px] bg-white px-3 py-2 text-sm outline-hidden transition disabled:cursor-default"
                  />
                </div>
              </div>
            </div>

            {/* Sales Representative Panel */}
            <div className="dark:bg-meta-4 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-black dark:text-white">
                Sales Representative
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Representative Name
                  </label>
                  <input
                    type="text"
                    value={
                      quotation?.sales_representative || task?.sales_name || ""
                    }
                    onChange={(e) => {
                      if (quotation) {
                        setQuotation({
                          ...quotation,
                          sales_representative: e.target.value,
                        });
                      }
                    }}
                    className="border-stroke dark:bg-boxdark focus:border-primary active:border-primary w-full rounded-sm border-[1.5px] bg-white px-3 py-2 text-sm outline-hidden transition"
                    placeholder="Sales representative name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Representative ID
                  </label>
                  <input
                    type="text"
                    value={quotation?.sales_uid || task?.sales_uid || ""}
                    onChange={(e) => {
                      if (quotation) {
                        setQuotation({
                          ...quotation,
                          sales_uid: e.target.value,
                        });
                      }
                    }}
                    className="border-stroke dark:bg-boxdark focus:border-primary active:border-primary w-full rounded-sm border-[1.5px] bg-white px-3 py-2 text-sm outline-hidden transition"
                    placeholder="Sales representative ID"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Quotation Items */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-black dark:text-white">
                Package Quotation
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center rounded-md px-3 py-1.5 transition"
              >
                <svg
                  className="mr-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                Add Item
              </button>
            </div>

            <div className="border-stroke dark:border-strokedark overflow-x-auto rounded-lg border">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="dark:bg-meta-4 bg-gray-100">
                    <th className="w-8 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="w-20 px-3 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Rounding
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="w-10 px-3 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="dark:divide-strokedark divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={
                        index % 2 === 1 ? "dark:bg-meta-4/30 bg-gray-50" : ""
                      }
                    >
                      <td className="px-3 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>

                      <td className="px-3 py-2">
                        <div className="grid grid-cols-3 gap-2">
                          {/* Category Dropdown - Fixed Version */}
                          <select
                            value={item.category || ""}
                            onChange={(e) => {
                              e.stopPropagation();
                              const category = e.target.value;
                              console.log("Selected category:", category);

                              // Create a new complete object rather than multiple updates
                              const updatedItem = {
                                ...item,
                                productId: "",
                                category,
                                subcategory: "",
                                productName: "",
                                description: "",
                                unitPrice: 0,
                                unit: "unit",
                                total: 0,
                              };

                              // Replace just this one item in the items array
                              const newItems = items.map((i) =>
                                i.id === item.id ? updatedItem : i,
                              );
                              setItems(newItems);

                              // Add logging for subcategory selection
                              logSubcategorySelection(category);
                            }}
                            className="focus:border-primary relative z-10 w-full border-b border-gray-300 bg-transparent px-1 py-1 text-sm outline-hidden dark:border-gray-600"
                          >
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>

                          {/* Subcategory Dropdown - Fixed Version */}
                          <select
                            value={item.subcategory || ""}
                            onChange={(e) => {
                              e.stopPropagation();
                              const subcategory = e.target.value;
                              console.log("Selected subcategory:", subcategory);

                              // Add this line:
                              if (subcategory)
                                debugProductStructure(
                                  item.category,
                                  subcategory,
                                );

                              // Update all dependent fields in one go
                              const updatedItem = {
                                ...item,
                                productId: "",
                                subcategory,
                                productName: "",
                                description: "",
                                unitPrice: 0,
                                unit: "unit",
                                total: 0,
                              };

                              // Replace just this one item in the items array
                              const newItems = items.map((i) =>
                                i.id === item.id ? updatedItem : i,
                              );
                              setItems(newItems);
                            }}
                            disabled={
                              !item.category ||
                              !subcategories[item.category]?.length
                            }
                            className="focus:border-primary relative z-10 w-full border-b border-gray-300 bg-transparent px-1 py-1 text-sm outline-hidden dark:border-gray-600"
                          >
                            <option value="">Select Subcategory</option>
                            {item.category &&
                            subcategories[item.category]?.length > 0 ? (
                              subcategories[item.category].map((subcat) => (
                                <option key={subcat} value={subcat}>
                                  {subcat}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>
                                No subcategories available
                              </option>
                            )}
                          </select>

                          {/* Product Dropdown - Fixed Version */}
                          <select
                            value={String(item.productId || "")}
                            onChange={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              const productId = e.target.value;
                              console.log("Product selected:", productId);

                              // Create a complete updated item to avoid multiple state updates
                              const updatedItem = { ...item, productId };

                              if (productId && productLookup[productId]) {
                                const product = productLookup[productId];
                                console.log(
                                  "Found product in lookup:",
                                  product,
                                );

                                // Update all relevant fields at once
                                // updatedItem.description = product.name || "";
                                updatedItem.productName = product.name || "";
                                updatedItem.description =
                                  product.description || "";
                                updatedItem.unitPrice = product.price || 0;
                                updatedItem.discount = product.discount || 0;
                                updatedItem.unit = product.unit || "unit";

                                // Calculate total
                                const quantity =
                                  Number(updatedItem.quantity) || 1;
                                updatedItem.total =
                                  quantity * updatedItem.unitPrice;
                              }

                              // Update the entire item at once
                              const newItems = items.map((i) =>
                                i.id === item.id ? updatedItem : i,
                              );
                              setItems(newItems);
                            }}
                            disabled={!item.category || !item.subcategory}
                            className="focus:border-primary relative z-10 w-full border-b border-gray-300 bg-transparent px-1 py-1 text-sm outline-hidden dark:border-gray-600"
                          >
                            <option value="">Select Product</option>
                            {item.category &&
                              item.subcategory &&
                              products[item.category]?.[item.subcategory]?.map(
                                (product) => (
                                  <option
                                    key={product.id}
                                    value={String(product.id)}
                                  >
                                    {product.name}
                                  </option>
                                ),
                              )}
                          </select>
                        </div>

                        {/* Hidden display for the selected product description (optional) */}
                        {item.description && (
                          <div className="mt-1 truncate text-xs text-gray-500 italic dark:text-gray-400">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Quantity Input with 0.1 Increment/Decrement */}
                      <td className="py-2">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantity ?? 1} // default to 1 if undefined or null
                          onChange={(e) => {
                            e.stopPropagation();
                            const raw = e.target.value;

                            // Allow empty string temporarily while typing
                            if (raw === "") {
                              updateItem(item.id, "quantity", "");
                              return;
                            }

                            const value = parseFloat(raw);
                            if (!isNaN(value)) {
                              updateItem(item.id, "quantity", value);
                            }
                          }}
                          disabled={
                            item.category === "SALES DISCOUNT" &&
                            item.subcategory === "Final Discount"
                          }
                          className="focus:border-primary dark:disabled:bg-meta-4 w-full border-b border-gray-300 bg-transparent px-1 py-1 text-center text-sm outline-hidden disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <div className="w-full border-b border-gray-300 bg-transparent px-1 py-1 text-right text-sm outline-hidden dark:border-gray-600">
                          {item.unit}
                        </div>
                      </td>

                      {/* v1.2 */}
                      {/* Unit Price Column */}
                      <td className="px-3 py-2">
                        <div className="w-full border-b border-gray-300 bg-transparent px-1 py-1 text-right text-sm font-medium dark:border-gray-600">
                          {formatWithCommas(item.unitPrice) || 0}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rounding}
                          onChange={(e) => {
                            let value = parseFloat(e.target.value);
                            // Check if the input value is a positive number
                            if (!isNaN(value) && value > 0) {
                              // Automatically convert the positive number to negative
                              value = -value;
                            }
                            handleRoundingChange(
                              item.id,
                              value,
                              item.unitPrice,
                            );
                          }}
                          disabled={
                            !(
                              item.category === "SALES DISCOUNT" &&
                              item.subcategory === "Final Discount"
                            )
                          }
                          placeholder={
                            item.category === "SALES DISCOUNT" &&
                            item.subcategory === "Final Discount"
                              ? "e.g. -5.50" // A helpful placeholder
                              : "N/A"
                          }
                          className="focus:border-primary dark:disabled:bg-meta-4 w-full border-b border-gray-300 bg-transparent px-1 py-1 text-right text-sm outline-hidden disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="w-full border-b border-gray-300 bg-transparent px-1 py-1 text-right text-sm font-medium dark:border-gray-600">
                          {formatWithCommas(item.total) || 0}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Add Item Button */}
                          <button
                            type="button"
                            onClick={() => addItemAfter(item.id)}
                            className="text-primary hover:text-primary/80"
                            title="Add item after this row"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              ></path>
                            </svg>
                          </button>

                          {/* Delete Button - Only show if there's more than one item */}
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-danger hover:text-danger/80"
                              title="Remove this item"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                ></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes, Terms, and Totals */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-6">
              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-black dark:text-white">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes to customer..."
                  className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-5 py-3 text-sm outline-hidden transition"
                ></textarea>
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-black dark:text-white">
                  Order Policy & Warranty Coverage
                </label>
                <div className="border-stroke dark:border-strokedark dark:bg-form-input w-full space-y-3 rounded-sm border-[1.5px] bg-transparent px-5 py-3 text-sm text-black dark:text-white">
                  {TermsConditionsWarrantySections.map((section) => (
                    <div key={section.title}>
                      <div className="mb-1 font-bold">{section.title}</div>
                      <ul className="list-decimal space-y-1 pl-5">
                        {section.content.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-8 border-t border-gray-200 pt-2">
              <h3 className="mb-2 text-lg font-medium">Summary</h3>
              <div className="flex justify-end">
                <div className="w-2/3">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatWithCommas(subtotal)}</span>
                  </div>

                  {/* Show package discounts only if applied */}
                  {/* Grouped package discounts */}
                  {appliedPackageDiscounts.length > 0 && (
                    <div className="flex justify-between py-1">
                      <span>Packages Discounts:</span>
                      <span className="text-red-600">
                        -{formatDiscounts(appliedPackageDiscounts)}
                      </span>
                    </div>
                  )}

                  {/* Grouped additional item discounts */}
                  {appliedAddItemDiscounts.length > 0 && (
                    <div className="py-1">
                      {/* Row: label + discount */}
                      <div className="flex justify-between">
                        <span>Additional Items Discounts:</span>
                        <span className="text-red-600">
                          -{formatDiscounts(appliedAddItemDiscounts)}
                        </span>
                      </div>

                      {/* Note below */}
                      <div className="text-sm text-gray-500 italic">
                        (*On-site Services & Transportation Charge not included)
                      </div>
                    </div>
                  )}

                  {/* Show package discounts only if applied */}
                  {/* Grouped package discounts */}
                  {appliedRoundingDiscounts.length > 0 && (
                    <div className="flex justify-between py-1">
                      <span>Rounding Discounts:</span>
                      <span className="text-red-600">
                        -{formatDiscounts(appliedRoundingDiscounts)}
                      </span>
                    </div>
                  )}

                  {/* Tax Row */}
                  {/* for dealer */}
                  {/* {taxLabel && (
                    <div className="flex justify-between border-b border-gray-200 py-1">
                      <span>{taxLabel}:</span>
                      <span>{tax}%</span>
                    </div>
                  )} */}

                  {/* Grand Total */}
                  <div className="flex justify-between border-t border-gray-200 py-2 font-bold">
                    <span>Grand Total:</span>
                    <span>RM {formatWithCommas(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
