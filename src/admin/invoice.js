const n = (v) => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

/** Totals for a shipment's invoice data. */
export function computeInvoice(inv = {}) {
  const items = (inv.items || [])
    .filter((it) => String(it.description || '').trim() || n(it.unitPrice))
    .map((it) => {
      const quantity = n(it.quantity) || 0;
      const unitPrice = n(it.unitPrice);
      return { description: String(it.description || '').trim(), quantity, unitPrice, amount: quantity * unitPrice };
    });
  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const discount = Math.min(Math.max(0, n(inv.discount)), subtotal);
  const taxRate = Math.max(0, n(inv.taxRate));
  const tax = ((subtotal - discount) * taxRate) / 100;
  const total = subtotal - discount + tax;
  const paid = Math.max(0, n(inv.amountPaid));
  const balance = Math.max(0, total - paid);
  const status = total > 0 && paid >= total - 0.005 ? 'Paid' : paid > 0 ? 'Partially paid' : 'Unpaid';
  return { items, subtotal, discount, taxRate, tax, total, paid, balance, status };
}

export function formatMoney(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toFixed(2)}`;
  }
}

/** Cleans the editable form values into what is stored. */
export function normaliseInvoice(inv = {}) {
  return {
    currency: String(inv.currency || 'USD').toUpperCase().slice(0, 3),
    taxRate: n(inv.taxRate),
    discount: n(inv.discount),
    amountPaid: n(inv.amountPaid),
    paymentMethod: String(inv.paymentMethod || '').trim(),
    dueDate: inv.dueDate || null,
    notes: String(inv.notes || '').trim(),
    items: (inv.items || [])
      .filter((it) => String(it.description || '').trim() || n(it.unitPrice))
      .map((it) => ({ description: String(it.description || '').trim(), quantity: n(it.quantity) || 1, unitPrice: n(it.unitPrice) })),
  };
}
