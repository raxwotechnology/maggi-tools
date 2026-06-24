import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import { Settings as SettingsIcon, Save, Image as ImageIcon, Phone, MapPin, Globe, MessageSquare, RotateCcw, Eye, FileText } from 'lucide-react';
import {
  DEFAULT_SMS_BOOKING_TEMPLATE,
  DEFAULT_SMS_ADVANCE_TEMPLATE,
  SMS_PLACEHOLDER_GROUPS,
  resolveBookingTemplate,
  previewSmsTemplate,
  previewAdvanceSmsTemplate,
  isLegacyShortTemplate
} from '../utils/smsTemplate';
import '../styles/books.css';
import './Settings.css';

const Settings = ({ onSettingsUpdate }) => {
  const [settings, setSettings] = useState({
    companyName: '',
    address: '',
    phones: [],
    email: '',
    regNo: '',
    logo: '',
    smsBookingTemplate: '',
    smsFollowupTemplate: '',
    smsReturnTemplate: '',
    smsAdvanceTemplate: '',
    followupDays: 14,
    overdueSmsMaxDays: 4,
    privacyPolicy: '',
    termsConditions: '',
    enableOverdueCharges: true,
    defaultOverdueChargePerDay: 500,
    smsOverdueReminderTemplate: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const smsTextareaRef = useRef(null);
  const advanceSmsTextareaRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('settings');
      const data = res.data || {};
      setSettings({
        ...data,
        smsBookingTemplate: resolveBookingTemplate(
          data.smsBookingTemplate,
          data.companyName || 'MAGGI TOOLS'
        ),
        smsFollowupTemplate: data.smsFollowupTemplate || '',
        smsReturnTemplate: data.smsReturnTemplate || '',
        smsAdvanceTemplate: data.smsAdvanceTemplate || DEFAULT_SMS_ADVANCE_TEMPLATE,
        followupDays: data.followupDays ?? 14,
        overdueSmsMaxDays: data.overdueSmsMaxDays ?? 4,
        privacyPolicy: data.privacyPolicy || '',
        termsConditions: data.termsConditions || '',
        enableOverdueCharges: data.enableOverdueCharges ?? true,
        defaultOverdueChargePerDay: data.defaultOverdueChargePerDay ?? 500,
        smsOverdueReminderTemplate: data.smsOverdueReminderTemplate || ''
      });
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const smsPreview = useMemo(
    () => previewSmsTemplate(settings.smsBookingTemplate, settings.companyName || 'MAGGI TOOLS'),
    [settings.smsBookingTemplate, settings.companyName]
  );

  const advanceSmsPreview = useMemo(
    () => previewAdvanceSmsTemplate(settings.smsAdvanceTemplate, settings),
    [settings.smsAdvanceTemplate, settings.companyName]
  );

  const insertPlaceholder = (token) => {
    const el = smsTextareaRef.current;
    const current = settings.smsBookingTemplate || '';
    if (!el) {
      setSettings({ ...settings, smsBookingTemplate: current + token });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? start;
    const next = current.slice(0, start) + token + current.slice(end);
    setSettings({ ...settings, smsBookingTemplate: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const resetBookingTemplate = () => {
    const tpl = DEFAULT_SMS_BOOKING_TEMPLATE.replace(
      /\{companyName\}/g,
      settings.companyName || 'MAGGI TOOLS'
    );
    setSettings({ ...settings, smsBookingTemplate: tpl });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        smsBookingTemplate: (settings.smsBookingTemplate || '').trim()
      };
      if (isLegacyShortTemplate(payload.smsBookingTemplate)) {
        payload.smsBookingTemplate = resolveBookingTemplate(
          '',
          settings.companyName || 'MAGGI TOOLS'
        );
      }
      await api.put('settings', payload);
      if (onSettingsUpdate) onSettingsUpdate();
      alert('Settings updated successfully!');
    } catch (err) {
      alert('Failed to update settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const addPhone = () => {
    if (phoneInput.trim()) {
      setSettings({ ...settings, phones: [...settings.phones, phoneInput.trim()] });
      setPhoneInput('');
    }
  };

  const removePhone = (index) => {
    const newPhones = settings.phones.filter((_, i) => i !== index);
    setSettings({ ...settings, phones: newPhones });
  };

  if (loading) return <div className="loading-container">Loading Settings...</div>;

  return (
    <div className="book-container">
      <div className="book-header">
        <div className="header-title">
          <SettingsIcon size={24} />
          <h2>System Configuration</h2>
        </div>
        <p className="header-subtitle">Manage your company branding and SMS message templates</p>
      </div>

      <div className="premium-card">
        <form onSubmit={handleSave} className="hire-form">
          <div className="settings-section">
            <h3 className="section-title"><MapPin size={18} /> Basic Information</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  className="premium-input"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  className="premium-input"
                  value={settings.regNo}
                  onChange={(e) => setSettings({ ...settings, regNo: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title"><ImageIcon size={18} /> Visual Identity</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
              <div className="logo-preview-box">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" />
                ) : (
                  <ImageIcon size={40} color="var(--text-dim)" />
                )}
              </div>
              <div>
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} id="logo-upload" />
                <label htmlFor="logo-upload" className="upload-label btn-glow">
                  <ImageIcon size={18} /> Change Company Logo
                </label>
                <p className="upload-hint">Recommended: Square PNG or JPG (Min. 400x400)</p>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title"><Globe size={18} /> Location & Contact</h3>
            <div className="form-group">
              <label>Business Address</label>
              <textarea
                className="premium-input"
                rows="3"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2" style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Official Email</label>
                <input
                  type="email"
                  className="premium-input"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Numbers</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="premium-input"
                    style={{ flex: '1 1 140px' }}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+94 ..."
                  />
                  <button type="button" className="add-btn btn-glow" onClick={addPhone}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                  {settings.phones.map((p, i) => (
                    <div key={i} className="phone-tag">
                      <Phone size={14} />
                      <span>{p}</span>
                      <button type="button" onClick={() => removePhone(i)} className="remove-tag">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section sms-settings-section">
            <h3 className="section-title"><MessageSquare size={18} /> Booking SMS Template</h3>
            <p className="upload-hint" style={{ marginBottom: '16px' }}>
              This message is sent automatically when you confirm a booking. Tap a placeholder below to insert it into the template.
            </p>

            <div className="sms-placeholder-groups" style={{ marginBottom: '16px' }}>
              {SMS_PLACEHOLDER_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="sms-placeholder-group-title">{group.title}</p>
                  <div className="sms-placeholder-chips">
                    {group.keys.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="sms-placeholder-chip"
                        onClick={() => insertPlaceholder(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sms-template-editor">
              <div className="sms-template-panel">
                <label>Template (editable)</label>
                <textarea
                  ref={smsTextareaRef}
                  className="sms-template-textarea"
                  value={settings.smsBookingTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, smsBookingTemplate: e.target.value })}
                  spellCheck={false}
                />
                <div className="sms-settings-actions">
                  <button type="button" className="sms-reset-btn" onClick={resetBookingTemplate}>
                    <RotateCcw size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Reset to default bill
                  </button>
                </div>
              </div>

              <div className="sms-template-panel">
                <label><Eye size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Preview (sample data)</label>
                <div className="sms-preview-box" aria-live="polite">
                  {smsPreview || '—'}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '28px' }}>
              <label>Follow-up / Reminder SMS</label>
              <textarea
                className="premium-input sms-followup-textarea"
                rows="4"
                value={settings.smsFollowupTemplate || ''}
                onChange={(e) => setSettings({ ...settings, smsFollowupTemplate: e.target.value })}
                placeholder="Reminder for overdue rentals. Use the same placeholders as above."
              />
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Auto Follow-up Delay (Days)</label>
              <input
                type="number"
                className="premium-input"
                style={{ maxWidth: '150px' }}
                value={settings.followupDays || 14}
                onChange={(e) => setSettings({ ...settings, followupDays: Number(e.target.value) })}
                min="1"
              />
              <p className="upload-hint">Days after pickup to send automatic follow-up reminders.</p>
            </div>

            <div className="form-group" style={{ marginTop: '28px' }}>
              <label>Return Confirmation SMS</label>
              <textarea
                className="premium-input sms-followup-textarea"
                rows="5"
                value={settings.smsReturnTemplate || ''}
                onChange={(e) => setSettings({ ...settings, smsReturnTemplate: e.target.value })}
                placeholder={`Sent automatically when a return is confirmed.\nLeave blank to use the default message.\nAvailable: {clientName}, {companyName}, {totalAmount}, {advancePayment}, {balanceAmount}, {billLink}`}
              />
              <p className="upload-hint">Sent to the client when you click "Confirm Return &amp; Pay". Leave blank for the default message.</p>
            </div>

            <div className="form-group" style={{ marginTop: '28px' }}>
              <label>Advance Payment SMS</label>
              <textarea
                ref={advanceSmsTextareaRef}
                className="premium-input sms-followup-textarea"
                rows="8"
                value={settings.smsAdvanceTemplate || ''}
                onChange={(e) => setSettings({ ...settings, smsAdvanceTemplate: e.target.value })}
                placeholder={DEFAULT_SMS_ADVANCE_TEMPLATE}
              />
              <p className="upload-hint">
                Sent automatically when an advance or partial payment is recorded. Placeholders: {'{clientName}'}, {'{amountReceived}'}, {'{paymentMethod}'}, {'{invoiceNo}'}, {'{totalAmount}'}, {'{advancePayment}'}, {'{balanceAmount}'}, {'{billLink}'}
              </p>
              <div className="sms-preview-box" style={{ marginTop: '12px' }} aria-live="polite">
                {advanceSmsPreview || '—'}
              </div>
            </div>
          </div>

          <div className="settings-section sms-settings-section">
            <h3 className="section-title"><MessageSquare size={18} /> Late Return Management</h3>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enableOverdueCharges !== false}
                  onChange={(e) => setSettings({ ...settings, enableOverdueCharges: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Enable Automatic Overdue Charges</span>
              </label>
              <p className="upload-hint" style={{ marginTop: '5px' }}>If enabled, the system will automatically accumulate daily overdue charges for unreturned items past their expected return date.</p>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Default Overdue Charge Per Day (LKR)</label>
              <input
                type="number"
                className="premium-input"
                style={{ maxWidth: '200px' }}
                value={settings.defaultOverdueChargePerDay || 500}
                onChange={(e) => setSettings({ ...settings, defaultOverdueChargePerDay: Number(e.target.value) })}
                min="0"
                disabled={settings.enableOverdueCharges === false}
              />
              <p className="upload-hint">Applied to any item or accessory unless it has a custom overdue rate set in inventory.</p>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Auto SMS for Overdue Returns (Max Days)</label>
              <input
                type="number"
                className="premium-input"
                style={{ maxWidth: '150px' }}
                value={settings.overdueSmsMaxDays ?? 4}
                onChange={(e) => setSettings({ ...settings, overdueSmsMaxDays: Number(e.target.value) })}
                min="0"
                disabled={settings.enableOverdueCharges === false}
              />
              <p className="upload-hint">Automatic overdue SMS is sent only within this many days after the return date. After that, late-day charges still calculate automatically but no more daily SMS is sent.</p>
            </div>

            <div className="form-group" style={{ marginTop: '28px' }}>
              <label>Automated Overdue SMS Reminder</label>
              <textarea
                className="premium-input sms-followup-textarea"
                rows="4"
                value={settings.smsOverdueReminderTemplate || ''}
                onChange={(e) => setSettings({ ...settings, smsOverdueReminderTemplate: e.target.value })}
                placeholder="Dear {clientName}, your rental of {itemName} is overdue by {overdueDays} days. Current overdue charge: LKR {overdueCharge}. Please return the item immediately."
                disabled={settings.enableOverdueCharges === false}
              />
              <p className="upload-hint">Sent automatically while items are overdue, up to the max days above. Charges continue after SMS stops.</p>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title"><FileText size={18} /> Public Bill & Legal</h3>
            <div className="form-group">
              <label>Terms & Conditions</label>
              <textarea
                className="premium-input"
                rows="4"
                value={settings.termsConditions}
                onChange={(e) => setSettings({ ...settings, termsConditions: e.target.value })}
                placeholder="1. Tools must be returned...&#10;2. Late returns..."
              />
              <p className="upload-hint">Displayed at the bottom of the public digital bill.</p>
            </div>
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Privacy Policy</label>
              <textarea
                className="premium-input"
                rows="3"
                value={settings.privacyPolicy}
                onChange={(e) => setSettings({ ...settings, privacyPolicy: e.target.value })}
                placeholder="Your privacy is important to us..."
              />
              <p className="upload-hint">Displayed at the bottom of the public digital bill.</p>
            </div>
          </div>

          <div
            style={{
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-soft)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <button
              type="submit"
              className="submit-btn btn-glow"
              disabled={saving}
              style={{
                padding: '16px 40px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)'
              }}
            >
              <Save size={20} /> {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
