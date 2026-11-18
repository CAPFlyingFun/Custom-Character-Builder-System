# a labelled contact sheet: python3 grid.py out.jpg cols crop(l,t,r,b) label=path ...
import sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; cols=int(sys.argv[2]); crop=tuple(int(v) for v in sys.argv[3].split(',')); items=[a.split('=',1) for a in sys.argv[4:]]
ims=[(l,Image.open(p).convert('RGB').crop(crop)) for l,p in items]
w,h=ims[0][1].size; rows=(len(ims)+cols-1)//cols; bar=22
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',14)
except Exception: font=ImageFont.load_default()
o=Image.new('RGB',(w*cols,(h+bar)*rows),'white'); d=ImageDraw.Draw(o)
for i,(l,im) in enumerate(ims):
    x=(i%cols)*w; y=(i//cols)*(h+bar); o.paste(im,(x,y+bar)); d.text((x+6,y+3),l,fill=(20,20,20),font=font)
o.save(out,quality=88)
