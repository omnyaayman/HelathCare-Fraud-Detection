import sqlite3
conn = sqlite3.connect('healthcare_fraud.db')
c = conn.cursor()
c.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")
rows = c.fetchall()
for r in rows:
    print(f'Index: {r[0]} -> {r[1]}')
conn.close()
