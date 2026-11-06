import re, json
def norm(t):
    t=t.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('–','-').replace('—','-')
    t=re.sub(r'-\s*\n\s*','',t)
    t=re.sub(r'\s+','',t)
    return t.lower()
reg=norm(open('reg.txt').read())+norm(open('reg_raw.txt').read())
app=norm(open('app.txt').read())+norm(open('app_raw.txt').read())
secs=json.load(open('rows.json'))
ok=0;bad=[]
for s in secs:
    for r in s['rows']:
        cit=r[3]
        if cit.strip() in ('n.a.','Vedi Sezione A'): continue
        segs=[x.strip() for x in re.split(r' / |; ',cit)]
        for sg in segs:
            sg=re.sub(r'\(analoghe.*?\)','',sg).strip()
            if not sg: continue
            n=norm(sg.replace('...','').strip())
            if n in reg: ok+=1
            elif n in app: ok+=1
            else: bad.append((s['title'][:1],r[0],r[2],sg))
print('found',ok,'not found',len(bad))
for b in bad: print('-',b)
