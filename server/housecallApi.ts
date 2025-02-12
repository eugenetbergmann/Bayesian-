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
    this.apiKey = apiKey;
  }

  async getInvoices(perPage: number = 100): Promise<void> {
    try {
      console.log(`Fetching paid invoices from Housecall Pro API, per_page=${perPage}`);
      
      const response = await fetch(`${this.baseUrl}/invoices`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        method: 'GET',
        // Filter only paid invoices as per PRD
        params: {
          'status': 'paid',
          'per_page': perPage
        }
      });

      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`);
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
              invoice_number: invoice.invoice_number,
              customer_name: invoice.customer?.name || 'Unknown Customer',
              invoice_date: invoice.created_at,
              service_date: invoice.service_date,
              paid_at: invoice.paid_at,
              amount: invoice.amount,
              due_amount: invoice.due_amount,
              status: 'paid', // We're only fetching paid invoices
              due_at: invoice.due_at,
              job_id: invoice.job_id,
            },
          };

          // Store raw data and normalize it
          await storage.createHousecallTransaction(
            housecallTransaction.rawData,
            housecallTransaction.housecallId
          );

          console.log(`Processed invoice ${invoice.invoice_number}`);
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
