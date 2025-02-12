import { InsertTransaction, InsertHousecallTransaction } from "@shared/schema";
import { storage } from "./storage";

export class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}

export class HousecallAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('HOUSECALL_API_KEY must be provided');
    }
    this.apiKey = apiKey;
    // Update base URL to include API version
    this.baseUrl = 'https://api.housecallpro.com/v1';
  }

  async getInvoices(perPage: number = 100): Promise<void> {
    try {
      console.log(`Fetching paid invoices from Housecall Pro API, per_page=${perPage}`);

      // Match the Flask implementation's endpoint structure
      const url = new URL(`${this.baseUrl}/invoices`);
      url.searchParams.append('per_page', perPage.toString());
      url.searchParams.append('page', '1');
      url.searchParams.append('status', 'paid');

      console.log('Request URL:', url.toString());
      console.log('API Headers:', {
        'Authorization': `Bearer ${this.apiKey.substring(0, 4)}...`,
        'Accept': 'application/json',
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      // Log the response status and headers for debugging
      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error Response Body:', errorBody);
        throw new APIError(
          `Failed to fetch invoices: ${response.statusText} (${response.status})`,
          response.status
        );
      }

      const data = await response.json();
      console.log('Response Data Structure:', Object.keys(data));

      // Match the Flask implementation's data structure expectations
      const invoices = data?.data || data?.invoices || data;
      if (!Array.isArray(invoices)) {
        console.error('Unexpected API response structure:', data);
        throw new APIError('Invalid API response format', 500);
      }

      console.log(`Retrieved ${invoices.length} paid invoices`);

      // Process each invoice
      for (const invoice of invoices) {
        try {
          console.log('Processing invoice:', invoice.id);

          const housecallTransaction: InsertHousecallTransaction = {
            housecallId: invoice.id,
            rawData: {
              invoice_number: invoice.invoice_number || String(invoice.id),
              customer_name: invoice.customer?.name || 'Unknown Customer',
              invoice_date: invoice.created_at,
              service_date: invoice.service_date || invoice.created_at,
              paid_at: invoice.paid_at || invoice.updated_at,
              amount: parseFloat(invoice.total || invoice.amount || '0'),
              due_amount: parseFloat(invoice.balance || invoice.due_amount || '0'),
              status: 'paid',
              due_at: invoice.due_date || invoice.created_at,
              job_id: invoice.job_id || String(invoice.id),
            },
          };

          await storage.createHousecallTransaction(
            housecallTransaction.rawData,
            housecallTransaction.housecallId
          );

          console.log(`Successfully processed invoice ${housecallTransaction.rawData.invoice_number}`);
        } catch (error) {
          console.error(`Error processing invoice ${invoice.id}:`, error);
          // Continue with next invoice even if one fails
        }
      }
    } catch (error) {
      console.error('Error in getInvoices:', error);
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Failed to fetch invoices', 500);
    }
  }
}