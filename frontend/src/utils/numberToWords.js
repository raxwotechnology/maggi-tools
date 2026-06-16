/**
 * Utility to convert numbers to Sri Lankan English currency words
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertGroup(n) {
  let res = '';
  if (n >= 100) {
    res += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 10 && n <= 19) {
    res += teens[n - 10];
  } else if (n >= 20) {
    res += tens[Math.floor(n / 10)];
    if (n % 10 > 0) res += '-' + ones[n % 10];
  } else if (n > 0) {
    res += ones[n];
  }
  return res.trim();
}

/**
 * Converts LKR numeric amount to words
 * @param {number} amount
 * @returns {string}
 */
export const amountToWords = (amount) => {
  if (amount === 0) return 'Rupees Zero Only';
  
  const parts = amount.toFixed(2).split('.');
  let num = parseInt(parts[0]);
  let cents = parseInt(parts[1]);
  
  let result = '';
  
  // Millions
  if (num >= 1000000) {
    result += convertGroup(Math.floor(num / 1000000)) + ' Million ';
    num %= 1000000;
  }
  
  // Thousands
  if (num >= 1000) {
    result += convertGroup(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  
  // Hundreds / Units
  if (num > 0) {
    result += convertGroup(num);
  }
  
  result = 'RUPEES ' + result.toUpperCase().trim();
  
  if (cents > 0) {
    result += ` AND CENTS ${convertGroup(cents).toUpperCase()} ONLY`;
  } else {
    result += ' ONLY';
  }
  
  return result;
};
