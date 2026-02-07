import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { GymReview } from '@/types';
import { Star, MessageSquare, Calendar, User, Mail, Phone } from 'lucide-react';
import { parseFirestoreDate } from '@/utils/date';

export function GymReviews() {
    const { userData } = useAuth();
    const [reviews, setReviews] = useState<GymReview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!userData?.gymId) return;

            try {
                setLoading(true);
                // Note: orderBy requires an index. If it fails, we decode to sort client-side (implicit fallback in similar components)
                // Ideally, we should ensure the index exists. For now, we'll try to sort client-side if query fails or just sort client-side to be safe if index is missing.
                // Let's try to fetch simple query first and sort client side to avoid index requirement errors immediately.

                const q = query(
                    collection(db, 'gymReviews'),
                    where('gymId', '==', userData.gymId)
                );

                const snapshot = await getDocs(q);
                const reviewsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: parseFirestoreDate(doc.data().createdAt) || new Date()
                })) as GymReview[];

                // Sort by newest first
                reviewsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                setReviews(reviewsList);
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [userData]);

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
            />
        ));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Gym Reviews
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    See what your members are saying about your gym
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No reviews yet</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reviews.map((review) => (
                        <div
                            key={review.id}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 transition-shadow hover:shadow-md"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                        {review.userImage ? (
                                            <img
                                                src={review.userImage}
                                                alt={review.userName}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{review.userName || 'Anonymous'}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {renderStars(review.rating)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {review.createdAt.toLocaleDateString()}
                                </div>
                            </div>

                            <div className="mt-3 pl-13 sm:pl-13 ml-0 sm:ml-13 space-y-2">
                                {(review.comment) && (
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                        {review.comment}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" />
                                        {review.userEmail}
                                    </div>
                                    {review.userPhone && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" />
                                            {review.userPhone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
