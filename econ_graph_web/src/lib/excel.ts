import * as XLSX from 'xlsx';

/**
 * Processes an Excel file client-side and converts it to a text representation
 * suitable for LLM consumption.
 * 
 * @param file The uploaded Excel file
 * @returns A new File object containing the processed text content
 */
export async function processExcelFile(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        let output = `[ANALYSIS OF EXCEL FILE: ${file.name}]\n\n`;
        
        // Iterate through all sheets
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          output += `--- SHEET: ${sheetName} ---\n`;
          
          // Convert sheet to CSV for structured data
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          
          // Basic formula extraction (optional, xlsx might not give full formulas easily in free version without cellFormula)
          // But we can try to get cell values which is the most important.
          // For now, we stick to CSV representation which is token-efficient.
          
          if (csv.trim()) {
            output += csv;
          } else {
            output += "(Empty Sheet)";
          }
          output += "\n\n";
        });

        // Create a new text file
        const newFile = new File([output], `${file.name}.csv`, {
          type: "text/plain",
          lastModified: new Date().getTime(),
        });

        resolve(newFile);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        reject(new Error("Failed to process Excel file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
}
