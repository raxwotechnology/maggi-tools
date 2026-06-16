import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet, FileText, RefreshCw, Package, Calendar, Filter, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { hireAPI, bookingAPI, salaryAPI, paymentAPI, extraIncomeAPI, expenseAPI, toolAPI } from '../services/api';
import logoUrl from '../logo.png';
import '../styles/report.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const FinancialReport = ({ appSettings }) => {
  const [data, setData] = useState({ hires: [], bookings: [], salaries: [], payments: [], extraIncome: [], expenses: [], tools: [] });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [refreshing, setRefreshing] = useState(false);
  const reportRef = useRef(null);

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [h, b, s, p, ei, ex, t] = await Promise.all([
        hireAPI.get(),
        bookingAPI.get(),
        salaryAPI.get(),
        paymentAPI.get(),
        extraIncomeAPI.get(),
        expenseAPI.get(),
        toolAPI.get()
      ]);
      setData({
        hires: h.data || [],
        bookings: b.data || [],
        salaries: s.data || [],
        payments: p.data || [],
        extraIncome: ei.data || [],
        expenses: ex.data || [],
        tools: t.data || []
      });
    } catch (err) {
      console.error('Report fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();

    const interval = setInterval(() => fetchAll(true), 10000);
    const handleRefresh = () => fetchAll(true);

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('raxwo_data_updated', handleRefresh);
    window.addEventListener('raxwo_lease_updated', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('raxwo_data_updated', handleRefresh);
      window.removeEventListener('raxwo_lease_updated', handleRefresh);
    };
  }, []);

  const filterByPeriod = (records, dateField = 'date') => {
    return records.filter(r => {
      const d = new Date(r[dateField] || r.createdAt);
      const yearMatch = d.getFullYear() === parseInt(selectedYear);
      const monthMatch = selectedMonth === 'All' || d.getMonth() === MONTHS.indexOf(selectedMonth);
      return yearMatch && monthMatch;
    });
  };

  const filterSalaries = (records) => {
    return records.filter(r => {
      const period = r.month || '';
      if (selectedMonth === 'All') return period.includes(selectedYear);
      return period.includes(selectedMonth) && period.includes(selectedYear);
    });
  };

  const stats = useMemo(() => {
    const fHires = filterByPeriod(data.hires, 'date');
    const fBookings = filterByPeriod(data.bookings, 'date');
    const fSalaries = filterSalaries(data.salaries);
    const fPayments = filterByPeriod(data.payments, 'date');
    const fExtraIncome = filterByPeriod(data.extraIncome, 'date');
    const fExpenses = filterByPeriod(data.expenses, 'date');

    const totalHireRevenue = fHires.reduce((s, r) => s + (parseFloat(r.totalAmount || r.billAmount) || 0), 0);
    const totalBookingRevenue = fBookings.reduce((s, r) => s + (parseFloat(r.totalAmount || r.amount) || 0), 0);
    const totalRentalRevenue = totalHireRevenue + totalBookingRevenue;

    const totalSalary = fSalaries.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const totalPayments = fPayments.reduce((s, r) => s + (parseFloat(r.takenAmount || r.paidAmount) || 0), 0);
    const totalExtraIncome = fExtraIncome.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalOtherExp = fExpenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const totalLeasing = data.tools
      .filter(v => v.hasLeasing && v.monthlyPremium)
      .reduce((s, v) => {
        const premium = parseFloat(v.monthlyPremium) || 0;
        const payments = v.leasePayments || [];
        if (selectedMonth === 'All') {
          const paidMonths = payments.filter(lp =>
            lp.year === parseInt(selectedYear) && lp.paid
          ).length;
          return s + paidMonths * premium;
        } else {
          const monthIdx = MONTHS.indexOf(selectedMonth) + 1;
          const entry = payments.find(lp =>
            lp.year === parseInt(selectedYear) && lp.month === monthIdx && lp.paid
          );
          return s + (entry ? premium : 0);
        }
      }, 0);

    const totalIncome = totalRentalRevenue + totalExtraIncome;
    const totalExpense = totalSalary + totalOtherExp + totalLeasing;
    const netProfit = totalIncome - totalExpense;
    const cashBalance = (totalPayments + totalExtraIncome) - totalExpense;

    const paymentsByMethod = fPayments.reduce((acc, r) => {
      const method = r.paymentMethod || 'Cash';
      const amount = parseFloat(r.takenAmount || r.paidAmount) || 0;
      if (!acc[method]) acc[method] = 0;
      acc[method] += amount;
      return acc;
    }, {});

    return {
      fHires, fBookings, fSalaries, fPayments, fExtraIncome, fExpenses,
      totalRentalRevenue, totalHireRevenue, totalBookingRevenue,
      totalSalary, totalPayments, totalExtraIncome, totalOtherExp, totalLeasing,
      totalIncome, totalExpense, netProfit, cashBalance,
      paymentsByMethod
    };
  }, [data, selectedMonth, selectedYear]);

  const periodLabel = selectedMonth === 'All'
    ? `Full Year ${selectedYear}`
    : `${selectedMonth} ${selectedYear}`;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const [jspdfMod, html2canvasMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const jsPDF = jspdfMod.default || jspdfMod.jsPDF || jspdfMod;
      const html2canvas = html2canvasMod.default || html2canvasMod;

      const element = reportRef.current;
      if (!element) return;

      document.body.classList.add('is-downloading');
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
      });

      document.body.classList.remove('is-downloading');

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const filename = `Financial_Report_${selectedMonth === 'All' ? selectedYear : `${selectedMonth}_${selectedYear}`}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      document.body.classList.remove('is-downloading');
      alert('Could not generate PDF. Please try again.\n' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportExcel = () => {
    const rows = [
      ['Financial Report & Analytics'],
      ['Period', periodLabel],
      ['Generated', new Date().toLocaleString()],
      ['Currency', 'LKR'],
      [],
      ['Summary'],
      ['Total Revenue', stats.totalIncome],
      ['Total Outgoings', stats.totalExpense],
      ['Rental Revenue', stats.totalRentalRevenue],
      ['Payments Received', stats.totalPayments],
      ['Cash Balance', stats.cashBalance],
      ['Net Profit / Loss', stats.netProfit],
      [],
      ['Income & Expense Breakdown'],
      ['Category', 'Type', 'Amount (LKR)', '% of Revenue'],
      ['Rental Revenue', 'Income', stats.totalRentalRevenue, stats.totalIncome > 0 ? ((stats.totalRentalRevenue / stats.totalIncome) * 100).toFixed(1) + '%' : ''],
      ['Extra Income', 'Income', stats.totalExtraIncome, stats.totalIncome > 0 ? ((stats.totalExtraIncome / stats.totalIncome) * 100).toFixed(1) + '%' : ''],
      ['Payments Received', 'Info', stats.totalPayments, ''],
      ...Object.entries(stats.paymentsByMethod).filter(([_, amt]) => amt > 0).map(([m, amt]) => [
        `  -> ${m}`, 'Info', amt, stats.totalPayments > 0 ? ((amt / stats.totalPayments) * 100).toFixed(1) + '%' : ''
      ]),
      ['Staff Wages', 'Expense', -stats.totalSalary, stats.totalIncome > 0 ? ((stats.totalSalary / stats.totalIncome) * 100).toFixed(1) + '%' : ''],
      ['Leasing Payments', 'Expense', -stats.totalLeasing, stats.totalIncome > 0 ? ((stats.totalLeasing / stats.totalIncome) * 100).toFixed(1) + '%' : ''],
      ['Other Expenses', 'Expense', -stats.totalOtherExp, stats.totalIncome > 0 ? ((stats.totalOtherExp / stats.totalIncome) * 100).toFixed(1) + '%' : ''],
      ['Net Profit / Loss', '', stats.netProfit, stats.totalIncome > 0 ? ((stats.netProfit / stats.totalIncome) * 100).toFixed(1) + '%' : '']
    ];

    let csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${selectedMonth === 'All' ? selectedYear : `${selectedMonth}_${selectedYear}`}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="report-loading">
        <div className="spinner"></div>
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="report-container">
      {/* Dynamic Action Controls */}
      <div className="report-controls">
        <div className="control-group">
          <div className="select-wrapper">
            <Calendar size={18} />
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              <option value="All">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="select-wrapper">
            <Filter size={18} />
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="report-divider" />

        <div className="report-actions-group">
          <button className="utility-icon-btn" onClick={() => fetchAll(false)} title="Refresh Data" style={{ height: '44px' }}>
            <RefreshCw size={16} className={refreshing ? 'spinner' : ''} />
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{refreshing ? 'Reloading...' : 'Refresh'}</span>
          </button>

          <div className="report-export-group">
            <button className="download-btn-premium btn-excel btn-glow" onClick={handleExportExcel} disabled={downloading}>
              <FileText size={18} />
              <span>Export CSV</span>
            </button>
            <button className="download-btn-premium btn-pdf btn-glow" onClick={handleDownload} disabled={downloading}>
              <Download size={18} />
              <span>{downloading ? 'Preparing PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Document Sheet */}
      <div id="report-document" ref={reportRef}>
        {/* Document Corporate Header */}
        <div className="report-header">
          <div className="report-header-left">
            <img src={logoUrl} alt="Maggi Tools Logo" className="report-logo" />
            <div className="report-title">
              <h2>MAGGI TOOLS RENTALS</h2>
              <p>Industrial Machinery, Tools &amp; Logistics ERP</p>
            </div>
          </div>
          <div className="report-contact-info">
            <strong>Maggi Tools Rentals (Pvt) Ltd</strong><br />
            No. 458/A, Kandy Road, Kiribathgoda<br />
            accounts@maggitools.lk · +94 11 485 9632
          </div>
        </div>
        
        <div className="report-divider-line" />

        {/* Report Metadata Block */}
        <div className="report-meta-section">
          <h3 className="report-doc-title">Statement of Accounts</h3>
          <div className="report-meta-details">
            <div>Reporting Period: <strong>{periodLabel}</strong></div>
            <div>Generated: <strong>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</strong></div>
            <div>Currency: <strong>LKR</strong></div>
          </div>
        </div>

        {/* Premium High-Fidelity KPI Cards */}
        <div className="report-kpi-grid">
          <div className="kpi-card income" style={{ '--kpi-color': '#10B981' }}>
            <div className="kpi-icon-wrapper">
              <TrendingUp size={20} />
            </div>
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-value">LKR {stats.totalIncome.toLocaleString()}</div>
            <div className="kpi-sub">Rentals + Extra Income</div>
          </div>

          <div className="kpi-card expense" style={{ '--kpi-color': '#EF4444' }}>
            <div className="kpi-icon-wrapper">
              <TrendingDown size={20} />
            </div>
            <div className="kpi-label">Total Outgoings</div>
            <div className="kpi-value">LKR {stats.totalExpense.toLocaleString()}</div>
            <div className="kpi-sub">Wages, Leases &amp; Expenses</div>
          </div>

          <div className={`kpi-card profit ${stats.netProfit >= 0 ? '' : 'loss'}`} 
               style={{ '--kpi-color': stats.netProfit >= 0 ? '#10B981' : '#EF4444' }}>
            <div className="kpi-icon-wrapper">
              {stats.netProfit >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
            <div className="kpi-label">Net Profit / Loss</div>
            <div className="kpi-value">LKR {stats.netProfit.toLocaleString()}</div>
            <div className="kpi-sub">Accrued Profit Margin</div>
          </div>

          <div className="kpi-card cash" style={{ '--kpi-color': '#2563EB' }}>
            <div className="kpi-icon-wrapper">
              <Package size={20} />
            </div>
            <div className="kpi-label">Rental Revenue</div>
            <div className="kpi-value">LKR {stats.totalRentalRevenue.toLocaleString()}</div>
            <div className="kpi-sub">{stats.fHires.length + stats.fBookings.length} Active Work Entries</div>
          </div>

          <div className="kpi-card cash" style={{ '--kpi-color': '#8B5CF6' }}>
            <div className="kpi-icon-wrapper">
              <Coins size={20} />
            </div>
            <div className="kpi-label">Payments Received</div>
            <div className="kpi-value">LKR {stats.totalPayments.toLocaleString()}</div>
            <div className="kpi-sub">Total cash/cheque collected</div>
          </div>

          <div className="kpi-card cash" style={{ '--kpi-color': '#F59E0B' }}>
            <div className="kpi-icon-wrapper">
              <Wallet size={20} />
            </div>
            <div className="kpi-label">Cash Balance</div>
            <div className="kpi-value">LKR {stats.cashBalance.toLocaleString()}</div>
            <div className="kpi-sub">Actual Liquid Cash on Hand</div>
          </div>
        </div>

        {/* Detailed Financial Breakdown Table */}
        <div className="report-section">
          <div className="report-section-title">Income &amp; Expense Breakdown</div>
          <div className="report-section-table-wrapper">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Count</th>
                  <th>Amount (LKR)</th>
                  <th>% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="cat-badge cat-revenue">Rental Revenue</span></td>
                  <td>Income</td>
                  <td>{stats.fHires.length + stats.fBookings.length}</td>
                  <td className="amount-cell amount-pos">+ {stats.totalRentalRevenue.toLocaleString()}</td>
                  <td>{stats.totalIncome > 0 ? ((stats.totalRentalRevenue / stats.totalIncome) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
                <tr>
                  <td><span className="cat-badge cat-revenue">Extra Income</span></td>
                  <td>Income</td>
                  <td>{stats.fExtraIncome.length}</td>
                  <td className="amount-cell amount-pos">+ {stats.totalExtraIncome.toLocaleString()}</td>
                  <td>{stats.totalIncome > 0 ? ((stats.totalExtraIncome / stats.totalIncome) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
                <tr>
                  <td><span className="cat-badge cat-info">Payments Received</span></td>
                  <td>Info</td>
                  <td>{stats.fPayments.length}</td>
                  <td className="amount-cell amount-pos">+ {stats.totalPayments.toLocaleString()}</td>
                  <td>—</td>
                </tr>
                {Object.entries(stats.paymentsByMethod).map(([method, amount], idx) => (
                  amount > 0 ? (
                    <tr key={`pm-${idx}`} style={{ backgroundColor: 'var(--bg-main)', fontSize: '0.85rem' }}>
                      <td style={{ paddingLeft: '32px', color: 'var(--text-dim)' }}>↳ {method}</td>
                      <td style={{ color: 'var(--text-dim)' }}>Info</td>
                      <td style={{ color: 'var(--text-dim)' }}>—</td>
                      <td className="amount-cell amount-pos" style={{ opacity: 0.95 }}>+ {amount.toLocaleString()}</td>
                      <td style={{ color: 'var(--text-dim)' }}>{stats.totalPayments > 0 ? ((amount / stats.totalPayments) * 100).toFixed(1) + '%' : '—'}</td>
                    </tr>
                  ) : null
                ))}
                <tr>
                  <td><span className="cat-badge cat-expense">Staff Wages</span></td>
                  <td>Expense</td>
                  <td>{stats.fSalaries.length}</td>
                  <td className="amount-cell amount-neg">− {stats.totalSalary.toLocaleString()}</td>
                  <td>{stats.totalIncome > 0 ? ((stats.totalSalary / stats.totalIncome) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
                <tr>
                  <td><span className="cat-badge cat-expense">Leasing Payments</span></td>
                  <td>Expense</td>
                  <td>{data.tools.filter(t => t.hasLeasing).length} Units</td>
                  <td className="amount-cell amount-neg">− {stats.totalLeasing.toLocaleString()}</td>
                  <td>{stats.totalIncome > 0 ? ((stats.totalLeasing / stats.totalIncome) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
                <tr>
                  <td><span className="cat-badge cat-expense">Other Expenses</span></td>
                  <td>Expense</td>
                  <td>{stats.fExpenses.length}</td>
                  <td className="amount-cell amount-neg">− {stats.totalOtherExp.toLocaleString()}</td>
                  <td>{stats.totalIncome > 0 ? ((stats.totalOtherExp / stats.totalIncome) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
                <tr className="total-row">
                  <td colSpan={3}><strong>Net profit margin</strong></td>
                  <td className={`amount-cell ${stats.netProfit >= 0 ? 'amount-pos' : 'amount-neg'}`}>
                    <strong>LKR {stats.netProfit.toLocaleString()}</strong>
                  </td>
                  <td>{stats.totalIncome > 0 ? ((stats.netProfit / stats.totalIncome) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Split Recent Transactions Feed Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          {stats.fHires.length > 0 && (
            <div className="report-section" style={{ marginBottom: 0 }}>
              <div className="report-section-title">Recent Rental Entries</div>
              <div className="transactions-list">
                {stats.fHires.slice(0, 6).map((h, i) => (
                  <div key={i} className="txn-item">
                    <div className="txn-icon-wrapper" style={{ color: 'var(--accent)' }}>
                      <Package size={18} />
                    </div>
                    <div className="txn-info">
                      <p>{h.client || 'Customer'} — {h.tool || h.vehicle || 'Equipment'}</p>
                      <span>{h.city || 'Colombo'} · {h.date ? new Date(h.date).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="txn-amount amount-pos">
                      LKR {parseFloat(h.amount || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.fSalaries.length > 0 && (
            <div className="report-section" style={{ marginBottom: 0 }}>
              <div className="report-section-title">Staff Salary Payments</div>
              <div className="transactions-list">
                {stats.fSalaries.slice(0, 6).map((s, i) => (
                  <div key={i} className="txn-item">
                    <div className="txn-icon-wrapper" style={{ color: 'var(--danger)' }}>
                      <Wallet size={18} />
                    </div>
                    <div className="txn-info">
                      <p>{s.employee || 'Staff'} — {s.role || 'Wages'}</p>
                      <span>{s.month}</span>
                    </div>
                    <div className="txn-amount amount-neg">
                      LKR {parseFloat(s.netPay || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Corporate Confidential Footer */}
        <div className="report-footer">
          <span>{appSettings?.companyName || 'MAGGI TOOLS RENTALS'} Management System · CONFIDENTIAL</span>
          <span>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default FinancialReport;
