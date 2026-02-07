import { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, DollarSign, IndianRupee, Clock, Users, FileText, X, Plus, CheckCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const inputClass = "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

const AMENITY_SUGGESTIONS = [
  'Cardio Area', 'Weight Training', 'CrossFit', 'Yoga Studio', 'Steam Room',
  'Sauna', 'Swimming Pool', 'Personal Training', 'Locker Room', 'Shower',
  'Parking', 'AC', 'WiFi', 'Juice Bar', 'Group Classes',
];

export function Settings() {
  const { userGym, refreshUserData } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    monthlyFee: 0,
    upiId: '',
    description: '',
    quarterlyFee: 0,
    annualFee: 0,
    openingHours: '',
    capacity: 0,
    amenities: [] as string[],
  });

  useEffect(() => {
    if (userGym) {
      setFormData({
        name: userGym.name || '',
        phone: userGym.phone || '',
        email: userGym.email || '',
        address: userGym.address || '',
        monthlyFee: userGym.monthlyFee || 0,
        upiId: userGym.upiId || '',
        description: userGym.description || '',
        quarterlyFee: userGym.quarterlyFee || 0,
        annualFee: userGym.annualFee || 0,
        openingHours: userGym.openingHours || '',
        capacity: userGym.capacity || 0,
        amenities: userGym.amenities || [],
      });
    }
  }, [userGym]);

  const handleSave = async () => {
    if (!userGym?.id) return;

    try {
      setSaving(true);
      setSaved(false);

      const updateData: Record<string, unknown> = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        monthlyFee: Number(formData.monthlyFee),
        upiId: formData.upiId,
        description: formData.description,
        openingHours: formData.openingHours,
        capacity: Number(formData.capacity) || 0,
        amenities: formData.amenities,
      };

      // Only write fee fields if they have a value > 0
      if (Number(formData.quarterlyFee) > 0) {
        updateData.quarterlyFee = Number(formData.quarterlyFee);
      }
      if (Number(formData.annualFee) > 0) {
        updateData.annualFee = Number(formData.annualFee);
      }

      await updateDoc(doc(db, 'gyms', userGym.id), updateData);
      await refreshUserData();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addAmenity = (amenity: string) => {
    const trimmed = amenity.trim();
    if (trimmed && !formData.amenities.includes(trimmed)) {
      setFormData({ ...formData, amenities: [...formData.amenities, trimmed] });
    }
    setNewAmenity('');
  };

  const removeAmenity = (amenity: string) => {
    setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
  };

  if (!userGym) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Loading gym information...</p>
        </div>
      </div>
    );
  }

  const suggestionsToShow = AMENITY_SUGGESTIONS.filter(a => !formData.amenities.includes(a));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your gym configuration</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-pulse">
            <CheckCircle className="w-4 h-4" />
            Saved!
          </div>
        )}
      </div>

      {/* Basic Gym Information */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="w-4 h-4" />
              Gym Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe your gym — this is shown to users on the app..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="w-4 h-4" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4" />
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4" />
                Opening Hours
              </label>
              <input
                type="text"
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                placeholder="e.g., 6:00 AM - 10:00 PM"
                className={inputClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4" />
                Max Capacity
              </label>
              <input
                type="number"
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 50"
                min="0"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Used for crowd status in the user app</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Pricing</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <IndianRupee className="w-4 h-4" />
                Monthly Fee (₹)
              </label>
              <input
                type="number"
                value={formData.monthlyFee}
                onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })}
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <IndianRupee className="w-4 h-4" />
                Quarterly Fee (₹)
              </label>
              <input
                type="number"
                value={formData.quarterlyFee || ''}
                onChange={(e) => setFormData({ ...formData, quarterlyFee: parseFloat(e.target.value) || 0 })}
                placeholder={`Suggested: ₹${Math.round(formData.monthlyFee * 2.7)}`}
                min="0"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">For 3-month "Quarterly" plan</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <IndianRupee className="w-4 h-4" />
                6-Month Fee (₹)
              </label>
              <input
                type="number"
                value={formData.annualFee || ''}
                onChange={(e) => setFormData({ ...formData, annualFee: parseFloat(e.target.value) || 0 })}
                placeholder={`Suggested: ₹${Math.round(formData.monthlyFee * 5)}`}
                min="0"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">For 6-month plan</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="w-4 h-4" />
              UPI ID
            </label>
            <input
              type="text"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              placeholder="e.g., gymname@upi"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Amenities</h3>
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">These are shown to users when they view your gym details</p>

        {/* Current amenities */}
        {formData.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.amenities.map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium"
              >
                {amenity}
                <button
                  onClick={() => removeAmenity(amenity)}
                  className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom amenity */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(newAmenity); } }}
            placeholder="Type a custom amenity..."
            className={`flex-1 ${inputClass}`}
          />
          <button
            onClick={() => addAmenity(newAmenity)}
            disabled={!newAmenity.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Quick add suggestions */}
        {suggestionsToShow.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestionsToShow.map((amenity) => (
                <button
                  key={amenity}
                  onClick={() => addAmenity(amenity)}
                  className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full text-xs transition-colors"
                >
                  + {amenity}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Gym Stats */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Gym Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gym ID</p>
            <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{userGym.id}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Created</p>
            <p className="text-sm text-gray-900 dark:text-white">
              {userGym.createdAt instanceof Date ? userGym.createdAt.toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${userGym.isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
              {userGym.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}