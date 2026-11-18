# a labelled contact sheet with a crop of its own for each picture:
#   python3 sheet.py out.jpg cols cellw,cellh "label=path@l,t,r,b" ...   (each crop is fitted into the cell, its shape kept)
import sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; cols=int(sys.argv[2]); cw,ch=(int(v) for v in sys.argv[3].split(','))
items=[]
for a in sys.argv[4:]:
    l,rest=a.split('=',1); p,c=(rest.split('@',1)+[None])[:2]
    im=Image.open(p).convert('RGB')
    if c: im=im.crop(tuple(int(v) for v in c.split(',')))
    k=min(cw/im.width,ch/im.height); im=im.resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.LANCZOS)
    items.append((l,im))
rows=(len(items)+cols-1)//cols; bar=44
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',26)
except Exception: font=ImageFont.load_default()
bg=(224,231,224)
o=Image.new('RGB',(cw*cols,(ch+bar)*rows),bg); d=ImageDraw.Draw(o)
for i,(l,im) in enumerate(items):
    x=(i%cols)*cw; y=(i//cols)*(ch+bar)
    d.rectangle([x,y,x+cw-1,y+bar-1],fill=(255,255,255))
    o.paste(im,(x+(cw-im.width)//2,y+bar+(ch-im.height)//2)); d.text((x+10,y+7),l,fill=(20,20,20),font=font)
o.save(out,quality=90)
print(out,o.size)
