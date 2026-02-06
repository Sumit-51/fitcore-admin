import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts a Firestore Timestamp, Date object, ISO string, or number to a JavaScript Date object.
 * Returns null if the input is invalid or null/undefined.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFirestoreDate(value: any): Date | null {
    if (!value) return null;

    // Handle Firestore Timestamp
    if (value instanceof Timestamp) {
        return value.toDate();
    }

    // Handle checking for .toDate() function if instance check fails (e.g. slight version mismatch or mock)
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }

    // Handle Date object
    if (value instanceof Date) {
        return value;
    }

    // Handle string or number (timestamp)
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        // Check if valid date
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    return null;
}
