import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { UserData, Gym } from '../types';
import { parseFirestoreDate } from '../utils/date';

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    userGym: Gym | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseUserData(uid: string, data: Record<string, unknown>): UserData {
    let planDuration = (data.planDuration as number) ?? 1;
    if (!data.planDuration) {
        if (data.paymentMethod === 'Quarterly') planDuration = 3;
        else if (data.paymentMethod === '6-Month') planDuration = 6;
    }
    return {
        uid,
        email: (data.email as string) || null,
        displayName: (data.displayName as string) || null,
        role: (data.role as UserData['role']) || 'member',
        gymId: (data.gymId as string) || null,
        enrollmentStatus: (data.enrollmentStatus as UserData['enrollmentStatus']) || 'none',
        paymentMethod: (data.paymentMethod as UserData['paymentMethod']) || null,
        transactionId: (data.transactionId as string) || null,
        enrolledAt: parseFirestoreDate(data.enrolledAt),
        createdAt: parseFirestoreDate(data.createdAt) || new Date(),
        planDuration,
        timeSlot: (data.timeSlot as UserData['timeSlot']) || null,
    };
}

function parseGymData(id: string, data: Record<string, unknown>): Gym {
    return {
        id,
        name: (data.name as string) || '',
        address: (data.address as string) || '',
        phone: (data.phone as string) || '',
        email: (data.email as string) || '',
        upiId: (data.upiId as string) || '',
        monthlyFee: (data.monthlyFee as number) || 0,
        createdAt: parseFirestoreDate(data.createdAt) || new Date(),
        adminId: (data.adminId as string) || '',
        isActive: (data.isActive as boolean) ?? true,
        description: (data.description as string) || '',
        quarterlyFee: (data.quarterlyFee as number) || 0,
        annualFee: (data.annualFee as number) || 0,
        amenities: (data.amenities as string[]) || [],
        images: (data.images as string[]) || [],
        rating: (data.rating as number) || 0,
        reviews: (data.reviews as number) || 0,
        openingHours: (data.openingHours as string) || '',
        capacity: (data.capacity as number) || 0,
        coordinates: (data.coordinates as Gym['coordinates']) || undefined,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [userGym, setUserGym] = useState<Gym | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = parseUserData(uid, userDoc.data() as Record<string, unknown>);
                setUserData(data);

                if (data.role === 'gymAdmin' && data.gymId) {
                    const gymDoc = await getDoc(doc(db, 'gyms', data.gymId));
                    if (gymDoc.exists()) {
                        setUserGym(parseGymData(gymDoc.id, gymDoc.data() as Record<string, unknown>));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchUserData(currentUser.uid);
            } else {
                setUserData(null);
                setUserGym(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
    };

    const refreshUserData = async () => {
        if (user) {
            await fetchUserData(user.uid);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userData, userGym, loading, logout, refreshUserData }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};