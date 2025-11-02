import { Injectable } from '@angular/core';
import { Sale, PaymentMethod } from '../models/sale.model';
import { ProductItem } from '../../models/product-item.model';

export interface PrintReceiptData {
  ticketNo: string;
  items: ProductItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  date: Date;
  cashierName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrinterService {

  constructor() { }

  /**
   * Imprime un reçu de vente
   */
  printReceipt(data: PrintReceiptData): void {
    const receiptHtml = this.generateReceiptHtml(data);
    this.printHtml(receiptHtml);
  }

  /**
   * Imprime un reçu depuis un objet Sale
   */
  printSale(sale: Sale): void {
    const receiptHtml = this.generateSaleReceiptHtml(sale);
    this.printHtml(receiptHtml);
  }

  /**
   * Génère le HTML du reçu
   */
  private generateReceiptHtml(data: PrintReceiptData): string {
    const paymentMethodLabel = this.getPaymentMethodLabel(data.paymentMethod);
    const dateStr = new Date(data.date).toLocaleString('fr-FR');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reçu - ${data.ticketNo}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            padding: 10px;
            max-width: 280px;
            margin: 0 auto;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
          }
          .store-info {
            font-size: 10px;
            color: #333;
          }
          .ticket-info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .ticket-info div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .items-table {
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .item-name {
            font-weight: bold;
            flex: 1;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #555;
            margin-top: 2px;
          }
          .item-price {
            text-align: right;
            font-weight: bold;
            min-width: 80px;
          }
          .totals {
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .total-row.grand-total {
            font-size: 14px;
            font-weight: bold;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .payment-info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .customer-info {
            margin-bottom: 15px;
            font-size: 11px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .notes {
            margin-bottom: 15px;
            font-size: 10px;
            font-style: italic;
            color: #666;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
          }
          .thank-you {
            font-weight: bold;
            margin-bottom: 5px;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .receipt {
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px;">
              <div style="width: 30px; height: 30px; background: #14b8a6; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div class="store-name">STOCKLITE</div>
            </div>
            <div class="store-info">
              Système de Gestion de Stock<br>
              Port-au-Prince, Haiti WI<br>
              Tél: +509 XX XXX XX XX
            </div>
          </div>

          <!-- Ticket Info -->
          <div class="ticket-info">
            <div>
              <span>Ticket:</span>
              <span><strong>${data.ticketNo}</strong></span>
            </div>
            <div>
              <span>Date:</span>
              <span>${dateStr}</span>
            </div>
            ${data.cashierName ? `
            <div>
              <span>Caissier:</span>
              <span>${data.cashierName}</span>
            </div>
            ` : ''}
          </div>

          <!-- Customer Info (if provided) -->
          ${data.customerName || data.customerPhone ? `
          <div class="customer-info">
            ${data.customerName ? `<div><strong>Client:</strong> ${data.customerName}</div>` : ''}
            ${data.customerPhone ? `<div><strong>Tél:</strong> ${data.customerPhone}</div>` : ''}
          </div>
          ` : ''}

          <!-- Items -->
          <div class="items-table">
            ${data.items.map(item => `
              <div class="item-row">
                <div style="flex: 1;">
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">
                    <span>${item.price.toFixed(0)} Gdes × ${item.qty}</span>
                  </div>
                </div>
                <div class="item-price">${(item.price * item.qty).toFixed(0)} Gdes</div>
              </div>
            `).join('')}
          </div>

          <!-- Totals -->
          <div class="totals">
            <div class="total-row">
              <span>Sous-total:</span>
              <span>${data.subtotal.toFixed(0)} Gdes</span>
            </div>
            <div class="total-row">
              <span>TVA (18%):</span>
              <span>${data.tax.toFixed(0)} Gdes</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${data.total.toFixed(0)} Gdes</span>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="payment-info">
            <div style="display: flex; justify-content: space-between;">
              <span>Paiement:</span>
              <strong>${paymentMethodLabel}</strong>
            </div>
          </div>

          <!-- Notes (if provided) -->
          ${data.notes ? `
          <div class="notes">
            Note: ${data.notes}
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <div class="thank-you">Merci de votre visite !</div>
            <div>Conservez ce reçu</div>
            <div style="margin-top: 10px;">www.stocklite.com</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Génère le HTML du reçu depuis un objet Sale
   */
  private generateSaleReceiptHtml(sale: Sale): string {
    const paymentMethodLabel = this.getPaymentMethodLabel(sale.paymentMethod);
    const dateStr = new Date(sale.createdAt).toLocaleString('fr-FR');
    const ticketNo = `T-${sale.id.substring(0, 8).toUpperCase()}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reçu - ${ticketNo}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            padding: 10px;
            max-width: 280px;
            margin: 0 auto;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
          }
          .store-info {
            font-size: 10px;
            color: #333;
          }
          .ticket-info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .ticket-info div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .items-table {
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .item-name {
            font-weight: bold;
            flex: 1;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #555;
            margin-top: 2px;
          }
          .item-price {
            text-align: right;
            font-weight: bold;
            min-width: 80px;
          }
          .totals {
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .total-row.grand-total {
            font-size: 14px;
            font-weight: bold;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .payment-info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .customer-info {
            margin-bottom: 15px;
            font-size: 11px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .notes {
            margin-bottom: 15px;
            font-size: 10px;
            font-style: italic;
            color: #666;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
          }
          .thank-you {
            font-weight: bold;
            margin-bottom: 5px;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .receipt {
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px;">
              <div style="width: 30px; height: 30px; background: #14b8a6; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div class="store-name">STOCKLITE</div>
            </div>
            <div class="store-info">
              Système de Gestion de Stock<br>
              Port-au-Prince, Haiti WI<br>
              Tél: +509 XX XXX XX XX
            </div>
          </div>

          <!-- Ticket Info -->
          <div class="ticket-info">
            <div>
              <span>Ticket:</span>
              <span><strong>${ticketNo}</strong></span>
            </div>
            <div>
              <span>Date:</span>
              <span>${dateStr}</span>
            </div>
            ${sale.seller ? `
            <div>
              <span>Caissier:</span>
              <span>${sale.seller.fullName}</span>
            </div>
            ` : ''}
          </div>

          <!-- Customer Info (if provided) -->
          ${sale.customerName || sale.customerPhone ? `
          <div class="customer-info">
            ${sale.customerName ? `<div><strong>Client:</strong> ${sale.customerName}</div>` : ''}
            ${sale.customerPhone ? `<div><strong>Tél:</strong> ${sale.customerPhone}</div>` : ''}
          </div>
          ` : ''}

          <!-- Items -->
          <div class="items-table">
            ${sale.items.map(item => `
              <div class="item-row">
                <div style="flex: 1;">
                  <div class="item-name">${item.product?.name || 'Produit'}</div>
                  <div class="item-details">
                    <span>${item.unitPrice.toFixed(0)} Gdes × ${item.quantity}</span>
                  </div>
                </div>
                <div class="item-price">${(item.unitPrice * item.quantity).toFixed(0)} Gdes</div>
              </div>
            `).join('')}
          </div>

          <!-- Totals -->
          <div class="totals">
            <div class="total-row">
              <span>Sous-total:</span>
              <span>${(sale.total - sale.tax).toFixed(0)} Gdes</span>
            </div>
            ${sale.discount > 0 ? `
            <div class="total-row">
              <span>Remise:</span>
              <span>-${sale.discount.toFixed(0)} Gdes</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>TVA (18%):</span>
              <span>${sale.tax.toFixed(0)} Gdes</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${sale.total.toFixed(0)} Gdes</span>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="payment-info">
            <div style="display: flex; justify-content: space-between;">
              <span>Paiement:</span>
              <strong>${paymentMethodLabel}</strong>
            </div>
          </div>

          <!-- Notes (if provided) -->
          ${sale.notes ? `
          <div class="notes">
            Note: ${sale.notes}
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <div class="thank-you">Merci de votre visite !</div>
            <div>Conservez ce reçu</div>
            <div style="margin-top: 10px;">www.stocklite.com</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Imprime le HTML dans une nouvelle fenêtre
   */
  private printHtml(html: string): void {
    // Créer une iframe cachée pour l'impression
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      console.error('Impossible de créer le document d\'impression');
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Attendre que le contenu soit chargé avant d'imprimer
    iframe.contentWindow?.addEventListener('load', () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          // Nettoyer après l'impression
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 100);
        } catch (error) {
          console.error('Erreur lors de l\'impression:', error);
          document.body.removeChild(iframe);
        }
      }, 250);
    });
  }

  /**
   * Retourne le libellé de la méthode de paiement
   */
  private getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.CARD]: 'Carte bancaire',
      [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
      [PaymentMethod.BANK_TRANSFER]: 'Virement bancaire'
    };
    return labels[method] || method;
  }
}
