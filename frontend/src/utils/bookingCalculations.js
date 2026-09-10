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
    
    if (item.returnDates && Array.isArray(item.returnDates)) {
      item.returnDates.forEach(rd => {
        const qty = Number(rd.quantity) || 0;
        returnedQty += qty;
        
        const rdDate = new Date(rd.date);
        rdDate.setHours(0,0,0,0);
        const pickupDateObj = new Date(pickup);
        pickupDateObj.setHours(0,0,0,0);
        
        let diffDays = Math.round((rdDate - pickupDateObj) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) diffDays = 1;
        else diffDays += 1;
        cost += rate * qty * diffDays;
      });
    }
    
    const unreturned = Math.max(0, totalQty - returnedQty);
    if (unreturned > 0) {
      let daysForUnreturned = (item.rentalDays && Number(item.rentalDays) > 0) ? Number(item.rentalDays) : days;
      if (formData.actualReturnDate) {
         const actDate = new Date(formData.actualReturnDate);
         actDate.setHours(0,0,0,0);
         const pickupDateObj = new Date(pickup);
         pickupDateObj.setHours(0,0,0,0);
         daysForUnreturned = Math.round((actDate - pickupDateObj) / (1000 * 60 * 60 * 24)) + 1;
         if (daysForUnreturned < 1) daysForUnreturned = 1;
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
  const advance = itemsPaid + accessoriesPaid + soldItemsPaid;

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