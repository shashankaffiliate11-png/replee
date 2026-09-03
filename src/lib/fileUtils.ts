export const convertPdfToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Content = result.split(",")[1];
      resolve(base64Content);
    };
    reader.onerror = (error) => reject(error);
  });
};