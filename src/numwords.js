// Indian-system amount in words, e.g. "INR Nine Lakh, Fifty-Two Thousand, Three Hundred And Ninety-Nine Rupees Only"
const A = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const B = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = x => (x < 20 ? A[x] : B[Math.floor(x / 10)] + (x % 10 ? '-' + A[x % 10] : ''));
const three = x => (x >= 100 ? A[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' And ' : '') : '') + (x % 100 ? two(x % 100) : '');

export function amountInWords(amount) {
  let n = Math.round(Math.abs(Number(amount) || 0) * 100);
  const paise = n % 100;
  const rup = Math.floor(n / 100);
  const crore = Math.floor(rup / 1e7), lakh = Math.floor((rup % 1e7) / 1e5), th = Math.floor((rup % 1e5) / 1e3), rest = rup % 1000;
  const parts = [];
  if (crore) parts.push((crore < 100 ? two(crore) : three(crore)) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (rest) parts.push(three(rest));
  const s = parts.join(', ') || 'Zero';
  return `INR ${s} Rupees${paise ? ' And ' + two(paise) + ' Paise' : ''} Only`;
}
