import React, { useState, useEffect } from 'react';
import { toolAPI, bookingAPI, employeeAPI, clientAPI, accessoryAPI, accountAPI } from '../services/api';
import { Calendar, Package, MapPin, Hash, Info, User, Phone, Wallet, ShieldCheck, RefreshCw, TrendingUp, Plus, Trash2, FileText } from 'lucide-react';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';
import { calculateBookingCosts } from '../utils/bookingCalculations';

const BookingForm = ({ onSubmit, onCancel, initialData }) => {
  const [availableTools, setAvailableTools] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allAccessories, setAllAccessories] = useState([]);
  const [toolSearch, setToolSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingTools, setLoadingTools] = useState(false);

  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [customerHistory, setCustomerHistory] = useState(null);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MONEY_FIELDS = ['discount', 'advancePayment', 'transportCharge', 'deposit'];

  const sanitizeMoneyFields = (data) => {
    const next = { ...data };
    MONEY_FIELDS.forEach((key) => {
      const v = next[key];
      if (v === 0 || v === '0' || v === null || v === undefined) {
        next[key] = '';
      }
    });
    return next;
  };

  const defaults = {
    clientNic: '',
    clientName: '',
    clientPhone: '',
    pickupLocation: 'Maggi Tools Weliweriya',
    returnLocation: '',
    conditionOnPickup: '',
    notes: '',
    status: 'Confirmed',
    bookingType: 'General',
    items: [], // [{ tool, toolNumber, model, category, dailyRate }]
    bookingAccessories: [], // { accessoryId, name, quantity, price }
    discount: '',
    advancePayment: '',
    transportCharge: '',
    deposit: '',
    paymentMethod: 'Cash',
    customerIdFront: '',
    customerIdBack: '',
    accountId: '',
    actualReturnDate: '',
    earlyReturnDays: '',
    extraCharges: ''
  };

  const [formData, setFormData] = useState(() =>
    sanitizeMoneyFields({ ...defaults, ...(initialData || {}) })
  );

  useEffect(() => {
    if (initialData) {
      const formattedData = { ...defaults, ...initialData };

      // Handle legacy single-tool bookings vs new multi-item bookings
      if (!formattedData.items || formattedData.items.length === 0) {
        if (formattedData.tool) {
          const tObj = typeof formattedData.tool === 'object' ? formattedData.tool : null;
          formattedData.items = [{
            tool: tObj ? tObj._id : formattedData.tool,
            toolNumber: tObj ? tObj.number : (formattedData.toolNo || '—'),
            model: tObj ? tObj.model : '',
            category: tObj ? tObj.category : '',
            dailyRate: formattedData.dailyRate || 0
          }];
        } else {
          formattedData.items = [];
        }
      }

      // Map database accessories to UI bookingAccessories
      if (formattedData.accessories && Array.isArray(formattedData.accessories)) {
        formattedData.bookingAccessories = formattedData.accessories.map(a => ({
          accessoryId: a.accessory || a._id,
          name: a.name,
          quantity: a.quantity || 1,
          price: a.price || 0
        }));
      }

      if (formattedData.pickupDate) formattedData.pickupDate = new Date(formattedData.pickupDate).toISOString().split('T')[0];
      if (formattedData.returnDate) formattedData.returnDate = new Date(formattedData.returnDate).toISOString().split('T')[0];

      if (formattedData.securityDeposit != null && formattedData.deposit === '') {
        formattedData.deposit = formattedData.securityDeposit;
      }
      formattedData.items = (formattedData.items || []).map((it) => ({
        ...it,
        quantity: it.quantity || 1
      }));
      
      if (formattedData.actualReturnDate) formattedData.actualReturnDate = new Date(formattedData.actualReturnDate).toISOString().split('T')[0];

      setFormData(sanitizeMoneyFields(formattedData));
    } else {
      setFormData({ ...defaults });
    }
  }, [initialData]);

  const [totalDays, setTotalDays] = useState(1);
  const [costs, setCosts] = useState({ baseAmount: 0, totalAmount: 0, balanceAmount: 0, toolsTotal: 0, accessoriesTotal: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, clientRes, accRes, accountRes] = await Promise.all([
          employeeAPI.get(), clientAPI.get(), accessoryAPI.get(), accountAPI.get()
        ]);
        setEmployees(empRes.data || []);
        setClients(clientRes.data || []);
        setAllAccessories(accRes.data || []);
        setAccounts(accountRes.data || []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.clientName) {
      const found = clients.find(c => c.name.toLowerCase() === formData.clientName.toLowerCase());
      setSelectedClient(found || null);
    } else {
      setSelectedClient(null);
    }
  }, [formData.clientName, clients]);

  useEffect(() => {
    const start = new Date(formData.pickupDate);
    const end = new Date(formData.returnDate);
    if (isNaN(start) || isNaN(end)) return;

    const diffTime = end - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setTotalDays(diffDays > 0 ? diffDays : 1);
  }, [formData.pickupDate, formData.returnDate]);

  useEffect(() => {
    const fetchAvailable = async () => {
      setLoadingTools(true);
      try {
        const allRes = await toolAPI.get();
        let tools = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.tools || []);

        const blocked = ['Maintenance', 'Repair', 'Maintaining', 'Under Repair', 'Unavailable'];
        tools = tools.filter(t => !blocked.includes(t.status));

        if (formData.pickupDate && formData.returnDate) {
          try {
            const availRes = await bookingAPI.getAvailableTools(formData.pickupDate, formData.returnDate);
            const avail = Array.isArray(availRes.data) ? availRes.data : [];
            if (avail.length > 0) {
              tools = avail;
            }
          } catch (availErr) {
            console.warn('Available-tools API failed, using full inventory:', availErr.message);
          }
        }

        if (tools.length === 0) {
          const local = localStorage.getItem('raxwo_tools');
          if (local) tools = JSON.parse(local);
        }

        if (initialData?.items?.length) {
          initialData.items.forEach((it) => {
            const id = typeof it.tool === 'object' ? it.tool?._id : it.tool;
            if (id && !tools.find(t => String(t._id) === String(id))) {
              tools = [{
                _id: id,
                number: it.toolNumber,
                model: it.model,
                category: it.category,
                dailyRate: it.dailyRate,
                stock: it.stock || 1,
                status: 'Available'
              }, ...tools];
            }
          });
        } else if (initialData?.tool) {
          const currentTool = typeof initialData.tool === 'object' ? initialData.tool : null;
          if (currentTool?._id && !tools.find(t => String(t._id) === String(currentTool._id))) {
            tools = [currentTool, ...tools];
          }
        }

        setAvailableTools(tools);
      } catch (err) {
        console.error('RAXWO: Tool fetch failed', err);
        const local = localStorage.getItem('raxwo_tools');
        if (local) setAvailableTools(JSON.parse(local));
      } finally {
        setLoadingTools(false);
      }
    };

    fetchAvailable();
  }, [formData.pickupDate, formData.returnDate, initialData]);

  const handleCheckCustomer = async () => {
    const nic = (formData.clientNic || '').trim();
    if (!nic) return alert('Please enter an ID / NIC to check.');
    
    setFetchingHistory(true);
    setIsNewCustomer(false);
    try {
      const res = await bookingAPI.getCustomerHistory(nic);
      if (res.data && res.data.details) {
        setCustomerHistory(res.data.history || []);
        setIsNewCustomer(false);
        setFormData(prev => ({
          ...prev,
          clientNic: res.data.details.nic || prev.clientNic,
          clientName: res.data.details.name || prev.clientName,
          clientPhone: res.data.details.phone || prev.clientPhone,
          customerIdFront: res.data.details.customerIdFront || prev.customerIdFront,
          customerIdBack: res.data.details.customerIdBack || prev.customerIdBack
        }));
      } else {
        setCustomerHistory([]);
        setIsNewCustomer(true);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setCustomerHistory([]);
        setIsNewCustomer(true);
        setFormData(prev => ({
          ...prev,
          clientNic: nic,
          clientName: '',
          clientPhone: ''
        }));
      } else {
        setCustomerHistory(null);
        setIsNewCustomer(false);
        alert('Error fetching customer data.');
      }
    } finally {
      setFetchingHistory(false);
    }
  };

  const emptyNum = (val) => {
    if (val === '' || val == null || val === undefined) return '';
    if (val === 0 || val === '0') return '';
    return val;
  };
  const onNumField = (field) => (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setFormData(prev => ({ ...prev, [field]: '' }));
      return;
    }
    const num = Number(raw);
    setFormData(prev => ({ ...prev, [field]: Number.isNaN(num) ? '' : num }));
  };

  const toolIdMatch = (a, b) => String(a) === String(b);

  const addToolById = (tool) => {
    if (!tool) return;
    setFormData(prev => {
      if (prev.items.some(item => toolIdMatch(item.tool, tool._id))) return prev;
      const newItem = {
        tool: tool._id,
        toolNumber: tool.number,
        model: tool.model,
        category: tool.category,
        dailyRate: tool.dailyRate || '',
        quantity: 1,
        stock: tool.stock || 1
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
  };

  useEffect(() => {
    const calc = calculateBookingCosts(formData, totalDays);
    setCosts({
      baseAmount: calc.baseAmount,
      totalAmount: calc.totalAmount,
      balanceAmount: calc.balanceAmount,
      toolsTotal: calc.toolsTotal,
      accessoriesTotal: calc.accessoriesTotal
    });
  }, [formData.items, formData.bookingAccessories, totalDays, formData.advancePayment, formData.discount, formData.transportCharge]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addTool = (toolNum) => {
    const tool = availableTools.find(t => t.number === toolNum);
    if (tool) addToolById(tool);
  };

  const buildItemFromTool = (tool, existing) => {
    if (existing) return existing;
    return {
      tool: tool._id,
      toolNumber: tool.number,
      model: tool.model,
      category: tool.category,
      dailyRate: tool.dailyRate || '',
      quantity: 1,
      stock: tool.stock || 1
    };
  };

  const handleToolSearchSelect = (val) => {
    if (!val || !val.startsWith('[TOOL]')) return;
    const match = val.match(/\[TOOL\] (.*?) -/);
    if (!match?.[1]) return;
    const found = availableTools.find((t) => t.number === match[1].trim());
    if (found) addToolById(found);
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const addAccessory = (accIdentifier) => {
    const acc = allAccessories.find(a => 
      a.name === accIdentifier || 
      a.number === accIdentifier || 
      `${a.number || 'No ID'} - ${a.name}` === accIdentifier
    );
    if (!acc) return;
    const existing = formData.bookingAccessories.find(a => a.accessoryId === acc._id);
    if (existing) {
      setFormData({
        ...formData,
        bookingAccessories: formData.bookingAccessories.map(a => a.accessoryId === acc._id ? { ...a, quantity: a.quantity + 1 } : a)
      });
    } else {
      setFormData({
        ...formData,
        bookingAccessories: [...formData.bookingAccessories, { accessoryId: acc._id, number: acc.number, name: acc.name, quantity: 1, price: acc.price, stock: acc.stock || 0 }]
      });
    }
    setAccSearch('');
  };

  const handleAccSearchSelect = (val) => {
    if (!val || !val.startsWith('[PART]')) return;
    const match = val.match(/\[PART\] (.*?) -/);
    if (match?.[1]) addAccessory(match[1].trim());
  };

  const removeAccessory = (index) => {
    setFormData({
      ...formData,
      bookingAccessories: formData.bookingAccessories.filter((_, i) => i !== index)
    });
  };

  const handleAccQtyChange = (index, qty) => {
    const newAccs = [...formData.bookingAccessories];
    newAccs[index].quantity = Math.max(1, qty);
    setFormData({ ...formData, bookingAccessories: newAccs });
  };

  const handleAccPriceChange = (index, price) => {
    const newAccs = [...formData.bookingAccessories];
    newAccs[index].price = price === '' ? '' : Math.max(0, Number(price));
    setFormData({ ...formData, bookingAccessories: newAccs });
  };

  const handleIdPhotoChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      if (!formData.pickupDate) {
        alert('Pickup Date is required.');
        return;
      }
      if (!formData.returnDate) {
        alert('Return Date is required.');
        return;
      }
      if (!formData.clientName || formData.clientName.trim() === '') {
        alert('Customer Name is required.');
        return;
      }
      if (formData.paymentMethod === 'Bank Transfer' && !formData.accountId) {
        alert('Target Bank Account is required for Bank Transfers.');
        return;
      }
      const hasTools = formData.items.length > 0;
      const hasAccessories = formData.bookingAccessories.length > 0;
      if (!hasTools && !hasAccessories) {
        alert('Please select at least one tool or accessory.');
        return;
      }

      const calc = calculateBookingCosts(formData, totalDays);

      const finalBooking = {
        ...formData,
        ...(formData.items[0]?.tool ? { tool: formData.items[0].tool } : {}),
        baseAmount: calc.baseAmount,
        totalAmount: calc.totalAmount,
        balanceAmount: calc.balanceAmount,
        totalDays,
        securityDeposit: Number(formData.deposit) || 0,
        extraCharges: Number(formData.extraCharges) || 0,
        accessories: formData.bookingAccessories.map(a => {
          const rDays = Number(a.rentalDays) || totalDays;
          const expRet = new Date(formData.pickupDate);
          expRet.setDate(expRet.getDate() + Math.max(0, rDays - 1));
          return {
            accessory: a.accessoryId,
            name: a.name,
            quantity: Number(a.quantity) || 1,
            price: Number(a.price) || 0,
            amountPaid: Number(a.amountPaid) || 0,
            amountDue: Math.max(0, ((Number(a.price) || 0) * (Number(a.quantity) || 1) * rDays) - (Number(a.amountPaid) || 0)),
            rentalDays: rDays,
            rentalDate: formData.pickupDate,
            expectedReturnDate: expRet.toISOString()
          };
        }),
        items: formData.items.map(it => {
          const rDays = Number(it.rentalDays) || totalDays;
          const expRet = new Date(formData.pickupDate);
          expRet.setDate(expRet.getDate() + Math.max(0, rDays - 1));
          return {
            tool: it.tool,
            toolNumber: it.toolNumber,
            model: it.model,
            category: it.category,
            dailyRate: Number(it.dailyRate) || 0,
            quantity: Number(it.quantity) || 1,
            amountPaid: Number(it.amountPaid) || 0,
            amountDue: Math.max(0, ((Number(it.dailyRate) || 0) * (Number(it.quantity) || 1) * rDays) - (Number(it.amountPaid) || 0)),
            rentalDays: rDays,
            rentalDate: formData.pickupDate,
            expectedReturnDate: expRet.toISOString()
          };
        })
      };
      delete finalBooking.deposit;
      delete finalBooking.bookingAccessories;

      if (!hasTools) {
        delete finalBooking.tool;
        finalBooking.items = [];
      }

      // Sanitize ObjectIds to prevent BSON casting errors
      if (!finalBooking.accountId) delete finalBooking.accountId;

      // Notify parent - parent will handle the API call
      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(finalBooking);
        } finally {
          setIsSubmitting(false);
        }
      }
    } catch (err) {
      console.error('Submission Preparation Error:', err);
      alert('Error preparing booking data.');
    }
  };

  return (
    <div className="booking-form-wrapper form-flex form-bg-side">
      <form onSubmit={handleSubmit} className="hire-form form-flex-1" noValidate>
        <div className="hire-form-scroll">

          <div className="form-section">
            <p className="form-section-title"><Calendar size={16} /> Rental Schedule</p>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Pickup Date *</label>
                <input
                  type="date"
                  required
                  value={formData.pickupDate || ''}
                  onChange={e => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Return Date *</label>
                <input
                  type="date"
                  required
                  value={formData.returnDate || ''}
                  onChange={e => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <p className="form-section-title"><User size={16} /> Customer Information</p>
            <div className="form-grid-3">
              <div className="form-group">
                <label>NIC / Passport Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Autocomplete
                      name="clientNic"
                      value={formData.clientNic}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setFormData(prev => ({ ...prev, clientNic: val }));
                        setCustomerHistory(null);
                        setIsNewCustomer(false);
                      }}
                      options={clients.map(c => c.nic).filter(Boolean)}
                      placeholder="Enter NIC..."
                      className={fetchingHistory ? 'lookup-loading' : ''}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckCustomer}
                    disabled={fetchingHistory}
                    className="add-btn"
                    style={{ height: '42px', padding: '0 14px', flexShrink: 0 }}
                  >
                    {fetchingHistory ? <RefreshCw size={16} className="spinner" /> : <ShieldCheck size={16} />}
                    Check
                  </button>
                </div>
                {customerHistory && customerHistory.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Overdue Balance:</span>
                    <span>LKR {customerHistory.reduce((s, b) => s + Math.max(0, b.balanceAmount || 0), 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Customer Name *</label>
                <Autocomplete
                  name="clientName"
                  value={formData.clientName}
                  required
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, clientName: val }));
                    const found = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
                    if (found) {
                      setFormData(prev => ({
                        ...prev,
                        clientPhone: found.contact || prev.clientPhone,
                        clientNic: found.nic || prev.clientNic,
                        customerIdFront: found.customerIdFront || prev.customerIdFront,
                        customerIdBack: found.customerIdBack || prev.customerIdBack
                      }));
                    }
                  }}
                  options={clients.map(c => c.name)}
                  placeholder="Type customer name to search..."
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <Autocomplete
                  name="clientPhone"
                  value={formData.clientPhone || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, clientPhone: val }));
                    const found = clients.find(c => c.contact === val);
                    if (found) {
                      setFormData(prev => ({
                        ...prev,
                        clientName: found.name || prev.clientName,
                        clientNic: found.nic || prev.clientNic,
                        customerIdFront: found.customerIdFront || prev.customerIdFront,
                        customerIdBack: found.customerIdBack || prev.customerIdBack
                      }));
                    }
                  }}
                  options={clients.map(c => c.contact).filter(Boolean)}
                  placeholder="07x xxxxxxx"
                />
              </div>
            </div>

            {isNewCustomer && (
              <div className="new-customer-banner">
                <strong>New customer</strong>
                <span>— complete name, phone, and ID photos below. Customer will be saved when you confirm the booking.</span>
              </div>
            )}

            <div className="form-grid-2" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Customer ID Front Side</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleIdPhotoChange(e, 'customerIdFront')}
                  style={{ border: 'none', padding: '8px 0' }}
                />
                {formData.customerIdFront && (
                  <div style={{ marginTop: '8px', position: 'relative' }}>
                    <img
                      src={formData.customerIdFront}
                      alt="ID Front Preview"
                      style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Customer ID Back Side</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleIdPhotoChange(e, 'customerIdBack')}
                  style={{ border: 'none', padding: '8px 0' }}
                />
                {formData.customerIdBack && (
                  <div style={{ marginTop: '8px', position: 'relative' }}>
                    <img
                      src={formData.customerIdBack}
                      alt="ID Back Preview"
                      style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ///////////////////////////////////////////////////////////////select */}
          <div className="form-section">
            <p className="form-section-title">
              <Package size={16} /> Selected Tools & Pricing
            </p>

            {loadingTools && <p className="tool-search-hint">Loading tools…</p>}
            {!loadingTools && availableTools.length === 0 && (
              <p className="tool-search-hint">No tools available. Add tools in Stock Inventory.</p>
            )}

            {!loadingTools && availableTools.length > 0 && (
              <div className="tool-selector tool-selector-wide" style={{ marginBottom: '16px' }}>
                <label className="tool-search-label">Select tools {formData.bookingAccessories.length === 0 ? '*' : '(optional)'}</label>
                <Autocomplete
                  name="toolSearch"
                  value={toolSearch}
                  multiSelect
                  onOptionSelect={handleToolSearchSelect}
                  onChange={(e) => setToolSearch(e.target.value)}
                  options={availableTools
                    .filter((t) => t?.number)
                    .map((t) => `[TOOL] ${t.number} - ${t.model || 'Tool'}`)}
                  placeholder="Search and select tools"
                  className="full-width-autocomplete booking-tool-search"
                  emptyMessage="No tools loaded"
                />
              </div>
            )}

            {!loadingTools && availableTools.length > 0 && (
              <div className="quick-acc-grid booking-tools-quick-add">
                {availableTools.map((t) => {
                  const added = formData.items.some((item) => toolIdMatch(item.tool, t._id));
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => addToolById(t)}
                      className={`quick-add-badge${added ? ' is-added' : ''}`}
                      disabled={added}
                    >
                      <Plus size={14} strokeWidth={3} /> {t.number}
                    </button>
                  );
                })}
              </div>
            )}

            {formData.items.map((item, index) => (
              <div key={index} className="tool-item-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tool Info</label>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-main)",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    {item.toolNumber} - {item.model}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Daily Rate</label>
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.dailyRate === 0 ? '' : item.dailyRate}
                    onChange={(e) =>
                      handleItemChange(index, "dailyRate", e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Quantity <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({item.stock || 1} available)</span></label>
                  <input
                    type="number"
                    min="1"
                    max={item.stock || 1}
                    value={item.quantity || 1}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", Number(e.target.value))
                    }
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Days"
                    value={item.rentalDays || totalDays}
                    onChange={(e) =>
                      handleItemChange(index, "rentalDays", Number(e.target.value))
                    }
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Subtotal</label>
                  <input
                    type="text"
                    value={`LKR ${((Number(item.dailyRate) || 0) * (item.quantity || 1) * (item.rentalDays || totalDays)).toLocaleString()}`}
                    readOnly
                    className="input-highlight-blue"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Paid</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="LKR"
                    value={item.amountPaid === 0 ? '' : item.amountPaid}
                    onChange={(e) =>
                      handleItemChange(index, "amountPaid", e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Due</label>
                  <input
                    type="text"
                    value={`LKR ${Math.max(0, ((Number(item.dailyRate) || 0) * (item.quantity || 1) * (item.rentalDays || totalDays)) - (Number(item.amountPaid) || 0)).toLocaleString()}`}
                    readOnly
                    style={{ color: (((Number(item.dailyRate) || 0) * (item.quantity || 1) * (item.rentalDays || totalDays)) - (Number(item.amountPaid) || 0)) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    style={{
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <TrendingUp
                      style={{ transform: "rotate(45deg)" }}
                      size={18}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* <div className="form-section">
            <p className="form-section-title"><Package size={16} /> Selected Tools & Pricing</p>
            
            <div className="tool-selector" style={{ marginBottom: '16px' }}>
                <Autocomplete 
                  name="toolSearch"
                  value={toolSearch}
                  onChange={e => {
                    const val = e.target.value;
                    setToolSearch(val);
                    // Check if the value matches any tool's full description
                    const found = availableTools.find(t => 
                      `${t.number} - ${t.model} (${t.status || 'Available'})` === val || t.number === val
                    );
                    if (found) {
                      if (found.status && found.status !== 'Available' && found.status !== 'Active' && !initialData) {
                        alert(`Warning: This tool is currently ${found.status}. Please check availability dates.`);
                      }
                      addTool(found.number);
                      setToolSearch('');
                    }
                  }}
                  options={availableTools.map(t => `${t.number} - ${t.model} (${t.status || 'Available'})`)}
                  placeholder="Search by Tool ID, Model or Category..."
                  className="full-width-autocomplete"
                />
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="tool-item-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tool Info</label>
                  <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                    {item.toolNumber} - {item.model}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Daily Rate</label>
                  <input
                    type="number"
                    value={item.dailyRate}
                    onChange={e => handleItemChange(index, 'dailyRate', Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Subtotal</label>
                  <input
                    type="text"
                    value={`LKR ${(item.dailyRate * totalDays).toLocaleString()}`}
                    readOnly
                    className="input-highlight-blue"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}
                  >
                    <TrendingUp style={{ transform: 'rotate(45deg)' }} size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div> */}
          {/* ///////////////////////////////////////////////////////////////select////////////////// */}
          <div className="form-section">
            <p className="form-section-title"><Package size={16} /> Selected Parts & Accessories</p>
            {allAccessories.length > 0 && (
              <div className="tool-selector tool-selector-wide" style={{ marginBottom: '16px' }}>
                <Autocomplete
                  name="accSearch"
                  value={accSearch}
                  multiSelect
                  onOptionSelect={handleAccSearchSelect}
                  onChange={(e) => setAccSearch(e.target.value)}
                  options={allAccessories.map(a =>
                    `[PART] ${a.number || 'No ID'} - ${a.name} (${a.stock || 0} available)`
                  )}
                  placeholder="Search parts & accessories to add"
                  className="full-width-autocomplete"
                />
              </div>
            )}
            {allAccessories.length > 0 ? (
              <div className="quick-acc-grid" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '20px',
                maxHeight: '140px',
                overflowY: 'auto',
                padding: '12px',
                background: 'var(--bg-side)',
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
                    <Plus size={14} strokeWidth={3} /> {a.number ? `${a.number} - ` : ''}{a.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-parts-state" style={{
                textAlign: 'center',
                padding: '24px',
                background: 'var(--bg-side)',
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>Add them in the <strong>"Parts & Accessories"</strong> inventory tab.</p>
              </div>
            )}

            {formData.bookingAccessories.length > 0 && (
              <div className="acc-rental-list">
                {formData.bookingAccessories.map((acc, index) => (
                  <div key={index} className="acc-rental-row">

                    {/* ── Item identity ── */}
                    <div className="acc-rental-name">
                      {acc.number && (
                        <span className="acc-rental-id">[{acc.number}]</span>
                      )}
                      <span className="acc-rental-title">{acc.name}</span>
                      <span className="acc-rental-stock">{acc.stock || 0} in stock</span>
                    </div>

                    {/* ── Controls: Rate · Qty · Days · Total ── */}
                    <div className="acc-rental-controls">

                      <div className="acc-rental-field acc-rental-field--rate">
                        <span className="acc-rental-label">Rate / Day (LKR)</span>
                        <input
                          className="acc-rental-input"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={acc.price === '' ? '' : acc.price}
                          onChange={e => handleAccPriceChange(index, e.target.value)}
                        />
                      </div>

                      <div className="acc-rental-field">
                        <span className="acc-rental-label">Qty ({acc.stock || 0})</span>
                        <input
                          className="acc-rental-input"
                          type="number"
                          min="1"
                          max={acc.stock || undefined}
                          value={acc.quantity}
                          onChange={e => handleAccQtyChange(index, Number(e.target.value))}
                        />
                      </div>

                      <div className="acc-rental-field">
                        <span className="acc-rental-label">Days</span>
                        <input
                          className="acc-rental-input"
                          type="number"
                          min="1"
                          value={acc.rentalDays || totalDays}
                          onChange={e => {
                            const newAcc = [...formData.bookingAccessories];
                            newAcc[index].rentalDays = Number(e.target.value);
                            setFormData({ ...formData, bookingAccessories: newAcc });
                          }}
                        />
                      </div>

                      <div className="acc-rental-subtotal">
                        <span className="acc-rental-label">Total</span>
                        <strong>
                          LKR {((Number(acc.price) || 0) * acc.quantity * (acc.rentalDays || totalDays)).toLocaleString()}
                        </strong>
                      </div>

                      <div className="acc-rental-field">
                        <span className="acc-rental-label">Paid (LKR)</span>
                        <input
                          className="acc-rental-input"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={acc.amountPaid === 0 ? '' : acc.amountPaid}
                          onChange={e => {
                            const newAcc = [...formData.bookingAccessories];
                            newAcc[index].amountPaid = e.target.value === '' ? '' : Number(e.target.value);
                            setFormData({ ...formData, bookingAccessories: newAcc });
                          }}
                        />
                      </div>

                      <div className="acc-rental-subtotal">
                        <span className="acc-rental-label">Due</span>
                        <strong style={{ color: (((Number(acc.price) || 0) * acc.quantity * (acc.rentalDays || totalDays)) - (Number(acc.amountPaid) || 0)) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          LKR {Math.max(0, ((Number(acc.price) || 0) * acc.quantity * (acc.rentalDays || totalDays)) - (Number(acc.amountPaid) || 0)).toLocaleString()}
                        </strong>
                      </div>

                    </div>

                    {/* ── Remove ── */}
                    <button
                      type="button"
                      className="acc-rental-remove"
                      onClick={() => removeAccessory(index)}
                      title="Remove accessory"
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="form-section">
            <p className="form-section-title"><Info size={16} /> Locations & Condition</p>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Pickup Store / Location</label>
                <input type="text" value={formData.pickupLocation || ''} onChange={e => setFormData(prev => ({ ...prev, pickupLocation: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Return Store / Location</label>
                <input type="text" value={formData.returnLocation || ''} onChange={e => setFormData(prev => ({ ...prev, returnLocation: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Condition on Pickup</label>
              <input type="text" value={formData.conditionOnPickup || ''} onChange={e => setFormData(prev => ({ ...prev, conditionOnPickup: e.target.value }))} placeholder="e.g. Good, Scratch on handle" />
            </div>
          </div>
          {/* ///////////////////////////////////////////////////////Payment//////////////////////////////////////////// */}
          {/* <div className="form-section" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
            <p className="form-section-title" style={{ color: 'var(--accent)' }}><Hash size={16} /> Pricing & Payment</p>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Advance Payment (LKR)</label>
                <input type="number" value={formData.advancePayment || 0} onChange={e => setFormData(prev => ({ ...prev, advancePayment: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label>Discount (LKR)</label>
                <input type="number" value={formData.discount || 0} onChange={e => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-grid-2" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Transport Charges (LKR)</label>
                <input type="number" value={formData.transportCharge || 0} onChange={e => setFormData(prev => ({ ...prev, transportCharge: Number(e.target.value) }))} />
              </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={formData.paymentMethod} onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {formData.paymentMethod === 'Bank Transfer' && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Target Bank Account *</label>
                  <select required value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })}>
                    <option value="">Select Account</option>
                    {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.accountName} (LKR {acc.balance.toLocaleString()})</option>)}
                  </select>
                </div>
              )}

            <div className="pricing-breakdown" style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px dashed var(--accent-glow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tool Rentals ({totalDays} days)</span>
                <span>LKR {formData.items.reduce((sum, item) => sum + (item.dailyRate * totalDays), 0).toLocaleString()}</span>
              </div>
              {formData.bookingAccessories.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Parts & Accessories</span>
                  <span>LKR {formData.bookingAccessories.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0).toLocaleString()}</span>
                </div>
              )}
              {formData.transportCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Transport Charges</span>
                  <span>LKR {formData.transportCharge.toLocaleString()}</span>
                </div>
              )}
              {formData.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--success)' }}>
                  <span>Discount</span>
                  <span>- LKR {formData.discount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <span>NET TOTAL</span>
                <span style={{ color: 'var(--accent)' }}>LKR {costs.totalAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginTop: '5px' }}>
                <span>BOOKING BALANCE</span>
                <span style={{ color: costs.balanceAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>LKR {costs.balanceAmount.toLocaleString()}</span>
              </div>
            </div>
          </div> */}
          <div
            className="form-section"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-glow)",
            }}
          >
            <p className="form-section-title" style={{ color: "var(--accent)" }}>
              <Hash size={16} /> Pricing & Payment
            </p>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Amount Paid (LKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={emptyNum(formData.advancePayment)}
                  onChange={onNumField('advancePayment')}
                />
              </div>

              {/* ✅ NEW: Deposit */}
              <div className="form-group">
                <label>Deposit (LKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={emptyNum(formData.deposit)}
                  onChange={onNumField('deposit')}
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>Discount (LKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={emptyNum(formData.discount)}
                  onChange={onNumField('discount')}
                />
              </div>

              <div className="form-group">
                <label>Transport Charges (LKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={emptyNum(formData.transportCharge)}
                  onChange={onNumField('transportCharge')}
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {formData.paymentMethod === "Bank Transfer" && (
              <div className="form-group" style={{ marginTop: "16px" }}>
                <label>Target Bank Account *</label>
                <select
                  required
                  value={formData.accountId}
                  onChange={(e) =>
                    setFormData({ ...formData, accountId: e.target.value })
                  }
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountName} (LKR {acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {initialData && initialData.status !== 'Draft' && (
              <div className="form-grid-2" style={{ marginTop: "16px", padding: '15px', background: 'var(--warning-soft)', borderRadius: '8px', border: '1px solid var(--warning)' }}>
                <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--warning)' }}>Return Overrides (Manual Adjustments)</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Use these fields to manually correct past return dates or force extra/early charges.</p>
                </div>
                <div className="form-group">
                  <label>Actual Return Date</label>
                  <input
                    type="date"
                    value={formData.actualReturnDate || ''}
                    onChange={(e) => setFormData({ ...formData, actualReturnDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Early Return Days</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Force early days"
                    value={emptyNum(formData.earlyReturnDays)}
                    onChange={onNumField('earlyReturnDays')}
                  />
                </div>
                <div className="form-group">
                  <label>Extra Late Charges (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={emptyNum(formData.extraCharges)}
                    onChange={onNumField('extraCharges')}
                  />
                </div>
              </div>
            )}

            {/* pricing breakdown stays same */}
            <div
              className="pricing-breakdown"
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "var(--bg-card)",
                borderRadius: "10px",
                border: "1px dashed var(--accent-glow)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Tool Rentals ({totalDays} days)</span>
                <span>LKR {(costs.toolsTotal || 0).toLocaleString()}</span>
              </div>

              {formData.bookingAccessories.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Parts & Accessories</span>
                  <span>LKR {(costs.accessoriesTotal || 0).toLocaleString()}</span>
                </div>
              )}

              {formData.transportCharge > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Transport Charges</span>
                  <span>LKR {formData.transportCharge.toLocaleString()}</span>
                </div>
              )}

              {/* optional: show deposit in breakdown */}
              {formData.deposit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Deposit</span>
                  <span>LKR {formData.deposit.toLocaleString()}</span>
                </div>
              )}

              {formData.discount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    color: "var(--success)",
                  }}
                >
                  <span>Discount</span>
                  <span>- LKR {formData.discount.toLocaleString()}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "800",
                  fontSize: "1.1rem",
                  marginTop: "10px",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "10px",
                }}
              >
                <span>NET TOTAL</span>
                <span style={{ color: "var(--accent)" }}>
                  LKR {costs.totalAmount.toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "700",
                  marginTop: "5px",
                }}
              >
                <span>BOOKING BALANCE</span>
                <span
                  style={{
                    color: costs.balanceAmount > 0 ? "var(--danger)" : "var(--success)",
                  }}
                >
                  LKR {costs.balanceAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          {/* //////////////////////////////////////Payment////////////////////////////////////// */}

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Notes / Special Requirements</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Needs extra cable, Handle with care, etc."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Booking Status</label>
            <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}>
              <option value="Confirmed">Confirmed</option>
              <option value="Active">Active (Tool Picked Up)</option>
              <option value="Returned">Returned (Completed)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

        </div>

        <div className="hire-form-footer">
          <div className="total-display">
            <span>{totalDays} Day(s) Booking</span>
            <strong>LKR {costs.totalAmount.toLocaleString()}</strong>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Booking' : 'Confirm Multi-Tool Booking')}
            </button>
          </div>
        </div>
      </form>

      
    </div>
  );
};

export default BookingForm;
