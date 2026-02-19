export const formatDateDisplay = (dateValue: string | null | undefined): string => {
  if (!dateValue) return 'N/A';

  const parts = dateValue.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  return dateValue;
};
