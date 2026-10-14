/**
 * Calculates rental days based on a 24-hour cycle with an optional grace period.
 * 
 * Rules:
 * 1. 24 hours from pickup = 1 rental day.
 * 2. Grace period (default 2 hours): If exceeded by <= graceHours (e.g. 26 hours total),
 *    it does NOT advance to the next day. E.g. 48h to 50h remains 2 days.
 * 3. If exceeded by > graceHours (e.g. 51 hours), advances to next day (e.g. 3 days).
 * 4. Minimum rental period is 1 day.
 * 5. If date-only strings are provided without time (e.g., '2026-10-14' to '2026-10-15'),
 *    it treats each calendar day interval as 24 hours: 14th to 15th is 1 day. Same-day is 1 day.
 */
export function calculate24HourRentalDays(pickupDate, returnDate, graceHours = 2) {
  if (!pickupDate || !returnDate) return 1;
  const p = new Date(pickupDate);
  const r = new Date(returnDate);
  if (isNaN(p.getTime()) || isNaN(r.getTime())) return 1;

  const diffMs = r.getTime() - p.getTime();
  if (diffMs <= 0) return 1;

  const diffHours = diffMs / (1000 * 60 * 60);

  // Pure midnight dates (date strings without explicit time)
  const isMidnight = (d) => d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
  if (isMidnight(p) && isMidnight(r)) {
    const calendarDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return calendarDays <= 0 ? 1 : calendarDays;
  }

  const fullDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (fullDays === 0) return 1;

  if (remainingHours <= graceHours) {
    return Math.max(1, fullDays);
  } else {
    return Math.max(1, fullDays + 1);
  }
}

/** Shared booking price calculations (tools × qty × days + accessories + transport − discount) */

export function calculateBookingCosts(formData, totalDays = 1) {
  const days = Math.max(1, Number(totalDays) || 1);
  const items = formData.items || [];
  const accessories = formData.bookingAccessories || formData.accessories || [];
  const soldItems = formData.soldItems || [];
  const pickup = formData.pickupDate ? new Date(formData.pickupDate) : new Date();

  const getCost = (item, rate) => {
    let cost = 0;
    const totalQty = Number(item.quantity) || 1;
    let returnedQty = 0;
    
    if (item.returnDates && Array.isArray(item.returnDates) && item.returnDates.length > 0) {
      item.returnDates.forEach(rd => {
        const qty = Number(rd.quantity) || 0;
        returnedQty += qty;
        
        let diffDays = Number(rd.days);
        if (!diffDays || isNaN(diffDays) || diffDays <= 0) {
          diffDays = calculate24HourRentalDays(pickup, rd.date, 2);
        }
        cost += rate * qty * diffDays;
      });
    }
    
    const unreturned = Math.max(0, totalQty - returnedQty);
    if (unreturned > 0) {
      let daysForUnreturned = (item.rentalDays && Number(item.rentalDays) > 0) ? Number(item.rentalDays) : days;
      if (formData.actualReturnDate && !item.rentalDays) {
         daysForUnreturned = calculate24HourRentalDays(pickup, formData.actualReturnDate, 2);
      }
      cost += rate * unreturned * daysForUnreturned;
    }
    return cost;
  };

  const itemCosts = items.map(item => ({
    id: item._id || item.tool || item.id,
    cost: getCost(item, Number(item.dailyRate) || 0)
  }));

  const toolsTotal = itemCosts.reduce((sum, ic) => sum + ic.cost, 0);

  const accessoryCosts = accessories.map(acc => ({
    id: acc._id || acc.accessory || acc.id,
    cost: getCost(acc, Number(acc.price) || 0)
  }));

  const accessoriesTotal = accessoryCosts.reduce((sum, ac) => sum + ac.cost, 0);

  // Sold tools are a one-time purchase — price × quantity, no per-day multiplier.
  const soldItemCosts = soldItems.map(s => ({
    id: s._id || s.tool || s.id,
    cost: (Number(s.price) || 0) * (Number(s.quantity) || 1)
  }));
  const soldItemsTotal = soldItemCosts.reduce((sum, sc) => sum + sc.cost, 0);
  const soldItemsPaid = soldItems.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);

  // Sum of what's actually been marked as paid on each individual tool
  // item / accessory row — this is the real "amount paid" for the booking,
  // not a separately-typed top-level value.
  const itemsPaid = items.reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0);
  const accessoriesPaid = accessories.reduce((sum, acc) => sum + (Number(acc.amountPaid) || 0), 0);

  const transport = Number(formData.transportCharge) || 0;
  const fuel = Number(formData.fuelCharge) || 0;
  const labour = Number(formData.labourCharge) || 0;
  const discount = Number(formData.discount) || 0;

  const itemLevelPaid = itemsPaid + accessoriesPaid + soldItemsPaid;
  const directAdvance = Number(formData.advancePayment);
  const isLumpSum = formData.paymentMode === 'lumpSum' || (itemLevelPaid === 0 && Number.isFinite(directAdvance) && directAdvance > 0);
  const advance = isLumpSum ? (Number.isFinite(directAdvance) ? directAdvance : 0) : itemLevelPaid;

  const extraCharges = Number(formData.extraCharges) || 0;
  const subtotal = toolsTotal + accessoriesTotal + soldItemsTotal + transport + fuel + labour + extraCharges;
  const totalAmount = Math.max(0, subtotal - discount);
  const balanceAmount = Math.max(0, totalAmount - advance);

  return {
    toolsTotal,
    accessoriesTotal,
    soldItemsTotal,
    itemCosts,
    accessoryCosts,
    soldItemCosts,
    itemsPaid,
    accessoriesPaid,
    soldItemsPaid,
    itemLevelPaid,
    subtotal,
    discount,
    advance: advance,
    transport: transport,
    fuel: fuel,
    labour: labour,
    fuelCharge: fuel,
    labourCharge: labour,
    extraCharges,
    baseAmount: subtotal,
    totalAmount,
    balanceAmount
  };
}

/**
 * Distributes a lump sum amount across items, accessories, and sold items
 */
export function distributeLumpSumPayment(lumpSum, items = [], accessories = [], soldItems = [], totalDays = 1) {
  let remainingToAllocate = Math.max(0, Number(lumpSum) || 0);
  const days = Math.max(1, Number(totalDays) || 1);

  // 1. Allocate to rental items
  const newItems = (items || []).map((it) => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.dailyRate) || 0;
    const rDays = Number(it.rentalDays) || days;
    const itemCost = rate * qty * rDays;
    
    const paidForThis = Math.min(itemCost, remainingToAllocate);
    remainingToAllocate -= paidForThis;
    return {
      ...it,
      amountPaid: paidForThis > 0 ? paidForThis : '',
      amountDue: Math.max(0, itemCost - paidForThis)
    };
  });

  // 2. Allocate to accessories
  const newAccessories = (accessories || []).map((acc) => {
    const qty = Number(acc.quantity) || 1;
    const price = Number(acc.price) || 0;
    const rDays = Number(acc.rentalDays) || days;
    const accCost = price * qty * rDays;

    const paidForThis = Math.min(accCost, remainingToAllocate);
    remainingToAllocate -= paidForThis;
    return {
      ...acc,
      amountPaid: paidForThis > 0 ? paidForThis : '',
      amountDue: Math.max(0, accCost - paidForThis)
    };
  });

  // 3. Allocate to sold items
  const newSoldItems = (soldItems || []).map((sold) => {
    const qty = Number(sold.quantity) || 1;
    const price = Number(sold.price) || 0;
    const soldCost = price * qty;

    const paidForThis = Math.min(soldCost, remainingToAllocate);
    remainingToAllocate -= paidForThis;
    return {
      ...sold,
      amountPaid: paidForThis > 0 ? paidForThis : '',
      amountDue: Math.max(0, soldCost - paidForThis)
    };
  });

  return {
    items: newItems,
    accessories: newAccessories,
    soldItems: newSoldItems,
    leftover: remainingToAllocate
  };
}

export function buildSmsBuilderFromRecord(record) {
  if (!record) {
    return {
      transport: '',
      fuel: '',
      labour: '',
      otherCharges: '',
      discount: '',
      deposit: '',
      advancePaid: '',
      totalPrice: '',
      balanceDue: ''
    };
  }
  return {
    transport: record.transportCharge ?? '',
    fuel: record.fuelCharge ?? '',
    labour: record.labourCharge ?? '',
    otherCharges: record.extraCharges ?? '',
    discount: record.discount ?? '',
    deposit: record.securityDeposit ?? record.deposit ?? '',
    advancePaid: record.advancePayment ?? '',
    totalPrice: record.totalAmount ?? '',
    balanceDue: record.balanceAmount ?? ''
  };
}

export function formatSmsFromBuilder(builder, record) {
  if (!record) return '';

  const itemsList = Array.isArray(record.items) ? record.items : [];
  const accList = Array.isArray(record.accessories) ? record.accessories : [];
  const days = record.totalDays || 1;
  const toolNo =
    itemsList.map((it) => `${it.toolNumber} (x${it.quantity || 1}) for ${days} days`).join('\n') ||
    accList.map((a) => `${a.name} (x${a.quantity || 1}) for ${days} days`).join('\n') ||
    'Rental';
  const accStr = accList.map((a) => `${a.name} (x${a.quantity || 1}) for ${days} days`).join(', ');

  const f = (val) => (val !== '' && val != null ? `LKR ${Number(val).toLocaleString()}` : '-');

  return `--- MAGGI TOOLS BOOKING BILL ---
Customer: ${record.clientName || 'Customer'}
Phone: ${record.clientPhone || 'N/A'}
NIC: ${record.clientNic || 'N/A'}
Pickup: ${record.pickupLocation || 'N/A'}
Return: ${record.returnLocation || 'N/A'}
Date: ${new Date(record.pickupDate || new Date()).toLocaleDateString()} to ${new Date(record.returnDate || new Date()).toLocaleDateString()}
${record.notes ? `Notes: ${record.notes}` : ''}

Items Booked:
${toolNo}
${accStr ? `Accessories: ${accStr}` : ''}

Transport: ${f(builder.transport)}
${builder.fuel && Number(builder.fuel) > 0 ? `Fuel: ${f(builder.fuel)}\n` : ''}${builder.labour && Number(builder.labour) > 0 ? `Labour: ${f(builder.labour)}\n` : ''}Other Charges: ${f(builder.otherCharges)}
Deposit: ${f(builder.deposit)}
Discount: ${f(builder.discount)}
--------------------
Total Price: ${f(builder.totalPrice)}
Paid: ${f(builder.advancePaid)}
Balance Due: ${f(builder.balanceDue)}

${builder.policies || 'Thank you for choosing MAGGI TOOLS!'}`.trim();
}