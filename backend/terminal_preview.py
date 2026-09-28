import json
import sys
import pandas as pd

def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"status": "error", "message": "Missing arguments"}))
            sys.exit(1)
        
        args = json.loads(sys.argv[1])
        file_path = args.get("file_path")
        subject_code = args.get("subject_code")
        
        if not file_path or not subject_code:
            print(json.dumps({"status": "error", "message": "Missing file_path or subject_code"}))
            sys.exit(1)
            
        try:
            # Read the xls file. Use openpyxl for xlsx, xlrd for xls
            if file_path.endswith('.xls'):
                df = pd.read_excel(file_path, engine='xlrd')
            else:
                df = pd.read_excel(file_path)
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Failed to read Excel file: {str(e)}"}))
            sys.exit(1)
            
        # Normalize columns
        df.columns = df.columns.str.strip()
        
        if 'Main Exam Code' not in df.columns or 'Grade' not in df.columns:
            print(json.dumps({"status": "error", "message": "Missing required columns: 'Main Exam Code' or 'Grade'"}))
            sys.exit(1)
            
        # Filter by subject code
        subject_df = df[df['Main Exam Code'].astype(str).str.strip().str.upper() == subject_code.strip().upper()]
        
        if len(subject_df) == 0:
            print(json.dumps({"status": "error", "message": f"Subject code '{subject_code}' not found in the file."}))
            sys.exit(1)
            
        # Calculate grade distribution
        valid_grades = ['O', 'A+', 'A', 'B+', 'B', 'C', 'U']
        grade_counts = {g: 0 for g in valid_grades}
        
        for g in subject_df['Grade']:
            g_str = str(g).strip().upper()
            if g_str in grade_counts:
                grade_counts[g_str] += 1
            elif g_str == 'A+':
                grade_counts['A+'] += 1 # just in case
                
        total_registered = sum(grade_counts.values())
        
        if total_registered == 0:
            print(json.dumps({"status": "error", "message": "No valid grades found for the subject."}))
            sys.exit(1)
            
        # Calculate percentages
        sum_B = grade_counts['O'] + grade_counts['A+'] + grade_counts['A'] + grade_counts['B+']
        sum_A = grade_counts['O'] + grade_counts['A+'] + grade_counts['A']
        sum_S = grade_counts['O'] + grade_counts['A+']
        
        pct_B = (sum_B / total_registered) * 100
        pct_A = (sum_A / total_registered) * 100
        pct_S = (sum_S / total_registered) * 100
        
        result = {
            "status": "ok",
            "grades": grade_counts,
            "total_registered": total_registered,
            "percentages": {
                "B": round(pct_B, 2),
                "A": round(pct_A, 2),
                "S": round(pct_S, 2)
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
