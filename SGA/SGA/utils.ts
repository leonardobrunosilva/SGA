/**
 * Formats a date string to DD/MM/AAAA.
 * Supports ISO (YYYY-MM-DD) and already formatted DD/MM/AAAA.
 */
export const formatDate = (dateStr?: string | null) => {
    if (!dateStr || dateStr === '-') return '-';

    // If it's already DD/MM/AAAA, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

    // If it's ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
    }

    return dateStr;
};

export const calculateDays = (dateIn?: string, exitDate?: string) => {
    if (!dateIn || dateIn === '-' || dateIn === '---') return 0;

    const parseDate = (dateStr: string) => {
        // Handle DD/MM/AAAA
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
        }
        // Handle YYYY-MM-DD
        return new Date(dateStr);
    };

    try {
        const start = parseDate(dateIn);
        const end = exitDate && exitDate !== '-' ? parseDate(exitDate) : new Date();

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays < 0 ? 0 : diffDays;
    } catch (e) {
        return 0;
    }
};

