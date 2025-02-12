import { InsertTransaction, InsertHousecallTransaction } from "@shared/schema";
import { storage } from "./storage";

export class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}

export class HousecallAPI {
  private baseUrl = 'https://api.housecallpro.com/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('HOUSECALL_API_KEY must be provided');
    }
    this.apiKey = apiKey;
  }

  async getInvoices(perPage: number = 100): Promise<void> {
    try {
      console.log(`Fetching paid invoices from Housecall Pro API, per_page=${perPage}`);

      const url = new URL(`${this.baseUrl}/pro/invoices`);
      url.searchParams.append('status[]', 'paid');
      url.searchParams.append('per_page', perPage.toString());
      url.searchParams.append('page', '1');

      console.log('Request URL:', url.toString());
      console.log('Using API key:', this.apiKey.substring(0, 4) + '...');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`);
        const errorBody = await response.text();
        console.error('Error body:', errorBody);
        throw new APIError(`Failed to fetch invoices: ${response.statusText}`, response.status);
      }

      const data = await response.json();
      console.log(`Retrieved ${data.length} paid invoices`);

      // Process each invoice
      for (const invoice of data) {
        try {
          // Insert raw data first
          const housecallTransaction: InsertHousecallTransaction = {
            housecallId: invoice.id,
            rawData: {
              invoice_number: invoice.invoice_number || String(invoice.id),
              customer_name: invoice.customer?.name || 'Unknown Customer',
              invoice_date: invoice.created_at,
              service_date: invoice.service_date || invoice.created_at,
              paid_at: invoice.paid_at || invoice.updated_at,
              amount: parseFloat(invoice.total) || 0,
              due_amount: parseFloat(invoice.balance) || 0,
              status: 'paid',
              due_at: invoice.due_date || invoice.created_at,
              job_id: invoice.job_id || String(invoice.id),
            },
          };

          await storage.createHousecallTransaction(
            housecallTransaction.rawData,
            housecallTransaction.housecallId
          );

          console.log(`Processed invoice ${housecallTransaction.rawData.invoice_number}`);
        } catch (error) {
          console.error(`Error processing invoice ${invoice.id}:`, error);
          // Continue with next invoice even if one fails
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Failed to fetch invoices', 500);
    }
  }
}