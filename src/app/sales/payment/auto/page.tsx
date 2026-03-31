"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Link from "next/link";
import { Quotation, PaymentRecord } from "@/types/sales-quotation"; // Import Quotation interface

export default function PaymentAutoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("quotationId");
  const taskId = searchParams.get("taskId");

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

  // Payment stats
  const [totalPaid, setTotalPaid] = useState(0);
  const [balance, setBalance] = useState(0);
  const [paymentProgress, setPaymentProgress] = useState(0);

  // Add this with your other useState declarations at the top of your component
  const [generatingInv, setgeneratingInv] = useState(false);

  // 1. Add this with your other useState declarations at the top of your component
  const [paymentsWithPdfs, setPaymentsWithPdfs] = useState<
    Record<string, boolean>
  >({});

  // Add this with your other useState declarations at the top of your component
  const [selectedFileType, setSelectedFileType] = useState<
    "invoice" | "receipt" | "quotation"
  >("invoice");
  const [modalTitle, setModalTitle] = useState("Select File");

  // Add this state to track which payments have receipts
  const [paymentsWithReceipts, setPaymentsWithReceipts] = useState<
    Record<string, boolean>
  >({});

  // Calculate latest estimate balance (considering all payments)
  const latestEstimateBalance = quotation
    ? Number(
        (
          quotation.total -
          paymentRecords.reduce((sum, payment) => {
            const amount = Number(payment.amount_inv) || 0;
            return sum + amount;
          }, 0)
        ).toFixed(2),
      )
    : 0;

  // New payment form
  const [newPayment, setNewPayment] = useState<Omit<PaymentRecord, "id">>({
    invoice_number: "",
    quotation_number: quotationId || "",
    amount_inv: 0,
    balance: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    payment_reference: "",
    notes: "",
    received: false,
    received_date: "",
  });

  // PDF modal states
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<
    { name: string; lastModified: string }[]
  >([]);

  // Receipt modal states
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentPaymentRef, setCurrentPaymentRef] = useState<string | null>(
    null,
  );
  const [receiptFiles, setReceiptFiles] = useState<
    { filename: string; filePath: string }[]
  >([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [currentPaymentIdForUpload, setCurrentPaymentIdForUpload] = useState<
    string | null
  >(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // UI states
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Function to refresh payment data
  const refreshPaymentData = async () => {
    if (!quotationId) return;

    try {
      const paymentsResponse = await fetch(
        `/api/sales/payment?quotationId=${quotationId}`,
      );

      if (!paymentsResponse.ok) {
        throw new Error("Failed to fetch payment records");
      }

      const paymentsData = await paymentsResponse.json();
      setPaymentRecords(paymentsData.payments || []);

      if (quotation) {
        const allPayments = paymentsData.payments || [];
        const receivedPayments = allPayments.filter(
          (payment: any) => payment.received === 1,
        );
        const paid = receivedPayments.reduce(
          (sum: number, payment: PaymentRecord) => {
            const amount = Number(payment.amount_inv) || 0;
            return sum + amount;
          },
          0,
        );

        console.log("Refresh payment data:", {
          quotationTotal: quotation.total,
          paymentsFound: allPayments.length,
          receivedPayments: receivedPayments.length,
          calculatedPaid: paid,
          calculatedBalance: quotation.total - paid,
          payments: allPayments,
        });

        // Update local state
        setTotalPaid(paid);
        const remainingBalance = roundAmount(quotation.total - paid);
        setBalance(remainingBalance);

        // Calculate payment progress
        const progress =
          quotation.total > 0
            ? Math.min(100, (paid / quotation.total) * 100)
            : 0;
        setPaymentProgress(progress);

        // Update new payment amount default
        setNewPayment((prev) => ({
          ...prev,
          amount_inv: remainingBalance > 0 ? remainingBalance : 0,
        }));

        // NEW: Update quotation in database with paid and balance
        try {
          await fetch(
            `/api/sales/quotation?quotationId=${quotation.quotation_number}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                paid: paid,
                balance: remainingBalance,
              }),
            },
          );
          console.log("Quotation paid/balance updated successfully:", {
            paid: paid,
            balance: remainingBalance,
          });

          // Also update local quotation state
          setQuotation((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              paid: paid,
              balance: remainingBalance,
            };
          });
        } catch (updateError) {
          console.error("Error updating quotation paid/balance:", updateError);
        }
      }
    } catch (error) {
      console.error("Error refreshing payment data:", error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Fetch quotation and payment data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!quotationId || !taskId) {
          setPaymentError("Missing quotation ID");
          setLoading(false);
          return;
        }

        // Fetch quotation details
        const quotationResponse = await fetch(
          `/api/sales/quotation?taskId=${taskId}`,
        );

        if (!quotationResponse.ok) {
          throw new Error("Failed to fetch quotation details");
        }

        const quotationData = await quotationResponse.json();
        setQuotation(quotationData.quotation);

        // Fetch payment records
        const paymentsResponse = await fetch(
          `/api/sales/payment?quotationId=${quotationId}`,
        );

        if (!paymentsResponse.ok) {
          const errorText = await paymentsResponse.text();
          console.error("Payment API error:", errorText);
          throw new Error("Failed to fetch payment records");
        }

        const paymentsData = await paymentsResponse.json();
        setPaymentRecords(paymentsData.payments || []);

        // Calculate payment stats
        if (quotationData.quotation) {
          const allPayments = paymentsData.payments || [];
          const receivedPayments = allPayments.filter(
            (payment: any) => payment.received === 1,
          );
          const paid = receivedPayments.reduce(
            (sum: number, payment: PaymentRecord) => {
              const amount = Number(payment.amount_inv) || 0;
              return sum + amount;
            },
            0,
          );

          // Ensure paid is rounded to two decimal points
          // const paidRounded = Math.round(paid * 100) / 100;

          console.log("Initial payment calculation:", {
            quotationTotal: quotationData.quotation.total,
            paymentsFound: allPayments.length,
            receivedPayments: receivedPayments,
            calculatedPaid: paid,

            calculatedBalance:
              Math.round((quotationData.quotation.total - paid) * 100) / 100, // Round to two decimal points

            payments: allPayments,
          });

          setTotalPaid(paid);

          const remainingBalance = quotationData.quotation.total - paid;
          setBalance(remainingBalance);

          // Default new payment amount to remaining balance
          setNewPayment((prev) => ({
            ...prev,
            amount_inv: latestEstimateBalance,
          }));

          const progress =
            quotationData.quotation.total > 0
              ? Math.min(100, (paid / quotationData.quotation.total) * 100)
              : 0;
          setPaymentProgress(progress);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Failed to fetch quotation data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quotationId, taskId, latestEstimateBalance]);

  // 2. Add a function to check if a payment has a PDF
  const checkPaymentPdf = useCallback(
    async (paymentId: string, invoiceId?: string) => {
      try {
        if (!paymentId || !quotation?.task_id) return;

        const queryParams = new URLSearchParams({
          paymentId: paymentId,
          taskId: quotation.task_id,
          invoiceId: invoiceId || "",
        });

        const response = await fetch(
          `/api/sales/payment/check-invoice?${queryParams.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setPaymentsWithPdfs((prev) => ({
            ...prev,
            [paymentId]: data.exists,
          }));
        }
      } catch (error) {
        console.error("Error checking PDF existence:", error);
      }
    },
    [quotation?.task_id],
  );

  // Update checkReceiptExists to return a Promise with boolean result
  const checkReceiptExists = useCallback(
    async (paymentId: string): Promise<boolean> => {
      try {
        if (!quotation?.task_id) return false;

        // Find the payment to get reference
        const payment = paymentRecords.find((p) => p.id === paymentId);
        if (!payment) return false;

        const params = new URLSearchParams({
          paymentId: paymentId,
          taskId: quotation.task_id,
        });

        // Add payment reference if available
        if (payment.payment_reference) {
          params.append("reference", payment.payment_reference);
        }

        const response = await fetch(
          `/api/sales/payment/check-receipt?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          return data.exists;
        }
        return false;
      } catch (error) {
        console.error("Error checking receipt existence:", error);
        return false;
      }
    },
    [quotation?.task_id, paymentRecords],
  );

  // Update the useEffect to check for both PDFs and receipts
  useEffect(() => {
    if (quotation && paymentRecords.length > 0) {
      paymentRecords.forEach((payment) => {
        if (payment.id) {
          // Check for invoice PDFs
          checkPaymentPdf(payment.id, payment.invoice_number);

          // Check for receipts
          checkReceiptExists(payment.id).then((exists) => {
            setPaymentsWithReceipts((prev) => ({
              ...prev,
              [payment.id || ""]: exists,
            }));
          });
        }
      });
    }
  }, [paymentRecords, quotation, checkPaymentPdf, checkReceiptExists]);

  // Handle input changes for new payment
  const handlePaymentInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "amount_inv") {
      const cleanValue = value.replace(/,/g, "");
      let amount = parseFloat(cleanValue) || 0;
      amount = Math.min(amount, latestEstimateBalance);
      amount = Math.round(amount * 100) / 100;
      setNewPayment({
        ...newPayment,
        amount_inv: amount,
      });
    } else {
      setNewPayment({
        ...newPayment,
        [name]: value,
      });
    }
  };

  // Handle adding a new payment
  const handleAddPayment = async () => {
    if (!quotation) return;

    if (newPayment.amount_inv <= 0) {
      setPaymentError("Payment amount must be greater than zero");
      return;
    }

    setIsAddingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      // Auto-generate reference if empty
      let payment_reference = newPayment.payment_reference;
      if (!payment_reference) {
        payment_reference = `${quotation.quotation_number}-P${(paymentRecords.length + 1).toString().padStart(3, "0")}`;
      }

      // Calculate the new balance after this payment
      const currentTotalPaid = paymentRecords.reduce((sum, p) => {
        const amount = Number(p.amount_inv) || 0;
        return sum + amount;
      }, 0);
      const newBalanceAfterPayment =
        quotation.total - (currentTotalPaid + newPayment.amount_inv);

      const response = await fetch("/api/sales/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPayment,
          payment_reference,
          task_id: quotation.task_id,
          balance: newBalanceAfterPayment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add payment");
      }

      // Just refresh all payment data
      await refreshPaymentData();

      setNewPayment((prev) => ({
        ...prev,
        amount_inv: 0,
        payment_reference: "",
        notes: "",
      }));

      setPaymentSuccess("Payment added successfully");

      // Check if quotation status needs to be updated after a short delay to ensure state is updated
      // setTimeout(async () => {
      //   if (!quotation) return;

      // Get fresh payment data for status calculation
      // const freshPaymentsResponse = await fetch(`/api/sales/payment?quotationId=${quotationId}`);
      // const freshPaymentsData = await freshPaymentsResponse.json();
      // const allPayments = freshPaymentsData.payments || [];
      // const receivedPayments = allPayments.filter((payment: any) => payment.received === true);
      // const currentTotalPaid = receivedPayments.reduce((sum: number, payment: PaymentRecord) => {
      //   const amount = Number(payment.amount_inv) || 0;
      //   return sum + amount;
      // }, 0);

      // console.log('Status update calculation:', {
      //   quotationTotal: quotation.total,
      //   currentTotalPaid: currentTotalPaid,
      //   receivedPaymentsCount: receivedPayments.length,
      //   currentStatus: quotation.status
      // });

      // let newStatus = quotation.status;

      // if (currentTotalPaid >= quotation.total) {
      //   newStatus = 'paid';
      // } else if (currentTotalPaid > 0) {
      //   newStatus = 'partial';
      // }

      // if (newStatus !== quotation.status) {
      //   console.log('Updating status from', quotation.status, 'to', newStatus);
      //   // Update quotation status
      //   await fetch(`/api/sales/quotation?taskId=${quotation.task_id}`, {
      //     method: 'PATCH',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ status: newStatus }),
      //   });

      //   // Update local state
      //   setQuotation(prev => prev ? {
      //     ...prev,
      //     status: newStatus
      //   } : null);
      // }
      // }, 100);
    } catch (error) {
      console.error("Error adding payment:", error);
      setPaymentError(
        error instanceof Error ? error.message : "Failed to add payment",
      );
    } finally {
      setIsAddingPayment(false);
    }
  };

  // Handle deletion of payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const response = await fetch(`/api/sales/payment?id=${paymentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete payment");
      }

      await refreshPaymentData();
      setPaymentSuccess("Payment deleted successfully");
    } catch (error) {
      console.error("Error deleting payment:", error);
      setPaymentError(
        error instanceof Error ? error.message : "Failed to delete payment",
      );
    }
  };

  // Handle toggling the received status of a payment
  const handleToggleReceived = async (paymentId: string | undefined) => {
    // if (!paymentId || !confirm('Are you sure you want to toggle the received status of this payment?')) return;

    try {
      const response = await fetch(`/api/sales/payment?id=${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          received: !paymentRecords.find((p) => p.id === paymentId)?.received,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to toggle received status");
      }

      await refreshPaymentData();
      alert("Payment received status toggled successfully");
      // setPaymentSuccess('Payment received status toggled successfully');
    } catch (error) {
      console.error("Error toggling received status:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to toggle received status",
      );
      // setPaymentError(error instanceof Error ? error.message : 'Failed to toggle received status');
    }
  };

  // Handle creating invoice from quotation
  const handleCreateInvoice = async (paymentId: string) => {
    try {
      setgeneratingInv(true);

      // Find the payment record by ID
      const payment = paymentRecords.find((p) => p.id === paymentId);

      if (!payment) {
        throw new Error("Payment record not found");
      }

      const pdfData = {
        task_id: quotation ? quotation.task_id || "" : "",

        customer_name: quotation?.customer_name || "",
        customer_nric: quotation?.customer_nric || "",
        customer_contact: quotation?.customer_contact || "",
        customer_email: quotation?.customer_email || "",
        customer_address: quotation?.customer_address || "",
        customer_property: quotation?.customer_property || "",
        customer_guard: quotation?.customer_guard || "",
        sales_representative: quotation?.sales_representative || "",
        sales_uid: quotation?.sales_uid || "",

        amount_inv: payment.amount_inv || 0,
        balance: payment.balance || 0,
        received: payment.received || false,
        received_date: payment.received_date || "",

        quotation_number: payment.quotation_number || "",
        invoice_number: payment.invoice_number || "",
        payment_date:
          payment.payment_date || new Date().toISOString().split("T")[0],
        payment_method: payment.payment_method || "cash",
        payment_reference: payment.payment_reference || "",
        notes: payment.notes || "",
        company: {
          name: "CLASSYPRO Aluminium Kitchen",
          address: `3, Jalan Empire 2, Taman Perindustrian Empire Park, 81550 Gelang Patah, Johor Darul Ta'zim`,
          phone: "+6016-8866001",
          email: "inquiry@classy-pro.com",
          website: "www.classy-pro.com",
          logo: "/images/logo/classy_logo_gray.png",
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

      // console.log('PDF data:', pdfData);
      // Call the API endpoint to generate PDF
      const response = await fetch("/api/sales/payment/generate-invoice", {
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

      // Create a download link with the invoice number in the URL
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payment.invoice_number || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Show success message
      setPaymentSuccess("Invoice generated successfully");

      // IMPORTANT: After successful generation, refresh payment data and check PDF existence
      await refreshPaymentData();

      // Also check if the PDF exists now for this specific payment
      if (payment.id) {
        checkPaymentPdf(payment.id, payment.invoice_number);
      }

      setTimeout(() => setPaymentSuccess(null), 3000);
    } catch (error) {
      console.error("Error generating invoice:", error);
      setPaymentError("Failed to generate invoice");
      setTimeout(() => setPaymentError(null), 3000);
    } finally {
      setgeneratingInv(false);
    }
  };

  // Update handleViewPdf to use the same modal pattern
  const handleViewPdf = async (taskId: string) => {
    if (!taskId) {
      alert("No task ID associated with this quotation");
      return;
    }

    try {
      // Fetch list of PDFs for this task
      const response = await fetch(
        `/api/sales/quotation/files?taskId=${taskId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch PDFs");
      }

      const data = await response.json();

      if (!data.files || data.files.length === 0) {
        alert("No PDFs found for this quotation. You can generate a new one.");
        return;
      }

      // if (data.files.length === 1) {
      //   // If only one PDF, open it directly
      //   window.open(
      //     `/api/sales/quotation/view-pdf?filePath=/sales/${taskId}/quotation/${data.files[0].name}`,
      //     "_blank",
      //   );
      // } else {
      // If multiple PDFs, open modal for selection
      setPdfFiles(data.files);
      setSelectedTaskId(taskId);
      setSelectedFileType("quotation");
      setModalTitle("Select Quotation PDF");
      setIsPdfModalOpen(true);
      // }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      alert(
        "Error fetching PDFs: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  // Helper function to round amounts
  const roundAmount = (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  };

  // Add this function to view an existing invoice PDF
  const handleViewInvoicePdf = async (
    paymentId: string,
    invoiceNumber?: string,
  ) => {
    try {
      if (!quotation?.task_id) return;

      // Construct the URL with all necessary parameters
      const params = new URLSearchParams({
        paymentId: paymentId,
        taskId: quotation.task_id,
      });

      if (invoiceNumber) {
        params.append("invoiceNumber", invoiceNumber);
      }

      // Open the PDF viewer directly
      window.open(
        `/api/sales/payment/view-invoice?${params.toString()}`,
        "_blank",
      );
    } catch (error) {
      console.error("Error viewing PDF:", error);
      setPaymentError("Failed to view invoice");
      setTimeout(() => setPaymentError(null), 3000);
    }
  };

  // Update handleViewReceipt to directly open the receipt file without listing files first
  const handleViewReceipt = async (paymentId: string) => {
    try {
      if (!quotation?.task_id) return;

      // Find the payment to get reference
      const payment = paymentRecords.find((p) => p.id === paymentId);
      if (!payment) return;

      // Build the parameters for the view-receipt endpoint
      const params = new URLSearchParams({
        paymentId: paymentId,
        taskId: quotation.task_id,
      });

      // Add payment reference if available
      if (payment.payment_reference) {
        params.append("reference", payment.payment_reference);
      }

      // Open the receipt viewer directly without fetching file list first
      window.open(
        `/api/sales/payment/view-receipt?${params.toString()}`,
        "_blank",
      );
    } catch (error) {
      console.error("Error viewing receipt:", error);
      setPaymentError("Failed to view receipt");
      setTimeout(() => setPaymentError(null), 3000);
    }
  };

  //1.2 view receipt
  const handleViewReceipts = async (
    paymentId: string, // <-- now accept the paymentId
    paymentReference: string,
  ) => {
    if (!quotation?.task_id) return;

    // Store both the ID (for new uploads) and Ref (for listing)
    setCurrentPaymentIdForUpload(paymentId); // <-- SET THE NEW STATE | Id for upload button
    setCurrentPaymentRef(paymentReference); // Set the Reference for the title and API call
    setIsReceiptModalOpen(true);
    setLoadingReceipts(true);
    setReceiptFiles([]);
    setReceiptError(null);

    try {
      const url = `/api/sales/payment/list-receipts?taskId=${quotation.task_id}&paymentReference=${paymentReference}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch receipts list");
      }

      const data = await response.json();
      setReceiptFiles(data.files);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      setReceiptError(
        error instanceof Error ? error.message : "Error fetching receipts list",
      );
    } finally {
      setLoadingReceipts(false);
    }
  };

  // Handle generating payment statement PDF
  const handleGeneratePaymentStatement = async () => {
    try {
      setgeneratingInv(true);

      if (!quotation || paymentRecords.length === 0) {
        throw new Error("No payment records found");
      }

      const statementData = {
        task_id: quotation.task_id || "",

        // Customer info
        customer_name: quotation.customer_name || "",
        customer_nric: quotation.customer_nric || "",
        customer_contact: quotation.customer_contact || "",
        customer_email: quotation.customer_email || "",
        customer_address: quotation.customer_address || "",
        customer_property: quotation?.customer_property || "",
        customer_guard: quotation?.customer_guard || "",
        sales_representative: quotation?.sales_representative || "",
        sales_uid: quotation?.sales_uid || "",

        // Quotation details
        quotation_number: quotation.quotation_number || "",
        quotation_date: quotation.quotation_date || "",
        quotation_total: quotation.total || 0,

        // Payment summary
        total_paid: totalPaid || 0,
        balance: balance || 0,
        payment_progress: paymentProgress || 0,

        // Payment records
        payments: paymentRecords.map((payment) => ({
          id: payment.id,
          payment_date: payment.payment_date,
          payment_reference: payment.payment_reference,
          payment_method: payment.payment_method,
          amount: payment.amount_inv,
          balance: payment.balance,
          received: payment.received,
          received_date: payment.received_date,
          notes: payment.notes,
        })),

        // Company info
        company: {
          name: "CLASSYPRO Aluminium Kitchen",
          address: `3, Jalan Empire 2, Taman Perindustrian Empire Park, 81550 Gelang Patah, Johor Darul Ta'zim`,
          phone: "+6016-8866001",
          email: "inquiry@classy-pro.com",
          website: "www.classy-pro.com",
          logo: "/images/logo/classy_logo_gray.png",
        },

        // PDF format
        format: {
          pageSize: "A4",
          orientation: "portrait",
          margins: { top: 50, right: 50, bottom: 50, left: 50 },
          header: true,
          footer: true,
          tableLines: true,
          currencySymbol: "RM",
        },

        // Statement specific
        statement_date: new Date().toISOString().split("T")[0],
        statement_title: `Payment Statement - ${quotation.quotation_number}`,
      };

      // Call the API endpoint to generate PDF
      const response = await fetch("/api/sales/payment/generate-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(statementData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate payment statement");
      }

      // Get PDF blob and trigger download
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payment_Statement_${quotation.quotation_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Show success message
      setPaymentSuccess("Payment statement generated successfully");
      setTimeout(() => setPaymentSuccess(null), 3000);
    } catch (error) {
      console.error("Error generating payment statement:", error);
      setPaymentError("Failed to generate payment statement");
      setTimeout(() => setPaymentError(null), 3000);
    } finally {
      setgeneratingInv(false);
    }
  };

  // Update the handleFileUpload function to support multiple files
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    paymentId?: string,
  ) => {
    // Get the files from the event
    const files = e.target.files;

    if (
      !files || // Check if files exist
      files.length === 0 || // Check if any files were selected
      !paymentId ||
      !quotation?.task_id
    ) {
      return;
    }

    try {
      // Find the payment to get reference and invoice number
      const payment = paymentRecords.find((p) => p.id === paymentId);
      if (!payment) return;

      setIsAddingPayment(true); // Reuse this state to show loading

      // We will store all API call promises here
      const uploadPromises: Promise<Response>[] = [];

      // Loop through all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Use a 1-based index for the filename: _1, _2, _3
        const fileIndex = i + 1;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("paymentId", paymentId);
        formData.append("taskId", quotation.task_id);
        formData.append("paymentReference", payment.payment_reference || "");
        formData.append("invoiceNumber", payment.invoice_number || "");
        // *** NEW: Send the file index to the server ***
        formData.append("fileIndex", fileIndex.toString());

        // Add the fetch promise to the array
        uploadPromises.push(
          fetch("/api/sales/payment/upload-receipt", {
            method: "POST",
            body: formData,
          }),
        );
      }

      // Wait for all uploads to complete
      const responses = await Promise.all(uploadPromises);
      let allSuccess = true;
      let lastSuccessfulData: any = null;

      for (const response of responses) {
        if (!response.ok) {
          allSuccess = false;
          // Throw error for the first failed response
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to upload one or more receipts",
          );
        }
        lastSuccessfulData = await response.json();
      }

      // After successful upload, mark the payment as received if it wasn't already.
      // This only needs to run once if all uploads were successful.
      if (allSuccess && lastSuccessfulData && !payment.received) {
        await handleToggleReceived(paymentId);
      }

      // Refresh payment data
      await refreshPaymentData();
      // Update success message to reflect multiple files
      setPaymentSuccess(`Successfully uploaded ${files.length} receipts`);
    } catch (error) {
      console.error("Error uploading receipt:", error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Failed to upload one or more receipts",
      );
    } finally {
      setIsAddingPayment(false);
      // Clear the input value so the same files can be selected again
      e.target.value = "";

      // --- ADD THIS BLOCK TO REFRESH THE MODAL ---
      // If the modal is open (which we know by checking the state),
      // re-run the view/list function to show the new file.
      if (
        isReceiptModalOpen &&
        currentPaymentIdForUpload &&
        currentPaymentRef
      ) {
        // We re-call handleViewReceipts to refresh the file list
        // using the ID and Ref we stored in the state.
        await handleViewReceipts(currentPaymentIdForUpload, currentPaymentRef);
      }
      // --- END OF ADDED BLOCK ---
    }
  };

  return (
    <DefaultLayout>
      {/* Header with Breadcrumb */}
      <Breadcrumb
        // noHeader={true}
        pageName={quotationId ? `${quotationId}` : "New"}
      />

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
            <span className="mt-4 text-gray-500">
              Loading payment information...
            </span>
          </div>
        </div>
      ) : quotation ? (
        <div className="grid grid-cols-14 gap-5">
          {/* Top Row - Payment Summary Card */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark col-span-14 rounded-sm border bg-white">
            <div className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
                {/* Customer and Quotation Details */}
                <div className="md:col-span-2">
                  {/* Enhanced Basic Info Card */}
                  <div className="border-stroke dark:border-strokedark rounded-md border p-4">
                    {/* Customer contact info on single row */}
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h5 className="font-medium text-black dark:text-white">
                        {quotation.customer_name}
                      </h5>

                      {quotation.customer_nric && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <svg
                            className="mr-1 h-3.5 w-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                            />
                          </svg>
                          {quotation.customer_nric}
                        </div>
                      )}

                      {quotation.customer_contact && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <svg
                            className="mr-1 h-3.5 w-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 5a2 2 0 002-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {quotation.customer_contact}
                        </div>
                      )}

                      {quotation.customer_email && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <svg
                            className="mr-1 h-3.5 w-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          {quotation.customer_email}
                        </div>
                      )}
                    </div>

                    {/* Address shown separately */}
                    {quotation.customer_address && (
                      <div className="mb-3 flex items-start text-xs text-gray-500 dark:text-gray-400">
                        <svg
                          className="mt-0.5 mr-1 h-3.5 w-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span
                          className="max-w-[400px] truncate"
                          title={quotation.customer_address}
                        >
                          {quotation.customer_address}
                        </span>
                      </div>
                    )}

                    {/* Quotation Details - combined into one row */}
                    <div className="border-stroke dark:border-strokedark mt-2 border-t pt-2">
                      <div className="mb-3 space-y-1 text-sm">
                        <div className="border-stroke dark:border-strokedark flex flex-wrap justify-between border-b border-dashed pb-1">
                          <div className="flex items-center">
                            <span className="mr-2 text-gray-500 dark:text-gray-400">
                              Quotation / Task:
                            </span>
                            <span className="text-primary font-medium">
                              {quotation.quotation_number}{" "}
                              <span className="mx-1 text-gray-400 dark:text-gray-500">
                                /
                              </span>{" "}
                              {quotation.task_id}
                            </span>
                          </div>
                          <div>
                            <span className="mr-1 text-xs text-gray-500 dark:text-gray-400">
                              Issue:
                            </span>
                            <span className="text-xs">
                              {formatDate(quotation.quotation_date)}
                            </span>
                            <span className="mx-1 text-gray-300 dark:text-gray-600">
                              |
                            </span>
                            <span className="mr-1 text-xs text-gray-500 dark:text-gray-400">
                              Install:
                            </span>
                            <span className="text-xs">
                              {quotation.installation_date
                                ? formatDate(quotation.installation_date)
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sales Info - keep this section */}
                    <div className="flex items-center">
                      <svg
                        className="mr-1 h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Sales:{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {quotation.sales_representative}
                        </span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">
                          |
                        </span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {quotation.sales_uid || "N/A"}
                        </span>
                      </span>
                    </div>
                    {/* </div> */}
                  </div>
                </div>

                {/* Payment Stats */}
                <div className="md:col-span-3">
                  <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* Total Amount */}
                    <div className="dark:bg-meta-4 flex items-center justify-between rounded-md bg-gray-50 p-3 sm:flex-col sm:justify-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total
                      </span>
                      <span className="text-lg font-bold text-black sm:text-xl dark:text-white">
                        {formatCurrency(quotation.total)}
                      </span>
                    </div>

                    {/* Paid Amount */}
                    <div className="dark:bg-meta-4 flex items-center justify-between rounded-md bg-gray-50 p-3 sm:flex-col sm:justify-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Paid
                      </span>
                      <span className="text-success text-lg font-bold sm:text-xl">
                        {formatCurrency(totalPaid)}
                      </span>
                    </div>

                    {/* Actual Balance */}
                    <div className="dark:bg-meta-4 flex items-center justify-between rounded-md bg-gray-50 p-3 sm:flex-col sm:justify-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Balance
                      </span>
                      <span className="text-meta-10 text-lg font-bold sm:text-xl">
                        {formatCurrency(balance)}
                      </span>
                    </div>

                    {/* Progress Bar - Always full width */}
                    <div className="dark:bg-meta-4 col-span-1 rounded-md bg-gray-50 p-3 sm:col-span-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Progress
                        </span>
                        <span className="text-sm font-medium">
                          {paymentProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-400">
                        <div
                          className="bg-success h-2 rounded-full"
                          style={{ width: `${paymentProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Statement Section */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark col-span-14 rounded-sm border bg-white md:col-span-10">
            <div className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-black dark:text-white">
                  Payment Statement
                </h4>

                {paymentRecords.length > 0 && (
                  <button
                    className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium"
                    onClick={() => handleGeneratePaymentStatement()}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 012 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print Statement
                  </button>
                )}
              </div>

              {/* Payment Summary */}
              {paymentRecords.length > 0 && (
                <div className="dark:bg-meta-4 mb-4 rounded-md bg-gray-50 p-3">
                  <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                    <div>
                      <div className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Total Payments
                      </div>
                      <div className="text-base font-medium">
                        {paymentRecords.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Received
                      </div>
                      <div className="text-success text-base font-medium">
                        {paymentRecords.filter((p: any) => p.received).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Pending
                      </div>
                      <div className="text-warning text-base font-medium">
                        {paymentRecords.filter((p: any) => !p.received).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Paid (Received)
                      </div>
                      <div className="text-success text-base font-medium">
                        {formatCurrency(totalPaid)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentRecords.length === 0 ? (
                <div className="border-stroke dark:border-strokedark rounded-md border border-dashed p-5 text-center">
                  <svg
                    className="mx-auto mb-2 h-10 w-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 012 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">
                    No payment records found
                  </p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Payment history will appear here once payments are recorded
                  </p>
                </div>
              ) : (
                <>
                  {/* Statement table */}
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-gray-2 dark:bg-meta-4 text-left">
                          <th className="px-4 py-2.5 text-base font-medium">
                            Date
                          </th>
                          <th className="px-4 py-2.5 text-base font-medium">
                            Reference
                          </th>
                          <th className="px-4 py-2.5 text-base font-medium">
                            Type
                          </th>
                          <th className="px-4 py-2.5 text-center text-base font-medium">
                            Amount
                          </th>
                          <th className="px-4 py-2.5 text-center text-base font-medium">
                            Estimate Balance
                          </th>
                          <th className="px-4 py-2.5 text-center text-base font-medium">
                            Payment Status
                          </th>
                          <th className="w-10 px-4 py-2.5 text-base font-medium">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Initial balance row */}
                        <tr className="border-stroke dark:border-strokedark dark:bg-meta-4/50 border-t bg-gray-50/50">
                          <td className="px-4 py-2.5 text-base">
                            {formatDate(quotation.quotation_date)}
                          </td>
                          <td className="px-4 py-2.5 text-base">
                            {quotation.quotation_number}
                          </td>
                          <td className="px-4 py-2.5 text-base font-medium">
                            Initial
                          </td>
                          <td className="px-4 py-2.5 text-center text-base font-black">
                            {formatCurrency(quotation.total)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-base font-medium">
                            {formatCurrency(quotation.total)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-base">
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-base font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <svg
                                className="mr-1 h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Accepted
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {/* Invoice PDF icon button */}
                            <button
                              onClick={() => handleViewPdf(quotation.task_id)}
                              className="hover:text-success cursor-pointer text-gray-500 transition-colors"
                              title="List Quotations PDF"
                              type="button"
                            >
                              {/* <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg> */}
                              <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 512 512"
                              >
                                <path d="M64 464l48 0 0 48-48 0c-35.3 0-64-28.7-64-64L0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 304l-48 0 0-144-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16zM176 352l32 0c30.9 0 56 25.1 56 56s-25.1 56-56 56l-16 0 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-80c0-8.8 7.2-16 16-16zm32 80c13.3 0 24-10.7 24-24s-10.7-24-24-24l-16 0 0 48 16 0zm96-80l32 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-32 0c-8.8 0-16-7.2-16-16l0-128c0-8.8 7.2-16 16-16zm32 128c8.8 0 16-7.2 16-16l0-64c0-8.8-7.2-16-16-16l-16 0 0 96 16 0zm80-112c0-8.8 7.2-16 16-16l48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-64 0-64z" />
                              </svg>
                            </button>
                          </td>
                        </tr>

                        {/* Payment rows */}
                        {paymentRecords.map((payment, index) => {
                          // Calculate estimate balance: Previous estimate balance - Amount
                          const previousBalance =
                            index === 0
                              ? quotation.total
                              : quotation.total -
                                paymentRecords
                                  .slice(0, index)
                                  .reduce((sum, p) => {
                                    const amount = Number(p.amount_inv) || 0;
                                    return sum + amount;
                                  }, 0);
                          const currentBalance =
                            previousBalance - (Number(payment.amount_inv) || 0);

                          return (
                            <tr
                              key={payment.id || index}
                              className="border-stroke dark:border-strokedark border-t"
                            >
                              <td className="px-4 py-2.5 text-base">
                                {formatDate(payment.payment_date)}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-base">
                                {payment.payment_reference ||
                                  `${quotation.quotation_number}-P${(index + 1).toString().padStart(3, "0")}`}
                              </td>
                              <td className="px-4 py-2.5 text-base capitalize">
                                {payment.payment_method.replace(/_/g, " ")}
                                {payment.notes && (
                                  <span className="mt-0.5 block max-w-30 truncate text-xs text-gray-500">
                                    {payment.notes}
                                  </span>
                                )}
                              </td>
                              <td className="text-success px-4 py-2.5 text-center text-base font-medium">
                                -
                                {formatCurrency(
                                  Number(payment.amount_inv) || 0,
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center text-base font-medium">
                                {formatCurrency(currentBalance)}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {payment.received ? (
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-base font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    <svg
                                      className="mr-1 h-4 w-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Received
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-base font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
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
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    Pending
                                  </span>
                                )}
                                {payment.received && payment.received_date ? (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {formatDate(payment.received_date)}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Requires follow up
                                  </div>
                                )}
                              </td>
                              <td className="flex items-center gap-2 px-4 py-2.5 text-xs">
                                {/* Conditional PDF button based on existence */}
                                {paymentsWithPdfs[payment.id || ""] ? (
                                  <button
                                    onClick={() =>
                                      payment.id &&
                                      handleViewInvoicePdf(
                                        payment.id,
                                        payment.invoice_number,
                                      )
                                    }
                                    className="text-success hover:text-success/80 cursor-pointer transition-colors"
                                    title="View invoice"
                                    type="button"
                                    disabled={generatingInv}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="20"
                                      height="20"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                                      <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8" />
                                    </svg>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      payment.id &&
                                      handleCreateInvoice(payment.id)
                                    }
                                    className="hover:text-warning cursor-pointer text-gray-500 transition-colors"
                                    title="Generate invoice"
                                    type="button"
                                    disabled={generatingInv}
                                  >
                                    <svg
                                      className="h-6 w-6"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M12 9v6"
                                      />
                                    </svg>
                                  </button>
                                )}

                                {/* Conditional Upload/View Receipt Button based on receipt existence */}
                                {payment.received ? (
                                  // If payment is marked as received, check if receipt exists
                                  paymentsWithReceipts[payment.id || ""] ? (
                                    // If receipt exists, show view button
                                    <button
                                      // onClick={() =>
                                      //   payment.id &&
                                      //   handleViewReceipt(payment.id)
                                      // }
                                      //v1.2
                                      // onClick={() => payment.payment_reference && handleViewReceipts(payment.payment_reference)}
                                      //v1.3
                                      onClick={
                                        () =>
                                          payment.id &&
                                          payment.payment_reference && // <-- Add check for reference
                                          handleViewReceipts(
                                            payment.id,
                                            payment.payment_reference,
                                          ) // <-- Call the new modal function
                                      }
                                      className="cursor-pointer text-blue-500 transition-colors hover:text-blue-700"
                                      title="View receipts"
                                      type="button"
                                    >
                                      <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="1.5"
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                    </button>
                                  ) : (
                                    // If receipt doesn't exist but payment is received, show upload button
                                    <form>
                                      <label
                                        className="hover:text-primary cursor-pointer text-gray-500 transition-colors"
                                        title="Upload receipt for received payment"
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
                                            strokeWidth="1.5"
                                            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                                          />
                                        </svg>
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          multiple
                                          className="hidden"
                                          onChange={(e) =>
                                            handleFileUpload(e, payment.id)
                                          }
                                        />
                                      </label>
                                    </form>
                                  )
                                ) : (
                                  // If payment is not received, show standard upload button
                                  <form>
                                    <label
                                      className="hover:text-primary cursor-pointer text-gray-500 transition-colors"
                                      title="Upload receipt"
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
                                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                                        />
                                      </svg>
                                      <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={(e) =>
                                          handleFileUpload(e, payment.id)
                                        }
                                      />
                                    </label>
                                  </form>
                                )}

                                {/* Delete payment button - only show if NOT received */}
                                {!payment.received && (
                                  <button
                                    onClick={() =>
                                      payment.id &&
                                      handleDeletePayment(payment.id)
                                    }
                                    className={`${
                                      paymentsWithPdfs[payment.id || ""]
                                        ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                                        : "hover:text-danger cursor-pointer text-gray-500 transition-colors"
                                    }`}
                                    title={
                                      paymentsWithPdfs[payment.id || ""]
                                        ? "Cannot delete: PDF invoice exists"
                                        : "Delete payment"
                                    }
                                    type="button"
                                    disabled={
                                      paymentsWithPdfs[payment.id || ""]
                                    }
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
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Final balance row */}
                        {/* <tr className="border-t border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4 font-medium">
                          <td className="px-4 py-2.5 text-xs" colSpan={3}>
                            Current Actual Balance
                          </td>
                          <td className="px-4 py-2.5 text-xs text-right">
                            {formatCurrency(totalPaid)} (Received)
                          </td>
                          <td className="px-4 py-2.5 text-xs text-right font-bold">
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-4 py-2.5 text-xs"></td>
                          <td className="px-4 py-2.5 text-xs"></td>
                        </tr> */}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Add Payment Form */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark col-span-14 rounded-sm border bg-white md:col-span-4">
            <div className="p-5">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Add Payment
              </h4>

              {paymentError && (
                <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/30">
                  <div className="flex items-start">
                    <svg
                      className="mt-0.5 mr-2 h-4 w-4 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-red-700 dark:text-red-400">
                      {paymentError}
                    </div>
                  </div>
                </div>
              )}

              {paymentSuccess && (
                <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-900/30">
                  <div className="flex items-start">
                    <svg
                      className="mt-0.5 mr-2 h-4 w-4 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div className="text-sm text-green-700 dark:text-green-400">
                      {paymentSuccess}
                    </div>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddPayment();
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Amount <span className="text-meta-1">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount_inv"
                      min="0"
                      step="0.01"
                      // value={newPayment.amount_inv}
                      onChange={handlePaymentInputChange}
                      className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full [appearance:textfield] rounded-md border bg-transparent px-4 py-2 text-sm focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder={formatCurrency(latestEstimateBalance)}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Remaining estimate balance:{" "}
                      <span className="font-bold text-black dark:text-white">
                        {formatCurrency(latestEstimateBalance)}
                      </span>
                    </p>
                  </div>

                  <div className="dark:scheme-dark">
                    <label className="mb-1 block text-sm font-medium">
                      Date <span className="text-meta-1">*</span>
                    </label>
                    <input
                      type="date"
                      name="payment_date"
                      value={newPayment.payment_date}
                      onChange={handlePaymentInputChange}
                      className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full rounded-md border bg-transparent px-4 py-2 text-sm focus-visible:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Payment Method <span className="text-meta-1">*</span>
                    </label>
                    <select
                      name="payment_method"
                      value={newPayment.payment_method}
                      onChange={handlePaymentInputChange}
                      className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full rounded-md border bg-transparent px-4 py-2 text-sm focus-visible:outline-none"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="duit_now">Duit Now</option>
                      <option value="tng">TouchN&apos;GO</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      name="payment_reference"
                      value={newPayment.payment_reference || ""}
                      onChange={handlePaymentInputChange}
                      className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full rounded-md border bg-transparent px-4 py-2 text-sm focus-visible:outline-none"
                      placeholder={`${quotation.quotation_number}-P${(paymentRecords.length + 1).toString().padStart(3, "0")} (Auto-generated if empty)`}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={newPayment.notes || ""}
                    onChange={handlePaymentInputChange}
                    rows={2}
                    className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full rounded-md border bg-transparent px-4 py-2 text-sm focus-visible:outline-none"
                    placeholder="Additional payment details..."
                  ></textarea>
                </div>

                {/* <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="received"
                    name="received"
                    checked={newPayment.received || false}
                    onChange={(e) => setNewPayment(prev => ({
                      ...prev,
                      received: e.target.checked,
                      received_date: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                    }))}
                    className="h-4 w-4 text-primary focus:ring-primary border-stroke rounded dark:border-strokedark"
                  />
                  <label htmlFor="received" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Mark as received
                  </label>
                </div> */}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      isAddingPayment ||
                      newPayment.amount_inv <= 0 ||
                      newPayment.amount_inv > latestEstimateBalance ||
                      isNaN(newPayment.amount_inv)
                    }
                    className="bg-primary hover:bg-opacity-90 disabled:bg-opacity-70 inline-flex w-full cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed"
                  >
                    {isAddingPayment ? (
                      <>
                        <svg
                          className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Add Payment
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* {latestEstimateBalance <= 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCreateInvoice}
                    className="w-full inline-flex items-center justify-center rounded-md bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Invoice
                  </button>
                </div>
              )} */}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-sm border bg-white p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h5 className="mb-2 text-xl font-semibold text-black dark:text-white">
              Quotation Not Found
            </h5>
            <p className="text-center text-gray-500 dark:text-gray-400">
              The quotation you&apos;re looking for could not be found. It may
              have been deleted or the ID is incorrect.
            </p>
            <Link
              href="/sales/quotation"
              className="bg-primary hover:bg-opacity-90 mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium text-white"
            >
              Return to Quotations
            </Link>
          </div>
        </div>
      )}

      {/* PDF Selection Modal */}
      {isPdfModalOpen && selectedTaskId && (
        <div className="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-gray-400/50 backdrop-blur-xs">
          <div className="dark:bg-boxdark mx-4 w-full max-w-lg rounded-lg bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                Select PDF
              </h3>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="text-primary cursor-pointer text-2xl"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {pdfFiles.map((file, index) => (
                  <li key={index} className="py-2">
                    <button
                      onClick={() => {
                        window.open(
                          `/api/sales/quotation/view-pdf?filePath=/sales/${selectedTaskId}/quotation/${file.name}`,
                          "_blank",
                        );
                        setIsPdfModalOpen(false);
                      }}
                      className="dark:hover:bg-meta-4 flex w-full items-center rounded px-2 py-2 text-left hover:bg-gray-100"
                    >
                      <svg
                        className="text-warning mr-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M12 11v6m-3-3h6"
                        />
                      </svg>
                      <div>
                        <span className="block font-medium">
                          {file.name.length > 30
                            ? `${file.name.substring(0, 27)}...`
                            : file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(file.lastModified).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Selection Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-gray-400/50 backdrop-blur-xs">
          <div className="dark:bg-boxdark relative mx-4 w-full max-w-lg rounded-lg bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Receipts for Payment: {currentPaymentRef}
              </h3>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-primary cursor-pointer text-2xl"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto py-4">
              {loadingReceipts && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading receipts...
                </p>
              )}
              {receiptError && (
                <p className="text-center text-sm text-red-500">
                  Error: {receiptError}
                </p>
              )}
              {!loadingReceipts &&
                receiptFiles.length === 0 &&
                !receiptError && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    No receipts found for this payment.
                  </p>
                )}

              {!loadingReceipts && receiptFiles.length > 0 && (
                <ul className="space-y-2">
                  {receiptFiles.map((file, index) => (
                    <li key={file.filePath}>
                      <a
                        href={`/api/sales/payment/view-receipt?filePath=${file.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group dark:hover:bg-boxdark-2 flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <span className="flex items-center gap-2">
                          {/* <svg
                            className="text-meta-5 h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M9 12h6m-3-3v6M17 16l4-4-4-4M7 8l-4 4 4 4"
                            />
                          </svg> */}
                          <svg
                            className="text-primary h-8 w-8"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 8h6m-6 4h6m-6 4h6M6 3v18l2-2 2 2 2-2 2 2 2-2 2 2V3l-2 2-2-2-2 2-2-2-2 2-2-2Z"
                            />
                          </svg>
                          Receipt #{index + 1}: {file.filename}
                        </span>
                        {/* <svg
                          className="group-hover:text-primary h-6 w-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg> */}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dark:border-strokedark dark:bg-boxdark sticky bottom-0 flex justify-end gap-2 rounded-b-lg border-t bg-white pt-3">
              {/* --- ADD THIS <label> AS A BUTTON --- */}
              <label className="bg-primary hover:bg-primarydark dark:border-strokedark flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 font-medium text-white">
                {/* <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg> */}
                <span>Add Receipt</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    // When a file is selected, call handleFileUpload
                    // with the payment ID we stored in the state
                    if (currentPaymentIdForUpload) {
                      handleFileUpload(e, currentPaymentIdForUpload);
                    }
                  }}
                />
              </label>
              {/* --- END OF ADDED <label> --- */}
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="dark:bg-meta-4 dark:hover:bg-meta-3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
}
