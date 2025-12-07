import os
import json
import re
from collections import defaultdict
from pypdf import PdfReader
from datetime import datetime

# Configuration
REPORTS_DIR = 'indigo-yield-platform-v01/REPORTS'
PROCESSED_DIR = 'indigo-yield-platform-v01/processed_reports'

def normalize_name(name):
    return name.strip().title().replace('  ', ' ')

def get_investor_filename(investor_name):
    safe_name = "".join([c for c in investor_name if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(' ', '_')
    return os.path.join(PROCESSED_DIR, f"{safe_name}.json")

def parse_currency_amount(text):
    clean = text.replace('$', '').replace(',', '').replace('%', '').replace('(', '-').replace(')', '').strip()
    try:
        return float(clean)
    except ValueError:
        return 0.0

def extract_data_from_page(raw_text):
    data = {}
    text = re.sub(r'\s+', ' ', raw_text).strip()
    
    attn_match = re.search(r"ATTN:\s*(.*?)(?:\s*[-–,]|\s+[\d]+\s+[A-Za-z]+|$)", text, re.IGNORECASE)
    if attn_match:
        raw_name = attn_match.group(1).strip()
        if "TRUSTEE" in raw_name.upper():
             trustee_match = re.search(r"^(.*?)\s+TRUSTEE", raw_name, re.IGNORECASE)
             if trustee_match:
                 raw_name = trustee_match.group(1)
        data['investor_name'] = normalize_name(raw_name)
    
    date_match = re.search(r"(?:Period|Year|Month) Ended:?\s*(.*?)(?:\s+(?:BTC|ETH|SOL|USDT|CAPITAL)|\Z)", text, re.IGNORECASE)
    if date_match:
        data['period_ended'] = date_match.group(1).strip()
        
    if "BTC YIELD FUND" in text: data['fund'] = "BTC"
    elif "ETH YIELD FUND" in text: data['fund'] = "ETH"
    elif "SOL YIELD FUND" in text: data['fund'] = "SOL"
    elif "USDT YIELD FUND" in text: data['fund'] = "USDT"
        
    def get_numbers_from_line(label, text):
        match = re.search(rf"{label}\s+([(\d.,%\-\s)]+)", text, re.IGNORECASE)
        if match:
            raw_vals = match.group(1).split()
            return [parse_currency_amount(v) for v in raw_vals if any(c.isdigit() for c in v)]
        return []

    net_income_vals = get_numbers_from_line("Net Income", text)
    if len(net_income_vals) >= 1: data['net_income_mtd'] = net_income_vals[0]
    if len(net_income_vals) >= 2: data['net_income_qtd'] = net_income_vals[1]
    if len(net_income_vals) >= 3: data['net_income_ytd'] = net_income_vals[2]
    
    end_bal_vals = get_numbers_from_line("Ending Balance", text)
    if len(end_bal_vals) >= 1: data['ending_balance_mtd'] = end_bal_vals[0]
    if len(end_bal_vals) >= 2: data['ending_balance_qtd'] = end_bal_vals[1]
    if len(end_bal_vals) >= 3: data['ending_balance_ytd'] = end_bal_vals[2]
    
    roi_vals = get_numbers_from_line("Rate of Return", text)
    if len(roi_vals) >= 1: data['roi_mtd'] = roi_vals[0]
    if len(roi_vals) >= 2: data['roi_qtd'] = roi_vals[1]
    if len(roi_vals) >= 3: data['roi_ytd'] = roi_vals[2]

    return data

def process_pdfs():
    if not os.path.exists(PROCESSED_DIR):
        os.makedirs(PROCESSED_DIR)

    files = [f for f in os.listdir(REPORTS_DIR) if f.lower().endswith('.pdf')]
    print(f"Found {len(files)} PDF reports.")

    for filename in files:
        filepath = os.path.join(REPORTS_DIR, filename)
        print(f"Processing {filename}...")
        
        try:
            reader = PdfReader(filepath)
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if not text.strip(): continue
                    
                extracted = extract_data_from_page(text)
                
                if 'investor_name' in extracted and extracted['investor_name']:
                    has_metrics = any(k in extracted for k in ['net_income_mtd', 'ending_balance_mtd', 'roi_mtd'])
                    if not has_metrics and not extracted.get('period_ended'):
                        continue

                    investor = extracted['investor_name']
                    json_path = get_investor_filename(investor)
                    
                    if os.path.exists(json_path):
                        with open(json_path, 'r') as f:
                            record = json.load(f)
                    else:
                        record = {
                            "profile": {"emails": []},
                            "transactions": [],
                            "summary": {"currencies": {}, "total_usd_value": 0.0},
                            "reports": []
                        }
                    
                    if "reports" not in record: record["reports"] = []
                        
                    report_entry = {
                        "source_file": filename,
                        "page": page_num + 1,
                        "period_ended": extracted.get("period_ended"),
                        "fund": extracted.get("fund"),
                        "metrics": {
                            "net_income_mtd": extracted.get("net_income_mtd", 0),
                            "net_income_qtd": extracted.get("net_income_qtd", 0),
                            "net_income_ytd": extracted.get("net_income_ytd", 0),
                            "ending_balance_mtd": extracted.get("ending_balance_mtd", 0),
                            "ending_balance_qtd": extracted.get("ending_balance_qtd", 0),
                            "ending_balance_ytd": extracted.get("ending_balance_ytd", 0),
                            "roi_mtd": extracted.get("roi_mtd", 0),
                            "roi_qtd": extracted.get("roi_qtd", 0),
                            "roi_ytd": extracted.get("roi_ytd", 0)
                        }
                    }
                    
                    is_dup = False
                    for r in record["reports"]:
                        if (r.get("period_ended") == report_entry["period_ended"] and 
                            r.get("fund") == report_entry["fund"] and
                            r.get("metrics", {}).get("net_income_mtd") == report_entry["metrics"]["net_income_mtd"]):
                            is_dup = True
                            break
                    
                    if not is_dup:
                        record["reports"].append(report_entry)

                    with open(json_path, 'w') as f:
                        json.dump(record, f, indent=4)
                        
        except Exception as e:
            print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    process_pdfs()
