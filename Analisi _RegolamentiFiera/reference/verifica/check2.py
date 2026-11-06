import re, json
def norm(t):
    t=t.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace('–','-').replace('—','-')
    t=re.sub(r'-\s*\n\s*','',t)
    t=re.sub(r'\s+','',t)
    return t.lower()
raw=open('reg_raw.txt').read()
pages=raw.split('\f')
# printed page number: look for "| npe.org N" or "N npe.org |"
printed=[]
for p in pages:
    m=re.search(r'npe\.org\s*\|?\s*(\d+)\s*$',p.strip()) or re.search(r'^\s*(\d+)\s+npe\.org',p,re.M) or re.search(r'npe\.org\s+(\d+)',p)
    printed.append(m.group(1) if m else None)
npages=[norm(p) for p in pages]
secs=json.load(open('rows.json'))
for s in secs:
    for r in s['rows']:
        cit=r[3]
        if cit.strip() in ('n.a.','Vedi Sezione A'): continue
        for sg in [x.strip() for x in re.split(r' / |; ',cit)]:
            sg=re.sub(r'\(analoghe.*?\)','',sg).strip().replace('...','').strip()
            n=norm(sg)
            if not n: continue
            hits=[i for i,p in enumerate(npages) if n in p]
            if hits:
                # article heading before position
                i=hits[0]; txt=pages[i]
                allt='\n'.join(pages[:i+1])
                # find article: last heading pattern "(d.d)" before
                pos=raw.find(sg[:25])
                arts=re.findall(r'\((\d+\.\d+)\)',raw[:pos if pos>0 else len(raw)])
                print(f"{s['title'][:1]} | {r[0][:38]:38} | ref={r[2]:22} | pdfpg={i+1} printed={printed[i]} | art~{arts[-1] if arts else '?'}")
