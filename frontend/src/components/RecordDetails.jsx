import React, { useState, useEffect } from 'react';
import { Download, ShieldCheck, User, Calendar, Package, MapPin, Phone, Mail, Printer, CheckCircle, Eye } from 'lucide-react';
import { generateInvoicePDF, generateQuotationPDF } from '../utils/billingGenerator';
import api, { bookingAPI } from '../services/api';
import logoUrl from '../logo.png';
import './RecordDetails.css';

const QuotationDocumentView = ({ data }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('settings');
        setSettings(res.data);
      } catch (e) {
        console.warn('Failed to load settings', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [data]);

  if (!data) return null;

  const activeLogo = logoUrl;
  const companyName = settings?.name || 'MAGGI TOOL RENTALS';
  const companyAddress = settings?.address || 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.';
  const companyEmail = settings?.email || 'info@raxwo.com';
  const companyPhones = settings?.phones || ['+94 775 085 815', '+94 723 627 888', '+94 766 779 603'];

  const formattedDate = data.date ? new Date(data.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '—';

  return (
    <div className="quotation-doc-container">
      <div className="doc-action-bar no-print">
        <button className="doc-action-btn primary" onClick={() => generateQuotationPDF(data)}>
          <Download size={16} /> Download PDF
        </button>
        <button className="doc-action-btn secondary" onClick={() => generateQuotationPDF(data, 'print')}>
          <Printer size={16} /> Print Document
        </button>
      </div>

      <div className="quotation-paper-sheet">
        <div className="paper-top-strip">
          <div className="strip-blue" />
          <div className="strip-orange" />
          <div className="strip-blue" />
        </div>

        <div className="paper-header">
          <div className="brand-box">
            <img src={activeLogo} alt="Company Logo" className="brand-logo" />
            <div className="brand-details">
              {/* Company name removed as it is now baked into the logo image */}
              <div className="company-contact-row">
                <MapPin size={12} /> <span>{companyAddress}</span>
              </div>
              <div className="company-contact-row">
                <Phone size={12} /> <span>{companyPhones.join(', ')}</span>
                <span className="dot-divider">•</span>
                <Mail size={12} /> <span>{companyEmail}</span>
              </div>
            </div>
          </div>
          
          <div className="doc-meta-badge">
            <div className="meta-label-top">ESTIMATED PROPOSAL</div>
            <div className="meta-title-large">QUOTATION</div>
            <div className="meta-info-grid">
              <div className="meta-info-cell">
                <span className="cell-lbl">QUOTE NO</span>
                <span className="cell-val highlight">{data.quotationNo || 'DRAFT'}</span>
              </div>
              <div className="meta-info-cell">
                <span className="cell-lbl">DATE</span>
                <span className="cell-val">{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divider-line" />

        <div className="client-info-block">
          <div className="info-box client-box">
            <h3 className="section-subtitle">QUOTATION FOR CLIENT</h3>
            <div className="client-name-bold">{data.clientName || 'PROSPECTIVE CUSTOMER'}</div>
            <p className="client-address-text">{data.clientAddress || 'No address provided'}</p>
          </div>
          
          <div className="info-box validity-box">
            <h3 className="section-subtitle">QUOTE PARAMETERS</h3>
            <table className="mini-meta-table">
              <tbody>
                <tr>
                  <td><strong>Validity Period:</strong></td>
                  <td>{data.validityDays || 30} Days</td>
                </tr>
                <tr>
                  <td><strong>Status:</strong></td>
                  <td>
                    <span className={`status-pill ${data.status?.toLowerCase() || 'draft'}`}>
                      {data.status || 'Draft'}
                    </span>
                  </td>
                </tr>
                {data.toolCategory && (
                  <tr>
                    <td><strong>Category:</strong></td>
                    <td>{data.toolCategory}</td>
                  </tr>
                )}
                {data.toolNo && (
                  <tr>
                    <td><strong>Tool ID:</strong></td>
                    <td>{data.toolNo}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="proposal-items-section">
          <h3 className="section-subtitle">LINE ITEMS & ESTIMATED SERVICE RATES</h3>
          
          <div className="responsive-table-wrapper">
            <table className="doc-items-table">
              <thead>
                <tr>
                  <th>Item / Tool Description</th>
                  <th className="num-col">Qty</th>
                  <th className="num-col">Duration</th>
                  <th className="num-col">Daily Rate</th>
                  <th className="num-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(data.items) && data.items.length > 0 ? (
                  data.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="item-desc-cell">
                        <div className="main-item-name">{it.model || 'Rental Tool'}</div>
                        {it.toolNumber && <span className="item-sub-id">Serial/ID: {it.toolNumber}</span>}
                      </td>
                      <td className="num-col bold-val">{it.quantity || 1}</td>
                      <td className="num-col">{it.days || 1} day(s)</td>
                      <td className="num-col">LKR {(it.dailyRate || 0).toLocaleString()}</td>
                      <td className="num-col bold-val">LKR {(it.lineTotal || 0).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="item-desc-cell">
                      <div className="main-item-name">{data.toolCategory || 'Rental Services'}</div>
                      {data.toolNo && <span className="item-sub-id">Preferred Tool: {data.toolNo}</span>}
                    </td>
                    <td className="num-col bold-val">1</td>
                    <td className="num-col">1 day(s)</td>
                    <td className="num-col">As per category</td>
                    <td className="num-col bold-val">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-items-list no-print">
            {Array.isArray(data.items) && data.items.length > 0 ? (
              data.items.map((it, idx) => (
                <div key={idx} className="mobile-item-card">
                  <div className="card-top-row">
                    <span className="item-card-title">{it.model || 'Rental Tool'}</span>
                    <span className="item-card-total">LKR {(it.lineTotal || 0).toLocaleString()}</span>
                  </div>
                  {it.toolNumber && <div className="item-card-sub">Serial/ID: {it.toolNumber}</div>}
                  <div className="card-details-grid">
                    <div className="card-det-cell">
                      <label>Qty</label>
                      <span>{it.quantity || 1}</span>
                    </div>
                    <div className="card-det-cell">
                      <label>Duration</label>
                      <span>{it.days || 1} day(s)</span>
                    </div>
                    <div className="card-det-cell">
                      <label>Daily Rate</label>
                      <span>LKR {(it.dailyRate || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="mobile-item-card">
                <div className="card-top-row">
                  <span className="item-card-title">{data.toolCategory || 'Rental Services'}</span>
                  <span className="item-card-total">—</span>
                </div>
                {data.toolNo && <div className="item-card-sub">Preferred Tool: {data.toolNo}</div>}
                <div className="card-details-grid">
                  <div className="card-det-cell">
                    <label>Qty</label>
                    <span>1</span>
                  </div>
                  <div className="card-det-cell">
                    <label>Duration</label>
                    <span>1 day(s)</span>
                  </div>
                  <div className="card-det-cell">
                    <label>Daily Rate</label>
                    <span>As per category</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="summary-section-block">
          <div className="spacer-col" />
          
          <div className="pricing-breakdown-box">
            <table className="pricing-table">
              <tbody>
                {Number(data.mandatoryCharge) > 0 && (
                  <tr>
                    <td>Base / Mandatory Charge:</td>
                    <td>LKR {Number(data.mandatoryCharge).toLocaleString()}</td>
                  </tr>
                )}
                {Number(data.transportCharge) > 0 && (
                  <tr>
                    <td>Transport & Mobilization:</td>
                    <td>LKR {Number(data.transportCharge).toLocaleString()}</td>
                  </tr>
                )}
                {Number(data.refundableDeposit) > 0 && (
                  <tr>
                    <td>Refundable Security Deposit:</td>
                    <td>LKR {Number(data.refundableDeposit).toLocaleString()}</td>
                  </tr>
                )}
                {Number(data.extraHourRate) > 0 && (
                  <tr>
                    <td>Extra Usage Rate (Hourly):</td>
                    <td>LKR {Number(data.extraHourRate).toLocaleString()}</td>
                  </tr>
                )}
                {Number(data.discount) > 0 && (
                  <tr className="discount-row">
                    <td>Discount Offered:</td>
                    <td>- LKR {Number(data.discount).toLocaleString()}</td>
                  </tr>
                )}
                <tr className="total-highlight-row">
                  <td>ESTIMATED TOTAL:</td>
                  <td>LKR {Number(data.estimatedTotal || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="terms-conditions-block">
          <h4 className="terms-title">TERMS & CONDITIONS</h4>
          <div className="terms-body">
            {data.termsAndConditions ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{data.termsAndConditions}</div>
            ) : (
              <ul>
                <li>Prices are estimated based on requested duration. Extended usage rates apply.</li>
                <li>Refundable deposit is returned in full upon safe and timely return of the tools.</li>
                <li>Transport charges cover delivery and collection under standard operating conditions.</li>
              </ul>
            )}
          </div>
        </div>

        <div className="signature-area">
          <div className="sig-block">
            <div className="sig-line" />
            <label>PREPARED BY</label>
          </div>
          <div className="sig-block">
            <div className="sig-line" />
            <label>ACCEPTED BY CLIENT</label>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordDetails = ({ data, type }) => {
  const [history, setHistory] = React.useState([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  React.useEffect(() => {
    if (type === 'client' && data?.name) {
      loadClientHistory();
    }
  }, [data, type]);

  const loadClientHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await bookingAPI.get();
      const clientName = (data.name || '').toLowerCase();
      const rentals = (response.data || []).filter(b => (b.clientName || '').toLowerCase() === clientName);
      setHistory(rentals);
    } catch (err) {
      console.error('History load failed', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!data) return null;

  const formatDate = (val) => {
    if (val === true) return 'Yes / Active';
    if (val === false) return 'No / Inactive';
    if (val === 0) return '0';
    if (val === null || val === undefined || val === '') return '—';
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'string') {
      if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
      }
    }
    return val;
  };

  const DetailSection = ({ title, fields }) => (
    <div className="detail-section">
      <h4 className="detail-section-title">
        {title}
      </h4>
      <div className="detail-grid">
        {fields.map((f, i) => (
          <div key={i} className={`detail-field ${(f.isImage || f.fullWidth) ? 'full-width' : ''}`}>
            <label>{f.label}</label>
            <div className="detail-value">
              {(() => {
                if (f.value !== undefined) return f.value;
                const val = (data[f.key] !== undefined && data[f.key] !== null && data[f.key] !== '') ? data[f.key] :
                  (data.rawData && data.rawData[f.key] !== undefined && data.rawData[f.key] !== null) ? data.rawData[f.key] :
                    data[f.key === 'tool' ? 'toolNo' : f.key === 'toolNo' ? 'tool' : f.key === 'tool' ? 'vehicle' : ''];

                if (val === undefined || val === null || val === '') return '—';

                if (f.isImage) {
                  return (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={val}
                        alt={f.label}
                        style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => window.open(val, '_blank')}
                      />
                    </div>
                  );
                }

                const isCurrency = (f.key.toLowerCase().includes('salary') || f.key.toLowerCase().includes('premium') || f.key.toLowerCase().includes('rate') || f.key.toLowerCase().includes('amount') || f.key.toLowerCase().includes('fee') || f.key.toLowerCase().includes('earnings') || f.key.toLowerCase().includes('allowance') || f.key.toLowerCase().includes('pay') || f.key.toLowerCase().includes('incentive') || f.key.toLowerCase().includes('advance') || f.key.toLowerCase().includes('total') || f.key.toLowerCase().includes('cost') || f.key.toLowerCase().includes('balance')) &&
                  !f.key.toLowerCase().includes('days') &&
                  !f.key.toLowerCase().includes('count') &&
                  !f.key.toLowerCase().includes('limit');

                if (isCurrency && !isNaN(val) && val !== '') return `LKR ${Number(val).toLocaleString()}`;

                if (val && typeof val === 'object' && !Array.isArray(val)) {
                  return val.number || val.name || JSON.stringify(val);
                }

                return formatDate(val);
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const hireFields = [
    {
      title: 'Basic Information', fields: [
        { label: 'Date', key: 'date' },
        { label: 'Bill Number', key: 'billNumber' },
        { label: 'Time Sheet No', key: 'timeSheetNumber' },
        { label: 'Client / Company', key: 'client' },
        { label: 'Customer NIC', key: 'nic' },
        { label: 'Tool ID / Serial', key: 'tool' },
        { label: 'Service Address', key: 'address' },
        { label: 'City', key: 'city' }
      ]
    },
    {
      title: 'Time Tracking', fields: [
        { label: 'Start Time', key: 'startTime' },
        { label: 'End Time', key: 'endTime' },
        { label: 'Working Hours', key: 'workingHours' }
      ]
    },
    {
      title: 'Financial Breakdown', fields: [
        { label: 'One Hour Fee', key: 'oneHourFee' },
        { label: 'Transport Fee', key: 'transportFee' },
        { label: 'Total Amount', key: 'totalAmount_disp' }
      ]
    },
    {
      title: 'Additional Details', fields: [
        { label: 'Notes', key: 'details' },
        { label: 'Status', key: 'status_text' }
      ]
    }
  ];

  const paymentFields = [
    {
      title: 'Job Information', fields: [
        { label: 'Date', key: 'date' },
        { label: 'Customer', key: 'client' },
        { label: 'Tool ID', key: 'tool' },
        { label: 'City', key: 'city' },
        { label: 'Address', key: 'address' },
      ]
    },
    {
      title: 'Rental Details', fields: [
        { label: 'Rental Duration (Days)', key: 'days' },
      ]
    },
    {
      title: 'Financial Breakdown', fields: [
        { label: 'Hire Amount', key: 'hireAmount' },
        { label: 'Payment Received', key: 'dayPayment' },
        { label: 'Taken Amount', key: 'takenAmount' },
        { label: 'Balance', key: 'balance' },
        { label: 'Status', key: 'status_text' },
      ]
    },
  ];

  const invoiceFields = [
    {
      title: 'Billing Details', fields: [
        { label: 'Invoice Number', key: 'invoiceNo' },
        { label: 'Date', key: 'date' },
        { label: 'Client', key: 'clientName' }
      ]
    },
    {
      title: 'Tools / Items in this Invoice', fields: [
        ...(data?.items?.length > 0 ? data.items.map((it, idx) => ({
          label: `Item ${idx + 1}`,
          key: `item_${idx}`,
          value: `${it.toolNumber} - ${it.model || it.category} (${it.totalUnits} ${it.unitType || 'Days'} @ LKR ${Number(it.dailyRate).toLocaleString()})`
        })) : [
          { label: 'Tool ID', key: 'toolNo' }
        ])
      ]
    },
    {
      title: 'Job Information', fields: [
        { label: 'Description', key: 'jobDescription' }
      ]
    },
    {
      title: 'Pricing Breakdown', fields: [
        { label: 'Transport Charge', key: 'transportCharge' },
        { label: 'Other Charges', key: 'otherCharges' },
        { label: 'Discount', key: 'discount' },
        { label: 'Grand Total', key: 'totalAmount' },
        { label: 'Advance Payment', key: 'advancePayment' },
        { label: 'Balance Due', key: 'balanceAmount' },
        { label: 'Status', key: 'status' }
      ]
    },
    ...(data?.accessories?.length > 0 ? [{
      title: 'Parts & Accessories',
      fields: data.accessories.map((a, i) => ({
        label: `${a.number ? `[${a.number}] ` : ''}${a.name} (x${a.quantity})`,
        key: `acc_${i}`,
        value: `LKR ${(a.price * a.quantity).toLocaleString()}`
      }))
    }] : [])
  ];

  const quotationFields = [
    {
      title: 'Quotation Basics', fields: [
        { label: 'Quote Number', key: 'quotationNo' },
        { label: 'Date', key: 'date' },
        { label: 'Client Name', key: 'clientName' },
        { label: 'Validity', key: 'validityDays' }
      ]
    },
    {
      title: 'Tool Specifications', fields: [
        { label: 'Tool Category', key: 'toolCategory' },
        { label: 'Tool ID', key: 'toolNo' },
        { label: 'Refundable Deposit', key: 'refundableDeposit' }
      ]
    },
    {
      title: 'Pricing Offer', fields: [
        { label: 'Min Charge', key: 'mandatoryCharge' },
        { label: 'Transport', key: 'transportCharge' },
        { label: 'Extra Rate', key: 'extraHourRate' },
        { label: 'Estimated Total', key: 'estimatedTotal' },
        { label: 'Status', key: 'status' }
      ]
    },
    {
      title: 'Terms & Conditions', fields: [
        { label: 'Terms', key: 'termsAndConditions' }
      ]
    }
  ];


  const salaryFields = [
    {
      title: 'Employee Information', fields: [
        { label: 'Pay Month', key: 'month' },
        { label: 'Employee Name', key: 'employee' },
        { label: 'Jobs Done', key: 'jobsCount' },
        { label: 'Working Days', key: 'workingDays' },
        { label: 'Total Hours', key: 'totalHours' }
      ]
    },
    {
      title: 'Earnings Breakdown', fields: [
        { label: 'Basic Salary', key: 'basic' },
        { label: 'Hourly Earnings', key: 'hourlyEarnings' },
        { label: 'Daily Allowance', key: 'dailyAllowance' },
        { label: 'Attendance Bonus', key: 'attendanceBonus' },
        { label: 'Attendance Penalty', key: 'attendancePenalty' },
        { label: 'Incentives (Manual)', key: 'incentive' },
        { label: 'Advance Deductions', key: 'advance' },
        { label: 'Final Net Payable', key: 'netPay' }
      ]
    }
  ];

  const employeeFields = [
    {
      title: 'Personal Information', fields: [
        { label: 'Full Name', key: 'name' },
        { label: 'NIC Number', key: 'nic' },
        { label: 'Contact Number', key: 'contact' },
        { label: 'Role', key: 'role' },
        { label: 'Status', key: 'status' }
      ]
    },
    {
      title: 'Employment Details', fields: [
        { label: 'Joined Date', key: 'joinedDate' },
        { label: 'Basic Salary (Monthly)', key: 'basicSalary' },
        { label: 'Hourly Rate', key: 'hourlyRate' }
      ]
    },
    {
      title: 'System Access', fields: [
        { label: 'Username', key: 'username' }
      ]
    }
  ];

  const clientFields = [
    {
      title: 'Customer Information', fields: [
        { label: 'Customer Name', key: 'name' },
        { label: 'NIC Number', key: 'nic' },
        { label: 'Contact Number', key: 'contact' },
        { label: 'Email', key: 'email' },
        { label: 'Address', key: 'address' }
      ]
    },
    {
      title: 'Identity Verification', fields: [
        { label: 'ID Front Side', key: 'customerIdFront', isImage: true },
        { label: 'ID Back Side', key: 'customerIdBack', isImage: true }
      ]
    },
    {
      title: 'Financial Summary', fields: [
        { label: 'Total Rentals', key: 'totalHires' },
        { label: 'Outstanding Balance', key: 'outstanding' },
        { label: 'Status', key: 'status' }
      ]
    }
  ];

  const toolFields = [
    {
      title: 'Tool Information', fields: [
        { label: 'Tool ID / Serial', key: 'number' },
        { label: 'Category', key: 'category' },
        { label: 'Model / Brand', key: 'model' },
        { label: 'Power Source', key: 'powerSource' },
        { label: 'Quantity', key: 'stock' },
        { label: 'Daily Rate', key: 'dailyRate' },
      ]
    },
    {
      title: 'Leasing & Finance', fields: [
        { label: 'Leasing Status', key: 'hasLeasing' },
        { label: 'Leasing Company', key: 'leasingCompany' },
        { label: 'Monthly Premium', key: 'monthlyPremium' },
        { label: 'Payment Due Day', key: 'leaseDueDate' },
        { label: 'Final Payment Date', key: 'leaseFinalDate' }
      ]
    },
    {
      title: 'Maintenance & Service', fields: [
        { label: 'Warranty Expiration', key: 'warrantyExpirationDate' },
        { label: 'Next Service Date', key: 'nextServiceDate' },
        { label: 'Last Service Date', key: 'lastServiceDate' }
      ]
    },
    {
      title: 'Status', fields: [
        { label: 'Current Status', key: 'status' }
      ]
    }
  ];

  const extraIncomeFields = [

    {
      title: 'Income Details', fields: [
        { label: 'Date', key: 'date' },
        { label: 'Description', key: 'description' },
        { label: 'Category', key: 'category' },
        { label: 'Amount', key: 'amount' },
        { label: 'Notes', key: 'note' }
      ]
    }
  ];

  const expenseFields = [
    {
      title: 'Expense Details', fields: [
        { label: 'Date', key: 'date' },
        { label: 'Description', key: 'description' },
        { label: 'Category', key: 'category' },
        { label: 'Amount', key: 'amount' },
        { label: 'Notes', key: 'note' }
      ]
    }
  ];

  const bookingFields = [
    {
      title: 'Customer Information', fields: [
        { label: 'Customer Name', key: 'clientName' },
        { label: 'Phone', key: 'clientPhone' },
        { label: 'NIC / Passport', key: 'clientNic' },
        { label: 'ID Front Side', key: 'customerIdFront', isImage: true },
        { label: 'ID Back Side', key: 'customerIdBack', isImage: true }
      ]
    },
    {
      title: 'Tools in this Booking', fields: [
        ...(data?.items?.length > 0 ? data.items.map((it, idx) => {
          const expRet = it.expectedReturnDate ? new Date(it.expectedReturnDate) : new Date(data.returnDate || data.pickupDate);
          expRet.setHours(0,0,0,0);
          const today = new Date();
          today.setHours(0,0,0,0);
          const diff = Math.ceil((expRet - today) / (1000 * 60 * 60 * 24));
          
          let statusBadge;
          if ((it.returnedQuantity || 0) >= (it.quantity || 1)) {
            if (data.balanceAmount > 0) {
              statusBadge = <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>✓ RETURNED (UNPAID)</span>;
            } else {
              statusBadge = <span style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>✓ RETURNED</span>;
            }
          } else if (diff > 0) {
            statusBadge = <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>{diff} DAYS LEFT</span>;
          } else if (diff === 0) {
            statusBadge = <span style={{ background: 'var(--warning-soft, #fef3c7)', color: 'var(--warning, #d97706)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>DUE TODAY</span>;
          } else {
            statusBadge = <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>🚨 {Math.abs(diff)} DAYS OVERDUE</span>;
          }

          return {
            label: `Tool ${idx + 1}`,
            fullWidth: true,
            value: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-side)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{it.toolNumber} - {it.model}</div>
                  {statusBadge}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Rate / Day</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>LKR {Number(it.dailyRate).toLocaleString()}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Duration</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{it.rentalDays || data.totalDays} Days</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Total Qty</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{it.quantity || 1}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Returned Qty</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{it.returnedQuantity || 0}</span></div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Expected Return:</strong> <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{expRet.toLocaleDateString()}</span></div>
                  {it.overdueDays > 0 && <div style={{ color: 'var(--danger)', fontWeight: 700 }}>+ LKR {(it.totalOverdueCharge || 0).toLocaleString()} Late Fee</div>}
                </div>
              </div>
            )
          };
        }) : [
          { label: 'Tool ID / Serial', key: 'tool' }
        ])
      ]
    },
    ...(data?.accessories?.length > 0 ? [{
      title: 'Parts & Accessories',
      fields: data.accessories.map((a, i) => {
        const expRet = a.expectedReturnDate ? new Date(a.expectedReturnDate) : new Date(data.returnDate || data.pickupDate);
        expRet.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diff = Math.ceil((expRet - today) / (1000 * 60 * 60 * 24));
        
        let statusBadge;
        if ((a.returnedQuantity || 0) >= (a.quantity || 1)) {
          if (data.balanceAmount > 0) {
            statusBadge = <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>✓ RETURNED (UNPAID)</span>;
          } else {
            statusBadge = <span style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>✓ RETURNED</span>;
          }
        } else if (diff > 0) {
          statusBadge = <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>{diff} DAYS LEFT</span>;
        } else if (diff === 0) {
          statusBadge = <span style={{ background: 'var(--warning-soft, #fef3c7)', color: 'var(--warning, #d97706)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>DUE TODAY</span>;
        } else {
          statusBadge = <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>🚨 {Math.abs(diff)} DAYS OVERDUE</span>;
        }

        return {
          label: `Acc ${i + 1}`,
          fullWidth: true,
          value: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-side)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{a.number ? `[${a.number}] ` : ''}{a.name}</div>
                {statusBadge}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Rate / Day</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>LKR {Number(a.price).toLocaleString()}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Duration</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.rentalDays || data.totalDays} Days</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Total Qty</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.quantity || 1}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Returned Qty</span><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.returnedQuantity || 0}</span></div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div><strong style={{ color: 'var(--text-muted)' }}>Expected Return:</strong> <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{expRet.toLocaleDateString()}</span></div>
                {a.overdueDays > 0 && <div style={{ color: 'var(--danger)', fontWeight: 700 }}>+ LKR {(a.totalOverdueCharge || 0).toLocaleString()} Late Fee</div>}
              </div>
            </div>
          )
        };
      })
    }] : []),
    {
      title: 'Schedule Information', fields: [
        { label: 'Pickup Date', key: 'pickupDate' },
        { label: 'Return Date', key: 'returnDate' },
        { label: 'Total Days', key: 'totalDays' }
      ]
    },
    {
      title: 'Financial Summary', fields: [
        { label: 'Base Amount', key: 'baseAmount' },
        { label: 'Discount', key: 'discount' },
        { label: 'Extra Charges', key: 'extraCharges' },
        { label: 'Total Overdue Days', key: 'totalOverdueDays' },
        { label: 'Total Overdue Charges', key: 'totalOverdueCharges' },
        { label: 'Total Amount', key: 'totalAmount' },
        { label: 'Advance Payment', key: 'advancePayment' },
        { label: 'Balance Due', key: 'balanceAmount' }
      ]
    },
    {
      title: 'Additional Info', fields: [
        { label: 'Rental Type', key: 'bookingType' },
        { label: 'Notes', key: 'notes' },
        { label: 'Status', key: 'status' }
      ]
    }
  ];

  const sectionsMap = {
    'hire': hireFields,
    'booking': bookingFields,
    'payment': paymentFields,
    'invoice': invoiceFields,
    'quotation': quotationFields,
    'salary': salaryFields,
    'employee': employeeFields,
    'client': clientFields,
    'tool': toolFields,
    'extraIncome': extraIncomeFields,
    'expense': expenseFields
  };

  const sections = sectionsMap[type] || [];

  if (type === 'quotation') {
    return <QuotationDocumentView data={data} />;
  }

  return (
    <div className="details-overlay">
      {(type === 'invoice' || type === 'quotation') && (
        <div className="detail-actions-header">
          <button
            className="download-pdf-btn"
            onClick={() => type === 'invoice' ? generateInvoicePDF(data) : generateQuotationPDF(data)}
          >
            <Download size={18} /> <span>Download Professional PDF</span>
          </button>
        </div>
      )}
      {sections.map((s, i) => <DetailSection key={i} title={s.title} fields={s.fields} />)}

      {/* Client Rental History */}
      {type === 'client' && (
        <div className="detail-section" style={{ marginTop: '20px' }}>
          <h4 className="detail-section-title">Rental History</h4>
          {loadingHistory ? (
            <p>Loading history...</p>
          ) : history.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Tool</th>
                    <th style={{ padding: '8px' }}>Total</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px' }}>{new Date(h.pickupDate).toLocaleDateString()}</td>
                      <td style={{ padding: '8px' }}>{h.tool?.number || 'Tool'}</td>
                      <td style={{ padding: '8px' }}>LKR {(h.totalAmount || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`status-badge status-${h.status?.toLowerCase() || 'confirmed'}`} style={{ fontSize: '0.7rem' }}>
                          {h.status || 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No rental history found for this client.</p>
          )}
        </div>
      )}

      {/* Helper Shift Breakdown */}
      {type === 'salary' && (data.role === 'Helper' || data.rawData?.role === 'Helper') && (data.shifts || data.rawData?.shifts) && (
        <div className="detail-section" style={{ marginTop: '20px' }}>
          <h4 className="detail-section-title">Staff Shift Breakdown</h4>
          <div style={{ overflowX: 'auto', marginTop: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Shift</th>
                  <th style={{ padding: '8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.shifts || data.rawData?.shifts).map((s, idx) => {
                  if (!s) return null;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px' }}>{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: s.shift === 'Morning' ? '#DBEAFE' : '#FEF3C7',
                          color: s.shift === 'Morning' ? '#1E40AF' : '#92400E'
                        }}>
                          {s.shift || 'Shift'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: '600' }}>LKR {(s.amount || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>Total Shift Earnings:</td>
                  <td style={{ padding: '8px' }}>LKR {(data.shifts || data.rawData?.shifts).reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {/* Audit Trail */}
      <div className="detail-section" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border)' }}>
        <h4 className="detail-section-title" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Audit Trail</h4>
        <div style={{ display: 'flex', gap: '20px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <div>
            <strong>Last Updated By:</strong> {data.updatedByName || data.operatorName || 'System'}
          </div>
          <div>
            <strong>Updated At:</strong> {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : new Date(data.createdAt || Date.now()).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordDetails;
