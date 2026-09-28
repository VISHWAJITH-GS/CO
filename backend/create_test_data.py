import pandas as pd
data = []
for _ in range(17): data.append({'Main Exam Code': '24AM230', 'Grade': 'O'})
for _ in range(27): data.append({'Main Exam Code': '24AM230', 'Grade': 'A+'})
for _ in range(5): data.append({'Main Exam Code': '24AM230', 'Grade': 'A'})
for _ in range(6): data.append({'Main Exam Code': '24AM230', 'Grade': 'B+'})
for _ in range(3): data.append({'Main Exam Code': '24AM230', 'Grade': 'B'})
for _ in range(2): data.append({'Main Exam Code': '24AM230', 'Grade': 'U'})

df = pd.DataFrame(data)
df.to_excel('c:\\College Project\\CO attainment\\CO\\backend\\result terminal.xls', index=False)
