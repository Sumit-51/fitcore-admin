'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function CreateGymPage() {
    const navigate = useNavigate();
    const { userData, loading: authLoading } = useAuth();
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        upiId: '',
        monthlyFee: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
    });

    // Redirect if not super admin
    if (!authLoading && userData?.role !== 'superAdmin') {
        navigate('/');
        return null;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setFormError('');
        setSuccessMessage('');

        try {
            // Create admin user in Firebase Auth
            const adminCred = await createUserWithEmailAndPassword(
                auth,
                form.adminEmail,
                form.adminPassword
            );

            // Create gym document
            const gymRef = await addDoc(collection(db, 'gyms'), {
                name: form.name,
                address: form.address,
                phone: form.phone,
                email: form.email,
                upiId: form.upiId,
                monthlyFee: parseFloat(form.monthlyFee),
                adminId: adminCred.user.uid,
                isActive: true,
                createdAt: serverTimestamp(),
            });

            // Create admin user document
            await setDoc(doc(db, 'users', adminCred.user.uid), {
                uid: adminCred.user.uid,
                displayName: form.adminName,
                email: form.adminEmail,
                role: 'gymAdmin',
                gymId: gymRef.id,
                enrollmentStatus: 'none',
                paymentMethod: null,
                transactionId: null,
                enrolledAt: null,
                createdAt: serverTimestamp(),
            });

            setSuccessMessage(
                `Gym "${form.name}" created successfully!\n\nAdmin Credentials:\nEmail: ${form.adminEmail}\nPassword: ${form.adminPassword}\n\nPlease save these credentials securely.`
            );

            // Reset form
            setForm({
                name: '',
                address: '',
                phone: '',
                email: '',
                upiId: '',
                monthlyFee: '',
                adminName: '',
                adminEmail: '',
                adminPassword: '',
            });

        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            if (err.code === 'auth/email-already-in-use') {
                setFormError('Admin email is already in use. Please use a different email.');
            } else if (err.code === 'auth/weak-password') {
                setFormError('Password is too weak. Use at least 6 characters.');
            } else {
                setFormError(err.message || 'Failed to create gym. Please try again.');
            }
        } finally {
            setCreating(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/super-admin')}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Gym</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Add a new gym and admin account</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                        <h3 className="text-emerald-800 dark:text-emerald-400 font-semibold mb-2">✓ Gym Created Successfully!</h3>
                        <pre className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">{successMessage}</pre>
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => navigate('/super-admin')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={() => setSuccessMessage('')}
                                className="px-4 py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium text-sm transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                            >
                                Create Another
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {formError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-red-600 dark:text-red-400">{formError}</p>
                    </div>
                )}

                {/* Form */}
                {!successMessage && (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Gym Information Section */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-purple-600" />
                                Gym Information
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Gym Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="e.g., FitCore Downtown"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Address *
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="e.g., 123 Main Street, City Center"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="e.g., +91 9876543210"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Gym Email *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="e.g., contact@gym.com"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            UPI ID *
                                        </label>
                                        <input
                                            type="text"
                                            name="upiId"
                                            value={form.upiId}
                                            onChange={handleChange}
                                            placeholder="e.g., gym@upi"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Monthly Fee (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            name="monthlyFee"
                                            value={form.monthlyFee}
                                            onChange={handleChange}
                                            placeholder="e.g., 1500"
                                            min="0"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Account Section */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                                🔐 Gym Admin Account
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                This account will be used by the gym administrator to manage members and payments.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Admin Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="adminName"
                                        value={form.adminName}
                                        onChange={handleChange}
                                        placeholder="e.g., John Smith"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Admin Email *
                                        </label>
                                        <input
                                            type="email"
                                            name="adminEmail"
                                            value={form.adminEmail}
                                            onChange={handleChange}
                                            placeholder="e.g., admin@gym.com"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Admin Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="adminPassword"
                                            value={form.adminPassword}
                                            onChange={handleChange}
                                            placeholder="Min 6 characters"
                                            minLength={6}
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => navigate('/super-admin')}
                                className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full sm:w-auto px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? 'Creating Gym...' : '✓ Create Gym & Admin Account'}
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
