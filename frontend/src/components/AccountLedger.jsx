import React, { useState, useEffect, useMemo } from 'react';
import { paymentAPI, expenseAPI, salaryAPI, extraIncomeAPI, accountAPI } from '../services/api';
import DataTable from './DataTable';
import { ArrowLeft, Download, Filter, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';

const AccountLedger = ({ account, onBack }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Default to start of year
    end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] // Default to end of year
  });

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [payRes, expRes, incRes] = await Promise.all([
          paymentAPI.get(),
          expenseAPI.get(),
          extraIncomeAPI.get()
        ]);

        const accId = account._id.toString();
        console.log('DEBUG: Fetching ledger for account:', accId);
        
        const pays = (payRes.data || [])
          .filter(p => {
            const pAccId = p.accountId?.toString() || p.accountId;
            return pAccId === accId && (parseFloat(p.takenAmount) > 0 || parseFloat(p.paidAmount) > 0);
          })
          .map(p => ({
            date: p.date,
            description: `Payment: ${p.client} (${p.tool || 'Tool'})`,
            type: 'Credit',
            amount: parseFloat(p.takenAmount || p.paidAmount || 0),
            reference: p.bookingId || p.hireId
          }));

        const exps = (expRes.data || [])
          .filter(e => {
            const eAccId = e.accountId?.toString() || e.accountId;
            return eAccId === accId;
          })
          .map(e => ({
            date: e.date,
            description: `Expense: ${e.description} (${e.category || 'General'})`,
            type: 'Debit',
            amount: parseFloat(e.amount || 0),
            reference: e._id
          }));

        const incs = (incRes.data || [])
          .filter(i => {
            const iAccId = i.accountId?.toString() || i.accountId;
            return iAccId === accId;
          })
          .map(i => ({
            date: i.date,
            description: `Extra Income: ${i.description}`,
            type: 'Credit',
            amount: parseFloat(i.amount || 0),
            reference: i._id
          }));

        const all = [...pays, ...exps, ...incs].sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log(`DEBUG: Found ${all.length} total ledger entries`);
        setTransactions(all);
      } catch (err) { console.error('Ledger Error:', err); }
      setLoading(false);
    };

    if (account) fetchAllData();
  }, [account]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date).toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [transactions, dateRange]);

  const stats = useMemo(() => {
    const credit = filtered.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
    const debit = filtered.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
    return { credit, debit, net: credit - debit };
  }, [filtered]);

  const columns = ['DATE', 'DESCRIPTION', 'TYPE', 'AMOUNT'];
  const tableData = filtered.map((t, idx) => ({
    'DATE': new Date(t.date).toLocaleDateString(),
    'DESCRIPTION': t.description,
    'TYPE': <span className={`status-badge status-${t.type === 'Credit' ? 'confirmed' : 'cancelled'}`}>{t.type}</span>,
    'AMOUNT': <strong style={{ color: t.type === 'Credit' ? 'var(--success)' : 'var(--danger)' }}>
      {t.type === 'Credit' ? '+' : '-'} LKR {t.amount.toLocaleString()}
    </strong>
  }));

  const handleExport = () => {
    generateGenericReportPDF(`Ledger: ${account.accountName}`, columns, filtered.map(t => ({
      ...t,
      DATE: new Date(t.date).toLocaleDateString(),
      AMOUNT: `LKR ${t.amount.toLocaleString()}`
    })));
  };

  return (
    <div className="ledger-container">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="utility-icon-btn" onClick={onBack}><ArrowLeft /></button>
          <div>
            <p className="form-text-dim" style={{ margin: 0 }}>{account.bankName} - {account.accountNumber}</p>
            <h1>{account.accountName} Ledger</h1>
          </div>
        </div>
        <div className="filter-actions">
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="form-input" style={{ width: 'auto' }} />
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="form-input" style={{ width: 'auto' }} />
          <button className="add-btn" onClick={handleExport}><Download size={18} /> Export</button>
        </div>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>Total Credits</label>
          <h3 style={{ color: 'var(--success)' }}>LKR {stats.credit.toLocaleString()}</h3>
          <TrendingUp size={16} className="summary-icon" style={{ color: 'var(--success)' }} />
        </div>
        <div className="summary-item">
          <label>Total Debits</label>
          <h3 style={{ color: 'var(--danger)' }}>LKR {stats.debit.toLocaleString()}</h3>
          <TrendingDown size={16} className="summary-icon" style={{ color: 'var(--danger)' }} />
        </div>
        <div className="summary-item">
          <label>Period Net Change</label>
          <h3 style={{ color: stats.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>LKR {stats.net.toLocaleString()}</h3>
          <Wallet size={16} className="summary-icon" />
        </div>
      </div>

      <div className="compliance-card">
        <DataTable columns={columns} data={tableData} loading={loading} />
      </div>
    </div>
  );
};

export default AccountLedger;
