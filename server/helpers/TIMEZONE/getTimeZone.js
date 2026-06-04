export const getMonthKey = (date) => {
  const d = new Date(date);

  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      1
    )
  );
};