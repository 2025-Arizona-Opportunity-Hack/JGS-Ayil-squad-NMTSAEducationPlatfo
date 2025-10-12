import jsPDF from "jspdf";
import { format } from "date-fns";

interface OrderDetails {
  orderId: string;
  contentTitle: string;
  contentType: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: number;
  completedAt?: number;
  userName: string;
  userEmail?: string;
}

export function generateReceipt(order: OrderDetails) {
  const doc = new jsPDF();
  
  // Set up colors
  const primaryColor = "#5B5FEF"; // Primary blue
  const textColor = "#1F2937"; // Gray-900
  const lightGray = "#F3F4F6"; // Gray-100
  
  // Header with logo/company name
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("NMTSA", 20, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Neurological Music Therapy Services of Arizona", 20, 32);
  
  // Receipt title
  doc.setTextColor(textColor);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT", 150, 25);
  
  // Order details section
  let yPos = 55;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Order Information", 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Order ID
  doc.setFont("helvetica", "bold");
  doc.text("Order ID:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.orderId, 60, yPos);
  
  yPos += 7;
  
  // Date
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(order.createdAt), "PPP"), 60, yPos);
  
  yPos += 7;
  
  // Status
  doc.setFont("helvetica", "bold");
  doc.text("Status:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.status.toUpperCase(), 60, yPos);
  
  yPos += 7;
  
  // Payment Method
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.paymentMethod, 60, yPos);
  
  // Customer details
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Information", 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Name:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.userName, 60, yPos);
  
  if (order.userEmail) {
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(order.userEmail, 60, yPos);
  }
  
  // Items section
  yPos += 20;
  doc.setFillColor(lightGray);
  doc.rect(15, yPos - 5, 180, 10, "F");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textColor);
  doc.text("Item", 20, yPos);
  doc.text("Amount", 170, yPos);
  
  yPos += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Content item
  const contentText = `${order.contentTitle} (${order.contentType})`;
  const maxWidth = 130;
  const splitText = doc.splitTextToSize(contentText, maxWidth);
  doc.text(splitText, 20, yPos);
  
  const amountText = `$${(order.amount / 100).toFixed(2)} ${order.currency.toUpperCase()}`;
  doc.text(amountText, 170, yPos);
  
  // Calculate height of split text
  const textHeight = splitText.length * 5;
  yPos += textHeight + 10;
  
  // Total section
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, 195, yPos);
  
  yPos += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", 140, yPos);
  doc.text(amountText, 170, yPos);
  
  // Footer
  yPos = 270;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your purchase!", 105, yPos, { align: "center" });
  
  yPos += 5;
  doc.text("For questions or support, please contact support@nmtsa.org", 105, yPos, { align: "center" });
  
  // Generate filename
  const filename = `NMTSA-Receipt-${order.orderId}-${format(new Date(order.createdAt), "yyyy-MM-dd")}.pdf`;
  
  // Download the PDF
  doc.save(filename);
}
