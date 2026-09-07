import { generateGenericReportPDF } from './genericReportGenerator';
import { generateInvoicePDF as billingInvoicePDF } from './billingGenerator';

export const generatePDFReport = ({ title, columns, data, filename }) => {
  return generateGenericReportPDF(title, columns, data);
};

export const generateInvoicePDF = (data, type = 'invoice') => {
  return billingInvoicePDF(data, 'print');
};
