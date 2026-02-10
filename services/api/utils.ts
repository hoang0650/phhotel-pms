export const extractId = (data: any): string | undefined => {
  if (!data) return undefined;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (data._id) return typeof data._id === 'string' ? data._id : String(data._id);
    if (data.id) return typeof data.id === 'string' ? data.id : String(data.id);
    // Avoid [object Object] if possible, but fallback to toString if it might be an ObjectId wrapper
    return data.toString();
  }
  return String(data);
};

export const extractIds = (data: any[] | undefined): string[] | undefined => {
  if (!data || !Array.isArray(data)) return undefined;
  return data.map(item => extractId(item)).filter((id): id is string => !!id);
};
