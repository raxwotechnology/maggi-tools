import React, { useState, useEffect } from 'react';
import { toolAPI, clientAPI, employeeAPI, hireAPI, accountAPI, accessoryAPI } from '../services/api';
import { Calendar, Package, MapPin, Hash, Info, User, Phone, Wallet, ShieldCheck, RefreshCw, TrendingUp, Plus, Trash2, FileText, PlusCircle } from 'lucide-react';
import Autocomplete from './Autocomplete';
import '../styles/books.css';
import '../styles/forms.css';

const defaultJob = (prevJob = {}) => ({
  tool:            prevJob.tool || '',
  toolType:        prevJob.toolType || '',
  isExternal:      prevJob.isExternal || false,
  externalCost:    prevJob.externalCost || 0,
  staffName:       prevJob.staffName || '',
  address:         prevJob.address || '',
  city:            prevJob.city || '',
  startTime:       '',
  endTime:         '',
  restTime:        0,
  workingHours:    0,
  oneHourFee:      prevJob.oneHourFee || 0,
  extraHours:      0,
  extraHourFee:    prevJob.extraHourFee || 0,
  transportFee:    0,
  billAmount:      0,
  timeSheetNumber: '',
  billNumber:      '',
  totalAmount:     0,
  details:         '',
  status:          'Pending',
  advancePayment:  0,
  paymentMethod:   'Cash',
  accountId:       ''
});

const HireForm = ({ onSubmit, onCancel, initialData }) => {
  const [tools, setTools]       = useState([]);
  const [clients, setClients]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [previousJobs, setPreviousJobs] = useState([]);

  // Common fields (Date and Client)
  const [commonData, setCommonData] = useState({
    date:            new Date().toISOString().split('T')[0],
    client:          '',
    nic:             '',
  });
  const [overdueInfo, setOverdueInfo] = useState(null);

  // Array of jobs
  const [jobs, setJobs] = useState([defaultJob()]);
  const [bookingAccessories, setBookingAccessories] = useState([]);
  const [allAccessories, setAllAccessories] = useState([]);
  const [accSearch, setAccSearch] = useState('');

  useEffect(() => {
    if (initialData) {
      setCommonData({
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        client: initialData.client || '',
        nic: initialData.nic || '',
      });
      const clientRecord = clients.find(c => c.name === initialData.client);
      if (clientRecord && clientRecord.outstanding > 0) {
        setOverdueInfo(clientRecord.outstanding);
      } else {
        setOverdueInfo(null);
      }
      setJobs([{
        ...defaultJob(),
        ...initialData,
        tool:    initialData.tool || initialData.vehicle || '',
        address: initialData.address || '',
        city:    initialData.city    || initialData.location || '',
      }]);
      if (initialData.accessories && Array.isArray(initialData.accessories)) {
        setBookingAccessories(initialData.accessories.map(a => ({
          accessoryId: a.accessory || a._id,
          name: a.name,
          quantity: a.quantity || 1,
          price: a.price || 0
        })));
      }
    }
  }, [initialData, clients]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [toolRes, cliRes, empRes, hireRes, accRes, stockAccRes] = await Promise.all([
          toolAPI.get(), clientAPI.get(), employeeAPI.get(), hireAPI.get(), accountAPI.get(), accessoryAPI.get()
        ]);
        setTools(Array.isArray(toolRes.data) ? toolRes.data : []);
        setClients(Array.isArray(cliRes.data)  ? cliRes.data  : []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data  : []);
        setPreviousJobs(Array.isArray(hireRes.data) ? hireRes.data : []);
        setAccounts(Array.isArray(accRes.data) ? accRes.data : []);
        setAllAccessories(Array.isArray(stockAccRes.data) ? stockAccRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const addAccessory = (accName) => {
    const acc = allAccessories.find(a => a.name === accName);
    if (!acc) return;
    const existing = bookingAccessories.find(a => a.accessoryId === acc._id);
    if (existing) {
      setBookingAccessories(bookingAccessories.map(a => a.accessoryId === acc._id ? { ...a, quantity: a.quantity + 1 } : a));
    } else {
      setBookingAccessories([...bookingAccessories, { accessoryId: acc._id, name: acc.name, quantity: 1, price: acc.price }]);
    }
    setAccSearch('');
  };

  const removeAccessory = (index) => {
    setBookingAccessories(bookingAccessories.filter((_, i) => i !== index));
  };

  const handleAccQtyChange = (index, qty) => {
    const newAccs = [...bookingAccessories];
    newAccs[index].quantity = Math.max(1, qty);
    setBookingAccessories(newAccs);
  };

  const handleCommonChange = (e) => {
    const { name, value } = e.target;
    setCommonData(prev => {
      const updated = { ...prev, [name]: value };

      if ((name === 'client' || name === 'nic') && value && !initialData) {
        const foundClient = clients.find(c => 
          name === 'client' ? c.name.toLowerCase() === value.toLowerCase() : (c.nic && c.nic.toLowerCase() === value.toLowerCase())
        );

        if (foundClient) {
          if (name === 'nic') updated.client = foundClient.name;
          if (name === 'client') updated.nic = foundClient.nic || '';
          
          if (foundClient.outstanding > 0) {
            setOverdueInfo(foundClient.outstanding);
          } else {
            setOverdueInfo(null);
          }

          const lastJob = previousJobs
            .filter(j => j.client === foundClient.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          if (lastJob) {
            setJobs(currentJobs => currentJobs.map((job, idx) => {
              if (idx === 0 || !job.city) {
                return {
                  ...job,
                  address: lastJob.address || '',
                  city: lastJob.city || '',
                  minimumHours: lastJob.minimumHours || 0,
                  oneHourFee: lastJob.oneHourFee || 0,
                  extraHourFee: lastJob.extraHourFee || 0,
                  tool: lastJob.tool || job.tool || lastJob.vehicle || '',
                  staffName: lastJob.staffName || job.staffName || lastJob.driverName || '',
                };
              }
              return job;
            }));
          }
        } else {
          setOverdueInfo(null);
        }
      }
      return updated;
    });
  };

  const handleJobChange = (index, e) => {
    const { name, value } = e.target;
    setJobs(prev => {
      const updatedJobs = [...prev];
      const job = { ...updatedJobs[index], [name]: value };

      if (name === 'tool' && value) {
         const fleetTool = tools.find(t => t.number === value);
         if (fleetTool) {
           job.toolType = fleetTool.category || '';
           job.isExternal = false;
         } else {
           job.isExternal = true;
         }

         const lastJob = previousJobs
          .filter(j => (j.tool === value || j.vehicle === value))
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (lastJob) {
          job.staffName = lastJob.staffName || lastJob.driverName || '';
          if (!fleetTool) job.toolType = lastJob.toolType || lastJob.vehicleType || '';
        }
      }

      if (name === 'isExternal') {
        job.isExternal = e.target.checked;
      }

      // Calculations
      if (['startTime', 'endTime', 'restTime'].includes(name)) {
        const start = name === 'startTime' ? value : job.startTime;
        const end   = name === 'endTime'   ? value : job.endTime;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let totalMins = (eh * 60 + em) - (sh * 60 + sm);
          if (totalMins < 0) totalMins += 1440; 
          job.workingHours = Math.max(0, +(totalMins / 60).toFixed(2));
        }
      }

      const wh = parseFloat(name === 'workingHours' ? value : job.workingHours) || 0;
      job.extraHours = 0; // No extra hours if no min duration
      const ohf = parseFloat(job.oneHourFee)    || 0;
      const tf  = parseFloat(job.transportFee)  || 0;
      job.billAmount = +(wh * ohf + tf).toFixed(2);
      job.externalCost = parseFloat(job.externalCost) || 0;
      job.totalAmount = job.billAmount;

      updatedJobs[index] = job;
      return updatedJobs;
    });
  };

  const addJob = () => {
    const lastJob = jobs[jobs.length - 1];
    setJobs([...jobs, defaultJob(lastJob)]);
  };

  const removeJob = (index) => {
    if (jobs.length > 1) {
      setJobs(jobs.filter((_, i) => i !== index));
    }
  };
  const duplicateJob = (index) => {
    const newJob = { ...jobs[index] };
    setJobs([...jobs, newJob]);
  };

  const staffList = employees.filter(emp => emp.status === 'Active');

  const totalAccessoriesAmount = bookingAccessories.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0);
  const totalBillAmount = jobs.reduce((sum, j) => sum + (parseFloat(j.totalAmount) || 0), 0) + totalAccessoriesAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const existingClient = clients.find(c => c.name.toLowerCase() === commonData.client.toLowerCase());
      if (!existingClient && commonData.client.trim() !== '') {
        await clientAPI.create({ name: commonData.client, nic: commonData.nic, status: 'Active' });
      }

      for (const job of jobs) {
        const existingTool = tools.find(t => t.number.toLowerCase() === job.tool.toLowerCase());
        if (!existingTool && job.tool.trim() !== '') {
          await toolAPI.create({ number: job.tool, status: 'Active' });
        }

        if (job.staffName && job.staffName.trim() !== '') {
           const existingStaff = employees.find(emp => emp.name.toLowerCase() === job.staffName.toLowerCase());
           if (!existingStaff) {
             await employeeAPI.create({ name: job.staffName, role: 'Staff', status: 'Active' });
           }
        }
      }
    } catch (err) {
      console.error('Error auto-creating records:', err);
    }

    const finalData = jobs.map(job => {
      const jData = {
        ...commonData,
        ...job,
        toolId: job.tool, 
        toolCategory: job.toolType,
        operatorName: job.staffName,
        accessories: bookingAccessories.map(a => ({
          accessory: a.accessoryId,
          name: a.name,
          quantity: a.quantity,
          price: a.price
        }))
      };
      if (!jData.accountId) delete jData.accountId;
      return jData;
    });
    
    if (initialData && initialData._id) {
      onSubmit(finalData[0]);
    } else {
      onSubmit(finalData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div className="hire-form-scroll">
        
        <div className="form-section common-fields form-bg-main form-border-light form-rounded-lg form-padding-md form-margin-bottom-md">
          <p className="form-section-title form-text-dark form-weight-bold">Rental Information</p>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Rental Date *</label>
              <input type="date" name="date" value={commonData.date} onChange={handleCommonChange} required />
            </div>
            <div className="form-group">
              <label>Customer NIC</label>
              <Autocomplete 
                name="nic" 
                value={commonData.nic} 
                onChange={handleCommonChange} 
                options={clients.filter(c => c.nic).map(c => c.nic)}
                placeholder="Type NIC"
              />
            </div>
            <div className="form-group">
              <label>Customer Name *</label>
              <Autocomplete 
                name="client" 
                value={commonData.client} 
                onChange={handleCommonChange} 
                options={clients.map(c => c.name)}
                placeholder="Type or select customer"
                required
              />
            </div>
          </div>
          {overdueInfo !== null && (
            <div className="form-info-banner overdue-alert" style={{ marginTop: '15px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#FCA5A5', borderRadius: '50%', padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <strong>Customer has an Overdue Balance!</strong>
                <p style={{ margin: 0, fontSize: '0.9em' }}>Outstanding Amount: LKR {overdueInfo.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="form-section form-bg-side form-border-light form-rounded-lg form-padding-md form-margin-bottom-md">
          <p className="form-section-title"><Package size={16} /> Parts & Accessories</p>
          <div className="accessory-selector" style={{ marginBottom: '16px' }}>
              <Autocomplete 
                name="accSearch"
                value={accSearch}
                onChange={e => {
                  const val = e.target.value;
                  setAccSearch(val);
                  if (allAccessories.some(a => a.name === val)) {
                    addAccessory(val);
                  }
                }}
                options={allAccessories.map(a => a.name)}
                placeholder="Type to search parts/accessories..."
                className="full-width-autocomplete"
              />
          </div>

          {allAccessories.length > 0 ? (
            <div className="quick-acc-grid" style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              marginBottom: '20px',
              maxHeight: '140px',
              overflowY: 'auto',
              padding: '12px',
              background: 'var(--bg-main)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <span style={{ width: '100%', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Add:</span>
              {allAccessories.map(a => (
                <button 
                  key={a._id}
                  type="button"
                  onClick={() => addAccessory(a.name)}
                  className="quick-add-badge"
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid var(--accent-glow)', 
                    background: 'var(--accent-soft)', 
                    color: 'var(--accent)', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    boxShadow: '0 2px 4px var(--accent-glow)'
                  }}
                >
                  <Plus size={14} strokeWidth={3} /> {a.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-parts-state" style={{ 
              textAlign: 'center', 
              padding: '24px', 
              background: 'var(--bg-main)', 
              borderRadius: '16px', 
              marginBottom: '20px', 
              border: '1px dashed var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Package size={32} style={{ opacity: 0.1, marginBottom: '4px' }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No parts or accessories available.</p>
            </div>
          )}

          {bookingAccessories.length > 0 && (
            <div className="selected-accessories-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bookingAccessories.map((acc, index) => (
                <div key={index} className="accessory-item-row" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div className="accessory-info" style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{acc.name}</strong>
                    <div className="accessory-price" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>LKR {acc.price.toLocaleString()} / unit</div>
                  </div>
                  <div className="accessory-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="qty-control" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-side)', padding: '4px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)' }}>QTY:</span>
                      <input
                        type="number"
                        value={acc.quantity}
                        onChange={e => handleAccQtyChange(index, Number(e.target.value))}
                        style={{ 
                          width: '45px', 
                          border: 'none', 
                          background: 'none', 
                          fontSize: '0.9rem', 
                          fontWeight: 800, 
                          color: 'var(--text-main)',
                          textAlign: 'center',
                          padding: 0
                        }}
                        min="1"
                      />
                    </div>
                    <div className="accessory-subtotal" style={{ minWidth: '100px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent)' }}>
                      LKR {(acc.price * acc.quantity).toLocaleString()}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeAccessory(index)} 
                      className="action-icon-btn btn-delete" 
                      title="Remove Accessory"
                      style={{ padding: '8px', width: '36px', height: '36px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="jobs-container">
          {jobs.map((job, index) => (
            <div key={index} className="form-section job-entry form-padding-md form-rounded-lg form-margin-bottom-sm form-relative form-bg-side" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="form-flex-between form-margin-bottom-sm form-dashed-border form-padding-bottom-sm">
                <p className="form-section-title" style={{ margin: 0 }}>RENTAL ITEM #{index + 1}</p>
                {!initialData && (
                  <div className="form-flex form-gap-sm">
                    <button type="button" className="action-icon-btn btn-details" onClick={() => duplicateJob(index)} title="Duplicate Entry" style={{ width: '32px', height: '32px' }}>
                      <PlusCircle size={16} />
                    </button>
                    {jobs.length > 1 && (
                      <button type="button" className="delete-btn form-btn-sm" onClick={() => removeJob(index)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group" style={{ flex: '1.2' }}>
                  <label>Tool ID / Serial *</label>
                  <div className="form-flex form-gap-sm form-align-center">
                    <div className="form-flex-1">
                      <Autocomplete 
                        name="tool" 
                        value={job.tool} 
                        onChange={(e) => handleJobChange(index, e)} 
                        options={tools.map(t => t.number)}
                        placeholder="Tool ID"
                        required
                      />
                    </div>
                    <label className="form-flex form-align-center form-gap-sm form-text-xs form-nowrap" style={{ cursor: 'pointer', marginBottom: 0, marginTop: '24px' }}>
                      <input 
                        type="checkbox" 
                        name="isExternal" 
                        checked={job.isExternal} 
                        onChange={(e) => handleJobChange(index, e)} 
                      />
                      Sub-rented
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Tool Category</label>
                  <select 
                    name="toolType" 
                    value={['Power Tools', 'Hand Tools', 'Heavy Machinery', 'Electrical Appliances', 'Gardening', 'Construction', ''].includes(job.toolType) ? job.toolType : (job.toolType ? 'Other' : '')} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        handleJobChange(index, { target: { name: 'toolType', value: '__OTHER__' } });
                      } else {
                        handleJobChange(index, { target: { name: 'toolType', value: val } });
                      }
                    }}
                  >
                    <option value="">Select Category</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Hand Tools">Hand Tools</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                    <option value="Electrical Appliances">Electrical Appliances</option>
                    <option value="Gardening">Gardening</option>
                    <option value="Construction">Construction</option>
                    <option value="Other">Other (Type below)</option>
                  </select>
                </div>

                {(job.toolType === '__OTHER__' || (job.toolType && !['Power Tools', 'Hand Tools', 'Heavy Machinery', 'Electrical Appliances', 'Gardening', 'Construction', ''].includes(job.toolType))) && (
                  <div className="form-group">
                    <label>Specify Category</label>
                    <input 
                      type="text" 
                      name="toolType"
                      value={job.toolType === '__OTHER__' ? '' : job.toolType} 
                      onChange={(e) => handleJobChange(index, e)}
                      placeholder="e.g. Electric Grill"
                      required
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="form-grid" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Assigned Staff</label>
                  <Autocomplete 
                    name="staffName" 
                    value={job.staffName} 
                    onChange={(e) => handleJobChange(index, e)} 
                    options={staffList.map(emp => emp.name)}
                    placeholder="Staff name"
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Delivery / Service Address</label>
                  <input type="text" name="address" value={job.address} onChange={(e) => handleJobChange(index, e)} placeholder="Address" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" value={job.city} onChange={(e) => handleJobChange(index, e)} placeholder="City" />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Bill Number</label>
                  <input type="text" name="billNumber" value={job.billNumber} onChange={(e) => handleJobChange(index, e)} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label>Reference No</label>
                  <input type="text" name="timeSheetNumber" value={job.timeSheetNumber} onChange={(e) => handleJobChange(index, e)} placeholder="Optional" />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" name="startTime" value={job.startTime} onChange={(e) => handleJobChange(index, e)} />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" name="endTime" value={job.endTime} onChange={(e) => handleJobChange(index, e)} />
                </div>
                <div className="form-group">
                  <label>Duration (Hrs)</label>
                  <input type="number" name="workingHours" value={job.workingHours} readOnly className="input-highlight-blue" />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Rate / Hour</label>
                  <input type="number" name="oneHourFee" value={job.oneHourFee} onChange={(e) => handleJobChange(index, e)} min="0" />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Transport Fee</label>
                  <input type="number" name="transportFee" value={job.transportFee} onChange={(e) => handleJobChange(index, e)} min="0" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={job.status} onChange={(e) => handleJobChange(index, e)}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Returned">Returned</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {job.isExternal && (
                <div className="form-group form-margin-top-sm form-bg-orange form-padding-md form-rounded-lg">
                  <label className="form-text-orange">Sub-rent Cost (Expense) *</label>
                  <input 
                    type="number" 
                    name="externalCost" 
                    value={job.externalCost === 0 ? '' : job.externalCost} 
                    onChange={(e) => handleJobChange(index, e)} 
                    placeholder="Amount paid to owner"
                    className="form-border-orange"
                    required={job.isExternal}
                  />
                  <small className="form-text-orange-dim">This will be recorded as an expense.</small>
                </div>
              )}

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label>Advance Payment</label>
                  <input type="number" name="advancePayment" value={job.advancePayment} onChange={(e) => handleJobChange(index, e)} min="0" />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select name="paymentMethod" value={job.paymentMethod} onChange={(e) => handleJobChange(index, e)}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {job.paymentMethod === 'Bank Transfer' && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Target Bank Account *</label>
                  <select name="accountId" value={job.accountId} onChange={(e) => handleJobChange(index, e)} required>
                    <option value="">Select Account</option>
                    {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.accountName} (LKR {acc.balance.toLocaleString()})</option>)}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Details / Remarks</label>
                <textarea name="details" value={job.details} onChange={(e) => handleJobChange(index, e)} rows="2" placeholder="Notes for this rental..." />
              </div>
              
              <div className="form-margin-top-sm form-text-right form-weight-bold form-text-blue">
                Subtotal: LKR {Number(job.totalAmount).toLocaleString()} | Balance: LKR {(Number(job.totalAmount) - Number(job.advancePayment || 0)).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {(!initialData || !initialData._id) && (
          <button type="button" className="add-btn-batch" onClick={addJob}>
            <Plus size={20} /> Add Another Tool to Batch
          </button>
        )}

      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>{jobs.length} Item(s) — NET TOTAL</span>
          <strong>LKR {totalBillAmount.toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">{initialData && initialData._id ? 'Update Rental' : 'Confirm & Save Rental'}</button>
        </div>
      </div>
    </form>
  );
};

export default HireForm;
