export const MAX_FILE_SIZE_MB = 8; // Keep under Supabase's ~10MB edge payload ceiling

export function convertPdfToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type !== "application/pdf") {
      return reject(new Error("Invalid file type. Please upload a PDF document."));
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return reject(
        new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please upload a smaller file.`)
      );
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const result = reader.result as string;
      // Strip out data URL scheme header (e.g., "data:application/pdf;base64,")
      const base64String = result.split(",")[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Failed to extract Base64 data from file."));
      }
    };

    reader.onerror = () => reject(new Error("Error reading PDF file."));
  });
}